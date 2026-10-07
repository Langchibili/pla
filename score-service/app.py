"""HTTP surface of the score service.

  GET  /health
  GET  /v1/games              games this build knows, whether each is implemented, parser version
  POST /v1/jobs               submit an image (async, result comes by webhook)  -> 202
  GET  /v1/jobs/{job_id}      poll a job (fallback if a webhook was missed)
  POST /v1/read               same read, synchronous (admin re-read, tests, tuning)

The service holds no tournament, player or Plapo knowledge. It reads an image and says what it found.
"""
from __future__ import annotations
import hmac, json
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile

from config import settings
from core.ocr import RapidOcrEngine
from games import get_parser, load_parsers
from jobs import JobManager, callback_allowed

app = FastAPI(title="ProLeagueAfrica score service", version="1.0.0")
manager = JobManager(settings, RapidOcrEngine())


def require_key(x_api_key: str = Header(default="")):
    if not settings.api_key or not hmac.compare_digest(x_api_key, settings.api_key):
        raise HTTPException(401, "invalid api key")


def _parse_names(raw: str) -> list[str]:
    try:
        v = json.loads(raw) if raw else []
        return [str(x) for x in v][:4]
    except Exception:
        raise HTTPException(422, "expected_names must be a JSON array of strings")


async def _read_upload(image: UploadFile) -> bytes:
    data = await image.read()
    if not data:
        raise HTTPException(422, "empty image")
    return data


def _parser_or_422(game_key: str):
    p = get_parser(game_key)
    if not p:
        raise HTTPException(422, f"unknown game_key '{game_key}'")
    return p


@app.get("/health")
def health():
    return {"ok": True, "games": [k for k, p in load_parsers().items() if p.layout.implemented]}


@app.get("/v1/games", dependencies=[Depends(require_key)])
def games():
    return [{"key": k, "display": p.layout.display, "implemented": p.layout.implemented,
             "parser_version": p.layout.parser_version, "result_type": p.layout.result_type,
             "primary_zone": p.layout.primary_zone} for k, p in load_parsers().items()]


@app.post("/v1/jobs", status_code=202, dependencies=[Depends(require_key)])
async def submit(job_id: str = Form(...), game_key: str = Form(...), callback_url: str = Form(...),
                 expected_names: str = Form("[]"), image: UploadFile = File(...)):
    parser = _parser_or_422(game_key)
    if not parser.layout.implemented:
        raise HTTPException(409, f"{parser.layout.display} is not implemented yet")
    if not callback_allowed(callback_url, settings):
        raise HTTPException(422, "callback_url host is not allowed")
    job = await manager.submit(job_id, game_key, await _read_upload(image), _parse_names(expected_names), callback_url)
    return {"job_id": job.job_id, "state": job.state}


@app.get("/v1/jobs/{job_id}", dependencies=[Depends(require_key)])
def get_job(job_id: str):
    job = manager.get(job_id)
    if not job:
        raise HTTPException(404, "unknown job")
    return {"job_id": job.job_id, "state": job.state, "webhook_delivered": job.webhook_delivered, "result": job.result}


@app.post("/v1/read", dependencies=[Depends(require_key)])
async def read_now(game_key: str = Form(...), expected_names: str = Form("[]"), image: UploadFile = File(...)):
    _parser_or_422(game_key)
    return manager.process(game_key, await _read_upload(image), _parse_names(expected_names))
