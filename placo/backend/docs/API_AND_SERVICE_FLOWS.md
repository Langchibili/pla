# API and service-flow reference

All paths below are relative to Strapi's `/api` prefix unless deployment routing changes it. Authentication labels refer to Strapi Content API JWT auth. The project also generates normal Strapi core CRUD routes for content types; those **must remain disabled to non-admin roles** for sensitive records, as described in the permission matrix.

## Player / club APIs

| Method | Path | Auth | What it does |
|---|---|---|---|
| `POST` | `/auth/pla/exchange` | PLA bearer token (verified server-to-server) | Validates the PLA session against `PLA_API_URL`, provisions/updates the linked PLACO user and issues a PLACO JWT. |
| `GET` | `/me/game-profile` | JWT | Returns the authenticated user's PLACO profile, country and progression summary. |
| `GET` | `/me/club` | JWT | Returns the authenticated user's own club identifier and display name. |
| `GET` | `/me/managers` | JWT | Returns only managers owned by the authenticated profile, including selection state and display modifiers. |
| `POST` | `/me/game-profile/initialise` | JWT | Idempotently creates the PLACO profile, owned club, 11 position slots, default manager and initial wallet grants. |
| `GET` | `/game-profiles/:documentId/public-summary` | Public | Restricted public profile/record summary. |
| `GET` | `/clubs/:documentId/squad` | JWT | Returns the owner’s current squad and selected club configuration. |
| `POST` | `/clubs/:documentId/formation` | JWT | Selects an active formation; player slot positions are based on the formation layout. |
| `POST` | `/clubs/:documentId/manager` | JWT | Selects a manager owned by that profile. |
| `POST` | `/clubs/:documentId/stadium` | JWT | Selects a stadium available to the club. |
| `POST` | `/clubs/:documentId/kit` | JWT | Selects an active kit preset. |
| `POST` | `/club-players/:documentId/develop` | JWT + `X-Idempotency-Key` | Upgrades one allow-listed attribute of an owned player by a server-defined step, checks the stat budget and charges Bronze or Diamond Coins using configured cost growth. Client never submits a new stat value or cost. |
| `POST` | `/club-players/:documentId/rename` | JWT | Renames an owned player only when settings enable custom names and restricted-name policy passes. MVP setting is disabled. |
| `POST` | `/club-managers/:documentId/rename` | JWT | Same naming gate for owned managers. |

## Training, online versus and match results

| Method | Path | Auth | What it does |
|---|---|---|---|
| `POST` | `/training-sessions/start` | JWT | Opens a training session against a configured AI team/difficulty, then creates the canonical match snapshot. Pass an `X-Idempotency-Key`. |
| `POST` | `/matchmaking/enqueue` | JWT | Enqueues the user's active club for casual/ranked online matching. |
| `POST` | `/matchmaking/:ticketCode/cancel` | JWT | Cancels an owned open ticket. |
| `POST` | `/matches/:documentId/start` | JWT | Marks a participant's ready match as in progress; returns the frozen roster, rules, physics, AI profile and seed through match response. |
| `GET` | `/me/matches` | JWT | Lists the user's matches. |
| `POST` | `/matches/engine-finalise` | HMAC trusted-service signature | Accepts a signed final result, checks match/roster/config/seed/score/metrics and submission ID, records events, calculates XP/coins, refreshes leaderboard and queues the verified PLA result. Never call it using a secret embedded in the game client. |
| `GET` | `/leaderboards/xp` | Public | Returns XP ranking; supports bounded `limit` and optional country filter (see controller parameters). |

### Result finalisation payload outline

```json
{
  "match_document_id": "Strapi-document-id-or-use-match_code",
  "match_code": "MAT-...",
  "result_submission_id": "stable-unique-id-from-trusted-match-authority",
  "roster_snapshot_hash": "sha256-from-match-start-response",
  "physics_snapshot_hash": "sha256-from-match-start-response",
  "simulation_seed": "server-issued-seed",
  "simulation_build": "trusted-build-version",
  "home_score": 2,
  "away_score": 1,
  "match_ended_at": "2026-10-15T18:00:00.000Z",
  "metrics": {
    "home": {"possession_percent": 55, "pass_accuracy_percent": 83, "shots": 9, "shots_on_target": 5, "passes_completed": 220, "passes_attempted": 265, "fouls": 4, "corners": 3, "saves": 2},
    "away": {"possession_percent": 45, "pass_accuracy_percent": 78, "shots": 6, "shots_on_target": 2, "passes_completed": 170, "passes_attempted": 218, "fouls": 6, "corners": 2, "saves": 3}
  },
  "events": []
}
```

