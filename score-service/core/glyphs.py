"""Reads the big, stylised score digits that a normal OCR pass tends to skip.

Typical layout (EA FC): <digit> <game logo> <digit>. The caller gives a search window and the size of a
nearby anchor text (the match clock or a FULLTIME label). This module then:
  1. cuts the window into connected shapes and keeps the ones sized like digits,
  2. treats the shape nearest the window centre as the logo and the shapes either side as the two scores,
  3. stitches the digit crops into one text line and has the engine read it several ways, then votes.

Nothing here knows about a particular game. Games pass the window, polarity and size limits.
"""
from __future__ import annotations
import unicodedata
from collections import Counter
from dataclasses import dataclass

import numpy as np

from .types import Box

VARIANTS = [(48, 6), (48, 14), (32, 6), (40, 10)]   # (line height px, gap px between digits)
_FIX = {ord(c): "0" for c in "Oo〇"} | {ord(c): "1" for c in "lI|"}


@dataclass
class DigitRead:
    left: str
    right: str
    conf: float          # 0-1, from agreement between readings and the engine's own confidence
    agreement: float     # share of valid readings that gave the winning text
    left_box: Box
    right_box: Box


def find_components(rgb: np.ndarray, window: Box, dark_glyph: bool, min_h: float, max_h: float) -> list[Box]:
    import cv2
    x0, y0 = max(int(window.x0), 0), max(int(window.y0), 0)
    x1, y1 = min(int(window.x1), rgb.shape[1]), min(int(window.y1), rgb.shape[0])
    if x1 - x0 < 8 or y1 - y0 < 8:
        return []
    grey = cv2.cvtColor(np.ascontiguousarray(rgb[y0:y1, x0:x1]), cv2.COLOR_RGB2GRAY)
    flag = cv2.THRESH_BINARY_INV if dark_glyph else cv2.THRESH_BINARY
    _, mask = cv2.threshold(grey, 0, 255, flag + cv2.THRESH_OTSU)
    n, _, st, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    boxes = []
    for i in range(1, n):
        x, y, w, h, area = (int(v) for v in st[i])
        if min_h <= h <= max_h and w <= 1.6 * h and area >= 0.15 * w * h:
            boxes.append(Box(x0 + x, y0 + y, x0 + x + w, y0 + y + h))
    return _merge_stacked(sorted(boxes, key=lambda b: b.x0))


def _merge_stacked(boxes: list[Box]) -> list[Box]:
    """One glyph split in two by compression (pieces overlapping in x) becomes one box again."""
    out: list[Box] = []
    for b in boxes:
        if out:
            p = out[-1]
            overlap = min(p.x1, b.x1) - max(p.x0, b.x0)
            if overlap > 0.5 * min(p.w, b.w):
                out[-1] = Box(min(p.x0, b.x0), min(p.y0, b.y0), max(p.x1, b.x1), max(p.y1, b.y1))
                continue
        out.append(b)
    return out


def pick_digit_groups(boxes: list[Box], center_x: float):
    """Split shapes into (left digits, right digits) around the logo. None if either side is empty."""
    if len(boxes) < 2:
        return None
    h = float(np.median([b.h for b in boxes]))
    logo = min(boxes, key=lambda b: abs(b.cx - center_x))
    logo = logo if abs(logo.cx - center_x) <= 0.6 * h else None
    rest = [b for b in boxes if b is not logo]
    left = sorted((b for b in rest if b.cx < center_x), key=lambda b: -b.cx)
    right = sorted((b for b in rest if b.cx >= center_x), key=lambda b: b.cx)
    if not left or not right:
        return None

    def grow(side, sign):
        grp = [side[0]]
        for b in side[1:]:
            gap = (grp[-1].x0 - b.x1) if sign < 0 else (b.x0 - grp[-1].x1)
            if gap <= 0.5 * h:
                grp.append(b)
            else:
                break
        return sorted(grp, key=lambda b: b.x0)

    lg, rg = grow(left, -1), grow(right, +1)
    if len(lg) > 2 or len(rg) > 2:      # a score is one or two digits a side
        return None
    return lg, rg


