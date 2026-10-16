3D Soccer Game Physics and Gameplay Spec (DLS / EA FC / eFootball hybrid)

A caveat on numbers: I can’t know the real games’ internal tuning, so every value below is a starting point grounded in real-world physics and common game-feel practice. Real football physics is the base, and “feel” comes from the arcade layers on top.

0. Design philosophy

Simulate the ball properly and drive players kinematically. The ball obeys real forces. Players follow custom controllers with acceleration limits, turn limits, and animation-driven actions. Don’t use a rigid-body engine for characters, because it causes jitter and unpredictable collisions.

Three feel layers (each tunable by a “realism” setting):

Physical core: ball forces, collisions, ballistic solvers
Assist layer: pass/shot aim correction, ball magnetism, tackle snap
Presentation layer: animation blending, hit-stop, camera, and sound

Units and coordinates: meters, seconds, kilograms. Right-handed, Y up, X across the pitch, Z along its length.

Constant	Value
Pitch	105 × 68 m
Goal	7.32 m wide × 2.44 m high
Post radius	0.06 m
Penalty spot	11 m from the goal line
Penalty area	16.5 m deep, 40.32 m wide
Wall distance	9.15 m
Ball radius / mass	0.11 m / 0.43 kg
Ball moment of inertia	I = ⅔·m·r² ≈ 0.00347 kg·m²

Scale problem: a real-scale pitch feels slow on a phone. Fix it by raising player speeds 15-40% over real values and keeping ball speeds realistic. The ball-to-player speed ratio is what makes passing feel right. Alternatively, run the whole sim at 1.2-1.4× time scale.

1. Simulation loop
fixed dt = 1/60 (ball sub-stepped ×4 → 240 Hz), accumulator pattern
each tick:
  1. Read/buffer input (and AI decisions at 10-30 Hz)
  2. Update player intent → steering → locomotion
  3. Update action state machines (pass, shoot, tackle, GK)
  4. Integrate ball (substeps) + continuous collision
  5. Resolve ball↔player, ball↔world, player↔player
  6. Rules (goal, out, offside, fouls)
  7. Animation sync (physics drives root; animation follows)
  8. Render with interpolation between the last two states

Keep the sim deterministic: fixed timestep, seeded RNG, no frame-rate-dependent logic. This is required for replays and rollback netcode.

2. Ball physics
2.1 State

Position p, velocity v, angular velocity ω, orientation quaternion (visual only), contact flag.

2.2 Forces in flight
Gravity: g = 9.81 (arcade games use 11-14 for snappier arcs)
Drag: F_d = -½·ρ·C_d·A·|v|·v with ρ=1.225, A=πr²≈0.038, C_d ≈ 0.25 (0.25-0.35 for game feel). At 30 m/s this gives ~12 m/s² of deceleration, which is why shots slow visibly.
Magnus (curl): F_m = k_m · ½·ρ·A·r · (ω × v). With ω=50 rad/s and v=25 m/s this gives ~7 m/s² of sideways acceleration, which is realistic for a curled free kick. Use k_m of 1.0 for realism and up to 1.5-2.0 for arcade curl.
Spin decay: ω *= exp(-0.15·dt) in air. It decays faster on the ground through friction.
Optional drag crisis: C_d drops from ~0.45 at low speed to ~0.2 above ~20 m/s. Add a knuckleball mode by lowering spin to near zero and adding small lateral noise forces.
2.3 Integration
ts
function stepBall(b, dt) {
  const speed = len(b.v);
  let a = vec3(0, -G, 0);
  a = add(a, scale(b.v, -0.5*RHO*CD*AREA*speed / M));          // drag
  a = add(a, scale(cross(b.w, b.v), KM*0.5*RHO*AREA*R / M));    // Magnus
  b.v = add(b.v, scale(a, dt));                                 // semi-implicit Euler
  b.p = add(b.p, scale(b.v, dt));
  b.w = scale(b.w, Math.exp(-SPIN_DECAY*dt));
}

Use 4 substeps per 60 Hz tick (RK4 is optional). Use swept-sphere continuous collision so 30+ m/s shots never tunnel through posts or players.

2.4 Ground contact (bounce + friction + roll)

When p.y < r && v.y < 0:

