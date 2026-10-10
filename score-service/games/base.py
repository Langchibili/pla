"""The contract every game file follows.

A game file only declares a `Layout` and overrides a step when its screen genuinely differs.
The five contract steps are:

    validate_image  ->  locate_regions  ->  read_numbers  ->  read_names  ->  build_result
"""
from __future__ import annotations
import time
from dataclasses import dataclass
import re
import numpy as np
from PIL import Image

from config import Settings
from core import image_checks as ic
from core.confidence import combine
from core.name_reader import name_hints, read_names
from core.number_finder import FinderConfig, find_pairs
from core.ocr import OcrEngine, enhance
from core.splitter import Regions, crop, split
from core.types import ReadResult, Rejection, ScorePair, Token


@dataclass(frozen=True)
class Layout:
    key: str                                  # = `score_service_key` on the Strapi game record
    display: str
    parser_version: str                       # bump when the template changes, e.g. dls-v2
    result_type: str = "head_to_head"         # head_to_head | rounds | team_score | placement_kills
    implemented: bool = True
    primary_zone: str = "top_center"          # where the live/final score normally sits
    allow_clock: bool = True                  # football: 2 <time played> 0
    allow_no_separator: bool = False
    score_min: int = 0
    score_max: int = 99
    max_digits: int = 2
    name_pattern: str | None = r"^[\w .\-'\[\]|]{2,24}$"
    names_in_side_thirds: bool = True
    retry_enhanced: bool = True
    minimum_completed_clock_minute: int | None = None
    accepted_zones: tuple = ()                # zones that count as a final-result screen (empty = primary_zone only)
    require_completion_screen: bool = False   # True: reject a live HUD that is not a FULLTIME / stats screen
    fulltime_label_replaces_clock: bool = False  # True: a FULL TIME label is enough when no clock is on screen
    calibrated: bool = True                   # False: layout never checked on real screenshots; always flagged
    notes: str = ""


class Context:
    """Everything one read needs, so steps stay small and testable."""
    def __init__(self, img: Image.Image, regions: Regions, ocr: OcrEngine, scale: float, flags: list):
        self.img = img
        self.rgb = np.asarray(img)
        self.regions = regions
        self.ocr = ocr
        self.scale = scale
        self.flags = flags
        self.tokens: list[Token] = []

    def read_region(self, box, enhanced=False) -> list[Token]:
        sub = crop(self.rgb, box)
        if enhanced:
            sub, f = enhance(sub)
        else:
            f = 1.0
        return self.ocr.read(sub, offset=(box.x0, box.y0), scale=f)


