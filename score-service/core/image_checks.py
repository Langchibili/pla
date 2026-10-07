"""First gate: is this image usable at all?

Order matters: orientation is checked first because a portrait image is rejected
outright and the player is told to upload the original landscape screenshot.
"""
from __future__ import annotations
import hashlib, io
import numpy as np
from PIL import Image, ImageOps
from .types import Rejection

Image.MAX_IMAGE_PIXELS = 40_000_000  # guards against decompression bombs


def load_image(data: bytes, max_bytes: int) -> Image.Image:
    if len(data) > max_bytes:
        raise Rejection("image_too_large", f"Image is larger than {max_bytes // 1_000_000} MB.")
    try:
        img = Image.open(io.BytesIO(data))
        img.load()
    except Exception:
        raise Rejection("not_an_image", "The file could not be read as an image.")
    img = ImageOps.exif_transpose(img)  # honour phone rotation flags before judging orientation
    return img.convert("RGB")


def check_orientation(img: Image.Image) -> None:
    w, h = img.size
    if w <= h:
        raise Rejection(
            "not_landscape",
            "Upload the original landscape screenshot. Portrait or square images are not accepted.",
        )


def check_size(img: Image.Image, min_w: int, min_h: int) -> None:
    w, h = img.size
    if w < min_w or h < min_h:
        raise Rejection("image_too_small", f"Image must be at least {min_w}x{min_h}px.")


def blur_score(img: Image.Image) -> float:
    """Variance of the Laplacian on a downscaled grey image. Higher = sharper."""
    import cv2
    grey = np.asarray(img.convert("L"))
    scale = 640 / grey.shape[1]
    if scale < 1:
        grey = cv2.resize(grey, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
    return float(cv2.Laplacian(grey, cv2.CV_64F).var())


def check_blur(score: float, reject_below: float, flag_below: float, flags: list) -> None:
    if score < reject_below:
        raise Rejection("too_blurry", "The screenshot is too blurry or blank to read.")
    if score < flag_below:
        flags.append("blurry")


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def dhash_hex(img: Image.Image) -> str:
    """64-bit difference hash. Strapi can compare these to catch re-used or lightly edited screenshots."""
    small = np.asarray(img.convert("L").resize((9, 8), Image.LANCZOS), dtype=np.int16)
    bits = (small[:, 1:] > small[:, :-1]).flatten()
    return f"{int(''.join('1' if b else '0' for b in bits), 2):016x}"


def downscale(img: Image.Image, max_width: int) -> tuple[Image.Image, float]:
    """Shrink very large screenshots for OCR speed. Returns (image, scale)."""
    if img.width <= max_width:
        return img, 1.0
    scale = max_width / img.width
    return img.resize((max_width, int(img.height * scale)), Image.LANCZOS), scale