def _stitch(rgb: np.ndarray, boxes: list[Box], dark_glyph: bool, h: int, gap: int, pad: int = 2) -> np.ndarray:
    import cv2
    y0 = max(int(min(b.y0 for b in boxes)) - pad, 0)
    y1 = min(int(max(b.y1 for b in boxes)) + pad, rgb.shape[0])
    parts = []
    for b in boxes:
        x0, x1 = max(int(b.x0) - pad, 0), min(int(b.x1) + pad, rgb.shape[1])
        g = cv2.cvtColor(np.ascontiguousarray(rgb[y0:y1, x0:x1]), cv2.COLOR_RGB2GRAY)
        g = cv2.normalize(g, None, 0, 255, cv2.NORM_MINMAX)
        if not dark_glyph:
            g = 255 - g                                   # engines expect dark text on light
        w = max(int(g.shape[1] * h / g.shape[0]), 6)
        parts += [cv2.resize(g, (w, h), interpolation=cv2.INTER_CUBIC), np.full((h, gap), 255, np.uint8)]
    line = np.hstack(parts[:-1])
    line = cv2.copyMakeBorder(line, 10, 10, 30, 30, cv2.BORDER_CONSTANT, value=255)
    return cv2.cvtColor(line, cv2.COLOR_GRAY2RGB)


def _digits(text: str) -> str:
    return unicodedata.normalize("NFKC", text).translate(_FIX).replace(" ", "")


def read_digits(ocr, rgb: np.ndarray, window: Box, *, center_x: float, dark_glyph: bool,
                min_h: float, max_h: float) -> DigitRead | None:
    reader = getattr(ocr, "read_lines", None)
    if reader is None:
        return None
    groups = pick_digit_groups(find_components(rgb, window, dark_glyph, min_h, max_h), center_x)
    if groups is None:
        return None
    lg, rg = groups
    want = len(lg) + len(rg)
    allb = lg + rg
    # Readings: the digits stitched into one line (4 ways) and each digit read alone (2 sizes). The solo
    # reads exist because engines collapse two identical neighbours ("1 1" -> "1") when stitched.
    images = [_stitch(rgb, allb, dark_glyph, h, gap) for h, gap in VARIANTS]
    images += [_stitch(rgb, [b], dark_glyph, h, 6) for h in (48, 32) for b in allb]
    try:
        results = reader(images)
    except Exception:
        return None
    n_st = len(VARIANTS)
    texts = [(_digits(t), c) for t, c in results[:n_st]]
    for k in range(2):
        solo = results[n_st + k * want: n_st + (k + 1) * want]
        parts = [_digits(t) for t, _ in solo]
        if all(len(x) == 1 and x.isdigit() for x in parts):
            texts.append(("".join(parts), sum(c for _, c in solo) / want))
    votes: dict[str, list[float]] = {}
    for d, conf in texts:
        if d.isdigit() and len(d) == want:
            votes.setdefault(d, []).append(conf)
    if not votes:
        return None
    win, confs = max(votes.items(), key=lambda kv: (len(kv[1]), sum(kv[1]) / len(kv[1])))
    total_valid = sum(len(v) for v in votes.values())
    agreement = len(confs) / total_valid
    mean_conf = sum(confs) / len(confs)
    # Stylised digits make engines under-report confidence, so agreement and support carry most of the weight.
    conf = round(min(1.0, 0.35 * agreement + 0.25 * min(1.0, len(confs) / 3) + 0.4 * min(1.0, mean_conf / 0.6)), 4)
    nl = len(lg)
    union = lambda g: Box(min(b.x0 for b in g), min(b.y0 for b in g), max(b.x1 for b in g), max(b.y1 for b in g))
    return DigitRead(win[:nl], win[nl:], conf, agreement, union(lg), union(rg))
