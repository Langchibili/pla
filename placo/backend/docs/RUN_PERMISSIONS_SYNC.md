# PLACO Content API permission sync

This project includes an idempotent permission synchroniser at
`src/services/apiPermissionSeeder.ts`. It applies a deny-by-default API
allowlist to the Users & Permissions **Public** and **Authenticated** roles.
It does not change Strapi Admin RBAC roles.

## Run the sync

1. Back up the database first. The script intentionally removes existing
   `api::...` permission rows from the Public and Authenticated user roles when
   those actions are not in the PLACO allowlist. It preserves all non-`api::`
   plugin permissions, including login/registration-related actions.
2. From the PLACO backend root, build the app and temporarily enable the sync
   flag. Use `npm start` (not development mode) with the production build.

### Linux/macOS

```bash
PLACO_SYNC_API_PERMISSIONS=true NODE_ENV=production npm start
```

### Windows PowerShell

```powershell
$env:PLACO_SYNC_API_PERMISSIONS = "true"
$env:NODE_ENV = "production"
npm start
```

Wait for this log line before stopping the process with `Ctrl+C`:

```text
[permissions] PLACO permission sync complete.
```

Then unset the environment variable and restart normally. In PowerShell:

```powershell
Remove-Item Env:PLACO_SYNC_API_PERMISSIONS
npm start
```

On Linux/macOS, simply run `NODE_ENV=production npm start` without the prefix. Do not leave
`PLACO_SYNC_API_PERMISSIONS=true` in your permanent production environment
unless you deliberately want the allowlist re-applied on every start.

### Optional dry run

To see the changes without editing permissions, set both flags:

```bash
PLACO_SYNC_API_PERMISSIONS=true PLACO_PERMISSION_SYNC_DRY_RUN=true NODE_ENV=production npm start
```

PowerShell:

```powershell
$env:PLACO_SYNC_API_PERMISSIONS = "true"
$env:PLACO_PERMISSION_SYNC_DRY_RUN = "true"
$env:NODE_ENV = "production"
npm start
```

A dry run logs the planned number of additions/removals and does not write any
permission rows. Stop Strapi and remove both variables before a normal restart.

## Permission policy applied

### Public role

- `country.find`, `country.findOne`
- `currency.find`, `currency.findOne`

Public custom routes configured with `auth: false` do not need a Users &
Permissions role row. These include the curated XP leaderboard, public player
summary, and marketplace catalogue. Server-to-server endpoints also use
`auth: false`, but must pass their controller's HMAC signature checks.

### Authenticated role

- Country/currency reads and authenticated price conversion.
- Read-only game catalogue/configuration: formations, kits, manager/player
  templates, stadium presets, rulesets, physics curves/profiles, tactical
  profiles and AI profiles/teams.
- Curated profile initialisation/read; own-club squad, formation/manager/stadium/
  kit selection; owner-filtered `/me/managers`; player development/rename and
  manager rename custom actions.
- Own wallet summary; country-resolved settings; matchmaking enqueue/cancel;
  match start/history; training start; store offer listing/purchase intent;
  marketplace purchase; rewarded-ad start.

The sync deliberately does **not** grant generic `find`, `findOne`, `create`,
`update`, or `delete` permissions for user-owned clubs, players, managers,
profiles, matches, match events, replay/telemetry/verification records, coin/XP
wallets and ledgers, purchases, rewarded-ad records, admin settings, notifications,
restricted names, or PLA integration records.

## Security properties and caveats

- Permission rows alone do not enforce ownership; the granted custom controllers
  must continue to check the current user's profile/club ownership.
- The match engine finalise, store fulfilment, ad provider callback and PLA
  integration routes are excluded from role allowlists because their routes use
  `auth: false` and their controllers validate HMAC signatures. Configure
  `MATCH_ENGINE_HMAC_SECRET`, `STORE_VERIFIER_HMAC_SECRET`, `AD_SERVER_HMAC_SECRET`
  and `PLA_INTEGRATION_HMAC_SECRET` before exposing these routes. Unconfigured
  secrets must fail closed.
- Direct read permissions for game configuration are read-only, but core `find`
  routes may return inactive entries. The client should filter active flags;
  for stricter public exposure, replace these with curated catalogue endpoints.
- There is intentionally no generic `/club-managers` list grant because it
  could expose another player's managers. If the client needs a dedicated
  “my managers” list, grant only the ownership-filtered `/me/managers` action;
  do not grant generic manager collection reads.
- Review any later route or content-type additions and update the allowlist.
  A new route does not automatically become available to the Public or
  Authenticated role.
