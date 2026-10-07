"""All tunables come from environment variables so nothing is hard-coded in the image."""
from __future__ import annotations
import os
from dataclasses import dataclass, field


def _env(name, default=None): return os.environ.get(name, default)
def _bool(name, default=False): return str(_env(name, str(default))).lower() in ("1", "true", "yes")


@dataclass
class Settings:
    api_key: str = field(default_factory=lambda: _env("SCORE_SERVICE_API_KEY", ""))
    webhook_secret: str = field(default_factory=lambda: _env("WEBHOOK_SECRET", ""))
    # Hosts the service may call back, e.g. "strapi.internal,api.proleagueafrica.com"
    allowed_callback_hosts: list = field(default_factory=lambda: [h.strip() for h in _env("ALLOWED_CALLBACK_HOSTS", "").split(",") if h.strip()])
    allow_any_callback: bool = field(default_factory=lambda: _bool("ALLOW_ANY_CALLBACK", False))  # dev only
    max_image_bytes: int = field(default_factory=lambda: int(_env("MAX_IMAGE_BYTES", 15_000_000)))
    min_width: int = field(default_factory=lambda: int(_env("MIN_WIDTH", 640)))
    min_height: int = field(default_factory=lambda: int(_env("MIN_HEIGHT", 360)))
    ocr_max_width: int = field(default_factory=lambda: int(_env("OCR_MAX_WIDTH", 1600)))
    blur_reject_below: float = field(default_factory=lambda: float(_env("BLUR_REJECT_BELOW", 8)))
    blur_flag_below: float = field(default_factory=lambda: float(_env("BLUR_FLAG_BELOW", 40)))
    ambiguity_margin: float = field(default_factory=lambda: float(_env("AMBIGUITY_MARGIN", 0.08)))
    workers: int = field(default_factory=lambda: int(_env("WORKERS", 2)))
    job_ttl_seconds: int = field(default_factory=lambda: int(_env("JOB_TTL_SECONDS", 3600)))
    webhook_retry_delays: list = field(default_factory=lambda: [1, 5, 30, 120])


settings = Settings()
