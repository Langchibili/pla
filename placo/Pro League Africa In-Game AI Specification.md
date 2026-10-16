# Pro League Africa: In-Game AI Specification

Oct 15, 2026 · @lang

A complete, layered AI for 22 players, two managers and a referee that plays Pro League Africa the way elite football is actually played, and that can be measured against real match statistics.

## 1. Scope and how the AI plugs into the physics spec

The AI never touches physics. It reads a snapshot of the world and emits **intents** (where to go, how fast, what to face, which action to start). The physics and animation layers from your spec (locomotion with the traction circle, ball integrator, pass/shot solvers, tackle state machines, keeper dive model) execute those intents and add their own error. That separation keeps the sim deterministic and lets the same AI drive both the CPU team and the assist layer for human players.

**What this document covers**

- Team-level tactics: formations, phases of play, defensive block height, pressing, build-up, transitions
- Player-level decisions: on-ball utility scoring, off-ball runs, marking, support, tackling choices
- Specialist AI: goalkeeper, set pieces, referee, substitutions and in-game management
- Calibration: statistical targets from top-level football, a headless simulation harness and a tuning loop
- Difficulty, performance budget, debug overlays and a test plan

**Hooks into the physics spec**

| AI need | Physics spec section it calls |
| --- | --- |
| Pass lead point and arrival speed | 5.2 ground pass solver, 5.3 lofted solver |
| Pass, shot and cross error | 5.5 error model, 6.3 shot error |
| Shot aim and curl | 6.1 core model, 6.2 shot types (Magnus solved numerically) |
| Who can reach the ball first | 7.8 interception solver |
| Tackle execution and risk | 7.2 to 7.5 tackle machine and contest model |
| Keeper dive and save outcome | 8.3 to 8.5 reaction, dive, handling |
| Pressure on the ball carrier | 4.3 pressure scalar |
| Fouls and cards | 7.6 fouls and referee |
| Offside | 9 offside snapshot at kick time |

**Ground rules**

1. **No cheating.** The AI plays with the same physics, stamina, reaction limits and error models as a human. Difficulty changes attributes, reaction time and decision noise, never ball speed or scripted outcomes.
2. **Stats are an output, not an input.** The AI is built from football logic (space, risk, tempo). The statistical targets in section 3 are used to check and tune it, never to force events such as "score a goal in the 70th minute".
3. **Animation budget respected.** The AI only requests clips from your essential list (idle, jog, run, sprint, strafe/jockey, backpedal, turn, kick, header, standing tackle, slide tackle, stumble, fall, get-up, throw-in; keeper: ready, dive, catch, parry, throw, kick). Finesse, power and chip shots all request the same kick clip; the difference is spin, power and loft in the physics. No celebration behaviour exists: after a goal the AI simply walks back to kickoff positions.
4. **Deterministic.** Every random draw uses a seeded per-player PRNG stream; no wall-clock or frame-rate-dependent logic.

**Coordinate conventions used in this document**

- Pitch 105 m (Z) by 68 m (X), as in the physics spec. For AI, positions are also expressed in **team-relative** terms: *depth* d = 0 at own goal line to 1 at the opponent goal line, and *lane* l from -1 (own left touchline) to +1 (own right touchline), so one set of rules works for both teams.
- **Zone grid:** 6 depth bands (0 to 16.5 m, 16.5 to 35, 35 to 52.5, 52.5 to 70, 70 to 88.5, 88.5 to 105) by 5 lanes (wide left, half-space left, centre, half-space right, wide right) gives 30 cells. Most evaluation tables (threat, pressure, space) are stored per cell.
- A note on numbers: every figure here is a starting point drawn from publicly known, approximate aggregate trends in top leagues. Verify against the reference dataset you choose (see section 16).

## 2. Architecture: layered AI, tick rates, determinism

The AI is five layers, each running at the slowest rate that still looks intelligent. Slow layers set goals; fast layers carry them out.

| Layer | Job | Rate | Output |
| --- | --- | --- | --- |
| L0 Manager | Style, formation, in-game changes, substitutions | Event-driven plus 1 Hz game-state check | Tactical profile, sub requests |
| L1 Team brain | Detect phase, set shape, assign pressers and cover, choose build-up plan | 4 to 5 Hz | Per-player target zone, role task, press assignments |
| L2 Player brain | Choose an intent: on-ball action or off-ball behaviour | 10 to 20 Hz, staggered across players | Intent struct |
| L3 Execution | Steering, action state machines, error injection | 60 Hz | Move vector, facing, action requests |
| L4 Specialists | Goalkeeper, set-piece director, referee | Own rates (GK 30 Hz in shot situations) | Specialist intents, rulings |

**Shared blackboard.** Once per team-brain tick, a single read-only snapshot is built and shared by all AI agents:

- Positions, velocities, facing, stamina and mode of all 22 players, plus the ball state
- Possession state and time since the last possession change
- Predicted ball path (coarse simulation, 0.05 s samples, 3 s horizon) and per-player interception time (physics spec 7.8)
- Pitch-control grid (section 8) and a pressure map
- Offside line for each team and the "kick-time snapshot" for any pass in flight
- Team tactical profile, score, clock and fatigue summary

Agents only read the snapshot and write their own intent, so decisions never depend on update order.

**Intent struct (what L2 hands to L3)**

```ts
interface Intent {
  move: { target: Vec2; speedMode: 'walk'|'jog'|'run'|'sprint'; arrive: boolean };
  facing: { mode: 'velocity'|'target'; target?: Vec2 };    // target = ball, carrier, lane, etc.
  action?: {
    type: 'pass'|'through'|'lob'|'cross'|'shoot'|'header'|'clear'|'tackle'|'slide'
        |'shoulder'|'intercept'|'dribbleTouch'|'skill'|'shield'|'throw';
    target?: Vec3;          // receiver lead point, goal-plane point, or ball
    power: number;          // 0..1
    spin: Vec3;             // from preset: curl, backspin, topspin, knuckle
    startAt: number;        // sim time, lets L3 wait for a footstrike or timing window
  };
  commitUntil: number;      // hysteresis: do not re-decide before this time
  reason: string;           // debug label (ring-buffered, stripped in release)
}
```

**Staggered scheduling.** At 15 Hz each player decides every 4th tick; player i decides on ticks where `(tick + i) % 4 == 0`. The ball carrier and the nearest pressing defender are promoted to every-2nd-tick (30 Hz) so duels stay sharp. The team brain recomputes on ticks where `tick % 12 == 0` (5 Hz) and is offset from player ticks to spread the cost.

**Human-like latency.** Perception is delayed (section 4) and decisions are not applied instantly. Each intent is queued with a reaction delay of 120 to 350 ms (attribute- and difficulty-scaled), so a defender does not instantly mirror the attacker's change of direction.

**Determinism rules**

1. One seeded PRNG stream per player plus one per team and one for the referee (e.g. PCG32), seeded from the match seed. Never call `Math.random`.
2. All AI iteration is over fixed-order arrays, never object-key order.
3. Tie-breaks in scoring use player id, not floating-point equality.
4. For rollback netcode, replace `Math.exp`, `Math.sin` and `Math.atan2` in gameplay code with your own deterministic implementations or lookup tables, as noted in your physics spec.
5. The AI state (commit timers, memory, PRNG states, current phase) is part of the snapshot used for rollback and replay.

## 3. Real-football statistical targets (calibration table)

These are the numbers a headless run of many matches should reproduce. They are approximate league-average trends for top European competitions (Premier League, La Liga, Bundesliga, Champions League). They come from my general knowledge rather than a dataset I pulled for this document, so treat them as defaults and replace them with your chosen reference set; the tolerance bands exist so small differences between leagues do not matter. Pro League Africa can ship its own league profile (for example slightly fewer goals and more direct play) by swapping the table.

### 3.1 Match-level targets (per team, per match, unless noted)

| Metric | Target | Accepted band |
| --- | --- | --- |
| Goals (both teams combined) | 2.7 | 2.4 to 3.0 |
| Home / away goals | 1.5 / 1.2 | home share 53% to 58% |
| Result split (home win / draw / away win) | 45% / 25% / 30% | each within 4 points |
| Shots | 12.5 | 11 to 14 |
| Shots on target | 4.2 | 3.7 to 4.8 |
| Shots blocked | 3.2 | 2.6 to 3.8 |
| Shots inside the box | 65% of shots | 58% to 72% |
| Headed shots | 13% of shots | 10% to 17% |
| Expected goals (xG) | 1.35 | 1.2 to 1.5 |
| Shot conversion (goals / shots) | 10.5% | 9% to 12% |
| Goals / shots on target | 31% | 27% to 35% |
| Possession (average) | 50%; strong teams 58% to 68% | spread driven by team quality |
| Passes attempted | 450 | 380 to 530 (possession teams 600 to 750) |
| Pass accuracy | 82% | 79% to 85% |
| Forward / lateral / backward passes | 32% / 38% / 30% | each within 5 points |
| Long passes (over 30 m) | 11% of passes | 8% to 15%; accuracy about 60% |
| Crosses attempted | 18 | 14 to 22; accuracy 25% to 30% |
| Through balls attempted | 3 | 2 to 5; completion about 30% |
| Dribbles attempted / success | 16 / 52% | 13 to 19 / 47% to 57% |
| Tackles attempted | 18 | 15 to 21; won about 60% |
| Interceptions | 10 | 8 to 12 |
| Clearances | 21 | 16 to 27 (more for the weaker side) |
| Aerial duels contested | 25 | 20 to 32; 50% won on average |
| Fouls committed | 11.5 | 10 to 13.5 |
| Yellow cards | 1.9 | 1.5 to 2.3 |
| Red cards | 0.05 | 0.03 to 0.08 |
| Offsides | 2.0 | 1.4 to 2.6 |
| Corners | 5.0 | 4.2 to 5.8 |
| Penalties awarded (both teams) | 0.30 per match | 0.22 to 0.38; scored about 77% |
| Throw-ins | 22 | 18 to 26 |
| PPDA (opponent passes per defensive action) | 11 league average | high press 7 to 9, mid block 10 to 12, low block 14 or more |
| Ball in play time | 55 to 60 min of 90 | 52 to 62 |
| Stoppage time (both halves) | 6 to 9 min | driven by events (section 13) |

### 3.2 Distribution targets

