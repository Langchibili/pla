"""PUBG Mobile - not built yet. Switch on by setting implemented=True and calibrating against real screenshots.

Steps to add this game:
  1. Put real screenshots in tests/screenshots/pubg_mobile/ with labels.json.
  2. Set primary_zone (where the score sits), result_type and any pattern overrides below.
  3. Override a contract step in GameParser only if the screen needs it.
  4. Run: python tools/evaluate.py pubg_mobile, then set the Strapi game record to active.
"""
from .base import GameParser, Layout


class PubgMobileParser(GameParser):
    layout = Layout(
        key="pubg_mobile",
        display="PUBG Mobile",
        parser_version="pubg_mobile-v0",
        result_type="placement_kills",
        implemented=False,
        primary_zone="top_center",
        allow_clock=False,
        notes="Placement plus kills, not a head-to-head score.",
    )


PARSER = PubgMobileParser()
