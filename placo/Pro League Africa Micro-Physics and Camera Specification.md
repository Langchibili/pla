# Pro League Africa: Micro-Physics and Camera Specification

Oct 15, 2026 · @lang

This document goes below the first physics spec: what the legs, feet, hands and bodies do at the moment of contact, how a stick push becomes a pass or a throw, what happens when the ball hits the referee, and how the cameras frame all of it. Every number is a tunable starting point grounded in biomechanics and football practice, and the formulas are written so each can be unit-tested.

## 1. Scope, conventions and relation to the earlier physics spec

**Relationship to the first spec.** The first spec stays authoritative for the ball integrator (drag, Magnus, bounce, rolling), the locomotion traction circle, the tackle state machine and the keeper dive model. This document replaces its simple contact rules (for example the fixed `m_part` of 5 to 8 kg and the single `e_foot`) with a body-segment model, and adds the missing pieces: input mapping, throw-ins, officials, dropped balls and cameras.

**Units and axes.** Meters, seconds, kilograms, radians internally (degrees in tables). Right-handed, Y up, X across the pitch (68 m), Z along its length (105 m). Ball radius r = 0.11 m, mass 0.43 kg, I = (2/3)·m·r² = 0.00347 kg·m². Ball contact is solved at the 240 Hz ball sub-step; body segments are sampled at 60 Hz from the animation and interpolated to 240 Hz for contact tests.

**Design rules**

1. **Contact is geometric first.** A touch happens only when a body hitbox, swept over the sub-step, intersects the ball. No distance-only "magnet" touches except the optional dribble attractor in the first spec.
2. **Animation provides the leg, physics provides the outcome.** The animation clip moves the leg; at the contact frame the physics samples the segment velocity and computes the impulse. IK nudges the foot so it meets the ball at the intended contact point, within limits.
3. **One kick clip, many outcomes.** Because of the animation scope (one kick clip), differences between a driven pass, a curler, a chip and a power shot come from contact point, foot speed and foot path in the physics, never from extra clips. The tables in sections 3 and 4 define those differences.
4. **Everything the referee judges is recorded as data** (contact order, body part, height, speed, angle, force) at the moment it happens, so rulings are deterministic and explainable (section 12).
5. **Determinism.** Seeded RNG streams only; fixed iteration order; no frame-dependent logic. Cameras are visual-only and may use floating-point freely, since they never feed back into the simulation.

**Contents at a glance**

| Sections | Topic |
| --- | --- |
| 2 to 4 | Body model, the kick, launch height, loft, spin, mishits |
| 5 to 6 | Stick and button input to power, throw-ins |
| 7 to 10 | Touches, headers, tackles, falls, goalkeeper hands |
| 11 to 13 | Officials, dropped ball, boards, posts, nets, surface and weather |
| 14 | How the AI and the referee AI apply all this |
| 15 to 17 | Cameras: architecture, modes, input, mobile |
| 18 | Validation tests |

## 2. Body model: anthropometry and hitboxes

Each player keeps two representations: the **movement capsule** (radius 0.3 m, height 1.8 m, from the first spec) used only for separating players and steering, and a set of **limb hitboxes** attached to skeleton bones, used for every contact with the ball and in tackles.

### 2.1 Reference body (scale linearly with player height H; reference H = 1.80 m, M = 75 kg)

| Segment | Length (m) | Fraction of H | Mass fraction of M | Mass at reference (kg) |
| --- | --- | --- | --- | --- |
| Thigh (hip to knee) | 0.43 | 0.245 | 0.100 | 7.5 |
| Shank (knee to ankle) | 0.44 | 0.246 | 0.0465 | 3.5 |
| Foot (heel to toe) | 0.27 | 0.152 | 0.0145 | 1.1 |
| Trunk (pelvis to shoulders) | 0.55 | 0.30 | 0.43 | 32 |
| Head and neck | n/a (head radius 0.10) | n/a | 0.081 | 6.1 |
| Upper arm | 0.30 | 0.17 | 0.028 | 2.1 |
| Forearm | 0.26 | 0.145 | 0.016 | 1.2 |
| Hand | 0.19 | 0.105 | 0.006 | 0.45 |

Key heights for a reference player: ankle 0.08 m, knee 0.50 m, hip 0.92 m, shoulder 1.47 m, head centre 1.70 m, standing reach (arms up) about 2.35 m. Player height ranges 1.65 to 1.98 m and mass 60 to 95 kg, with mass tied to height and a build slider.

### 2.2 Limb hitboxes

| Hitbox | Shape | Dimensions | Purpose |
| --- | --- | --- | --- |
| Foot | Capsule along the foot bone | Radius 0.045 m, length 0.24 m, plus an "instep patch" (the upper-front surface, used to decide laces vs inside vs toe) | All kicks, touches, tackles |
| Shank | Capsule | Radius 0.055 m, length 0.40 m | Shin contact, blocks, fouls |
| Thigh | Capsule | Radius 0.085 m, length 0.40 m | Thigh trap, thigh contact |
| Pelvis and trunk | Capsule | Radius 0.17 m, length 0.50 m | Chest control, body blocks, shoulder charges |
| Shoulder | Sphere each side | Radius 0.10 m | Shoulder-to-shoulder legality |
| Head | Sphere | Radius 0.10 m, centre at head bone | Headers |
| Upper arm and forearm | Capsules | Radius 0.04 m | Handball and push detection |
| Hand | Sphere each side | Radius 0.05 m | Handball, throw-in release, keeper contact |
| Keeper glove | Sphere each side (keeper only) | Radius 0.10 m, sweet-spot centre at the palm | Catches and parries (section 10) |

A hitbox is scaled by `H / 1.80`. Hitboxes follow the animated bones, and the foot hitbox is additionally corrected by IK during kick and tackle clips (section 3.4).

### 2.3 Collision layers

- **Ball vs every limb hitbox:** always on, swept over each 240 Hz sub-step to avoid tunnelling. A foot moving at 25 m/s travels 0.10 m per sub-step, comparable to the ball radius, so sweeping is mandatory.
- **Limb vs limb (opponents only):** active only while a tackle, shoulder charge or aerial duel is in progress, or when two opponents are within 1.5 m of each other and the ball is within 2 m of one of them. This is the contest zone and keeps the cost low.
- **Teammates:** limb hitboxes ignore each other; only the movement capsules separate them softly.
- **Limb vs ground:** the foot capsule is clipped against the ground plane (y = 0) so the toe cannot sink into the turf. A foot that strikes the ground just before the ball triggers the turf-drag rule (section 4.5).

### 2.4 Effective striking mass

How much of the body weight "follows through" the foot determines how much speed the ball gets. The first spec uses a single value of 5 to 8 kg; here it is built from the segment masses and an **ankle lock** λ\_a and **leg drive** λ\_k between 0 and 1:

```
m_eff = m_foot + λ_a * m_shank + λ_k * m_thigh
```

| Contact | λ\_a (ankle lock) | λ\_k (leg drive) | m\_eff at reference (kg) |
| --- | --- | --- | --- |
| Soft first touch, cushion | 0.1 | 0.0 | 1.5 |
| Inside-foot pass | 0.7 | 0.2 | 5.0 |
| Laces drive and power shot | 1.0 | 0.4 | 7.6 |
| Chip and scoop | 0.6 | 0.1 | 4.0 |
| Toe poke | 0.5 | 0.3 | 5.1 |
| Tackle block (planted foot) | 1.0 | 0.6 | 9.1 |

Players with high strength and technique reach a higher λ\_a (a firmer ankle) at the moment of impact; tired or off-balance players have lower λ\_a, which reduces ball speed and raises error, matching the real loss of power when out of position.

## 3. The kick: leg kinematics and foot-ball impact

### 3.1 Phases of one kick (single animation clip, times relative to impact)

| Phase | Time to impact | What the leg does | What the physics uses |
| --- | --- | --- | --- |
| Approach | -600 to -150 ms | Last two or three strides shorten; body turns toward the target (30 to 45 degrees off the shot line for curlers, 0 to 15 degrees for power) | Approach speed and angle feed shot quality q and spin options |
| Plant | -90 to -60 ms | Support foot lands 0.15 to 0.30 m beside the ball and 0.00 to 0.10 m behind its centre line; knee slightly bent | Plant offset is the main driver of contact-point error (3.4) |
| Backswing | -180 to -40 ms | Hip extends, knee flexes to 90 to 110 degrees, kicking foot reaches 0.45 to 0.65 m behind the ball; longer for harder kicks | Backswing length scales available foot speed |
| Forward swing | -40 to 0 ms | Thigh whips forward (hip flexion 12 to 18 rad/s), then the knee extends rapidly (20 to 30 rad/s) as the thigh decelerates | Foot speed peaks right before impact |
| Impact | 0 to +10 ms | Foot is in contact with the ball for 8 to 12 ms | Impulse solved (3.2) |
| Follow-through | +10 to +300 ms | Leg continues forward and up; trunk leans forward; the kicker lands on the plant leg | Follow-through hitbox stays active for foul checks (section 8) |

**Foot speed control.** The animation clip has a measured reference foot speed at impact `v_ref` (set it to 20 m/s offline). For a desired foot speed `v_f`, the clip playback rate is scaled by `s = clamp(v_f / v_ref, 0.7, 1.35)` and the backswing length is scaled the same way. Outside that range, extra speed is not requested; the kick simply tops out and the shot-quality factor q drops. This is how one clip serves a soft pass (v\_f of 6 m/s) and a full-power shot (v\_f of 25 m/s). Wind-up time is `T_wind = 0.10 + 0.12·p` seconds for charge level p, so the input-to-kick latency is 100 to 220 ms.

### 3.2 Impact equations (per 240 Hz sub-step during contact)

Let `n` be the unit normal from the closest point on the foot hitbox to the ball centre, `v_fp` the foot velocity at the contact point (centre-of-mass velocity of the foot plus ω\_foot × r\_contact), and `m_eff` from section 2.4.

```
v_rel = v_ball - v_fp
v_n   = dot(v_rel, n)                       // negative while approaching
if v_n < 0:
  J_n = -(1 + e_c) * v_n / (1/m_b + 1/m_eff)            // normal impulse magnitude
  v_ball += (J_n / m_b) * n

  // tangential (friction) impulse -> spin and sideways push
  r_c    = -r * n                                          // contact point relative to ball centre
  v_c    = v_ball + cross(ω_ball, r_c) - v_fp
  v_t    = v_c - dot(v_c, n) * n                           // slip velocity at the contact
  t_hat  = v_t / |v_t|
  denom_t = 2.5/m_b + 1/m_eff                              // 2.5/m_b = 1/m + r²/I for a hollow ball
  j_stop = |v_t| / denom_t                                 // impulse that would stop all slip
  J_t    = min(j_stop, mu_c * J_n)                          // Coulomb limit
  v_ball += -(J_t / m_b) * t_hat
  ω_ball += cross(r_c, -J_t * t_hat) / I
```

Contact lasts 8 to 12 ms, so repeat the solve over 2 or 3 consecutive sub-steps (moving the ball with its new velocity between them) until `v_n >= 0`. That also lets the ball slide along the foot surface slightly and gives a smoother spin than a single instant impulse.

**Rules of thumb that fall out of the equations**

- Spin per unit of tangential velocity imparted: `Δω = 1.5 · Δv_t / r`, about 13.6 rad/s for every 1 m/s. A curling strike needing 50 rad/s therefore transfers about 3.7 m/s of tangential speed, roughly 12% of a 30 m/s shot.
- Peak force is about π/2 times the average: for a 30 m/s kick the ball receives 12.9 N·s over about 10 ms, an average of 1.3 kN and a peak near 2 kN. Use that for audio intensity or UI, not for gameplay.
- Only the normal component of foot velocity sends the ball; a foot that slides across the ball transfers mostly spin.

### 3.3 Contact parameters by strike

| Strike | Restitution e\_c | Friction μ\_c | m\_eff (kg) | Ball-to-foot speed ratio | Typical foot speed (m/s) | Ball speed (m/s) |
| --- | --- | --- | --- | --- | --- | --- |
| Laces drive and power shot | 0.50 | 0.45 | 7.6 | 1.42 | 18 to 26 | 25 to 37 |
| Inside-foot pass | 0.40 | 0.35 | 5.0 | 1.29 | 5 to 14 | 6.5 to 18 |
| Outside-foot | 0.42 | 0.40 | 4.6 | 1.30 | 8 to 17 | 10 to 22 |
| Chip and scoop | 0.35 | 0.50 | 4.0 | 1.22 | 7 to 12 | 8.5 to 14.5 |
| Toe poke | 0.45 | 0.50 | 5.1 | 1.34 | 10 to 20 | 13 to 27 |
| Knuckle (laces, dead-centre) | 0.52 | 0.30 | 7.6 | 1.43 | 21 to 25 | 30 to 36 |

The speed ratio is `(1 + e_c) / (1 + m_b / m_eff)`. Wet turf lowers μ\_c by 0.08 to 0.12; worn boots by 0.05. A skilled player gets a firmer ankle (higher λ\_a, so a higher ratio), which is how the first spec's "skill" translates into power.

**Foot speed from the power input.** `v_f = v_f,min + (v_f,max − v_f,min) · p^1.15`, with `v_f,min = 4 m/s` and `v_f,max` depending on the strike (see 4.1) and the player: `lerp(17, 25, power_attribute)` for laces strikes, 14 for inside-foot, 16 for outside, 12 for chips. The first spec's shot speed range of 12 to 33 m/s is reproduced for a top player (about 23.5 m/s of foot speed times 1.42).

### 3.4 Contact-point error (why kicks are not perfect)

The intended contact point on the ball is chosen by the strike type (section 4). The achieved contact point is displaced by a 3D error `δ = (δ_x, δ_y, δ_z)` (lateral, vertical, along the shot line) drawn from a Gaussian:

```
σ_pos = base_pos * (1 - technique) * (1 + k_p*pressure) * (1 + k_b*body_off_balance) * (1 + k_f*fatigue) * (1 + k_o*off_foot)
// base_pos = 0.014 m;  elite technique and no pressure gives about 0.004 m;  poor under pressure about 0.03 m
```

Because the ball surface is curved with effective radius `R_c = r + r_foot = 0.155 m`, a displacement δ rotates the contact normal by `asin(δ / R_c)`: 1 cm is about 3.7 degrees and 2 cm about 7.4 degrees. So σ\_pos of 0.004 to 0.014 m gives about 1.5 to 5 degrees of launch error for good players, matching the first spec's pass and shot error model (5.5 and 6.3); you can skip a separate angular error entirely and derive it from this.

**Plant-foot contribution.** The error scales with plant-foot offset from the ideal: `σ_pos *= 1 + 4·max(0, |plant_lateral − 0.20| − 0.05)` per metre of error beyond a 5 cm tolerance, and a ball that is too close to the plant foot (under 0.10 m) forces a cramped, jammed strike (m\_eff −20%, elevation +4 degrees).

**Foot IK correction.** The IK may move the foot target by at most 0.08 m laterally and 0.06 m vertically within the last 40 ms before impact. Anything beyond that remaining distance becomes part of δ. That keeps the kick looking natural (no impossible leg stretch) while letting good players adjust to a bouncing ball.

## 4. Launch height, loft and spin: strike types and mishits

### 4.1 How contact height becomes launch angle

Let `h_b` be how far below the ball's centre the foot touches (positive = below). The contact normal tilts upward by `asin(h_b / R_c)` with `R_c = 0.155 m`, and friction pulls the ball direction toward the foot's own path. For planning (AI and aim solvers) use this fast approximation, which the full impulse solve in 3.2 refines:

```
launch_elevation ≈ 0.9 * asin(h_b / R_c) + 0.4 * foot_path_elevation + body_lean_term
```

- `foot_path_elevation` is how steeply the foot is rising through the ball (0 degrees flat sweep, up to 55 degrees for a scoop).
- `body_lean_term` is +0.15 degrees per degree of trunk lean-back beyond 5 degrees (a leaning-back kicker lofts the ball).
- **Ground clearance limit:** a ball at rest has its centre 0.11 m above the turf and the foot capsule axis cannot go below 0.045 m, so `h_b ≤ 0.065 m`. That gives an upper bound of about 25 degrees from the normal alone; steeper chips come from a rising foot path (40 to 55 degrees) and friction. If a requested elevation is unreachable the solver clamps it and raises mishit risk, as in real life.
- For a ball in the air (volley, half-volley) `h_b` can be anything from -0.10 to +0.10 m and the foot path is whatever the clip gives at that height; section 4.5 covers timing.

### 4.2 Strike library (what each strike does, one kick clip)

| Strike | Contact below centre h\_b (cm) | Lateral offset (cm) | Foot path elevation (deg) | Launch elevation (deg) | Spin (rad/s) | Direction scatter at average skill (deg) |
| --- | --- | --- | --- | --- | --- | --- |
| Ground pass, inside foot | 0.5 to 1.5 | 0 | 0 to 3 | 0 to 3 | Backspin 0 to 8 | ±1.5 |
| Driven pass (laces) | 1.0 to 2.5 | 0 | 3 to 8 | 3 to 8 | Backspin 5 to 15 | ±2.5 |
| Normal shot | 1.5 to 3.0 | 0 to 1 | 6 to 12 | 8 to 14 | Backspin 5 to 20, sidespin up to 10 | ±3.5 |
| Low driven shot | 0.5 to 1.5 | 0 | 0 to 5 | 3 to 8 | Backspin 0 to 10 | ±3 |
| Power shot | 1.0 to 2.5 | 0 to 1 | 4 to 10 | 6 to 13 | Backspin under 12 | ±5 |
| Finesse / curler | 2.0 to 3.5 | 3 to 5 (toward the curl side) | 8 to 15, swing path across the ball 25 to 40 degrees | 10 to 18 | Sidespin 40 to 60, slight backspin | ±3 |
| Outside-foot curl | 1.5 to 3.0 | 2 to 4 | 5 to 12, path across 20 to 35 degrees | 8 to 15 | Sidespin 20 to 40 | ±4 |
| Chip / lob | 5.0 to 6.5 | 0 | 35 to 55 | 30 to 55 | Backspin 30 to 50 | ±3 |
| Lofted pass | 3.5 to 5.5 | 0 to 1 | 20 to 40 | 20 to 40 | Backspin 15 to 35 | ±3 |
| Cross: whipped, low | 1.5 to 3.0 | 2 to 4 | 8 to 15, path across 25 degrees | 10 to 16 | Sidespin 30 to 50 | ±4 |
| Cross: high | 3.5 to 5.5 | 1 to 3 | 20 to 35 | 25 to 42 | Sidespin 20 to 40, backspin 15 to 30 | ±4 |
| Knuckle | 0.0 to 0.5, centre of mass line within 5 mm | 0 (±0.5) | 0 to 6 | 6 to 12 | Under 5, random ±3 | ±4 plus late wobble |
| Toe poke | 1.0 to 3.0 | 0 | 0 to 10 | 0 to 12 | Backspin 0 to 10, erratic | ±6 |
| Goal kick / long ball | 3.5 to 5.0 | 0 to 2 | 18 to 30 | 22 to 38 | Backspin 15 to 30 | ±5 |