Set p.y = r.
Normal impulse: jn = -(1+e)·m·v.y. Use e ≈ 0.55-0.65 (FIFA’s drop test implies ~0.57). If |v.y| < 0.8, use e=0 so the ball stops bouncing and begins rolling.
Slip velocity at the contact point: r_c = (0,-r,0), v_c = v + ω × r_c, v_t = v_c with the Y part removed.
Friction impulse (Coulomb): a hollow-shell ball has effective tangential mass 0.4·m, so the impulse that fully stops slip is j_stop = 0.4·m·|v_t|. Apply j_t = min(j_stop, μ·jn) with μ ≈ 0.4-0.6 (dry grass), lower when wet.
Apply J = -t̂·j_t: Δv = J/m, Δω = (r_c × J)/I.

This produces topspin skids, backspin check-ups, and sidespin kick-off on bounce with no special cases.

Rolling resistance (when in contact with |slip| small): |a| = c_const + c_visc·|v| with c_const ≈ 1.0-2.5 m/s² and c_visc ≈ 0.1-0.3 s⁻¹. Real grass is lower (~0.5-1 m/s²), but games raise it so passes die naturally. Sleep the ball when |v| < 0.05. Pitch conditions modify these: wet means lower μ, a faster skid, and lower rolling resistance. Heavy or worn pitches mean higher resistance and lower restitution.

2.5 World collisions
Object	Shape	Restitution	Notes
Posts	Vertical capsule r=0.06	0.5-0.7	Ball center vs. capsule distance ≤ r+0.06, then reflect about the contact normal
Crossbar	Horizontal capsule	0.5-0.7	Gives the satisfying “ping”
Net	See 2.6	~0.05	Absorbs energy
Ground	Plane	0.55-0.65	See 2.4
Advertising boards	Optional (indoor/arcade modes)	0.6	Not in real football
2.6 Net

Once the ball is past the goal line, switch to net mode: drag ×6-10, restitution 0.05, and constrain the ball inside a box (back plane ~2 m behind the line, side planes, roof). Visually, use a Verlet particle grid (about 12×8) pinned at the frame. The ball pushes particles within radius, and springs plus damping make the net ripple. The net is cosmetic, so keep gameplay collision to the simple box.

2.7 Ball ↔ player contact

Players are capsules (r≈0.3 m, h≈1.8 m) plus contact sensors: foot (sphere r≈0.15 on each foot bone or an animated hitbox), thigh, chest, and head. For each contact:

v_rel = v_ball - v_part
v_n   = dot(v_rel, n)
if v_n < 0:
   v_ball += n * (-(1+e_part)*v_n) * (1 / (1 + m_ball/m_part))   // m_part effective ~ 5-8 kg for a foot

Plus a tangential friction term for spin. Use e_foot ≈ 0.4-0.6 (kicks add velocity from the swing), e_thigh ≈ 0.2, e_chest ≈ 0.15, e_head ≈ 0.4. Control-type touches (trapping) override this with the first-touch model in section 5.

3. Player locomotion
3.1 Movement model

Player state: position, velocity, heading, facing (can differ from heading), stamina, mode flags. Each tick:

desired_v = stick_dir * v_max(mode, stamina, attributes)
a_req     = (desired_v - v) / dt
// split into longitudinal (along current velocity) and lateral components
a_long, a_lat = decompose(a_req, v)
// traction circle: total grip is limited
scale = 1 / max(1, sqrt((a_long/A_LONG)^2 + (a_lat/A_LAT)^2))
v += (a_long*dir + a_lat*perp) * scale * dt

This traction circle is the heart of good football movement: sprinting limits how sharply you can turn, so players naturally slow down in tight turns, and agility attributes widen the circle.

Starting values (arcade-boosted):

Parameter	Value
Jog / run / sprint (m/s)	3.5 / 6 / 8-10 (real elite top speed ≈ 10-12)
Longitudinal accel	5-8 m/s² (agility-scaled)
Braking	9-14 m/s²
Lateral accel (turn)	8-14 m/s² (higher at low speed)
Max turn rate	ω0 / (1 + 0.15·speed), with ω0 ≈ 720°/s at standstill
Backpedal / strafe	50% / 70% of jog
3.2 Facing vs. heading
Locomotion mode: facing slerps toward velocity direction (~12-20 rad/s).
Strafe/jockey mode (defending, shielding): facing locks toward a target (ball or carrier) while velocity is independent. Drive animation with a 2D blend space (forward/side speed).
3.3 Stamina
drain  = base * (sprinting ? 1 + 2·(v/v_max)² : jogging ? 0 : -recover)
v_max *= 0.85 + 0.15·smoothstep(0, 0.6, stamina)

