"""eFootball (mobile). Calibrated on 3 real screenshots from one phone (1280x591): see tests/screenshots/efootball.

Screens that carry the score:
  * Full Time result screen: yellow "Full Time" label, big `0 - 8` under it (top-centre), team names below
  * scoreboard strip on the pitch: `<name> [0] [8] <name>` in yellow boxes. Bottom-centre it is the goal /
    kick-off banner; top-left it is the live HUD with the yellow clock box (`44:43`). Neither proves the
    match is over.
Rules: clock >= 90 where a clock is shown, and the "Full Time" label as the completion proof (the result
screen has no clock, so the label stands in for it: flag `clock_not_shown`). Strapi should allow `top_center`
only. Only ONE Full Time screen has been seen: add more devices/modes (cup, extra time, penalties) to
tests/screenshots/efootball/ and run `python tools/evaluate.py efootball` before paid events.
"""
from __future__ import annotations
import re

from core import glyphs
from core.types import Atom, Box
from .base import Layout
from .football_screens import FootballScreenParser, ScreenPair, _squash, CLOCK_TOKEN


class EfootballParser(FootballScreenParser):
    glyph_screens = ("board",)

    layout = Layout(
        key="efootball",
        display="eFootball",
        parser_version="efootball-v4",
        result_type="head_to_head",
        implemented=True,
        primary_zone="top_center",
        accepted_zones=("top_center",),
        allow_clock=True,
        minimum_completed_clock_minute=90,
        fulltime_label_replaces_clock=True,
        name_pattern=r"^[\w .\-'\[\]|]{2,32}$",
        notes="Full Time screen (top-centre) is the result; the scoreboard strip is flagged as unconfirmed.",
    )

    # ---- scoreboard strip: names either side, score digits in the gap -------------
    def _read_screen(self, screen, found, ctx):
        if screen != "board":
            return None
        W, H = ctx.regions.width, ctx.regions.height
        words = [t for t in ctx.tokens if sum(c.isalpha() for c in t.text) >= 2 and t.conf >= 0.45
                 and not CLOCK_TOKEN.match(t.text.strip())]
        found_pairs = []
        for L in words:
            for R in words:
                if R.box.x0 <= L.box.x1:
                    continue
                h = max(L.box.h, R.box.h)
                cy = (L.box.cy + R.box.cy) / 2
                gap = R.box.x0 - L.box.x1
                if abs(L.box.cy - R.box.cy) > 0.35 * h or not (0.6 * h <= gap <= 7 * h):
                    continue
                if not (cy < 0.15 * H or cy > 0.75 * H):
                    continue
                if any(o is not L and o is not R and L.box.x1 <= o.box.cx <= R.box.x0 and abs(o.box.cy - cy) < 0.6 * h for o in words):
                    continue
                win = Box(L.box.x1, cy - 0.9 * h, R.box.x0, cy + 0.9 * h)
                read = glyphs.read_digits(ctx.ocr, ctx.rgb, win, center_x=(L.box.x1 + R.box.x0) / 2,
                                          dark_glyph=True, min_h=0.45 * h, max_h=1.25 * h)
                if read:
                    found_pairs.append((read, L, R, cy < 0.15 * H))
        if not found_pairs:
            return None
        read, L, R, hud = max(found_pairs, key=lambda x: x[0].conf)
        mk = lambda txt, box: Atom("NUM", txt, box, read.conf, -1, (0, len(txt)))
        zone = ctx.regions.zone_of((read.left_box.x0 + read.right_box.x1) / 2, (read.left_box.cy + read.right_box.cy) / 2)
        clock = found["hud_clock"].text.strip() if (hud and found["hud_clock"]) else None
        row = Box(read.left_box.x0, min(read.left_box.y0, read.right_box.y0), read.right_box.x1, max(read.left_box.y1, read.right_box.y1))
        return ScreenPair(left=mk(read.left, read.left_box), right=mk(read.right, read.right_box), link="glyph", clock_text=clock,
                          quality=0.9, score=round(0.9 * read.conf, 4), zone=zone, screen="board", row=row,
                          truncated_names=hud, name_tokens=(L, R))

    # ---- Full Time result screen ---------------------------------------------------
    def post_pairs(self, pairs, found, ctx):
        label = found["fulltime"]
        if label is None:
            return pairs
        a = label.box
        win = Box(a.cx - 3.5 * a.w, a.y1 - 0.2 * a.h, a.cx + 3.5 * a.w, a.y1 + 5 * a.h)
        inside = lambda p: win.x0 <= p.left.box.x0 and p.right.box.x1 <= win.x1 and win.y0 <= p.left.box.cy <= win.y1
        keep = [p for p in pairs if p.link == "clock_only" or isinstance(p, ScreenPair)]
        result = None
        for p in pairs:
            if p.link != "clock_only" and not isinstance(p, ScreenPair) and inside(p):     # `0 - 8` read as text
                row = Box(p.left.box.x0, min(p.left.box.y0, p.right.box.y0), p.right.box.x1, max(p.left.box.y1, p.right.box.y1))
                result = ScreenPair(left=p.left, right=p.right, link=p.link, clock_text=p.clock_text, quality=p.quality,
                                    score=p.score, zone=p.zone, consumed=p.consumed, screen="result", row=row)
                break
        if result is None:                                                                  # digits the text pass skipped
            read = glyphs.read_digits(ctx.ocr, ctx.rgb, win, center_x=a.cx, dark_glyph=False, min_h=1.2 * a.h, max_h=4 * a.h)
            if read:
                mk = lambda txt, box: Atom("NUM", txt, box, read.conf, -1, (0, len(txt)))
                row = Box(read.left_box.x0, min(read.left_box.y0, read.right_box.y0), read.right_box.x1, max(read.left_box.y1, read.right_box.y1))
                result = ScreenPair(left=mk(read.left, read.left_box), right=mk(read.right, read.right_box), link="glyph",
                                    clock_text=None, quality=0.9, score=round(0.9 * read.conf, 4),
                                    zone=ctx.regions.zone_of(row.cx, row.cy), screen="result", row=row)
        # Only the score under the label counts on this screen: other digit pairs (the "2-0" icon on the
        # Stats button, a leftover scoreboard) are not results and are dropped so they cannot report a zone.
        return ([result] if result else []) + [p for p in keep if p.link == "clock_only"]

    # ---- names -----------------------------------------------------------------------
    def read_names(self, ctx, best):
        screen = getattr(best, "screen", None)
        wrap = lambda t: {"text": t.text.strip(), "conf": round(t.conf, 4)} if t else None
        if screen == "board" and best.name_tokens:
            return {"left": wrap(best.name_tokens[0]), "right": wrap(best.name_tokens[1])}
        if screen == "result":
            W = ctx.regions.width
            below = [t for t in ctx.tokens if t.box.y0 >= best.row.y1 - 0.2 * best.row.h and t.box.y0 <= best.row.y1 + 1.6 * best.row.h
                     and t.conf >= 0.45 and sum(c.isalpha() for c in t.text) >= 2 and not re.search(r"\d", t.text)]
            left = [t for t in below if t.box.cx < 0.5 * W]
            right = [t for t in below if t.box.cx >= 0.5 * W]
            top = lambda c: min(c, key=lambda t: (t.box.y0, -t.conf)) if c else None
            return {"left": wrap(top(left)), "right": wrap(top(right))}
        return super().read_names(ctx, best)


PARSER = EfootballParser()