| Distribution | Target |
| --- | --- |
| Goal origin | Open play 70%, corners 9%, direct and indirect free kicks 5%, penalties 10%, other restarts and own goals 6% |
| Open-play goal assists | Cross or cutback 28%, through ball 15%, other pass 45%, rebound or no assist 12% |
| Goal timing | 45% first half, 55% second half; the last 15 minutes is the most productive and the first 10 the least |
| Corner outcomes | Shot within the next 10 s about 30%, goal about 3% |
| Direct free kick (shot) | Goal about 6% |
| Throw-in retention | About 75% of throw-ins kept by the throwing team |
| Possessions per team | About 110; average possession lasts 4 to 5 passes; about 12% end in a shot |
| Counter-attacks (fast break, shot within 12 s of winning the ball) | 3 to 6 per match, about 15% end in a shot |
| Final-third entries | 50 per team; box entries 12 to 15 |
| Goalkeeper save % (shots on target) | 70% (68% to 72%); penalties saved about 17%, missed or off target about 6% |

### 3.3 Physical targets (per outfield player over 90 minutes)

| Metric | Target | Notes |
| --- | --- | --- |
| Total distance | 10.5 km (midfielders 11 to 12, centre-backs 9.5 to 10, strikers 10 to 10.5) | Should drop 5% to 8% in the last 15 minutes |
| High-speed running (over 19.8 km/h, 5.5 m/s) | 650 to 900 m | Wingers and full-backs highest |
| Sprint distance (over 25.2 km/h, 7 m/s) | 200 to 350 m, 20 to 35 sprint efforts | Fits the arcade-boosted speed table in your physics spec once scaled |
| Peak speed in a match | 32 to 35 km/h for wingers and strikers | Compare to the spec's sprint cap after the speed scaling |
| Touches | CB 70, FB 60, DM 75, CM 65, AM 50, W 45, ST 30 | Goalkeepers 35 to 45 |

### 3.4 Using the targets

- Match-level targets are the acceptance test for the whole AI (section 16). A build ships only when the mean of 1,000 headless matches sits inside every band.
- Per-position per-90 targets live in section 6, and differences between top and bottom teams in section 17.
- If two targets pull against each other, the priority order is: goals and shots (they define the game), then possession and pass profile, then defensive actions, then discipline, then physical load.

## 4. Perception and knowledge model

Elite players look better informed than they are: they scan, remember where teammates and opponents were a second ago, and predict. The AI mimics this with limited, noisy, delayed knowledge rather than perfect world access, which is also what creates believable mistakes.

### 4.1 What a player "knows"

Each player holds a **personal belief state** refreshed from the blackboard through a perception filter:

| Information | Rule | Typical values |
| --- | --- | --- |
| Ball | Always known, with 1 frame of delay | Exact when in the visual cone, else predicted |
| Teammates and opponents in the visual cone | Seen with noise and latency | Cone 200 degrees forward half-plane, soft falloff past 120 degrees |
| Players behind the cone | Remembered position extrapolated by last velocity, decaying confidence | Memory half-life 0.8 s |
| Peripheral awareness | Players within 4 m are "felt" regardless of facing | Radius 4 m, plus 0.5 m per awareness point |
| Offside line | Perceived with error | Error 0.3 m at low awareness, 0.05 m for elite defenders |
| Scanning | A scan action refreshes the rear cone for 0.5 s | Elite midfielders scan 0.3 to 0.5 times per second before receiving |

**Position noise:** perceived position = true position plus Gaussian noise with sigma = `base_noise × distance / 20 × (1.2 - awareness)`; base noise 0.25 m. Velocity estimates carry 8% noise.

**Latency:** perception is delayed by `reaction_time`, 120 ms for elite to 300 ms for the weakest (scaled by the difficulty slider in section 17). Delay is implemented by ring-buffering the last 20 snapshots and having each agent read from `now - reaction_time`.

### 4.2 Scanning behaviour (a real elite habit)

Before a pass arrives, top midfielders check their shoulder. The AI models this as a cheap state:

- When the ball is in flight toward a player or the player expects a pass within 1.5 s, and pressure is below 0.5, the player schedules a scan (0.25 s head-turn, no extra animation clip: it is a facing tweak of 20 to 40 degrees and an information refresh).
- A successful scan lowers the first-touch error (physics spec 4.4) by up to 15% and raises decision quality because rear opponents become visible.
- Players with low awareness scan less often and are more often surprised by a closing opponent. This is the main source of "lost the ball under pressure" events for weaker teams.

### 4.3 Anticipation

Good players act before the ball arrives. Three predictors are used:

1. **Ball trajectory prediction:** the interception solver (physics spec 7.8) gives time-to-ball for everyone; players act on the predicted path with noise proportional to `(1 - anticipation)`.
2. **Pass intent prediction:** a defender estimates the carrier's most likely pass target by evaluating the carrier's own utility scores (section 7) with noise. Defenders with high anticipation lean into that lane early, which produces interceptions that are about 8 to 12 per team per match.
3. **Run prediction:** attackers who started a run are assumed to continue at current velocity for 0.6 s, so defenders track runners and not only the ball.

### 4.4 Pitch control and pressure maps

Two shared maps are rebuilt at 5 Hz on the 30-cell zone grid (and a finer 3 m cell grid inside the final third):

- **Pitch control** (see section 8.3 for the model): probability that each team would win the ball if it arrived at that cell. This is the core "space" signal that drives off-ball movement and pass target selection.
- **Pressure map:** sum of opponent influence per cell using the physics spec 4.3 pressure scalar, so carriers and receivers can ask "is that square safe?".

### 4.5 Ball-carrier information

The carrier adds a few extra checks that cost real time in the real game:

- **Options visible:** only teammates in the belief state whose confidence exceeds 0.4 enter the pass candidate list. Passes into the blind side are possible but flagged as lower quality, which matches how elite players do blind-side "look-away" passes only with high vision.
- **Head-up time:** after receiving a ball under pressure (pressure over 0.6), the carrier needs 0.25 to 0.45 s before choosing anything other than a simple pass or shield. That is the "time on the ball" that top teams create by good positioning and that weak teams lack.

## 5. Team brain: formations, phases, shape, lines, pressing

The team brain decides what the eleven players are trying to do together. Real elite teams are recognisable by their shape in each phase and by how that shape moves with the ball; that is what this layer reproduces.

### 5.1 Tactical profile (the manager's style)

Every team carries a profile of sliders from 0 to 1. Presets (possession, counter-attack, high press, low block, balanced, direct) are just saved slider sets.

| Slider | Low (0) | High (1) |
| --- | --- | --- |
| Build-up style | Long and direct | Short, patient from the keeper |
| Tempo | Slow circulation | Fast, vertical |
| Defensive line height | Deep (30 m from own goal) | High (50 m from own goal) |
| Pressing intensity | Passive, contain | Aggressive, trigger-based |
| Pressing trigger set | Few triggers | Many triggers, counterpress |
| Width in possession | Narrow (50 m) | Wide (66 m) |
| Compactness | Stretched (40 m between lines) | Tight (28 m total team length) |
| Risk appetite | Safe, recycle | Penetrating, through balls |
| Crossing vs cutback | Cutbacks and low entries | Early and high crosses |
| Counter-attack readiness | Slow to commit | Immediate break |
| Set-piece aggression | Few attackers | Many attackers |

### 5.2 Formations as anchor sets

A formation is 10 anchor points (the keeper is separate) in team-relative coordinates, one set per phase. Example for a 4-3-3: in possession it becomes a 3-2-5 (right-back inside next to the pivot, wingers high and wide, far-side full-back overlaps); out of possession it becomes a 4-1-4-1 block. The anchors for every role in every phase are authored data, with these shared rules applied to them each team-brain tick.

**Shift with the ball.** For each player the actual target is:

```
target.lane  = lerp(anchor.lane,  ball.lane,  k_lat(role))        // k_lat: CB 0.25, FB 0.35, CM 0.45, W 0.30, ST 0.35
target.depth = anchor.depth + k_dep(role) * (ball.depth - 0.5)     // whole team slides up/down with play
target.depth = clamp(target.depth, own_line_min, own_line_max)
```

The ball-near side is compressed and the far side holds a wide anchor for a switch of play. Good shape is a few numbers: team length 30 to 40 m in the mid block, out-of-possession width 40 to 45 m, in-possession width 55 to 66 m, and no more than 10 to 12 m between a line and the next.

### 5.3 Phase state machine

The team brain classifies the situation into a phase every tick. Each phase has its own anchor set, press rules and pass preferences.

| Phase | Entry condition | Exit |
| --- | --- | --- |
| Build-up | Own team controls ball in own third (or keeper has it) | Ball crosses into middle third with control, or possession lost |
| Progression | Own possession in middle third | Ball reaches final third, or possession lost |
| Final-third attack | Own possession in attacking third | Shot, ball lost, or ball recycled back into middle third |
| Attacking transition | Ball just won (within 8 s) and opponents not yet set | Opponents set (3 or more players behind ball), or shot, or ball lost |
| Defensive transition | Ball just lost (within 6 s) | Ball won back (counterpress success) or block set |
| Defensive block | Opponent possession, shape set | Ball won, or phase restarts on loss of shape |
| Set piece (attack or defence) | Referee restart | Ball in open play for 5 s |
| Contested | Loose ball, neither team controls | Control gained |

A team must be in a phase for at least 1.0 s before switching (hysteresis), except transitions on a clean turnover.

### 5.4 Defensive block, line and compactness

Three block presets; a team interpolates between them by line-height slider and game state.

| Block | Defensive line (from own goal) | Team length | Where pressing starts | Typical PPDA |
| --- | --- | --- | --- | --- |
| High block | 45 to 55 m | 28 to 34 m | Opponent defensive third | 7 to 9 |
| Mid block | 35 to 45 m | 30 to 38 m | Halfway line | 10 to 12 |
| Low block | 18 to 30 m | 25 to 32 m | Own half, inside the 30-m zone | 14 or more |

**Defensive line rules**

1. Hold a flat line. Centre-backs differ by no more than 2 m in depth unless one is covering.
2. Step up when the ball is played backward or when the opponent carrier is under pressure and cannot play a long ball; drop when the carrier is free to look up with a long pass available (the "pressure on the ball" rule).
3. Offside trap: if the ball is moving toward a reachable pass lane and the line is flat, step forward together (3 to 5 players, 0.4 s) at the moment the opponent passer's foot makes contact (physics spec 9 kick-time snapshot). Success rates should land at about 2 offsides per team per match.
4. Keeper position shifts with the line: higher line means the keeper takes a sweeper position 14 to 25 m from goal when the ball is far away (section 11).

### 5.5 Pressing system

Pressing is the single biggest difference between teams in the modern game. It is modelled as trigger-based rather than "always chase".

**Triggers** (each has a weight; the team presses when the weighted sum passes the intensity threshold):