Spin sign convention: viewed from above with +Y up and +Z forward, **positive ω\_y (counter-clockwise from above) bends the ball to its left**, as the Magnus term `ω × v` in the first spec gives. A curler's spin sign is chosen by which side of the ball the foot catches (the lateral offset sign) and which way the foot sweeps across it.

**Sidespin estimate for planning.** For an inside-of-the-instep curl the tangential speed imparted is roughly `Δv_t ≈ 0.5 · v_f · sin(φ)` where φ is the angle of the foot path across the shot line. With v\_f = 14 m/s and φ = 30 degrees that gives 3.5 m/s, so `ω ≈ 13.6 · 3.5 = 48 rad/s`, which matches the finesse row.

### 4.3 Ball height versus distance (worked reference for shots and aim)

How low or high a shot must leave the foot to arrive between 0.3 m and 2.3 m of ball-centre height (inside the crossbar by one radius), for a ground ball struck at 28 m/s, ignoring drag (with drag add about 0.5 to 1.5 degrees at 25 to 30 m/s):

| Distance to goal | Elevation window (deg) | Window width (deg) | Reading |
| --- | --- | --- | --- |
| 10 m | 5 to 16 | 11 | Forgiving |
| 16 m | 6.5 to 13.5 | 7 | Normal box shot |
| 20 m | 8 to 13.5 | 5.5 | Edge of the box |
| 30 m | 11.5 to 15.3 | 3.8 | A small error skies it or drops it short |

At a contact-point error of 1 cm (3.7 degrees of launch error) a 30 m shot misses the vertical window about half the time, which is why long shots convert so rarely (xG about 0.02). The window numbers are the AI's input for choosing `h_b` (section 14) and a good unit test.

**Apex and range examples (no drag, ground ball)**

| Kick | Speed (m/s) | Elevation (deg) | Apex height (m) | Range (m) |
| --- | --- | --- | --- | --- |
| Driven ground pass | 18 | 3 | 0.2 | 17 (low bounce then roll) |
| Lofted pass | 25 | 30 | 8.0 | 55 before drag, about 45 with drag |
| Chip over a defender | 12 | 42 | 3.3 | 14.6 |
| Whipped cross | 24 | 12 | 1.3 | 24 |
| High cross from the byline | 15 | 45 | 5.6 | 23 |

Apex = `(v·sinθ)² / (2g) + 0.11`; range on flat ground = `v²·sin(2θ) / g`.

### 4.4 Mishits

| Mishit | Trigger | Physical result |
| --- | --- | --- |
| Skied | `h_b > 0.065 m` impossible on the ground, so it arises when the foot dips under the ball with a steep rising path (over 55 degrees) or the kicker leans back more than 15 degrees | Launch elevation +10 to +25 degrees over intended, speed -10% |
| Shanked | Lateral contact error | δ\_x |
| Toe-ended | Contact on the end of the toe (δ\_z beyond the toe cap) | m\_eff 2.5 kg, speed -35%, direction ±15 degrees, erratic spin |
| Duffed (turf drag) | Foot hits the turf more than 2 cm before the ball | Foot speed multiplied by `1 - 0.3·(dig_depth / 0.03)`, launch elevation +6 degrees, loses spin; ball often bobbles |
| Slice | Foot path across the ball over 50 degrees with high speed | Sidespin 60 to 90 rad/s, curve of 6 to 10 m on a 30 m shot |
| Air-kick (whiff) | Total contact error over 0.12 m | No contact on the main swing; ball is only nudged by the follow-through at 40% speed |

Baseline mishit chance is 0.5% to 1.5% per kick, multiplied by `(1 + 1.5·pressure + 1.0·fatigue + 0.8·off_balance)` and shared among the types above by the geometry of the displacement `δ`, not by a separate dice roll.

### 4.5 Volleys and half-volleys

- Contact timing window is ±80 ms on a moving ball. The error model uses `σ_t` (timing) in addition to `σ_pos`; a timing error of Δt moves the contact point along the ball path by `v_ball_rel · Δt`.
- For a volley the impulse uses relative velocity (first spec 2.7): `v_n` includes the incoming ball speed, so a 15 m/s cross struck at 20 m/s foot speed leaves at about `(1.5·7.6·20 + 3.37·15) / 8.03 = 34.7` roughly 35 m/s depending on the angle, which is why volleys travel fast with little effort.
- A half-volley contacts the ball within 0.05 s after the bounce, when the ball is rising with `v_y` of 1 to 4 m/s; set `h_b` from the ball's height at the contact frame. A good half-volley is the lowest-error shot because the ball is nearly stationary relative to the ground at the apex of the bounce.

## 5. Input to power: stick, charge and button mapping

### 5.1 Movement stick to velocity

The virtual or physical stick gives a vector `s` with |s| from 0 to 1. The pipeline is: dead zone, response curve, band mapping, direction smoothing, camera-relative rotation (section 17).

```
m = clamp((|s| - 0.10) / (0.95 - 0.10), 0, 1)     // 10% dead zone, saturates at 95%
m_c = m ^ 1.3                                       // response curve (finer control at low deflection)
desired_speed = v_run * m_c                          // continuous; then snapped to bands below
```

| Stick deflection | After curve m\_c | Speed mode | Target speed (m/s) |
| --- | --- | --- | --- |
| 0 to 10% | 0 | Idle | 0 (decelerate at braking rate, first spec 3.1) |
| 10% to 35% | 0.0 to 0.25 | Walk | 0.8 to 2.0 |
| 35% to 70% | 0.25 to 0.65 | Jog | 3.5 |
| 70% to 100% | 0.65 to 1.0 | Run | 6.0 |
| Over 70% plus sprint button held | n/a | Sprint | 8 to 10 (attribute-scaled) |

Bands use hysteresis of ±3% of deflection so a finger trembling at a boundary does not flip jog and run. With the stick held, speed rises under the acceleration limits of the traction circle rather than jumping, and releasing the stick brakes at 9 to 14 m/s², so a quick tap moves a player only 0.3 to 0.6 m.

**Direction.** The stick angle is low-pass filtered with a 40 ms time constant (kills jitter without lag) and compared with the current heading; the heading turns no faster than the turn-rate limit `ω0 / (1 + 0.15·speed)`. An optional 8-way or 16-way snap (tolerance 12 degrees) is available for tap-heavy modes, and always applies to the aim of passes and shots, not to locomotion.

**Virtual stick specifics (phones)**

- Floating stick: the base appears where the thumb lands in the left third of the screen. Radius R = 10 mm of physical finger travel (about `10 · dpi / 25.4` pixels, roughly 65 to 80 px on a typical phone). When the thumb moves beyond R the base follows at a rate of 0.5 of the overshoot per frame, so the stick never needs recentring.
- Read raw touches at the display rate with coalesced events, and keep touch-to-intent latency under 50 ms. Never poll inside the 60 Hz sim tick; sample at the render rate and hand the latest value to the sim.
- Multi-touch: the stick finger and the action-button fingers are tracked independently; a second finger landing in the stick region is ignored.

### 5.2 Action buttons: tap versus charge

All kicks use a held-button charge. The time the button is down maps to a power level `p` from 0 to 1.

| Action | Full charge time T\_full | Quick tap (under 120 ms) | Charge curve |
| --- | --- | --- | --- |
| Pass (ground, driven, through, lob) | 0.70 s | Assisted pass at solver power | `p = clamp((t - 0.05) / T_full, 0, 1)` |
| Shoot | 0.90 s | p = 0.35 (weak shot) | Same, with a quality zone (below) |
| Cross | 0.80 s | p = 0.40 | Same |
| Clearance | 0.60 s | p = 0.55 | Same |

**Quality zone for shots.** Accuracy peaks in the sweet zone and drops at the extremes:

```
q_charge = 1.0                      for p in [0.55, 0.92]
         = 0.90 + 0.10*(p / 0.55)   for p below 0.55 (a weak shot is slightly inaccurate)
         = 1.0 - 1.9*(p - 0.92)     for p above 0.92 (over-hit: 0.85 at p = 1.0)
```

This feeds `σ_pos` as `σ_pos *= (2 - q_charge)`. Releasing early still works (first spec 6.1): the shot fires at the current p.

**Power to ball speed.** For shots: `v_f` from section 3.3, then `v_ball = ratio · v_f`. For passes the assisted path uses the first spec's solver: distance D to the receiver's lead point and the arrival speed give `v0 = v_arr + k·D`, then `v_f = v0 / ratio_strike`; the charge only scales the overhit: `v0 *= 0.85 + 0.30·(p - p_solver)` clamped to ±15%. Manual passes (assist off) map charge to range directly:

```
D(p) = 4 + 41 * p^1.5     // metres: p=0.25 gives about 9 m, p=0.5 about 19 m, p=0.75 about 31 m, p=1.0 gives 45 m
```

### 5.3 Aim from the stick

- **Passes:** the stick direction at the moment of release selects a target within a 35 degree cone (assist) or sets the exact heading (manual). With no stick input the pass goes to the best candidate in the player's facing direction.
- **Shots:** the aim point is expressed in goal-plane coordinates. Lateral aim `x_aim = clamp(s_lateral · 3.66, ±3.2)` with the stick measured relative to the direction of goal (so pushing right of goal aims toward the right post), with 0.46 m of margin to the post. Vertical aim is chosen by the strike type: low driven (target y 0.3 to 0.7 m), normal (0.5 to 1.4 m), power (0.6 to 1.8 m), chip (top 1.8 to 2.3 m, with the keeper position as a hint).
- **Modifiers:** a held modifier button selects finesse, a double tap selects chip or lob, and a held lofted modifier turns a through ball into a lobbed through ball. Contextual rule: the action button is a pass when the team has the ball and a tackle when defending (first spec 3.5b).

### 5.4 Buffers and cancel windows

- Inputs pressed during recovery frames are buffered for 120 ms and fire when the player can act again, so that quick sequences feel responsive.
- A kick can be cancelled by releasing the stick toward an opponent (for a feint) or pressing the shield button only during the first 40% of the wind-up. After the plant foot lands (about -90 ms before contact) the kick is committed.
- Auto-switching of the controlled player is suppressed for 0.3 s after any kick so the player keeps control of the passer until the ball leaves.

## 6. Throw-in physics and stick-to-power mapping

The throw-in is the one moment besides goalkeeper handling where the ball is **held by the hands**, so it is the only exception to "never attach the ball". Between pick-up and release the ball follows the midpoint of the two hand bones kinematically; at the release event the ball becomes a free physics body with a computed velocity.

### 6.1 Sequence and timing (single throw-in clip)

| Time (s) | Event | Physics and rules |
| --- | --- | --- |
| 0.00 | Set: ball held at chest, both feet at or behind the touchline, body facing the field | Position locked to the throw-in spot (within 0.5 m of where the ball left the pitch; section 6.6) |
| 0.00 to 0.38 | Wind-up: ball travels back and over the head, elbows bend, trunk arches back 10 to 25 degrees | Charge is read from the stick here; the AI picks its choice before the clip starts |
| 0.44 | **Release event** | Ball detaches from the hands; velocity set (6.3) |
| 0.44 to 0.80 | Follow-through, trunk flexes forward, arms extend | Thrower cannot touch the ball again until another player has |
| 0.80 to 1.10 | Recovery, then jog on | Normal locomotion resumes |

Long throws (speed over 16 m/s) stretch the wind-up to 0.55 s and allow a 2 to 4 step run-up before the set pose, at most 3.5 m/s. The run-up adds to the ball's horizontal speed: `v_ball = v_throw + 0.4 · v_runup` along the throw direction.

**Release point.** At the release event the ball starts at `head_bone + (0.10 forward, 0.35 up)`, which is about 2.1 to 2.3 m above the ground for an average player (1.7 to 1.9 m for a short, bent-arm throw). The ball ignores its thrower's hitboxes for 0.25 s after release, so it cannot hit his own head.

### 6.2 Stick deflection to throw speed

The same dead zone and curve as locomotion apply (section 5.1). Pressing the action button starts the throw; the stick deflection at that moment, or the deflection held during the wind-up, sets power.

```
m_c = ((d - 0.10) / 0.85) ^ 1.3           // d = stick deflection, 0..1
v_throw = v_min + (v_max - v_min) * m_c    // v_min = 5 m/s
// v_max = 16 m/s for a typical player; 16 + 5 * long_throw_attribute  (up to 21 m/s) for a specialist
```

| Stick deflection | m\_c | Throw speed, typical player (m/s) | Throw speed, long-throw specialist (m/s) | Typical use |
| --- | --- | --- | --- | --- |
| Under 10% | n/a | Short throw, assisted: nearest teammate (auto solver, 5 to 6 m/s) | Same | Tap with no stick |
| 25% | 0.10 | 6.2 | 6.7 | Throw to feet 4 to 6 m away |
| 40% | 0.26 | 7.8 | 9.1 | Short down the line, 7 to 9 m |
| 55% | 0.44 | 9.8 | 12.0 | Medium, 10 to 14 m |
| 70% | 0.64 | 12.0 | 15.2 | Medium to long, 15 to 21 m |
| 85% | 0.85 | 14.3 | 18.6 | Long, 22 to 33 m |
| 95% to 100% | 1.00 | 16.0 | 21.0 | Maximum; long throw into the box |

A throw also needs a **direction**, taken from the stick angle relative to the pitch. Keep it simple for the player: the horizontal aim is the stick angle, and power is the deflection, but with a **swing hold** on the button: holding the button for 0.1 to 0.3 s before releasing lets the player fine-tune the stick angle while the thrower already winds up. Direction is limited to ±100 degrees from the inward normal of the touchline (throwers must face the field), with a soft snap to the nearest teammate when assist is on.

### 6.3 Launch elevation and range

Elevation is chosen automatically from speed (a player cannot choose the arc with a 2D stick) and nudged by modifiers: a held "high" modifier adds +8 degrees, "low" subtracts 6 degrees. Range on flat ground from a release height of 2.2 m, no drag:

```
R = v·cosθ · ( v·sinθ + sqrt( (v·sinθ)^2 + 2·g·h ) ) / g
```

| Speed (m/s) | Elevation (deg) | Range (m) | Apex above the ground (m) | Typical flight time (s) |
| --- | --- | --- | --- | --- |
| 6 | 12 | 4.7 | 2.3 | 0.8 |
| 8 | 15 | 7.1 | 2.4 | 0.9 |
| 10 | 20 | 10.4 | 2.8 | 1.1 |
| 12 | 27 | 15.2 | 3.7 | 1.4 |
| 14 | 30 | 20.5 | 4.7 | 1.7 |
| 16 | 32 | 26.6 | 5.8 | 2.0 |
| 18 | 33 | 33.2 | 7.0 | 2.2 |
| 21 | 35 | 45.2 | 9.6 | 2.6 |

Drag shortens the longest throws by about 3% to 6%. The record for a long throw is a little over 50 m, and 40 to 45 m is the best realistic range, so 21 m/s is the ceiling. Elevation between rows is linearly interpolated, and the elevation always stays between 10 and 40 degrees. The lower throw angle (compared with the 45 degrees that is optimal on flat ground) is correct for throw-ins because the ball is released from above head height and human throwing mechanics are strongest at 30 to 35 degrees.

**Assisted throws to a teammate.** With assist, solve the first spec's lofted solver (5.3) for a flight time `T` that makes the ball arrive at 1.1 to 1.5 m (chest height) at the receiver's lead point, then clamp the resulting speed and elevation to the rows above; if the clamp changes the landing point by more than 1.5 m the throw simply falls short, as it would for a player who cannot reach that far.

### 6.4 Spin and error

- **Spin:** backspin of 2 to 6 rad/s from the wrist snap, plus sidespin of ±2 rad/s; the effect on the trajectory is negligible but it keeps the ball visually alive.
- **Direction error:** `σ_dir = 1.0 + 2.5·(1 - technique) + 3.0·p²` degrees, where p is the power fraction `m_c`. A maximum-power throw from an average player therefore scatters by about ±5 degrees, enough to miss a specific head at 35 m.
- **Power error:** `σ_v = 2% + 4%·p` of the throw speed.
- **Pressure and fatigue** raise both by up to 20%.

### 6.5 Foul throw detection (geometric checks at the release event)

Each is evaluated from the player's hitboxes and bones at the release event and in the 150 ms before:

| Check | Foul condition |
| --- | --- |
| Feet position | Either foot hitbox has no part on or outside the touchline, or is fully inside the pitch |
| Feet on the ground | Either foot is more than 2 cm above the turf at any frame from -150 ms to release |
| Over the head | Release point is more than 0.25 m in front of the head centre, or lower than the top of the head minus 0.05 m |
| Both hands | Hand release positions differ by more than 0.15 m or release times by more than 40 ms |
| Facing the field | Body yaw is more than 100 degrees from the inward normal |
| Location | Ball is thrown from more than 1.0 m from the exit point |
| Direction of the ball | Thrown ball does not enter the field, or enters it directly into the thrower's own or the opponent's goal without a touch (goal kick or corner awarded) |