Add a slow fatigue pool (match-long) that caps recovery. Stamina attribute scales drain and recovery. Never let a player hit zero speed, since a floor of about 85% max keeps it fair.

3.4 Strength, balance, weight

Per-player mass 65-90 kg and strength 0-1 feed shielding, shoulder charges, and aerial duels. Balance sets the threshold of impulse before a stumble.

3.5 Animation integration

Physics drives the root, and the animation system follows. Match stride playback to speed (playbackRate = v / stride_ref_speed) to prevent foot sliding. Use blend trees (DLS-style, cheap) or motion matching (EA-style, higher fidelity but needs a large mocap library). Use inverse kinematics for foot planting and the kick contact point.

3.5b Mobile input

Virtual stick with a dead zone (~10%), a response curve (out = in^1.3), and optional 8- or 16-way snapping on tap-heavy modes. Make the stick camera-relative. Show the sprint button as hold-to-sprint, and bind actions contextually (the same button means pass when attacking and tackle when defending).

4. Possession, dribbling, first touch
4.1 Possession model

States: free, contested, controlled(player), receiving(player). Never “attach” the ball to the foot. Treat possession as proximity + recent touch history:

controller = player with min dist to ball < r_control (≈0.6-0.9 m, attribute-scaled)
             and ball height < 1.2 m and relative speed < v_control_max

Contested when two players qualify within 0.15-0.25 s. Resolve with the tackle model (section 7).

4.2 Dribbling: two models, blendable

Model A: Touch-based (eFootball/EA feel). At each footstrike (~every 0.25-0.4 s), apply an impulse so the ball leaves ahead of the player:

touch_dist  = lerp(0.4, 1.0, speed_norm) * (1.2 - 0.4·dribble_skill) * mode_mult
ball_v_next = player_v * (1 + k_touch) + facing * v_touch + noise * (1 - control)

Between touches the ball decelerates through rolling friction. Close control shrinks touch distance to 0.15-0.3 m and caps speed at ~60%. Sprint knock-on pushes the ball 1.5-3 m ahead (fast, but a tackle risk).

Model B: Magnetized (DLS arcade feel). A soft PD attractor holds the ball at a target offset in front of the player:

target = p_player + facing * d(speed)      // d from ~0.35 at jog to ~0.8 at sprint
a      = Kp*(target - p_ball) + Kd*(v_player - v_ball)

Apply only within the control radius and fade it out under pressure or on skill checks.

Hybrid: use Model B at low pressure and Model A under pressure or at high speed, with a “touch randomness” parameter scaled by pressure, skill, and turn angle.

4.3 Pressure scalar

P = Σ w(d_i) · f(angle_i) over opponents, where w = clamp(1 - d/4 m) and f is larger when the opponent faces you or approaches from the front. It feeds touch error, pass error, shot error, and decision time.

4.4 First touch / receiving
v_rel = v_ball - v_player
q = quality(control, |v_rel|, angle_body_to_ball, ball_height, pressure, foot)   // 0..1
v_new = v_player + (v_rel * (1 - q)) * e_touch + desired_dir * v_push * q + error * (1 - q)
q ≈ 1: dead trap or directional touch into space.
q ≈ 0: heavy touch or spill. Error is a cone about the incoming direction, scaled by (1-q).
Height bands choose the contact part: ground/foot (<0.3), knee/thigh (0.3-1.0), chest (1.0-1.4), head (>1.5). Select animation and absorption to match.
Player can pre-select touch direction with the stick (an EA FC-style directional first touch).
4.5 Skill moves (scripted ball + physics)

Implement as state machines with timed ball offsets relative to the player:

Step-over / feint: lateral body sway, no ball change, shifts the defender’s lean.
Drag-back / pull-back: impulse backward at 3-4 m/s with a short control window.
Roulette / spin: ball follows a half-circle path (kinematic for ~0.4 s), then hands back to physics.
Flick-up / rainbow: v.y ≈ 4.5-6 m/s with backspin, apex at ~1.2-2 m over the defender.
Elastico / fake-out: two-phase lateral offsets (outside then inside).

Success is gated by skill, speed, and pressure. Failure yields a heavy touch.