This is a contract outline, not enough by itself to prove a client-generated match honest. Sign the request with `MATCH_ENGINE_HMAC_SECRET` from a trusted backend match authority. Keep game-client secrets impossible to extract by never shipping them.

## Economy and catalogue

| Method | Path | Auth | What it does |
|---|---|---|---|
| `GET` | `/me/coin-wallet` | JWT | Returns bronze/diamond balances from the wallet record. |
| `GET` | `/market-offers/catalog` | Public | Lists active in-game marketplace offers. |
| `POST` | `/market-offers/:offerCode/purchase` | JWT + `X-Idempotency-Key` | Debits PLACO Coins and grants an item from catalogue; it does not use fiat/store payment. |
| `GET` | `/store/offers` | JWT | Returns store product offers for the player’s configured country/currency. |
| `POST` | `/store/purchase-intents` | JWT + `X-Idempotency-Key` | Creates a purchase intent for a platform store SKU; it does not complete the payment. |
| `POST` | `/integration/store/fulfil` | HMAC trusted store verifier | Fulfilment callback after native App Store/Google Play/platform receipt verification. |
| `POST` | `/rewarded-ads/start` | JWT | Creates short-lived ad impression + nonce for a configured provider/ad-unit ID. |
| `POST` | `/integration/ads/reward-callback` | HMAC trusted ad-verification adapter | Validates one server-verified ad transaction and grants configured coins subject to limits. |
| `POST` | `/currencies/convert-price` | JWT | Converts display price to player's preferred/country currency using the configured FX provider. |
| `GET` | `/countries` | Public curated view | Lists active countries and public currency fields only. |
| `GET` | `/currencies` | Public curated view | Lists active currencies and public rate details only. |
| `GET` | `/admn-settings/public-config` | JWT | Returns only a safe subset of feature and configuration fields for client initialisation. |

## PLA trusted integration

| Method | Path | Auth | What it does |
|---|---|---|---|
| `POST` | `/integration/pla/fixtures/assign` | HMAC PLA request | Maps PLA fixture/tournament/user IDs to PLACO profiles and creates exactly one canonical `pla_tournament` match. |
| `POST` | `/integration/pla/outbox/flush` | HMAC service call | Attempts delivery of pending result outbox events to PLA. In production this should run on an internal worker/cron, not from the public app. |

Internal signed requests use `X-PLACO-Timestamp` and `X-PLACO-Signature`; see `PLA_INTEGRATION.md`. Custom signed routes use `auth:false` intentionally because integration authentication is HMAC-based; they must not be exposed without secrets, rate limits and a perimeter allowlist.

## Typical lifecycles

1. User signs in to PLA, then PLACO validates the PLA JWT at `/auth/pla/exchange` and issues a PLACO JWT. The player obtains a PLACO profile via `/me/game-profile/initialise`. Bootstrap creates 11 numbered players P-1…P-11, a default manager/club/kit/stadium, and a Bronze Coin welcome grant.
2. For training, client requests an AI team/difficulty. The backend creates a match with snapshots and a deterministic seed. Babylon.js consumes the snapshot; training rewards are awarded server-side only after trusted finalisation and caps apply.
3. For online versus, two matchmaking tickets are paired into one canonical match with frozen config. Avoid client-selected outcomes.
4. For PLA, PLA sends fixture assignment and both PLA IDs. PLACO creates a linked match. After trusted result validation, an outbox event is signed and delivered/retried; PLA decides tournament standings, eligibility and any cash-prize payout.
5. Store purchases: native store purchase → trusted receipt verification → signed fulfil endpoint → coin ledger grant. Rewarded ads: issue impression nonce → provider SSV → trusted adapter verifies signature → signed callback → idempotent ledger grant.
