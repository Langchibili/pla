"""Call of Duty Mobile - not built yet. Switch on by setting implemented=True and calibrating against real screenshots.

Steps to add this game:
  1. Put real screenshots in tests/screenshots/codm/ with labels.json.
  2. Set primary_zone (where the score sits), result_type and any pattern overrides below.
  3. Override a contract step in GameParser only if the screen needs it.
  4. Run: python tools/evaluate.py codm, then set the Strapi game record to active.
"""
from .base import GameParser, Layout


class CodmParser(GameParser):
    layout = Layout(
        key="codm",
        display="Call of Duty Mobile",
        parser_version="codm-v0",
        result_type="team_score",
        implemented=False,
        primary_zone="top_center",
        allow_clock=False,
        notes="Team score modes.",
    )


PARSER = CodmParser()
