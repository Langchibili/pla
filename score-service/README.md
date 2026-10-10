# ProLeagueAfrica score service

Reads a result screenshot and returns what it found. It knows nothing about tournaments, Plapo or players.
All decisions (zone allowed? names match? complete? disputed?) stay in Strapi.

## Run
```bash
cp .env.example .env            # set the two secrets and ALLOWED_CALLBACK_HOSTS; keep the soccer clock flag true
docker build -t pla-score . && docker run --env-file .env -p 8100:8100 pla-score
python -m pytest tests -q       # CPU only, no GPU
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
always rejects the result as `match_not_finished`. A standalone clock-shaped
reading is never accepted as a score; a separate final score must be detected.
With `REQUIRE_CLOCK_FOR_SOCCER_GAMES_VALIDITY=true`, a score with no readable
clock is accepted only when the parser recognizes a full-time/result screen.
This v4 project sets that flag to `true` in its local `.env`; deployments can
also provide it as a process variable. With the flag false, a missing clock
does not by itself prevent score acceptance.

### DLS
`games/dls.py` reads the two large scoreboard digits on either side of DLS's
centered match clock. It was tested against all four supplied DLS screenshots:
the three screenshots at `90:00` return their visible scores, and the
`45:00` screenshot is rejected as unfinished. A recognized full-time/result
screen may replace a missing clock when strict clock enforcement is enabled.

### EA Sports FC and eFootball
Both share `games/football_screens.py`. A live HUD sits in the same corner at minute 45 and minute 90, so
position alone cannot prove a match is finished. A clock below 90 always rejects
the result. Otherwise, the clock must be at least 90, or strict clock
enforcement must be satisfied by a recognized full-time/result screen:

| Screen | Where the score is (`zone`) | Notes |
| --- | --- | --- |
| Post-match stats screen | `top_center` | big digits, `90:00` stacked under them; names from the two username cards |
| FULLTIME banner | `bottom_center` | big digits, FULLTIME label under them; names beside the score |
| Live HUD | `top_left` | small digits, names cut to ~3 letters. Accepted only as a flagged reading |

* The big digits are read by `core/glyphs.py` (the normal OCR pass skips them): shapes are cut out, stitched into a line and read several ways, then voted.
* Every score source found is listed in `zones_with_scores`; the clock is not counted as a score. Sources that disagree: flag `score_sources_disagree`, confidence capped at 0.45. Banner + HUD agreeing: `score_corroborated`.
* HUD-only upload at 90:00: status `ok` with flag `completion_not_confirmed`, confidence capped at 0.55 -> Strapi sends it to review. Set `Layout.require_completion_screen=True` to reject it as `completion_not_confirmed` instead. With strict clock enforcement enabled, the recognized post-match stats screen or FULLTIME label can stand in for an unreadable clock.
* Strapi should allow `top_center` and `bottom_center` for EA FC (`GET /v1/games` returns `accepted_zones`). A `top_left` result is a live HUD.
* The `4-3-3` formation selector and `88ms` ping on the HUD are ignored.

**eFootball** (`games/efootball.py`, calibrated on 3 real screenshots from one phone, 3/3 correct):

| Screen | `zone` | Result |
| --- | --- | --- |
| "Full Time" result screen | `top_center` | accepted; the label is the completion proof and stands in for a missing clock (flag `clock_not_shown`); names = the two team names under the score |
| Goal / kick-off banner on the pitch | `bottom_center` | flagged `completion_not_confirmed`; with the clock setting on it is rejected `match_clock_missing` |
| Live HUD (yellow clock box) | `top_left` | clock < 90 -> `match_not_finished`, score and zone still returned |

* Only the score under the "Full Time" label counts on that screen. The "2-0" icon on its Stats button is dropped.
* Strapi should allow `top_center` only for eFootball. Only one Full Time screen has been seen; add cup, extra-time and penalty screens to `tests/screenshots/efootball/` and run `python tools/evaluate.py efootball`.
* Names are team names (`langmer fc`) or 3-letter codes on the HUD (`LAN`, flagged `names_truncated`). rapidocr 1.2.x keeps spaces and 1.4.x drops them; `name_hints` ignores spaces.

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
  "score": {"left": 2, "right": 0}, "score_text": "2:0", "link": "sep",  // sep | clock | glyph | none
  "zone": "top_center", "zones_with_scores": ["top_center"],
  "names": {"left": "KINGSLEY FC", "right": "ZED UNITED"},
  "name_hints": [{"expected": "KINGSLEY FC", "left_similarity": 1.0, "right_similarity": 0.1}],
  "confidence": 0.93, "flags": [], "candidates": [...],
  "image": {"sha256": "...", "dhash": "...", "width": 1280, "height": 720},
  "parser_version": "dls-v4"
}
```
`left`/`right` are screen positions. Strapi maps them to players with `name_hints`.
Zone names match Strapi `game_score_zone.allowed_zone`: `top_left top_center top_right bottom_left bottom_center bottom_right`
(the top half and bottom half are the two rows; `middle_*` and `center` are not produced).

## How Strapi should use it
- On `match_submission` create: queue a job that POSTs to `/v1/jobs`, set `match_submission_status = processing`.
- On webhook: verify, then write `extracted_json = result`, `ocr_confidence = confidence`, `score_zone_found = zone`.
- Then decide in Strapi: `rejected` -> invalid + tell player; zone != allowed zone -> invalid; `confidence < min_ocr_confidence` or flag `ambiguous_readings`/`names_missing` or flag `completion_not_confirmed`/`score_sources_disagree`/`uncalibrated_layout` -> `needs_review`; names fail your own match -> needs_review; else valid.
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
- **EA FC:** calibrated on 9 real screenshots from one phone (9/9 correct). Check other devices and aspect ratios before paid events.
- **eFootball:** calibrated on 3 real screenshots from one phone (3/3 correct). Check other devices and modes before paid events.
- **Stubs (return `unsupported_game`):** Tekken/MK, CODM, PUBG Mobile, Valorant/CS, Dota 2. Their result types differ (rounds, team score, placement + kills), so each needs its own parser step.
