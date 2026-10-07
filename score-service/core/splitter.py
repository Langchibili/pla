"""Image splitting rules.

1. Cut the image in two vertically and keep the TOP half as the main search area.
2. Split that top half horizontally into three parts: left, middle, right.
   - middle: where the score is expected
   - left / right: where the two player names are expected
The bottom half is only searched when nothing is found in the top half, so that a
score found there can be reported (and rejected by Strapi's zone rule).
"""
from __future__ import annotations
from dataclasses import dataclass
from .types import Box


@dataclass
class Regions:
    width: int
    height: int
    top_half: Box
    bottom_half: Box
    top_left: Box
    top_center: Box
    top_right: Box

    def zone_of(self, cx: float, cy: float) -> str:
        row = "top" if cy < self.height / 2 else "bottom"
        third = self.width / 3
        col = "left" if cx < third else ("center" if cx < 2 * third else "right")
        return f"{row}_{col}"


def split(width: int, height: int) -> Regions:
    half, third = height / 2, width / 3
    return Regions(
        width=width, height=height,
        top_half=Box(0, 0, width, half),
        bottom_half=Box(0, half, width, height),
        top_left=Box(0, 0, third, half),
        top_center=Box(third, 0, 2 * third, half),
        top_right=Box(2 * third, 0, width, half),
    )


def crop(arr, box: Box):
    """Crop a numpy image (H x W x C) to a Box."""
    return arr[int(box.y0):int(box.y1), int(box.x0):int(box.x1)]
