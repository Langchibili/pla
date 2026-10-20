import { curve } from '../core/params';
import { TUNE } from '../core/tuning';
const sig = (x) => 1 / (1 + Math.exp(-x));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function distToSeg(px, pz, ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
    const t = clamp(((px - ax) * dx + (pz - az) * dz) / l2, 0, 1);
    return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}
const tmp = { x: 0, y: 0, z: 0 };
/**
 * Layered AI, run at ~10 Hz:
 *   team brain   → possession state, formation shift, who chases / presses
 *   player brain → utility-scored shoot / pass / dribble / clear for the ball carrier; marking & support otherwise
 * Goalkeepers are handled separately (goalkeeperThink, every tick).
 */
export function aiThink(w, decisionDt = 0.1) {
    if (w.phase === 'goal' || w.phase === 'fulltime')
        return;
    const live = w.phase === 'live' || w.phase === 'shootout';
    const periodLen = w.period >= 3 ? w.extraTimeHalfLen : w.halfLen;
    const remaining = Math.max(0, periodLen + Math.min(15, 3 + w.stoppageT) - w.clockT);
    if (w.restart?.kind === 'corner' && w.restart.side === side && remaining < 12 &&
        w.score[side] < w.score[1 - side]) {
        g.tx = w.oppGoalX(side) - d * 2;
        g.tz = 0;
        g.speedFrac = 1;
        g.sprint = true;
        return;
    }
    const b = w.ball;
    for (const side of [0, 1]) {
        const d = w.dir(side), opp = w.team[1 - side].filter(p => !p.sentOff);
        const attacking = w.owner ? w.owner.side === side : w.lastTouchSide === side;
        const periodLen = w.period >= 3 ? w.extraTimeHalfLen : w.halfLen;
        const remaining = Math.max(0, periodLen + Math.min(15, 3 + w.stoppageT) - w.clockT);
        const late = w.phase === 'live' && remaining < 15;
        const leadingLate = late && w.score[side] > w.score[1 - side];
        const chasingLate = late && w.score[side] < w.score[1 - side];
        const restartSide = w.restart?.side;
        const bd = (b.x * d + w.hx) / w.L;
        const oppLine = w.offsideLine(side, b.x); // attack-direction x of the offside line
        const lineDepth = (oppLine + w.hx) / w.L;
        // chasers
        const field = w.team[side].filter(p => p.role !== 'GK' && !p.sentOff);
        const target = w.owner && w.owner.side !== side ? { x: w.owner.x + w.owner.vx * 0.3, z: w.owner.z + w.owner.vz * 0.3 } : (() => {
            if (b.hSpeed > 1) {
                b.predict(Math.min(1.2, 0.5 + b.hSpeed * 0.03), tmp);
                return { x: tmp.x, z: tmp.z };
            }
            return { x: b.x, z: b.z };
        })();
        let chasers = [];
        let cover = null;
        if (live) {
            const own = w.owner;
            if (!own || own.side !== side) {
                const ranked = field
                    .filter(p => w.autoPlay || !p.humanControlled)
                    .map(p => ({ p, eta: Math.hypot(target.x - p.x, target.z - p.z) / p.traits.vMax + p.stun }))
                    .sort((a, c) => a.eta - c.eta);
                chasers = ranked.slice(0, 1).map(o => o.p);
                cover = own && ranked[1]?.p;
            }
        }
        for (const p of field) {
            if (!w.autoPlay && (p.humanControlled || (p.side === w.humanSide && p === w.ownerCandidate)))
                continue;
            const isTaker = w.restart?.taker === p;
            if (isTaker)
                continue;
            const wasOwner = w.owner === p;
            // positional target (formation shifting)
            const k = p.role === 'DEF' ? 0.45 : p.role === 'MID' ? 0.58 : 0.5;
            let depth = p.depth + (bd - 0.5) * k + (attacking ? (p.role === 'DEF' ? 0.04 : 0.08) : -0.05);
            if (leadingLate && !attacking)
                depth -= p.role === 'DEF' ? 0.035 : 0.06;
            if (chasingLate && attacking)
                depth += p.role === 'FWD' ? 0.12 : 0.06;
            if (attacking && p.role === 'FWD' && live)
                depth = Math.min(0.96, Math.max(depth, lineDepth - 0.012));
            depth = clamp(depth, 0.03, 0.97);
            const base = w.homeSpot(p);
            let tz = base.z * (attacking ? 1.05 : 0.82) + clamp(b.z / w.hz, -1, 1) * 5;
            let tx = d * (-w.hx + depth * w.L);
            p.speedFrac = 0.62;
            p.sprint = false;
            if (!live) {
                if (w.restart?.kind === 'kickoff') {
                    const s = w.homeSpot(p, true);
                    tx = s.x;
                    tz = s.z;
                }
                else if (w.restart?.kind === 'penalty') {
                    tx = p.x;
                    tz = p.z;
                }
                if (w.restart && p.side !== w.restart.side && Math.hypot(p.x - w.restart.x, p.z - w.restart.z) < 7.5) {
                    const dx = p.x - w.restart.x, dz = p.z - w.restart.z, distance = Math.hypot(dx, dz) || 1;
                    tx = w.restart.x + dx / distance * 7.5;
                    tz = w.restart.z + dz / distance * 7.5;
                }
                p.tx = tx;
                p.tz = clamp(tz, -w.hz + 1, w.hz - 1);
                p.speedFrac = 0.75;
                continue;
            }
            if (!attacking && p.role === 'DEF') {
                const defenders = w.team[side].filter(q => q.role === 'DEF' && !q.sentOff);
                if (defenders.length > 1) {
                    const line = defenders.reduce((sum, q) => sum + d * q.x, 0) / defenders.length;
                    const ballLine = d * b.x - clamp(10 + Math.abs(b.x - (w.owner?.x ?? b.x)) * 0.12, 8, 17);
                    const cohesiveLine = clamp(line * 0.35 + ballLine * 0.65, 2, w.hx - 2);
                    tx = d * cohesiveLine;
                }
            }
            if (wasOwner) {
                ownerDecide(w, p, decisionDt);
                continue;
            }
            if (chasers.includes(p)) {
                const carrier = w.owner && w.owner.side !== side ? w.owner : null;
                let chaseTarget = target;
                if (carrier) {
                    const dx = carrier.x - p.x, dz = carrier.z - p.z, distance = Math.hypot(dx, dz) || 1;
                    const advance = Math.max(0, distance - 1.8);
                    chaseTarget = {
                        x: p.x + dx / distance * advance,
                        z: clamp(p.z + dz / distance * advance + Math.sign(carrier.z || 1) * 0.6, -w.hz + 2, w.hz - 2),
                    };
                }
                p.tx = chaseTarget.x;
                p.tz = chaseTarget.z;
                const dist = Math.hypot(chaseTarget.x - p.x, chaseTarget.z - p.z);
                p.sprint = dist > 3;
                p.speedFrac = 1;
                if (carrier && !carrier.gkHolding && p.tackleCd <= 0 && w.aiTacklesThisMinute[side] < 12) {
                    const dx = carrier.x - p.x, dz = carrier.z - p.z, distance = Math.hypot(dx, dz);
                    const facing = (dx * Math.cos(p.heading) + dz * Math.sin(p.heading)) / (distance || 1);
                    const facingOwnGoal = Math.cos(carrier.heading) * w.dir(carrier.side) < -0.25;
                    const triggered = carrier.heavyTouchT > 0 || facingOwnGoal || Math.abs(carrier.turnRate) > 2.4;
                    const configuredPressingCap = Number(w.cfg.difficulty?.pressingIntensityCap ?? 0.8);
                    const pressingCap = Number.isFinite(configuredPressingCap) ? configuredPressingCap : 0.8;
                    const tackleLimit = Math.max(4, Math.min(12, Math.round(4 + pressingCap * 10)));
                    if (triggered && distance <= 2.3 && facing > Math.cos(100 * Math.PI / 180) && w.aiTacklesThisMinute[side] < tackleLimit) {
                        w.aiTacklesThisMinute[side]++;
                        const chance = TUNE.tackleAttempt * (0.16 + 0.2 * p.traits.aggression) *
                            clamp((2.3 - distance) / 1.3, 0.15, 1) * clamp((facing + 0.2) / 1.2, 0.1, 1);
                        if (w.rng.next() < chance)
                            w.tackle(p, distance < 1.35 && carrier.speed > 6.5 && w.rng.next() < 0.08);
                    }
                }
                continue;
            }
            if (cover === p && w.owner) {
                const carrier = w.owner;
                const retreat = clamp(4 + p.depth * 2, 4, 6);
                p.tx = clamp(carrier.x - d * retreat, -w.hx + 2, w.hx - 2);
                p.tz = clamp(carrier.z * 0.7 + base.z * 0.3, -w.hz + 2, w.hz - 2);
                p.speedFrac = 0.78;
                p.sprint = false;
                continue;
            }
            // defenders pick up the most dangerous nearby runner
            if (!attacking && (p.role === 'DEF' || p.role === 'MID')) {
                let mark = null, md = 11;
                for (const q of opp) {
                    if (q.role === 'GK' || q === w.owner)
                        continue;
                    if (q.depth < 0.5 && p.role === 'DEF')
                        continue;
                    const dd = Math.hypot(q.x - tx, q.z - tz);
                    if (dd < md && (q.x - tx) * d > -4) {
                        md = dd;
                        mark = q;
                    }
                }
                if (mark && md < 10) {
                    tx = mark.x - d * 1.6;
                    tz = mark.z * 0.9 + tz * 0.1;
                    p.speedFrac = 0.8;
                }
            }
            if (p.runUntil > w.simT && p.runTarget) {
                p.tx = clamp(p.runTarget.x, -w.hx + 2, w.hx - 2);
                p.tz = clamp(p.runTarget.z, -w.hz + 1.5, w.hz - 1.5);
                p.speedFrac = 1;
                p.sprint = true;
                continue;
            }
            // Supporting players spread to either side of the carrier as passing options.
            if (attacking && w.owner && w.owner.side === side && p.role !== 'DEF') {
                const o = w.owner;
                const options = field
                    .filter(q => q !== o && q.role !== 'DEF' && !q.sentOff && (w.autoPlay || !q.humanControlled))
                    .sort((a, c) => Math.hypot(a.x - o.x, a.z - o.z) - Math.hypot(c.x - o.x, c.z - o.z))
                    .slice(0, 2);
                const index = options.indexOf(p);
                if (index >= 0) {
                    const sign = index === 0 ? -1 : 1;
                    const angle = 38 * Math.PI / 180;
                    const forwardRun = p.role === 'FWD' && index === 1;
                    tx = forwardRun
                        ? d * Math.min(d * o.x + 15, w.offsideLine(side, b.x) - 0.7)
                        : o.x + d * Math.cos(angle) * 11;
                    tz = clamp(o.z + sign * Math.sin(angle) * 11, -w.hz + 3, w.hz - 3);
                    p.speedFrac = 0.9;
                }
            }
            if (attacking && w.owner && w.owner.side === side && p.role === 'DEF' &&
                (p.num === 2 || p.num === 5) && Math.abs(w.owner.z) > w.hz * 0.55) {
                tx = w.owner.x + d * 9;
                tz = Math.sign(w.owner.z) * (w.hz - 3);
                p.speedFrac = 0.92;
                p.sprint = true;
            }
            p.tx = clamp(tx, -w.hx + 2, w.hx - 2);
            p.tz = clamp(tz, -w.hz + 1.5, w.hz - 1.5);
        }
    }
}
function ownerDecide(w, p, decisionDt) {
    p.thinkCd -= decisionDt;
    if (p.thinkCd > 0) {
        return;
    }
    const configuredReaction = Number(w.cfg.difficulty?.reactionTimeMs ?? 200);
    const reactionScale = Number.isFinite(configuredReaction) ? clamp(configuredReaction / 200, 0.65, 1.6) : 1;
    const temperature = Number(w.cfg.difficulty?.decisionTemperatureMultiplier ?? 1);
    const temperatureScale = Number.isFinite(temperature) ? clamp(temperature, 0.5, 2.5) : 1;
    p.thinkCd = (curve(1 - p.traits.composure, 0.12, 0.5) + w.rng.next() * 0.15 * temperatureScale) * reactionScale;
    const side = p.side, d = w.dir(side), T = p.traits;
    const opp = w.team[1 - side].filter(q => !q.sentOff);
    const goalX = w.oppGoalX(side), hzg = w.P.goalWidth / 2;
    const dGoal = Math.hypot(goalX - p.x, p.z);
    const pressure = w.pressureOn(p);
    const periodLen = w.period >= 3 ? w.extraTimeHalfLen : w.halfLen;
    const remaining = Math.max(0, periodLen + Math.min(15, 3 + w.stoppageT) - w.clockT);
    if (remaining < 12 && w.score[side] > w.score[1 - side] && dGoal > 16) {
        const cornerZ = p.z >= 0 ? w.hz - 1.2 : -w.hz + 1.2;
        p.tx = w.oppGoalX(side) - d * 1.5;
        p.tz = cornerZ;
        p.speedFrac = 0.35;
        p.sprint = false;
        return;
    }
    // ── shoot?
    const laneMin = opp.reduce((m, q) => Math.min(m, distToSeg(q.x, q.z, p.x, p.z, goalX, 0)), 99);
    const open = sig((laneMin - 1.4) / 0.8);
    const xg = sig(-(dGoal - 17) / 4.5) * (0.5 + 0.5 * open) * (0.6 + 0.4 * T.shotAcc);
    w.debug.xg = xg;
    const lateRemaining = Math.max(0, (w.period >= 3 ? w.extraTimeHalfLen : w.halfLen) + Math.min(15, 3 + w.stoppageT) - w.clockT);
    const losingLate = lateRemaining < 15 && w.score[side] < w.score[1 - side];
    const protectingLead = lateRemaining < 15 && w.score[side] > w.score[1 - side];
    const thr = (p.role === 'FWD' ? 0.09 : p.role === 'MID' ? 0.11 : 0.16) * TUNE.shootThreshold * (losingLate ? 0.62 : 1);
    if ((!protectingLead || dGoal < 18) && dGoal < (losingLate ? 40 : 31) && (xg > thr || (pressure > 0.7 && dGoal < 24 && xg > 0.05))) {
        const gk = w.gk((1 - side));
        const away = gk.z > 0.3 ? -1 : 1;
        const zT = clamp(away * (hzg - 0.65) * (0.55 + 0.45 * T.shotAcc) + w.rng.gauss() * 0.4, -hzg + 0.3, hzg - 0.3);
        w.kick(p, 'shot', goalX, zT, 0.82 + 0.18 * w.rng.next(), { ty: w.rng.range(0.3, 1.7), curve: dGoal > 16 ? (zT > 0 ? -0.5 : 0.5) * T.curveSkill : 0 });
        return;
    }
    // ── dribble value
    let free = 6;
    for (const q of opp) {
        const dx = q.x - p.x, dz = q.z - p.z, dd = Math.hypot(dx, dz);
        if (dd > 7 || dd < 0.01)
            continue;
        if ((dx * d) / dd > 0.5)
            free = Math.min(free, dd);
    }
    const freeN = clamp(free / 6, 0, 1);
    const dribVal = 0.05 + 0.33 * freeN * (p.role === 'FWD' ? 1.2 : 1) * (0.6 + 0.4 * T.control) - pressure * 0.12;
    // ── pass options
    let best = null, bestVal = dribVal, bestKind = 'pass', bx = 0, bz = 0;
    const line = w.offsideLine(side, w.ball.x);
    const ownThird = (p.x * d) < -w.hx / 3;
    for (const q of w.team[side]) {
        if (q === p)
            continue;
        if (q.role === 'GK' && !(pressure > 0.6 && ownThird))
            continue;
        const dx = q.x - p.x, dz = q.z - p.z, dd = Math.hypot(dx, dz);
        if (dd < 4 || dd > 38)
            continue;
        if (d * q.x > line + 0.3 && d * q.x > d * w.ball.x)
            continue; // would be offside
        const lead = dd / 15;
        const tx = q.x + q.vx * lead, tz = q.z + q.vz * lead;
        let laneMinP = 99;
        for (const o of opp)
            laneMinP = Math.min(laneMinP, distToSeg(o.x, o.z, p.x, p.z, tx, tz));
        let recvOpp = 99;
        for (const o of opp)
            recvOpp = Math.min(recvOpp, Math.hypot(o.x - tx, o.z - tz));
        const lobIt = dd > 24 || (laneMinP < 1.4 && dd > 11);
        const pc = (lobIt ? 0.8 : 1) * sig((laneMinP - 1.5) / 0.9) * (0.5 + 0.5 * T.passAcc) * (0.6 + 0.4 * sig((recvOpp - 1.5) / 1.5));
        const progress = ((tx - p.x) * d) / w.L;
        const openness = clamp(recvOpp / 8, 0, 1);
        const counter = w.simT < w.counterUntil ? 0.18 : 0;
        let val = pc * (0.18 + 1.9 * progress + 0.35 * openness + counter * Math.max(0, progress)) - (1 - pc) * 0.3;
        if (q.role === 'GK')
            val -= 0.1;
        val += w.rng.gauss() * 0.06 * (1.2 - T.vision);
        if (val > bestVal) {
            bestVal = val;
            best = q;
            bx = tx;
            bz = tz;
            bestKind = lobIt ? 'lob' : (progress > 0.1 && q.speed > 3 && d * q.x > d * p.x + 6) ? 'through' : 'pass';
        }
    }
    if (best) {
        bx = clamp(bx, -w.hx + 1, w.hx - 1);
        bz = clamp(bz, -w.hz + 1, w.hz - 1);
        w.kick(p, bestKind, bx, bz, 0.5 + 0.1 * w.rng.next(), { ty: 0.11 });
        return;
    }
    // ── clearance under pressure deep in own half
    if (ownThird && pressure > 0.65) {
        w.kick(p, 'clear', p.x + d * 38, p.z > 0 ? 22 : -22, 0.95, { ty: 0.11 });
        return;
    }
    // ── dribble: head for goal, steer around defenders
    let dx = goalX - p.x, dz = (p.z * 0.55) * -1 + 0;
    let n = Math.hypot(dx, dz) || 1;
    dx /= n;
    dz /= n;
    for (const q of opp) {
        const ox = p.x - q.x, oz = p.z - q.z, od = Math.hypot(ox, oz);
        if (od < 4 && od > 0.01) {
            const f = (4 - od) / od * 0.9;
            dx += ox * f / 4;
            dz += oz * f / 4;
        }
    }
    n = Math.hypot(dx, dz) || 1;
    p.tx = p.x + (dx / n) * 14;
    p.tz = clamp(p.z + (dz / n) * 14, -w.hz + 1, w.hz - 1);
    p.speedFrac = freeN > 0.6 ? 1 : 0.8;
    p.sprint = freeN > 0.6;
}
/** Goalkeeper brain: angle-based positioning, shot prediction with reaction delay, dive with reach limits, distribution. */
export function goalkeeperThink(w, g, dt) {
    if (w.phase === 'goal' || w.phase === 'fulltime')
        return;
    if (!w.autoPlay && g.humanControlled && !g.gkHolding)
        return;
    const b = w.ball, T = g.traits, side = g.side, d = w.dir(side);
    const gx = w.ownGoalX(side), hzg = w.P.goalWidth / 2;
    // distribution
    if (g.gkHolding) {
        if (!g.humanControlled) {
            g.tx = g.x;
            g.tz = g.z;
        }
        const aiReleaseAt = 1.4 + (g.id % 3) * 0.3;
        if (g.humanControlled && g.holdT < 4)
            return;
        if (!g.humanControlled && g.holdT < aiReleaseAt)
            return;
        {
            const mates = w.team[side].filter(q => q !== g && q.role !== 'GK' && !q.sentOff);
            let safeShort = null, safeShortValue = -1e9, long = null, longValue = -1e9;
            for (const q of mates) {
                const dd = Math.hypot(q.x - g.x, q.z - g.z);
                if (dd < 8 || dd > 50)
                    continue;
                let nearestOpponent = 99;
                for (const o of w.team[1 - side])
                    nearestOpponent = Math.min(nearestOpponent, Math.hypot(o.x - q.x, o.z - q.z));
                const value = Math.min(nearestOpponent, 10) + (q.x - g.x) * d * 0.08 - dd * 0.05 + w.rng.next();
                if (dd <= 25 && nearestOpponent >= 10 && value > safeShortValue) {
                    safeShortValue = value;
                    safeShort = q;
                }
                if (value > longValue) {
                    longValue = value;
                    long = q;
                }
            }
            const best = safeShort ?? long;
            g.gkHolding = false;
            w.owner = null;
            b.y = 0.9;
            if (best)
                w.kick(g, safeShort ? 'pass' : 'lob', best.x, best.z, 0.7, { ty: safeShort ? 0.11 : 1.8, eligibleOffside: false });
            else
                w.kick(g, 'clear', g.x + d * 35, w.rng.range(-18, 18), 0.8, { eligibleOffside: false });
        }
        return;
    }
    if (w.restart && (w.restart.taker === g))
        return;
    const live = w.phase === 'live' || w.phase === 'shootout';
    // shot detection → dive plan
    if (live && !g.dive && b.speed > 7 && (gx - b.x) * b.vx > 0 && Math.abs(gx - b.x) < 45 && w.owner === null) {
        for (let t = 0.05; t < 1.8; t += 0.05) {
            b.predict(t, tmp);
            if ((tmp.x - gx) * d <= 0.2) {
                if (Math.abs(tmp.z) < hzg + 2.5 && tmp.y < w.P.goalHeight + 1.3) {
                    const err = w.rng.gauss() * (1 - T.gkPos) * 0.8;
                    const reactionMs = Number(w.cfg.difficulty?.reactionTimeMs ?? 200);
                    const reactionScale = Number.isFinite(reactionMs) ? clamp(reactionMs / 200, 0.65, 1.6) : 1;
                    const delay = clamp((0.30 - 0.22 * T.gkReflex + w.rng.gauss() * 0.02) * reactionScale, 0.08, 0.55);
                    g.dive = { t: 0, delay, z: clamp(tmp.z + err, -hzg - 2, hzg + 2), y: clamp(tmp.y, 0.2, 3), z0: g.z, reachZ: 0, reachY: 0.9 };
                }
                break;
            }
        }
    }
    if (g.dive) {
        const D = g.dive;
        D.t += dt;
        if (D.t > D.delay) {
            const maxLat = 1.4 + 2.3 * T.gkDive, vd = curve(T.gkDive, 3.2, 8.5);
            const targetOff = clamp(D.z - D.z0, -maxLat, maxLat);
            const curOff = g.z - D.z0;
            const step = clamp(targetOff - curOff, -vd * dt, vd * dt);
            g.z += step;
            g.vz = step / dt;
            const maxY = 2.0 + 0.6 * T.gkReach;
            D.reachY += clamp(clamp(D.y, 0.3, maxY) - D.reachY, -6 * dt, 6 * dt);
        }
        g.tx = g.x;
        g.tz = g.z;
        // hand contact test
        const handR = 0.5 + 0.45 * T.gkReach + (D.t > D.delay ? 0.25 : 0);
        const dist = Math.hypot((b.x - g.x) * 0.7, b.z - g.z, b.y - D.reachY);
        if (live && dist < handR && b.speed > 1 && w.owner === null && g.touchCd <= 0) {
            g.dive = null;
            w.gkCatch(g);
            return;
        }
        // expire when ball is clearly past / stopped
        if (D.t > 2.2 || b.speed < 2 || (b.x - gx) * d > 8)
            g.dive = null;
        return;
    }
    // positioning on the angle bisector
    const ballD = Math.hypot(b.x - gx, b.z);
    const advance = ballD > 38 ? 4.5 : ballD > 25 ? 2.6 : 1.3;
    const depth = clamp(advance - (1 - T.gkPos) * 0.5, 0.8, 6);
    const lat = clamp(b.z * (depth / Math.max(ballD, 1)) * 5.5 + w.rng.gauss() * 0.02, -(hzg - 0.4), hzg - 0.4);
    g.tx = gx + d * depth;
    g.tz = lat;
    g.speedFrac = 1;
    g.sprint = ballD < 28;
    // sweep up loose balls in the box
    const inBox = Math.abs(b.z) < 20 && (b.x - gx) * d < 16.5 && (b.x - gx) * d > 0;
    const aerialCross = inBox && b.y > 0.7 && b.y < 2.4 && b.hSpeed < 12;
    if (live && inBox && w.owner === null && (b.hSpeed < 9 || aerialCross)) {
        const gd = Math.hypot(b.x - g.x, b.z - g.z);
        let closer = false;
        for (const q of w.team[1 - side].filter(q => !q.sentOff))
            if (Math.hypot(q.x - b.x, q.z - b.z) < gd - 1)
                closer = true;
        if (!closer && (!aerialCross || gd < 14)) {
            g.tx = b.x;
            g.tz = b.z;
            g.sprint = true;
        }
    }
    const nearestAttacker = Math.min(...w.team[1 - side]
        .filter(q => !q.sentOff)
        .filter(q => q.role !== 'GK')
        .map(q => Math.hypot(q.x - b.x, q.z - b.z)));
    if (live && ballD < 32 && (b.x - gx) * d > 0 && nearestAttacker > Math.hypot(b.x - g.x, b.z - g.z) + 1) {
        const sweepDistance = Math.min(18, Math.max(depth, ballD - 3));
        g.tx = gx + d * sweepDistance;
        g.tz = clamp(b.z, -(hzg - 0.4), hzg - 0.4);
        g.sprint = true;
    }
}
