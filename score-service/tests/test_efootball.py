"""eFootball on three real phone screenshots (tests/screenshots/efootball) plus rule tests on fake OCR."""
import io, json, pathlib
from dataclasses import replace

import pytest

pytest.importorskip("rapidocr_onnxruntime")
from config import Settings
from core.ocr import RapidOcrEngine
from core.types import Box, Token
from games import get_parser
from tests.test_football_completion import FixedOcr, board

FOLDER = pathlib.Path(__file__).parent / "screenshots" / "efootball"
LABELS = json.loads((FOLDER / "labels.json").read_text())
OCR = RapidOcrEngine()
NAMES = ["langmer fc", "Internazionale Milano"]


def norm(s):      # rapidocr 1.2.x keeps the space in "langmer fc", 1.4.x drops it
    return "".join(c for c in (s or "").casefold() if c.isalnum())


def read(name, require_clock=False):
    s = Settings(require_clock_for_soccer_games_validity=require_clock)
    return get_parser("efootball").run((FOLDER / name).read_bytes(), NAMES, OCR, s)


@pytest.mark.parametrize("name", sorted(LABELS))
def test_real_screenshot(name):
    want, r = LABELS[name], read(name)
    if "reject" in want:
        assert r.status == "rejected" and r.reject_reason == want["reject"]
        return
    assert r.status == "ok" and r.score == {"left": want["left"], "right": want["right"]} and r.zone == want["zone"]
    if "left_name" in want:
        assert norm(r.names["left"]) == norm(want["left_name"])


def test_full_time_screen_is_a_confirmed_result_without_a_clock():
    for strict in (False, True):
        r = read("fulltime_0_8.jpg", require_clock=strict)
        assert r.status == "ok" and r.zone == "top_center" and r.clock_text is None
        assert {"fulltime_banner", "clock_not_shown"} <= set(r.flags)
        assert "completion_not_confirmed" not in r.flags and r.confidence >= 0.6
        assert (norm(r.names["left"]), norm(r.names["right"])) == ("langmerfc", "internazionalemilano")
        assert r.name_hints[0]["left_similarity"] == 1.0


def test_stats_button_icon_is_not_a_score():
    r = read("fulltime_0_8.jpg")
    assert r.zones_with_scores == ["top_center"]          # the "2-0" icon (top-left) must not be reported


def test_goal_banner_is_flagged_not_trusted():
    r = read("banner_0_8.jpg")
    assert r.status == "ok" and r.zone == "bottom_center"
    assert "completion_not_confirmed" in r.flags and r.confidence <= 0.55
    assert read("banner_0_8.jpg", require_clock=True).reject_reason == "match_clock_missing"


def test_live_hud_below_90_is_rejected_with_its_score_and_zone():
    r = read("hud_44_0_3.jpg")
    assert r.reject_reason == "match_not_finished" and r.clock_text == "44:43"
    assert r.score == {"left": 0, "right": 3} and r.zone == "top_left"


def test_efootball_is_calibrated_and_wants_top_center_only():
    L = get_parser("efootball").layout
    assert L.calibrated and L.accepted_zones == ("top_center",) and L.minimum_completed_clock_minute == 90


def test_text_only_score_with_clock_still_works():
    p = get_parser("efootball")
    img = io.BytesIO(); board().save(img, "PNG")
    r = p.run(img.getvalue(), [], FixedOcr("90:00"), Settings())
    assert r.status == "ok" and r.score == {"left": 2, "right": 0}
    r = p.run(img.getvalue(), [], FixedOcr("45:00"), Settings())
    assert r.status == "rejected" and r.reject_reason == "match_not_finished"


def test_uncalibrated_layout_flag_still_applies_to_any_future_game(monkeypatch):
    p = get_parser("efootball")
    monkeypatch.setattr(p, "layout", replace(p.layout, calibrated=False))
    img = io.BytesIO(); board().save(img, "PNG")
    r = p.run(img.getvalue(), [], FixedOcr("90:00"), Settings())
    assert "uncalibrated_layout" in r.flags and r.confidence <= 0.55