| Trigger | Weight |
| --- | --- |
| Back pass to keeper or centre-back | 1.0 |
| Poor first touch (touch beyond 1.5 m of control radius) | 1.0 |
| Opponent receives with back to goal | 0.8 |
| Ball played to a full-back near the touchline (the touchline is a second defender) | 0.8 |
| Ball in the air (bouncing, loose or headed) | 0.6 |
| Opponent carrier slow or facing own goal | 0.7 |
| Own team just lost the ball (counterpress) | 0.9 for 5 to 6 s |
| Keeper receives the ball | 0.9 |

**Press assignment (every team-brain tick while pressing):**

1. Rank eligible players by interception time to the carrier (physics spec 7.8), subject to roles: forwards and wide midfielders press the back line, midfielders press the middle, centre-backs step only when the ball enters their zone.
2. The best candidate is the **first presser**. He approaches along a curved path that cuts the carrier's best forward lane ("cover shadow") instead of a straight chase; his speed is 85% to 95% of his sprint ceiling until about 3 m, then he decelerates to jockey.
3. The **second presser** blocks the most likely pass lane (cover shadow on the nearest outlet), not the carrier.
4. **Cover and balance players** (the next two) occupy the next-most-dangerous outlets and the central lane behind the press.
5. The back line moves up as a unit; the pressing unit never exceeds 3 players committed to the ball so the block is not stretched.
6. **Press bypass check:** if the carrier plays through the press (the pressers are all behind the ball), the team brain demotes to a regroup (drop line, compact, recover to anchors) for 2 to 3 s to avoid chasing.

Press success targets: a counterpress that wins the ball within 6 s should happen in about 25% to 30% of turnovers for strong pressing teams and 10% to 15% for passive teams.

### 5.6 Build-up plans

The build-up style slider selects among authored plans, which are anchor sets plus pass-preference biases:

- **Short build-up:** keeper and 2 to 3 centre-backs form a base; a pivot midfielder drops between the centre-backs or beside them; full-backs go wide and high; the keeper is an active passer (28 to 35 passes per match). If pressed, the plan switches to a long diagonal to a wide target.
- **Mixed:** keeper plays short on goal kicks to a free defender, otherwise a progressive medium pass to midfield.
- **Direct:** keeper and centre-backs play to a target forward or wide runner; the nearest midfielders position for second balls (10 m around the expected landing zone).

Goal-kick behaviour: possession teams play short on about 60% to 80% of goal kicks, direct teams on 10% to 25%. The choice is made at the restart, and it depends on whether the opponent has pushed up (if three or more opponents are inside the penalty-area radius, go long).

## 6. Role behaviours: GK, CB, FB, DM, CM, AM, wingers, ST

A role is a bundle of anchor positions (per phase), duties, and biases on the utility weights from section 7. Two players of the same role differ only through attributes and personality (section 14).

### 6.1 Per-90 target profile by role

Approximate values for a team of average quality. Use them as an acceptance check on role behaviour in headless runs.

| Role | Touches | Passes (accuracy) | Shots | Key passes | Dribbles (attempts) | Tackles + interceptions | Clearances | Aerials | Notable |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Goalkeeper | 38 | 28 (72%) | 0 | 0 | 0 | 0 | 0.5 | claims 0.8 | Saves 3.0 at 70% |
| Centre-back | 70 | 58 (89%) | 0.3 | 0.1 | 0.3 | 1.2 + 1.5 | 4.5 | 4.5 contested | Long passes 6 to 8 |
| Full-back / wing-back | 60 | 40 (80%) | 0.7 | 0.7 | 1.5 | 2.0 + 1.2 | 2.0 | 1.5 | Crosses 3.0 |
| Defensive midfielder | 75 | 58 (88%) | 0.7 | 0.4 | 0.7 | 2.5 + 1.8 | 1.8 | 2.0 | Progressive passes 6 |
| Central midfielder | 65 | 48 (85%) | 1.2 | 1.0 | 1.5 | 1.8 + 1.0 | 0.8 | 1.5 | Shots mostly outside the box |
| Attacking midfielder | 50 | 35 (80%) | 2.0 | 1.8 | 2.5 | 1.0 + 0.5 | 0.4 | 0.8 | Chances created 1.8 |
| Winger | 45 | 28 (78%) | 2.5 | 1.5 | 4.0 (52% success) | 1.0 + 0.4 | 0.3 | 0.5 | Crosses 3.5 |
| Striker | 30 | 17 (72%) | 3.0 | 0.8 | 1.5 | 0.6 + 0.4 | 0.5 | 4.5 contested | xG about 0.45, runs in behind 4 |

### 6.2 Role definitions

**Goalkeeper.** Distribution, sweeping and shot-stopping are covered in section 11. For build-up he is the first passer and the offside-trap safety valve.

**Centre-back (ball-playing vs stopper).**

- Anchors: pair about 12 to 16 m apart, flat, and one covering behind the other when a striker is running at them.
- On ball: short pass to the nearest unmarked teammate unless a forward lane is open and the pass-success estimate exceeds 0.8; a long diagonal to a winger is used if pressure is high and the target is free.
- Off ball: mark the nearest striker goal-side, hold the offside line, step into midfield when the opponent's pass to feet is predicted (the "step out" move, limited to once per 8 s).
- Aerial: contest crosses and long balls; heading contests resolved with the physics spec 6.4 aerial duel model.
- Stopper variant: higher tackling, step out more often, lower pass risk. Ball-playing variant: more progressive passes, carries into midfield when pressure is below 0.3.

**Full-back / wing-back.**

- Anchors: wide and mid-depth in the block; in possession either overlap (run outside the winger) or underlap (inside), or invert to form a back three or double pivot depending on the plan. Never both full-backs high at once: the AI keeps at least two defenders plus one holding midfielder behind the ball (the **rest defence**: 2 + 1 or 3 + 2 depending on risk).
- On ball: carry up the touchline, cross (early, whipped or low cut-back per the slider), or cut inside; keep 60% of attempts safe.
- Off ball defensively: track the opposing winger, show him toward the touchline, and track back at sprint speed when the ball turns over.

**Defensive midfielder (pivot).**

- Anchors: in front of the centre-backs, 8 to 12 m, shifted toward the ball; drops between the centre-backs when the team builds short.
- On ball: recycles and switches play, forward pass to the line-breaking midfielder when lane openness exceeds 0.6.
- Off ball: screen the passing lane into the striker, intercept, and press when the opponent receives between the lines (the "scrap" trigger).

**Central midfielder (box-to-box vs playmaker).**

- Box-to-box: high stamina use, late runs into the box, a mid-range shot a few times a match.
- Playmaker: drops into spaces between the lines, scans before receiving, one-touch pass bias, through ball bias.
- Off ball: third-man runs, press the second line, cover for full-backs who have gone forward.

**Attacking midfielder / second striker.**

- Anchors between the opposing midfield and defence, in the half-spaces. He picks the pocket of space with the highest pitch-control gain.
- On ball: quick combinations, through ball, shot from the edge of the box; take-ons with high variance.
- Off ball: press the opposing pivot; drops off the striker to drag a centre-back out.

**Winger.**

- Types: **inside forward** (starts wide, cuts in to shoot or combine; favours his strong foot), **traditional winger** (stays wide, crosses), and **inverted** playmaker.
- On ball: 1v1 against the full-back is attempted when the full-back is a few metres off and a second defender is not within 6 m; success follows the dribble contest (physics spec 7.5). Otherwise combine with the full-back or cut inside.
- Off ball: back-post arrival on crosses from the far side, run in behind when the ball is in the middle third, and defensively tuck in to form the second line.

**Striker (target man / poacher / false nine).**

- Target man: holds up play (shield the ball, lay off) and contests aerial duels; **poacher**: lives on the shoulder of the last defender, runs near post; **false nine**: drops deep to link and pull a centre-back out.
- On ball: shoot early when xG exceeds a threshold, otherwise lay off or run at the defence.
- Off ball: stay onside until the pass is released, then attack the space; press the centre-backs and the keeper.

### 6.3 Role anchor example (4-3-3, possession, attacking phase)

| Role | Depth (0 own goal, 1 opp goal) | Lane (-1 to +1) | Duty |
| --- | --- | --- | --- |
| GK | 0.05 | 0 | Outlet, sweeper |
| Right CB | 0.20 | +0.35 | Base of build-up |
| Left CB | 0.20 | -0.35 | Base of build-up |
| Right FB | 0.55 | +0.85 | Overlap or hold width |
| Left FB | 0.38 | -0.45 | Inverted, rest defence |
| DM | 0.42 | 0.0 | Pivot |
| Right CM | 0.62 | +0.35 | Half-space link |
| Left CM | 0.62 | -0.35 | Half-space link |
| Right W | 0.80 | +0.95 | Stretch, 1v1 |
| Left W | 0.82 | -0.80 | Inside forward |
| ST | 0.90 | 0.0 | Pin the back line |

## 7. Player brain: on-ball utility decision-making

When a player has the ball (or is about to receive it), he chooses among a short list of actions by scoring each with the same value model that analysts use: how much does this raise our chance of scoring, how likely is it to work, and what does failure cost.

### 7.1 Candidate actions

| Action | Candidates generated |
| --- | --- |
| Pass | One per visible teammate within 45 m (long passes up to 60 m for specialists), each in its best type: ground, driven, through, lob, cross |
| Carry / dribble | 5 directions (forward, two diagonals, two lateral) at current pressure-appropriate speed |
| Take-on / skill | Offered only if a defender is within 4 m and in front, and the player has the skill |
| Shoot | One per aim zone (near post, far post, low centre, high corner) when shot distance and angle pass a minimum |
| Cross | Zones: near post, penalty spot, back post, cut-back area; from wide positions in the attacking third |
| Clear | Defensive third under pressure; target is a touchline area or a safe zone |
| Shield / hold | When pressed with a teammate arriving within 2 s, or when winning time matters |
| Backpass / recycle | To the keeper or a centre-back |
| Dribble touch (knock-on) | Used in space; pushes the ball 1.5 to 3 m ahead (physics spec 4.2) |

Candidates are pruned to the top 6 by a cheap pre-score before the full evaluation (section 18).

### 7.2 Value model

Each candidate is scored with a risk-adjusted expected value:

```
score = P_success * V_success + (1 - P_success) * V_fail  +  style_bias(role, tactics, game_state)
        - effort_cost - foul_cost

V_success = xT(target_zone) - xT(current_zone)  +  keep_possession_bonus
V_fail    = - (xT_opponent(zone_where_ball_would_be_lost) + counter_exposure)
```

