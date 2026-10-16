# PLACO Backend — Strapi v5 / TypeScript

PLACO (Pro League Africa Club Owners) is the football game backend. This repository is backend-only: the Babylon.js match canvas and 3D asset/animation pipeline live in the game client, while Strapi owns authoritative identities, catalogue/configuration, player and club data, matchmaking, training setup, match snapshots/results, progression ledgers, virtual coins, store receipt records, rewarded ads and the integration with PLA (Pro League Africa tournament platform).

## Deliverables included

- 44 content types, with field catalogue in [`docs/SCHEMA_CATALOGUE.md`](docs/SCHEMA_CATALOGUE.md) and machine-readable field index in [`docs/schema-index.json`](docs/schema-index.json).
- TypeScript controllers, services and route files, including custom authenticated/user-facing and HMAC-protected integration routes.
- Bootstrap seeder for country/currency, global `admn_settings`, game rules, physics/curve/AI profiles, formations, presets, manager/player cards, AI difficulty, store product offers and restricted famous names.
- Country-aware pricing conversion; wallet/ledger and XP/leaderboard services; Bronze/Diamond Coin-funded player attribute upgrades; training and online matchmaking; verified match finalisation; store receipt and rewarded-ad adapters; PLA fixture assignment and result outbox.
- Lifecycle validators for names, attributes and configuration.
- Installation, API, schema, physics, PLA-integration and security docs.

## First-time setup

1. Use Node.js 24 LTS (the package engine allows supported Strapi-compatible Node 22/24/26 versions) and MySQL 8.0 or newer; MySQL 8.4 is the preferred baseline.
2. Create a database named `placo` and a database user with the necessary schema/table privileges.
3. Copy `.env.example` to `.env`. Generate independent, long random secrets for the Strapi secrets and each integration HMAC secret. Do not reuse production PLA, store, ad, or game-engine secrets.
4. Run `npm install`, `npm run check:schemas`, `npm run ts:check`, and `npm run build`. Start the built backend with `npm start` and `NODE_ENV=production`.
5. Configure Content API roles and permissions according to [`docs/PERMISSIONS_MATRIX.md`](docs/PERMISSIONS_MATRIX.md). The supplied allowlist synchroniser and its backup-first runbook are documented in [`docs/RUN_PERMISSIONS_SYNC.md`](docs/RUN_PERMISSIONS_SYNC.md). Do not enable general CRUD for coins, ledgers, match verification, store fulfilment or PLA integration content types.
6. The bootstrap hook creates baseline catalogues once. Verify all single-type settings and active profiles in the Admin panel before opening the API to users.

Full setup and complete package list: [`docs/INSTALLATION_AND_PACKAGES.md`](docs/INSTALLATION_AND_PACKAGES.md).

## Important architecture contract

- **PLACO game coins are not PLA Plapo.** Only `bronze` and `diamond` coin types exist in the PLACO wallet; XP is a separate ranking/progression value. The project does not create a `plapo` wallet or treat Plapo as a purchasable game currency.
- **No direct payments are processed by Strapi.** Mobile/desktop store billing and receipts remain with Apple App Store, Google Play or the selected platform store. Strapi stores the SKU, receipt reference and fulfilment outcome only.
- **Cash tournament administration/payout remains in PLA.** PLACO sends a cryptographically authenticated result callback/outbox event; it does not create a new payout rail or mark money as paid.
- **Do not put HMAC secrets in the Babylon.js client.** As a browser/mobile client can be inspected, its result payload cannot become trustworthy just because the same app owns both sides. Production competitive matches need a server-side match authority/verifier or replay/telemetry review service that alone holds `MATCH_ENGINE_HMAC_SECRET`, checks simulation/build rules and emits a signed final result. The current route is an integration seam for that trusted service.
- **Provider server verification is an adapter boundary.** `rewarded-ad-impression` expects a callback protected by `AD_SERVER_HMAC_SECRET`; implement and test the provider-specific AdMob/other SSV signature-validation adapter before enabling a provider. Similarly, configure a trusted store receipt verifier before accepting production fulfilment callbacks.

## Documentation map

- [`docs/SCHEMA_CATALOGUE.md`](docs/SCHEMA_CATALOGUE.md) — every content type, every field/type/default/relationship/constraint.
- [`docs/API_AND_SERVICE_FLOWS.md`](docs/API_AND_SERVICE_FLOWS.md) — endpoints, actors and main lifecycle flows.
- [`docs/PHYSICS_AI_DATA_CONTRACT.md`](docs/PHYSICS_AI_DATA_CONTRACT.md) — frozen snapshots and Babylon.js configuration contract.
- [`docs/COUNTRY_CURRENCY_AND_ECONOMY.md`](docs/COUNTRY_CURRENCY_AND_ECONOMY.md) — localized pricing, Bronze/Diamond Coins, XP and rewards.
- [`docs/PLA_INTEGRATION.md`](docs/PLA_INTEGRATION.md) — trusted fixture intake and verified result outbox.
- [`docs/PERMISSIONS_MATRIX.md`](docs/PERMISSIONS_MATRIX.md) — Content API permissions baseline.
- [`docs/SECURITY_AND_OPERATIONS.md`](docs/SECURITY_AND_OPERATIONS.md) — trusted-service boundaries, anti-abuse, environment configuration and launch gates.

## Scope note

This is a backend schema and service scaffold, not a finished networked game engine. It stores physics and AI parameters, constructs per-match snapshots, accepts signed result submissions, validates basic payload consistency and updates progression/economy records. It does not implement or validate the actual Babylon.js 3D simulation, online transport/rollback, provider-specific store receipts, provider-specific AdMob signatures, legal cash-prize eligibility, or PLA's actual external API contract. Those must be integrated and integration-tested in the surrounding products before production release.