class GameParser:
    layout: Layout

    # ---- contract steps -------------------------------------------------
    def validate_image(self, data: bytes, settings: Settings, flags: list) -> Image.Image:
        img = ic.load_image(data, settings.max_image_bytes)
        ic.check_orientation(img)                       # first: must be landscape
        ic.check_size(img, settings.min_width, settings.min_height)
        ic.check_blur(ic.blur_score(img), settings.blur_reject_below, settings.blur_flag_below, flags)
        return img

    def locate_regions(self, img: Image.Image) -> Regions:
        return split(img.width, img.height)             # top half -> left / middle / right

    def finder_config(self) -> FinderConfig:
        L = self.layout
        return FinderConfig(max_digits=L.max_digits, score_min=L.score_min, score_max=L.score_max,
                            allow_clock=L.allow_clock, allow_no_separator=L.allow_no_separator)

    def read_numbers(self, ctx: Context) -> list[ScorePair]:
        """Top half first. Enhanced retry if nothing. Bottom half last, only to REPORT a score found there."""
        cfg = self.finder_config()
        passes = [(ctx.regions.top_half, False)]
        if self.layout.retry_enhanced:
            passes.append((ctx.regions.top_half, True))
        passes.append((ctx.regions.bottom_half, False))
        for box, enhanced in passes:
            tokens = ctx.read_region(box, enhanced)
            pairs = find_pairs(tokens, ctx.regions, cfg)
            if pairs:
                ctx.tokens = tokens
                if enhanced:
                    ctx.flags.append("read_with_enhancement")
                return pairs
        return []

    def choose(self, pairs: list[ScorePair], margin: float):
        """Prefer a score in the game's primary zone; flag two near-equal different readings."""
        primary = [p for p in pairs if p.zone == self.layout.primary_zone]
        if self.layout.minimum_completed_clock_minute is not None:
            score_pairs = [p for p in primary if p.link != "clock_only"]
            if score_pairs:
                primary = score_pairs
        pool = sorted(primary or pairs, key=lambda p: p.score, reverse=True)
        best = pool[0]
        ambiguous = any(
            (q.left.text, q.right.text) != (best.left.text, best.right.text) and best.score - q.score < margin
            for q in pool[1:]
        )
        return best, ambiguous, bool(primary)

    def read_names(self, ctx: Context, best: ScorePair) -> dict:
        left, right = read_names(ctx.tokens, best, ctx.regions,
                                 name_pattern=self.layout.name_pattern,
                                 side_thirds_only=self.layout.names_in_side_thirds)
        return {"left": left, "right": right}

    @staticmethod
    def _clock_minute(clock_text: str | None) -> int | None:
        match = re.fullmatch(
            r"\s*(\d{1,3})(?::\d{2}|\+(\d{1,2}))?\s*['\u2019\u2032`]?\s*",
            clock_text or "",
        )
        if not match:
            return None
        return int(match.group(1)) + int(match.group(2) or 0)

    def build_result(
        self, *, best, ambiguous, in_primary, names, expected, ctx, info, timings,
        match_clock: ScorePair | None = None, require_match_clock: bool = False,
    ) -> ReadResult:
        flags = ctx.flags
        minimum_clock = self.layout.minimum_completed_clock_minute
        clock_pair = match_clock or (best if best.link in ("clock", "clock_only") else None)
        if minimum_clock is not None and require_match_clock and clock_pair is None:
            return ReadResult(
                status="rejected", game_key=self.layout.key, parser_version=self.layout.parser_version,
                reject_reason="match_clock_missing",
                message="The match clock could not be read; submit a screenshot that shows the clock.",
                score=None if best.link == "clock_only" else {
                    "left": int(best.left.text), "right": int(best.right.text),
                },
                score_text=None if best.link == "clock_only" else f"{best.left.text}:{best.right.text}",
                link=best.link, zone=best.zone, flags=["match_clock_missing"],
                image=info, timings_ms=timings,
            )
        if minimum_clock is not None and clock_pair:
            clock_minute = self._clock_minute(clock_pair.clock_text)
            if clock_minute is None:
                return ReadResult(
                    status="rejected", game_key=self.layout.key, parser_version=self.layout.parser_version,
                    reject_reason="match_clock_unreadable",
                    message="The match clock could not be read to confirm that the match is complete.",
                    clock_text=clock_pair.clock_text, zone=best.zone, image=info, timings_ms=timings,
                )
            if clock_minute < minimum_clock:
                return ReadResult(
                    status="rejected", game_key=self.layout.key, parser_version=self.layout.parser_version,
                    reject_reason="match_not_finished",
                    message=f"The match clock shows {clock_pair.clock_text}; submit the result after 90 minutes.",
                    score=None if best.link == "clock_only" else {
                        "left": int(best.left.text), "right": int(best.right.text),
                    },
                    score_text=None if best.link == "clock_only" else f"{best.left.text}:{best.right.text}",
                    link=best.link, clock_text=clock_pair.clock_text, zone=best.zone,
                    flags=["match_incomplete"], image=info, timings_ms=timings,
                )
            if best.link == "clock_only":
                return ReadResult(
                    status="no_score_found", game_key=self.layout.key, parser_version=self.layout.parser_version,
                    message="The match clock was found, but no final score was detected.",
                    clock_text=clock_pair.clock_text, zone=best.zone, flags=["clock_without_score"],
                    image=info, timings_ms=timings,
                )
        if ambiguous:
            flags.append("ambiguous_readings")
        if not in_primary:
            flags.append("outside_primary_zone")
        if best.link == "clock":
            flags.append("clock_between")
        if not names["left"] or not names["right"]:
            flags.append("names_missing")
        name_text = {s: (names[s]["text"] if names[s] else None) for s in ("left", "right")}
        conf = combine(best.score, name_text, ambiguous, flags)
        if conf < 0.6:
            flags.append("low_confidence")
        return ReadResult(
            status="ok", game_key=self.layout.key, parser_version=self.layout.parser_version,
            score={"left": int(best.left.text), "right": int(best.right.text)},
            score_text=f"{best.left.text}:{best.right.text}",
            link=best.link, clock_text=best.clock_text, zone=best.zone,
            names=name_text, name_hints=name_hints(name_text, expected),
            confidence=conf, flags=sorted(set(flags)), image=info, timings_ms=timings,
        )

    # ---- orchestration --------------------------------------------------
    def run(self, data: bytes, expected_names: list[str], ocr: OcrEngine, settings: Settings) -> ReadResult:
        L, t0, flags = self.layout, time.perf_counter(), []
        if not L.implemented:
            return ReadResult(status="unsupported_game", game_key=L.key, parser_version=L.parser_version,
                              message=f"{L.display} score reading is not built yet.")
        info = {"sha256": ic.sha256_hex(data)}
        try:
            img = self.validate_image(data, settings, flags)
        except Rejection as r:
            return ReadResult(status="rejected", game_key=L.key, parser_version=L.parser_version,
                              reject_reason=r.reason, message=r.message, image=info)
        info.update(width=img.width, height=img.height, dhash=ic.dhash_hex(img))
        small, scale = ic.downscale(img, settings.ocr_max_width)
        ctx = Context(small, self.locate_regions(small), ocr, scale, flags)

        t1 = time.perf_counter()
        pairs = self.read_numbers(ctx)
        t2 = time.perf_counter()
        timings = {"validate": round((t1 - t0) * 1000), "read_numbers": round((t2 - t1) * 1000)}
        if not pairs:
            flags.append("no_score_found")
            return ReadResult(status="no_score_found", game_key=L.key, parser_version=L.parser_version,
                              message="No valid score was found in the screenshot.",
                              flags=sorted(set(flags)), image=info, timings_ms=timings)

        best, ambiguous, in_primary = self.choose(pairs, settings.ambiguity_margin)
        clocks = [pair for pair in pairs if pair.link in ("clock", "clock_only")]
        match_clock = next(
            (
                pair for pair in clocks
                if L.minimum_completed_clock_minute is not None
                and self._clock_minute(pair.clock_text) is not None
                and self._clock_minute(pair.clock_text) < L.minimum_completed_clock_minute
            ),
            clocks[0] if clocks else None,
        )
        names = self.read_names(ctx, best)
        timings["total"] = round((time.perf_counter() - t0) * 1000)
        res = self.build_result(best=best, ambiguous=ambiguous, in_primary=in_primary, names=names,
                                expected=expected_names, ctx=ctx, info=info, timings=timings,
                                match_clock=match_clock,
                                require_match_clock=settings.require_clock_for_soccer_games_validity)
        res.zones_with_scores = sorted({p.zone for p in pairs if p.link != "clock_only"})
        res.candidates = [
            {"score": f"{p.left.text}:{p.right.text}", "zone": p.zone, "link": p.link, "rank_score": p.score}
            for p in sorted(pairs, key=lambda p: p.score, reverse=True)[:3]
        ]
        return res
