"""API + signed webhook, with a throwaway local receiver standing in for Strapi."""
import io, json, threading, time
from http.server import BaseHTTPRequestHandler, HTTPServer
import pytest
from fastapi.testclient import TestClient

pytest.importorskip("rapidocr_onnxruntime")
import app as app_module
from config import settings
from jobs import sign
from tests.make_samples import board

settings.api_key, settings.webhook_secret, settings.allow_any_callback = "k", "s3cret", True
settings.require_clock_for_soccer_games_validity = False
HDR = {"X-Api-Key": "k"}
PNG = io.BytesIO(); board("2 - 0").save(PNG, "PNG"); PNG = PNG.getvalue()


def test_auth_required():
    with TestClient(app_module.app) as c:
        assert c.post("/v1/read", data={"game_key": "dls"}, files={"image": ("a.png", PNG)}).status_code == 401


def test_sync_read_and_game_list():
    with TestClient(app_module.app) as c:
        r = c.post("/v1/read", headers=HDR, data={"game_key": "dls", "expected_names": json.dumps(["KINGSLEY FC", "ZED UNITED"])},
                   files={"image": ("a.png", PNG)})
        assert r.status_code == 200 and r.json()["score"] == {"left": 2, "right": 0}
        keys = {g["key"]: g["implemented"] for g in c.get("/v1/games", headers=HDR).json()}
        assert keys["dls"] is True and keys["ea_fc"] is False
        assert c.post("/v1/read", headers=HDR, data={"game_key": "nope"}, files={"image": ("a.png", PNG)}).status_code == 422
        assert c.post("/v1/jobs", headers=HDR, data={"job_id": "j0", "game_key": "ea_fc", "callback_url": "http://x"},
                      files={"image": ("a.png", PNG)}).status_code == 409


def test_async_job_delivers_signed_webhook_once():
    got = []

    class H(BaseHTTPRequestHandler):
        def do_POST(self):
            body = self.rfile.read(int(self.headers["Content-Length"]))
            got.append((self.headers["X-Timestamp"], self.headers["X-Signature"], body))
            self.send_response(200); self.end_headers()
        def log_message(self, *a): pass

    srv = HTTPServer(("127.0.0.1", 0), H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    url = f"http://127.0.0.1:{srv.server_port}/hook"
    with TestClient(app_module.app) as c:
        data = {"job_id": "sub-1", "game_key": "dls", "callback_url": url}
        assert c.post("/v1/jobs", headers=HDR, data=data, files={"image": ("a.png", PNG)}).status_code == 202
        c.post("/v1/jobs", headers=HDR, data=data, files={"image": ("a.png", PNG)})   # retry: same job, no rerun
        for _ in range(60):
            if got: break
            time.sleep(0.5)
        time.sleep(0.5)
    srv.shutdown()
    assert len(got) == 1
    ts, sig, body = got[0]
    assert sig == sign("s3cret", ts, body)
    payload = json.loads(body)
    assert payload["job_id"] == "sub-1" and payload["result"]["score"] == {"left": 2, "right": 0}


def test_callback_host_allowlist():
    settings.allow_any_callback, settings.allowed_callback_hosts = False, ["strapi.internal"]
    try:
        with TestClient(app_module.app) as c:
            r = c.post("/v1/jobs", headers=HDR, data={"job_id": "j9", "game_key": "dls", "callback_url": "http://evil.example/x"},
                       files={"image": ("a.png", PNG)})
            assert r.status_code == 422
    finally:
        settings.allow_any_callback, settings.allowed_callback_hosts = True, []
