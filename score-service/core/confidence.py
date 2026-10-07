"""Turns the individual checks into one confidence value Strapi can compare to its threshold."""
from __future__ import annotations


def combine(best_score: float, names: dict, ambiguous: bool, flags: list[str]) -> float:
    conf = best_score
    found = sum(1 for s in ("left", "right") if names.get(s))
    conf *= {2: 1.0, 1: 0.85, 0: 0.7}[found]
    if "blurry" in flags:
        conf *= 0.9
    if ambiguous:
        conf = min(conf, 0.45)   # two near-equal readings: always send to review
    return round(max(0.0, min(1.0, conf)), 4)