- **xT (expected threat) grid:** value of holding the ball in each cell, stored per cell of a 16 by 12 grid and smoothed. It rises from about 0.003 near the own goal to about 0.02 in the middle third, 0.05 to 0.08 around the penalty-area edge, and 0.20 to 0.35 inside the six-yard area. Pass value is the gain in xT from start to end cell.
- **P\_success:** from the pass model below, the carry model, or the shot xG model.
- **counter\_exposure:** the number of own players that would be out of position if possession were lost here, scaled by the opponent's counter threat (their best forward's speed and distance to goal). It is what keeps full-backs from all pushing up and what makes teams cautious when the rest defence is thin.
- **style\_bias:** tactical sliders as additive weights: directness adds to forward passes, risk appetite widens the P\_success range accepted, tempo reduces the effort of quick actions.

### 7.3 Pass success model

P\_success is built from the same physics the pass will use, so the AI does not choose passes the engine cannot execute:

1. **Lane openness:** for each defender, compute how close he can get to the ball path using the interception solver. The pass is blocked when the defender's time to a point on the path is shorter than the ball's time plus a margin of 0.2 s. `P_lane = Π_defenders  sigmoid((t_def_to_path - t_ball_to_path - 0.1) / 0.18)`
2. **Execution:** the executor's error (physics spec 5.5) gives an angular and power standard deviation; P\_exec = probability that the pass lands within the receiver's control radius (about 1.2 m at arrival), by distance and pass type.
3. **Receiver:** P\_control = quality of the receiver's first touch from the arrival speed and pressure (physics spec 4.4).
4. `P_success = P_lane * P_exec * P_control`

Sanity targets this model should produce: short passes in own half 92% to 96%, progressive passes 70% to 80%, through balls 25% to 40%, crosses 22% to 32%, long balls 55% to 65%. Overall completion about 82%.

### 7.4 Shot decision (xG anchors)

The player shoots when `xG_shot` is high enough relative to the best pass option, with a shoot-happy trait shifting the threshold. xG uses distance, goal-view angle, body part, pressure, and whether the shot is volleyed.

| Situation (central foot shot, no pressure) | xG |
| --- | --- |
| Penalty | 0.76 |
| 6 m from goal | 0.40 |
| 11 m (penalty spot) | 0.20 |
| 16 m | 0.10 |
| 20 m | 0.06 |
| 25 m | 0.035 |
| 30 m | 0.02 |

Modifiers: header multiplied by 0.6, tight angle (view angle under 15 degrees) multiplied by 0.3 to 0.5, pressure multiplied by `(1 - 0.35·pressure)`, weak foot multiplied by 0.8, volley multiplied by 0.85, one-on-one against keeper multiplied by 1.8, clear "big chance" tagged above 0.30. The target is an average shot xG of about 0.11 and about 12.5 shots per team per match; a typical decision rule is shoot if `xG ≥ 0.07` or if `xG ≥ 0.9 × best_pass_score`, adjusted by trait.

Aim zone: the executor picks the corner that the keeper's position leaves most open, weighted toward the far post for finesse shots and low centre for power shots. Skilled players pick the corner; unskilled players aim at the centre and rely on the error model.

### 7.5 Dribble and take-on decision

- Carry in space when the pitch-control cell ahead is above 0.6 for own team and nothing is within 5 m in front.
- Take-on when the defender is isolated (no cover within 6 m), the attacker's dribble skill minus the defender's tackle skill exceeds a threshold, and the area is not own penalty area. Success probability uses the physics spec 7.5 contest model, not a fixed number; target is about 52% success and about 16 attempts per team per match.
- Losing the ball in your own third has a large V\_fail, so defenders and defensive midfielders almost never attempt take-ons there.

### 7.6 Choosing among the scores

The AI does not always play the best option; elite players are consistent, not perfect.

```
P(action i) = exp(score_i / τ) / Σ exp(score_j / τ)
τ = τ_base * (1.6 - decision_skill) * (1 + 0.5 * pressure) * difficulty_noise
```

- Typical τ: 0.04 for elite, 0.12 for average, 0.25 for weak. The softmax gives believable variety (a square pass vs a forward pass at similar value), and a bad day produces a noticeably worse choice, not a random one.
- **Commit window:** after choosing, the player commits for 0.15 to 0.35 s so he does not flicker between choices.
- **Time-limited decisions:** under heavy pressure the pass list is cut to the closest 3 and the clock (reaction time) runs while he decides, so the defender can close in.

### 7.7 Personality traits (modify weights, not rules)

| Trait | Effect |
| --- | --- |
| Directness | Raises forward-pass and long-pass bias |
| Risk appetite | Shifts the P\_success range accepted; raises through balls and take-ons |
| Shoot tendency | Moves the shoot threshold (0.05 to 0.10 xG) |
| Dribble tendency | Raises take-on and carry weights |
| Vision | Increases the number of candidates, including blind-side options |
| Composure | Reduces the pressure term in τ and in error scaling |
| Selfishness / team play | Raises own-shot weight vs pass to better-placed teammate |

## 8. Off-ball intelligence: runs, support, marking, pressing

A player has the ball for roughly one minute in a match; the other 89 are what separates elite teams. Off-ball AI chooses one **behaviour** at a time from a small menu, each with a trigger, a target and a timing rule.

### 8.1 Behaviour menu (attacking, own team in possession)

| Behaviour | Trigger | Target and path | Timing rule |
| --- | --- | --- | --- |
| Hold anchor (shape) | Default | Role anchor for the phase, shifted with the ball (section 5.2) | Continuous |
| Offer short (support) | Carrier within 25 m, pressure on him above 0.3 | Position forming a triangle with the carrier, 8 to 15 m away, outside defender shadows | Move to open lane when carrier is facing the ball side |
| Check to the ball (drop) | Marker is tight and the lane to the carrier is open | 4 to 6 m toward the ball, then turn | Start when the carrier looks up (head-up time) |
| Run in behind | Last defender line is high; passer is facing forward with pass ability | Diagonal or straight sprint through the channel between full-back and centre-back | Start the moment the passer has the ball and head-up; stay at or behind the offside line until release |
| Overlap / underlap | Winger has the ball in 1v1 and the full-back is free | Sprint outside (overlap) or inside (underlap) | Start 0.5 s before the winger commits |
| Third-man run | A short combination between two teammates is likely | Run into the space the first pass is meant to open | Start as the first pass is released |
| Late box arrival | Ball is in the final third wide, crossing likely | Penalty spot or back post, 0.4 to 0.7 s behind the first striker | Start when the winger beats the full-back |
| Near-post / back-post run | Cross is coming | Sprint across defender's blind side | Timed so the ball arrives at peak speed (cross solver output) |
| Decoy run | Teammate has a better run | Drag defender away from the space | Time with the main run |
| Width provider | Possession teams in build-up | Stay on the touchline to stretch the line by 5 to 8 m | Hold until ball is switched |
| Fill-in / cover | A teammate has left his zone | Move to the vacated zone, then return | Recover when ball turns over |

**Behaviour selection** is a utility choice among the valid behaviours, scored by the gain in pitch control and expected threat for the team when the player arrives (not for himself), minus the cost in stamina and defensive exposure. A hysteresis of 0.4 to 0.8 s stops flicker; a player keeps a run until it succeeds, is blocked or the ball is lost.

### 8.2 Offside discipline

Offside is a first-class concern for attackers.

- Attackers track the offside line from the kick-time snapshot (physics spec 9). A runner starts so that he is on the line at the moment the pass is released and goes past it only after release.
- Perception error on the line (section 4.1) creates natural offside calls; the target is about 2 per team per match and rises when the opposing team uses a trap.
- When the passer is under pressure and cannot release quickly, a run in behind is delayed ("wait for it") rather than made early, which is what elite forwards do.

### 8.3 Pitch control model

The space signal for off-ball movement comes from a simplified, cheap model of who controls each cell.

```
t_i(c)   = t_react + dist(player_i, c) / v_i   // arrival time of player i at cell c (v_i from their current speed profile)
T_A(c)   = min over team A players of t_i(c)
T_B(c)   = min over team B players of t_i(c)
control_A(c) = sigmoid((T_B(c) - T_A(c)) / s)   // s about 0.45 s; the ball-carrier gets a bonus for being first
```

The 5 Hz grid supports three questions:

1. **Where can I receive safely?** cell control above 0.55 for own team and low pressure.
2. **Where is the space that teammates leave?** cells where control was just lost, which gives the cover and fill-in behaviour.
3. **Where is the opponent exposed?** cells behind the line with high control for own team: those are the targets for a through ball and a run in behind.

### 8.4 Marking and defensive positioning (own team out of possession)

| Mode | When | Rule |
| --- | --- | --- |
| Zonal | Default in open play | Each defender owns a zone defined by anchors; he reacts to opponents entering the zone and to the ball |
| Man-orientated | Near the ball and in the box | The nearest opponent in the zone is picked as the marking target; marker stays goal-side and ball-side, 1 to 2 m, on the side that blocks the pass lane |
| Hybrid (default for set pieces) | Corners and wide free kicks | Zonal on the six-yard line, man markers on key attackers |
| Cover shadow | Pressing teams | Block the pass to the most dangerous opponent without marking him tightly; a midfielder stands in the line between the carrier and the target |

**Assignment:** greedy or Hungarian assignment minimises the sum of `distance + role_penalty + offside_penalty` across defenders and attackers, recomputed at 4 Hz. Assignments swap automatically when two attackers cross (pass-on), which prevents the "marker follows to the other side" bug.

**Goal-side rule:** the marker aims to stand on the line from the opponent to the goal, 1.5 to 2.5 m from him, with the distance lowered as the ball arrives. For a pass into feet he closes down to 0.8 m after the receiver's first touch (the tackle decision, 8.5).

### 8.5 One-on-one defending and the tackle decision

The defender's choice runs on a small state machine tied to the tackle state machine in the physics spec (7.2):

1. **Contain (jockey):** speed 60% of max, face the carrier, keep 1.5 to 2.5 m, force him toward the touchline or his weaker foot, never dive in when the carrier is in space with teammates covering behind.
2. **Stab (standing tackle) window:** when the carrier's touch takes the ball more than 1.2 m from his feet, or when he turns his back, the defender evaluates `P(win)` from the contest model (7.5). He tackles if `P(win) > threshold`, where the threshold is about 0.55 for cautious defenders and 0.4 for aggressive ones, raised when the defender is the last man or on a yellow card.
3. **Block tackle** when the carrier is shielding, **shoulder charge** when side by side and the ball is within playing distance.
4. **Slide tackle** only when all hold: the carrier is moving away at speed; the defender is behind or beside him; no cover; the ball is outside the penalty area (or the defender is last man and the alternative is a goal). Slide-tackle rate is about 1 to 2 per team per match, and a foul probability of 25% to 35% per slide.
5. **Recovery run:** after a failed tackle the defender returns at full sprint along the carrier's path (this is why a missed slide leaves a team out of shape).

