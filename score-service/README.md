# ProLeagueAfrica score service

Reads a result screenshot and returns what it found. It knows nothing about tournaments, Plapo or players.
All decisions (zone allowed? names match? complete? disputed?) stay in Strapi.

## Run
```bash
cp .env.example .env            # set the two secrets and ALLOWED_CALLBACK_HOSTS
docker build -t pla-score . && docker run --env-file .env -p 8100:8100 pla-score
python -m pytest tests -q       # 34 tests; CPU only, no GPU
```
Add as a separate container next to Strapi and Redis; Strapi calls it over the private network only.

## What it does to every image (in order)
1. Must be **landscape** (phone rotation flag applied first). Portrait/square -> `rejected / not_landscape`; tell the player to upload the original landscape screenshot.
2. Size and blur checks (`image_too_small`, `too_blurry`; softer blur only adds the `blurry` flag).
3. Cut in two, keep the **top half**; split it into **left / middle / right** thirds.
4. OCR the top half; if no score, retry once with contrast + 2x upscale; if still none, look at the bottom half (only so a score found there can be reported and rejected by zone).
5. Score rules: two whole numbers `2:0` `2 : 0` `2-0` `2 - 0`; a football clock between them (`2 45:12 0`, `2 45' 0`) is dropped; a number touching `%`, or next to a number that touches `%`, is not a score; a number touching `.` (`2.2`, `22.2`) is not a score; same line, level, in the game's score range.
6. If a score exists in the game's primary zone it wins over scores found elsewhere. Two near-equal different readings -> confidence capped at 0.45 and flag `ambiguous_readings`.
7. Names: text only from the left/right thirds nearest the score; logos and junk are ignored. A similarity hint against the expected names is returned, never a decision.

For DLS, eFootball, and EA Sports FC, a detected match clock below 90 minutes
rejects the result as `match_not_finished`. A standalone clock-shaped reading
is never accepted as a score; at or after 90 minutes it still requires a
separate final score to be detected. Set
`REQUIRE_CLOCK_FOR_SOCCER_GAMES_VALIDITY=true` to reject a score when OCR cannot
read any match clock; when false (the default), a missing clock does not prevent
score acceptance. The service loads a local `.env` file when present, and
deployment environments may also provide the setting as a process variable.

## API (all calls need `X-Api-Key`)
| Call | Use |
| --- | --- |
| `POST /v1/jobs` multipart: `job_id`, `game_key`, `callback_url`, `expected_names` (JSON array), `image` | Normal path. Returns 202. Use the `match_submission` id as `job_id`; resubmitting the same id never re-runs. |
| `GET /v1/jobs/{job_id}` | Poll if a webhook was missed. |
| `POST /v1/read` same fields without `job_id`/`callback_url` | Synchronous; admin re-read and tuning. |
| `GET /v1/games` | Keys, parser versions, implemented or not. Use it to check your `game` records. |

## Result (also the webhook payload under `result`)
```json
{
  "status": "ok",                 // ok | no_score_found | rejected | unsupported_game | error
  "reject_reason": null,          // not_landscape | image_too_small | too_blurry | not_an_image | image_too_large
  "score": {"left": 2, "right": 0}, "score_text": "2:0", "link": "sep",  // sep | clock | none
  "zone": "top_center", "zones_with_scores": ["top_center"],
  "names": {"left": "KINGSLEY FC", "right": "ZED UNITED"},
  "name_hints": [{"expected": "KINGSLEY FC", "left_similarity": 1.0, "right_similarity": 0.1}],
  "confidence": 0.93, "flags": [], "candidates": [...],
  "image": {"sha256": "...", "dhash": "...", "width": 1280, "height": 720},
  "parser_version": "dls-v1"
}
```
`left`/`right` are screen positions. Strapi maps them to players with `name_hints`.
Zone names match Strapi `game_score_zone.allowed_zone`: `top_left top_center top_right bottom_left bottom_center bottom_right`
(the top half and bottom half are the two rows; `middle_*` and `center` are not produced).

## How Strapi should use it
- On `match_submission` create: queue a job that POSTs to `/v1/jobs`, set `match_submission_status = processing`.
- On webhook: verify, then write `extracted_json = result`, `ocr_confidence = confidence`, `score_zone_found = zone`.
- Then decide in Strapi: `rejected` -> invalid + tell player; zone != allowed zone -> invalid; `confidence < min_ocr_confidence` or flag `ambiguous_readings`/`names_missing` -> `needs_review`; names fail your own match -> needs_review; else valid.
- Use `image.sha256` and `image.dhash` for duplicate-screenshot checks.

Verify the webhook (Node, in Strapi):
```js
const crypto = require('crypto');
function verify(req, secret) {            // req.rawBody must be the untouched bytes
  const ts = req.headers['x-timestamp'];
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;       // stale
  const mac = 'sha256=' + crypto.createHmac('sha256', secret).update(ts + '.').update(req.rawBody).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(req.headers['x-signature']));
}
```
Failed deliveries retry at 1s, 5s, 30s, 120s; after that Strapi can poll `GET /v1/jobs/{id}`. Job results live in memory for one hour (swap `_store` in `jobs.py` for Redis if you need restarts to keep them).

## Add a game
Copy a stub in `games/` -> set `implemented=True`, `primary_zone`, `result_type`, score range, name pattern -> add real screenshots + `labels.json` in `tests/screenshots/<game>/` -> `python tools/evaluate.py <game>` -> bump `parser_version` when the template changes -> create/activate the Strapi `game` record with the same `score_service_key`.

## Status
- **Built and tested on drawn screenshots:** the whole pipeline, rules, API, webhook, DLS parser.
- **Not yet proven:** accuracy on real DLS screenshots (fonts, effects, devices). Collect a labelled set and run `tools/evaluate.py dls` before paid events; tune `BLUR_*`, `AMBIGUITY_MARGIN` and the DLS layout from it.
- **Stubs (return `unsupported_game`):** EA FC, eFootball, Tekken/MK, CODM, PUBG Mobile, Valorant/CS, Dota 2. Their result types differ (rounds, team score, placement + kills), so each needs its own parser step.
