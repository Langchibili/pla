# Security and operations checklist

## Trust boundaries

1. **Match authority:** any key capable of submitting competitive results must remain on a trusted server. An HMAC key compiled into React Native or delivered to a browser is extractable. Before cash-prize or ranked production use, validate match state from a trusted simulation server or implement an authoritative replay/verifier checking deterministic rules, seed, player actions, timings, events and statistical plausibility.
2. **PLA integration:** HMAC guards validate message origin/integrity, not the truth of a payload. PLA must validate fixture identities and preserve idempotency. Use private ingress/allowlists and exact canonicalisation on both services.
3. **Store receipt:** the game client cannot assert a successful payment. Store purchase intent waits for a signed trusted verifier callback. Implement App Store Server API / Google Play Developer API or platform-native verification adapter as appropriate before toggling store products active.
4. **Ads:** provider `server_verification_enabled` must be true and provider inactive until the native provider SSV signature has been verified by an adapter. Confirm reward transaction, impression nonce, ad unit, expiry and transaction ID; only then call the PLACO signed callback.
5. **Currency:** FX conversion is for display, not payment settlement. Use server-side FX key, cache, timeout and fail-closed errors. Store SKU country/currency and displayed price should be configured from platform commerce data, not assumed from an FX result alone.
6. **Economy:** all coin changes must use `walletService.changeCoins`; every transaction has a unique idempotency key, a signed amount source and ledger record. XP uses append-only `xp-ledger`. Reconcile balance against ledger regularly and alert on invariant failures.
7. **Player content:** custom player and manager naming is disabled by default. Restricted famous-name seed data is an initial screening list, not a comprehensive trademark/name rights service. Maintain a moderation process and update terms/lists as necessary.

## Operational requirements before launch

- Rotate all values from `.env.example`; they are placeholders and must never reach production.
- Set correct `CORS_ORIGINS`; avoid wildcard origins with credentialed requests.
- Use TLS, reverse-proxy rate limits and request-size/time limits. Rate-limit login, matchmaking queue, naming, ad start, purchase intents and integration routes.
- Make a trusted job/worker invoke PLA outbox delivery; keep retry/dead-letter monitoring. Avoid exposing the flush endpoint to internet callers despite HMAC.
- Keep replay binary assets in object storage and only metadata/hash/reference in MySQL. Apply retention by class, privacy laws and incident policy.
- Back up MySQL and uploads; test restoration; migrate schemas under release control.
- Add audit and moderation workflow for `abuse-report`; monitor duplicate/invalid results, very improbable metrics, suspicious XP rates, reward caps and device/account farming.
- Enforce user ownership at every custom route. Generic Content API permissions must be reviewed, not inferred from the controller implementation.
- Integration-test transaction behaviour and unique constraints on MySQL. Multi-step workflows need reconciliation jobs to repair stranded `paid`, `verifying`, `sending`, or unfinished verified matches.

## Known scaffolding boundaries

- No live production receipt verification, AdMob SSV signature implementation, PLA deployment contract, tournament legality review or prize payment integration is bundled.
- The result route's HMAC plus hashes do not establish match authenticity if the input payload originates from the user's game client. Production competitive/cash matches need authoritative verification.
- The bootstrap restricted-name list is an initial dataset, not exhaustive.
- No load-test, penetration test or game-balance simulation has been executed here. The included schema check validates JSON, internal relation targets and selected architecture rules; it is not a substitute for Strapi boot/build and end-to-end testing against the target Strapi patch version.