Tackles attempted should average 18 per team with a win rate of about 60%.

### 8.6 Pressing the carrier (individual rule)

When assigned as a presser, the player runs the curved approach from 5.5, then transitions to a contain posture within 3 m unless a trigger (poor touch, back pass) licenses a tackle. Pressers are stopped from "over-running": if his closing speed would carry him past the carrier by more than 1 m, he decelerates and jockeys instead.

### 8.7 Support for loose balls and second balls

After a long ball, a header or a block, the three nearest players move to the predicted landing zone, ranked by interception time (7.8). One goes for the ball; two form a cover ring 4 to 6 m away. About 40% to 50% of second balls should be won by the team that positioned better, not by a random bounce.

## 9. Phases of play: build-up to transitions

This section describes what each phase should look like on screen so a football fan recognises it. The mechanics are the team brain, player brain and off-ball behaviours already defined; this is the behavioural contract.

### 9.1 Build-up (own third)

- **Shape:** two centre-backs split wide, pivot drops in, full-backs high and wide; keeper is the extra man. Passes in this phase are mostly 8 to 20 m, ground, with arrival speeds of 8 to 10 m/s (physics spec 5.4 short ground).
- **Behaviour:** recycle until a pressing trigger from the opponent opens a lane; the first forward pass goes to the free midfielder or to a full-back who is a pressure "escape".
- **Under press:** if more than two opponents are within 12 m of the ball carrier, the build-up switches to a long pass to a wide runner or to the target forward (the "beat the press" option). A failed escape in this zone has the largest V\_fail (opponent xT near goal), so the AI strongly prefers a safe outlet when pressure exceeds 0.7.
- **Targets:** about 28 to 35 keeper passes per match for possession teams, and about 6 to 10 backpasses to the keeper per match.

### 9.2 Progression (middle third)

- **Goal:** move the ball past the opponent's midfield line. The progressive pass (forward by at least 10 m, or into the final third) is the unit of progress; about 40 to 50 per team per match, of which 85% are short or medium.
- **Patterns:** pivot to interior (line-breaking pass) which needs a pass lane through two defenders; carry through the half-space; switch of play (25 to 45 m) when the near side is overloaded, scored by the rise in pitch control on the far side.
- **Tempo:** the tempo slider scales how long a player waits for a better option (commit window shrinks) and how often he plays first-time.
- **Rotations:** interior players swap with wingers or full-backs to drag defenders out of position (an authored swap with a 6 to 10 s cooldown).

### 9.3 Final-third attack (chance creation)

- **Aim:** create a high-xG shot, not just any shot.
- **Patterns:**
  1. **Wide overload and cross:** full-back overlaps, winger crosses or cuts back. Target distribution: about 18 crosses per team, 40% into the box zone, 25% cutbacks to the edge of the box.
  2. **Half-space combination:** wall pass or third-man run through the half-space into the box.
  3. **Through ball:** striker or winger behind the line; success 30%.
  4. **Individual:** winger 1v1 then cut inside to shoot or cross.
  5. **Long shot:** from outside the box when the lane is open; about 35% of shots by count but about 10% of goals.
- **Box occupancy:** when the ball is wide in the final third, send 3 to 4 attackers into the box (near post, penalty spot, back post, edge) and keep 2 plus 1 as rest defence.
- **Chance quality control:** the AI shoots earlier when xG is above 0.15 and keeps working for a better shot when pressure is low and teammates are free. Possession teams create more shots at lower individual xG, while counter-attack teams produce fewer shots at higher xG; the profile of the team decides which.

### 9.4 Attacking transition (counter-attack)

Triggers: a tackle or interception that wins the ball, a keeper save, a loose ball won in midfield.

- **Within 3 s:** the winner plays forward if P\_success of the vertical pass exceeds 0.45 (counter threat is very high-value), otherwise turns and carries.
- **Runners:** the 2 to 3 nearest forwards sprint along channels; a third man supports 12 to 18 m behind the ball.
- **Decision rule:** the attack goes **direct** while the number of attackers exceeds the number of recovering defenders in the chosen channel (a 3 v 2, 4 v 3 or 2 v 1) and **slows down** (recycle and regroup) when it does not.
- Target: 3 to 6 genuine counter-attacks per team per match, about 15% producing a shot, and about 2 to 3 of every 10 high-xG chances coming from this phase.

### 9.5 Defensive transition (counterpress and recovery)

- **First 5 to 6 s:** the nearest three players press the ball for a counterpress; others recover to a compact shape, centre first, wide last.
- **Recovery:** each player recovers to the nearest of his block anchors by the shortest path that stays goal-side of the ball; defenders sprint if the opponent has a numerical advantage in the channel.
- **Tactical foul:** a defender who is about to be beaten with no cover may commit a cheap foul (a 6% to 12% chance, higher for aggressive defenders in the opponent half). This is how real teams stop counters and is a source of yellow cards.
- **Delaying:** with a numerical disadvantage, the nearest defender jockeys and backs off to buy time for team-mates to recover instead of tackling.

### 9.6 Defensive block (organised defending)

- **Compactness:** keep the team within the length and width values in 5.4. The ball-near player pressures; the others cover space.
- **Pass-lane denial:** screen the line into the opposing striker and the half-spaces; accept wide possession and defend the box.
- **Box defending:** inside the penalty area: marks in front of the near-post and penalty-spot zones, goalkeeper commands the six-yard box; clear aerial balls with headers and avoid fouls near the penalty line.
- **Shot blocking:** defenders adopt a block posture in the shot lane when the shooter is within 20 m, so about 3 shots per team per match are blocked.

### 9.7 Possession in the opponent half under game state

In a winning scenario in the last 15 minutes, the possession-holding team moves the ball to the corner flag area to run time while keeping at least 3 players around the ball. In a losing scenario the rest defence reduces, the team plays more direct to the box, and the keeper may come forward for a late corner (section 15).

## 10. Execution layer: steering, actions, error

The execution layer turns an intent into physical input for the player controller from the physics spec (section 3), so AI players are subject to exactly the same acceleration, turn and stamina limits as human-controlled ones.

### 10.1 Steering behaviours

All movement intents are expressed as a desired velocity `desired_v` and fed into the traction-circle controller (3.1). Behaviours are combined by weighted sum with priority overrides:

| Behaviour | Use | Notes |
| --- | --- | --- |
| Arrive | Hold anchors, run to a target and stop | Decelerate within `v² / (2·a_brake)` of the target so the player stops exactly, not past it |
| Pursue / intercept | Chase the ball or a player | Aim at the predicted position, not the current one, using the interception solver |
| Interpose | Block a pass lane or cover-shadow | Stand on the segment between two moving points; recompute at 10 Hz |
| Separation | Avoid clumping with teammates | Radius 2.5 m, weight 0.4; reduced when marking |
| Obstacle avoidance | Avoid players on the path | Look ahead 0.4 s; slide laterally by 0.5 m |
| Formation keeping | Return to the anchor | Weight rises with distance from anchor, falls when pressing |
| Offside keeping | Stay on the line until release | Hard constraint, can be violated only by an AI "offside-trap" failure |

Players never turn instantly: desired velocity is changed no faster than the max turn rate (physics spec 3.1) and for markers the facing is set to the carrier (strafe/jockey mode, spec 3.2).

### 10.2 Speed mode selection

The intent's `speedMode` maps to speed and stamina cost (section 3.3 of the physics spec):

- **Walk** (2 m/s) when the team is out of the play (far from ball) and fatigue is high, or during dead balls.
- **Jog** (3.5 m/s) for shape and recovery.
- **Run** (6 m/s) for most movement.
- **Sprint** (8 to 10 m/s) only for: runs in behind, pressing the first 3 m, covering when outnumbered, and chasing a ball the player has a chance to reach first.

Sprint budget: a player may sprint about 25 to 35 times per match; the AI tracks a rolling sprint-energy budget and refuses discretionary sprints when stamina is below 0.35 (but never drops below the 85% speed floor in the physics spec).

### 10.3 Turning decisions into actions

1. **Pass:** the pass solver (5.2 or 5.3) gives the launch velocity for the chosen type. The executor waits for the footstrike window (a few ticks) and applies the error model (5.5): angular error scaled by pressure, off-foot use, distance and body orientation.
2. **Shot:** aim point in goal-plane coordinates, power from the shot-power curve (6.1), spin preset by shot type. The kick animation is the same for every shot type.
3. **Cross:** target zone plus flight time T; solved by the shoot-and-correct loop (5.3) including Magnus for in- and out-swingers.
4. **Dribble touch:** the touch model (4.2) with the touch distance chosen from speed and pressure; the AI selects the desired direction and the player skill sets the noise.
5. **First touch:** the player's pre-selected touch direction (4.4) is the intent target: into space away from the nearest defender, with the quality `q` from the model.
6. **Tackle:** starts when the decision rule (8.5) triggers; the physics state machine decides the outcome.

### 10.4 Humanising error

All AI errors come from the same sources as human errors in the physics spec, which means they can be inspected and tuned:

- **Pressure** raises angular and power sigma (5.5 and 6.3).
- **Fatigue** raises error by up to 20% in the last 15 minutes.
- **Body orientation** off-axis (receiving across the body or off the wrong foot) raises error.
- **Difficulty / form** scales sigma by a per-player factor (section 14, 17).
- **Rare events:** a 0.5% to 1.5% chance of a "mishit" on any kick (a heavily shanked pass or shot) so that even top players sometimes fluff a ball.

### 10.5 Animation requests

The AI never calls clips directly; it sets locomotion mode and action requests, and the animation system picks from the essential list. There is no AI-driven celebration, no per-shot-type clip, and no taunting, so animation cost stays bounded at 20 to 25 clips.

## 11. Goalkeeper AI

The keeper runs its own state machine (physics spec 8.1) at a faster decision rate when a shot is possible. Its outputs are the same intent struct as outfield players, plus keeper-specific actions.

### 11.1 Decision hierarchy (evaluated top to bottom every 33 ms in danger, 100 ms otherwise)

1. **Shot in flight:** run the save solver (11.3).
2. **Cross or high ball in the box:** claim, punch or stay (11.4).
3. **Through ball or one-on-one:** rush out or hold (11.5).
4. **Back pass or loose ball in the keeper's area:** play it (11.6).
5. **Otherwise:** position (11.2).

### 11.2 Positioning

Angle narrowing from the physics spec 8.2 is the base. The AI adds three adjustments:

