# Content API permissions matrix

The executable allowlist is in `src/services/apiPermissionSeeder.ts`. Run it using
[RUN_PERMISSIONS_SYNC.md](./RUN_PERMISSIONS_SYNC.md). The synchroniser changes only
`api::...` action rows for the built-in Public and Authenticated end-user roles;
it preserves plugin permissions and does not change Strapi Admin RBAC.

| Area/content type | Public role | Authenticated player role | Admin/operator |
|---|---|---|---|
| `country`, `currency` | Read `find/findOne`; controller sanitises output and restricts list results to active entries | Same, plus currency conversion endpoint | Full management |
| `leaderboard-entry` | Curated `/leaderboards/xp` custom route (`auth:false`); no generic CRUD | Same | Full management |
| `game-profile` | Public-summary custom route (`auth:false`); no generic CRUD | `/me/game-profile` and `/initialise` custom actions only | Full management with audit |
| `club` | No generic CRUD | Own-club squad and custom formation/manager/stadium/kit selections only | Full management |
| `club-player`, `club-manager` | No generic CRUD | Owned-item develop/rename custom actions only; no generic list or direct mutation | Full management |
| Formation, kit, manager/player templates, stadium presets | No generic CRUD | Read-only `find/findOne` for game selection and client config | Full catalogue management |
| `game-ruleset`, physics profiles/curves, AI behaviour/difficulty/team, tactical profiles | No generic CRUD | Read-only `find/findOne` for the game client | Full tuning access |
| `training-session`, `matchmaking-ticket`, `match` | No generic CRUD | Custom training start, enqueue/cancel, start and own-match history actions only | Controlled operations |
| `match-event`, `match-telemetry`, `match-replay`, `match-result-verification` | Deny | Deny generic CRUD; expose only through verified participant-safe endpoints when implemented | Strict access; restrict raw replay/result payload |
| `coin-wallet`, `coin-ledger`, `xp-ledger` | Deny generic CRUD | Own-wallet summary only; no direct ledger access or balance writes | Read with auditing; mutations only controlled server services |
| `coin-product`, `store-product-offer`, `market-offer` | Curated `/market-offers/catalog` custom route (`auth:false`); no generic CRUD | Country-specific `/store/offers`, purchase intent and marketplace purchase custom actions | Full management |
| `store-purchase`, `market-purchase` | Deny | No generic CRUD; verified purchase intent and server-side fulfilment only | Read/resolve with audit; no manual balance edits |
| `rewarded-ad-provider`, `rewarded-ad-impression` | Deny | Start endpoint only; no arbitrary edits | Provider config and support inspection |
| `pla-fixture-link`, `pla-outbox-event` | Deny | Deny | Admin observation only; integration mutations must be signed services |
| `admn-settings` | Deny | `/admn-settings/public-config` custom action only | Full management; secrets never stored here |
| `restricted-name` | Deny | Deny direct reads/writes | Full moderation/rules catalogue |
| `notification` | Deny generic CRUD | Deny until ownership-filtered custom notification endpoints are implemented | Admin notifications via controlled service |
| `abuse-report`, progression records | Deny | Deny generic CRUD unless a specific ownership-checked route is added | Moderation/administrative service access |

## Important route details

1. Public custom routes configured with `auth:false` are accessible without a role
   permission row. This includes `/leaderboards/xp`, `/market-offers/catalog`, and
   the public profile summary. Keep those controllers limited to curated output.
2. Integration routes for engine finalisation, store fulfilment, rewarded-ad
   callbacks, and PLA fixture/outbox operations also use `auth:false` but must pass
   their controller's HMAC checks. They are not public app endpoints in the
   security sense; use internal networking, rate limiting and strong secrets.
3. The account role must never directly write `app_xp`, coin balances, XP/coin
   ledgers, match scores/snapshots, verification rows, purchase fulfilment state,
   provider transaction IDs or PLA fixture/result data.
4. The authenticated generic `find/findOne` game catalogue routes are read-only,
   but they may return inactive configuration records unless the relevant
   controller filters them. The client must check the `*_game_status` flag.
5. Do not grant generic `api::club-manager.club-manager.find` or
   `api::club-player.club-player.find`: these can disclose other players' owned
   items. Add an owner-filtered custom “mine” route if a screen needs that listing.
