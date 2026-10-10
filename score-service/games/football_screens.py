"""Shared reader for football games whose result can sit on a live HUD, a FULLTIME banner or a
post-match stats screen (EA FC, eFootball).

Why this exists: the live HUD sits in the same corner at minute 45 and minute 90, so position alone cannot
tell a finished match from a running one. Completion is therefore judged from three things together:
the match clock (>= minimum_completed_clock_minute), and a completion screen (FULLTIME banner or the
stats screen). A HUD-only upload at 90:00 is still accepted as a reading but flagged
`completion_not_confirmed` with confidence capped, so Strapi sends it to review. Set
`Layout.require_completion_screen=True` to reject it outright instead.

Score sources, best first: stats screen (score top-centre) > FULLTIME banner (bottom-centre) > HUD
(top-left) > plain OCR text such as `2 - 0`. Sources that disagree cap the confidence and flag
`score_sources_disagree`. Every source's zone is reported in `zones_with_scores`.
"""
from __future__ import annotations
import re
from dataclasses import dataclass

from core import glyphs
from core.name_reader import CLOCK_LIKE
from core.number_finder import find_pairs
from core.types import Atom, Box, ScorePair
from .base import Context, GameParser

CLOCK_TOKEN = re.compile(r"^\d{1,3}\s*:\s*\d{2}$")
FULLTIME = re.compile(r"FU?LL[\s\-]?TIME")
FORMATION = re.compile(r"\d\s*-\s*\d\s*-\s*\d")           # "4-3-3" selector on the live HUD
PING = re.compile(r"^\W*\d{1,4}\s*ms\W*$", re.I)
STATS_WORDS = ("SHOTS", "POSSESSION", "PASSACCURACY", "FOULS", "OFFSIDES", "CONTINUE",
               "MATCHHIGHLIGHTS", "SHAREWITHLEAGUE", "ADDFRIEND")
RANK = {"stats": 0, "result": 0, "banner": 1, "hud": 2, "board": 2}


@dataclass
class ScreenPair(ScorePair):
    screen: str = "tokens"
    corroborated: bool = False
    row: Box | None = None
    truncated_names: bool = False
    name_tokens: tuple | None = None      # (left Token, right Token) when the screen itself carries the names


