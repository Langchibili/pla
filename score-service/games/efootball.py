"""eFootball - not built yet. Switch on by setting implemented=True and calibrating against real screenshots.

Steps to add this game:
  1. Put real screenshots in tests/screenshots/efootball/ with labels.json.
  2. Set primary_zone (where the score sits), result_type and any pattern overrides below.
  3. Override a contract step in GameParser only if the screen needs it.
  4. Run: python tools/evaluate.py efootball, then set the Strapi game record to active.
"""
from .base import GameParser, Layout


class EfootballParser(GameParser):
    layout = Layout(
        key="efootball",
        display="eFootball",
        parser_version="efootball-v1",
        result_type="head_to_head",
        implemented=False,
        primary_zone="top_left",
        allow_clock=True,
        minimum_completed_clock_minute=90,
        notes="Football with a match clock. Confirm the scoreboard position from real screenshots.",
    )


PARSER = EfootballParser()
