"""Plain data types shared by the core pipeline. No framework imports here."""
from __future__ import annotations
from dataclasses import dataclass, field, asdict
from typing import Optional


@dataclass
class Box:
    x0: float
    y0: float
    x1: float
    y1: float

    @property
    def w(self): return self.x1 - self.x0
    @property
    def h(self): return self.y1 - self.y0
    @property
    def cx(self): return (self.x0 + self.x1) / 2
    @property
    def cy(self): return (self.y0 + self.y1) / 2


@dataclass
class Token:
    """One piece of text from the OCR engine, in full-image pixel coordinates."""
    text: str
    box: Box
    conf: float


@dataclass
class Atom:
    """A smaller unit cut out of a token: a number, separator, %, dot, tick or word."""
    kind: str            # NUM | SEP | PCT | DOT | TICK | WORD
    text: str
    box: Box
    conf: float
    src: int             # index of the source token
    span: tuple = (0, 0)  # character span inside the source token


@dataclass
class ScorePair:
    left: Atom
    right: Atom
    link: str            # "sep" (":" or "-"), "clock" (time played between) or "none"
    clock_text: Optional[str]
    quality: float       # geometry / layout quality, 0-1
    score: float         # quality x OCR confidence, 0-1
    zone: str            # e.g. top_center
    consumed: list = field(default_factory=list)  # (src, span) pieces that belong to the score


@dataclass
class Rejection(Exception):
    reason: str
    message: str

    def __str__(self): return f"{self.reason}: {self.message}"


@dataclass
class ReadResult:
    status: str                      # ok | no_score_found | rejected | unsupported_game | error
    game_key: str
    parser_version: str
    reject_reason: Optional[str] = None
    message: Optional[str] = None
    score: Optional[dict] = None     # {"left": int, "right": int}
    score_text: Optional[str] = None
    link: Optional[str] = None
    clock_text: Optional[str] = None
    zone: Optional[str] = None
    zones_with_scores: list = field(default_factory=list)
    names: dict = field(default_factory=lambda: {"left": None, "right": None})
    name_hints: list = field(default_factory=list)
    confidence: float = 0.0
    flags: list = field(default_factory=list)
    candidates: list = field(default_factory=list)
    image: dict = field(default_factory=dict)
    timings_ms: dict = field(default_factory=dict)

    def to_dict(self): return asdict(self)