def _squash(text: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", text.upper())


class FootballScreenParser(GameParser):
    glyph_screens: tuple = ("stats", "banner", "hud")   # which screen readers this game has

    # ---- numbers ---------------------------------------------------------
    def read_numbers(self, ctx: Context) -> list[ScorePair]:
        full = Box(0, 0, ctx.regions.width, ctx.regions.height)
        tokens = self._clean(ctx.read_region(full))
        found = self._anchors(tokens, ctx)
        if not (found["clock"] or found["fulltime"]) and self.layout.retry_enhanced:
            more = self._clean(ctx.read_region(full, enhanced=True))
            if more:
                tokens, found = more, self._anchors(more, ctx)
                ctx.flags.append("read_with_enhancement")
        ctx.tokens = tokens
        pairs = list(find_pairs(tokens, ctx.regions, self.finder_config()))

        if found["fulltime"]:
            ctx.flags.append("fulltime_banner")
        if found["stats"]:
            ctx.flags.append("stats_screen")
        glyph_pairs = []
        for screen in self.glyph_screens:
            gp = self._read_screen(screen, found, ctx)
            if gp:
                glyph_pairs.append(gp)
        pairs = self.post_pairs(glyph_pairs + pairs, found, ctx)
        return pairs

    def post_pairs(self, pairs, found, ctx):
        """Hook for a game to tag, filter or add readings once every source has been collected."""
        return pairs

    @staticmethod
    def _clean(tokens):
        return [t for t in tokens if not (FORMATION.search(t.text) or PING.match(t.text.strip()))]

    def _anchors(self, tokens, ctx):
        W, H = ctx.regions.width, ctx.regions.height
        squashed = [(_squash(t.text), t) for t in tokens]
        fulltime = next((t for s, t in squashed if FULLTIME.search(s)), None)
        hits = {w for s, _ in squashed for w in STATS_WORDS if w in s}
        stats = len(hits) >= 2
        clocks = [t for t in tokens if CLOCK_TOKEN.match(t.text.strip())]
        stats_clock = next((t for t in clocks if 0.35 * W < t.box.cx < 0.65 * W and t.box.cy < 0.4 * H), None) if stats else None
        hud_clock = None if stats else next((t for t in clocks if t.box.cx < 0.6 * W and t.box.cy < 0.15 * H), None)
        return {"clock": stats_clock or hud_clock or (clocks[0] if clocks else None), "stats": stats and stats_clock is not None,
                "stats_clock": stats_clock, "hud_clock": hud_clock, "fulltime": fulltime}

    def _read_screen(self, screen, found, ctx) -> ScreenPair | None:
        rgb = ctx.rgb
        if screen == "stats" and found["stats"]:
            a = found["stats_clock"].box
            win = Box(a.cx - 2.4 * a.w, a.y0 - 3.6 * a.h, a.cx + 2.4 * a.w, a.y0 + 0.1 * a.h)
            read = glyphs.read_digits(ctx.ocr, rgb, win, center_x=a.cx, dark_glyph=False, min_h=1.1 * a.h, max_h=2.8 * a.h)
            clock = found["stats_clock"].text.strip()
        elif screen == "banner" and found["fulltime"]:
            a = found["fulltime"].box
            win = Box(a.cx - 1.9 * a.w, a.y0 - 4.2 * a.h, a.cx + 1.9 * a.w, a.y0 - 0.2 * a.h)
            read = glyphs.read_digits(ctx.ocr, rgb, win, center_x=a.cx, dark_glyph=True, min_h=1.1 * a.h, max_h=2.8 * a.h)
            clock = found["hud_clock"].text.strip() if found["hud_clock"] else None
        elif screen == "hud" and found["hud_clock"]:
            a = found["hud_clock"].box
            mid = a.cx - 3.5 * a.w
            win = Box(mid - 1.0 * a.w, a.y0 - 0.3 * a.h, mid + 1.0 * a.w, a.y1 + 0.3 * a.h)
            read = glyphs.read_digits(ctx.ocr, rgb, win, center_x=mid, dark_glyph=True, min_h=0.45 * a.h, max_h=1.05 * a.h)
            clock = found["hud_clock"].text.strip()
        else:
            return None
        if read is None:
            return None
        zone = ctx.regions.zone_of((read.left_box.x0 + read.right_box.x1) / 2, (read.left_box.cy + read.right_box.cy) / 2)
        mk = lambda txt, box: Atom("NUM", txt, box, read.conf, -1, (0, len(txt)))
        quality = 0.9
        return ScreenPair(left=mk(read.left, read.left_box), right=mk(read.right, read.right_box), link="glyph",
                          clock_text=clock, quality=quality, score=round(quality * read.conf, 4), zone=zone,
                          screen=screen, row=Box(read.left_box.x0, min(read.left_box.y0, read.right_box.y0),
                                                 read.right_box.x1, max(read.left_box.y1, read.right_box.y1)),
                          truncated_names=(screen == "hud"))

    # ---- choice ----------------------------------------------------------
    def choose(self, pairs, margin):
        scored = [p for p in pairs if p.link != "clock_only"]
        screens = [p for p in scored if isinstance(p, ScreenPair) and p.screen in RANK]
        if not screens:
            best, ambiguous, _ = super().choose(pairs, margin)
            return best, ambiguous, self._accepted(best)
        best = min(screens, key=lambda p: (RANK[p.screen], -p.score))
        same = lambda p: (p.left.text, p.right.text) == (best.left.text, best.right.text)
        others = [p for p in screens if p is not best and p.screen != best.screen]
        ambiguous = any(not same(p) for p in others)
        if others and not ambiguous:
            best.corroborated = True
            best.score = round(min(1.0, best.score * 1.1), 4)
        return best, ambiguous, self._accepted(best)

    def _accepted(self, best) -> bool:
        zones = self.layout.accepted_zones or (self.layout.primary_zone,)
        return best.zone in zones

    # ---- names -----------------------------------------------------------
    def read_names(self, ctx, best):
        screen = getattr(best, "screen", None)
        if screen not in RANK:
            return super().read_names(ctx, best)
        W, H = ctx.regions.width, ctx.regions.height
        ok = [t for t in ctx.tokens if t.conf >= 0.45 and "%" not in t.text and not CLOCK_LIKE.match(t.text.strip())
              and re.fullmatch(self.layout.name_pattern or r".+", t.text.strip()) and not FULLTIME.search(_squash(t.text))
              and sum(c.isalpha() for c in t.text) >= 2]
        row = best.row
        if screen == "stats":
            card = [t for t in ok if t.box.cy < 0.14 * H]
            left = [t for t in card if t.box.cx < 0.42 * W]
            right = [t for t in card if t.box.cx > 0.58 * W]
            pick = lambda c: min(c, key=lambda t: (t.box.y0, -t.conf)) if c else None
        else:
            band = 0.9 * row.h if screen == "banner" else 1.2 * row.h
            reach = 6 * row.h
            same_row = [t for t in ok if abs(t.box.cy - row.cy) <= band]
            left = [t for t in same_row if t.box.x1 <= best.left.box.x0 - 0.3 * row.h and t.box.x0 >= best.left.box.x0 - (reach if screen == "hud" else W)]
            right = [t for t in same_row if t.box.x0 >= best.right.box.x1 + 0.3 * row.h and t.box.x1 <= best.right.box.x1 + (reach if screen == "hud" else W)]
            if screen == "hud":    # tokens that swallowed a digit or the logo are not names
                left = [t for t in left if not any(c.isdigit() for c in t.text)]
                right = [t for t in right if not any(c.isdigit() for c in t.text)]
            pick = lambda c: max(c, key=lambda t: t.box.x1) if c else None   # nearest the score on the left
        lt = pick(left)
        rt = pick(right) if screen == "stats" else (min(right, key=lambda t: t.box.x0) if right else None)
        wrap = lambda t: {"text": t.text.strip(), "conf": round(t.conf, 4)} if t else None
        return {"left": wrap(lt), "right": wrap(rt)}

    # ---- result ----------------------------------------------------------
    def build_result(self, *, best, ambiguous, in_primary, names, expected, ctx, info, timings,
                     match_clock=None, require_match_clock=False):
        L = self.layout
        confirmed = "fulltime_banner" in ctx.flags or "stats_screen" in ctx.flags
        clock_not_shown = False
        if (L.fulltime_label_replaces_clock
                and ({"fulltime_banner", "stats_screen"} & set(ctx.flags))
                and match_clock is None):
            require_match_clock, clock_not_shown = False, True
        res = super().build_result(best=best, ambiguous=ambiguous, in_primary=in_primary, names=names, expected=expected,
                                   ctx=ctx, info=info, timings=timings, match_clock=match_clock,
                                   require_match_clock=require_match_clock)
        if res.status != "ok":
            return res
        flags = set(res.flags)
        cap = 1.0
        if clock_not_shown:
            flags.add("clock_not_shown")
        if ambiguous and getattr(best, "screen", None) in RANK:
            flags.add("score_sources_disagree")
        if getattr(best, "corroborated", False):
            flags.add("score_corroborated")
        if getattr(best, "truncated_names", False):
            flags.add("names_truncated")
            res.name_hints = self._prefix_hints(res.names, res.name_hints, expected)
        if not confirmed:
            if L.require_completion_screen:
                return type(res)(status="rejected", game_key=res.game_key, parser_version=res.parser_version,
                                 reject_reason="completion_not_confirmed",
                                 message="Upload the FULLTIME screen or the match stats screen, not the live match view.",
                                 score=res.score, score_text=res.score_text, link=res.link, clock_text=res.clock_text,
                                 zone=res.zone, zones_with_scores=res.zones_with_scores, flags=sorted(flags | {"completion_not_confirmed"}),
                                 image=res.image, timings_ms=res.timings_ms)
            flags.add("completion_not_confirmed")
            cap = min(cap, 0.55)
        if not L.calibrated:
            flags.add("uncalibrated_layout")
            cap = min(cap, 0.55)
        res.confidence = round(min(res.confidence, cap), 4)
        if res.confidence < 0.6:
            flags.add("low_confidence")
        res.flags = sorted(flags)
        return res

    @staticmethod
    def _prefix_hints(names, hints, expected):
        """HUD names are cut to ~3 letters, so a clean prefix of the expected name counts as a strong match."""
        out = []
        for row in hints:
            row = dict(row)
            for side in ("left", "right"):
                got = (names.get(side) or "")
                g, e = re.sub(r"[^a-z0-9]", "", got.casefold()), re.sub(r"[^a-z0-9]", "", row["expected"].casefold())
                if len(g) >= 3 and e.startswith(g):
                    row[f"{side}_similarity"] = max(row[f"{side}_similarity"], 0.9)
            out.append(row)
        return out
