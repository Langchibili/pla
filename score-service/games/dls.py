"""Dream League Soccer result screen.

The final scoreboard places the two large white score digits on either side of
the smaller match clock. Read the digits around that clock rather than treating
the clock itself as a score candidate.
"""
from core import glyphs
from core.types import Atom, Box
from .base import GameParser, Layout
from .football_screens import FootballScreenParser, ScreenPair


class DlsParser(FootballScreenParser):
    glyph_screens = ("board",)

    layout = Layout(
        key="dls",
        display="Dream League Soccer",
        parser_version="dls-v4",
        primary_zone="top_center",
        accepted_zones=("top_center",),
        allow_clock=True,
        minimum_completed_clock_minute=90,
        fulltime_label_replaces_clock=True,
        notes="Read the final scoreboard digits around its clock; require 90 minutes or a Full Time label when configured.",
    )

    def _read_screen(self, screen, found, ctx):
        if screen != "board":
            return None

        clock = found["hud_clock"] or found["clock"]
        if clock is None:
            return None

        anchor = clock.box
        if not (0.35 * ctx.regions.width <= anchor.cx <= 0.65 * ctx.regions.width
                and anchor.cy <= 0.2 * ctx.regions.height):
            return None

        window = Box(
            anchor.cx - 3.0 * anchor.w,
            anchor.cy - 1.5 * anchor.h,
            anchor.cx + 3.0 * anchor.w,
            anchor.cy + 1.5 * anchor.h,
        )
        read = glyphs.read_digits(
            ctx.ocr,
            ctx.rgb,
            window,
            center_x=anchor.cx,
            dark_glyph=False,
            min_h=1.35 * anchor.h,
            max_h=3.0 * anchor.h,
        )
        if read is None:
            return None

        make_atom = lambda text, box: Atom("NUM", text, box, read.conf, -1, (0, len(text)))
        row = Box(
            read.left_box.x0,
            min(read.left_box.y0, read.right_box.y0),
            read.right_box.x1,
            max(read.left_box.y1, read.right_box.y1),
        )
        return ScreenPair(
            left=make_atom(read.left, read.left_box),
            right=make_atom(read.right, read.right_box),
            link="glyph",
            clock_text=clock.text.strip(),
            quality=0.9,
            score=round(0.9 * read.conf, 4),
            zone=ctx.regions.zone_of(row.cx, row.cy),
            screen="board",
            row=row,
        )

    def build_result(self, *, best, ambiguous, in_primary, names, expected, ctx, info, timings,
                     match_clock=None, require_match_clock=False):
        has_fulltime = self.layout.fulltime_label_replaces_clock and (
            {"fulltime_banner", "stats_screen"} & set(ctx.flags)
        )
        if has_fulltime and match_clock is None:
            require_match_clock = False
            ctx.flags.append("clock_not_shown")

        return GameParser.build_result(
            self,
            best=best,
            ambiguous=ambiguous,
            in_primary=in_primary,
            names=names,
            expected=expected,
            ctx=ctx,
            info=info,
            timings=timings,
            match_clock=match_clock,
            require_match_clock=require_match_clock,
        )


PARSER = DlsParser()