4.6 Shielding

When the carrier faces away from an opponent and the ball is on the far side, apply a strength-and-angle bonus to the carrier in contested resolution and push the opponent sideways via soft collision.

5. Passing
5.1 Target selection (assist)

Score candidates in a cone around the stick direction:

score = w1·alignment + w2·openness(lane clear of defenders) + w3·forward_progress
      + w4·receiver_space + w5·(-distance penalty)

Manual mode skips this and passes along the stick vector.

5.2 Ground pass solver

With linear damping dv/dt = -k·v, speed along distance falls linearly: v(s) = v0 - k·s. To arrive at distance D with speed v_arr:

v0 = v_arr + k·D          (add a constant-friction term c·T for rolling resistance)

Compute the lead point iteratively: guess T = D/v0, set target = p_r + v_r·T (limit the receiver’s predicted velocity by his decel), recompute D and T, and repeat 3 times.

5.3 Lofted / lob / cross solver

Choose the flight time T (higher for lobs), then the ballistic launch velocity is exact without drag:

v0 = Δ / T + (0, ½·g·T, 0)           // Δ = target - start

With drag and Magnus, shoot and correct: simulate with the real integrator, measure landing error e, set v0 -= e / T, and repeat 2-4 times. This is cheap enough for one pass per action.

5.4 Pass types
Type	Notes
Short ground	Low speed, exact arrival speed ~8-10 m/s
Driven	Higher speed, flat, light backspin to stay low
Through ball	Lead point ahead of runner, ground or lofted over defenders, high-risk
Lob / chip	High arc, backspin to stop on landing
Cross (low/driven/whipped/high)	Curl via sidespin, target a zone or runner
Long ball / switch	25-45 m/s, large error unless skill is high
One-two	AI queues a return run for the passer
Back-heel / flick	Short range, quality penalty, style bonus
5.5 Error model
σ_angle = base · (1 - pass_skill) · (1 + k_p·pressure) · (1 + k_o·off_foot) · (1 + k_d·dist_norm) · (1 + k_b·body_off_axis)
direction += gaussian(0, σ_angle)  (truncated at 2.5σ)
power     *= 1 + gaussian(0, σ_power)

Hold-to-charge scales speed. Assist level adjusts σ (fully assisted ≈ ½ of manual).

6. Shooting and heading
6.1 Core model

Power bar fills in ~0.7-1.0 s (releasing early still works).

v_shot = lerp(v_min≈12, v_max≈33, power) * (0.7 + 0.3·q)       // m/s, q = shot quality
q = f(shooting_skill, balance, body_alignment, approach_speed, pressure, foot, distance)

Aim point is defined in goal-plane coordinates (x across, y height). The launch direction is solved with the shoot-and-correct loop from 5.3, which includes Magnus when spin is applied.

6.2 Shot types
Type	Spin ω	Notes
Normal	Light topspin	Baseline
Power	Minimal	Highest speed, lowest accuracy
Finesse / curler	Sidespin 40-60 rad/s	Aim at the far post. Magnus curves it back in, so solve numerically
Driven / low	Slight topspin	Stays low and skids
Chip / lob	Backspin 30-50 rad/s	Keeper-over-the-top
Knuckle	~0 spin, small noise force	Unpredictable late dip or swerve
Volley / half-volley	Timing window of ±80 ms	Quality depends on ball speed and body alignment
Bicycle / scissor	Acrobatic anim + low q	Rare, high-reward
6.3 Error

Cone about the intended direction using the same model as passing, with larger base values. Add a vertical-error bias toward “skied” under pressure and a fatigue penalty.

6.4 Heading
Jump: v_y = √(2·g·h). For h = 0.55 m, v_y ≈ 3.3 m/s. Airtime ≈ 0.67 s, head contact near apex, reach height 2.4-2.9 m depending on the player.
Contact: v_out = e_head·(−v_in·n) + swing_contribution, direction controlled by stick (limited by neck angle ±45°). Power depends on jump height, run-up, and strength.
Timing window: ±60-100 ms around the ideal contact moment, scaled by heading skill.
Aerial duels: compare effective reach (jump + height + timing + strength) and resolve with the contest model, plus body contact impulse.
6.5 Goal detection

