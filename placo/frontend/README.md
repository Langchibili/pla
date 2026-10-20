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

`/logout` clears both the PLACO API JWT and the separately saved PLA JWT. PLA
uses this route after `/check-login-status?redirectTo=placo` determines that
the PLA session is no longer authenticated. Each full PLACO page visit is
checked by Next.js Proxy, which sends the browser through PLA's status route.
After successful verification, a short-lived, one-use PLACO cookie returns the
browser to its original path. Browser storage is isolated by origin, so this
round trip is also how PLA sign-out clears the PLACO session. The login page
also sends any existing PLACO token that has not completed a fresh PLA
exchange through the status check before returning the user to the game.
The one-use cookie's `Secure` attribute follows the validated browser origin,
so the handoff also works when a production build is served over plain HTTP on
a private network; use HTTPS for public deployments.

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

## Match controls and display

Matches are landscape-first. The installed web app requests landscape through
its manifest; during a touch match, PLACO also detects a portrait viewport,
pauses play, and offers a best-effort browser orientation lock. Browsers that
do not support orientation locking show instructions to rotate the device
manually. The match canvas fills the current browser or web-view viewport and
uses safe-area insets for its HUD and touch controls.

The left virtual stick moves relative to the selected camera; the right-hand
buttons pass, shoot, play through/lob balls, tackle, and sprint. Keyboard
testing uses WASD/arrows, Shift, J/K/L/U/I/O, and Tab to switch players.
Automatic selection still follows possession and defensive ball pressure.
After a manual player switch, that selection is protected from automatic
replacement for at least 1.25 seconds and while directional movement remains
active, so off-ball input stays with the selected player. Automatic selection
resumes once the stick is released and a new selection is warranted. Side
cameras keep a stable movement frame; chase cameras follow their smoothed view
direction.

Players load the rigged model from `public/assets/players/player.glb` and the
retargeted locomotion/action clips from `anims.bin` plus `anims.json` in the
same directory. Babylon's GLTF loader is installed alongside the matching
Babylon core version. The renderer asynchronously loads the model and animation
pack before the match starts, then drives locomotion, tackles, kicks,
goalkeeper actions, and celebrations from recorded render poses. The source
`anims.glb` is retained in the assets folder but is not fetched by the runtime;
the packed binary and JSON are used during play. Animation remains render-only
and does not alter the deterministic simulation. The stadium keeps the project
specification's open, seat-free perimeter and league-name advertising boards.

## Simulation and match presentation

The fixed-step match simulation uses a standalone ball integrator for gravity,
drag, spin/Magnus lift, ground friction, rolling resistance, posts and the goal
net. A server-issued `weather_snapshot` may provide `wetness` from `0` (dry) to
`1` (wet), or a `condition` such as `rain`/`wet` or `clear`/`dry`. Wetness
changes ball-ground friction, rolling resistance, player traction and first
touches; it is part of the match setup rather than a client-side weather
override.

Player `height`/`heightCm` and `weight`/`weightKg` attributes are used for body
scale, contact reach, collision response and turning inertia. When absent, role
based profiles are used. Player contact uses deterministic body separation and
procedural stumble recovery; this is not a ragdoll solver or a full per-bone
collision mesh. Existing fixed-step acceleration, traction-limited turning and
blended locomotion/action clips remain the movement and animation foundation.
High-ball touches and kicks select the available header animation when the
ball is in range; no unprovided bicycle-kick or mocap clip is fabricated.

The referee checks offside against the recorded pass-time line, applies fouls
and cards, plays advantage while the fouled team keeps a promising attack, and
adds simulated stoppage time. Knockout rules can set `knockout: true`; they
then use two extra-time periods when `extraTimeEnabled` is true (defaulting to
the knockout setting) and a deterministic penalty shootout if still level.
Without knockout rules, matches retain the regular two-period ending.

The match overlay includes live possession, shots, saves, fouls, cards,
estimated xG, selected-player stamina and a radar. TV/broadcast, tactical
top-down and end-to-end views transition smoothly. Recent play can be replayed
manually or after goals. Event commentary is shown as captions and can be
spoken with the browser's speech synthesis using the commentary button; no
crowd audio is included. The knockout shootout score is currently local to the
frontend result; result submission continues to send the existing backend
metric schema, so server-side tournament settlement must not rely on that local
shootout score yet.

Run focused systems checks with `npm run check:systems`. For broader gameplay
calibration and reproducibility, use the headless commands above.
