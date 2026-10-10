"""Dream League Soccer. First launch game.

Rule: the score must be in the TOP-CENTER. A score anywhere else is reported with that zone and
Strapi rejects it (mid-match screenshots must not count as a result).
Calibrate `notes`/layout values against real screenshots in tests/screenshots/dls before paid events.
"""
from .base import GameParser, Layout


class DlsParser(GameParser):
    layout = Layout(
        key="dls",
        display="Dream League Soccer",
        parser_version="dls-v2",
        primary_zone="top_center",
        allow_clock=True,
        minimum_completed_clock_minute=90,
        notes="Football: a match clock may sit between the two numbers.",
    )


PARSER = DlsParser()