- **Starting position:** 1 to 3 m off the line when the ball is far, narrowing toward 4 to 6 m out as a shooter approaches from the centre, and inside 2 m when the ball is wide to cover the near post first.
- **Sweeping:** if the defensive line is high (above 45 m) and a ball behind the line is reachable (keeper interception time less than the attacker's by at least 0.3 s), the keeper comes out to clear or collect outside the box. A keeper's sweeper range is 14 to 25 m from goal depending on the "sweeper" attribute. Misjudged sweeps are a rare source of errors (0.1 to 0.2 per match).
- **Set stance** 0.25 s before the expected strike, based on the opponent's wind-up (backlift detected from the kicker's animation state). If the kicker cannot be predicted (no clean backlift), the keeper stays at the previous position.

### 11.3 Shot-stopping

At the moment of the kick the keeper gets a perceived trajectory with noise (physics spec 8.3). The AI then:

1. Computes the goal-plane crossing point and time.
2. Picks a **save type**: stay and catch, low dive, mid dive, high dive, one-step parry, or stretched save, using the reach envelope in 8.4.
3. Applies the reaction delay (0.15 to 0.35 s) before the dive starts.
4. Commits; mid-dive correction is limited to 0.1 s of adjustment.

**Save-rate calibration**

| Shot class | Save rate |
| --- | --- |
| Average shot on target | 70% overall |
| Shot with xG-on-target below 0.1 (central, soft) | 90% |
| Shot with xG-on-target 0.1 to 0.3 | 70% |
| Shot with xG-on-target 0.3 to 0.6 (one-on-one, close range) | 45% |
| Shot with xG-on-target above 0.6 | 25% |
| Penalty | 17% saved |

The shot's placement and speed, not a hidden roll, produce those rates: shots in the corner at high speed beat the keeper; centre shots at low speed are caught. If calibration drifts, the keeper's perception sigma and reaction delay are the tuning knobs.

**Parries and rebounds:** about 25% to 30% of saves are parries; the rebound direction is biased wide (away from the shooter) with probability 70% for skilled keepers and 40% for weak keepers. The AI of nearby attackers and defenders reacts with a "rebound" behaviour (nearest three move to the expected rebound zone).

### 11.4 Crosses and high balls

- The keeper claims when his time-to-ball is at least 0.2 s less than the first attacker's, the ball is above 2.0 m and inside the six-yard to penalty-spot zone, and crowding is low.
- **Punch** when crowded or when the ball is at the edge of reach.
- **Stay on line** for crosses to the back post that cannot be reached (and to cover shots).
- Keeper claims should be about 0.8 to 1.2 per match for a strong team, with a clean catch rate of 75% to 85% (handling model in 8.5).

### 11.5 One-on-one

The keeper rushes out only if his arrival time at the angle-closing position is less than the attacker's time to reach shooting range. He closes the angle and either **spreads** (stay big) or **smothers** (dive at the feet). Target outcomes: a one-on-one with a clear run converts about 35% to 45% (xG about 0.35 to 0.45) because the keeper narrows the angle and the shooter's error rises with pressure.

### 11.6 Distribution

The keeper uses the same utility scoring (section 7) with its own candidates:

- **Roll-out or short pass** to a centre-back or full-back when the opposing press is not within 20 m of the target; the success target is 90% to 95%.
- **Long kick or punt** (25 to 35 m/s) when a target forward is free and the press is high; accuracy about 55% to 65%.
- **Throw** (overarm) to a free defender or midfielder within 25 to 35 m for fast restarts.
- **Timing:** the keeper holds the ball up to 6 s (hard limit) and avoids time-wasting unless the team is winning late (section 15).
- **Passing under pressure:** if a striker is closing, the keeper plays long or clears to the touchline rather than risking a short pass.

### 11.7 Penalties

For a penalty the keeper chooses a dive direction at the moment of the run-up, since a 30 m/s penalty from 11 m arrives in about 0.37 s and a reactive save is nearly impossible (physics spec 8.3).

| Choice | Probability |
| --- | --- |
| Dive left (his left) | 47% |
| Dive right | 49% |
| Stay centre | 4% |

Skilled keepers get a bias toward the shooter's preferred side using the shooter's history (the AI tracks the last 5 penalties by that taker) and the body orientation of the kicker at the last step. The shooter's placement distribution is about 32% each to the left and right corners, 25% to the centre-low, and 11% high centre or off target, with power and corner accuracy governed by composure. The expected result is about 77% scored, 17% saved, 6% off target or hit the frame.

## 12. Set-piece AI

Set pieces produce about 25% to 30% of goals, so they get a dedicated **set-piece director** per team that assigns roles from a library of authored routines when the referee signals a restart. Each routine is a list of role slots (taker, runners, blockers, screeners, edge-of-box, rest defence) plus timings, filled by the best-suited players.

### 12.1 Corners (about 5 per team per match)

| Element | Attacking rule | Defending rule |
| --- | --- | --- |
| Delivery type | Inswinger 55%, outswinger 35%, short corner 10% (physics spec 9 for curl via spin sign) | n/a |
| Delivery target | Near post, central six-yard line, penalty spot, back post, edge of box; chosen by the taker's skill and the aerial strength of runners | n/a |
| Attackers in the box | 4 to 6, with 2 or 3 staying back for rest defence ("2 plus 1" or "3 plus 1") | n/a |
| Runs | Staggered movement: one blocker, 2 to 3 runners that start 0.5 to 1 s before delivery on different angles, 1 on the edge for a shot or second ball | n/a |
| Defensive set | n/a | Hybrid: 2 on the posts (6-yard line), 3 zonal in the six-yard box, 3 to 4 man-marking dangerous aerial threats, 1 to 2 at the edge; 1 or 2 forwards stay up as the counter-attack outlet |
| Keeper | Claims or punches per 11.4 | Starts about 2 m from the near post; sets before the delivery |

Target outcomes: shot within about 10 s of the corner about 30% of the time, goal about 3% of corners, and about 25% of corners cleared outside the box directly.

### 12.2 Free kicks

| Situation | Behaviour |
| --- | --- |
| Direct free kick, within about 30 m and central or semi-central | Shot with curl (finesse) or dip. Wall: 4 to 5 men at 18 to 23 m, 3 to 4 at 25 to 30 m, plus one extra at the end of the wall for wide angles. Wall jumps at the strike moment plus a delay (physics spec 9). Probability of a shot decision is about 70% in range, rising for specialists. Goal about 6%. |
| Direct free kick, far or wide | Cross to the box (as corners) or short pass to a runner |
| Indirect or deep free kick | Long delivery to the box or a quick short pass to exploit an unorganised defence |
| Quick free kick | When the opponent is out of position (pressure map shows 3 or more attackers free) and the ball is still, the taker plays quickly (a fast restart reduces the wall) |
| Defending | Wall height and position; keeper positions to cover the near post and sees the ball over the wall, with one defender at the post if the angle is tight |

### 12.3 Throw-ins (about 22 per team per match)

- The taker picks the best option by the utility model with a minimum "keep possession" bias: down the line, short to feet, long throw into the box (for specialists in the attacking third).
- Receivers move to open lanes 4 to 8 m from the thrower; one makes a decoy run; the full-back behind the ball provides the rest defence.
- The defending team marks the nearest receivers and leaves the touchline as the "second defender". About 75% of throw-ins retain possession.

### 12.4 Goal kicks

Short goal kick when the opponent's press is not in the 25-m zone around the keeper, otherwise a long kick to the target forward with the full team preset to win the second ball (midfielders positioned 8 to 12 m around the expected landing zone). The rate of short goal kicks follows the build-up style slider (section 5.6).

### 12.5 Penalties

Taker: the best penalty-taking attribute among the players on the pitch, unless a designated taker is flagged. Keeper: section 11.7. All others stand outside the area and the arc until the kick (rebound runs start at the strike); a rebound is a normal open-play contest.

### 12.6 Kick-off

An authored routine: short pass back from the centre circle to a midfielder, or a long ball to the target forward for direct teams. The AI plays at the set shape and walks into position after a goal, with no celebration; the sim waits a fixed pause (a few seconds, covered by the replay and "GOAL" overlay in your scope notes) before restart.

## 13. Referee AI and discipline

The referee is an AI agent with a fixed positioning job and a **ruling model** that builds on the physics spec 7.6. It matters for stats because fouls, cards, penalties, offsides, advantage and stoppage time all pass through it.

### 13.1 Referee positioning

The referee runs a diagonal system: he stays on one diagonal of the pitch, about 15 to 25 m from the ball, anticipating the next play, and moves at jog speed with sprints for fast breaks. Assistants (two linesmen, abstracted) track the offside line along the touchlines. The referee never blocks play; the ball treats him as a soft obstacle (a capsule with restitution 0.2) for realism, or ignore the collision for gameplay purposes if it frustrates players.

### 13.2 Foul evaluation

When a tackle or contact event is flagged by the physics (contact before the ball, approach angle, speed, studs-up), the referee evaluates:

```
severity = rel_speed_at_contact * tackle_type_mult * contact_part_mult * studs_factor * from_behind_factor
foul_prob = sigmoid((severity - threshold_match) / width)
threshold_match = base_threshold * (1 + leniency)  // leniency per match, between -0.2 and +0.3
```

| Outcome | Rule |
| --- | --- |
| No foul | Severity below the threshold, or the ball was played first |
| Foul, free kick | Severity above threshold |
| Yellow card | Severity above the yellow threshold, or a tactical foul stopping a promising attack (the "professional foul"), or persistent offending (3rd foul by the same player), or dissent or time-wasting (rare) |
| Red card | Severity above the red threshold: serious foul play, violent conduct, or denying a clear goal-scoring opportunity (last man, ball within playing distance, direct run to goal) |
| Penalty | The foul happens inside the penalty area; borderline contact in the box is whistled less often (about 0.7 times the threshold factor), producing about 0.3 penalties per match |

A second yellow becomes a red. Players on a yellow adjust their tackle threshold (raise by 0.1 to 0.15) as in 8.5.

### 13.3 Advantage

If the fouled team keeps the ball with an attacking gain (its xT increases by at least 0.02 within the next 2 s, or the carrier is running into the final third with space), the referee delays the whistle for 2 to 3 s. If the advantage does not materialise, play returns to the foul point.

### 13.4 Offside

The linesman uses the kick-time snapshot (physics spec 9): the attacker is offside if any playable body part is ahead of the second-last opponent and the ball at the moment of the pass, and the attacker is involved in play. The flag is raised after a short delay of 0.3 to 0.6 s to let the attacker's action finish. Perception noise of 0.05 to 0.1 m is added to the linesman's line, which keeps marginal decisions realistic (a few borderline calls per match) while the AI aims for about 2 offsides per team.

