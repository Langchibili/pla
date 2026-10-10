"""DLS regression coverage using the supplied real result and in-progress screenshots."""
import json
import pathlib

import pytest

pytest.importorskip("rapidocr_onnxruntime")
from config import Settings
from core.ocr import RapidOcrEngine
from games import get_parser

FOLDER = pathlib.Path(__file__).parent / "screenshots" / "dls"
LABELS = json.loads((FOLDER / "labels.json").read_text())
OCR = RapidOcrEngine()
STRICT_SETTINGS = Settings(require_clock_for_soccer_games_validity=True)


@pytest.mark.parametrize("name", sorted(LABELS))
def test_original_dls_screenshot(name):
    expected = LABELS[name]
    result = get_parser("dls").run(
        (FOLDER / name).read_bytes(),
        ["langmer"],
        OCR,
        STRICT_SETTINGS,
    )

    if "reject" in expected:
        assert result.status == "rejected"
        assert result.reject_reason == expected["reject"]
        assert result.clock_text == expected["clock"]
        return

    assert result.status == "ok"
    assert result.score == {"left": expected["left"], "right": expected["right"]}
    assert result.clock_text == expected["clock"]
    assert result.zone == "top_center"
