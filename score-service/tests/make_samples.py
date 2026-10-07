"""Draws fake game screenshots for tests. Real screenshots go in tests/screenshots/<game>/."""
from PIL import Image, ImageDraw, ImageFont

FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def board(score="2 - 0", left="KINGSLEY FC", right="ZED UNITED", *, size=(1280, 720), score_xy=(0.5, 0.09),
          clock=None, extra=None, logo=True):
    W, H = size
    img = Image.new("RGB", size, (24, 90, 40))
    d = ImageDraw.Draw(img)
    big, mid = ImageFont.truetype(FONT, 54), ImageFont.truetype(FONT, 40)
    d.rectangle([W * 0.12, H * 0.03, W * 0.88, H * 0.16], fill=(15, 15, 30))
    if logo:
        d.ellipse([W * 0.14, H * 0.05, W * 0.14 + 50, H * 0.05 + 50], fill=(220, 60, 60))
        d.rectangle([W * 0.82, H * 0.05, W * 0.82 + 50, H * 0.05 + 50], fill=(60, 120, 220))
    lw = d.textlength(left, font=mid)
    d.text((W * 0.40 - lw, H * 0.065), left, font=mid, fill="white")   # left name ends inside the left third
    d.text((W * 0.60, H * 0.065), right, font=mid, fill="white")       # right name starts inside the right third
    cx, cy = W * score_xy[0], H * score_xy[1]
    text = score if clock is None else f"{score.split()[0]}   {clock}   {score.split()[-1]}"
    tw = d.textlength(text, font=big)
    d.text((cx - tw / 2, cy - 30), text, font=big, fill="white")
    for (x, y, t) in extra or []:
        d.text((W * x, H * y), t, font=big, fill="white")
    return img
