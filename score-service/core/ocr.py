"""OCR adapter. Everything else in the service works on `Token` lists, so the engine can be
swapped (or faked in tests) without touching the parsing rules.

Default engine: RapidOCR (PaddleOCR models running on ONNX Runtime, CPU only).
"""
from __future__ import annotations
import threading
from typing import Protocol
import numpy as np
from .types import Box, Token


class OcrEngine(Protocol):
    def read(self, rgb: np.ndarray, offset: tuple = (0, 0), scale: float = 1.0) -> list[Token]:
        """Return tokens in the coordinates of the ORIGINAL image: (x / scale) + offset."""

    # Optional. Engines that can recognise ready-made text-line crops (no detection step) add:
    #   def read_lines(self, images: list[np.ndarray]) -> list[tuple[str, float]]
    # Parsers that read stylised score digits use it when present and skip that step when it is not.


class RapidOcrEngine:
    def __init__(self):
        self._engine = None
        self._lock = threading.Lock()

    def _get(self):
        if self._engine is None:
            with self._lock:
                if self._engine is None:
                    from rapidocr_onnxruntime import RapidOCR
                    self._engine = RapidOCR()
        return self._engine

    def read(self, rgb, offset=(0, 0), scale=1.0):
        result, _ = self._get()(rgb, use_cls=False)
        tokens = []
        for item in result or []:
            pts, text, conf = item[0], str(item[1]), float(item[2])
            xs, ys = [p[0] for p in pts], [p[1] for p in pts]
            box = Box(min(xs) / scale + offset[0], min(ys) / scale + offset[1],
                      max(xs) / scale + offset[0], max(ys) / scale + offset[1])
            if text.strip():
                tokens.append(Token(text=text, box=box, conf=conf))
        return tokens


    def read_lines(self, images):
        """Recognise already-cropped text lines (no detection). Used for big stylised score digits
        that the detector skips. rapidocr 1.2.x exposes `text_recognizer`, 1.4.x exposes `text_rec`."""
        eng = self._get()
        rec = getattr(eng, "text_rec", None) or getattr(eng, "text_recognizer", None)
        if rec is None:
            raise NotImplementedError("this rapidocr build cannot recognise cropped lines")
        with self._lock:
            res = rec(list(images))
        rows = res[0] if isinstance(res, tuple) else res
        return [(str(t), float(c)) for t, c in rows]


def enhance(rgb: np.ndarray, factor: float = 2.0) -> tuple[np.ndarray, float]:
    """Second-chance preprocessing for stylised score digits: grey, local contrast, upscale."""
    import cv2
    grey = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    grey = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8)).apply(grey)
    grey = cv2.resize(grey, None, fx=factor, fy=factor, interpolation=cv2.INTER_CUBIC)
    return cv2.cvtColor(grey, cv2.COLOR_GRAY2RGB), factor
