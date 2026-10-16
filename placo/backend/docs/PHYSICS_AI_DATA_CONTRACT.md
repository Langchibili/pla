# Physics, AI and Babylon.js data contract

## Responsibility split

- **Babylon.js client:** renders the pitch, players, animation and camera; translates touch/controller input; runs the responsive game loop for the playable scene; emits telemetry and presents the match result UI.
- **PLACO API:** supplies versioned physics/curve/rules/AI/tactical/formation/player configuration; freezes roster and configuration for a match; issues the simulation seed; persists signed final results and event summaries; awards XP/coins; provides leaderboards and match history.
- **Trusted match authority/verifier (production requirement for competitive/cash tournaments):** holds the match engine HMAC secret, validates or runs the match, enforces anti-cheat/replay validation, and signs the accepted final payload. Do not put that key in browser or native bundle.
- **PLA:** creates fixture assignments/tournaments and consumes verified results; PLACO must not rely on screenshots for validation and must not itself pay cash prizes.

## Frozen match snapshot

`api::match.match` includes:

- `roster_snapshot` + `roster_snapshot_hash`: player IDs, P-N slot, role/position, current attributes, only applicable goalkeeper attributes, traits/appearance, club formation coordinates, stadium and kit configuration; hash stored at match creation.
- `rules_snapshot`: selected `game-ruleset` rules and version.
- `physics_snapshot` + `physics_snapshot_hash`: profile version, pitch/ball constants, motion/contacts/camera/environment values, global scales, curve set code/version and curve data.
- `ai_snapshot`: AI profile version, team brain/decision weights/perception/role behaviours/keeper/referee/determinism configuration. Training mode also supplies selected AI team and difficulty profile to the opponent config.
- `simulation_seed`, simulation build and final result digest.

Edits to active templates do not mutate an already-issued match. A change in physics or roster should apply only to future matches. Record the build, snapshot hash and curve/profile versions with replays and test reports.

## Attribute contract

Player templates store physical, technical, defensive, mental, foot/body and keeper attributes on a 1–100 scale. Main groups include sprint speed, acceleration, agility, balance, strength, stamina, jumping; dribbling, first touch, short/long passing, crossing, finishing, power, long shots, volleys, curve, free kicks, penalties, heading; standing/slide tackle, interceptions, marking, aggression; vision, composure, reactions, attacking/defensive positioning, anticipation, decisions, work rate; weak foot, preferred foot, height and weight. Goalkeepers have a separate keeper block (reflexes, diving, handling, kicking, throwing, positioning, one-on-ones, command, aerial reach, penalty saving, sweeping speed).

The supplied spec says core player stats must be 1–100, body sizes bounded (height 160–205 cm, weight 55–100 kg), goalkeeper outfield skills capped at 55 and a per-position weighted stat budget. `player-template` lifecycle checks ranges, body dimensions, goalkeeper caps and a 360 budget across sprint speed + acceleration + agility + dribbling, with the elite-tier exception. `club-player` lifecycle validates numeric ranges and display position format. Public player-renaming is disabled by default; all changes to gameplay attributes must remain admin/service-only.

Attribute curve set uses anchor pairs `[attribute, resolvedValue]`; interpolate between anchors. Shared scale knobs include pace, agility, stamina and error. The physics profile is the source of real-scale constants; the suggested baseline is 105×68m pitch, 7.32×2.44m goal, ball radius 0.11m / mass 0.43kg, gravity 9.81m/s², 60 Hz simulation and 4 ball substeps (240 Hz). These should be calibrated with a headless simulation/regression suite and mobile profiling; stored values are configuration, not proof that gameplay has reached the stated fidelity.

## Physics/action systems represented in configuration

The source spec describes force-based ball flight (gravity, drag, Magnus curl and spin decay), ground restitution/friction/rolling resistance, posts/crossbar/nets, foot/body contact, acceleration-limited player movement/traction circle, facing versus velocity, stamina/fatigue, possession and pressure, dribble touch versus magnetised assistance, first-touch quality, skill-move state machines, pass/shot targeting/launch solvers, heading/volleys, tackles/slide recovery, fouls/cards/advantage, body collisions, player/ball interception sampling, goalkeeper positioning/reaction/dive/catch/parry/distribution, referee positioning and restart rules. These operational algorithms belong in the client/simulation authority; the backend preserves their tunable parameters and version/hash.

## Determinism expectations from the source spec

- Fixed-timestep loop (60 Hz); ball is sub-stepped at 4×, AI decisions at a lower fixed schedule.
- Fixed-order arrays, seeded PRNG per player/team/referee, no `Math.random` in game logic; deterministic tie breaks.
- Snapshot AI state/seed/config when recording a replay; avoid frame-rate-dependent outcomes.
- Training difficulty is a set of configurable execution modifiers. Defaults seeded from the provided spec: Easy 320 ms reaction, decision-temperature ×2.2 and pass/shot error ×1.5; Medium 260 ms, ×1.6 and ×1.25; Hard 200 ms, ×1.0 and ×1.0; Pro/World Class/Legendary are separately seeded. Difficulty must not rewrite rule compliance or deliberately script comebacks.
- Team attributes create team strength differences; AI difficulties vary execution quality. These have separate schemas (`ai-team`, `ai-difficulty-profile`).

## Result data expected by the API

Signed result includes match ID/code, unique result submission ID, exact snapshot hashes, simulation seed/build, final score, end time, per-side possession/pass accuracy/shots/shot accuracy/passes/fouls/corners/saves and ordered events. The current service bounds scores and selected metrics, checks hashes/seed and uses a single submission ID. Production must add simulation-specific anti-cheat validation and enforce expected event semantics before authorising competitive or cash-prize matches.
