"""EA Sports FC - not built yet. Switch on by setting implemented=True and calibrating against real screenshots.

Steps to add this game:
  1. Put real screenshots in tests/screenshots/ea_fc/ with labels.json.
  2. Set primary_zone (where the score sits), result_type and any pattern overrides below.
  3. Override a contract step in GameParser only if the screen needs it.
  4. Run: python tools/evaluate.py ea_fc, then set the Strapi game record to active.
"""
from .base import GameParser, Layout


class EaFcParser(GameParser):
    layout = Layout(
        key="ea_fc",
        display="EA Sports FC",
        parser_version="ea_fc-v0",
        result_type="head_to_head",
        implemented=False,
        primary_zone="top_left",
        allow_clock=True,
        notes="Football with a match clock. Confirm the scoreboard position from real screenshots.",
    )


PARSER = EaFcParser()
