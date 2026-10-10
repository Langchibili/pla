"""Finds the score in a list of OCR tokens.

What counts as a score (from the product rules):
  * two whole numbers, written like 2:0  2 : 0  2-0  2 - 0
  * for football a match clock may sit between them:  2 <time played> 0  (clock is dropped)
  * a number touching "%" is not a score (2%, 22%)
  * a number next to another number that touches "%" is not a score either
  * a number touching a "." is not a score (2.2, 22.2)
  * both numbers on the same line, roughly level, in a plausible score range
"""
from __future__ import annotations
import re
from dataclasses import dataclass
from .splitter import Regions
from .types import Atom, Box, ScorePair, Token

ATOM_RE = re.compile(r"[0-9]+|[:\-\u2013\u2014]|\+|%|\.|['\u2019\u2032`]|[^\W\d_]+|\S")


@dataclass
class FinderConfig:
    touch_ratio: float = 0.6        # gap (x glyph height) under which two atoms "touch"
    max_digits: int = 2
    score_min: int = 0
    score_max: int = 99
    allow_clock: bool = True
    allow_no_separator: bool = False


def atomize(tokens: list[Token]) -> list[Atom]:
    """Cut each token into numbers, separators, %, dots and words, with interpolated positions."""
    atoms = []
    for ti, t in enumerate(tokens):
        n = max(len(t.text), 1)
        for m in ATOM_RE.finditer(t.text):
            s = m.group()
            if s.isdigit() and s.isascii():
                kind = "NUM"
            elif s in ":-\u2013\u2014":
                kind = "SEP"
            elif s == "+":
                kind = "PLUS"
            elif s == "%":
                kind = "PCT"
            elif s == ".":
                kind = "DOT"
            elif s in "'\u2019\u2032`":
                kind = "TICK"
            else:
                kind = "WORD"
            x0 = t.box.x0 + t.box.w * m.start() / n
            x1 = t.box.x0 + t.box.w * m.end() / n
            atoms.append(Atom(kind, s, Box(x0, t.box.y0, x1, t.box.y1), t.conf, ti, m.span()))
    return atoms


def group_lines(atoms: list[Atom]) -> list[list[Atom]]:
    """Group atoms that sit on the same text line, each line ordered left to right."""
    lines: list[dict] = []
    for a in sorted(atoms, key=lambda a: a.box.cy):
        for ln in lines:
            if abs(a.box.cy - ln["cy"]) <= 0.6 * max(a.box.h, ln["h"]):
                ln["atoms"].append(a)
                ln["cy"] = sum(x.box.cy for x in ln["atoms"]) / len(ln["atoms"])
                ln["h"] = max(ln["h"], a.box.h)
                break
        else:
            lines.append({"cy": a.box.cy, "h": a.box.h, "atoms": [a]})
    return [sorted(ln["atoms"], key=lambda a: a.box.x0) for ln in lines]


def touching(a: Atom, b: Atom, ratio: float) -> bool:
    gap = max(b.box.x0 - a.box.x1, a.box.x0 - b.box.x1, 0.0)
    return gap <= ratio * max(a.box.h, b.box.h)


def _mark_invalid(line: list[Atom], cfg: FinderConfig) -> set[int]:
    n, bad, pct = len(line), set(), set()
    for i, a in enumerate(line):
        if a.kind != "NUM":
            continue
        if len(a.text) > cfg.max_digits:
            bad.add(i)
        for j in (i - 1, i + 1):
            if 0 <= j < n and line[j].kind in ("PCT", "DOT") and touching(a, line[j], cfg.touch_ratio):
                bad.add(i)
                if line[j].kind == "PCT":
                    pct.add(i)
    for i, a in enumerate(line):  # a number next to a number that touches %
        if a.kind != "NUM" or i in bad:
            continue
        for j in (i - 1, i + 1):
            if 0 <= j < n and j in pct and touching(a, line[j], cfg.touch_ratio):
                bad.add(i)
    return bad


def _find_clocks(line: list[Atom], bad: set[int], cfg: FinderConfig) -> set[int]:
    """Mark atoms that form a match clock (45:12 or 45') sitting BETWEEN two other numbers."""
    n, clock = len(line), set()

    def num_left(i):
        k = i - 1
        while k >= 0 and line[k].kind == "SEP":
            k -= 1
        return k >= 0 and line[k].kind == "NUM" and k not in bad

    def num_right(j):
        k = j + 1
        while k < n and line[k].kind == "SEP":
            k += 1
        return k < n and line[k].kind == "NUM" and k not in bad

    for i in range(n - 2):  # mm:ss
        a, s, b = line[i], line[i + 1], line[i + 2]
        if (a.kind == "NUM" and s.kind == "SEP" and s.text == ":" and b.kind == "NUM"
                and len(b.text) == 2 and len(a.text) <= 3
                and touching(a, s, cfg.touch_ratio) and touching(s, b, cfg.touch_ratio)
                and num_left(i) and num_right(i + 2)):
            clock |= {i, i + 1, i + 2}
    for i in range(n - 1):  # 45'
        a, t = line[i], line[i + 1]
        if (a.kind == "NUM" and t.kind == "TICK" and touching(a, t, cfg.touch_ratio)
                and num_left(i) and num_right(i + 1)):
            clock |= {i, i + 1}
    for i in range(n - 2):  # 90+1
        a, plus, b = line[i], line[i + 1], line[i + 2]
        if (a.kind == "NUM" and plus.kind == "PLUS" and b.kind == "NUM"
                and len(a.text) <= 3 and len(b.text) <= 2
                and touching(a, plus, cfg.touch_ratio) and touching(plus, b, cfg.touch_ratio)
                and num_left(i) and num_right(i + 2)):
            clock |= {i, i + 1, i + 2}
    return clock


