"""EA FC on the nine real phone screenshots (tests/screenshots/ea_fc) plus rule tests on fake OCR."""
import json, pathlib
from dataclasses import replace

import numpy as np
import pytest

pytest.importorskip("rapidocr_onnxruntime")
from config import Settings
from core import glyphs
from core.ocr import RapidOcrEngine
from core.types import Box, Token
from games import get_parser
from tests.test_football_completion import FixedOcr, board, io

FOLDER = pathlib.Path(__file__).parent / "screenshots" / "ea_fc"
LABELS = json.loads((FOLDER / "labels.json").read_text())
OCR, S = RapidOcrEngine(), Settings()


def read(name, game="ea_fc", settings=S):
    return get_parser(game).run((FOLDER / name).read_bytes(), ["langmer", "vedantj"], OCR, settings)


@pytest.mark.parametrize("name", sorted(LABELS))
def test_real_screenshot(name):
    want, r = LABELS[name], read(name)
    if "reject" in want:
        assert r.status == "rejected" and r.reject_reason == want["reject"]
        return
    assert r.status == "ok"
    assert r.score == {"left": want["left"], "right": want["right"]}
    assert r.zone == want["zone"]
    assert r.clock_text == "90:00"
    if "left_name" in want:
        assert r.names["left"] == want["left_name"]


@pytest.mark.parametrize("name", ["stats_2_0.jpeg", "stats_2_3.jpeg", "banner_1_0.jpeg", "banner_2_3.jpeg"])
def test_completion_screens_are_unflagged(name):
    r = read(name)
    assert "completion_not_confirmed" not in r.flags and r.confidence >= 0.6


def test_usernames_come_from_cards_not_team_names():
    r = read("stats_2_3.jpeg")
    assert r.names == {"left": "langmer", "right": "Jayesh_Patil_014"}


def test_hud_only_at_90_is_flagged_not_trusted():
    r = read("hud_90_lan_ved.jpeg")
    assert r.status == "ok" and r.zone == "top_left"
    assert {"completion_not_confirmed", "names_truncated"} <= set(r.flags)
    assert r.confidence <= 0.55
    assert r.name_hints[0]["left_similarity"] >= 0.9   # "lan" is a prefix of "langmer"


def test_hud_only_rejected_when_completion_screen_required(monkeypatch):
    p = get_parser("ea_fc")
    monkeypatch.setattr(p, "layout", replace(p.layout, require_completion_screen=True))
    r = read("hud_90_lan_ved.jpeg")
    assert r.status == "rejected" and r.reject_reason == "completion_not_confirmed" and r.zone == "top_left"


def test_zones_exclude_the_clock_and_report_every_score_source():
    assert read("banner_1_0.jpeg").zones_with_scores == ["bottom_center", "top_left"]
    assert read("stats_2_0.jpeg").zones_with_scores == ["top_center"]
    assert read("hud_45_lan_kar.jpeg").zones_with_scores == ["top_left"]


def test_formation_selector_is_not_a_score():
    for n in ("hud_90_lan_ved.jpeg", "banner_1_0.jpeg"):
        assert "top_right" not in read(n).zones_with_scores


def test_unreadable_clock_follows_environment_setting():
    strict = Settings(require_clock_for_soccer_games_validity=True)
    assert read("stats_2_0.jpeg", settings=strict).status == "ok"       # clock is readable here


# ---- rules on fake OCR (no image content needed) ------------------------------
def test_plain_text_score_still_works_but_is_flagged_unconfirmed(monkeypatch):
    p = get_parser("ea_fc")
    img = io.BytesIO(); board().save(img, "PNG")
    r = p.run(img.getvalue(), [], FixedOcr("90:00"), Settings())
    assert r.status == "ok" and r.score == {"left": 2, "right": 0}
    assert "completion_not_confirmed" in r.flags


def test_fulltime_label_confirms_completion_on_plain_text():
    class Ocr(FixedOcr):
        def read(self, rgb, offset=(0, 0), scale=1.0):
            return super().read(rgb, offset, scale) + [Token("FULLTIME", Box(500, 640, 600, 670), 0.95)]
    p = get_parser("ea_fc")
    img = io.BytesIO(); board().save(img, "PNG")
    r = p.run(img.getvalue(), [], Ocr("90:00"), Settings())
    assert r.status == "ok" and "completion_not_confirmed" not in r.flags and "fulltime_banner" in r.flags


# ---- glyph helpers ------------------------------------------------------------
def _img_with_digits():
    import cv2
    im = np.full((120, 400, 3), 20, np.uint8)
    for x, ch in ((60, "2"), (300, "0")):
        cv2.putText(im, ch, (x, 90), cv2.FONT_HERSHEY_SIMPLEX, 2.4, (255, 255, 255), 6)
    cv2.circle(im, (200, 70), 14, (255, 255, 255), -1)   # stand-in logo, centred
    return im


class ScriptedReader:
    def __init__(self, text): self.text, self.calls = text, 0
    def read_lines(self, images):
        self.calls += 1
        return [(self.text, 0.5)] * len(images)


def test_read_digits_splits_around_the_logo():
    rgb = _img_with_digits()
    got = glyphs.read_digits(ScriptedReader("20"), rgb, Box(0, 0, 400, 120), center_x=200, dark_glyph=False, min_h=30, max_h=100)
    assert got and (got.left, got.right) == ("2", "0") and got.conf > 0.7


def test_read_digits_skips_when_engine_cannot_read_lines():
    rgb = _img_with_digits()
    assert glyphs.read_digits(FixedOcr("x"), rgb, Box(0, 0, 400, 120), center_x=200, dark_glyph=False, min_h=30, max_h=100) is None


def test_read_digits_rejects_wrong_length_text():
    rgb = _img_with_digits()
    assert glyphs.read_digits(ScriptedReader("203"), rgb, Box(0, 0, 400, 120), center_x=200, dark_glyph=False, min_h=30, max_h=100) is None


def test_engine_letters_that_look_like_digits_are_fixed():
    assert glyphs._digits("O l") == "01" and glyphs._digits("２０") == "20"