### 13.5 Handball

Uses the arm-hitbox contact and the intent heuristic in the physics spec 9. Penalty probability for unnatural arm positions is high; for arms close to the body or after a deflection from very close range it is low. About 4% of penalties come from handball.

### 13.6 Stoppage time

The referee tracks lost time per half:

| Event | Time added |
| --- | --- |
| Goal | 45 to 60 s (setup, celebration is not animated but the pause remains) |
| Substitution | 20 to 30 s each (cluster bonus for multiple at the same time) |
| Card | 15 s |
| Injury | 45 to 90 s (the injury is a stumble/fall plus a timer, not a medical animation) |
| Time-wasting (goal kicks over 8 s, free kicks over 12 s) | actual delay |

Typical totals: 2 to 4 minutes in the first half, 4 to 6 in the second, for 6 to 9 minutes of stoppage time in total. The total is shown on the fourth official's board.

## 14. Attributes, personality, fatigue, psychology

The same AI code drives a world-class midfielder and a lower-league defender. Differences come from attributes (0 to 1) and from a few state variables that change during the match.

### 14.1 Attribute to AI parameter map

| Attribute | Drives |
| --- | --- |
| Pace, acceleration | Speed ceiling and longitudinal acceleration (physics spec 3.1), interception time |
| Agility, balance | Lateral acceleration, turn rate, stumble threshold |
| Stamina, work rate | Drain and recovery rate, willingness to make recovery runs and presses |
| Strength | Shielding, shoulder charges, aerial contests |
| Passing, vision | Pass sigma (5.5), number of candidate passes, blind-side passes |
| Crossing | Cross sigma and curl control |
| Shooting, finishing, long shots | Shot sigma (6.3), accuracy of corner placement, long-shot xG multiplier |
| Dribbling, ball control, first touch | Touch distance, take-on contest, first-touch quality q (4.4) |
| Tackling, aggression | Tackle reach and success, tackle threshold, foul likelihood |
| Marking, positioning | Goal-side accuracy, anchor-keeping error, offside-line awareness |
| Interceptions, anticipation | Prediction noise, defensive lane-reading |
| Heading, jumping, aerial | Jump height, timing window width (6.4) |
| Composure | Pressure term in error and in softmax temperature |
| Decisions | Softmax temperature τ and decision latency |
| Goalkeeper: reflexes, diving, handling, kicking, command of area, positioning | Reaction delay, dive reach, handle probability (8.5), distribution error, claim radius and decision to rush out |

Six "headline" ratings (pace, shooting, passing, dribbling, defending, physical) are computed averages of the above for UI only.

### 14.2 Fatigue and match load

- Stamina follows the physics spec 3.3 plus the slow fatigue pool. Fatigue lowers speed ceiling (never below 85%), raises error by up to 20% and raises the foul probability slightly for tired defenders.
- The AI throttles discretionary sprints by remaining energy (10.2) and sees tired teammates in the substitution logic (15.3).
- Target: total distance drops 5% to 8% from the first to the last 15 minutes, and a pressing team's PPDA rises from about 8 to about 11 over the match as the press fades.

### 14.3 Psychology: confidence, momentum, pressure

Three slow variables (one per player, one per team, one per match), each between -1 and +1 and scaled to a small multiplier so they bend the sim without breaking it:

| Variable | Rises with | Falls with | Effect (max) |
| --- | --- | --- | --- |
| Confidence (player) | Completed passes, successful tackles, dribbles, goals | Misplaced passes, lost duels, misses, errors | ±8% on error sigma, ±0.02 on softmax temperature |
| Team momentum | Goals scored, sustained territory, chances | Goals conceded, sustained pressure | ±5% on tempo and press intensity |
| Match pressure | Late stage of a tight game, scoreline, importance | Comfortable lead | Composure effects ±10% |

An own goal or a missed penalty cuts the player's confidence; a goal gives the scorer and the team a small bump. These effects decay with a half-life of about 8 minutes of play, so streaks occur but do not run away.

### 14.4 Home advantage without a crowd

The stadium has no seats and no crowd, so home advantage is modelled as three small, symmetric, documented effects rather than hidden cheating:

1. A small bump to the home team's baseline confidence (+0.03).
2. A referee-leniency offset that slightly favours the home side in marginal decisions (about 3% on card thresholds), which matches the observed home bias in fouls and cards.
3. A tiny travel-fatigue term for the away team (about 1% on the slow fatigue pool).

Together they should produce the 45/25/30 result split and a home goal share of about 55%; set them to zero in the sliders for competitive modes that want neutral venues.

### 14.5 Form and injuries

- **Form (season-long):** a hidden multiplier of 0.95 to 1.05 on key attributes, updated after each match in career or league modes.
- **Injuries:** simple stumble-and-fall events (from the essential animation list) followed by a short timer; a small chance (0.03 per match) that a player cannot continue and a substitution is forced. No medical or celebration animations.

## 15. Match management: game state, subs, tactical changes

The manager layer (L0) watches the match at 1 Hz and adjusts the team's profile the way a real coach does: respond to the scoreline, the clock, cards and fatigue.

### 15.1 Game-state modifiers

The active profile is the base profile plus the following multipliers, applied smoothly (ramped over 20 to 30 s) so behaviour does not snap.

| Situation | Changes |
| --- | --- |
| Losing by 1, after 60 min | Defensive line +4 to 6 m, pressing +0.15, risk appetite +0.2, more crosses (+25%), more long shots, rest defence from 3 + 2 to 2 + 1 |
| Losing by 2 or more, after 70 min | Line +8 m, risk +0.35, a second striker or a big man up front, keeper joins late corners, tempo +0.2 |
| Winning by 1, after 75 min | Line -4 m, press -0.2, risk -0.2, safer passing, more time spent in the corners, goal-kick and free-kick delays |
| Winning by 2 or more | Mid block, possession-first, risk -0.3 |
| Level, after 80 min (needing a result) | Slightly higher risk (+0.1), last 5 minutes more direct |
| Red card against us | Drop a forward or a winger to restore the shape (e.g. 4-3-3 to 4-4-1), compact block, lower press (-0.25) |
| Red card for the opponent | Higher line, wider shape, press +0.15 |
| Yellow card on a key defender | Replace or switch to a safer marker; raise tackle threshold |

The ramp is a first-order filter with a time constant of 15 s so a goal produces a visible but gradual change.

### 15.2 In-game tactical changes

- **Formation switch** at a trigger (red card, losing at 60 minutes, or a substitution that changes shape): the formation anchors blend over 10 to 15 s.
- **Style switch** between presets (for example from possession to direct) when the opponent's press is bypassed repeatedly (3 or more successful long balls into space within 10 minutes).
- **Press adjustment** from the team's PPDA versus target and the opponent's build-up success: if the opponent is bypassing the press easily, drop to a mid block; if the opponent's pass completion is above 90%, increase the pressing triggers.

### 15.3 Substitutions

Five substitutions in up to three windows (plus half time) are allowed. The manager AI decides at checkpoints (about minute 55, 70, 80, and when forced).

| Reason | Rule |
| --- | --- |
| Fatigue | Player energy below 0.30 and in a high-work role (full-back, winger, central midfielder) |
| Performance | Confidence below -0.4 and a negative contribution (such as more than 3 lost duels in a row) |
| Cards | Yellow on a defender who has already committed 2 fouls, or any player on a yellow at minute 60 or later if in a tackling role |
| Injury | Forced |
| Tactical | Chasing a goal: swap a defensive midfielder for an attacker; protecting a lead: swap a forward for a defender or midfielder |

Typical count and timing: 4 to 5 substitutions per team per match, with the first around minute 58 to 65 and the rest between minute 70 and 85. Substituted players take about 20 to 30 s to leave the pitch (counts in stoppage time) and the new player enters at a fixed touchline point.

### 15.4 Time management

- A team winning in the last 10 minutes can slow restarts within the legal limits: goal kicks at 6 to 8 s, throw-ins at 5 to 8 s, free kicks at 8 to 12 s, substitutions late. These feed the referee's stoppage-time logic (13.6).
- A losing team speeds up restarts and retrieves the ball quickly.

### 15.5 Pre-match plan

Before kick-off the manager picks a preset by comparing the two teams' ratings: the stronger team plays a higher line and a possession style; the weaker team plays a mid or low block with a counter-attack plan. The preset is an editable starting point, and the in-game logic above takes over.

## 16. Stat calibration loop and telemetry

Because the sim is deterministic and headless-capable, the AI can be tuned against real statistics automatically instead of by feel alone. This is how the build meets the targets in section 3.

### 16.1 Headless harness

- Run the full sim without rendering at 10 to 50 times real time (fixed timestep, no interpolation). Each worker plays one match; seeds are consecutive integers so any anomalous match can be replayed and watched.
- For each match, log an event stream: passes (start, end, type, success), shots (xG, outcome, body part), tackles, fouls, cards, corners, offsides, possession spells, touches, distances, sprints, keeper events and phase changes.
- Aggregate to the metrics of section 3, with mean, standard deviation and per-position profiles (section 6.1).

```ts
interface MatchRecord {
  seed: number; home: TeamId; away: TeamId; score: [number, number];
  stats: { [team: string]: TeamStats };
  players: PlayerStats[];            // per-90 numbers and physical load
  events: AIEvent[];                 // compact binary for 1,000+ matches
}

function calibrate(config: AIConfig, nMatches = 1000): Report {
  const results = parallelMap(seeds(nMatches), s => simulateMatch(config, s));
  return compareToTargets(aggregate(results), TARGETS);   // table in section 3
}
```

### 16.2 Acceptance rules

1. For each metric in 3.1, the mean over 1,000 matches (mixed team ratings) must lie in the accepted band.
2. Correlations must be sane: more possession should correlate with more passes and a somewhat better xG difference (a correlation of about 0.3 to 0.5 between possession share and goal difference), and a stronger team should win more often (a top vs bottom pairing: about 70% to 75% win rate for the stronger side).
3. Distribution checks: goals per match should follow a Poisson-like distribution (about 7% of matches 0-0, about 13% with 5 or more goals combined), and the shot-count standard deviation per team should be near 4.
4. Per-position per-90 profiles from 6.1 must be inside ±20%.
5. A **visual audit** checklist of 20 matches per build, reviewed by a person: no ball-hogging by a single AI player (touches per player within 1.5 times the role target), no all-team ball-chasing (no more than 3 players within 8 m of the ball, except at set pieces), no aimless backpassing loops (average backward pass chains under 3), and no keeper that never makes a save.

### 16.3 Knob map (which dial moves which stat)

