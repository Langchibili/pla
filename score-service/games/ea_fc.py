"""EA Sports FC (Mobile). Calibrated on 9 real screenshots from one phone (1080x499), see tests/screenshots/ea_fc.

Three screens carry the score (see football_screens.py):
  * post-match stats screen: big digits top-centre, `90:00` stacked under them
  * FULLTIME banner: big digits bottom-centre, FULLTIME label under them
  * live HUD: small digits top-left, green clock box to their right (same corner at 45:00 and 90:00)
A result needs clock >= 90 plus a completion screen. Strapi should allow the zones top_center and bottom_center
for this game; a top_left reading is only a live HUD. Calibrate on more devices before paid events.
"""
from .base import Layout
from .football_screens import FootballScreenParser


class EaFcParser(FootballScreenParser):
    layout = Layout(
        key="ea_fc",
        display="EA Sports FC",
        parser_version="ea_fc-v4",
        result_type="head_to_head",
        implemented=True,
        primary_zone="top_center",
        accepted_zones=("top_center", "bottom_center"),
        allow_clock=True,
        minimum_completed_clock_minute=90,
        fulltime_label_replaces_clock=True,
        notes="Stats screen (top-centre) or FULLTIME banner (bottom-centre) with clock >= 90. HUD (top-left) is flagged.",
    )


PARSER = EaFcParser()
