"""Async job handling: accept, process off the request thread, deliver the result by signed webhook.

The job_id is chosen by Strapi (use the match_submission id) so a retried submit never runs twice.
Results are kept in memory for JOB_TTL_SECONDS so Strapi can also poll GET /v1/jobs/{id}. For
restarts without losing results, swap `_store` for Redis; nothing else needs to change.
"""
from __future__ import annotations
import asyncio, hashlib, hmac, json, logging, time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from urllib.parse import urlparse

import httpx

from config import Settings
from core.ocr import OcrEngine
from games import get_parser

log = logging.getLogger("score-service")


def sign(secret: str, timestamp: str, body: bytes) -> str:
    return "sha256=" + hmac.new(secret.encode(), timestamp.encode() + b"." + body, hashlib.sha256).hexdigest()


def callback_allowed(url: str, s: Settings) -> bool:
    p = urlparse(url)
    if p.scheme not in ("http", "https") or not p.hostname:
        return False
    return s.allow_any_callback or p.hostname in s.allowed_callback_hosts


@dataclass
class Job:
    job_id: str
    game_key: str
    state: str = "queued"            # queued | done
    result: dict | None = None
    callback_url: str | None = None
    webhook_delivered: bool = False
    created: float = field(default_factory=time.time)


class JobManager:
    def __init__(self, settings: Settings, ocr: OcrEngine):
        self.s, self.ocr = settings, ocr
        self.pool = ThreadPoolExecutor(max_workers=settings.workers)
        self._store: dict[str, Job] = {}

    def _purge(self):
        cutoff = time.time() - self.s.job_ttl_seconds
        for k in [k for k, j in self._store.items() if j.created < cutoff]:
            del self._store[k]

    def get(self, job_id: str) -> Job | None:
        return self._store.get(job_id)

    def process(self, game_key: str, data: bytes, expected: list[str]) -> dict:
        parser = get_parser(game_key)
        try:
            return parser.run(data, expected, self.ocr, self.s).to_dict()
        except Exception:  # never let a bad image kill the worker
            log.exception("read failed")
            return {"status": "error", "game_key": game_key, "message": "Unexpected error while reading the image."}

    async def submit(self, job_id: str, game_key: str, data: bytes, expected: list[str], callback_url: str | None) -> Job:
        self._purge()
        if job_id in self._store:                 # idempotent: same job id returns the same job
            return self._store[job_id]
        job = Job(job_id=job_id, game_key=game_key, callback_url=callback_url)
        self._store[job_id] = job
        asyncio.create_task(self._run(job, data, expected))
        return job

    async def _run(self, job: Job, data: bytes, expected: list[str]):
        loop = asyncio.get_running_loop()
        job.result = await loop.run_in_executor(self.pool, self.process, job.game_key, data, expected)
        job.state = "done"
        if job.callback_url:
            await self._deliver(job)

    async def _deliver(self, job: Job):
        body = json.dumps({"event": "score.result", "job_id": job.job_id, "result": job.result}).encode()
        for attempt, delay in enumerate([0] + list(self.s.webhook_retry_delays)):
            if delay:
                await asyncio.sleep(delay)
            ts = str(int(time.time()))
            headers = {"Content-Type": "application/json", "X-Timestamp": ts,
                       "X-Signature": sign(self.s.webhook_secret, ts, body), "X-Job-Id": job.job_id}
            try:
                async with httpx.AsyncClient(timeout=10) as c:
                    r = await c.post(job.callback_url, content=body, headers=headers)
                if r.status_code < 300:
                    job.webhook_delivered = True
                    return
                log.warning("webhook %s -> %s (attempt %d)", job.job_id, r.status_code, attempt + 1)
            except Exception as e:
                log.warning("webhook %s failed: %s (attempt %d)", job.job_id, e, attempt + 1)
        log.error("webhook %s gave up; Strapi can poll GET /v1/jobs/%s", job.job_id, job.job_id)