| If this is off | Primary knob | Secondary knob |
| --- | --- | --- |
| Too few or too many goals | Shot-error sigma (6.3), keeper reaction delay and perception sigma | Shot decision threshold (7.4), keeper rush-out rule |
| Shots too many or too few | Shoot threshold xG, attacker box-occupancy rule | Pass vs shoot bias in final third, defensive line height |
| Shots mostly from outside the box | Cross and cutback weights, progression into the box | Risk appetite, through-ball weight |
| Pass accuracy too high or low | Pass-error sigma, pass risk weight in the utility score | Pressure on the carrier (pressing intensity) |
| Possession too lopsided | Team-rating effect on pass and touch skill | Press intensity, tempo |
| Too many fouls or cards | Tackle threshold, slide-tackle gating, referee threshold | Defensive aggression trait |
| Too few interceptions | Defender anticipation, lane-reading noise | Pass-lane margin (7.3) |
| Offsides off | Line-keeping noise, offside-trap step rule | Runner timing, linesman error |
| Dribble success off | Take-on contest weights, defender jockey rule | Take-on frequency threshold |
| Players too tired or fresh | Stamina drain, sprint budget (10.2) | Walk/jog selection when far from play |
| Crosses too many or few | Cross weights, full-back overlap rate | Box-occupancy rule |

### 16.4 Automatic tuning

1. Choose 10 to 15 global knobs from the table above with sensible ranges.
2. Define a loss: sum over metrics of `((mean - target) / tolerance)²`, weighted by the priority order in 3.4.
3. Run coordinate descent or CMA-ES with 300 to 500 matches per candidate, then confirm the best candidate with 1,000 matches and a different seed set.
4. Freeze knobs when every metric is inside its band and the visual audit passes. Re-run the whole suite after any physics or AI change (it is the AI's regression test).

### 16.5 In-game telemetry

On device, only a lightweight counter set is recorded (shots, passes, possession, fouls) for the match summary screen and for optional anonymous analytics, so players never pay the cost of the full event stream.

## 17. Difficulty and realism sliders

Difficulty changes how well the AI executes football, never whether it obeys the rules of the world. There is no rubber-banding and no scripted comeback; a weaker setting simply makes the AI slower to react, noisier in decisions and sloppier in execution.

### 17.1 Difficulty levels

| Parameter | Amateur | Semi-pro | Professional | World class | Legendary |
| --- | --- | --- | --- | --- | --- |
| Reaction time | 320 ms | 260 ms | 200 ms | 160 ms | 130 ms |
| Decision temperature τ multiplier | 2.2 | 1.6 | 1.0 | 0.7 | 0.5 |
| Pass and shot error multiplier | 1.5 | 1.25 | 1.0 | 0.9 | 0.8 |
| First-touch quality shift | -0.12 | -0.06 | 0 | +0.03 | +0.06 |
| Pressing intensity cap | 0.4 | 0.6 | 0.8 | 0.9 | 1.0 |
| Defensive line coordination (step-up synchrony) | 60% | 75% | 90% | 95% | 100% |
| Off-ball run quality (timing noise) | ±0.5 s | ±0.35 s | ±0.2 s | ±0.12 s | ±0.08 s |
| Awareness cone and scan rate | -25% | -12% | 0 | +8% | +15% |
| Goalkeeper reaction and perception sigma multiplier | 1.6 | 1.3 | 1.0 | 0.9 | 0.8 |
| Tackle threshold (aggressiveness) | 0.65 | 0.58 | 0.52 | 0.50 | 0.48 |

The Professional column is the calibration baseline for section 3. Other levels will shift the statistics (for example, Amateur AI will complete fewer passes and concede more chances), which is intended; the calibration suite is run at Professional and spot-checked at the others.

### 17.2 Team quality spread

Team strength comes from player attributes (0 to 1 scale), not from AI rule changes. A league has teams whose average ratings range from about 0.55 to 0.78. The calibration should reproduce typical top-versus-bottom differences:

| Metric | Top team | League average | Bottom team |
| --- | --- | --- | --- |
| Possession | 60% to 65% | 50% | 38% to 42% |
| Shots | 16 to 18 | 12.5 | 8 to 10 |
| xG | 1.9 to 2.3 | 1.35 | 0.8 to 1.0 |
| Pass accuracy | 87% to 90% | 82% | 75% to 78% |
| Goals scored per match | 2.2 to 2.6 | 1.35 | 0.9 to 1.1 |
| PPDA | 8 to 9 | 11 | 13 to 16 |
| Points per match | 2.2 to 2.5 | 1.35 | 0.7 to 1.0 |

### 17.3 Realism slider

The physics spec defines a single realism slider (arcade to weighty). The AI follows the same slider with these links:

| Slider end | AI behaviour |
| --- | --- |
| Arcade | Higher assist weights on the human side, AI uses the magnetised dribble model, wider pass lanes accepted, faster tempo, keepers more forgiving, more goals (up to 3.4 per match) |
| Contextual | Default mix, calibrated to section 3 |
| Weighty | Lower assists, touch-based dribbling, bigger error cones, more first-touch errors, tighter keepers; fewer goals and more fouls (down to 2.3 goals per match) |

### 17.4 Human-team assist (for the player's own team)

The same AI runs for teammates of the human player: off-ball movement, marking and shape are always AI-driven. The human controls one player at a time; the **auto-switch** logic picks the defender with the smallest interception time (with hysteresis of 0.4 s) and offers a manual override. Assist level only changes pass target selection and aim correction for the controlled player (physics spec 5.1).

## 18. Performance budget, debug tools, test plan

### 18.1 CPU budget (mid-range phone, 60 fps, 16.6 ms frame)

The AI must fit in about 2.5 ms of an average frame and 4 ms at peak, leaving room for physics, animation and rendering.

| Subsystem | Budget per frame (average) | How |
| --- | --- | --- |
| Blackboard snapshot (22 players + ball) | 0.15 ms | Flat typed arrays, one pass, reused buffers |
| Ball path prediction and interception times | 0.35 ms | 0.05 s steps, 3 s horizon, once per 4 ticks, shared by all |
| Pitch control and pressure grids | 0.40 ms amortised | 5 Hz, 30-cell grid plus a 3 m grid only in the final third, one team per tick |
| Team brain (2 teams) | 0.20 ms amortised | 5 Hz, offset between teams |
| Player brains (22) | 0.90 ms | 15 Hz staggered, so about 5 to 6 players per tick; candidate pruning to the top 6 |
| Goalkeepers | 0.10 ms | Full rate only when a shot or cross is live |
| Execution layer (steering) | 0.30 ms | Simple vector math, fixed-size scratch buffers |
| Referee, set-piece director | 0.05 ms | Event-driven |

**Optimisation rules**

1. No allocations in per-tick AI code. Pre-allocate vectors, candidate arrays and scratch maps; pool intent and event objects.
2. Use spatial hashing (a 5 m cell grid) for "nearest opponent" queries instead of all-pairs distance.
3. Prune pass candidates with a cheap score (distance, direction, nearest-defender gap) before the full lane test, and cache lane tests for 100 ms.
4. The xT and xG tables are lookups with bilinear interpolation, not formulas evaluated per call.
5. Time-slice heavy jobs (pitch control, press assignment) across ticks with a fixed budget per tick; degrade by lowering grid resolution first, then rate, never by dropping players.
6. Keep determinism: any budget-based skipping must depend on tick count, not on measured time.
7. LOD: off-screen and far-from-ball players run their player brain at 7 Hz and skip scanning detail; the ball carrier, nearest defenders and the keeper never drop below full rate.

### 18.2 Threading note

On the web, a worker thread for the team brain and pitch control is possible, but rollback netcode and replays are simpler with everything on one thread and a deterministic snapshot. Start single-threaded; move the grid computations to a worker only if profiling on real devices shows a problem, and apply the result at a fixed tick delay.

### 18.3 Debug overlays (build these first)

- **Intent arrows** from each player to his move target, coloured by speed mode; the current behaviour name floats above (`overlap`, `press`, `cover`, `check`).
- **Pitch-control heat map**, per team, with a toggle for pressure.
- **Pass-lane overlay** for the carrier: every candidate pass drawn with its P\_success and the final score; the chosen action highlighted.
- **Pressing view:** assigned pressers, cover shadows, trigger flags, press line and defensive line.
- **Offside view:** kick-time snapshot, lines, linesman noise.
- **Keeper view:** reach envelope, perceived vs actual trajectory, chosen save type.
- **Decision log** (ring buffer of the last 5 s per player) with the full score breakdown and the softmax choice.
- **Stat panel:** live match stats against the section 3 targets with colour-coded drift.
- **Replay scrubbing:** deterministic replay with an AI-state snapshot every 2 s so any odd moment can be inspected frame by frame.

### 18.4 Test plan

| Level | What | Pass criterion |
| --- | --- | --- |
| Unit | Steering, pass lane model, xG curve, pitch control, keeper positioning, referee severity | Matches hand-computed values within 1% |
| Scenario (scripted) | 2v1, 3v2, 4v3 counters; build-up against high press; low block vs cross; corner and free-kick routines; keeper 1v1; penalty; offside trap | Intended behaviour in at least 90% of 200 repeats (random seed) |
| Property | No player leaves the pitch; no two players overlap beyond the capsule radius for more than 0.2 s; no offside runner past the line before release (unless noise-induced); stamina never below the floor | Zero violations across 1,000 matches |
| Statistical | Section 3 targets and section 16.2 correlations | Inside every band at Professional difficulty |
| Behavioural audit | Human review of 20 matches: shape, pressing, rotations, set pieces, variety | Checklist passes |
| Performance | AI ms per frame on 3 reference phones, thermal soak for 20 minutes | Within budget with no sustained spikes |
| Determinism | Same seed and inputs produce identical event streams across browsers | Hashes match |

### 18.5 Suggested build order for the AI

1. Blackboard, intent struct, locomotion hookup, and anchor-based shape with the ball shift (players hold position and chase the ball).
2. Pass lane model, on-ball utility with pass and carry only; add the debug overlays.
3. Shooting, xG model, finishing; basic keeper positioning and save solver.
4. Defending: contain, tackle decisions, interception, marking; referee fouls and offside.
5. Phase machine, pressing triggers, defensive block, transitions.
6. Off-ball runs and the pitch-control model; set-piece routines.
7. Goalkeeper distribution, sweeping, penalties; substitutions and game-state logic.
8. Calibration harness and the automatic tuning loop; difficulty levels; performance pass; polish and balance with real device testing.

The first playable version after step 3 already gives matches with shots and saves, and the harness from step 8 can be started early (even with step 2) to watch the match-level numbers move as each system is added.