def _pairs_in_line(line: list[Atom], regions: Regions, cfg: FinderConfig) -> list[ScorePair]:
    bad = _mark_invalid(line, cfg)
    clock = _find_clocks(line, bad, cfg) if cfg.allow_clock else set()
    cand = [k for k, a in enumerate(line) if a.kind == "NUM" and k not in bad and k not in clock]
    out = []
    for p in range(len(cand) - 1):
        i, j = cand[p], cand[p + 1]
        between = range(i + 1, j)
        clock_idx = [k for k in between if k in clock]
        others = [k for k in between if k not in clock]
        a, b = line[i], line[j]
        if any(line[k].kind != "SEP" for k in others):
            continue                      # a word, number or symbol sits between: not a score
        if len(others) > (2 if clock_idx else 1):
            continue
        clock_only = (
            cfg.allow_clock
            and not clock_idx
            and len(others) == 1
            and line[others[0]].text == ":"
            and len(b.text) == 2
            and int(b.text) <= 59
        )
        link = "clock_only" if clock_only else ("clock" if clock_idx else ("sep" if others else "none"))
        if link == "none" and not cfg.allow_no_separator:
            continue
        va, vb = int(a.text), int(b.text)
        if not (cfg.score_min <= va <= cfg.score_max and cfg.score_min <= vb <= cfg.score_max):
            continue

        h = max(a.box.h, b.box.h)
        align = 1 - min(1.0, abs(a.box.cy - b.box.cy) / (0.5 * h))
        size = min(a.box.h, b.box.h) / h
        gap_h = (b.box.x0 - a.box.x1) / h
        limit = 14.0 if link == "clock" else 6.0
        if gap_h < 0:
            gap_score = 0.3
        elif gap_h <= limit / 2:
            gap_score = 1.0
        else:
            gap_score = max(0.0, 1 - (gap_h - limit / 2) / (limit / 2))
        link_score = {"sep": 1.0, "clock": 0.95, "clock_only": 1.0, "none": 0.6}[link]
        quality = 0.35 * align + 0.20 * size + 0.20 * gap_score + 0.25 * link_score

        used = [a, b] + [line[k] for k in others] + [line[k] for k in clock_idx]
        conf = min(x.conf for x in used if x.kind in ("NUM", "SEP")) if used else a.conf
        cx, cy = (a.box.x0 + b.box.x1) / 2, (a.box.cy + b.box.cy) / 2
        out.append(ScorePair(
            left=a, right=b, link=link,
            clock_text=("".join(line[k].text for k in clock_idx)
                        or (f"{a.text}:{b.text}" if clock_only else None)),
            quality=round(quality, 4), score=round(quality * conf, 4),
            zone=regions.zone_of(cx, cy),
            consumed=[(x.src, x.span) for x in used],
        ))
    if cfg.allow_clock:
        for i, atom in enumerate(line):
            if atom.kind != "NUM" or i in bad or i in clock or len(atom.text) > 3:
                continue
            clock_atoms: list[Atom] = []
            clock_text = None
            if i + 1 < len(line) and line[i + 1].kind == "TICK":
                clock_atoms = [atom, line[i + 1]]
                clock_text = f"{atom.text}{line[i + 1].text}"
            elif (
                i + 2 < len(line)
                and line[i + 1].kind == "PLUS"
                and line[i + 2].kind == "NUM"
                and len(line[i + 2].text) <= 2
            ):
                clock_atoms = [atom, line[i + 1], line[i + 2]]
                clock_text = f"{atom.text}+{line[i + 2].text}"
            if clock_text:
                out.append(ScorePair(
                    left=atom, right=atom, link="clock_only", clock_text=clock_text,
                    quality=atom.conf, score=atom.conf,
                    zone=regions.zone_of(atom.box.cx, atom.box.cy),
                    consumed=[(item.src, item.span) for item in clock_atoms],
                ))
    return out


def find_pairs(tokens: list[Token], regions: Regions, cfg: FinderConfig) -> list[ScorePair]:
    atoms = atomize(tokens)
    pairs = []
    for line in group_lines(atoms):
        pairs += _pairs_in_line(line, regions, cfg)
    return sorted(pairs, key=lambda p: p.score, reverse=True)