The clip itself plays a legal motion, so a foul throw only happens when the foot position or the thrower's choice violates a check. For human players the default is to **soft-clamp** (the game moves the thrower to a legal spot) and flag a foul throw only in high-realism mode; the AI commits a foul throw only about 0.5% of the time through a position error (section 14).

### 6.6 Place, positions and play

- The throw-in spot is the point on the touchline closest to where the ball crossed it, snapped to the nearest 0.5 m; the AI taker moves to it before the clip (jog, no sprint).
- Opponents stay at least 2 m from the spot (the referee uses the same hitbox test for encroachment).
- The ball is in play as soon as it enters the field. The thrower cannot play it again until another player does, and offside does not apply to a throw-in.

## 7. Dribbling touches, first touch and body-ball contact

The ball is never collided with the movement capsule, only with limb hitboxes. A ball that slips between a player's legs without touching a shank or foot is simply past him.

### 7.1 Dribbling touches (leg and ball)

| Dribble mode | Touch rhythm | Stride (m) and cadence | Contact surface | Foot speed relative to the player (m/s) | Ball speed relative to the player (m/s) | Ball rolls ahead (m) |
| --- | --- | --- | --- | --- | --- | --- |
| Close control (jog or walk) | Every step, 0.25 to 0.35 s | 0.8 to 1.1 m, 3 to 4 steps/s | Inside, outside, sole (drag back) | 1 to 3 | 0.5 to 1.5 | 0.15 to 0.4 |
| Running with the ball | Every 2nd step, 0.5 to 0.7 s | 1.3 to 1.7 m, 2.5 to 3 steps/s | Laces and outside | 3 to 6 | 1.5 to 3.0 | 0.5 to 1.2 |
| Sprint knock-on | Every 3rd to 5th step, 0.9 to 1.3 s | 1.9 to 2.4 m, 4 steps/s | Laces, firm | 7 to 12 | 3.5 to 7 | 1.5 to 3.0 |

The touch is a normal foot-ball impact from section 3.2 with soft parameters: `λ_a` 0.3 to 0.6, `e_c` 0.25, `m_eff` 2 to 4 kg, contact at `h_b` of 0.5 to 2.0 cm for a rolling ball. The ball leaves at `v_player + Δv` along the foot's pushing direction; `Δv` is the second-to-last column above. Between touches rolling resistance acts (first spec 2.4), so the ball slows by about 1.0 to 2.5 m/s each second, and the player naturally catches it.