A goal counts when the whole ball crosses the line: ball center beyond z_line + r, with |x| < 3.66 - r and y < 2.44 - r (use a swept test between frames so fast shots can’t skip). Flag a “goal-line check” replay when the ball touches the line within ±r. Net mode (2.6) starts at the moment of crossing.

7. Tackling and defending
7.1 Philosophy

Use geometry first, probability second. A tackle only works if the animated foot hitbox physically contacts the ball (or player) during its active frames. Skill modifies the hitbox reach, the success of contested outcomes, and what happens next.

7.2 Tackle state machine

Idle → Approach (optional auto-pursuit) → Windup (0.05-0.15 s) → Active (0.1-0.25 s) → Contact resolution → Recovery (0.2-0.6 s, can't act)

Recovery is the risk: a missed tackle leaves the defender out of position.

7.3 Types and parameters
Type	Reach	Risk	Notes
Jockey / contain	n/a	None	Speed ≤ 60% of max, face the carrier, lateral shuffle at 70%, back at 50%
Standing tackle (poke)	0.9-1.2 m	Medium	Foot hitbox sweeps toward the ball, which gets a deflection impulse
Block tackle	0.7-1.0 m	Low	Planted foot, wins 50/50s, less ball control after
Hook / toe-poke	1.3-1.5 m	High	Long reach, low contact quality
Shoulder charge	Body contact	Medium	Legal only shoulder-to-shoulder with the ball within playing distance
Slide tackle	2.0-2.8 m	High	See 7.4
Intercept	Reach + run	Low	Uses the interception solver
Pressure / double team	n/a	Low	Increases the pressure scalar on the carrier
7.4 Slide tackle physics
launch:     v_slide = max(1.1·v_player_forward, 5.0 m/s) along heading
deceleration: a = μ_slide · g      (μ ≈ 0.4-0.6 → 4-6 m/s²; wet 0.3)
distance:   s = v² / (2·μ·g)       // e.g. v=7, μ=0.5 → ≈ 5 m, tune down for gameplay
duration:   ~0.6-0.9 s sliding, 0.4-0.6 s getting up
hitbox:     capsule laid down (length ≈ 1.9 m), active lead-leg sensor

Lock steering during the slide (maybe ±10° adjust). Recovery makes it high-risk, and a missed slide removes the defender from the play.

7.5 Contest resolution (50/50 and carrier vs. tackler)

When both players reach the ball in the same window:

adv = a1·(tackle_skill - dribble_skill) + a2·angle_advantage + a3·speed_diff
    + a4·strength_diff + a5·(ball_exposure: distance of ball from carrier's feet)
    - a6·shielding
P(win) = sigmoid(adv)

Winner gets a foot-impulse deflection: v_ball = foot_velocity · e_foot + random cone, with the cone narrower for skillful tackles (can poke the ball to a teammate). A loser can still keep the ball if the deflection lands near them (so no fixed outcome).

7.6 Fouls and referee
Check	Foul condition
Contact order	Player contacted before the ball
Approach angle	From behind (>120° off carrier’s facing)
Severity	rel_speed_at_contact × tackle_type_mult × studs_up
Location	Penalty if inside the box

Severity thresholds map to: no foul → foul → yellow → red. Apply an advantage rule: if the fouled team keeps the ball with a good attacking chance (e.g. xG gain), delay the whistle for ~2 s. Add a referee leniency parameter per match.

7.7 Collisions between players

Use 2D circle/capsule separation with mass-weighted push-out:

overlap = (r1 + r2) - dist
push1 = overlap * m2/(m1+m2),  push2 = overlap * m1/(m1+m2)

Add momentum exchange for charges: Δv = (1+e_b)·m2/(m1+m2)·v_rel_along_normal with a low e_b ≈ 0.1-0.3. If |Δv| > stumble_threshold(balance), trigger a stumble (0.3-0.6 s of reduced control). Hard sprint collisions can trigger partial ragdoll or authored fall animations.

7.8 Interception solver (used by AI, auto-switching, and keepers)

Sample the ball path every 0.05 s. For each sample at time t, a player can intercept if

dist(player_pos, ball_pos(t)) - reach <= v_player_max(t) · (t - reaction)

The earliest satisfying t is the intercept time. Rank all players by t for auto-switching and AI chase.

8. Goalkeeper physics
8.1 State machine

Positioning → Set → React → Dive/Jump/Block → Catch/Parry/Punch → Recover → Distribute
plus Rush-out/Smother, Sweep, Claim cross, and Penalty states.

8.2 Positioning (angle narrowing)
dir   = normalize(ball_pos - goal_center)
d     = clamp(base_d + k·(distance_to_ball)^-1 ..., 0.5, 6.0)    // farther ball → stay nearer line; closer → advance
keeper_target = goal_center + dir * d

Move with lateral shuffle (not dive-speed) at ~4-5 m/s, a small lag (positioning attribute), and a “set” stance (low center of gravity, quick reaction) just before a shot.

8.3 Shot prediction and reaction

At the moment of the strike, the keeper gets a perceived trajectory with noise:

sim ball forward at coarse steps → intersect goal plane (z = goal_line) → (x_c, y_c, t_c)
perceived = actual + gaussian(0, σ_perception)         // σ = 0.1-0.8 m by attribute
react_delay = 0.15-0.35 s                             // elite ≈ 0.15, scaled by reflexes

Reality check: a 30 m/s penalty from 11 m arrives in ~0.37 s. With 0.2 s reaction, the keeper can barely move, so penalty saves require guessing or an early commit. Model this explicitly.

8.4 Dive model

Choose a dive type from the perceived intercept: stand-and-catch, low dive (left/right), mid dive, high-reach dive, one-step parry, or a full-stretch.

Reach envelope:

Lateral reach from standing ≈ 2.5-3.2 m (including arms), vertical reach ≈ 2.9-3.3 m for tall keepers
Peak lateral launch speed ≈ 4-6 m/s with ~0.12-0.2 s of push-off
Hand sphere r ≈ 0.15-0.2 m (glove), following the animated hand bone

Dive trajectory:

phase 1 (push-off 0.1-0.2 s): accelerate horizontally to v_dive
phase 2 (flight): ballistic; v_y gets an upward kick for high dives, gravity pulls down
hand(t) = p0 + lateral_dir · s(t) + up · h(t)

A save is possible iff there exists a dive type such that ‖hand(t_c) − ball(t_c)‖ ≤ r_hand + r_ball at the (possibly slightly sooner) contact time. Swept-test contact across the dive, not just at t_c.

8.5 Save outcomes

At hand-ball contact, compute handle_prob:

handle_prob = sigmoid(c0 + c1·keeper_handling − c2·ball_speed − c3·offset_from_sweet_spot
                      − c4·|spin| − c5·wet_ball + c6·ball_height_comfort)
Outcome	Result
Catch/hold	v_ball = 0, attach to hand for 0.5-1 s, then distribution
Parry	v_out = reflect(v_in, hand_normal)·e_hand (0.3-0.5) biased wide/up by keeper skill
Deflect over the bar / around post	Fingertip save, ball path altered ~10-30°
Fumble/spill	Low handle_prob; ball dropped near the keeper, creating a rebound
8.6 Crosses and high balls

Keeper claims when time_to_ball_keeper < time_to_ball_attacker − margin, has reach through the traffic, and probability scales with crowd density. Options: catch (high handling), punch (when crowded), or stay. Contact with attackers triggers the shoulder/aerial model, and a foul is called if the keeper is obstructed or the attacker pushes.

8.7 One-on-one

Compute breakaway timing. The keeper rushes out only if arrival time < the attacker’s time to shoot range. Reduce the open goal angle by position, then dive at the feet (smother) or spread to block (star-jump).

8.8 Distribution
Throw: overarm, ~15-20 m/s, ~25-35 m range, accurate to teammates
Goal kick / punt: 25-35 m/s, large variance
Drop-kick / half-volley: moderate speed
Roll-out: ground pass at ~8-12 m/s
9. Set pieces and restarts
Restart	Physics/rules notes
Kick-off	Ball at center; only the kicking team enters the circle
Throw-in	Release at head height, 10-15 m/s, no spin or light backspin, with an angle choice
Goal kick	Static ball, 25-35 m/s, power-based
Corner	Aim with stick, choose elevation; use curl (inswinger/outswinger via spin sign)
Free kick (direct)	Wall at 9.15 m with jumping timing (jump at the strike moment ± delay), curled shots via Magnus, keeper positions for the near post
Penalty	11 m, keeper must stay on the line until the kick; model shot speed and keeper guess probability
Offside	At the timestamp the ball is played, compare the attacker with the second-last defender (and the ball) along the pitch axis; any body part allowed to score counts. Use a snapshot of positions at kick time, not at reception
Out of play	Whole ball over the line → center beyond line + r (swept test)
Handball	Contact with arm/hand hitbox, with intent heuristic (arm away from the body, deliberate movement)
10. AI and physics interplay

Brief, since it deserves its own spec:

Steering behaviors: seek, arrive, pursue (predict with ball_pos(t)), separation, obstacle avoidance. Cap acceleration by the same traction circle as human players.
Formations: each role has an anchor offset that shifts with ball position, defensive line height, width, and compactness sliders.
Decision-making: utility AI at 10-20 Hz, scoring actions (pass, dribble, shoot, hold, clear). Score = progress + space + risk × skill, with reaction time and noise.
Off-ball: runs behind the line, overlaps, supporting triangles, marking (zonal and man), pressing triggers when pressure or a poor touch occurs.
Auto-switch: pick the defender with the minimum interception time and add hysteresis to avoid flicker.
11. Hybrid tuning table (design intent, not true values)
Knob	Arcade (DLS-like)	Contextual (EA FC-like)	Weighty (eFootball-like)
Dribble model	Magnetized	Touch + assist	Touch-based
Pass assist	High	Medium	Low (manual-friendly)
Turn agility	High, snappy	Medium, animation-bound	Lower, momentum-heavy
First-touch error	Low	Medium	Higher, skill-based
Tackle snap/assist	Strong	Moderate	Weak
Accel/decel	Fast	Medium	Slower, inertia-driven
Keeper	Forgiving	Mixed	Realistic

Expose these as a single “realism” slider (interpolating the parameters) plus an advanced per-parameter editor. A hybrid works by letting each user (or mode) choose a point in the space.

12. Netcode and mobile performance

Performance: 22 players + ball at 60 fps on mid-range phones. Use object pooling, simple capsule collision for players, LOD for animation (full IK for nearby players, simplified for distant), and cull off-screen skeletons. The ball is the only high-frequency physics body.

Online options:

Server-authoritative + client prediction: the client predicts its own player and reconciles. Other players are interpolated ~100 ms behind, with the ball server-owned and smoothed.
Deterministic rollback (GGPO-style): best for 1v1 and ranked, since the state is small enough to snapshot. It requires fixed timestep, seeded RNG, and cross-device determinism (floating-point differences can desync, so consider fixed-point math for gameplay-critical code).
Lag compensation: apply tackle and shot intent with a short input-delay buffer (~2-4 frames) to hide latency.

Record inputs + periodic snapshots for replays and anti-cheat.

13. Suggested build order and tests
Pitch, ball integrator, ground bounce, rolling (test: drop from 2 m should bounce to ~0.6-0.7 m)
Kick impulse and ballistic solver (test: 30 m/s at 15° lands within ±0.5 m of the solver’s prediction)
Player locomotion with the traction circle, stamina, and animation
Ball-player contact, first touch, dribbling (both models)
Pass assist and error model, then shooting with spin
Goal detection, nets, out-of-play, and basic AI
Tackles (stand, slide, shoulder), contests, fouls
Goalkeeper (positioning → reach → saves → distribution)
Set pieces, offside, referee
Online prototype and tuning with real devices

Build a debug overlay early: draw ball trajectories, control radii, tackle hitboxes, GK reach envelopes, and interception lines. Tuning is mostly watching these.

Would you like me to turn this into a downloadable document, or start on step 1-4 as a playable web prototype (Three.js with a custom ball integrator) so you can feel the ball and movement and we can tune from there?


the following information should be taken to consideration, and as such, the animations must be highly limited to essential animations only, not animation on the goal scoring or finess shots, etc, just esental ones that make the game feel realisitic minus extravegant animations, and the stadium must have no seats, should just have an advertisement board and must have just the name of the game tournament enscribed on them: pro league africa.

What you’ll build yourself

Animation state machines and blend spaces. There’s no Mecanim equivalent, so you write the locomotion, strafe, and action blending.
Motion matching. This is possible, but it’s a custom system and needs a large mocap library.
Full-body IK for foot planting and kick contact. The built-in IK is basic, so expect extra work for good-looking contact.
Debug overlays. Trajectories, hitboxes, and keeper reach envelopes need custom drawing, but that’s straightforward in Babylon.

Web and mobile caveats

Performance: 22 skinned characters at 60 fps is realistic on mid-range phones if you keep characters around 3-5k triangles with small skeletons and use LOD. Thermal throttling and browser memory limits are the real constraints.
Determinism for rollback netcode: JavaScript numbers are doubles, so gameplay math is deterministic on the same engine. Functions like Math.sin and Math.exp can differ slightly across browsers and devices, so for rollback netcode use your own implementations or fixed-point math for gameplay-critical code.
Networking: WebSockets run over TCP, which suffers from head-of-line blocking. For lower-latency play, use WebRTC data channels (unreliable mode) or WebTransport where supported.
Distribution: you can ship it as a PWA, or wrap it with Capacitor or a native webview. Audio and touch handling need testing on real iOS and Android browsers, since autoplay and gesture rules differ.

Babylon vs. Unity for this project

Babylon strengths: instant load with no install, easy sharing via link, a TypeScript stack that fits web backends, and no engine licensing.
Unity strengths: better tooling, a mature animator and retargeting pipeline, stronger native mobile performance, and many more football-style assets and examples.

A DLS-style game (arcade feel, stylized characters) is a good fit for Babylon. Reaching EA FC-level animation fidelity is a stretch, because the limit is the animation tooling and asset pipeline, not the physics.

I’m going by my knowledge of Babylon’s features, which change between releases, so check the current docs for Havok and WebGPU support before committing.

If you want to try it, I can scaffold a Babylon.js project with the fixed-timestep loop, the ball integrator (drag, Magnus, bounce with spin), and a debug trajectory overlay, so you can test the ball feel in the browser first.

Why it helps

Fewer animation clips. Animation is the biggest bottleneck for web and mobile football. Every extra clip means more assets, more blend logic, and more memory, so cutting celebrations and per-shot animations removes a lot of work.
Better performance. A stadium with no seats means no crowd geometry or crowd animation, which is a large cost on mobile browsers. Boards and a plain backdrop keep draw calls low.
A consistent look. Boards that only say “PRO LEAGUE AFRICA” give you a clean, branded, tournament-style presentation.

Where to tighten it

Keep the physics intact. “No animation on finesse shots” should not be read as “no finesse shots.” The curl, spin, and Magnus physics stay, and the player just uses the standard kick animation. I’d say this explicitly so the spec isn’t trimmed too far.
Define “essential” with a list. Left vague, it will be interpreted differently each time. A starting list:
Outfield: idle, jog, run, sprint, strafe/jockey, backpedal, turn, pass/shoot kick (one clip, with variation from physics), header, standing tackle, slide tackle, stumble, fall, get-up, throw-in
Goalkeeper: ready stance, dive left/right (low and high), catch, parry, throw, kick
That’s roughly 20-25 clips.
Replace the goal celebration with something cheap. With no celebration, a goal can feel flat. A “GOAL” overlay, the net ripple, a short replay, and a brief pause before kickoff give it weight without any new animation.
Describe the rest of the stadium. “No seats” leaves the surroundings undefined. Say what is there, for example: pitch with line markings, goals with nets, corner flags, a ring of ad boards, and a flat dark or gradient backdrop, plus floodlights if you want them.
Specify the boards. Give the text (“PRO LEAGUE AFRICA”), the font, the colors, whether it’s a static texture or an LED-style scroll, and whether it repeats around the full perimeter.

A tightened version
## Scope constraints

### Animation
- Essential animations only; no goal celebrations or shot-specific animations.
- All shot types (finesse, power, chip, etc.) use the same kick animation. Differences
  come from the physics (spin, speed, trajectory), not from animation.
- Outfield clips: idle, jog, run, sprint, strafe/jockey, backpedal, turn, kick,
  header, standing tackle, slide tackle, stumble, fall, get-up, throw-in.
- Goalkeeper clips: ready, dive (low/high, left/right), catch, parry, throw, kick.
- Goal feedback comes from net ripple, an on-screen "GOAL" overlay, and a replay, not from player animation.

### Stadium
- No seats, stands, or crowd.
- Pitch, goals with nets, corner flags, and a continuous ring of advertisement boards.
- Boards display only the text "PRO LEAGUE AFRICA" (specify font/colors/style).
- Flat or gradient backdrop behind the boards; optional floodlights.

### Physics
- Unaffected by the above. Full ball, spin, tackle, and keeper physics remain as specified.