"""Reads the two player names: text only, from the left and right thirds.

Logos and pictures are ignored because only OCR text is used, and junk reads are
filtered out (single glyphs, clocks, percentages, anything not matching the game's name pattern).
The service never decides whether a name is right. It returns what it read plus a
similarity hint against the names Strapi expects; Strapi makes the decision.
"""
from __future__ import annotations
import re
from difflib import SequenceMatcher
from .splitter import Regions
from .types import ScorePair, Token

CLOCK_LIKE = re.compile(r"^\d{1,3}\s*[:'\u2019]\s*\d{0,2}$")


def _residual(tok: Token, consumed_spans: list) -> str:
    """Token text with the characters that belong to the score removed."""
    chars = list(tok.text)
    for s, e in consumed_spans:
        for k in range(s, min(e, len(chars))):
            chars[k] = " "
    return re.sub(r"\s+", " ", "".join(chars)).strip(" -:|")


def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", s.casefold())


def read_names(tokens: list[Token], pair: ScorePair, regions: Regions, *,
               name_pattern: str | None, side_thirds_only: bool, min_conf: float = 0.45):
    pat = re.compile(name_pattern) if name_pattern else None
    consumed: dict[int, list] = {}
    for src, span in pair.consumed:
        consumed.setdefault(src, []).append(span)

    band = 2.5 * max(pair.left.box.h, pair.right.box.h)
    pair_cy = (pair.left.box.cy + pair.right.box.cy) / 2
    third = regions.width / 3
    in_center = pair.zone.endswith("center")

    left, right = [], []
    for i, t in enumerate(tokens):
        text = _residual(t, consumed.get(i, []))
        letters = sum(c.isalpha() for c in text)
        if letters < 1 or len(re.sub(r"\W", "", text)) < 2:
            continue
        if "%" in text or CLOCK_LIKE.match(text) or t.conf < min_conf:
            continue
        if pat and not pat.match(text):
            continue
        if abs(t.box.cy - pair_cy) > band:
            continue
        item = (t, text)
        if t.box.cx < pair.left.box.x0:
            if not (side_thirds_only and in_center) or t.box.cx < third:
                left.append(item)
        elif t.box.cx > pair.right.box.x1:
            if not (side_thirds_only and in_center) or t.box.cx > 2 * third:
                right.append(item)
    return _nearest_group(left, "left"), _nearest_group(right, "right")


def _nearest_group(items, side):
    """Merge neighbouring tokens into one name and return the group closest to the score."""
    if not items:
        return None
    items = sorted(items, key=lambda it: it[0].box.x0)
    groups, cur = [], [items[0]]
    for it in items[1:]:
        prev = cur[-1][0]
        if it[0].box.x0 - prev.box.x1 <= 2.0 * max(prev.box.h, it[0].box.h):
            cur.append(it)
        else:
            groups.append(cur)
            cur = [it]
    groups.append(cur)
    g = max(groups, key=lambda g: g[-1][0].box.x1) if side == "left" else min(groups, key=lambda g: g[0][0].box.x0)
    return {
        "text": " ".join(text for _, text in g),
        "conf": round(sum(t.conf for t, _ in g) / len(g), 4),
    }


def name_hints(read: dict, expected: list[str]) -> list[dict]:
    """How closely each expected name matches what was read on each side (0-1)."""
    hints = []
    for exp in expected:
        row = {"expected": exp}
        for side in ("left", "right"):
            got = read.get(side)
            row[f"{side}_similarity"] = round(SequenceMatcher(None, _norm(exp), _norm(got)).ratio(), 3) if got else 0.0
        hints.append(row)
    return hints