**Touch placement and error.** The intended ball position after the touch (the first spec's `touch_dist`) becomes a target contact point and foot speed; the error comes from the contact-point error `δ` (3.4) plus a stride-timing error of ±15 ms at sprint (a foot that arrives 15 ms early or late shifts the contact point by `v_foot · Δt`, up to 0.15 m). Under pressure, `σ_pos` grows and the ball escapes the control radius (0.6 to 0.9 m) more often, producing the heavy touch.

**Foot choice.** The touch uses the foot that is nearer to the ball at the next foot-strike, preferring the dominant foot unless the ball is on the other side by more than 0.25 m. Off-foot touches multiply σ\_pos by `1 + k_o` (about 1.4 for a one-footed player).

### 7.2 First touch and trapping (cushioning)

Receiving builds on the first spec's quality model (4.4): `q` between 0 and 1 from skill, speed, angle, height and pressure. The physical process is **retraction**: the body part moves away from the ball along its path to take the energy out.

```
v_app    = |v_ball_in| * (1 - 0.65 * q_retract)        // closing speed after the limb gives way
v_out_n  = e_part * v_app                              // what bounces back along the normal
v_ball   = v_player + (v_out_n * n) + tangential carry // plus the direction you want to push the ball
```

| Body part | Hitbox | Restitution e\_part | Effective mass when cushioning (kg) | Max retraction (m) | Height band (m) | Residual speed at q = 1 |
| --- | --- | --- | --- | --- | --- | --- |
| Foot (instep or inside) | Foot capsule | 0.15 | 1.5 | 0.25 | below 0.30 | 0 to 0.5 m/s |
| Thigh | Thigh capsule | 0.20 | 3.5 | 0.20 | 0.30 to 1.00 | 0.5 to 1.2 m/s |
| Chest | Trunk capsule | 0.15 | 8.0 | 0.15 | 1.00 to 1.40 | 0.5 to 1.5 m/s |
| Head (controlled, soft) | Head sphere | 0.25 | 3.0 | 0.12 | above 1.50 | 1 to 2 m/s |

The surface normal `n` is the direction from the contact point to the ball centre and depends on how the part is angled: a foot tilted toward a target (a directional first touch, first spec 4.4) produces a ball moving toward that target. Pass speed matters: balls over 25 m/s cannot be fully killed (the limb has only so much retraction), and the leftover speed bounces away, as in a real heavy first touch.

### 7.3 Heading (leg-free but body-critical)

```
v_out = [ (1 + e) * m_h * v_h  +  (m_b - e * m_h) * v_in_signed ] / (m_b + m_h)     // along the contact normal
// m_h = 4.5 kg relaxed, up to 8 kg braced (neck tension and trunk follow-through);  e = 0.40
// v_h = head speed from the neck and trunk swing, 2 to 5 m/s forward (up to 7 m/s for a full-body attacking header)
```

Example: a cross arriving at 20 m/s (`v_in_signed = -20`) met by a head moving at 4 m/s with `m_h = 6` gives `(1.4·6·4 + (0.43 − 2.4)(−20)) / 6.43 = 11.4 m/s` off the head, a modest header. A full attacking header (`m_h = 8`, `v_h = 7`) on the same cross gives about 16 m/s.

- **Jump and timing** follow the first spec (6.4): `v_y = √(2·g·h)`, head contact near the apex, timing window ±60 to ±100 ms, reach 2.4 to 2.9 m. The jump takes off 0.3 to 0.35 s before contact; the AI must start it by then.
- **Direction:** the head pitch is limited to ±30 degrees and yaw to ±45 degrees relative to the torso, plus torso rotation of ±35 degrees, so the player can redirect a cross by up to about 60 degrees; contact near the top of the ball sends it down (a downward header, the best shooting header).
- **Contact point:** the forehead is the front-upper part of the head sphere; contact on the top or side of the head halves `m_h` and sprays the ball with ±20 degrees of error.
- **No diving headers or acrobatic clips** are in the essential animation list; the contact is always made in the standing or jumping pose.

### 7.4 Handball detection geometry

The referee reads the arm and hand hitboxes (section 2.2) at the contact frame and scores the contact:

| Factor | Evidence for handball |
| --- | --- |
| Arm position | Arm raised above shoulder height, or held away from the body so the silhouette is enlarged (the arm's lateral offset beyond the trunk outline over 0.20 m) |
| Arm movement | The arm moves toward the ball at over 1.5 m/s |
| Distance of the ball source | Ball came from less than 2 m (a reaction time under 0.2 s), or after a deflection from the player's own body within 3 m: **less** likely to be penalised |
| Intent proxy | The player was jumping, sliding, blocking a shot with arms spread |
| Consequence | Goal directly after handball by the attacker: disallowed even if accidental |

```
handball_score = 0.9*enlarged_silhouette + 0.7*above_shoulder + 0.6*moves_to_ball - 0.8*short_reaction - 0.6*own_deflection - 0.5*blocked_ball_natural_position
handball = handball_score > 0.35
```

The keeper's own area handling is legal for the keeper only (section 10). Handball in the penalty area gives a penalty; about 4% of penalties come from handball, and a yellow card is shown if it stops a promising attack.

## 8. Tackles and player-to-player contact at leg level

The first spec decides when a tackle starts and who wins the ball. This section defines what physically happens between the legs: the contact event, the impulse each player receives, and the features the referee reads.

### 8.1 Contact event pipeline

While a tackle, charge or duel is active (the contest zone from section 2.3), every 240 Hz sub-step sweeps the active limb hitboxes against the ball and against the opponent's limb hitboxes. Every contact creates one record, kept for 2 s for the referee and the replay:

```ts
interface ContactEvent {
  t: number;                       // sim time at first contact
  a: PlayerId; partA: Part;        // e.g. foot, shank, thigh, shoulder, hand, head, torso
  b: PlayerId | 'ball'; partB: Part;
  point: Vec3; normal: Vec3;       // world contact point, normal from a to b
  vRelN: number;                   // closing speed along the normal (m/s)
  impulse: number;                 // N·s, from 8.2
  heightAboveGround: number;       // of the contact point on the victim (m)
  ballTouchedFirst: boolean;       // see 8.3
  soleNormal: Vec3;                // of the attacker's foot at contact
  bothFeetOff: boolean;            // attacker airborne with both feet
  approachAngle: number;           // angle between attacker approach and victim facing (deg)
}
```

### 8.2 Impulse between two limbs

```
μ_red = m_a_eff * m_b_eff / (m_a_eff + m_b_eff)
J     = (1 + e_b) * μ_red * v_rel_n                // e_b = 0.10 to 0.20 (soft tissue, shin guards)
```

Effective masses depend on what is behind the limb:

| Case | Effective mass (reference body, kg) | Why |
| --- | --- | --- |
| Foot poke (standing tackle) | 6.2 | foot + 0.8 shank + 0.3 thigh |
| Block tackle, planted foot | 9.1 | firm ankle and driving thigh |
| Slide tackle, lead leg, committed | 4.6 + 0.65·M ≈ 53 | the sliding body follows the leg |
| Slide tackle, mistimed (leg only) | 8 | little body behind it |
| Victim's planted leg | 20 | the body rests on that foot and resists |
| Victim's swinging or lifted leg | 4.6 | free-moving lower leg |
| Shoulder charge, each side | 0.5·M ≈ 37 | half body mass behind each shoulder |

**Worked examples**

| Contact | Closing speed | μ\_red | Impulse J (N·s) | Result |
| --- | --- | --- | --- | --- |
| Foot poke into the ball side of a planted leg | 4 m/s | 4.7 | 22 | Jostle only |
| Block tackle on a carrier's planted leg | 5 m/s | 6.3 | 36 | Light stumble chance |
| Slide tackle, 6.5 m/s, into a planted leg | 6.5 m/s | 14.5 | 108 | Fall |
| Slide tackle, 5 m/s, into a swinging leg | 5 m/s | 4.2 | 24 | Jostle, ball probably lost |
| Shoulder charge, 2 m/s closing, 75 kg each | 2 m/s | 18.7 | 43 | Stumble if balance is low |

Contact duration is 10 to 25 ms, so a 108 N·s impact is about 4 to 10 kN of peak force, a number to feed audio and hit-feedback, not to gate gameplay.

**Thresholds on J (scaled by the victim's balance and strength)**

| Impulse J (N·s) | Effect |
| --- | --- |
| Under 15 | Touch; no effect on movement |
| 15 to 40 | Jostle: speed -10% for 0.2 s, ball control radius -20% for the carrier |
| 40 to 80 | **Stumble** (0.3 to 0.6 s): lateral acceleration x0.4, cannot kick |
| 80 to 140 | **Fall** (0.6 to 1.0 s on the ground, then get-up 0.6 to 0.9 s) |
| Over 140 | Hard fall, injury roll (section 9) |

Thresholds scale by `0.7 + 0.6·balance·strength_factor` (between 0.7 and 1.3), by 0.7 if the victim's leg is planted and he is off-balance, and by 1.2 if he sees the contact coming (head up and facing the tackler).

**Velocity change on both players.** Along the contact normal, in the horizontal plane: `Δv_victim = k_t · J / M_victim` with `k_t = 0.6` for a planted victim and 1.0 for a free-moving one, and `Δv_attacker = −J / M_attacker`. A 108 N·s slide into a 75 kg player moves him about 0.9 m/s sideways, and the sliding tackler loses about 1.4 m/s of slide speed.

### 8.3 Ball-first versus player-first (the order test)

For each tackle the physics stores `t_ball` (first contact of the tackler's limb with the ball) and `t_player` (first contact with the opponent's limb or body).

| Order | Condition | Reading |
| --- | --- | --- |
| Ball first | t\_ball is more than 20 ms before t\_player, and the player contact is within 0.25 s of it | The tackle played the ball; any later contact is a follow-through |
| Simultaneous | The two times differ by 20 ms or less | Treated as ball-first for light contact (J under 40), as player-first for heavy contact |
| Player first | t\_player is more than 20 ms before t\_ball, or the ball was never touched | Foul if J over 15 or if the carrier was brought down |

The follow-through hitbox of the kicking or sliding leg stays active for 250 ms after ball contact; a reckless follow-through into the opponent after a clean ball contact is still penalised through the severity score.

### 8.4 Tackle geometry by type

| Type | Leg action | Foot path and height | Contact with the ball | Typical J on a carrier |
| --- | --- | --- | --- | --- |
| Standing poke | Hip flexion, knee extension toward the ball, support foot planted 0.3 to 0.5 m behind | Toe sweeps in at 0.04 to 0.12 m above the turf | Foot hitbox contacts the ball's near side; ball gets `ratio · v_foot` (about 1.2 to 1.35 × 4 to 7 m/s) | 10 to 30 |
| Block tackle | Foot planted with the inside facing the ball, shin vertical, body weight behind | Foot at 0.05 to 0.10 m, near-stationary | Ball hits a firm foot: restitution 0.40, m\_eff 9 kg, ball stops or pops up 0.3 m | 15 to 40 |
| Hook / toe-poke | Fully extended leg, ankle plantar-flexed | Toe at 0.03 to 0.08 m, reach 1.3 to 1.5 m from the hip | Toe-end contact, m\_eff 2.5 kg, ball moves 1 to 3 m/s in an erratic direction | 5 to 25 |
| Slide | Details in 8.5 | Lead foot 0.03 to 0.20 m above ground | Foot sweeps through the ball at slide speed | 25 to 120 |
| Shoulder charge | Torso leans into the opponent's shoulder, arms tucked | Torso contact at 1.2 to 1.5 m | Shields the ball, no direct ball contact | 20 to 60 |

### 8.5 Slide tackle in detail

| Time (s) | Phase | Body |
| --- | --- | --- |
| 0.00 to 0.12 | Initiation | Trailing leg drives, lead leg extends toward the ball; hip height drops from 0.92 m to 0.25 m in 0.15 s |
| 0.12 to 0.45 | **Active window** | Lead leg horizontal at 0.05 to 0.20 m; lead-foot hitbox is the "active leg sensor" (first spec 7.4); trailing leg bent with the knee near 0.20 m |
| 0.45 to 0.80 | Sliding | Whole body on its side or back, decelerating |
| 0.80 to 1.30 | Get-up | Back on feet; control returns after about 1.2 s |

- **Launch speed:** `v_slide = max(1.1·v_forward, 5.0)`, steering locked within ±10 degrees. Deceleration `a = μ_slide · g` with `μ_slide` of 0.45 dry and 0.30 wet, so distance `s = v²/(2·μ_slide·g)`: 7 m/s on dry turf gives 5.5 m (tune the gameplay slide to 2.0 to 2.8 m of effective reach by capping v\_slide at about 5.5 m/s for most players, as first spec 7.3 says).
- **Contact with the ball:** the lead foot moves at roughly 0.8 to 1.0 times the slide speed, `m_eff` 9 kg (leg locked), `e_c = 0.40`, ratio about 1.34, so a 6 m/s slide knocks the ball off at about 8 m/s. Direction follows the toe: pointing the toe 20 degrees sideways sends the ball 20 degrees sideways.
- **Slide tackle hitbox:** capsule laid down (1.9 m long, radius 0.2 m for the body), plus the lead-leg sensor. The body capsule contacts an opponent only if the leg sensor misses, producing a body-first collision.
- **Foul likelihood** is the severity score of 8.7; a slide that reaches the ball first with J under 40 is rarely penalised, while a slide from behind or a two-footed lunge is a card candidate.

### 8.6 Studs, height and two-footed contact

```
studs_factor   = clamp((dot(soleNormal, dirToVictimLeg) - 0.3) / 0.5, 0, 1)      // sole turned toward the opponent
height_factor  = 0.6 below 0.15 m (ankle, boot), 1.0 from 0.15 to 0.50 m (shin, the dangerous zone),
                 1.3 above 0.50 m (knee, thigh and higher)
two_foot       = bothFeetOff && closingSpeed > 3 m/s ? 1.6 : 1.0
from_behind    = approachAngle > 120 degrees ? 1.4 : 1.0
```

### 8.7 Severity score (replaces first doc 13.2's simple product)

```
J_norm   = J / 60                                   // 60 N·s is a hard but legal sliding contact
speed_f  = clamp(closingSpeed / 5, 0.5, 2.0)
severity = J_norm * speed_f * (0.4 + 0.6*studs_factor) * height_factor * two_foot * from_behind * order_f
// order_f = 1.0 player first, 0.5 ball first with J under 40, 0.8 ball first with a heavy follow-through
```

| Severity | Ruling | Typical contact |
| --- | --- | --- |
| Under 0.35 | No foul | Fair challenge |
| 0.35 to 0.8 | Foul, free kick | Late or clumsy challenge |
| 0.8 to 1.3 | Yellow card (reckless) | Hard late slide from the side, high contact |
| Over 1.3 | Red card (serious foul play) | Studs-up on the shin, two-footed lunge from behind |

The match leniency, advantage rule and professional-foul rule from the first doc (13.2, 13.3) modify the rulings after this score.

### 8.8 Shoulder charges, pushing, holding, elbows

| Contact | Detection | Ruling |
| --- | --- | --- |
| Legal shoulder charge | Both shoulder or upper-arm hitboxes touch, contact normal within 35 degrees of lateral, ball within 1.5 m of the charged player's feet and 1.0 m of the charger, arms tucked (arm speed under 1 m/s), both feet on the ground | Play on; impulse as in 8.2 |
| Push | Hand or forearm hitbox on the opponent's back or torso, arm extended over 70% of length, closing speed over 1.0 m/s, J over 25 N·s | Foul (direct free kick; penalty in the box) |
| Hold, pull | Hand-to-torso or hand-to-shirt contact sustained over 0.35 s while the opponent tries to move away (his speed under 60% of intent); over 0.6 s in the penalty area during a set piece | Foul; penalty if in the box |
| Elbow | Elbow above shoulder height with joint speed over 3 m/s and contact with the head or neck | Yellow or red depending on J |
| Charge from behind | Torso contact with approach angle over 120 degrees | Foul, yellow if J over 60 |

The first-spec momentum exchange and stumble rule (7.7) still apply to every non-limb contact.

## 9. Stumbles, falls, injuries and recovery

Only three body animations exist for this (stumble, fall, get-up), so the realism comes from the root motion, the control penalties and what happens to the ball and to nearby players.

### 9.1 Stumble

- **Trigger:** J between 40 and 80 N·s after balance scaling (section 8.2), or a heavy sprint collision from the first spec (7.7).
- **Duration:** 0.3 to 0.6 s, longer for low balance. Direction follows the horizontal impulse direction.
- **Control:** lateral acceleration x0.4, turn rate x0.5, cannot start a kick, tackle or sprint; a pass or shot already in the commit window (after plant) still completes with the error multiplied by 1.8.
- **Root motion:** the player keeps `v_new = v + Δv_victim` and then decays that velocity to the stick-demanded value at 6 m/s², so a stumbling sprinter travels another 1.0 to 2.0 m before regaining control.
- **Ball:** if the player has the ball within control radius, it is nudged by `0.5·Δv_victim` and the next touch error doubles, so a stumble often costs the ball without any extra rule.

### 9.2 Fall

| Quantity | Value |
| --- | --- |
| Trigger | J between 80 and 140 N·s after scaling, a slide tackle that clips the legs, or a heavy collision with a lowered balance |
| Phases | Fall animation 0.5 to 0.8 s, on the ground 0.1 to 0.4 s (longer if the referee is evaluating a foul), get-up 0.6 to 0.9 s |
| Total unavailable | 1.2 to 1.9 s |
| Root motion on the ground | Body slides with friction `μ_body = 0.6`, deceleration 5.9 m/s², so `s = v²/(2·5.9)`: 4 m/s gives 1.4 m, 6 m/s gives 3.0 m |
| Collision shape | Lying capsule, radius 0.25 m and length 1.8 m, orientation along the slide direction; replaces the standing capsule for separation and avoidance |
| Ball contact | The ball can hit the lying body (restitution 0.20 on the trunk, 0.30 on the legs) and deflect |
| Other players | Treat the lying player as an obstacle: steering avoidance radius 1.2 m; sprinting players hop-step is not animated, so path around it |

A player who falls can neither play the ball nor tackle, but can be fouled again only if still within the contest zone (the referee ignores contacts after 1.0 s unless it was a deliberate stamp, which is not modelled).

### 9.3 Injuries and forced substitutions

Injuries are a small, rare, deterministic-by-seed event layer, not a gameplay driver.

```
p_contact_injury = 0.01 + 0.04 * clamp((J - 80) / 60, 0, 1)         // only for J above 80 N·s, capped at 0.12 for J above 140
p_muscle_injury  = 0.00004 per sprint effort * (1 + 2.0 * fatigue)  // non-contact hamstring or calf event
```

- Over a match these give roughly 0.5 to 1 injury stoppages per match (add a 2% knock chance to every stumble to reach the upper end) (a player stays down for 45 to 90 s, using the fall pose plus a timer; no medical animations), of which about 10% (0.1 per team per match) require a forced substitution. This replaces the 0.03 figure in the first document's section 14.5; use 0.10 if you adopt this model.
- During a stoppage the referee stops play at the next dead ball or immediately if the injury is serious (head contact, J over 140); the lost time feeds stoppage-time logic (first doc 13.6).
- After a stoppage the player returns at 90% of attributes for 10 minutes (a small, honest cost of being hurt), or is replaced.

### 9.4 Simulation and diving (kept rare)

AI players do not fake injuries. A **fall without enough impulse** (J below 25 N·s) is allowed only for a low-probability "going down easily" trait (0.5% to 2% of light contacts, higher for players with low balance and high "theatrics"). The referee's chance of spotting it is `0.3 + 0.5·clarity`, where clarity is `(40 - J) / 40`, producing about 0.05 to 0.1 yellow cards for simulation per match. Human players never fall without cause.

## 10. Goalkeeper hands and keeper contacts

The keeper has the same skeleton as outfield players plus glove hitboxes (sphere radius 0.10 m, sweet spot at the palm centre) and different contact rules: the hands are legal inside his own penalty area, and a held ball is a kinematic attachment as in a throw-in.

### 10.1 Hand contact models

| Outcome | Hands and arms | Restitution e | Effective mass (kg) | What decides it |
| --- | --- | --- | --- | --- |
| Catch (two hands, body behind) | Both gloves within 0.30 m of the ball centre, palms facing the ball, body behind the ball line | 0.0 after retraction | 3.0 (hands, forearms) cushioning over 0.25 to 0.40 m | `handle_prob` (first spec 8.5) |
| Collect to chest | Forearms and chest form a cradle for low or rolling balls | 0.05 | 12 (arms + trunk) | Ball speed under 18 m/s and height under 0.8 m |
| Parry (open palm) | One or both palms, normal angled by the keeper | 0.30 to 0.50 | 3.5 | Palm normal angle sets the rebound direction (wide, up, or over the bar) |
| Punch (fist) | Fist sphere (0.06 m radius), arm extended, often one-handed | 0.55 | 6.0 (arm + shoulder) | Outgoing speed 15 to 22 m/s, direction 25 to 45 degrees up and away |
| Fingertip deflection | Fingertips only, contact normal off by 10 to 30 degrees | 0.60 | 0.8 | Ball path changed by 10 to 30 degrees, speed -15% (the "just got a finger to it" save) |
| Foot save | Foot hitbox, contact as in section 3 with `e_c 0.40` and `m_eff` 5 kg | 0.40 | 5.0 | Close-range shots at the legs |

### 10.2 Handling probability with physical inputs

The first spec's `handle_prob` (8.5) stays; the arguments are now measured at the contact frame:

```
sweet_offset   = distance(contactPoint, palmCentre) / 0.10          // 0 centred, 1 at the glove edge
body_behind    = clamp(dot(ballDirIn, -keeperFacing), 0, 1)           // body in line with the ball
base           = c0 + c1*handling - c2*ballSpeed - c3*sweet_offset - c4*|spin| - c5*wet + c6*heightComfort + c7*body_behind
```

| Ball speed at contact | Clean catch rate for a good keeper, well positioned | Poor keeper or badly positioned |
| --- | --- | --- |
| Under 12 m/s | 97% to 99% | 90% |
| 12 to 20 m/s | 88% to 95% | 70% to 80% |
| 20 to 28 m/s | 65% to 85% | 40% to 55% |
| Over 28 m/s | 40% to 65% | 15% to 30% |

Height comfort peaks between 0.5 and 1.6 m (centred chest and waist), dropping toward the low corner and the top corner, where the keeper must stretch. Spin over 40 rad/s lowers the catch rate by about 10 points (the ball moves in the hand), and a wet ball lowers it by another 8 to 15 points. Outcomes that are not a catch go to the parry, fumble or deflection branches in the first spec (8.5), with the geometry above setting the direction.

### 10.3 Dives and body contacts

- The dive motion is a ballistic capsule (first spec 8.4). During the dive the keeper's body is a lying capsule (1.9 m by 0.25 m radius) and collides with the turf like a sliding player (friction 0.6, so a dive lands and slides 1 to 2 m).
- **Keeper vs attacker contact:** J is computed as in 8.2 with a keeper effective mass of 0.65·M for a dive into a leg, and the referee severity score applies. A keeper who takes the man after missing the ball is penalised (penalty if in the box); a keeper who plays the ball first and then collides gets the benefit of order\_f = 0.5.
- **Obstruction:** an attacker standing in the six-yard box with J on the keeper over 25 N·s and no contact with the ball in the previous 0.5 s is penalised, so keepers are not flattened on crosses (the first spec's crowd model already uses this).
- **Aerial challenge:** the keeper's reach is 2.9 to 3.3 m with hands; his hands also win ball height (`heightComfort`) in a duel. A keeper is allowed to jump with one knee raised at the attacker (a legal "shielding" pose) but not to push.

### 10.4 Holding and release

- A caught ball is attached to the midpoint of the glove hitboxes for the carry time. The keeper may hold it for up to 6 s (the first doc's rule); a second hold after releasing it to the ground and picking it up again is not allowed (indirect free kick).
- **Throw (overarm):** release at 2.0 to 2.3 m above ground, speed 15 to 20 m/s, elevation 15 to 30 degrees, error `σ_dir = 1.5 + 2.0·(1 − accuracy) degrees`; **bowl (underarm roll):** release at 0.25 m, speed 8 to 14 m/s along the ground with slight topspin; **side-arm throw:** release at 1.5 m, speed 12 to 18 m/s, elevation 8 to 15 degrees.
- **Kicks** use the section 3 model: a goal kick from the ground (`h_b` 3.5 to 5 cm, elevation 22 to 38 degrees), a drop-kick or half-volley punt (ball dropped from 1.0 to 1.2 m, contact within 0.05 s of the bounce, `h_b` 3 cm, `v_f` of 17 to 24 m/s, giving 25 to 35 m/s), or a full volley punt (contact at 0.3 to 0.6 m, relative velocity from the falling ball adds to the foot speed).

### 10.5 Back-pass and handling rules

The physics tags the last touch of the ball with `{player, part, deliberate}`. A teammate's **deliberate kick with a foot** (a pass action, not a deflection or a headed or chest-controlled ball), or a throw-in taken directly to the keeper, makes the keeper's hand contact a violation (indirect free kick from the spot of the contact, inside the box if applicable). The `deliberate` flag is set by the action request that caused the kick, so a mishit pass that clearly was not meant for the keeper is still treated as deliberate only if the kick was a pass action with a teammate as the target.

## 11. Ball vs officials, flags, posts, boards, nets; dropped ball

### 11.1 World collision objects

| Object | Shape and size | Restitution | Friction | Notes |
| --- | --- | --- | --- | --- |
| Referee | Capsule, radius 0.25 m, height 1.75 m, mass 80 kg | 0.30 | 0.40 | Kinematic (not pushed); contact logged as an official touch (11.2) |
| Assistant referees (2) | Capsule, radius 0.22 m, height 1.75 m, standing 1 m outside the touchline | 0.30 | 0.40 | Only relevant when the ball is already out |
| Goal posts | Vertical capsules, radius 0.06 m (12 cm diameter), height 2.44 m, 7.32 m apart inside | 0.55 to 0.70 | 0.30 | Steel or aluminium; ball centre to axis distance of 0.17 m or less means contact |
| Crossbar | Horizontal capsule, radius 0.06 m, length 7.32 m, centre at 2.44 m | 0.55 to 0.70 | 0.30 | Gives the "ping" |
| Goal frame back | Sloped plane from (0.9 m behind the line, 2.44 m high) to (2.0 m behind the line, 0 m high), plus side planes | 0.05 | 0.9 | Net mode box in the first spec (2.6) |
| Corner flag | Capsule, radius 0.016 m, height 1.5 m, spring-return base | 0.30 | 0.30 | The ball stays in play if it touches the flag and remains in the field |
| Advertising boards (continuous ring) | Box, height 0.90 m, thickness 0.10 m, 3.5 m behind the touchlines and 4.5 m behind the goal lines | 0.55 | 0.50 | The ball is already out of play on contact; see 11.5 |
| Floodlight and camera masts | Not modelled (outside the ring) | n/a | n/a | n/a |

Posts, crossbar and boards use the world-contact rules from the first spec (2.5) with the foot-style friction solve from section 3.2 (infinite mass), so spin changes on a post hit exactly as it would from a boot: a curled ball that hits the inside of a post can spin into the goal.

### 11.2 Ball hits the referee: physics and event

The ball vs referee collision is a plain capsule contact (restitution 0.30, effective referee mass 25 kg for the leg-torso region, friction 0.4), so a 20 m/s ball loses about 70% of its normal speed and deflects off the body. The referee is kinematic and does not move from the impact, but the AI referee tries to avoid such contacts (section 12.1) by predicting the ball path.

Each contact creates an `OfficialTouch` record: time, ball speed before and after, deflection angle, which team had possession, and the context needed for the consequence check below.

### 11.3 Consequence check (when is it a dropped ball?)

Play continues after the ball hits an official unless one of these three conditions holds within 1.5 s of the contact:

| Condition | Test | Result |
| --- | --- | --- |
| A team gains possession | Before the touch team A controlled or was passing the ball, and after it team B makes the first controlled touch with no touch by A in between | Dropped ball |
| A promising attack starts | After the touch, team B controls the ball and either its xT gain over the deflection point exceeds 0.02 or at least 2 of its players are ahead of the ball in the attacking half with no defender between them and goal, or the carrier is running into the final third with space | Dropped ball |
| The ball goes into the goal | The ball enters either goal directly after the contact (no other player touched it) | Dropped ball (not a goal) |

If none holds, play simply continues (the commonest case). Evaluation uses the same xT and pitch-control grids as the AI, so the decision is explainable and deterministic. The referee blows the whistle at the moment the condition becomes true, not at the touch.

### 11.4 The dropped ball procedure

1. **Position and recipient.** If play was stopped (or the last touch happened) inside a penalty area, the ball is dropped for that area's goalkeeper. Otherwise the ball is dropped for one player of the team that last touched it at the position of the last touch. A drop that would fall inside a goal area is moved to the goal area line parallel to the goal line, at the nearest point to where the ball was.
2. **Spacing.** All other players of both teams stay at least 4 m from the ball until it is in play. The AI retreats to 4.5 m over 2 to 3 s at jog speed; the referee blows the whistle once players are in place and drops the ball.
3. **Drop physics.** The referee holds the ball at 1.2 m above ground with zero velocity and releases it. With restitution 0.57 the first bounce reaches `0.57² × 1.2 = 0.39 m`, a gentle rise that gives the recipient a clean first touch. The ball is in play as soon as it touches the ground.
4. **Taker behaviour.** The recipient plays a safe pass or a backpass to a free teammate; a direct shot at goal is allowed but rare (the AI weight for "shoot" is reduced by 60% on a dropped ball).
5. **Special rule.** If a dropped ball enters the goal without touching at least two players, the restart is a goal kick or a corner for the team the ball would have gone in against.

### 11.5 Boards, runoff area, replacement ball

- When the whole ball crosses a touchline or goal line it is out of play (swept test from the first spec 6.5). It then continues with ordinary physics until it stops or the restart is ready, and bounces off the boards (restitution 0.55, friction 0.5). A ball above 0.90 m + 0.11 m flies over the boards and lands on the runoff turf (restitution 0.50, rolling resistance 3 m/s²).
- To avoid chasing balls, the game uses a **replacement ball**: 3 to 6 s after the whistle (or sooner if a quick restart is possible and the AI taker is ready) the old ball is faded out and a new one placed at the restart spot. No ball-boy animation is needed. In a quick throw-in or free kick the player can restart with the new ball immediately if it is in place.
- The boards bear only the text "PRO LEAGUE AFRICA", so there are no sponsor surfaces to collide with, and no stands or crowd to hit.

### 11.6 Posts, bar and net refinements

- **Contact classification for replay and goal-line check:** record `post_hit`, `bar_hit`, and `line_cross` (ball centre beyond the line plus r) with the swept test; a ball that hits the post and spins across the line is a goal when its entire volume has passed.
- **Net:** a hit on the net deflects visually (Verlet grid) but gameplay uses the sloped plane and side planes with drag ×6 to 10, so the ball settles in the goal within about 0.5 s and the keeper can pick it up.
- **Ball behind the goal:** if a ball is inside the goal and goes out through the back or top of the net, treat it as having passed through the net and keep it inside (the collision box is closed on all sides).
- **Corner flag:** knocked by a ball over 3 m/s, the flag bends 15 degrees and returns with damping, with 0.3 restitution and no stop in play.

## 12. Referee physics, positioning and decision geometry

The referee and assistants are real agents in the world with a body, a view and limited speed. That is what makes their decisions believable: a referee who is 40 m away or has a player in his line of sight sometimes misses a foul.

### 12.1 Referee movement and positioning

| Quantity | Value |
| --- | --- |
| Speeds | Jog 3.0 m/s, run 5.0 m/s, sprint 7.0 m/s; acceleration 3.5 m/s²; braking 6 m/s² |
| Distance covered | About 10 to 11 km per match, mostly jogging |
| Preferred distance from the ball | 12 to 25 m (target 18 m) |
| Diagonal system | The referee stays inside a 12 m band around the corner-to-corner diagonal chosen so that play lies between him and the nearer assistant |
| Depth | 0 to 6 m behind the ball relative to the attacking direction (slightly behind play), so he sees fouls on the carrier and runners ahead |

```
target = ball.p + lateral_offset(side_of_diagonal) * 18  - attack_dir * clamp(3 + 0.08*ball_speed, 0, 6)
target = clamp_to_diagonal_band(target, 12)
target = keep_clear_of(target, ball_path_2s, 2.0)          // hazard avoidance
```

**Hazard avoidance.** The referee evaluates the ball path for the next 2 s (the same prediction the AI uses) and the running lanes of nearby players; if the predicted ball path or a sprinting player passes within 2 m of his position, he side-steps up to 3 m laterally at 3 m/s (no extra animation: the jog direction changes). This cuts accidental ball-referee contacts to about 0.5 to 1.5 per match, the real frequency, of which a small fraction cause a dropped ball.

### 12.2 What the referee can see (decision geometry)

For each contact event (section 8) the referee evaluates observation before ruling:

```
distance_f   = d <= 15 ? 1.0 : exp(-(d - 15) / 40)                  // d = eye to contact point
occlusion    = fraction of 5 rays (from eye at 1.65 m to the contact point and four points around it) blocked by player capsules
angle_f      = 0.6 + 0.4 * |sin(view_angle)|                       // side-on views see contact better than head-on ones
P_observe    = 0.95 * distance_f * (1 - 0.35 * occlusion) * angle_f
```

- A foul that is **not observed** is not whistled (the commonest source of missed fouls). If it is observed, the severity score from 8.7 is used with the match leniency.
- **Mis-ruling:** 3% to 6% of clear decisions go the wrong way (a foul awarded when the ball was won, or a missed foul), higher at long distance or high occlusion. Over 1,000 matches the total fouls and cards must still fit the first doc's targets (section 3.1), so the calibration adjusts the thresholds, not the error rate.
- **Whistle latency:** 0.3 to 0.6 s after the contact. AI players keep playing until the whistle plus their own reaction (0.2 to 0.4 s), a source of the "keep playing after the foul" behaviour.

### 12.3 Assistants and offside geometry

The assistants stand level with the second-last defender (the offside line) by moving along the touchline at up to 6.5 m/s with a lag of 0.3 s, or with the ball if the ball is nearer the goal line than the last defender. Offside is judged from the kick-time snapshot (first spec 9):

```
snapshot_time  = time of the passer's foot contact (the contact event from section 3)
perceived_gap  = true_gap + N(0, σ_ar)
σ_ar           = 0.05 + 0.003 * distance_to_players      // parallax and the human flash-lag; 0.05 to 0.15 m in practice
offside        = playable_body_part_ahead && perceived_gap > 0 && involved_in_play
```

A 0.3 to 0.6 s flag delay lets the attacker finish the action before the offside is raised; a goal scored in the interval is disallowed and the play stopped at the next restart. Offside gives an indirect free kick at the position of the offending attacker when the ball was played.

### 12.4 Restarts: spots, distances and encroachment

| Restart | Spot | Minimum distance of opponents | Referee checks |
| --- | --- | --- | --- |
| Free kick (direct or indirect) | Where the foul happened; the ball is moved to within 0.5 m of the spot | 9.15 m from the ball, or on the goal line between the posts if closer | Ball stationary; wall encroachment at the kick |
| Penalty | 11 m from the goal line, centre | Players outside the area and the arc (9.15 m from the spot); keeper on the line | Keeper off the line or encroachment: retake or no goal |
| Corner | Corner arc, ball inside the 1 m quarter-circle | 9.15 m | Ball within the arc; flag not moved |
| Throw-in | Nearest touchline point | 2 m | Section 6.5 foul throw checks |
| Goal kick | Anywhere in the goal area | Opponents outside the penalty area until the ball is in play | Ball leaves the area |
| Dropped ball | Section 11.4 | 4 m | Section 11.4 |
| Kick-off | Centre spot | 9.15 m from the ball, own half | Ball moves forward at the touch |

**Encroachment** is detected by the same limb hitbox positions at the moment of the kick, with 0.3 m tolerance; a defender within 9.15 m minus tolerance at a free kick is told to retreat before the kick is allowed (the referee holds the whistle up to 8 s), and repeated encroachment draws a yellow card. Other restarts use the same logic.

### 12.5 Dead-ball physics

- The ball is **in play** (physics only) until the whistle; after a stop it keeps rolling physically but cannot be played by anyone until the restart (the AI keeps position, the human player's actions are limited to walking).
- A stationary restart ball is **placed** (set to rest on the turf with zero velocity and spin, at the spot), never carried, so a free kick starts from a perfectly still ball with `h_b` available as in section 4.
- The referee does not blow for a restart until the taker is ready or 8 s have passed (a time-wasting limit; a taker who delays beyond 12 s draws a yellow card on repeat).

### 12.6 Match styles and consistency

Each referee profile (strict, balanced, lenient) shifts the foul threshold by -0.1, 0 or +0.2 and the advantage frequency by ±15%. A profile is chosen per match from the seed and stays constant, so a match feels consistent, while different matches have different referees. The referee's yellow-card count is nudged toward the league average over the second half (if he has shown none by minute 60 the threshold is 10% lower), because real referees also try to keep control.

## 13. Pitch surface, ball deformation and weather

### 13.1 Surface presets

All values extend the first spec's ground model (2.4). A pitch is a preset plus per-match random variation.

| Surface | Bounce restitution e | Ball-turf friction μ | Rolling resistance (constant, m/s²) | Rolling resistance (viscous, 1/s) | Foot slide μ (tackles) | Player slip risk |
| --- | --- | --- | --- | --- | --- | --- |
| Dry, well kept grass | 0.60 | 0.50 | 1.5 | 0.15 | 0.45 | Low |
| Wet grass (rain, dew) | 0.55 | 0.30 | 1.0 | 0.10 | 0.30 | Medium |
| Heavy, muddy or worn | 0.40 | 0.55 | 3.5 | 0.30 | 0.40 | High |
| Hard, dry, bare patches | 0.68 | 0.45 | 1.0 | 0.10 | 0.55 | Low |
| Artificial turf | 0.70 | 0.50 | 1.2 | 0.12 | 0.60 | Low |

(The constant rolling term is the game-tuned value, higher than the roughly 0.5 to 1 m/s² of real grass, as in the first spec.)

**Speed-dependent bounce.** Restitution falls with vertical impact speed because the ball and the grass both compress: `e = clamp(e0 - 0.006·(|v_y| - 3), 0.35, e0)` for impact speeds above 3 m/s, so a 12 m/s dive onto the turf rebounds at about 0.9 e0 (0.55 instead of 0.60 on dry grass). Below 0.8 m/s the first spec sets e to 0 and the ball starts to roll.

**Unevenness.** The ground normal is perturbed by seeded smooth noise (correlation length 1.5 m) of amplitude 0.4 degrees on well kept grass up to 2.0 degrees on a heavy pitch. A bounce at that point deflects by up to twice the perturbation, giving the slight, random change of direction and the occasional awkward hop that real pitches produce. Goalmouths and the centre circle can have a patchy variant (+0.5 degrees). The noise is a function of position and the match seed only, so replays are identical.

**Skid, grip and roll.** The first spec's friction impulse already produces skids and checks. Add the transition rule: when the contact slip speed falls below 0.1 m/s the ball is rolling without slipping and uses the rolling resistance terms; if slip rises again (a new kick or a bump) the Coulomb friction branch takes over.

### 13.2 Ball properties (per-match variation)

| Property | Reference | Per-match variation |
| --- | --- | --- |
| Radius | 0.110 m (circumference about 69 cm) | ±1% |
| Mass | 0.43 kg | ±3% |
| Inflation | Standard | Affects restitution ±0.02 and drag coefficient ±0.02 |
| Surface (new ball, worn ball) | Smooth, new | A used ball has μ lower by 0.03; ball changes between periods are not modelled |

**Visual contact squash (optional, replays only).** During the 8 to 12 ms of a foot contact the ball compresses by up to 3.5 cm at 30 m/s. Draw this as a scale of 0.92 along the contact normal for 2 to 3 frames of the 240 Hz sub-steps in slow-motion replays; it does not affect the physics.

### 13.3 Weather and altitude

- **Air density:** drag and Magnus both scale with `ρ`. `ρ = 1.225 · exp(-h / 8434) · (288 / T)` with `h` altitude in metres and `T` temperature in Kelvin. Sea level (15 °C) gives 1.225 kg/m³, Nairobi or Johannesburg (about 1,750 m) about 1.0 kg/m³ (drag and curl about 19% weaker, so shots carry a little farther and curl a little less), Addis Ababa (2,355 m) about 0.93 kg/m³. Keep this as a venue parameter, default 1.225.
- **Wind:** a steady component of 0 to 8 m/s plus gusts from an Ornstein-Uhlenbeck process (time constant 3 s, sigma 1.5 m/s). Use the ball's velocity relative to the air, `v_air = v − wind`, in the drag and Magnus terms. A 5 m/s headwind on a 30 m/s lofted ball shortens the range by about 5% to 8%; a crosswind drifts a high cross by 1 to 3 m. The effect is deterministic from the match seed.
- **Rain:** wetness ramps from 0 to 1 over 3 minutes of rain and decays over 8 minutes after it stops; the surface interpolates between dry and wet presets by that wetness, and the ball gets `wet_ball` in the keeper's handling formula (section 10.2).
- **Slip on a wet or heavy pitch:** each plant step at a sharp turn has `p_slip = 0.003 · (1 + 3·wetness) · turn_sharpness`, where turn\_sharpness is 0 for straight running and 1 for a 90 degree cut at speed; a slip triggers a stumble (section 9.1) and a bad kick if it happens during the plant.
- **Heat and fatigue:** above 28 °C the stamina drain is multiplied by up to 1.15 and the AI lowers its sprint budget accordingly.

### 13.4 Line markings and in/out

Lines are 12 cm wide and belong to the area they bound. The ball is out only when its whole volume is over the whole line, using the swept test; equivalently the centre is beyond the outer edge of the line by `r` (so the centre has to travel `0.06 + 0.11 = 0.17 m` past the line centre). The goal-line check uses the same logic with the inner edges of the posts.

## 14. How the AI and referee AI use these details

The AI document's decisions (what to pass, who to tackle) now connect to the physical model through a small set of interfaces, so AI players can neither do anything a human cannot nor ignore consequences the referee will see.

### 14.1 AI strike planning (inverse of the kick model)

The AI picks an intent such as "low driven shot to the far post at 28 m/s". The executor converts that to physical parameters with **lookup tables built offline** by running the impulse solver (3.2) over a grid: `h_b` from 0 to 6.5 cm, lateral offset ±6 cm, foot speed 4 to 26 m/s, foot path elevation 0 to 55 degrees, and storing the resulting ball speed, elevation, direction and spin. At runtime the AI interpolates to find the contact point and foot speed that give the requested launch, then adds the contact-point error of section 3.4.

- **Shots:** the target elevation is the middle of the window in section 4.3 for the shot distance (with 0.5 to 1.5 degrees added for drag). If the player's `σ_pos` makes the window wider than his scatter, he shoots; if not, he may choose a lower-risk action in the utility step, which is why long shots are rare for poor shooters.
- **Passes and crosses:** the ballistic or ground solver (first spec 5.2 and 5.3) gives speed and elevation; the AI converts them with the table into `v_f` and `h_b`, then clamps to the strike's feasible region (4.1).
- **Feasibility check:** if a request needs a `v_f` above the player's maximum or a `h_b` above 6.5 cm for a resting ball, the planner returns the nearest feasible launch and the utility score uses the reduced success probability.

### 14.2 AI tackle timing and contact prediction

```
t_contact  = predicted time the foot sensor can reach the ball (interception solver, first spec 7.8)
start_time = t_contact - T_windup - 0.5 * T_active
J_pred     = (1 + e_b) * μ_red * closing_speed_pred            // from 8.2 with predicted speeds
sev_pred   = severity from 8.7 using predicted approach angle, height and sole direction
if sev_pred > aggression_limit and not last_man_in_box: abort
```

- **Aggression limit:** 0.5 for cautious defenders, 0.8 for aggressive, 1.0 only for a last-man emergency; it drops by 0.15 for a defender on a yellow card and by 0.3 for one in his own penalty area, so most ill-advised slides never start.
- **Timing error:** the contact prediction is noisy with standard deviation 20 to 60 ms depending on anticipation and pressure, which makes poorly timed lunges in the player's attributes, not in a dice roll.
- **Choice of leg:** the nearer leg to the ball in the carrier's frame is used, unless that would swing it across the carrier's planted leg.

### 14.3 AI throw-ins

The AI emits the same stick-equivalent inputs that a human would: a deflection value for power and an angle. The executor applies section 6.2 and 6.4, so AI and human throws have the same range and error. Decision rules:

- The target comes from the utility choice (AI doc 12.3). Long throws (`v` over 18 m/s) are chosen only by specialists within 30 m of the opponent goal line, when box occupancy is at least 3 attackers.
- The taker waits 1.5 to 4 s (shorter when quick restarts are valuable), faces the field, and avoids a throw whose lane is blocked (lane model from AI doc 7.3).
- A foul throw happens by position error only (0.5% of throws).

### 14.4 AI contact awareness

- Approach paths are chosen so the contact is side-on or front-on rather than from behind, because the predicted severity includes the `from_behind` factor.
- Shoulder challenges are attempted only when the legal conditions of 8.8 are predicted (ball within playing distance, arms tucked), otherwise the defender jockeys.
- A lying player is treated as an obstacle (9.2) and a stumbling player is not tackled while stumbling unless the ball is exposed (a fair tackle would be foul if the J threshold is passed).
- **Gamesmanship (optional trait):** an aggressive or experienced player adds up to 20% to his foul probability for off-the-ball contact when `P_observe` of the referee (12.2) is below 0.5, producing the real pattern of fouls behind the referee's back.

### 14.5 Keepers and set-piece takers

- The keeper predicts `handle_prob` (10.2) for each save option: if the catch probability is below 0.55 he chooses a parry directed wide or over the bar; with an attacker within 1.5 m of the ball at the catch point he punches; for low rolling shots under 18 m/s he collects with the cradle.
- Set-piece takers choose `h_b`, foot speed and `φ` from the strike library (4.2): inswinger corners use a curl strike with `φ` 25 to 35 degrees toward the near post; outswingers use the opposite sweep; direct free kicks use the finesse strike with the aim solver from the first spec.

### 14.6 Referee AI as a consumer

- The referee reads `ContactEvent` and `OfficialTouch` records (8.1, 11.2), applies `P_observe` (12.2) and the severity bands (8.7), and consults the AI's xT and pitch-control grids for advantage and for the dropped-ball consequence check (11.3).
- It publishes `Ruling` events (foul, card, advantage, offside, dropped ball, restart type and spot) to the match director, which then drives the restart routines of AI doc section 12 for both teams.
- Referee decisions are logged with the evidence (ids, distances, severity components) in the decision log of AI doc 18.3, so any controversial ruling can be replayed and understood.

### 14.7 Interface summary

| AI decision | Physics module | Referee event it can cause |
| --- | --- | --- |
| Pass, shot, cross, clear | Section 3 impact, section 4 strike table | Offside snapshot, handball (after a deflection), keeper handling |
| Dribble touch, skill move | Section 7.1 touch | Foul if a challenge follows |
| Tackle, slide, shoulder charge | Section 8 contact | Foul, card, penalty, injury |
| Throw-in | Section 6 | Foul throw, restart |
| Keeper save, punch, throw | Section 10 | Back-pass violation, handling outside the box |
| Referee positioning | Section 12.1 | Ball-referee contact and possible dropped ball |

## 15. Camera architecture and shared math

The camera is a **visual-only** system. It reads the interpolated render state of the ball, players and officials, never writes to the simulation, and can therefore use ordinary floating-point math and per-device tuning without affecting determinism or replays. The code below assumes Babylon.js, as in your scope notes, with a right-handed scene (`scene.useRightHandedSystem = true`) so axes match the physics spec (X across the pitch, Y up, Z along the pitch).

### 15.1 Components

| Component | Job |
| --- | --- |
| `CameraMode` (one per view) | Given the current context, returns a **desired pose**: position, look-at point and horizontal field of view |
| `CameraDirector` | Chooses the active mode (player choice plus automatic overrides for set pieces, goals and replays), blends between modes, applies final smoothing and clamping, and writes to the Babylon camera |
| `FocusModel` | Builds the **interest set** (what must stay in frame) and the smoothed focus point and required width |
| `FrameGuard` | Safety checks after the pose is set: ball inside the safe frame, camera above the boards, focus inside the pitch margins |
| `InputFrame` | Provides the camera-relative basis that converts stick input to world direction (section 17) |

### 15.2 Camera setup (Babylon.js)

```ts
import { Scene, UniversalCamera, Vector3, Camera } from '@babylonjs/core';

scene.useRightHandedSystem = true;                       // match the physics axes
const cam = new UniversalCamera('main', new Vector3(62, 20, 0), scene);
cam.inputs.clear();                                       // no default keyboard/mouse control
cam.fovMode = Camera.FOVMODE_HORIZONTAL_FIXED;            // consistent pitch width on every aspect ratio
cam.minZ = 0.5; cam.maxZ = 400;                           // tight depth range for precision
scene.activeCamera = cam;
```

Horizontal-fixed field of view matters on phones: a 19.5:9 screen is much wider than a tablet, so a vertical-fixed FOV would show far more pitch on a phone; fixing the horizontal FOV keeps the framing identical.

### 15.3 The interest set and the focus model

Every render frame (after interpolating the sim state with the accumulator alpha) the focus model computes a weighted centroid and a bounding extent along the pitch:

| Element | Weight in the focus point | Included in the extent |
| --- | --- | --- |
| Ball (interpolated, plus look-ahead) | 1.00 | Yes |
| Controlled player | 0.60 | Yes |
| Pass target (while a pass is in flight) | 0.50 | Yes |
| Nearest 2 opponents to the ball | 0.20 each | Yes |
| Keeper (when the ball is within 30 m of his goal) | 0.30 | Yes |
| Predicted landing point of a lofted ball | 0.00 to 0.80, ramped in over the last 0.8 s of flight | Yes |

```
lead         = clamp(v_ball_xz * 0.35, magnitude <= 10 m)          // look-ahead along the ball's motion
focus_raw    = Σ w_i * p_i / Σ w_i       (p_ball = ball + lead)
extent       = max_i(p_i.z) - min_i(p_i.z)  (also along x for cameras that need it) + padding 8 m
width_need   = clamp(W_base + k_v*|v_ball_xz| + k_s*extent, W_min, W_max)    // half-width the camera must show
```

### 15.4 Smoothing: critically damped spring

Camera motion must be smooth but never lag far behind the ball. Use a critically damped spring on the focus (not directly on the camera pose), which has no overshoot and a predictable time constant of about `2 / ω` seconds.

```ts
// Scalar critically damped smoothing (no allocation; keep one velocity per axis)
function smoothDamp(cur: number, target: number, vel: {v: number}, omega: number, dt: number): number {
  const x = omega * dt;
  const e = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = cur - target;
  const temp = (vel.v + omega * change) * dt;
  vel.v = (vel.v - omega * temp) * e;
  return target + (change + temp) * e;
}
```

| Quantity | Typical ω (rad/s) | Meaning |
| --- | --- | --- |
| Pan along the pitch (Z) | 3.5 (TV 2.2) | Covers about 60% of a step in 0.55 s and 86% in about 1.0 s (TV: 60% in 0.9 s, 86% in 1.6 s) |
| Pan across the pitch (X) | 2.5 | Slower, because lateral changes are small |
| Zoom (field of view) | 1.8 | Zoom changes feel gentle |
| Height, tilt | 2.0 | Changes mostly during set pieces |
| Dead zone | ±2.5 m around the smoothed focus (±1.5 m on the low cameras) | The focus ignores small ball wiggles |

**Speed limits:** the focus may move at most 38 m/s (a driven ball can be faster; the look-ahead and the extent then keep it in frame). **Event snaps:** after a restart the focus moves to the new spot with ω raised to 6 for 0.6 s, so the camera does not drag across the pitch.

### 15.5 Required width to field of view

For a camera at distance `D` from the focus plane (the distance along the viewing axis to the focus point) the horizontal FOV that shows a half-width `W` is

```
fovH = 2 * atan(W / D)
```

and the director clamps `fovH` between each mode's minimum and maximum. For a vertical offset `s` of the subject (used for thumb zones, section 17) the tilt is lowered by `atan(s · tan(fovV / 2))` where `fovV = 2·atan(tan(fovH / 2) / aspect)`.

### 15.6 Director loop and blending

```ts
class CameraDirector {
  update(dt: number, ctx: RenderContext) {
    const mode = this.pickMode(ctx);                  // user mode, then overrides (set piece, goal, replay)
    const want = mode.compute(ctx, this.focus);       // desired pose { pos, look, fovH }
    if (mode !== this.active) this.startBlend(mode);  // blend time 0.6 to 1.2 s, smoothstep
    const pose = this.blend.apply(this.prevPose, want, dt);
    this.frameGuard.fix(pose, ctx);                   // safe frame, boards, pitch margin
    this.cam.position.copyFrom(pose.pos);             // reuse vectors: no per-frame allocation
    this.cam.setTarget(pose.look);
    this.cam.fov = pose.fovH;                         // horizontal FOV in radians (FOVMODE_HORIZONTAL_FIXED)
    this.prevPose = pose;
  }
}
```

- **Blending:** interpolate position and look-at point separately with a smoothstep over the blend time, and the field of view in log space (so a zoom looks even). Large yaw changes (over 90 degrees between modes) blend through the look direction with a spherical interpolation to avoid the camera swinging through the pitch.
- **Never cut mid-play unless the player asked** for a mode change. Automatic overrides (set pieces and replays) always blend, never cut, except the hard cut into and out of a replay.
- **Per-frame cost:** under 0.1 ms. The director allocates nothing at runtime; every vector is pre-allocated and copied.

## 16. Camera modes: TV, sideline, ball, goal-to-goal, top-down, set-piece, replay

All positions are in pitch coordinates (centre spot at the origin; touchlines at x = ±34; goal lines at z = ±52.5; boards 3.5 m behind the touchlines and 4.5 m behind the goal lines). `attackSign` is +1 when the user's team attacks toward +Z, -1 otherwise, and flips at half-time. `W` is the half-width of pitch that must stay in frame, from section 15.3.

### 16.1 Mode summary

| Mode | Camera position | Look-at point | Horizontal FOV | Tracking | Best for |
| --- | --- | --- | --- | --- | --- |
| Side-to-side (classic, dolly) | x = +48, y = 22, z follows the focus | (−2 + 0.25·ball.x, 0, focus.z) | 44° to 61° (W 22 to 32) | Full dolly (the camera slides along the pitch, no yaw) | Precise play, passing and tackling on phones |
| TV broadcast (pivot) | x = +62, y = 20, z = 0.35 × focus.z | (−3 + 0.30·ball.x, 0.5, focus.z) | 30° to 53° (W 18 to 34) | Mostly pivots from near the centre line, so it pans and zooms like a real broadcast camera | Cinematic watch-mode and a more realistic feel |
| Sideline (low tele) | x = +41, y = 6, z follows the focus | (lerp(−6, ball.x, 0.4), 0.9, focus.z) | 33° to 52° (W 13 to 22) | Full dolly | Crosses, lobs, speed and height; close-up of duels |
| Ball (chase) | ball.xz − attackDir·11, y = 5.5 + 0.4·ballHeight | ball + attackDir·6 | 65° to 75° | Always behind the ball along the attack axis | Dribbling and fast play; less overview |
| Goal-to-goal (end-to-end) | z = focus.z − attackSign·20, y = 12, x = 0.5·focus.x (clamp ±14) | (0.7·focus.x, 0.5, focus.z + attackSign·16) | 62° to 74° | Tied to the user's attack direction | Seeing depth, passing lanes and the goal ahead |
| Top-down tactical | x = focus.x, y = W / tan(fovH / 2), z = focus.z | The focus point, looking straight down (tilted 85°) | 50° | Smooth follow | Tactics, replays, mini-map |

### 16.2 Side-to-side and TV in detail

**Side-to-side (classic dolly).** The camera is always perpendicular to the touchline, so input directions are the same everywhere on the pitch and the geometry never skews (the most predictable view). Keep `z_cam = focus.z`. It looks slightly down (about 24 degrees) so that both the near and far touchlines fit with the ball and teammates. Vertical field of view covers the whole pitch width (68 m) when W is 32.

**TV broadcast (pivot).** The camera sits farther back and higher, mostly near the halfway line, and the lens zooms: tight on the action, wide for goal kicks and transitions. It uses a **partial dolly** (`z_cam = 0.35·focus.z`) so that the camera is not directly above the same line all the time and the ends of the pitch are not too skewed; yaw then reaches about ±35 degrees at the goal lines. It has a slower spring (ω 2.2) and a little more look-ahead to feel like an operator tracking the ball. The TV mode also owns the following **auto-zoom rules**:

- Ball within 25 m of a goal line: W grows to at least 28 so the keeper, the box and the goal stay together.
- Goal kick, throw-in and kick-off: W 30 to 34 for shape; a corner or free kick near the box: W 16 to 20 around the box.
- Fast counter (ball speed over 18 m/s for over 1 s): W 30, so the break is visible.

**Safe frame for aerial balls (all side cameras).** Project the ball into normalised screen coordinates each frame; if its vertical coordinate goes above 0.72 (near the top edge) or its extent is cut by the screen edge, raise the look-at height by up to 3 m and add up to 6 m to W with a 0.4 s ramp, so lofted passes and high crosses stay visible without constantly tilting.

### 16.3 Sideline, ball and goal-to-goal in detail

- **Sideline (low tele).** A long, low view from just behind the near boards (above them: y = 6 so the 0.9 m boards never block). Dolly with the focus, a narrower field of view, and a shallow tilt of about 8 degrees. Use `farSideBias`: the look-at x moves toward the far touchline by 0.4·(ball.x − (−6)) so a ball on the far wing stays visible. The camera drops a little (y −1.5) while the ball is on the ground and rises with an aerial ball.
- **Ball (chase).** The camera sits behind the ball on the line `ballXZ − yawDir·11`, where `yawDir` is the **attack axis** blended with the ball's direction of travel only when the ball moves faster than 8 m/s: `yawTarget = slerp(attackAxis, ballDir, 0.3)`. Yaw rate is limited to 45°/s, with 0.6 s hysteresis before accepting a turn of more than 120 degrees (so quick back passes do not whip the camera). It never rolls, and the horizon stays level. Height rises by `0.4·ballHeight` so lobs remain in view; the field of view widens to 75° when the ball is above 5 m.
- **Goal-to-goal.** The camera is anchored to the user's attacking direction (not to who has the ball), so it never flips on a turnover; at half-time the attack direction flips and the camera blends 180 degrees (a 1.5 s swing during the half-time pause). The lateral position follows the ball at 50% (clamped ±14 m) so wide balls are in frame while the goal ahead is always visible. Stand-off distance shortens from 20 m to 15 m as the ball nears the opposing penalty area, and the field of view tightens by 6 degrees so the box looks large.
- **Two-player local mode:** goal-to-goal and ball cams are disabled (one user would face the wrong way); only side-to-side, TV, sideline and top-down are offered.

### 16.4 Top-down tactical

`y = W / tan(fovH / 2)`: with fovH 50 degrees, W 28 m gives about 60 m of height and W 56 m (the whole 105 m length plus margins) about 120 m. Look straight down with an 85 degree tilt (never exactly 90, to keep a stable up vector and avoid gimbal flips); orient the screen so the pitch long axis is horizontal. Use perspective rather than orthographic: it keeps player height readable. Camera `maxZ` of 400 covers this.

### 16.5 Automatic set-piece cameras (blend 0.8 s in, hold, then blend back)

| Situation | Position | Look-at | FOV | Duration and exit |
| --- | --- | --- | --- | --- |
| Direct free kick (shot range) | 7.5 m behind the ball on the line to the goal centre, 0.8 m to the right, y = 2.6 | Goal centre (0, 1.2, goal line) | 55° | Until 0.8 s after the kick, then the ball cam for 2 s, then the user's mode |
| Penalty | 6 m behind the spot on the line to goal, y = 2.2 | Goal centre (y = 1.2) | 50° | After the kick, cut to a behind-goal camera (3.0 m behind the goal line inside the boards, y = 1.5, looking at the spot) for 1.5 s to show the save or net ripple |
| Corner | 8 m behind the taker, outside the pitch, y = 4.0 | Penalty spot, y = 1.0 | 58° | After delivery, a tele box cam (side-on, W 14 around the box) until play leaves the box |
| Goal kick, throw-in, kick-off | User's mode | n/a | W 30 to 34 | No special camera; wide framing only |
| Wide free kick (cross range) | Behind the taker as the corner, 8 m back | Box centre | 58° | After delivery as for corners |

Auto set-piece cameras can be turned off in settings, in which case the user's mode just applies the auto-zoom rules.

### 16.6 Goal feedback and replays (no celebration animation)

A goal gets weight from the net ripple, a **GOAL** overlay, a short replay and a brief pause before kick-off (scope notes). Camera behaviour:

1. **0 to 1.5 s:** hold the user's mode on the ball in the net (zoom in a little, W −4), net ripple visible; the scoring team stays at normal speed (no celebration clip).
2. **1.5 to about 12 s:** replay. Record a **ring buffer of render states** at 30 Hz for the last 12 s: for each of the 22 players and the ball, position, yaw, locomotion blend parameters and action state (about 8 floats per player, so 22·8·30·12 ≈ 63,000 floats or 250 KB). Play back with Hermite interpolation to the display rate, at 0.5× speed for the key moment. Rendering uses the same models; no resimulation is needed.
3. **Replay camera sequence (picked by the event):** goal: (a) behind-goal low camera tracking the shot (x = lerp(shooter.x, 0, 0.3), y = 1.6, z = goal line + 6 m outward... kept inside the ring at 3.5 m if possible) for the last 3 s of the move, (b) side-on tele (the TV mode at W 16, 0.5×). Red card or penalty: side-on tele, then a close look at the contact point from the sideline camera. Near miss (post or bar): one tele angle.
4. **Skip:** any button cuts the replay. A hard cut goes in and out, and the user's mode returns with the focus snapped to the restart spot (ω 6 for 0.6 s).
5. **Pause before kick-off:** about 3 s with the players walking back to their positions; the director holds the wide TV framing so the pitch is read at a glance.

## 17. Camera input mapping, mobile and performance

### 17.1 Camera-relative input

The stick vector `s = (s_x, s_y)` (after the dead zone and curve from section 5.1) becomes a world direction through the camera's **input frame**: a ground-plane forward vector `f` and right vector `r = f × up`.

```
world_dir = normalize( s_x * r + s_y * f )          // y component is zero
```

| Camera | Forward `f` (ground) | Right `r` | Result |
| --- | --- | --- | --- |
| Side-to-side, TV, sideline (camera on the +X side) | (−1, 0, 0) | (0, 0, −1) | Stick up moves toward the far touchline, stick right moves toward −Z |
| Goal-to-goal (attacking toward `attackSign`) | (0, 0, attackSign) | (−attackSign, 0, 0) | Stick up always moves toward the opponent goal; right is the user's right |
| Ball and player chase | Current smoothed yaw direction | `f × up` | Yaw smoothed over 0.25 s so the controls do not wobble |
| Top-down | Screen up as the long axis, attack direction up for the user | Perpendicular | As goal-to-goal |

**Fixed input frame for side cameras.** The TV camera pans and yaws about ±35 degrees, but the input frame stays at the base direction in the table. If the controls rotated with the pivot, a straight run would feel as if it veered. The same holds for the sideline camera. Only the chase cameras use the live yaw.

**Heading-hold rule.** Whenever the input frame changes by more than 20 degrees within 0.4 s (a mode switch, the half-time flip, a chase camera swinging), the player keeps the *world* direction he was already running in until the stick is released or moved more than 15 degrees from the held direction. That prevents the "camera turned and I ran the wrong way" experience.

**Mirroring when sides switch.** At half-time, the attack direction flips; the input frame of goal-to-goal and top-down flips with it so that "up" is still toward the opponent's goal. Side cameras keep a fixed frame; the pitch is simply mirrored on screen by the teams swapping ends.

### 17.2 Settings exposed to the user

| Setting | Options | Effect |
| --- | --- | --- |
| Default camera | Side-to-side, TV, sideline, ball, goal-to-goal, top-down | Used during open play |
| Auto set-piece cameras | On, Off | Section 16.5 |
| Zoom | -15% to +15% on `W` | Scales the required half-width |
| Smoothness | 0.7 to 1.3 on every ω | Lower is floatier, higher is tighter |
| Reduce motion | On, Off | ω ×0.6, no blends faster than 1.2 s, no zoom changes in play |
| Replay length | Short (6 s), Standard (10 s), Off | Section 16.6 |
| Look-ahead | 0%, 50%, 100% | Scales the 0.35 s look-ahead |

### 17.3 Mobile specifics

- **Orientation and FOV:** landscape only; horizontal-fixed field of view (section 15.2), so a 19.5:9 phone and a 4:3 tablet show the same pitch width.
- **Thumb zones:** the stick sits bottom-left and the buttons bottom-right, covering about 25% of the screen height on each side. Shift the subject up by 6% of the half-height (section 15.5) so the ball and the controlled player are not under a thumb.
- **Safe areas:** read the device safe-area insets and keep the scoreboard, the on-screen controls and the offside or power indicators inside them.
- **Resolution and LOD:** on mid-range phones render at 1.25 to 1.5 hardware scaling. Choose the animation level of detail by projected player height: 120 px or more, full skeleton and IK; 60 to 120 px, reduced IK and 30 Hz skeleton; under 60 px, 15 Hz skeleton and no foot IK. The TV camera usually keeps most players in the middle band; the ball, the controlled player and the nearest opponent always get the top level.
- **Shadows and lighting:** one directional light with shadows only for the ball and the 6 nearest players; the rest use blob decals. Floodlights are emissive meshes only.
- **No camera shake.** The scope notes call for restraint: no shake on shots, tackles or goals. A post hit may optionally give a 20 ms, 1 cm tremor, off by default and off in reduce-motion mode.

### 17.4 Performance budget for the camera

| Item | Budget |
| --- | --- |
| Focus model, blending and clamping | 0.05 to 0.1 ms per frame |
| Projection and safe-frame test (1 ball point) | 0.01 ms |
| Replay recorder (30 Hz, 22 players + ball) | 0.05 ms per recorded frame, 250 KB memory |
| Allocations per frame | 0 (pre-allocated vectors) |

Use one Babylon camera for the whole match and change its pose; creating and switching between several cameras costs more than it saves. Replays reuse the same camera and the same director.

### 17.5 Camera debug tools

- **Interest set overlay:** draw each element with its weight, the weighted focus point, the dead zone ring and the required width as a rectangle on the pitch.
- **Safe-frame overlay:** the 0.72 vertical limit and the horizontal margins in screen space.
- **Camera trail:** the last 5 s of the camera path, for diagnosing jerky pans.
- **Live tuning panel:** every number in section 16.1 (offsets, ω, W limits, FOV limits) editable at runtime and exportable to JSON, so camera feel can be tuned on a real phone without rebuilding.
- **Mode hot-keys** (desktop builds): 1 to 6 for the six modes, R for the last replay.

## 18. Player attribute system (0 to 100) and server-side data model

Every physical and technical behaviour in this document is driven by per-player attributes on a 1 to 100 scale. The physics never reads "magic numbers" for a player: it reads **resolved parameters** produced by passing attributes through server-supplied curves. A player with better acceleration literally reaches top speed sooner; one with better dribbling literally changes direction faster with the ball.

### 18.1 What the numbers mean

| Attribute value | Reads as | Rough real-world equivalent |
| --- | --- | --- |
| 1 to 25 | Weak | Untrained amateur, or a goalkeeper's feet |
| 26 to 45 | Below professional | Semi-professional or lower-league weakness |
| 46 to 60 | Professional baseline | A lower-division regular, or a top-flight player's weakest area |
| 61 to 75 | Solid top-flight | A typical starter in a good league |
| 76 to 88 | Star | A standout in the league |
| 89 to 100 | World-class | One of the best in the world at this skill |

Use `a = attribute / 100` in formulas. Curves are monotonic, so more is always better, but they are shaped so the 60 to 99 range (where real professionals live) has a visible effect on feel. Most professional starters have 60 to 85 in their key attributes and 30 to 55 in the ones that do not suit their role (a centre-back's dribbling, a striker's tackling).

### 18.2 The attribute list

| Group | Attributes |
| --- | --- |
| Physical | Sprint speed, Acceleration, Agility, Balance, Strength, Stamina, Jumping |
| Technical (ball) | Dribbling, Ball control (first touch), Short passing, Long passing, Crossing, Finishing, Shot power, Long shots, Volleys, Curve (finesse), Free-kick accuracy, Penalties, Heading accuracy |
| Defensive | Standing tackle, Slide tackle, Interceptions, Marking, Aggression |
| Mental | Vision, Composure, Reactions, Attacking positioning, Defensive positioning, Anticipation, Decisions, Work rate |
| Foot and body | Weak foot (1 to 100), preferred foot, height (cm), weight (kg) |
| Goalkeeper only | Reflexes, Diving, Handling, Kicking, Throwing, Passing (distribution), Positioning, One-on-ones, Command of area, Aerial reach, Penalty saving, Sweeping speed, Goalkeeper height (section 21) |
| Traits (flags) | Long throw, Power header, Speed dribbler, Playmaker, Tactical fouler, Theatrics, and others; each flips specific constants rather than adding a number |

Composites used by earlier documents (the AI doc's `technique`, `decision_skill`, `awareness`) are defined here:

```
technique_shot  = 0.65 * Finishing + 0.35 * Composure          // longshots use Long shots in place of Finishing from outside 20 m
technique_pass  = 0.75 * Short passing (or Long passing above 25 m) + 0.25 * Vision
technique_cross = 0.80 * Crossing + 0.20 * Curve
technique_volley= 0.60 * Volleys + 0.25 * Finishing + 0.15 * Balance
awareness       = 0.5 * Anticipation + 0.3 * Vision + 0.2 * Decisions
decision_skill  = 0.6 * Decisions + 0.4 * Composure
```

### 18.3 From attribute to physical parameter (default curves)

Each row shows the formula and the resolved value at attributes 20, 50, 75 and 99. Formulas are the defaults; the server may replace any curve with piecewise-linear anchors (18.5).

| Attribute | Resolved parameter | Formula | At 20 | At 50 | At 75 | At 99 |
| --- | --- | --- | --- | --- | --- | --- |
| Sprint speed | Top speed v\_top (m/s) | 7.6 + 2.7·a | 8.14 (29.3 km/h) | 8.95 (32.2) | 9.63 (34.7) | 10.27 (37.0) |
| Acceleration | Time constant τ (s) | 1.55 − 0.75·a | 1.40 | 1.175 | 0.99 | 0.81 |
| Acceleration | Traction cap a\_cap (m/s²) | 5.5 + 4.0·a | 6.3 | 7.5 | 8.5 | 9.5 |
| Acceleration (with matching sprint speed) | Time for 0 to 10 m (s) | integrated from the model in 19.1 | 2.37 | 2.10 | 1.89 | 1.71 |
| Agility | Lean limit φ\_max | 30° + 12°·a | 32.4° | 36.0° | 39.0° | 41.9° |
| Agility | Lateral acceleration limit A\_LAT, dry (m/s²) | g·tan(min(φ\_max, atan μ\_boot)) | 6.2 | 7.1 | 7.9 | 8.8 |
| Agility and Dribbling | Plant delay before a direction change T\_plant (s) | 0.18 − 0.10·m (m = agility alone, or the mean of agility and dribbling with the ball) | 0.16 | 0.13 | 0.105 | 0.081 |
| Dribbling | Carry speed factor | 0.80 + 0.18·a^0.8 | 0.85 | 0.90 | 0.94 | 0.98 |
| Dribbling | With-ball lateral factor λ | 0.60 + 0.45·a^0.9 | 0.71 | 0.84 | 0.95 | 1.05 |
| Ball control | First-touch base quality q | 0.30 + 0.65·a^0.9 | 0.45 | 0.65 | 0.80 | 0.94 |
| Ball control | Control radius (m) | 0.55 + 0.40·a | 0.63 | 0.75 | 0.85 | 0.95 |
| Shot power | Max foot speed, laces (m/s); ball speed at ratio 1.42 | 16 + 9·a^0.9 | 18.1 (25.7 m/s) | 20.8 (29.5) | 22.9 (32.5) | 24.9 (35.4) |
| Finishing (technique\_shot) | Contact-point σ\_pos (m) | 0.0045 + 0.030·(1 − a)^1.5 | 0.026 | 0.015 | 0.0083 | 0.0045 |
| Finishing (same row) | Launch scatter, asin(σ/0.155) | derived | 9.7° | 5.6° | 3.1° | 1.7° |
| Jumping | Standing jump height (m) | 0.35 + 0.35·a | 0.42 | 0.525 | 0.61 | 0.70 |
| Standing tackle | Wind-up (s) / active window (s) / timing σ (ms) | 0.15 − 0.10a / 0.10 + 0.15a / 60 − 40a | 0.13 / 0.13 / 52 | 0.10 / 0.175 / 40 | 0.075 / 0.21 / 30 | 0.051 / 0.25 / 20 |
| Reactions | Reaction time (s) | 0.30 − 0.17·a | 0.27 | 0.215 | 0.17 | 0.13 |
| Stamina | Match distance (km) / drain multiplier / sprint reserve W′ (m above 7 m/s) | 9.0 + 3.0a / 1.35 − 0.6a / 120 + 260a | 9.6 / 1.23 / 172 | 10.5 / 1.05 / 250 | 11.25 / 0.90 / 315 | 11.97 / 0.76 / 377 |
| Strength | Effective mass factor / shield force factor / stumble threshold scale | 0.90 + 0.20a / 0.5 + a / 0.7 + 0.6a | 0.94 / 0.7 / 0.82 | 1.0 / 1.0 / 1.0 | 1.05 / 1.25 / 1.15 | 1.10 / 1.49 / 1.29 |
| Vision | Number of pass candidates / blind-side passes | 3 + round(5a) / allowed above 70 | 4 / no | 6 / no | 7 / yes | 8 / yes |
| Composure | Pressure sensitivity multiplier on error | 1.0 − 0.6·a | 0.88 | 0.70 | 0.55 | 0.41 |
| Aggression | P(win) needed to attempt a tackle | 0.65 − 0.30·a | 0.59 | 0.50 | 0.43 | 0.35 |
| Weak foot | Off-foot error multiplier | 1 + 0.9·(1 − a) | 1.72 | 1.45 | 1.23 | 1.01 |

`μ_boot` is the boot-turf grip: 1.1 on dry grass, 0.8 on wet, 0.7 on heavy or muddy, 1.0 on artificial (section 13.1). So the same agility yields a lower A\_LAT on a wet pitch; for a player with φ\_max of 41.9° the dry limit is 8.8 m/s² and the wet limit `g·tan(38.7°)` is 7.9 m/s².

A set of **global scale knobs**, also server-side, multiplies resolved values for the arcade-to-realistic slider: `paceScale` (default 1.0, arcade up to 1.4 per the first spec), `agilityScale`, `ballSpeedScale` (keep 1.0), `staminaScale`, `errorScale`.

### 18.4 In-match modifiers on attributes

```
attr_eff = clamp( attr * (1 + form + confidence - 0.20*fatigue_skill), 1, 100 )   // skill attributes
// form and confidence each ±0.04 at most; fatigue_skill 0..1 after the first hour
// physical attributes (speed, acceleration) change through the stamina model (speed floor 85%), not through attr_eff
```

Injured players returning from a stoppage carry a −10% on all attributes for 10 minutes (section 9.3). Substitutes enter with fatigue 0.

### 18.5 Server-side data model

Attributes, curves and archetype defaults live on the backend and are **frozen into a snapshot at kick-off**: the client fetches the roster for the fixture, receives the snapshot with a hash, and uses only that snapshot for the whole match. That keeps the match deterministic and replay-safe, and means curves can be retuned without a client release.

```ts
interface PlayerProfile {
  id: string; name: string; position: 'GK'|'CB'|'FB'|'DM'|'CM'|'AM'|'W'|'ST';
  heightCm: number; weightKg: number; preferredFoot: 'L'|'R'; weakFoot: number;       // weakFoot 1..100
  attributes: {
    sprintSpeed: number; acceleration: number; agility: number; balance: number; strength: number; stamina: number; jumping: number;
    dribbling: number; ballControl: number; shortPassing: number; longPassing: number; crossing: number; finishing: number;
    shotPower: number; longShots: number; volleys: number; curve: number; freeKickAccuracy: number; penalties: number; headingAccuracy: number;
    standingTackle: number; slideTackle: number; interceptions: number; marking: number; aggression: number;
    vision: number; composure: number; reactions: number; attackPositioning: number; defendPositioning: number;
    anticipation: number; decisions: number; workRate: number;
  };
  gk?: GoalkeeperAttributes;                                                           // section 21
  traits: string[];
}

interface CurveSet {
  version: string;
  // piecewise-linear anchors: [attribute, value] pairs, attribute ascending from 1 to 100
  curves: { [name: string]: Array<[number, number]> };       // e.g. topSpeed: [[1,7.6],[50,8.95],[100,10.3]]
  scales: { paceScale: number; agilityScale: number; staminaScale: number; errorScale: number };
}

function resolve(curve: Array<[number, number]>, attr: number): number {
  const x = Math.min(100, Math.max(1, attr));
  for (let i = 1; i < curve.length; i++) {
    if (x <= curve[i][0]) {
      const [x0, y0] = curve[i - 1], [x1, y1] = curve[i];
      return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
    }
  }
  return curve[curve.length - 1][1];
}
```

**Server rules**

- **Validation:** integers 1 to 100; height 160 to 205 cm; weight 55 to 100 kg and within ±25% of a height-based expectation; goalkeepers' outfield attributes capped at 55 and outfielders' goalkeeper attributes ignored.
- **Anti-abuse (online modes):** a per-position budget on the weighted sum of attributes (for example, an outfielder's `sprintSpeed + acceleration + agility + dribbling` may not exceed 360 unless the card is flagged elite), so a custom player cannot have 99 in everything.
- **Versioning:** `CurveSet.version` and a hash of the roster go into every match record and replay. Matches always resolve against the snapshot version they started with.
- **Defaults:** if the server is unreachable, the client falls back to the bundled default curves and the archetype set in section 22, so offline play works.
- **Telemetry:** the match record stores each player's resolved top speed, acceleration time and shot scatter, so balance changes can be analysed after release.

## 19. Locomotion and body mechanics: acceleration, speed, direction change, dribbling, sway, falling, rising

This section replaces the first spec's fixed locomotion constants (3.1) with attribute-driven ones, and describes how a human body actually runs, turns, sways, falls and gets up. Everything here uses the resolved parameters from section 18.3.

### 19.1 Speed and acceleration model

Along the direction of travel the speed follows a first-order approach to top speed with a traction cap, so a player explodes off the mark and then eases into top speed, exactly like a sprinter:

```
v_top   = (7.6 + 2.7*a_sprint) * paceScale                  // m/s, attribute 1..100 to a = 0..1
τ       = 1.55 - 0.75*a_accel                               // s: smaller means reaching top speed sooner
a_cap   = 5.5 + 4.0*a_accel                                 // m/s²: grip-limited start
dv/dt   = min( a_cap, (v_top_eff - v) / τ )                 // each 60 Hz tick, then limited by the traction circle (19.4)
v_top_eff = v_top * speedFactor(mode, ball, stamina)        // ball: dribbling carry factor, 19.3; stamina floor 85%
```

So **acceleration decides how fast the player reaches his top speed, and sprint speed decides what that top speed is**. The time to reach 90% of top speed is `τ · ln(10)`: 3.2 s for acceleration 20, 2.7 s for 50, 2.3 s for 75 and 1.9 s for 99.

| Player (sprint / acceleration) | v\_top (km/h) | 5 m (s) | 10 m (s) | 20 m (s) | 30 m (s) | Reads as |
| --- | --- | --- | --- | --- | --- | --- |
| 50 / 50 | 32.2 | 1.37 | 2.10 | 3.34 | 4.50 | Lower-division regular |
| 75 / 75 | 34.7 | 1.23 | 1.89 | 3.03 | 4.10 | Quick top-flight player |
| 99 / 99 | 37.0 | 1.12 | 1.71 | 2.76 | 3.76 | World-class sprinter |
| 99 / 30 (big striker) | 37.0 | 1.34 | 2.02 | 3.16 | 4.21 | Slow off the mark, fast once going |
| 60 / 90 (small, quick-off-the-mark) | 33.2 | 1.20 | 1.86 | 3.03 | 4.13 | Wins the first 10 m, caught after 25 m |

Both the fast starter and the fast finisher exist, as in real football. The **speed modes** keep their proportions: walk 2.0 m/s, jog 3.5·(v\_top/8.95), run 6.0·(v\_top/8.95), sprint `v_top`. A player at attribute 99 therefore jogs about 15% faster than a player at 50.

### 19.2 Braking and stopping

```
a_brake = 8.0 + 5.0 * (0.6*a_agility + 0.4*a_balance)      // m/s²; 8 to 13
stop_distance = v² / (2 * a_brake)
```

At 8 m/s the stopping distance is 4.0 m for a player with the lowest braking (8 m/s²), about 3.0 m at the middle of the range (10.5 m/s²) and 2.5 m at the top (13 m/s²). Braking is limited by the same traction circle, so a player who brakes while turning stops later.

### 19.3 Dribbling: what it changes (the explicit rules)

| Effect with the ball | How dribbling enters | Value at 30 | At 60 | At 90 |
| --- | --- | --- | --- | --- |
| Top speed with the ball | `v_top · (0.80 + 0.18·a^0.8)` | 0.87 of v\_top | 0.91 | 0.97 |
| Lateral grip with the ball (λ) | `0.60 + 0.45·a^0.9` | 0.75 | 0.88 | 1.01 |
| Plant delay before a cut (s) | `0.18 − 0.10·mean(agility, dribbling)` | see 19.4 |  |  |
| Touch distance multiplier | `1.2 − 0.4·a` (first spec 4.2) | 1.08 | 0.96 | 0.84 |
| Touch error σ\_pos (m) | section 18.3 formula on Ball control |  |  |  |
| Control radius (m) | `0.55 + 0.40·ball_control` |  |  |  |
| Skill-move success | `sigmoid(3·(dribbling − defender_tackling)/100 + …)` per first spec 7.5 |  |  |  |

So a high-dribbling player carries the ball at nearly full speed, keeps the ball closer, and **changes direction faster with the ball than a weak dribbler can without it being a trick**; in the extreme (agility 90, dribbling 90) the with-ball lateral grip is as good as running without the ball.

### 19.4 Changing direction: the physics of a cut

Direction change is limited by friction between boot and turf. A runner who leans by an angle φ can push sideways with at most `g·tan(φ)`, and φ cannot exceed what the grip allows, `atan(μ_boot)`:

```
φ_max   = (30° + 12°·a_agility)                              // body-lean limit
A_LAT   = g * tan( min(φ_max, atan(μ_boot)) ) * agilityScale  // m/s²; dry 6.2 to 8.8, wet less
A_LAT_ball = A_LAT * λ(dribbling)                             // λ from 19.3, applies only while in possession
A_LONG  = a_cap for acceleration, a_brake for braking
// traction circle (first spec 3.1): scale = 1 / max(1, sqrt((a_long/A_LONG)² + (a_lat/A_LAT_x)²))
```

Steady curved running at speed `v` needs `a_lat = v·ω`, so the maximum turn rate is `ω_max = A_LAT / v` (not the first spec's `ω0/(1 + 0.15·v)`, which this replaces): at 8 m/s with `A_LAT` 8.8 the turn rate is 63°/s; at 4 m/s it is 126°/s; below about 1.5 m/s the cap is the stand-still turn rate (720°/s).

**A sharp cut (heading change over 35°)** has two phases:

1. **Plant (T\_plant):** the outside foot lands and the body keeps travelling, only braking lightly. `T_plant = 0.18 − 0.10·m` seconds where `m` is agility alone without the ball, and the mean of agility and dribbling with it. This is the delay the human feels between a stick push and the player starting to turn.
2. **Turn and push:** the velocity vector rotates and shrinks to the exit speed. `v_out = v_in · (0.85 − 0.5·Δθ/180°)`, and the velocity change `Δv = sqrt(v_in² + v_out² − 2·v_in·v_out·cos Δθ)` is applied at `A_cut = 1.1 · A_LAT_x` (the push-off from a planted foot is stronger than steady-state lean). Total time `t_cut = T_plant + Δv / A_cut`.

**A 90 degree cut at 6 m/s (exit speed 3.6 m/s, Δv 7.0 m/s) on a dry pitch, with the ball unless noted:**

| Agility | Dribbling | T\_plant (s) | A\_cut (m/s²) | Time for the cut (s) |
| --- | --- | --- | --- | --- |
| 50 | 50 (no ball) | 0.13 | 7.8 | 1.02 |
| 90 | 90 (no ball) | 0.09 | 9.3 | 0.84 |
| 50 | 30 | 0.14 | 5.9 | 1.33 |
| 50 | 50 | 0.13 | 6.6 | 1.19 |
| 50 | 90 | 0.11 | 7.9 | 1.00 |
| 90 | 30 | 0.12 | 7.0 | 1.12 |
| 90 | 90 | 0.09 | 9.4 | 0.84 |

So, at the same agility, going from dribbling 30 to dribbling 90 cuts a 90-degree change of direction from 1.33 s to 1.00 s (25% faster) and the dribbler leaves with more speed; on a wet pitch (μ\_boot 0.8) every `A_cut` falls by about 8% for the high-agility player. The user feels this directly: a quick dribbler's player responds to a hard stick flick almost immediately and exits the turn fast.

### 19.5 Body lean, sway and feints

- **Forward lean while accelerating:** `θ_lean = atan(a_long / g)`, so a start at 8 m/s² leans the trunk about 39 degrees forward, easing to about 10 degrees upright at top speed. Animation blends the lean from this value (no extra clips).
- **Lateral lean in turns:** `φ = atan(a_lat / g)` up to φ\_max. The lean vector points to the inside of the turn and is visible to defenders.
- **Sway (body feint):** a lateral shift of the centre of mass of 0.15 to 0.25 m over about 0.12 s, then a push the other way. It uses the same blend as a normal weight shift (no feint clip). Success against a defender:

```
feint_amp    = sway_amplitude (0..1) * dribbling                 // dribbling 0..1
read         = anticipation_defender * (1 - 0.5 * defender_committed)
P(fooled)    = sigmoid(6 * (feint_amp - read))                   // defender commits to the wrong side
```

A fooled defender has the reaction delay and the commit time added (0.15 to 0.30 s), which opens the gap for the cut in 19.4. AI defenders read the lean vector with the delay of their `reactions` attribute, and they cannot read anything faster than that.

- **Reading intent:** defenders and referees see the hip orientation and lean of a player 0.10 to 0.20 s before the velocity vector changes, so a player with low reactions is beaten by sharp cuts.

### 19.6 Gait: stride, contact time, footfalls

Footfalls matter for dribbling touches, plant-foot position and IK.

```
stride_length(v) = 0.62 + 0.20*v - 0.0045*v²                  // metres (scaled by H / 1.8)
stride_freq(v)   = v / stride_length(v)
contact_time(v)  = max(0.09, 0.30 - 0.020*v)                  // seconds on the ground per step
```

| Speed (m/s) | Stride (m) | Frequency (steps/s) | Ground contact (s) | Flight phase (s) |
| --- | --- | --- | --- | --- |
| 3.5 (jog) | 1.27 | 2.76 | 0.23 | none (walking and jogging have double support) |
| 6.0 (run) | 1.66 | 3.61 | 0.18 | 0.10 |
| 8.0 (fast) | 1.93 | 4.14 | 0.14 | 0.10 |
| 10.0 (sprint) | 2.17 | 4.61 | 0.10 | 0.12 |

The locomotion phase advances at `stride_freq/2` cycles per second (one cycle is two steps), and playback speed of the run animation is set to that phase rate so feet do not slide (first spec 3.5). A kick or touch is only requested on the correct foot at the correct phase: the next footfall for the touch in section 7.1, or the plant-foot landing for a strike in section 3.1.

### 19.7 Moving sideways and backwards

```
v_strafe_max = 0.42*v_top + 0.8*a_agility      // m/s: e.g. v_top 8.95 and agility 0.5 gives 4.2;  v_top 10 and agility 0.9 gives 4.9
v_back_max   = 0.36*v_top + 0.6*a_agility      // 3.5 to 4.2 m/s
strafe accel = 0.8 * A_LONG;  switching from forward to backward needs a hip turn of 0.25 to 0.40 s (less with agility)
```

When strafing (jockey mode, facing locked on the ball or carrier), crossover steps are used above 3 m/s and shuffling below; the stride length is 60% of forward running for the same speed. A defender who must turn and sprint loses 0.25 to 0.40 s to the hip turn, which is why fast attackers run past slower defenders even when the defender started level.

### 19.8 Balance, stumbling and falling

A standing or running body stays up while its **capture point** lies within the base of support. Use the inverted-pendulum model:

```
ω0   = sqrt(g / h_com)                      // h_com = 0.95 m * H/1.8  →  ω0 ≈ 3.2 rad/s
ξ    = x_com + v_com / ω0                   // where the foot has to be to stop the fall
Δξ   = Δv / ω0                              // shift from an impulse; Δv = k_t·J / M (section 8.2)
```

| Outcome | Δξ beyond the foot (reference body, balance 50) | Equivalent impulse J (N·s, planted victim) | Result |
| --- | --- | --- | --- |
| Recovers with the stance | under 0.10 m | under 40 | Jostle only |
| **Stumble** (needs a recovery step) | 0.10 to 0.20 m | 40 to 80 | 0.3 to 0.6 s of reduced control |
| **Fall** | 0.20 to 0.35 m | 80 to 140 | Down 1.2 to 1.9 s |
| Hard fall | over 0.35 m | over 140 | Injury roll (section 9) |

The J values in section 8.2 are the calibrated default for a jogging player; to use the continuous model instead, compare `Δξ` with the thresholds above after scaling by

```
threshold_scale = 0.7 + 0.6 * (0.7*a_balance + 0.3*a_strength)      // 0.7 to 1.3; replaces the looser formula in 8.2
// × 0.8 when sprinting above 7 m/s;  × 0.7 when on one foot in the air phase;  × 1.2 when braced (head up, facing the contact)
```

**How a fall looks and moves.** The body rotates about the foot like an inverted pendulum: the time to hit the ground from the point of no return is about 0.45 to 0.7 s, which fixes the fall animation length (0.5 to 0.8 s). The player lands with the root continuing along the impulse direction and sliding with `μ_body = 0.6` (section 9.2); the animation does the arms and hip contact. Players fall forward or sideways depending on the horizontal impulse direction relative to facing, and backward only when the impulse is from the front above 140 N·s.

### 19.9 Getting up

```
t_rise = 0.95 - 0.30 * (0.5*a_agility + 0.5*a_balance)      // seconds for the get-up clip: 0.89 at 20, 0.80 at 50, 0.725 at 75, 0.65 at 99
```

The get-up clip plays after the ground phase (section 9.2). The player cannot steer for the first 60% of the clip, and can walk at 40% speed for the remainder; full control returns when the clip ends. A player who falls while the ball is near cannot play it until control returns, but the opponent's challenge is still a contest.

### 19.10 Jumping

```
h_jump   = (0.35 + 0.35*a_jump) * (1 + 0.12*min(v_run / 6, 1))     // m: run-up adds up to 12%
v_y      = sqrt(2*g*h_jump)
airtime  = 2*v_y / g   // 0.65 s at 0.525 m
```

Take-off needs a 0.12 to 0.20 s crouch (pre-stretch); horizontal speed carries over at 85% of the run-up speed; steering in the air is limited to ±10 degrees; landing costs 0.20 to 0.30 s of reduced speed. Head contact happens near the apex (section 7.3).

### 19.11 Stamina and sprint capacity

Stamina (first spec 3.3) is now built on a **sprint reserve** `W′` (the metres of running above the critical speed `v_crit = 5.5 m/s` the player can do before the legs go):

```
dW′/dt = -(v - v_crit)                    // v above v_crit drains W′ at the excess speed (m/s) per second
dW′/dt = +r_rec * (W′_max - W′)           // below v_crit it refills; r_rec = 0.04 + 0.04·a_stamina per second, doubled when walking
v_top_eff = v_top * (0.85 + 0.15 * smoothstep(0, 0.25, W′ / W′_max))   // keeps the 85% floor from the first spec
W′_max = (120 + 260*a_stamina) * staminaScale           // 172 m at 20, 250 at 50, 315 at 75, 377 at 99
```

Drain from the other modes (jogging, runs) comes from the match-distance anchor (9.0 + 3.0·a\_stamina km) through the drain multiplier in 18.3. Heat above 28 °C raises drain by up to 15% (section 13.3).

### 19.12 One locomotion tick (summary)

```ts
function locomotionTick(p: Player, intent: MoveIntent, dt: number) {
  const r = p.resolved;                                          // from section 18.3
  const hasBall = p.inPossession;
  const vTop  = r.vTop * (hasBall ? r.carryFactor : 1) * staminaFactor(p);
  const aLat  = r.aLat * (hasBall ? r.lambdaBall : 1) * surface.gripScale(p.mu);
  const vDes  = intent.dir.scale(Math.min(intent.speed, vTop));   // from the stick pipeline (section 5.1)
  if (isSharpCut(p.vel, vDes)) p.beginPlant(r.tPlant(hasBall));   // delay, then 19.4 phase 2
  const aReq  = vDes.sub(p.vel).scale(1 / dt);
  const { aLong, aLatReq } = decompose(aReq, p.vel);
  const longCap = aLong >= 0 ? Math.min(r.aCap, (vTop - dot(p.vel, p.dir)) / r.tau) : r.aBrake;
  const s = 1 / Math.max(1, Math.hypot(aLong / longCap, aLatReq / aLat));   // traction circle
  p.vel = p.vel.add(accelVec(aLong, aLatReq, p.dir).scale(s * dt));
  p.updateGaitPhase(dt);                                          // 19.6: stride, contact, footfalls
  p.balance.apply(pendingImpulses(p), dt);                        // 19.8: stumble or fall
}
```

## 20. Strikes on the move: half, mid and full volleys, sideways and off-balance contact

The strike model (sections 3 and 4) is the same for every kick. What changes on the move is the **state of the ball**, the **state of the body** and how closely the two line up at contact. The one kick clip is retargeted by IK and a procedural trunk lean (at most 25 degrees), so no extra animations are needed. Bicycle and scissor kicks are not in the essential clip list; if an optional acrobatic clip is enabled it is treated as a mid-air strike with the multipliers in 20.4 and an extra 0.35 quality cap.

### 20.1 Volley classes by ball state

| Class | Ball at contact | Contact height of the ball centre | Activation window | Foot path | Typical launch elevation | Difficulty factor |
| --- | --- | --- | --- | --- | --- | --- |
| Ground strike | Rolling or at rest | 0.11 m | None (ball is predictable) | Flat or rising | Per section 4.2 | 1.0 |
| **Half-volley** | Within 0.12 s after a bounce, rising at 1 to 4 m/s | 0.15 to 0.40 m | ±40 ms | Flat sweep just above the turf (foot centre 0.05 to 0.10 m) | 3° to 12° (low, driven) | 1.3 |
| **Mid-volley** | In the air, at knee to hip height, usually dropping | 0.40 to 1.10 m | ±60 ms | Near-horizontal, slightly rising, foot centre 0.40 to 1.05 m | -8° to +10° (down if the player gets over the ball) | 1.0 |
| **Full volley** | In the air, high | 1.10 up to the player's reach | ±80 ms | Foot swung high with the trunk leaning away | -15° to +12° | 1.5 |
| Above reach | Higher than the player's limit | n/a | n/a | Not a foot strike | Header or chest control instead | n/a |

The **foot reach limit** depends on height and flexibility: `h_foot_max = (0.62 + 0.22·a_balance) · H`, so a 1.80 m player with balance 50 reaches 1.31 m and with balance 99 reaches 1.51 m. Above that the AI and the contextual button choose a header, a chest touch or letting the ball drop.

**What the activation window means.** It is the interval around the predicted contact time during which the swing can actually produce contact if the intent is right. A strike request inside the window creates contact; one started outside it produces either a swing at air (too early or too late by more than the window) or a mistimed contact that lands on the toe cap (early) or the ankle (late) through the section 4.4 mishit rules.

### 20.2 Volley contact and results

Volleys use the moving-ball impulse from sections 3.2 and 4.5. Along the contact normal, with the ball's incoming speed `v_in` toward the foot taken as positive:

```
v_out = [ (1 + e_c) * m_eff * v_f  +  (e_c * m_eff - m_b) * v_in ] / (m_b + m_eff)
```

| Case | Ball in (m/s) | Foot speed v\_f (m/s) | Strike (e\_c, m\_eff) | Ball out (m/s) | Elevation | Spin |
| --- | --- | --- | --- | --- | --- | --- |
| Half-volley drive from a bounce | 12 | 18 | Laces, 0.50, 7.6 | 30.6 | 3° to 12° | Light backspin 5 to 15 rad/s |
| Mid-volley, dropping ball, driven | 10 | 16 | Laces, 0.50, 7.6 | 26.9 | -8° to +4° (hit above centre, descending foot) | Topspin 0 to 20 rad/s |
| Full volley on a cross | 15 | 20 | Laces, 0.50, 7.6 | 34.7 | -15° to +12° | Under 15 rad/s, a sidespin of up to 30 rad/s if hit across |
| Side-foot volley (control and place) | 10 | 10 | Inside, 0.40, 5.0 | 15.8 | 0° to 10° | Backspin 0 to 10 |
| Dipping volley (good players) | 12 | 18 | Laces, 0.50, 7.6, h\_b of -1 to -3 cm (above centre) | 30.6 | -4° to 2° | Topspin 20 to 40 |

The shot-to-keeper outcome depends on the elevation: a half-volley at 8° from 14 m is on target; a full volley that lifts at +12° from 20 m is over the bar. This is why volleys are mostly either spectacular or wasted.

**Contact accuracy.** Volleys use the technique composite `technique_volley` (section 18.2) in a separate position-error curve, wider than for a ball at rest:

```
σ_vol = (0.010 + 0.040 * (1 - a_vol)^1.3) * difficulty * (1 + pressure_k)      // metres, applied to δ_x and δ_y (section 3.4)
// a_vol = technique_volley/100; difficulty from the table above (1.3, 1.0, 1.5) times the approach multiplier in 20.4
```

| technique\_volley | σ\_vol at difficulty 1.0 (cm) | Launch scatter (deg) | As a half-volley (1.3) | As a full volley (1.5) |
| --- | --- | --- | --- | --- |
| 20 | 4.0 | 14.9 | 5.2 cm | 6.0 cm |
| 50 | 2.6 | 9.7 | 3.4 cm | 3.9 cm |
| 75 | 1.6 | 6.0 | 2.1 cm | 2.4 cm |
| 99 | 1.0 | 3.7 | 1.3 cm | 1.5 cm |

A half-volley from a player at 50 therefore scatters by about 13 degrees; one at 99 about 4.8 degrees. Wide scatter on a volley from a poor striker is part of the real game.

### 20.3 Choosing the class (for the contextual button and for the AI)

1. Predict the ball path with the interception solver and find the **contact window**: the earliest time the ball passes through the foot's reachable volume (height 0.05 to `h_foot_max`, within 1.1 m of the player).
2. Classify by the predicted ball height at that time and by the time to the next bounce:

| Predicted state | Choice |
| --- | --- |
| Next bounce in 0.05 to 0.15 s and ball height under 0.4 m | Half-volley (wait for the bounce) |
| Height 0.40 to 1.10 m | Mid-volley |
| Height 1.10 to `h_foot_max` | Full volley |
| Above `h_foot_max` | Header (ball over 1.6 m near the head), chest control, or let it drop |
| Bounce would arrive in 0.15 to 0.30 s at 0.4 to 0.6 m height | Let it drop and take a ground strike if pressure is below 0.4, otherwise mid-volley |

3. The strike starts at `t_contact − T_wind`, with a compressed wind-up `T_wind = 0.08 + 0.06·p` s for a volley (the foot is already in the air in the approach), and commits 60 ms before contact (the plant foot lands).
4. A human player presses the shoot button near the contact: if the button press falls inside the activation window the strike executes in that class; a press too early waits for the window (input buffer up to 120 ms), and one too late is ignored or becomes a late mishit.

### 20.4 Approach cases: moving forwards, sideways, backwards, off-balance

The foot already carries the body's velocity, so a runner transfers part of his own speed to the ball and a sideways-moving player adds a sideways component:

```
v_foot_total = v_swing + k_c * v_body        // k_c = 0.4: share of body velocity that reaches the foot at impact
deviation (uncompensated) = atan( k_c * ratio * v_body_perp / v_ball )      // ratio = ball-to-foot speed ratio, e.g. 1.42
compensation c = 0.5 + 0.4 * technique        // fraction of the sideways drift the player aims off to cancel
residual deviation = (1 - c) * deviation
```

| Approach | Power multiplier | Error multiplier | Other effect |
| --- | --- | --- | --- |
| Running forward 3 to 6 m/s | +0.4·v\_body·ratio added to ball speed (about +3.4 m/s at 6 m/s) | ×1.1 | Natural shot; best for power |
| Running forward above 6 m/s | As above | ×1.25 | Plant-foot error larger |
| Diagonal | Interpolated | ×1.15 | Small sideways drift |
| Moving sideways at 3 to 5 m/s | ×0.95 | ×1.3 | Drift to compensate (below) |
| Moving backwards | ×0.85 | ×1.5 | Launch elevation +3° (leaning back) |
| Off-balance (stumbling, after contact) | ×0.80 | ×1.8 | Plant-foot error doubled |
| Airborne (mid-jump strike) | ×0.90 | ×1.6 | No plant foot, `λ_a` 0.8 |
| Stretching for the ball (more than 0.35 m beyond the ideal spot) | m\_eff −25% | ×1.4 | Direction biased toward the stretching side |
| Cross-body (target behind the plant leg by over 60°) | ×0.80 | ×1.4 | Reduced hip rotation |
| Weak foot | Section 18.3 factor | Section 18.3 factor | Lower e\_c by 0.05 |

**Worked example (sideways drift).** A 25 m/s shot taken while moving sideways at 4 m/s: uncompensated deviation `atan(0.4·1.42·4 / 25) = 5.2°`. With technique 80 the compensation is 0.82 and the residual is 0.9°; with technique 30 the compensation is 0.62 and the residual is 2.0°, so the weaker striker pushes the ball 1.1 degrees farther off line before any other error is added.

### 20.5 Quality factor (q) for every strike on the move

The shot-quality `q` of the first spec (6.1) is built from these terms and used in the speed formula `v_shot = lerp(v_min, v_max, power) · (0.7 + 0.3·q)`:

```
q = clamp( 0.35*technique + 0.20*balance_state + 0.15*alignment + 0.15*(1 - pressure) + 0.10*approach_fit + 0.05*fatigue_term, 0, 1 )
// alignment = cos of the angle between hips and target (clamped at 0.4 minimum); approach_fit from the multiplier table above
```

So a world-class striker who is balanced, square to goal and unpressed gets q near 1 and 100% of his power; a poor striker leaning back and under pressure gets q of 0.2 to 0.3 and about 77% of his power with much wider scatter.
the following must be given to me


18. Validation tests for micro-physics and camera
19.8 Balance, stumbling and falling
21. Goalkeeper attributes, saves, one-on-ones and penalties
22. Professional-stat defaults and archetypes (server seed data) with worked outputs