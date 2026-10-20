import { Ball } from './ball';
import { Player } from './types';
import { Rng } from '../core/rng';
import { findNumber, resolvePhysics, resolveTraits } from '../core/params';
import { TUNE } from '../core/tuning';
import { aiThink, goalkeeperThink } from './ai';
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const DT = 1 / 60;
const BOX_D = 16.5, BOX_HW = 20.16, PEN_SPOT = 11;
const DEFAULT_ANCHORS = {
    1: [0.04, 0], 2: [0.22, 0.65], 3: [0.2, 0.22], 4: [0.2, -0.22], 5: [0.22, -0.65],
    6: [0.42, 0], 7: [0.5, 0.4], 8: [0.5, -0.4], 9: [0.75, 0.5], 10: [0.8, 0], 11: [0.75, -0.5],
};
const keyOf = value => String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
function ruleFlag(snapshot, keys, fallback = false) {
    const wanted = new Set(keys.map(keyOf));
    const visit = (value, depth = 0) => {
        if (!value || typeof value !== 'object' || depth > 5)
            return undefined;
        for (const [key, item] of Object.entries(value)) {
            if (wanted.has(keyOf(key))) {
                if (typeof item === 'boolean')
                    return item;
                if (typeof item === 'number')
                    return item !== 0;
                if (typeof item === 'string') {
                    if (/^(true|yes|enabled|on|knockout)$/i.test(item))
                        return true;
                    if (/^(false|no|disabled|off)$/i.test(item))
                        return false;
                }
            }
            const found = visit(item, depth + 1);
            if (found !== undefined)
                return found;
        }
        return undefined;
    };
    return visit(snapshot) ?? fallback;
}
function resolveWetness(...snapshots) {
    for (const snapshot of snapshots) {
        const amount = findNumber(snapshot, ['wetness', 'rainfall', 'rainIntensity', 'surfaceWetness'], NaN);
        if (Number.isFinite(amount))
            return clamp(amount, 0, 1);
        const condition = String(typeof snapshot === 'string'
            ? snapshot
            : snapshot?.condition ?? snapshot?.conditionLabel ?? snapshot?.type ?? snapshot?.name ?? snapshot?.weather ?? snapshot?.surface ?? '').toLowerCase();
        if (/wet|rain|storm|mud/.test(condition))
            return 0.85;
        if (/dry|clear|sun/.test(condition))
            return 0;
    }
    return 0;
}
const roleOf = (num, pos, fRole) => {
    const s = (fRole || pos || '').toUpperCase();
    if (/GK|KEEP/.test(s))
        return 'GK';
    if (/(^|[^A-Z])(CB|LB|RB|WB|FB|DF|DEF|SW)/.test(s) || /BACK/.test(s))
        return 'DEF';
    if (/(^|[^A-Z])(CM|DM|AM|LM|RM|MF|MID|CDM|CAM)/.test(s))
        return 'MID';
    if (/^W$/.test(s) || /(ST|CF|FW|FWD|LW|RW|WING|STRIK|ATT)/.test(s))
        return 'FWD';
    return num === 1 ? 'GK' : num <= 5 ? 'DEF' : num <= 8 ? 'MID' : 'FWD';
};
function anchorsFor(setup) {
    const out = new Map();
    const fp = setup.formation?.players ?? [];
    if (fp.length >= 10) {
        const xs = fp.map(p => p.x), zs = fp.map(p => p.z);
        const minX = Math.min(...xs), maxX = Math.max(...xs), maxZ = Math.max(...zs.map(Math.abs)), minZ = Math.min(...zs);
        const sx = maxX <= 1.0001 ? 1 : maxX <= 1.5 ? 1 : maxX <= 100 ? 100 : 105;
        const sz = maxZ <= 1.0001 ? 1 : maxZ <= 1.5 ? 1 : maxZ <= 34 ? 34 : maxZ <= 50 ? 50 : 100;
        const gk = fp.find(p => p.shirtNumber === 1 || /GK/i.test(p.role));
        for (const p of fp) {
            let d = minX >= 0 ? p.x / sx : (p.x / (maxX <= 1.5 ? 1 : sx) + 1) / 2;
            let l = minZ >= 0 && maxZ > 0 && minZ >= 0 && zs.every(z => z >= 0) ? (p.z / sz - 0.5) * 2 : p.z / sz;
            if (gk) {
                const gd = minX >= 0 ? gk.x / sx : (gk.x / (maxX <= 1.5 ? 1 : sx) + 1) / 2;
                if (gd > 0.5)
                    d = 1 - d;
            }
            out.set(p.shirtNumber, { depth: Math.min(0.97, Math.max(0.02, d)), lat: Math.max(-1, Math.min(1, l)), role: p.role });
        }
    }
    return out;
}
export class World {
    cfg;
    hooks;
    build;
    P;
    ball;
    rng;
    rngPhys;
    rngRef;
    players = [];
    team = [[], []];
    score = [0, 0];
    phase = 'kickoff';
    period = 1;
    clockT = 0;
    halfLen;
    simT = 0;
    tick = 0;
    restart = null;
    owner = null;
    lastToucher = null;
    lastTouchSide = 0;
    prevToucher = null;
    humanSide;
    controlled = null;
    /** both sides AI-driven (tests / attract mode) */
    autoPlay = false;
    halfLenScale;
    L;
    W;
    hx;
    hz;
    goalHold = 0;
    lastGoal = null;
    input = { move: { x: 0, y: 0 }, sprint: false, action: null, actionHeld: false, modifier: null, switch: false };
    inputLog = [];
    camF = { x: 0, z: 1 };
    prevHeld = false;
    holdT = 0;
    switchT = 0;
    manualSwitchUntil = 0;
    manualSwitchRequested = false;
    ownerCandidate = null;
    ownerCandidateT = 0;
    controlledSince = 0;
    noInputT = 0;
    lastKickTick = -1;
    lastKicker = null;
    ownerCandidateSince = 0;
    counterUntil = 0;
    aiTackleMinute = -1;
    aiTacklesThisMinute = [0, 0];
    // pass / offside / metrics bookkeeping
    pending = null;
    metrics;
    possT = [0, 0];
    events = [];
    seq = 0;
    /** timestamps of recent human control/AI debug can be read by the debug overlay */
    debug = { xg: 0, think: 0 };
    extra = { tackles: [0, 0], tacklesWon: [0, 0] };
    lastShot = null;
    weather;
    knockout;
    extraTimeEnabled;
    extraTimeHalfLen;
    stoppageT = 0;
    advantage = null;
    shootout = null;
    statsT = 0;
    constructor(cfg, hooks, build) {
        this.cfg = cfg;
        this.hooks = hooks;
        this.build = build;
        this.P = resolvePhysics(cfg.physics);
        this.weather = { wetness: resolveWetness(cfg.weather, cfg.rules?.weather, cfg.physics) };
        this.P.groundMu *= 1 - this.weather.wetness * 0.16;
        this.P.rollingResistance *= 1 - this.weather.wetness * 0.45;
        this.P.tractionMu *= 1 - this.weather.wetness * 0.18;
        this.L = this.P.pitchLength;
        this.W = this.P.pitchWidth;
        this.hx = this.L / 2;
        this.hz = this.W / 2;
        this.ball = new Ball(this.P);
        const root = new Rng(cfg.seed);
        this.rng = root.fork('ai');
        this.rngPhys = root.fork('phys');
        this.rngRef = root.fork('ref');
        this.halfLen = Math.max(30, findNumber(cfg.rules, ['halfLengthSeconds', 'half_length_seconds', 'halfDurationSeconds', 'matchHalfSeconds', 'halfSeconds'], 180));
        this.halfLenScale = 45 * 60 / this.halfLen;
        this.knockout = ruleFlag(cfg.rules, ['knockout', 'isKnockout', 'penaltyShootout']) ||
            /(^|[-_ ])knockout($|[-_ ])/i.test(String(cfg.mode ?? ''));
        this.extraTimeEnabled = ruleFlag(cfg.rules, ['extraTimeEnabled', 'extraTime', 'playExtraTime'], this.knockout);
        this.extraTimeHalfLen = Math.max(10, findNumber(cfg.rules, ['extraTimeHalfLengthSeconds', 'extraTimeHalfSeconds'], this.halfLen / 3));
        this.humanSide = cfg.controlledSide === 'away' ? 1 : 0;
        const mk = () => ({ possession_percent: 50, pass_accuracy_percent: 0, shots: 0, shots_on_target: 0, passes_completed: 0, passes_attempted: 0, fouls: 0, corners: 0, saves: 0, expected_goals: 0, yellow_cards: 0, red_cards: 0 });
        this.metrics = [mk(), mk()];
        this.build_(0, cfg.home);
        this.build_(1, cfg.away);
        this.setupKickoff(0);
    }
    // ───────────────────────── setup
    build_(side, setup) {
        const anchors = anchorsFor(setup);
        const list = [...setup.players].sort((a, b) => numOf(a.slot) - numOf(b.slot)).slice(0, 11);
        list.forEach((sp, i) => {
            const num = numOf(sp.slot) || i + 1;
            const a = anchors.get(num) ?? { depth: (DEFAULT_ANCHORS[num] ?? DEFAULT_ANCHORS[(i % 11) + 1])[0], lat: (DEFAULT_ANCHORS[num] ?? DEFAULT_ANCHORS[(i % 11) + 1])[1] };
            const role = roleOf(num, sp.position, anchors.get(num)?.role);
            const p = new Player(side * 11 + i, side, sp.slot, num, role, sp.playerId, resolveTraits(sp.attributes, sp.goalkeeperAttributes, this.P, role));
            p.depth = a.depth;
            p.lat = a.lat;
            this.players.push(p);
            this.team[side].push(p);
        });
    }
    dir(side) { return side === 0 ? 1 : -1; }
    ownGoalX(side) { return -this.dir(side) * this.hx; }
    oppGoalX(side) { return this.dir(side) * this.hx; }
    gk(side) { return this.team[side].find(p => p.role === 'GK' && !p.sentOff) ?? this.team[side].find(p => !p.sentOff) ?? this.team[side][0]; }
    /** formation anchor in world coords with ball-relative shifting (done in AI); this is the raw home spot */
    homeSpot(p, half = false) {
        const d = this.dir(p.side);
        let depth = p.depth;
        if (half)
            depth = Math.min(depth, 0.47);
        return { x: d * (-this.hx + depth * this.L), z: p.lat * (this.hz - 4) * (p.side === 0 ? 1 : -1) };
    }
    setupKickoff(side) {
        this.ball.place(0, 0);
        this.owner = null;
        this.clearHumanInput();
        this.ownerCandidate = null;
        for (const p of this.players) {
            if (p.sentOff)
                continue;
            const s = this.homeSpot(p, true);
            p.x = s.x;
            p.z = s.z;
            p.vx = p.vz = 0;
            p.heading = this.dir(p.side) > 0 ? 0 : Math.PI;
            p.tx = p.x;
            p.tz = p.z;
            p.touchCd = 0;
            p.stun = 0;
            p.dive = null;
            p.gkHolding = false;
            p.runUntil = 0;
            p.runTarget = null;
            p.heavyTouchT = 0;
        }
        // kicker stands behind the ball on own side of the centre spot
        const taker = [...this.team[side]].filter(p => p.role !== 'GK' && !p.sentOff).sort((a, b) => b.depth - a.depth)[0];
        taker.x = -this.dir(side) * 0.6;
        taker.z = 0;
        this.restart = { kind: 'kickoff', side, x: 0, z: 0, timer: 1.4, taker };
        this.phase = 'kickoff';
        this.pending = null;
        this.selectControlled();
        this.hooks.banner(this.period === 1 && this.clockT < 1 && this.score[0] + this.score[1] === 0 ? 'KICK OFF' : 'KICK OFF');
    }
    // ───────────────────────── input
    setInput(i) {
        const next = { ...i, move: { ...i.move }, switch: Boolean(i.switch) };
        const ownRestart = this.restart?.side === this.humanSide;
        if (this.phase !== 'live' && !ownRestart) {
            next.move = { x: 0, y: 0 };
            next.sprint = false;
            next.action = null;
            next.actionHeld = false;
            next.modifier = null;
            next.switch = false;
        }
        if (this.phase === 'live' && next.switch && !this.input.switch)
            this.manualSwitchRequested = true;
        if (!sameInput(next, this.input))
            this.inputLog.push({ tick: this.tick + 1, input: { ...next, move: { ...next.move } } });
        this.input = next;
    }
    switchPlayer() {
        this.setInput({ ...this.input, switch: true });
        this.setInput({ ...this.input, switch: false });
    }
    setCamBasis(fx, fz) { const n = Math.hypot(fx, fz) || 1; this.camF.x = fx / n; this.camF.z = fz / n; }
    // ───────────────────────── main step
    step(dt = DT) {
        this.tick++;
        if (this.phase === 'fulltime')
            return;
        this.simT += dt;
        for (const p of this.players) {
            if (p.sentOff)
                continue;
            p.touchCd = Math.max(0, p.touchCd - dt);
            p.tackleCd = Math.max(0, p.tackleCd - dt);
            p.stun = Math.max(0, p.stun - dt);
            p.stumbleT = Math.max(0, p.stumbleT - dt);
            p.kickT = Math.max(0, p.kickT - dt);
            p.touchT = Math.max(0, p.touchT - dt);
            p.heavyTouchT = Math.max(0, p.heavyTouchT - dt);
        }
        if (this.phase === 'goal') {
            this.clearHumanInput();
            this.goalHold -= dt;
            this.ball.step(dt);
            this.moveAll(dt, true);
            if (this.goalHold <= 0)
                this.afterGoal();
            return;
        }
        if (this.phase === 'halftime') {
            return;
        }
        if (this.phase === 'dead' && this.restart)
            this.stoppageT += dt;
        if (this.phase === 'live') {
            this.clockT += dt;
            const periodLen = this.period >= 3 ? this.extraTimeHalfLen : this.halfLen;
            const added = Math.min(15, 3 + this.stoppageT);
            if (this.clockT >= periodLen + added && !this.restart) {
                this.endHalf();
                return;
            }
        }
        if (this.phase === 'live') {
            const o = this.owner ? this.owner.side : this.lastTouchSide;
            this.possT[o] += dt;
        }
        // Restarts and player intent are resolved from the preceding simulation state.
        if (this.restart)
            this.runRestart(dt);
        if (this.aiTackleMinute !== Math.floor(this.simT / 60)) {
            this.aiTackleMinute = Math.floor(this.simT / 60);
            this.aiTacklesThisMinute = [0, 0];
        }
        if (this.phase === 'live') {
            this.moveAll(dt, false);
            this.ball.step(dt, 4);
            this.holdGoalkeeperBall();
            this.touches(dt);
            this.rules();
            this.resolveAdvantage();
        }
        else if (this.phase === 'shootout') {
            this.stepShootout(dt);
            return;
        }
        else
            this.moveAll(dt, false);
        this.selectControlled();
        if (this.phase !== 'goal' && this.phase !== 'fulltime') {
            const configuredReaction = Number(this.cfg.difficulty?.reactionTimeMs ?? 200);
            const reactionMs = Number.isFinite(configuredReaction) ? configuredReaction : 200;
            const aiInterval = Math.max(3, Math.min(24, Math.round(6 * reactionMs / 200)));
            if (this.tick % aiInterval === 0 || this.phase !== 'live')
                aiThink(this, DT * aiInterval);
            for (const side of [0, 1])
                goalkeeperThink(this, this.gk(side), dt);
            this.selectControlled();
            this.handleHuman(dt);
            this.selectControlled();
        }
        if (this.ball.netHit.pending && this.phase === 'live') { /* handled in rules */ }
    }
    // ───────────────────────── locomotion (traction circle)
    moveAll(dt, frozen) {
        for (const p of this.players) {
            if (p.sentOff)
                continue;
            const T = p.traits;
            let vd_x = 0, vd_z = 0;
            if (!frozen && p.stun <= 0 && !p.gkHolding) {
                const dx = p.tx - p.x, dz = p.tz - p.z, d = Math.hypot(dx, dz);
                if (d > 0.08) {
                    const stamF = 0.72 + 0.28 * Math.min(1, p.stamina / 0.4);
                    const vTop = T.vMax * stamF * (p.sprint ? 1 : 0.8);
                    let s = Math.min(vTop * p.speedFrac / 0.8, vTop);
                    // arrive smoothly: v ≤ sqrt(2·a·d)
                    s = Math.min(s, Math.sqrt(2 * T.aBrake * 0.7 * d));
                    vd_x = (dx / d) * s;
                    vd_z = (dz / d) * s;
                }
            }
            const spd = Math.hypot(p.vx, p.vz);
            const vmaxEff = T.vMax * (0.72 + 0.28 * Math.min(1, p.stamina / 0.4));
            // heading follows velocity at speed, desired direction when slow
            const want = Math.hypot(vd_x, vd_z) > 0.1 ? Math.atan2(vd_z, vd_x) : spd > 0.5 ? Math.atan2(p.vz, p.vx) : p.heading;
            const blend = spd > 2 ? Math.atan2(p.vz, p.vx) : want;
            let dh = wrap(blend - p.heading);
            const rate = (8 + 6 * T.agility) * T.bodyTurn * dt;
            const headingStep = Math.max(-rate, Math.min(rate, dh));
            p.heading += headingStep;
            p.turnRate = headingStep / dt;
            // required acceleration, resolved in heading frame, limited by an ellipse (traction circle)
            let ax = (vd_x - p.vx) / dt, az = (vd_z - p.vz) / dt;
            const hx = Math.cos(p.heading), hz = Math.sin(p.heading);
            const al = ax * hx + az * hz, at = -ax * hz + az * hx;
            const alMax = al >= 0 ? Math.max(0.8, T.aAccel * (1 - spd / (vmaxEff * 1.05))) : T.aBrake;
            const atMax = T.aLat * (1 - 0.35 * Math.min(1, spd / vmaxEff));
            const k = Math.sqrt((al / alMax) ** 2 + (at / atMax) ** 2);
            if (k > 1) {
                ax /= k;
                az /= k;
            }
            p.vx += ax * dt;
            p.vz += az * dt;
            p.x += p.vx * dt;
            p.z += p.vz * dt;
            const s2 = Math.hypot(p.vx, p.vz);
            p.phase += s2 * dt * 1.7;
            // stamina
            const load = s2 / T.vMax;
            if (load > 0.8)
                p.stamina -= (load - 0.8) * 0.12 * (1.15 - T.work * 0.6) * dt;
            else
                p.stamina += T.recovery * (1 - load) * dt;
            p.stamina = Math.min(1, Math.max(0.05, p.stamina));
            p.x = Math.max(-this.hx - 5, Math.min(this.hx + 5, p.x));
            p.z = Math.max(-this.hz - 4, Math.min(this.hz + 4, p.z));
        }
        // soft player-player separation (22 bodies → 231 pairs, trivial)
        const n = this.players.length;
        for (let i = 0; i < n; i++)
            for (let j = i + 1; j < n; j++) {
                const a = this.players[i], b = this.players[j];
                if (a.sentOff || b.sentOff)
                    continue;
                const dx = b.x - a.x, dz = b.z - a.z, d2 = dx * dx + dz * dz;
                const radius = 0.76 + Math.max(0, a.traits.height + b.traits.height - 3.6) * 0.08;
                if (d2 > radius * radius || d2 < 1e-6)
                    continue;
                const d = Math.sqrt(d2), ov = radius - d, nx = dx / d, nz = dz / d;
                const wa = b.traits.mass / (a.traits.mass + b.traits.mass);
                a.x -= nx * ov * wa;
                a.z -= nz * ov * wa;
                b.x += nx * ov * (1 - wa);
                b.z += nz * ov * (1 - wa);
                const rv = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
                if (rv < 0) {
                    const impulse = -(1.12 * rv) / (1 / a.traits.mass + 1 / b.traits.mass);
                    a.vx -= nx * impulse / a.traits.mass;
                    a.vz -= nz * impulse / a.traits.mass;
                    b.vx += nx * impulse / b.traits.mass;
                    b.vz += nz * impulse / b.traits.mass;
                    const impact = -rv;
                    if (impact > 4.2) {
                        const stumble = Math.min(0.55, (impact - 3.6) * 0.08);
                        a.stumbleT = Math.max(a.stumbleT, stumble * b.traits.mass / (a.traits.mass + b.traits.mass));
                        b.stumbleT = Math.max(b.stumbleT, stumble * a.traits.mass / (a.traits.mass + b.traits.mass));
                        a.stun = Math.max(a.stun, a.stumbleT);
                        b.stun = Math.max(b.stun, b.stumbleT);
                    }
                }
            }
    }
    // ───────────────────────── kicking
    /**
     * Single entry point for every ball strike (human, AI, restarts).
     * power: 0..1 charge. Direction/loft solved from a target point so the physics (drag/Magnus) merely perturbs it.
     */
    kick(p, kind, tx, tz, power = 0.5, opts = {}) {
        const b = this.ball, P = this.P, T = p.traits, g = P.gravity, r = this.rngPhys;
        const shootoutKick = this.phase === 'shootout' && this.shootout?.current && !this.shootout.current.kicked;
        let dx = tx - b.x, dz = tz - b.z;
        const dist = Math.max(0.5, Math.hypot(dx, dz));
        const acc = kind === 'shot' ? (shootoutKick ? T.penalties : T.shotAcc) : T.passAcc;
        const pressure = this.pressureOn(p);
        const runFrac = Math.min(1, p.speed / T.vMax);
        const configuredErrorValue = Number(this.cfg.difficulty?.passShotErrorMultiplier ?? 1);
        const configuredError = Number.isFinite(configuredErrorValue) ? configuredErrorValue : 1;
        const difficultyError = this.autoPlay || p.side !== this.humanSide
            ? Math.max(0.5, Math.min(2, configuredError))
            : 1;
        let sigma = ((0.012 + (1 - acc) * 0.07) * (0.6 + 0.8 * Math.pow(power, 1.5)) * (1 + 0.8 * runFrac) + pressure * (1 - T.composure) * 0.05) * TUNE.errorScale * difficultyError;
        if (kind === 'throw')
            sigma *= 0.5;
        const yaw = r.gauss() * sigma;
        const cs = Math.cos(yaw), sn = Math.sin(yaw);
        const ux = (dx * cs - dz * sn) / dist, uz = (dx * sn + dz * cs) / dist;
        let vh = 0, vy = 0;
        const maxPass = 17 + 16 * T.passPower;
        if (kind === 'pass' || kind === 'through') {
            vh = Math.min(Math.sqrt(36 + 2.2 * dist) * (0.7 + 0.6 * power), maxPass);
        }
        else if (kind === 'shot') {
            vh = (21 + 15 * T.shotPower) * (0.5 + 0.5 * power);
            const ty = opts.ty ?? 0.8;
            const t = dist / (vh * 0.93);
            vy = Math.min(14, (ty - b.y + 0.5 * g * t * t) / t) + r.gauss() * sigma * 7;
        }
        else {
            const hp = kind === 'throw' ? 2.4 : Math.min(14, Math.max(4, 3 + dist * 0.1));
            const vy0 = Math.sqrt(2 * g * hp);
            const ty = opts.ty ?? 0.11;
            const tf = (vy0 + Math.sqrt(Math.max(0, vy0 * vy0 - 2 * g * (ty - b.y)))) / g;
            vh = Math.min((dist / tf) * 1.07 * (0.8 + 0.4 * power), 17 + 17 * T.passPower);
            vy = vy0 * (1 + r.gauss() * 0.03);
        }
        vh *= 1 + r.gauss() * 0.025;
        b.vx = ux * vh;
        b.vz = uz * vh;
        b.vy = vy;
        // spin
        const rr = P.ballRadius;
        if (vy < 0.3) {
            b.wz = -b.vx / rr;
            b.wx = b.vz / rr;
            b.wy = 0;
        }
        else {
            const back = kind === 'shot' ? r.range(-6, 14) : 22;
            b.wx = -uz * back;
            b.wz = ux * back;
            b.wy = 0;
        }
        const c = opts.curve ?? 0;
        if (c !== 0)
            b.wy += -c * (10 + 45 * T.curveSkill * power);
        b.groundBounce = 0;
        if (b.y < rr + 0.01)
            b.y = rr + 0.02;
        // bookkeeping
        this.owner = null;
        this.lastKickTick = this.tick;
        this.lastKicker = p;
        p.touchCd = 0.35;
        p.kickT = 0.32;
        p.kickKind = opts.animationKind ?? kind;
        p.holdT = 0;
        p.gkHolding = false;
        this.setToucher(p);
        this.hooks.kick();
        const m = this.metrics[p.side];
        if (kind === 'pass' || kind === 'through' || kind === 'lob') {
            m.passes_attempted++;
            const off = new Set();
            if (opts.eligibleOffside !== false && this.phase === 'live') {
                const line = this.offsideLine(p.side, b.x);
                for (const q of this.team[p.side])
                    if (q !== p && this.dir(p.side) * q.x > line && this.dir(p.side) * q.x > this.dir(p.side) * b.x + 0.1)
                        off.add(q);
            }
            this.pending = { side: p.side, kicker: p, t: this.simT, offside: off };
        }
        else
            this.pending = null;
        if (kind === 'shot') {
            m.shots++;
            this.lastShot = null;
            const goalDistance = Math.hypot(this.oppGoalX(p.side) - p.x, p.z);
            const shotAngle = Math.atan2(Math.abs(p.z), Math.max(1, Math.abs(this.oppGoalX(p.side) - p.x)));
            const xg = clamp((0.82 / (1 + Math.exp((goalDistance - 17) / 4.3))) *
                Math.max(0.18, 1 - shotAngle / 1.25) * (0.72 + 0.28 * T.shotAcc), 0.005, 0.95);
            m.expected_goals += xg;
            this.debug.xg = xg;
            const out = { x: 0, y: 0, z: 0 };
            // on target if predicted goal-plane crossing is within the frame
            const gx = this.oppGoalX(p.side);
            for (let t = 0.1; t < 2.5; t += 0.1) {
                b.predict(t, out);
                if ((gx - out.x) * this.dir(p.side) <= 0) {
                    if (Math.abs(out.z) < this.P.goalWidth / 2 + 0.05 && out.y < this.P.goalHeight + 0.05) {
                        m.shots_on_target++;
                        this.lastShot = { side: p.side, t: this.simT };
                    }
                    break;
                }
            }
            this.emit('shot', p.side, p);
        }
        if (this.phase === 'dead' || this.phase === 'kickoff') {
            this.phase = 'live';
            this.restart = null;
        }
        if (shootoutKick) {
            this.shootout.current.kicked = true;
            this.shootout.current.age = 0;
            this.restart = null;
        }
        if (kind === 'pass' || kind === 'through' || kind === 'lob') {
            const d = this.dir(p.side);
            const offsideLine = this.offsideLine(p.side, b.x);
            p.runUntil = this.simT + 1.5;
            p.runTarget = {
                x: d * Math.min(d * p.x + 9, offsideLine - 0.7),
                z: clampZ(p.z + Math.sign(p.z || 1) * 2.5, this.hz),
            };
            for (const runner of this.team[p.side]) {
                if (runner === p || runner.role !== 'FWD' || runner.humanControlled)
                    continue;
                runner.runUntil = this.simT + 1.5;
                runner.runTarget = {
                    x: d * Math.min(d * runner.x + 12, offsideLine - 0.7),
                    z: runner.z,
                };
            }
        }
    }
    setToucher(p) {
        if (this.lastShot && (p.side === this.lastShot.side || p.role !== 'GK'))
            this.lastShot = null;
        if (this.lastToucher !== p)
            this.prevToucher = this.lastToucher;
        this.lastToucher = p;
        this.lastTouchSide = p.side;
    }
    pressureOn(p) {
        let best = 99;
        for (const q of this.team[1 - p.side]) {
            const d = Math.hypot(q.x - p.x, q.z - p.z);
            if (d < best)
                best = d;
        }
        return Math.max(0, Math.min(1, 1 - (best - 0.8) / 4));
    }
    /** x (in attack-direction coordinates) of the second-last defender or the ball, whichever is further forward */
    offsideLine(attSide, ballX) {
        const d = this.dir(attSide), opp = this.team[1 - attSide];
        const xs = opp.map(q => d * q.x).sort((a, b) => b - a);
        const second = xs[1] ?? xs[0];
        return Math.max(second, d * ballX, 0);
    }
    // ───────────────────────── touches / possession
    touches(dt) {
        const b = this.ball, P = this.P;
        if (this.phase === 'goal')
            return;
        // ownership loss
        if (this.owner) {
            const o = this.owner, d = Math.hypot(b.x - o.x, b.z - o.z);
            if (d > 1.5 || b.y > 1.3)
                this.owner = null;
        }
        // dribble nudging
        if (this.owner && !this.owner.gkHolding) {
            const o = this.owner;
            o.holdT += dt;
            const sp = o.speed;
            const hx = Math.cos(o.heading), hz = Math.sin(o.heading);
            if (sp < 0.35) {
                // shield the ball: it settles at the feet
                const fx = o.x + hx * 0.42, fz = o.z + hz * 0.42;
                b.vx += (fx - b.x) * 6 * dt * 6;
                b.vz += (fz - b.z) * 6 * dt * 6;
                b.vx *= 0.9;
                b.vz *= 0.9;
            }
            else {
                const step = Math.floor(o.phase / Math.PI);
                if ((step !== o.lastStep && o.holdT > 0.14) || o.holdT > 0.5) {
                    o.lastStep = step;
                    o.holdT = 0;
                    const T = o.traits, run = Math.min(1, sp / T.vMax);
                    const hx = Math.cos(o.heading), hz = Math.sin(o.heading);
                    const foot = (step & 1) ? 1 : -1;
                    const stepT = Math.min(0.45, Math.PI / (1.7 * Math.max(sp, 2.5)));
                    const ahead = 0.4 + 0.55 * run * (1.25 - 0.5 * T.control) +
                        Math.abs(this.rngPhys.gauss()) * (0.1 * (1 - T.control) + this.weather.wetness * 0.08);
                    const tx = o.x + o.vx * stepT + hx * ahead - hz * foot * 0.1;
                    const tz = o.z + o.vz * stepT + hz * ahead + hx * foot * 0.1;
                    let vx = (tx - b.x) / stepT, vz = (tz - b.z) / stepT;
                    const m = Math.hypot(vx, vz);
                    if (m > 14) {
                        vx *= 14 / m;
                        vz *= 14 / m;
                    }
                    b.vx = vx;
                    b.vz = vz;
                    b.wz = -b.vx / P.ballRadius;
                    b.wx = b.vz / P.ballRadius;
                    o.touchT = 0.2;
                    o.touchFoot = foot;
                }
            }
        }
        // candidate contact
        let best = null, bestScore = -1;
        for (const p of this.players) {
            if (p.sentOff || p.touchCd > 0 || p.stun > 0)
                continue;
            if (p.gkHolding)
                continue;
            const fx = p.x + Math.cos(p.heading) * 0.2, fz = p.z + Math.sin(p.heading) * 0.2;
            const d = Math.hypot(b.x - fx, b.z - fz);
            const isGK = p.role === 'GK';
            const reach = p.traits.reach + (isGK ? 0.35 : 0);
            const hMax = isGK ? Math.max(2.3, p.traits.height + 0.45) : p.traits.height * 0.75 + p.traits.jump * 1.2;
            if (d > reach + (b.y > 0.5 ? 0.35 : 0) || b.y > hMax)
                continue;
            if (this.owner === p)
                continue;
            if (this.owner && this.owner.side !== p.side)
                continue; // stealing needs a tackle
            const sc = (reach - d) + p.traits.firstTouch * 0.4 + this.rngPhys.next() * 0.25 + (this.owner === null && p.side === this.lastTouchSide ? 0.05 : 0);
            if (sc > bestScore) {
                bestScore = sc;
                best = p;
            }
        }
        if (!best)
            return;
        this.firstTouch(best);
    }
    firstTouch(p) {
        const b = this.ball, T = p.traits, P = this.P;
        const vrx = b.vx - p.vx, vrz = b.vz - p.vz, rel = Math.hypot(vrx, vrz, b.vy);
        const isGK = p.role === 'GK';
        // pass bookkeeping
        if (this.pending) {
            if (p !== this.pending.kicker && this.simT - this.pending.t < 6) {
                if (p.side === this.pending.side) {
                    this.metrics[p.side].passes_completed++;
                    if (this.pending.offside.has(p) && this.phase === 'live') {
                        this.callOffside(p);
                        return;
                    }
                }
            }
            this.pending = null;
        }
        this.setToucher(p);
        if (isGK && this.gkCatch(p))
            return;
        const air = b.y > 0.55;
        if (air && !isGK) {
            // header / chest: deflect toward intent or settle if slow
            if (rel < 9) {
                this.owner = null;
                this.lastKickTick = this.tick;
                b.vx = p.vx * 0.6;
                b.vz = p.vz * 0.6;
                b.vy = -0.2;
                b.wx = b.wy = b.wz = 0;
                p.touchCd = 0.25;
                p.kickT = 0.2;
                p.kickKind = 'head';
                return;
            }
            const goalX = this.oppGoalX(p.side), inFront = Math.abs(p.x - goalX) < 22;
            const tx = inFront ? goalX : p.x + this.dir(p.side) * 25, tz = inFront ? this.rngPhys.range(-2.5, 2.5) : this.rngPhys.range(-15, 15);
            const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz) || 1;
            const acc = T.heading, sp = 8 + 10 * T.heading * (inFront ? 1.2 : 1);
            const err = this.rngPhys.gauss() * (1 - acc) * 0.5;
            const c = Math.cos(err), s = Math.sin(err);
            b.vx = ((dx * c - dz * s) / d) * sp;
            b.vz = ((dx * s + dz * c) / d) * sp;
            b.vy = inFront ? -1 : 4 + 3 * this.rngPhys.next();
            b.wx = b.wy = b.wz = 0;
            this.owner = null;
            this.lastKickTick = this.tick;
            p.touchCd = 0.4;
            p.kickT = 0.2;
            p.kickKind = 'head';
            this.hooks.kick();
            return;
        }
        // ground control
        const q = Math.max(0.05, Math.min(0.97, 0.35 + 0.65 * T.firstTouch - rel / 38 +
            (1 - this.pressureOn(p)) * 0.05 + (isGK ? 0.15 : 0) + TUNE.touchShift - this.weather.wetness * 0.08));
        if (this.rngPhys.next() < q) {
            this.owner = p;
            p.heavyTouchT = 0;
            const f = 0.25;
            b.vx = p.vx + vrx * f * (1 - q);
            b.vz = p.vz + vrz * f * (1 - q);
            b.vy = Math.min(b.vy, 0);
            b.wz = -b.vx / P.ballRadius;
            b.wx = b.vz / P.ballRadius;
            p.holdT = 0;
        }
        else {
            // heavy touch: ball squirts away
            const a = Math.atan2(vrz, vrx) + this.rngPhys.gauss() * 0.7;
            const sp = Math.min(9, rel * 0.45 + 1.5);
            b.vx = p.vx + Math.cos(a) * sp;
            b.vz = p.vz + Math.sin(a) * sp;
            b.vy = Math.max(0, b.vy * 0.3);
            this.owner = null;
            p.touchCd = 0.3;
            p.heavyTouchT = 0.7;
        }
    }
    // ───────────────────────── tackles
    tackle(p, slide) {
        if (p.tackleCd > 0 || p.stun > 0)
            return false;
        p.tackleCd = slide ? 1.4 : 0.9;
        p.kickT = 0.0;
        const o = this.owner;
        const hx = Math.cos(p.heading), hz = Math.sin(p.heading);
        if (slide) {
            p.vx += hx * 3.5;
            p.vz += hz * 3.5;
            p.stun = 0.0;
        }
        if (!o || o.side === p.side || o.gkHolding)
            return false;
        const dx = o.x - p.x, dz = o.z - p.z, d = Math.hypot(dx, dz);
        const reach = slide ? 2.3 : 1.35;
        if (d > reach) {
            p.stun = slide ? 0.7 : 0.25;
            return false;
        }
        const facing = (dx * hx + dz * hz) / (d || 1);
        if (facing < 0.2) {
            p.stun = 0.3;
            return false;
        }
        const T = p.traits, O = o.traits;
        this.extra.tackles[p.side]++;
        const fromBehind = (Math.cos(o.heading) * -dx + Math.sin(o.heading) * -dz) / (d || 1) < -0.25 && o.speed > 1; // tackler behind carrier
        let pSucc = 0.38 + 0.5 * (T.tackle - 0.6 * O.control) + 0.08 * (T.strength - O.strength) + (slide ? 0.12 : 0);
        pSucc = Math.max(0.08, Math.min(0.92, pSucc));
        const r = this.rngRef;
        const won = r.next() < pSucc;
        let foulP = (fromBehind ? 0.45 : 0.05) + 0.1 * T.aggression + (slide ? 0.14 : 0) - (won ? 0.06 : -0.08);
        foulP = Math.max(0.02, Math.min(0.85, foulP * TUNE.foulScale));
        if (r.next() < foulP) {
            const dangerous = (slide && (fromBehind || p.speed > 5.5)) || (fromBehind && o.speed > 4.5);
            this.callFoul(p, o, dangerous, fromBehind);
            return true;
        }
        if (won) {
            this.extra.tacklesWon[p.side]++;
            this.owner = null;
            o.stun = 0.45;
            o.holdT = 0;
            const a = Math.atan2(dz, dx) + r.gauss() * 0.5;
            this.ball.vx = Math.cos(a) * 3.6 + p.vx * 0.5;
            this.ball.vz = Math.sin(a) * 3.6 + p.vz * 0.5;
            this.setToucher(p);
            this.pending = null;
            this.counterUntil = this.simT + 3;
            return true;
        }
        p.stun = slide ? 0.8 : 0.35;
        return false;
    }
    // ───────────────────────── goalkeeping
    gkCatch(p) {
        this.setToucher(p);
        const b = this.ball, T = p.traits;
        const sp = b.speed;
        if (this.lastShot && this.lastShot.side !== p.side && this.simT - this.lastShot.t < 4) {
            this.metrics[p.side].saves++;
            this.emit('save', p.side, p);
            this.lastShot = null;
        }
        const catchLim = 12 + 16 * T.gkHands;
        const nearestAttacker = Math.min(...this.team[1 - p.side]
            .filter(q => !q.sentOff)
            .map(q => Math.hypot(q.x - p.x, q.z - p.z)));
        const catchChance = Math.max(0, Math.min(1, 0.55 + 0.4 * T.gkHands + TUNE.gkCatchBonus -
            Math.max(0, 5 - nearestAttacker) * 0.035 - Math.max(0, sp - 8) * 0.012));
        if (sp < catchLim && this.rngPhys.next() < catchChance) {
            p.gkHolding = true;
            p.holdT = 0;
            this.owner = p;
            b.vx = b.vy = b.vz = 0;
            b.wx = b.wy = b.wz = 0;
            p.dive = null;
            p.vx *= 0.2;
            p.vz *= 0.2;
            this.pending = null;
            return true;
        }
        // parry
        const s = this.dir(p.side);
        let awayX = s, awayZ = 0, nearest = Infinity;
        for (const attacker of this.team[1 - p.side]) {
            const dx = b.x - attacker.x, dz = b.z - attacker.z, distance = Math.hypot(dx, dz);
            if (distance < nearest) {
                nearest = distance;
                if (distance < 8) {
                    awayX += dx / (distance || 1) * 1.5;
                    awayZ += dz / (distance || 1) * 1.5;
                }
            }
        }
        awayX = s * Math.max(0.35, s * awayX);
        const awayLength = Math.hypot(awayX, awayZ) || 1;
        const parrySpeed = 3 + this.rngPhys.next() * 4 + Math.max(0, 8 - nearest) * 0.12;
        b.vx = awayX / awayLength * parrySpeed + b.vx * -0.2;
        b.vz = awayZ / awayLength * parrySpeed + this.rngPhys.gauss() * 1.5;
        b.vy = 2 + this.rngPhys.next() * 3;
        b.wx = b.wy = b.wz = 0;
        this.owner = null;
        p.touchCd = 0.5;
        p.kickT = 0.3;
        this.pending = null;
        return true;
    }
    holdGoalkeeperBall() {
        for (const side of [0, 1]) {
            const g = this.gk(side);
            if (!g.gkHolding)
                continue;
            const b = this.ball;
            b.x = g.x + Math.cos(g.heading) * 0.35;
            b.z = g.z + Math.sin(g.heading) * 0.35;
            b.y = 1.05;
            b.vx = b.vy = b.vz = 0;
            this.owner = g;
            g.holdT += DT;
        }
    }
    // ───────────────────────── rules
    inBox(side, x, z) {
        return Math.abs(z) < BOX_HW && (x - this.ownGoalX(side)) * this.dir(side) < BOX_D && (x - this.ownGoalX(side)) * this.dir(side) > -1;
    }
    rules() {
        if (this.phase !== 'live')
            return;
        const b = this.ball, P = this.P, r = P.ballRadius, hx = this.hx, hz = this.hz;
        // goal: whole ball over the line between the posts and under the bar
        if (Math.abs(b.x) - r > hx && Math.abs(b.z) < P.goalWidth / 2 && b.y < P.goalHeight) {
            const scorerSide = b.x > 0 ? 0 : 1;
            this.goalScored(scorerSide);
            return;
        }
        // out of play (whole ball over the line)
        if (Math.abs(b.z) - r > hz) {
            this.outOfPlay('throw', b.x, b.z > 0 ? hz : -hz);
            return;
        }
        if (Math.abs(b.x) - r > hx && !(Math.abs(b.z) < P.goalWidth / 2 + 0.2 && b.y < P.goalHeight + 0.3)) {
            const endSide = b.x > 0 ? 0 : 1; // the end being attacked by `endSide`... (home attacks +x)
            const defSide = endSide === 0 ? 1 : 0;
            if (this.lastTouchSide === defSide) { // defender last touched → corner for attackers
                this.outOfPlay('corner', endSide === 0 ? hx : -hx, b.z > 0 ? hz : -hz, endSide);
            }
            else
                this.outOfPlay('goalkick', 0, 0, defSide);
        }
        this.pending && this.simT - this.pending.t > 6 && (this.pending = null);
    }
    outOfPlay(kind, x, z, forSide) {
        if (this.advantage) {
            const advantage = this.advantage;
            this.advantage = null;
            if (this.lastTouchSide !== advantage.side) {
                this.beginRestart(advantage.kind, advantage.side, advantage.x, advantage.z);
                return;
            }
        }
        const last = this.lastTouchSide;
        let side;
        let sx = x, sz = z;
        if (kind === 'throw') {
            side = (1 - last);
            sx = Math.max(-this.hx + 1, Math.min(this.hx - 1, x));
            sz = z > 0 ? this.hz - 0.1 : -this.hz + 0.1;
            this.hooks.banner('THROW IN');
        }
        else if (kind === 'corner') {
            side = forSide;
            sx = x > 0 ? this.hx - 0.3 : -this.hx + 0.3;
            sz = z > 0 ? this.hz - 0.3 : -this.hz + 0.3;
            this.metrics[side].corners++;
            this.emit('corner', side, null);
            this.hooks.banner('CORNER');
        }
        else {
            side = forSide;
            sx = this.ownGoalX(side) + this.dir(side) * 5.5;
            sz = 0;
            this.hooks.banner('GOAL KICK');
        }
        if (this.pending)
            this.pending = null;
        this.beginRestart(kind, side, sx, sz);
    }
    beginRestart(kind, side, x, z) {
        const b = this.ball;
        b.place(x, z);
        this.owner = null;
        this.advantage = null;
        this.phase = 'dead';
        this.clearHumanInput();
        for (const p of this.players)
            p.gkHolding = false;
        // taker selection
        let taker;
        if (kind === 'goalkick')
            taker = this.gk(side);
        else if (kind === 'penalty')
            taker = [...this.team[side]].filter(p => p.role !== 'GK').sort((a, b) => (b.traits.shotAcc + b.traits.composure) - (a.traits.shotAcc + a.traits.composure))[0];
        else
            taker = [...this.team[side]].filter(p => p.role !== 'GK').sort((a, c) => d2(a, x, z) - d2(c, x, z))[0];
        // place the taker beside the ball, push opponents out of a 7 m radius (set pieces)
        const toward = this.dir(side);
        const back = kind === 'throw' ? { x: 0, z: z > 0 ? 0.8 : -0.8 } : { x: -toward * 0.8, z: 0 };
        taker.x = x + back.x;
        taker.z = z + back.z;
        taker.vx = taker.vz = 0;
        taker.heading = Math.atan2(-back.z, -back.x);
        if (kind !== 'goalkick')
            for (const q of this.team[1 - side]) {
                if (q.role === 'GK' && kind !== 'penalty')
                    continue;
                const dx = q.x - x, dz = q.z - z, d = Math.hypot(dx, dz);
                if (kind === 'penalty' && q.role === 'GK') {
                    q.x = this.ownGoalX(q.side);
                    q.z = 0;
                    continue;
                }
                if (d < 7.5) {
                    const k = (7.5 - d) / (d || 1);
                    q.x += dx * k + (dx === 0 ? 7 : 0);
                    q.z += dz * k;
                }
            }
        if (kind === 'penalty') {
            const lim = this.oppGoalX(side) - toward * (BOX_D + 1.5);
            for (const q of this.players) {
                if (q === taker || q.role === 'GK')
                    continue;
                if (this.inBox((1 - side), q.x, q.z))
                    q.x = lim;
            }
        }
        this.restart = { kind, side, x, z, timer: kind === 'penalty' ? 1.8 : 1.1, taker };
        this.selectControlled();
    }
    runRestart(dt) {
        const R = this.restart;
        R.timer -= dt;
        if (this.phase === 'kickoff')
            this.phase = 'kickoff';
        const taker = R.taker;
        taker.tx = taker.x;
        taker.tz = taker.z;
        if (R.timer > 0)
            return;
        const human = !this.autoPlay && R.side === this.humanSide;
        const inp = this.input;
        const waitedLong = R.timer < -5;
        if (human && !waitedLong) {
            // human takes it with a button release
            if (inp.action && !inp.actionHeld && this.prevHeld) {
                this.humanKick(taker, this.phase === 'shootout' ? 'shoot' : inp.action, true);
            }
            this.trackHold();
            return;
        }
        this.aiRestartKick(taker, R);
    }
    aiRestartKick(taker, R) {
        const s = this.dir(R.side), foe = this.oppGoalX(R.side);
        if (R.kind === 'penalty') {
            const side = this.rng.next() < 0.5 ? -1 : 1;
            const height = this.rng.next() < 0.72 ? this.rng.range(0.25, 0.85) : this.rng.range(1.35, 1.9);
            this.kick(taker, 'shot', foe, side * (this.P.goalWidth / 2 - 0.7), 0.85, { ty: height, eligibleOffside: false });
            return;
        }
        const mates = this.team[R.side].filter(q => q !== taker && q.role !== 'GK' || (R.kind === 'goalkick' && q.role === 'DEF'));
        if (R.kind === 'corner') {
            this.kick(taker, 'lob', foe - s * (6 + this.rng.next() * 6), this.rng.range(-5, 5), 0.8, { ty: 1.8, curve: R.z > 0 ? 0.6 : -0.6, eligibleOffside: false });
            return;
        }
        if (R.kind === 'goalkick') {
            const tgt = mates.sort((a, b) => b.depth - a.depth)[Math.floor(this.rng.next() * 3)] ?? taker;
            this.kick(taker, 'lob', tgt.x + s * 4, tgt.z, 0.9, { ty: 0.5, eligibleOffside: false });
            return;
        }
        const near = mates.map(q => ({ q, d: Math.hypot(q.x - taker.x, q.z - taker.z) })).filter(o => o.d > 4 && o.d < 28)
            .sort((a, b) => (b.q.x * s - b.d * 0.3) - (a.q.x * s - a.d * 0.3))[0]?.q ?? mates[0];
        if (!near) {
            this.kick(taker, 'pass', taker.x + s * 10, taker.z, 0.5, { eligibleOffside: false });
            return;
        }
        this.kick(taker, R.kind === 'throw' ? 'throw' : 'pass', near.x, near.z, 0.5, { eligibleOffside: R.kind !== 'throw' && R.kind !== 'kickoff' && false });
    }
    issueCard(offender, dangerous, fromBehind) {
        const repeatFouls = offender.yellowCards > 0;
        const redChance = dangerous && fromBehind && offender.speed > 5.5 ? 0.32 : 0;
        const directRed = redChance > 0 && this.rngRef.next() < redChance;
        const booked = dangerous || repeatFouls || this.rngRef.next() < 0.12;
        if (directRed) {
            offender.sentOff = true;
            offender.gkHolding = false;
            offender.vx = offender.vz = 0;
            offender.x = Math.max(-this.hx + 2, Math.min(this.hx - 2, offender.x));
            offender.z = offender.side === 0 ? this.hz + 3 : -this.hz - 3;
            this.metrics[offender.side].red_cards++;
            this.emit('red_card', offender.side, offender);
            this.hooks.banner('RED CARD');
            if (this.controlled === offender)
                this.setControlled(null);
        }
        else if (booked) {
            this.metrics[offender.side].yellow_cards++;
            offender.yellowCards++;
            if (offender.yellowCards >= 2) {
                offender.sentOff = true;
                offender.gkHolding = false;
                offender.vx = offender.vz = 0;
                offender.x = Math.max(-this.hx + 2, Math.min(this.hx - 2, offender.x));
                offender.z = offender.side === 0 ? this.hz + 3 : -this.hz - 3;
                this.metrics[offender.side].red_cards++;
                this.emit('red_card', offender.side, offender);
                this.hooks.banner('SECOND YELLOW · RED CARD');
                if (this.controlled === offender)
                    this.setControlled(null);
                return;
            }
            this.emit('yellow_card', offender.side, offender);
            this.hooks.banner('YELLOW CARD');
        }
    }
    callFoul(offender, victim, dangerous = false, fromBehind = false) {
        this.metrics[offender.side].fouls++;
        this.emit('foul', offender.side, offender);
        this.pending = null;
        this.hooks.banner('FOUL');
        const kind = this.inBox(offender.side, victim.x, victim.z) ? 'penalty' : 'free';
        this.issueCard(offender, dangerous, fromBehind);
        const spot = kind === 'penalty'
            ? { x: this.ownGoalX(offender.side) + this.dir(offender.side) * PEN_SPOT, z: 0 }
            : { x: victim.x, z: clampZ(victim.z, this.hz) };
        const clearAdvantage = this.owner?.side === victim.side &&
            (this.dir(victim.side) * victim.x > 0 || this.pressureOn(victim) < 0.45);
        if (clearAdvantage) {
            this.advantage = { side: victim.side, offender, victim, ...spot, kind, until: this.simT + 2.2 };
            this.hooks.banner('ADVANTAGE');
            return;
        }
        if (kind === 'penalty') {
            this.hooks.banner('PENALTY');
            this.beginRestart('penalty', victim.side, spot.x, spot.z);
        }
        else
            this.beginRestart('free', victim.side, spot.x, spot.z);
    }
    resolveAdvantage() {
        const advantage = this.advantage;
        if (!advantage || this.phase !== 'live')
            return;
        const lostPossession = this.owner && this.owner.side !== advantage.side;
        const expired = this.simT >= advantage.until;
        if (lostPossession || (expired && this.owner?.side !== advantage.side)) {
            this.advantage = null;
            this.beginRestart(advantage.kind, advantage.side, advantage.x, advantage.z);
            this.hooks.banner(advantage.kind === 'penalty' ? 'PENALTY' : 'FREE KICK');
        }
        else if (expired) {
            this.advantage = null;
            this.emit('advantage_played', advantage.side, advantage.victim);
        }
    }
    callOffside(p) {
        this.emit('offside', p.side, p);
        this.hooks.banner('OFFSIDE');
        this.pending = null;
        this.beginRestart('indirect', (1 - p.side), p.x, clampZ(p.z, this.hz));
    }
    goalScored(side) {
        this.advantage = null;
        this.score[side]++;
        this.lastShot = null;
        this.lastGoal = { side, t: this.simT };
        const scorer = this.lastToucher && this.lastToucher.side === side ? this.lastToucher : (this.prevToucher && this.prevToucher.side === side ? this.prevToucher : null);
        this.emit('goal', side, scorer);
        this.phase = 'goal';
        this.goalHold = 3.2;
        this.owner = null;
        this.restart = null;
        this.pending = null;
        this.clearHumanInput();
        this.setControlled(null);
        this.hooks.score(this.score[0], this.score[1]);
        this.hooks.goal(side);
    }
    /** engine may extend the hold while a replay plays */
    extendGoalHold(sec) { this.goalHold = Math.max(this.goalHold, sec); }
    endGoalSequence() { this.goalHold = 0; }
    afterGoal() {
        const conceded = (1 - (this.lastGoal?.side ?? 0));
        this.setupKickoff(conceded);
    }
    endHalf() {
        if (this.period === 1) {
            this.emit('half_time', null, null);
            this.hooks.banner('HALF TIME');
            this.period = 2;
            this.clockT = 0;
            this.stoppageT = 0;
            this.phase = 'dead';
            this.setupKickoff(1);
        }
        else if (this.period === 2 && this.knockout && this.score[0] === this.score[1] && this.extraTimeEnabled) {
            this.emit('extra_time', null, null);
            this.hooks.banner('EXTRA TIME');
            this.period = 3;
            this.clockT = 0;
            this.stoppageT = 0;
            this.setupKickoff(0);
        }
        else if (this.period === 3) {
            this.emit('extra_time_half', null, null);
            this.hooks.banner('EXTRA TIME · HALF TIME');
            this.period = 4;
            this.clockT = 0;
            this.stoppageT = 0;
            this.setupKickoff(1);
        }
        else if (this.knockout && this.score[0] === this.score[1]) {
            this.startShootout();
        }
        else {
            this.finishMatch();
        }
    }
    finishMatch() {
        this.emit('full_time', null, null);
        this.hooks.banner('FULL TIME');
        this.phase = 'fulltime';
        this.hooks.finished(this.result());
    }
    startShootout() {
        this.shootout = { scores: [0, 0], attempts: [0, 0], used: [new Set(), new Set()], current: null, side: 0 };
        this.phase = 'shootout';
        this.hooks.banner('PENALTY SHOOTOUT');
        this.setupShootoutAttempt(0);
    }
    setupShootoutAttempt(side) {
        const state = this.shootout;
        const candidates = this.team[side].filter(p => p.role !== 'GK' && !p.sentOff && !state.used[side].has(p.id));
        const pool = candidates.length ? candidates : this.team[side].filter(p => p.role !== 'GK' && !p.sentOff);
        const taker = [...pool].sort((a, b) =>
            (b.traits.penalties * 0.65 + b.traits.shotAcc * 0.2 + b.traits.composure * 0.15) -
            (a.traits.penalties * 0.65 + a.traits.shotAcc * 0.2 + a.traits.composure * 0.15))[0];
        if (!taker) {
            this.finishMatch();
            return;
        }
        state.used[side].add(taker.id);
        const x = this.oppGoalX(side) - this.dir(side) * PEN_SPOT;
        const keeper = this.gk(1 - side);
        for (const p of this.players) {
            p.gkHolding = false;
            p.dive = null;
            p.touchCd = 0;
            p.tackleCd = 0;
            p.stun = 0;
            p.vx = p.vz = 0;
            p.tx = p.x;
            p.tz = p.z;
        }
        taker.x = x - this.dir(side) * 0.8;
        taker.z = 0;
        taker.tx = taker.x;
        taker.tz = 0;
        taker.heading = side === 0 ? 0 : Math.PI;
        keeper.x = this.oppGoalX(side);
        keeper.z = 0;
        keeper.tx = keeper.x;
        keeper.tz = 0;
        keeper.heading = side === 0 ? Math.PI : 0;
        this.ball.place(x, 0);
        this.owner = null;
        this.restart = { kind: 'penalty', side, x, z: 0, timer: 1.8, taker };
        state.side = side;
        state.current = { side, taker, kicked: false, age: 0 };
        this.selectControlled();
    }
    stepShootout(dt) {
        if (this.restart) {
            this.runRestart(dt);
            return;
        }
        const shot = this.shootout?.current;
        if (!shot?.kicked)
            return;
        shot.age += dt;
        this.ball.step(dt, 4);
        const keeper = this.gk(1 - shot.side);
        goalkeeperThink(this, keeper, dt);
        const crossedGoal = (this.ball.x - this.oppGoalX(shot.side)) * this.dir(shot.side) >= 0;
        const scored = crossedGoal && Math.abs(this.ball.z) < this.P.goalWidth / 2 - this.P.ballRadius &&
            this.ball.y < this.P.goalHeight - this.P.ballRadius;
        const missed = this.owner === keeper || Math.abs(this.ball.z) > this.hz + this.P.ballRadius ||
            Math.abs(this.ball.x) > this.hx + this.P.ballRadius || shot.age > 4 ||
            (shot.age > 0.8 && this.ball.speed < 0.5);
        if (scored || missed)
            this.resolveShootoutKick(scored);
    }
    resolveShootoutKick(scored) {
        const state = this.shootout, shot = state.current, side = shot.side;
        state.attempts[side]++;
        if (scored)
            state.scores[side]++;
        this.emit(scored ? 'penalty_scored' : 'penalty_missed', side, shot.taker);
        this.hooks.banner(scored ? 'PENALTY SCORED' : 'PENALTY SAVED');
        const remaining = [0, 1].map(team => Math.max(0, 5 - state.attempts[team]));
        const decided = (state.attempts[0] >= 5 && state.attempts[1] >= 5 && state.scores[0] !== state.scores[1]) ||
            state.scores[0] > state.scores[1] + remaining[1] ||
            state.scores[1] > state.scores[0] + remaining[0];
        if (decided) {
            state.winner = state.scores[0] > state.scores[1] ? 0 : 1;
            this.finishShootout();
            return;
        }
        const nextSide = state.attempts[0] === state.attempts[1] ? 0 : state.attempts[0] < state.attempts[1] ? 0 : 1;
        state.current = null;
        this.setupShootoutAttempt(nextSide);
    }
    finishShootout() {
        this.shootout.complete = true;
        this.emit('shootout_complete', this.shootout.winner, null);
        this.hooks.banner(`${this.shootout.winner === 0 ? 'HOME' : 'AWAY'} WIN ON PENALTIES`);
        this.phase = 'fulltime';
        this.hooks.finished(this.result());
    }
    // ───────────────────────── human control
    clearHumanInput(record = false) {
        const idle = { move: { x: 0, y: 0 }, sprint: false, action: null, actionHeld: false, modifier: null, switch: false };
        if (record)
            this.setInput(idle);
        else
            this.input = idle;
        this.prevHeld = false;
        this.holdT = 0;
        this.manualSwitchRequested = false;
    }
    setControlled(player, manual = false) {
        const next = player && !player.sentOff ? player : null;
        if (this.controlled === next)
            return;
        const previous = this.controlled;
        if (previous) {
            previous.humanControlled = false;
            if (previous.runUntil > this.simT && previous.runTarget) {
                previous.tx = previous.runTarget.x;
                previous.tz = previous.runTarget.z;
                previous.speedFrac = 1;
                previous.sprint = true;
            }
            else {
                previous.tx = previous.x + previous.vx * 0.5;
                previous.tz = previous.z + previous.vz * 0.5;
                previous.speedFrac = previous.speed > 0.5 ? 0.7 : 0;
                previous.sprint = false;
            }
            previous.thinkCd = 0.4;
        }
        this.controlled = next;
        this.controlledSince = this.simT;
        this.noInputT = 0;
        this.switchT = 0;
        this.holdT = 0;
        if (next) {
            next.humanControlled = true;
            next.tx = next.x;
            next.tz = next.z;
            next.speedFrac = 0;
            next.sprint = false;
            next.thinkCd = 0;
            next.turnRate = 0;
            next.kickT = 0;
        }
        if (manual && next)
            this.emit('switch', next.side, next);
    }
    trackHold() {
        const i = this.input;
        if (i.actionHeld)
            this.holdT += DT;
        else if (!this.prevHeld)
            this.holdT = 0;
    }
    selectControlled() {
        const side = this.humanSide, team = this.team[side];
        const b = this.ball;
        const field = team.filter(p => p.role !== 'GK' && !p.sentOff);
        if (this.autoPlay || this.phase === 'goal' || this.phase === 'fulltime') {
            this.setControlled(null);
            return;
        }
        if (this.restart) {
            this.setControlled(this.restart.side === side ? this.restart.taker : null);
            return;
        }
        if (this.phase !== 'live') {
            this.setControlled(null);
            return;
        }
        if (this.owner && this.owner.side === side && this.owner.role !== 'GK') {
            if (this.ownerCandidate !== this.owner) {
                this.ownerCandidate = this.owner;
                this.ownerCandidateSince = this.simT;
                this.owner.tx = this.owner.x;
                this.owner.tz = this.owner.z;
                this.owner.speedFrac = 0;
                this.owner.sprint = false;
            }
            if (this.simT - this.ownerCandidateSince >= 0.1)
                this.setControlled(this.owner);
            return;
        }
        this.ownerCandidate = null;
        this.ownerCandidateSince = this.simT;
        if (this.owner && this.owner.side === side && this.owner.role === 'GK' && this.owner.gkHolding) {
            this.setControlled(this.owner);
            return;
        }
        if (this.manualSwitchRequested) {
            this.manualSwitchRequested = false;
            const stick = this.input.move;
            const mag = Math.hypot(stick.x, stick.y);
            let ranked = field;
            if (mag > 0.1) {
                const wx = this.camF.x * stick.y + this.camF.z * stick.x;
                const wz = this.camF.z * stick.y - this.camF.x * stick.x;
                const n = Math.hypot(wx, wz) || 1;
                const dx = wx / n, dz = wz / n;
                ranked = field.filter(p => {
                    const px = p.x - (this.controlled?.x ?? b.x), pz = p.z - (this.controlled?.z ?? b.z);
                    const length = Math.hypot(px, pz);
                    return length < 0.01 || (px * dx + pz * dz) / length >= Math.cos(Math.PI / 3);
                });
            }
            const carrierTarget = this.owner && this.owner.side !== side
                ? { x: this.owner.x + this.owner.vx * 0.3, z: this.owner.z + this.owner.vz * 0.3 }
                : { x: b.x, z: b.z };
            const ordered = mag > 0.1
                ? ranked.map(p => ({ p, distance: Math.hypot(p.x - b.x, p.z - b.z) }))
                    .sort((a, c) => a.distance - c.distance || a.p.id - c.p.id)
                : this.owner && this.owner.side !== side
                    ? this.rankByIntercept(ranked, carrierTarget)
                    : (this.bestBallIntercept(ranked)?.ranked ?? this.rankByIntercept(ranked, carrierTarget));
            const currentIndex = ordered.findIndex(item => item.p === this.controlled);
            const next = mag > 0.1 ? ordered[0]?.p : ordered[(currentIndex + 1) % Math.max(ordered.length, 1)]?.p;
            if (next && next !== this.controlled) {
                this.setControlled(next, true);
                this.manualSwitchUntil = this.simT + 1.2;
            }
            return;
        }
        const kickedThisTick = this.lastKickTick === this.tick;
        if (!kickedThisTick && this.simT < this.manualSwitchUntil)
            return;
        if (!kickedThisTick && this.tick % 6 !== 0 && this.controlled && field.includes(this.controlled))
            return;
        let target;
        let predicted = false;
        if (this.owner && this.owner.side !== side) {
            target = { x: this.owner.x + this.owner.vx * 0.3, z: this.owner.z + this.owner.vz * 0.3 };
        }
        else if (kickedThisTick || b.hSpeed > 1) {
            target = this.bestBallIntercept(field);
            predicted = true;
        }
        else {
            target = { x: b.x, z: b.z };
        }
        const ranked = predicted ? target?.ranked : this.rankByIntercept(field, target);
        const candidate = ranked?.[0]?.p ?? null;
        if (!candidate)
            return;
        if (kickedThisTick || !this.controlled || !field.includes(this.controlled)) {
            this.setControlled(candidate);
            return;
        }
        const current = ranked.find(item => item.p === this.controlled);
        const challenger = ranked[0];
        if (!current || challenger.p === this.controlled)
            return;
        if (this.simT - this.controlledSince < 0.4)
            return;
        const candidateIsClearlyBetter = challenger.eta + 0.25 < current.eta || challenger.distance + 1.5 < current.distance;
        if (candidateIsClearlyBetter)
            this.setControlled(challenger.p);
    }
    rankByIntercept(players, target) {
        return players.map(p => ({
            p,
            eta: Math.hypot(target.x - p.x, target.z - p.z) / Math.max(1, p.traits.vMax) + p.stun,
            distance: Math.hypot(target.x - p.x, target.z - p.z),
        })).sort((a, b) => a.eta - b.eta || a.p.id - b.p.id);
    }
    bestBallIntercept(players) {
        const best = new Map();
        const at = { x: 0, y: 0, z: 0 };
        for (let t = 0.1; t <= 1.2001; t += 0.1) {
            this.ball.predict(t, at);
            for (const item of this.rankByIntercept(players, at)) {
                const arrival = item.distance / Math.max(1, item.p.traits.vMax) + item.p.stun;
                const eta = Math.max(0, arrival - t) + t * 0.015;
                const prior = best.get(item.p);
                if (!prior || eta < prior.eta)
                    best.set(item.p, { ...item, eta });
            }
        }
        const ranked = [...best.values()].sort((a, b) => a.eta - b.eta || a.p.id - b.p.id);
        const target = ranked[0] ? { x: ranked[0].p.x, z: ranked[0].p.z, ranked } : null;
        return target;
    }
    handleHuman(dt) {
        if (this.phase === 'goal' || this.autoPlay)
            return;
        const p = this.controlled;
        if (!p)
            return;
        const i = this.input;
        const f = this.camF, rx = f.z, rz = -f.x;
        const mag = Math.hypot(i.move.x, i.move.y);
        this.noInputT = mag > 0.1 ? 0 : this.noInputT + dt;
        if (mag > 0.01) {
            const wx = f.x * i.move.y + rx * i.move.x, wz = f.z * i.move.y + rz * i.move.x;
            const n = Math.hypot(wx, wz) || 1;
            const reach = 40;
            p.tx = p.x + (wx / n) * reach;
            p.tz = p.z + (wz / n) * reach;
            p.speedFrac = Math.min(1, mag) * (i.sprint ? 1 : 0.8);
            p.sprint = i.sprint;
        }
        else {
            if (this.noInputT > 1.5 && this.owner !== p) {
                const target = this.homeSpot(p);
                p.tx = target.x;
                p.tz = target.z;
                p.speedFrac = 0.35;
            }
            else {
                p.tx = p.x;
                p.tz = p.z;
                p.speedFrac = 0;
            }
            p.sprint = false;
        }
        // actions
        if (this.restart && this.restart.side === this.humanSide) {
            this.prevHeld = i.actionHeld;
            return;
        }
        if (this.phase !== 'live') {
            this.prevHeld = false;
            return;
        }
        if (i.actionHeld)
            this.holdT += dt;
        else if (!this.prevHeld)
            this.holdT = 0;
        const act = i.action;
        if (act === 'tackle' || act === 'slide') {
            if (i.actionHeld && !this.prevHeld) {
                const carrier = this.owner;
                if (carrier && carrier.side !== p.side) {
                    const dx = carrier.x - p.x, dz = carrier.z - p.z, dist = Math.hypot(dx, dz);
                    const facing = (dx * Math.cos(p.heading) + dz * Math.sin(p.heading)) / (dist || 1);
                    if (dist <= 2.3 && facing >= Math.cos((100 * Math.PI) / 180))
                        p.heading = Math.atan2(dz, dx);
                }
                this.tackle(p, act === 'slide');
            }
        }
        else if (act && this.prevHeld && !i.actionHeld) {
            if (this.owner === p || (this.ball.hSpeed < 3 && Math.hypot(this.ball.x - p.x, this.ball.z - p.z) < 1.3))
                this.humanKick(p, act, false);
        }
        else if (act && i.actionHeld && this.holdT > 1.3 && this.owner === p)
            this.humanKick(p, act, false);
        this.prevHeld = i.actionHeld;
    }
    humanKick(p, act, restart) {
        const charge = Math.min(1, this.holdT / 0.9);
        this.holdT = 0;
        const i = this.input, f = this.camF;
        const mag = Math.hypot(i.move.x, i.move.y);
        let ax = Math.cos(p.heading), az = Math.sin(p.heading);
        if (mag > 0.2) {
            const wx = f.x * i.move.y + f.z * i.move.x, wz = f.z * i.move.y - f.x * i.move.x, n = Math.hypot(wx, wz) || 1;
            ax = wx / n;
            az = wz / n;
        }
        const s = this.dir(p.side);
        if (act === 'shoot' || act === 'cross') {
            const gx = this.oppGoalX(p.side), hzg = this.P.goalWidth / 2;
            const aim = mag > 0.2 ? i.move.x : 0;
            const gz = Math.max(-(hzg - 0.35), Math.min(hzg - 0.35, aim * (hzg - 0.35) * 0.75));
            const farShot = Math.abs(gx - p.x) > 38;
            this.kick(p, 'shot', farShot && mag > 0.2 ? p.x + ax * 30 : gx, farShot && mag > 0.2 ? p.z + az * 30 : gz, 0.45 + 0.55 * charge, { ty: 0.4 + charge * 1.5, curve: 0, animationKind: this.ball.y > 1.25 ? 'head' : undefined });
            return;
        }
        // choose a receiver aligned with the stick (or best forward option when neutral)
        const mates = this.team[p.side].filter(q => q !== p && q.role !== 'GK');
        let best = null, bs = -1e9;
        for (const q of mates) {
            const dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz) || 1;
            if (d < 3)
                continue;
            const align = (dx * ax + dz * az) / d;
            if (mag > 0.2 && align < Math.cos(Math.PI * 35 / 180))
                continue;
            const tx = q.x + q.vx * (d / 15), tz = q.z + q.vz * (d / 15);
            let laneOpen = 99;
            for (const opponent of this.team[1 - p.side]) {
                const ox = tx - p.x, oz = tz - p.z, length2 = ox * ox + oz * oz || 1;
                const t = Math.max(0, Math.min(1, ((opponent.x - p.x) * ox + (opponent.z - p.z) * oz) / length2));
                laneOpen = Math.min(laneOpen, Math.hypot(opponent.x - (p.x + ox * t), opponent.z - (p.z + oz * t)));
            }
            const progress = (q.x - p.x) * s;
            const sc = (mag > 0.2 ? align * 12 : progress * 0.25) + Math.min(3, laneOpen) * 0.9 - d * 0.12 - this.pressureOn(q) * 3;
            if (sc > bs) {
                bs = sc;
                best = q;
            }
        }
        const kind = act === 'through' ? 'through' : act === 'lob' ? 'lob' : 'pass';
        if (best) {
            let tx = best.x, tz = best.z;
            if (kind === 'through') {
                const flightT = Math.min(1.5, Math.hypot(tx - p.x, tz - p.z) / 18);
                tx += best.vx * flightT + s * 8;
                tz += best.vz * flightT;
            }
            else {
                const t = Math.hypot(tx - p.x, tz - p.z) / 14;
                tx += best.vx * t;
                tz += best.vz * t;
            }
            tx = Math.max(-this.hx + 1, Math.min(this.hx - 1, tx));
            tz = Math.max(-this.hz + 1, Math.min(this.hz - 1, tz));
            this.kick(p, kind, tx, tz, 0.3 + 0.7 * charge, { ty: 0.11, eligibleOffside: !restart, animationKind: this.ball.y > 1.25 ? 'head' : undefined });
        }
        else {
            const dist = 8 + 20 * charge;
            this.kick(p, kind === 'pass' ? 'pass' : kind, p.x + ax * dist, p.z + az * dist, 0.3 + 0.7 * charge, { eligibleOffside: !restart, animationKind: this.ball.y > 1.25 ? 'head' : undefined });
        }
    }
    // ───────────────────────── output
    emit(type, side, actor) {
        const e = { type, side, t: this.simT, period: this.period, actorId: actor?.playerId, x: this.ball.x, z: this.ball.z };
        this.hooks.event(e);
        this.events.push({
            event_sequence: ++this.seq, event_type: type, simulation_time_seconds: Math.round(this.simT * 100) / 100, period_number: this.period,
            team_side: side === null ? 'neutral' : side === 0 ? 'home' : 'away', actor_player_id: actor?.playerId,
            position_payload: { x: Math.round(this.ball.x * 10) / 10, z: Math.round(this.ball.z * 10) / 10 },
        });
    }
    liveState() {
        const totalPossession = this.possT[0] + this.possT[1] || 1;
        const metrics = this.metrics.map((item, side) => ({
            ...item,
            possession_percent: Math.round(this.possT[side] / totalPossession * 1000) / 10,
            pass_accuracy_percent: item.passes_attempted
                ? Math.round(item.passes_completed / item.passes_attempted * 1000) / 10
                : 0,
        }));
        const selected = this.controlled;
        const periodLen = this.period >= 3 ? this.extraTimeHalfLen : this.halfLen;
        const addedTime = Math.min(15, 3 + this.stoppageT);
        return {
            phase: this.phase,
            score: { home: this.score[0], away: this.score[1] },
            clock: { seconds: this.clockT, period: this.period, label: this.clockLabel, addedTime: Math.max(0, this.clockT - periodLen) },
            metrics: { home: metrics[0], away: metrics[1] },
            ball: { x: this.ball.x, z: this.ball.z, height: this.ball.y },
            pitch: { halfLength: this.hx, halfWidth: this.hz },
            players: this.players.map(p => ({ id: p.id, side: p.side, x: p.x, z: p.z, stamina: p.stamina, number: p.num, sentOff: p.sentOff })),
            selected: selected ? { side: selected.side, number: selected.num, stamina: selected.stamina, role: selected.role } : null,
            weather: this.weather,
            shootout: this.shootout ? { scores: [...this.shootout.scores], attempts: [...this.shootout.attempts] } : null,
            addedTime,
        };
    }
    get clockLabel() {
        const base = this.period === 1 ? 0 : this.period === 2 ? 45 * 60 : this.period === 3 ? 90 * 60 : this.period === 4 ? 105 * 60 : 120 * 60;
        const periodLen = this.period >= 3 ? this.extraTimeHalfLen : this.halfLen;
        const scale = this.period >= 3 ? 15 * 60 / this.extraTimeHalfLen : this.halfLenScale;
        const gameSec = base + Math.min(this.clockT, periodLen + Math.min(15, 3 + this.stoppageT)) * scale;
        const m = Math.floor(gameSec / 60), s = Math.floor(gameSec % 60);
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    result() {
        const tot = this.possT[0] + this.possT[1] || 1;
        const fin = (s) => {
            const m = { ...this.metrics[s] };
            m.possession_percent = Math.round((this.possT[s] / tot) * 1000) / 10;
            m.pass_accuracy_percent = m.passes_attempted ? Math.round((m.passes_completed / m.passes_attempted) * 1000) / 10 : 0;
            return m;
        };
        return {
            home_score: this.score[0], away_score: this.score[1],
            metrics: { home: fin(0), away: fin(1) }, events: this.events,
            input_log: this.inputLog,
            ...(this.shootout ? { shootout_score: { home: this.shootout.scores[0], away: this.shootout.scores[1], winner: this.shootout.winner } } : {}),
            match_ended_at: new Date().toISOString(), simulation_build: this.build,
        };
    }
}
// helpers
const numOf = (slot) => parseInt(String(slot).replace(/\D/g, ''), 10) || 0;
const wrap = (a) => { while (a > Math.PI)
    a -= 2 * Math.PI; while (a < -Math.PI)
    a += 2 * Math.PI; return a; };
const d2 = (p, x, z) => (p.x - x) ** 2 + (p.z - z) ** 2;
const clampZ = (z, hz) => Math.max(-hz + 0.5, Math.min(hz - 0.5, z));
const sameInput = (a, b) => a.move.x === b.move.x && a.move.y === b.move.y && a.sprint === b.sprint &&
    a.action === b.action && a.actionHeld === b.actionHeld && a.modifier === b.modifier && a.switch === b.switch;
