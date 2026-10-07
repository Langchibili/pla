"""Tekken / Mortal Kombat - not built yet. Switch on by setting implemented=True and calibrating against real screenshots.

Steps to add this game:
  1. Put real screenshots in tests/screenshots/tekken_mk/ with labels.json.
  2. Set primary_zone (where the score sits), result_type and any pattern overrides below.
  3. Override a contract step in GameParser only if the screen needs it.
  4. Run: python tools/evaluate.py tekken_mk, then set the Strapi game record to active.
"""
from .base import GameParser, Layout


class TekkenMkParser(GameParser):
    layout = Layout(
        key="tekken_mk",
        display="Tekken / Mortal Kombat",
        parser_version="tekken_mk-v0",
        result_type="rounds",
        implemented=False,
        primary_zone="top_center",
        allow_clock=False,
        notes="Round wins rather than a goals score.",
    )


PARSER = TekkenMkParser()
