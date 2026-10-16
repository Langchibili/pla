# Content API permissions matrix

The executable allowlist is in [`src/services/apiPermissionSeeder.ts`](../src/services/apiPermissionSeeder.ts). Run it using the backup-first instructions in [`RUN_PERMISSIONS_SYNC.md`](./RUN_PERMISSIONS_SYNC.md). The synchroniser changes only `api::...` action rows for the built-in Public and Authenticated end-user roles; it preserves plugin permissions and does not change Strapi Admin RBAC.

| Area/content type | Public | Authenticated player | Admin/operator |
|---|---|---|---|
| `country`, `currency` | `find/findOne`; controllers return curated active records | Same, plus currency conversion | Full management |
| `leaderboard-entry` | Curated `/leaderboards/xp` custom route (`auth:false`); no generic CRUD | Same | Full management |
| `game-profile` | Public-summary custom route (`auth:false`); no generic CRUD | `/me/game-profile` and `/initialise` custom actions only | Full management with audit |
| `club` | No generic CRUD | Own-club squad and custom formation/manager/stadium/kit selections only | Full management |
| `club-player`, `club-manager` | No generic CRUD | `/me/managers` and owned-item develop/rename custom actions only; no generic list or direct mutation | Full management |
| Formation, kit, manager/player templates, stadium presets | No generic CRUD | Read-only `find/findOne` for game selection and client config | Full catalogue management |
| `game-ruleset`, physics profiles/curves, AI behaviour/difficulty/team, tactical profiles | No generic CRUD | Read-only `find/findOne` for game configuration | Full tuning access |
| `training-session`, `matchmaking-ticket`, `match` | No generic CRUD | Custom training start, enqueue/cancel, start and own-match history actions only | Controlled operations |
| `match-event`, `match-telemetry`, `match-replay`, `match-result-verification` | Deny | Deny generic CRUD; expose only through participant-safe endpoints when implemented | Strict access; restrict raw replay/result payload |
| `coin-wallet`, `coin-ledger`, `xp-ledger` | Deny generic CRUD | Own-wallet summary only; no direct ledger access or balance writes | Read with auditing; mutations only controlled server services |
| `coin-product`, `store-product-offer`, `market-offer` | Curated `/market-offers/catalog` (`auth:false`); no generic CRUD | Country-specific store offers and purchase custom actions | Full management |
| `store-purchase`, `market-purchase` | Deny | No generic CRUD; verified purchase intent and server-side fulfilment only | Read/resolve with audit; no manual balance edits |
| `rewarded-ad-provider`, `rewarded-ad-impression` | Deny | Start endpoint only; no arbitrary edits | Provider config and support inspection |
| `pla-fixture-link`, `pla-outbox-event` | Deny | Deny | Admin observation only; integration mutations must be signed services |
| `admn-settings` | Deny | `/admn-settings/public-config` custom action only | Full management; secrets never stored here |
| `restricted-name`, `notification`, abuse/progression records | Deny | Deny generic CRUD unless ownership-filtered route is implemented | Moderation/administrative service access |

## Important route and security details

1. The account role must never directly write `app_xp`, coin balances, XP/coin ledgers, match scores/snapshots, verification rows, purchase fulfilment state, ad provider transaction IDs or PLA fixture/result data.
2. Custom routes with `auth:false` are not role grants. Public curated routes are limited to the XP leaderboard, public profile summary and marketplace catalogue. Integration callbacks still require HMAC verification, private routing/rate limits and secrets; they are not public app endpoints.
3. The authenticated catalogue `find/findOne` grants are read-only but may return inactive records; clients must check each `*_game_status` field. Do not grant generic `club-manager.find` or `club-player.find`, which can disclose another player's owned items.
4. Restrict Strapi Admin users to named operations roles; do not give routine content editors permission to edit wallets/ledgers or trusted integration queues. Never store raw secrets in `admn_settings`, payload metadata or logs.
