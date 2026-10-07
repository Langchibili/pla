"""Valorant / Counter-Strike - not built yet. Switch on by setting implemented=True and calibrating against real screenshots.

Steps to add this game:
  1. Put real screenshots in tests/screenshots/valorant_cs/ with labels.json.
  2. Set primary_zone (where the score sits), result_type and any pattern overrides below.
  3. Override a contract step in GameParser only if the screen needs it.
  4. Run: python tools/evaluate.py valorant_cs, then set the Strapi game record to active.
"""
from .base import GameParser, Layout


class ValorantCsParser(GameParser):
    layout = Layout(
        key="valorant_cs",
        display="Valorant / Counter-Strike",
        parser_version="valorant_cs-v0",
        result_type="rounds",
        implemented=False,
        primary_zone="top_center",
        allow_clock=False,
        notes="Round score.",
    )


PARSER = ValorantCsParser()
