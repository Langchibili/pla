# PLACO Frontend

The frontend is a JavaScript Next.js App Router client for the Strapi backend,
with a Babylon.js match simulation and Material UI components. The required
runtime versions remain pinned to Next.js `16.4.2`, React `19.3.0`, and
React DOM `19.3.0`.

## Configuration

Copy `.env.local.example` to `.env.local` and set the backend URLs for your
environment. The local backend uses port `1344`.

Unauthenticated players continue to the PLA frontend (port `3011`) to create or
sign in to their PLA account. Configure `NEXT_PUBLIC_PLA_FRONTEND_URL` for the
target deployment. PLACO stores the incoming PLA token separately and exchanges
it with the backend; the backend validates it against its server-only
`PLA_API_URL` and issues the PLACO API JWT.

Next.js embeds `NEXT_PUBLIC_` values into the frontend at build/start time.
After changing this URL in `.env`, restart the development server or rebuild
and restart the production frontend. The login buttons are disabled with a
configuration error shown if the value is missing; they do not fall back to a
hard-coded origin.

`MATCH_ENGINE_HMAC_SECRET` is read only by the server-side match finalisation
route. Set it to the matching Strapi secret in the local environment; never
prefix it with `NEXT_PUBLIC_` or expose it to browser code. The match result
route still trusts the client simulation, so cash tournaments must remain
disabled until results are replayed or verified server-side.

## Build and run

```powershell
npm install
npm run build
$env:PORT=3013
npm start
```

`npm start` serves the production build. Confirm the configured frontend port
is available before starting it.

## Headless simulation calibration

```powershell
npm run calibrate -- --determinism
npm run calibrate -- --n 60
npm run calibrate -- --set shootThreshold=1.3,foulScale=0.8
```

The calibration report compares averaged simulation metrics to the approximate
league targets in the In-Game AI specification. Results are estimates, not
certification; use larger samples and verify a tuned set with a fresh run.
