"""Run a game's fixed test set and print accuracy. Run before every change goes live.

    python tools/evaluate.py dls

Put real screenshots in tests/screenshots/<game>/ and describe them in labels.json:
    {"final_01.png": {"left": 2, "right": 0, "zone": "top_center", "left_name": "KINGSLEY FC"},
     "midmatch_03.png": {"zone": "top_left"},
     "portrait_02.png": {"reject": "not_landscape"},
     "blank_04.png": {"no_score": true}}
Never train on this set: keep it fixed. Admin-corrected screenshots go to a separate training folder.
"""
import json, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from config import settings
from core.ocr import RapidOcrEngine
from games import get_parser


def norm(s) -> str:
    return "".join(c for c in (s or "").casefold() if c.isalnum())


def main(game: str) -> int:
    folder = pathlib.Path(__file__).resolve().parents[1] / "tests" / "screenshots" / game
    labels_path = folder / "labels.json"
    if not labels_path.exists():
        print(f"No labels.json in {folder}. Add real screenshots first."); return 1
    labels, parser, ocr = json.loads(labels_path.read_text()), get_parser(game), RapidOcrEngine()
    ok = bad = 0
    for name, want in labels.items():
        res = parser.run((folder / name).read_bytes(), [], ocr, settings)
        if "reject" in want:       good = res.status == "rejected" and res.reject_reason == want["reject"]
        elif want.get("no_score"): good = res.status == "no_score_found"
        else:
            good = res.status == "ok"
            if "left" in want:      good &= res.score == {"left": want["left"], "right": want["right"]}
            if "zone" in want:      good &= res.zone == want["zone"]
            if "left_name" in want: good &= norm(res.names["left"]) == norm(want["left_name"])   # engines differ on spaces
        ok, bad = ok + good, bad + (not good)
        if not good:
            print(f"MISS {name}: got status={res.status} score={res.score} zone={res.zone} conf={res.confidence} flags={res.flags}")
    print(f"{game} {parser.layout.parser_version}: {ok}/{ok + bad} correct ({100 * ok / max(ok + bad, 1):.1f}%)")
    return 0 if bad == 0 else 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "dls"))
