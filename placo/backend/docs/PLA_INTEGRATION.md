# PLA ↔ PLACO trusted integration

## Contract goals

- PLA remains the tournament authority: teams/players/tournament registration, fixture schedule, tournament points/standings, cash prize eligibility and payout policy stay in PLA.
- PLACO creates and simulates the match for the two linked PLACO clubs, validates the final result via the trusted match authority, then emits a signed result for the assigned PLA fixture.
- Screenshots are not the proof source. The shared ownership permits a signed service integration but does not make an untrusted client result honest.
- Every fixture/result uses stable external IDs, an idempotency key, a signed request and an outbox; retries must not create a second match or double-credit the user.

## Configure

Set:

- `PLA_API_URL=http://localhost:1377/api` for local PLA account validation
  (use the HTTPS API base URL in deployed environments).
- `PLA_BASE_URL=https://<real-pla-domain>`
- `PLA_RESULT_PATH=/api/integration/placo/results` (adjust to the real PLA route agreed by both teams)
- `PLA_INTEGRATION_HMAC_SECRET=<independent random server secret>`
- `INTERNAL_SIGNATURE_MAX_SKEW_SECONDS=300`

Both services must agree the exact HTTP method, path as signed, JSON serialisation and field casing. This scaffold signs `timestamp + '.' + uppercase-method + '.' + path + '.' + JSON.stringify(body)` with HMAC-SHA256 lowercase hex. Headers: `X-PLACO-Timestamp` (Unix milliseconds or seconds accepted by verifier) and `X-PLACO-Signature`; `Idempotency-Key` carries the stable outbox event key. Sign the exact bytes/representation both sides canonicalise; if proxies rewrite the path/body, terminate signature verification before those transformations or use raw-body signature verification instead.

## Fixture assignment

`POST /api/integration/pla/fixtures/assign` body shape:

```json
{
  "fixture_id": "PLA fixture identifier",
  "tournament_id": "PLA tournament identifier",
  "stage_id": "optional group/round ID",
  "home_pla_user_id": "stable PLA user ID",
  "away_pla_user_id": "stable PLA user ID",
  "scheduled_at": "2026-10-20T12:00:00.000Z",
  "cash_prize_tournament": false,
  "match_rules": {"round": "group"},
  "payload_version": "1.0.0"
}
```

Both `home_pla_user_id` and `away_pla_user_id` must be mapped to PLACO profiles via `game-profile.pla_user_id` / Users & Permissions `pla_external_user_id`. Both must have an active club. `fixture_id` is unique, and an assignment retried with exactly the same team/tournament identities returns the previous linked match. A different participant payload for the same ID fails. Cash-tournament requests are rejected if country policy blocks cash tournament participation. Actual eligibility and payout are not handled here.

## Verified result → outbox event

After successful server-side result verification, PLACO stores a `match-result-verification`, freezes final score + digest and creates a durable `pla-outbox-event`. A background internal worker should call `/api/integration/pla/outbox/flush`. It POSTs the event to `PLA_BASE_URL + PLA_RESULT_PATH`, with HMAC and idempotency header; successful delivery marks `delivered`, temporary errors retry with exponential backoff and older events eventually become `dead_letter` after 10 attempts.

Suggested result event shape:

```json
{
  "event": "placo.match.verified",
  "pla_fixture_id": "PLA fixture identifier",
  "pla_tournament_id": "PLA tournament identifier",
  "placo_match_code": "PLA-...",
  "home_score": 2,
  "away_score": 1,
  "metrics": {"home": {}, "away": {}},
  "result_digest": "sha256 digest",
  "verified_at": "2026-10-15T17:00:00.000Z"
}
```

PLA should store processed `Idempotency-Key` / event ID and ignore duplicates. It should verify the HMAC and validate that the fixture, tournament and participants match its own fixture record before accepting the score. Define a versioned schema in the PLA backend before go-live; `/api/integration/placo/results` is a configurable default rather than a claim that this path exists in PLA today.

## Operational hardening

- Use internal/private network access or an allowlist for both fixture assignment and outbox flush endpoints in addition to HMAC.
- Keep independent secrets for PLA, match authority, store verifier and ad verifier.
- Monitor pending age, attempts, dead-letter count, mismatched fixture IDs and HMAC failures.
- Build a scheduled worker/queue (e.g. platform cron) that invokes the signed outbox flush internally; do not depend on a player tapping a screen to dispatch results.
- Cash prize/tournament activation remains `cash_tournaments_enabled` plus country override and final PLA-side policy; default global setting is off.

## PLA account sign-in

The PLACO frontend returns to the PLA frontend after OTP verification with the
PLA JWT in the URL fragment (never a query parameter). The PLA JWT is saved in
PLA local storage before navigation and is removed from the PLACO URL as soon
as the game frontend handles the callback. PLACO stores that original token
separately and sends it only to `POST /api/auth/pla/exchange`.

The exchange endpoint validates the bearer token by requesting
`GET /users/me` from the server-configured `PLA_API_URL`; it does not trust
user details submitted by the browser and does not share JWT signing secrets
between the two Strapi instances. It maps the PLA account ID, username, email,
country and preferred/default currency into the PLACO Users & Permissions user, and
rejects blocked, suspended, banned or unconfirmed PLA accounts. Nigeria (`NG`)
and its PLA-configured NGN currency are seeded as active PLACO records. Other
countries must be configured as active PLACO records before their PLA users can
sign in. Country matching uses the populated PLA country ISO code and matches
active PLACO country codes case-insensitively. If multiple active PLACO
countries share a code, the country name must also match case-insensitively;
missing or unmatched country details stop the exchange before a PLACO user is
created. The matched PLACO country is stored as the user/profile country
relation. It then issues a PLACO JWT for game APIs. This local game JWT is
necessary because the two backends have independent signing keys. Existing
PLACO accounts are never linked by email alone; a conflicting email requires a
separate, verified account-linking process.

The Users & Permissions extension schema must retain Strapi's built-in user
attributes alongside PLA-specific fields. Strapi shallow-merges this extension
at the schema top level, so replacing its `attributes` object prevents normal
user lookups and provisioning.
