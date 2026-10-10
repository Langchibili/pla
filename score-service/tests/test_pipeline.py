"""End to end on drawn screenshots with the real OCR engine. Skipped if RapidOCR is not installed."""
import io
import pytest
from config import Settings
from core.ocr import RapidOcrEngine
from games import get_parser
from tests.make_samples import board

pytest.importorskip("rapidocr_onnxruntime")
OCR, S = RapidOcrEngine(), Settings(require_clock_for_soccer_games_validity=False)


def run(img, names=("KINGSLEY FC", "ZED UNITED"), game="dls"):
    buf = io.BytesIO()
    img.save(buf, "PNG")
    return get_parser(game).run(buf.getvalue(), list(names), OCR, S)


def test_normal_final_score():
    r = run(board("2 - 0"))
    assert r.status == "ok" and r.score == {"left": 2, "right": 0}
    assert r.zone == "top_center" and r.confidence >= 0.6
    assert r.names["left"] and "KINGSLEY" in r.names["left"].upper()
    assert r.names["right"] and "ZED" in r.names["right"].upper()
    assert r.name_hints[0]["left_similarity"] > 0.8


def test_colon_format():
    r = run(board("3:1"))
    assert r.status == "ok" and r.score == {"left": 3, "right": 1}


def test_portrait_is_rejected_and_player_told():
    r = run(board("2 - 0", size=(720, 1280)))
    assert r.status == "rejected" and r.reject_reason == "not_landscape"
    assert "landscape" in r.message.lower()


def test_score_in_wrong_zone_is_reported_with_that_zone():
    r = run(board("2 - 0", score_xy=(0.5, 0.09)).copy())
    assert r.zone == "top_center"
    img = board("2 - 0", score_xy=(0.5, 0.09))
    from PIL import ImageDraw
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, 1280, 140], fill=(24, 90, 40))     # wipe the real scoreboard
    wrong = board("1 - 0", score_xy=(0.5, 0.88), logo=False)
    img.paste(wrong.crop((0, 560, 1280, 720)), (0, 560))
    r = run(img)
    assert r.status == "ok" and r.zone == "bottom_center"


def test_percent_is_not_a_score():
    r = run(board("22%", left="", right=""))
    assert r.status == "no_score_found"


def test_decimal_is_not_a_score():
    r = run(board("2.2", left="", right=""))
    assert r.status == "no_score_found"


def test_bad_file():
    r = get_parser("dls").run(b"not an image", [], OCR, S)
    assert r.status == "rejected" and r.reject_reason == "not_an_image"


def test_unimplemented_game_is_not_read():
    r = get_parser("ea_fc").run(b"x", [], OCR, S)
    assert r.status == "unsupported_game"
