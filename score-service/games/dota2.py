"""Dota 2 - not built yet. Switch on by setting implemented=True and calibrating against real screenshots.

Steps to add this game:
  1. Put real screenshots in tests/screenshots/dota2/ with labels.json.
  2. Set primary_zone (where the score sits), result_type and any pattern overrides below.
  3. Override a contract step in GameParser only if the screen needs it.
  4. Run: python tools/evaluate.py dota2, then set the Strapi game record to active.
"""
from .base import GameParser, Layout


class Dota2Parser(GameParser):
    layout = Layout(
        key="dota2",
        display="Dota 2",
        parser_version="dota2-v0",
        result_type="team_score",
        implemented=False,
        primary_zone="top_center",
        allow_clock=False,
        notes="Team kill score.",
    )


PARSER = Dota2Parser()
