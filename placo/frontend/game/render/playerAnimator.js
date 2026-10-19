import { BONE as B, NB, sampleClip, blendPose, addRot } from './animPack';

/** Everything tunable lives here. Render-only: nothing in this file touches the simulation. */
export const TUNE = {
    idleBelow: 0.45,          // m/s : below this → idle / ready stance
    sprintUp: 4.5, sprintDown: 3.7, // m/s : jog ↔ sprint clip switch (with hysteresis)
    jogRate: [0.65, 1.7], sprintRate: [0.85, 2.0], dirRate: [0.7, 1.6], // playback-rate clamps (speed / clip speed)
    baseFade: 0.18,           // s : cross-fade between locomotion clips
    accelLean: 0.022, accelLeanMax: [-0.12, 0.2],
    bank: 0.011, bankMax: 0.24,
    headYawMax: 1.0, headWeight: [0.35, 0.5],
    jockeyDist: 9, jockeySpeed: 4.6, turnRate: 14, // visual facing toward ball carrier while defending
    kickLead: 0.09,           // s between the sim kick event and the foot hitting the ball in the clip
    fidgetAfter: 7,           // s standing still before a fidget clip
    foot: (idx) => (idx % 4 === 0 ? 'l' : 'r'), // default kicking foot when the ball is dead ahead
};

const KIND = { 0: 'none', 1: 'pass', 2: 'through', 3: 'shot', 4: 'lob', 5: 'clear', 6: 'throw', 7: 'head', 8: 'parry' };
const wrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hash = (n) => { let x = (n * 2654435761) >>> 0; x ^= x >>> 15; return (x >>> 0) / 4294967296; };

export class PlayerAnimator {
    constructor(idx, pack, isGK) {
        this.idx = idx; this.pack = pack; this.isGK = isGK;
        this.q = new Float32Array(NB * 4); this.h = new Float32Array(3);
        this.q2 = new Float32Array(NB * 4); this.h2 = new Float32Array(3);
        this.q3 = new Float32Array(NB * 4); this.h3 = new Float32Array(3);
        this.cur = { clip: pack.clips.idle, t: hash(idx) * 5, rate: 1 };
        this.prev = null; this.prevW = 0;
        this.act = null;
        this.vh = 0; this.vhInit = false;
        this.m = { kick: 0, tk: 0, stun: 0, hold: false, dive: 0, own: -1, gph: 0, rk: 0, x: 1e9, z: 1e9, spd: 0, h: 0 };
        this.accS = 0; this.yawS = 0; this.leanS = 0; this.rollS = 0; this.lookS = 0;
        this.stillT = 0; this.sprinting = false; this.nAct = 0;
        this.lastLocoAng = 0;
    }

    reset() { this.act = null; this.prev = null; this.prevW = 0; this.vhInit = false; this.m.x = 1e9; }

    // ───────────────────────────── actions
    play(name, o = {}) {
        const c = this.pack.clips[name];
        if (!c) return;
        const prio = o.prio ?? 1;
        if (this.act && prio < this.act.prio && this.act.el < this.act.lock) return;
        const rate = o.rate ?? 1;
        this.act = { clip: c, t: o.start ?? 0, rate, end: o.end ?? c.dur, fadeIn: o.fadeIn ?? 0.08, fadeOut: o.fadeOut ?? 0.22,
            prio, lock: o.lock ?? 0, el: 0, w: 0, holdAt: o.holdAt ?? -1, ending: false, name };
        this.nAct++;
    }
    kickAct(name, rate, tail, extra) {
        const c = this.pack.clips[name]; if (!c) return;
        const start = Math.max(0, c.contact - TUNE.kickLead * rate);
        this.play(name, { start, rate, end: Math.min(c.dur, c.contact + tail * rate), prio: 3, lock: 0.25, fadeIn: 0.06, ...extra });
    }

    /** detect sim events by comparing against what we saw on the previous drawn frame */
    observe(S) {
        const m = this.m, i = this.idx, P = this.pack.clips;
        if (Math.hypot(S.x - m.x, S.z - m.z) > 3.5) this.reset();   // replay seek / teleport (restarts)
        const kickRise = S.kick > m.kick + 0.08 && S.kick > 0.15;
        const rad = S.h, sinh = Math.sin(rad), cosh = Math.cos(rad);
        if (kickRise) {
            const rx = S.bx - S.x, rz = S.bz - S.z;
            const lat = rx * sinh - rz * cosh; // + = ball on character's right
            const foot = Math.abs(lat) > 0.06 ? (lat > 0 ? 'r' : 'l') : TUNE.foot(i);
            let k = S.kk ? KIND[S.kk] : this.guessKind(S);
            if (!S.kk && S.kick < 0.25) k = 'head';
            if (k === 'head' || k === 'parry') this.play('jump_head', { start: 0.7, rate: 1.3, end: 1.9, prio: 3, fadeIn: 0.06 });
            else if (k === 'throw') {
                if (this.isGK) this.kickAct('gk_throw', 1.1, 0.5);
                else this.kickAct('throwin', 1.1, 0.5);
            } else if (this.isGK && (k === 'lob' || k === 'clear') && S.bsp < 17) this.kickAct('gk_throw', 1.1, 0.5);
            else if (k === 'shot') this.kickAct('shoot_' + foot, 1.15, 0.45);
            else if (k === 'lob' || k === 'clear') this.kickAct('drive_' + foot, 1.2, 0.5);
            else if (k === 'through') this.kickAct('thru_' + foot, 1.2, 0.45);
            else this.kickAct('pass_' + foot, 1.0, 0.3);
        }
        if (S.tk > m.tk + 0.3) {
            if (S.tk > 1.2) this.play((i & 1) ? 'slide_m' : 'slide', { start: 0.2, rate: 1.15, prio: 4, lock: 0.9, fadeIn: 0.07, fadeOut: 0.28 });
            else this.play((i & 2) ? 'lunge_l' : 'lunge_r', { start: 0.42, rate: 1.35, end: 1.45, prio: 3, lock: 0.3, fadeIn: 0.06, fadeOut: 0.16 });
        }
        if (this.isGK && S.dive !== 0 && m.dive === 0) {
            // + dive.z - z0 is world Z; convert to the keeper's own left/right
            const left = S.dive * cosh > 0; // character-left in the +x(glTF) sense; verified in docs/README (side test)
            const y = S.dvy;
            let name;
            if (y > 1.5) name = left ? 'dive_hi_a' : 'dive_hi_b';
            else if (y > 0.75) name = left ? 'dive_mid_a' : 'dive_mid_b';
            else name = (i & 1) ? (left ? 'dive_low' : 'dive_low_m') : (left ? 'dive_low2' : 'dive_low2_m');
            this.play(name, { start: 0.16, rate: 1.6, prio: 5, lock: 1.1, fadeIn: 0.06, fadeOut: 0.3 });
        }
        if (m.own === i && S.own !== i && S.stun > 0.3 && m.stun <= 0.3 && S.gph === 0)
            this.play('shove', { start: 0.25, rate: 1.6, end: 1.7, prio: 1, fadeIn: 0.07, fadeOut: 0.25 });
        if (S.rk !== m.rk && (S.rk === 1 || S.rk === 2)) {
            if (S.rtaker === i) this.play('getup', { start: 0.5, rate: 1.4, prio: 1, fadeIn: 0.1 });
            else if (S.rnear < 3.5 && S.rside !== S.side) this.play('appeal', { start: 0.2, end: 1.5, prio: 1, fadeIn: 0.15, fadeOut: 0.3 });
        }
        if (S.gph === 3 && m.gph !== 3) {
            const delay = hash(i + 7) * 0.25;
            const mine = S.scorerSide === S.side;
            let name;
            if (S.scorer === i) name = ['celeb_a', 'celeb_d', 'celeb_b'][Math.floor(hash(i) * 3)];
            else if (mine) name = ['celeb_b', 'celeb_e', 'celeb_c', 'celeb_a'][Math.floor(hash(i + 3) * 4)];
            else name = 'sad';
            this.play(name, { start: -delay * 0, rate: 1, prio: 2, fadeIn: 0.2 + delay, fadeOut: 0.5, end: Math.min(P[name]?.dur ?? 3, 3.4) });
        }
        if (S.gph !== 3 && m.gph === 3 && this.act && this.act.prio === 2) this.act.ending = true;
        if (S.hold && !this.act) this.play('gk_hold', { start: 0.5, rate: 1, holdAt: 0.85, prio: 2, fadeIn: 0.12 });
        if (S.hold && !m.hold) this.play('gk_hold', { start: 0.2, rate: 1.1, holdAt: 0.85, prio: 2, fadeIn: 0.1 });
        if (!S.hold && this.act && this.act.name === 'gk_hold') this.act.ending = true;
        m.kick = S.kick; m.tk = S.tk; m.stun = S.stun; m.hold = S.hold; m.dive = S.dive; m.own = S.own; m.gph = S.gph; m.rk = S.rk;
        m.x = S.x; m.z = S.z;
    }

    guessKind(S) {
        const sp = S.bsp;
        if (S.bvy > 4.5) return 'lob';
        if (sp >= 22) return 'shot';
        if (sp >= 15) return 'through';
        return 'pass';
    }

    // ───────────────────────────── locomotion selection
    pickLoco(S, vf, vl, mag) {
        const P = this.pack.clips, T = TUNE;
        if (mag < T.idleBelow) {
            this.stillT += S.dt;
            if (this.isGK || (S.defending && S.gph === 0)) return { clip: this.isGK ? P.ready : P.ready_b, rate: 1 };
            if (this.stillT > T.fidgetAfter && !this.fidget) { this.fidget = hash(this.idx * 13 + Math.floor(S.time)) < 0.5 ? P.fidget_a : P.fidget_b; this.fidgetT = 0; }
            if (this.fidget) { this.fidgetT += S.dt; if (this.fidgetT >= this.fidget.dur - 0.05) { this.fidget = null; this.stillT = 0; } else return { clip: this.fidget, rate: 1 }; }
            return { clip: P.idle, rate: 1 };
        }
        this.stillT = 0; this.fidget = null;
        const ang = Math.atan2(vl, vf);
        const fwd = Math.abs(ang) < 0.5;
        if (fwd) {
            if (this.sprinting ? mag < T.sprintDown : mag > T.sprintUp) this.sprinting = !this.sprinting;
            const c = this.sprinting ? P.sprint : P.jog, r = T.jogRate, sr = T.sprintRate;
            const lim = this.sprinting ? sr : r;
            return { clip: c, rate: clamp(mag / c.speed, lim[0], lim[1]) };
        }
        this.sprinting = false;
        // nearest directional clip, current one gets a small bonus (hysteresis)
        let best = null, bd = 9;
        for (const n of ['jog', 'diag_fa', 'step_a', 'diag_ba', 'back', 'diag_bb', 'step_b', 'diag_fb']) {
            const c = P[n]; if (!c) continue;
            const d = Math.abs(wrap(ang - c.ang)) - (this.cur.clip === c ? 0.22 : 0);
            if (d < bd) { bd = d; best = c; }
        }
        const r = T.dirRate;
        return { clip: best, rate: clamp(mag / best.speed, r[0], r[1]) };
    }

    // ───────────────────────────── per frame
    /** S: per-player frame state built by Actors.draw. Returns visual heading. */
    update(S, nodes) {
        const dt = S.dt, T = TUNE;
        if (!this.vhInit) { this.vh = S.h; this.vhInit = true; this.yawS = 0; }
        this.observe(S);

        // visual facing: jockey toward the carrier / keeper faces the ball
        let target = S.h;
        if (this.isGK && S.gph === 0 && !S.hold && S.ballDist < 45 && S.spd < 6) target = Math.atan2(S.bz - S.z, S.bx - S.x);
        else if (S.defending && S.spd < T.jockeySpeed && !this.act) target = Math.atan2(S.oz - S.z, S.ox - S.x);
        if (this.act && this.act.prio >= 3) target = S.h; // committed actions face the sim heading
        const dh = wrap(target - this.vh), step = T.turnRate * dt;
        const prevVh = this.vh;
        this.vh = wrap(this.vh + clamp(dh, -step, step));
        const yawRate = dt > 0 ? wrap(this.vh - prevVh) / dt : 0;
        this.yawS += (yawRate - this.yawS) * Math.min(1, dt * 10);

        const ch = Math.cos(this.vh), sh = Math.sin(this.vh);
        const vf = S.vx * ch + S.vz * sh;
        const vr = S.vx * sh - S.vz * ch;   // world-right component of the velocity
        const vl = -vr;                      // glTF +x == character left
        const mag = Math.hypot(vf, vl);

        // base layer
        const want = this.pickLoco(S, vf, vl, mag);
        if (want.clip !== this.cur.clip) {
            const old = this.cur;
            const ph = old.clip.loop && want.clip.loop ? (old.t % old.clip.dur) / old.clip.dur : 0;
            this.prev = old; this.prevW = 1;
            this.cur = { clip: want.clip, t: want.clip.loop ? ph * want.clip.dur : 0, rate: want.rate };
        }
        this.cur.rate += (want.rate - this.cur.rate) * Math.min(1, dt * 8);
        this.cur.t += dt * this.cur.rate;
        if (this.prev) {
            this.prev.t += dt * this.prev.rate; this.prevW -= dt / T.baseFade;
            if (this.prevW <= 0) { this.prev = null; this.prevW = 0; }
        }
        sampleClip(this.cur.clip, this.cur.t, this.q, this.h);
        if (this.prev) {
            sampleClip(this.prev.clip, this.prev.t, this.q2, this.h2);
            const k = this.prevW; // weight of old
            blendPose(this.q, this.h, this.q2, this.h2, k * k * (3 - 2 * k));
        }
        // action layer
        let actW = 0;
        if (this.act) {
            const a = this.act;
            a.el += dt;
            if (a.holdAt >= 0 && !a.ending && a.t >= a.holdAt) a.t = a.holdAt; else a.t += dt * a.rate;
            const left = (a.end - a.t) / a.rate;
            let w = Math.min(1, a.el / Math.max(1e-3, a.fadeIn));
            if (a.ending) { a.fo = (a.fo ?? 1) - dt / a.fadeOut; w = Math.min(w, Math.max(0, a.fo)); }
            else if (left < a.fadeOut) w = Math.min(w, Math.max(0, left / a.fadeOut));
            a.w = w;
            actW = w * w * (3 - 2 * w);
            sampleClip(a.clip, a.t, this.q3, this.h3);
            blendPose(this.q, this.h, this.q3, this.h3, actW);
            if ((left <= 0 && a.holdAt < 0) || (a.ending && a.fo <= 0)) this.act = null;
        }
        const free = 1 - actW;

        // procedural layers (fade out while an action owns the body)
        const acc = dt > 0 ? (S.spd - this.m.spd) / dt : 0;
        this.m.spd = S.spd;
        this.accS += (clamp(acc, -12, 12) - this.accS) * Math.min(1, dt * 6);
        const lean = clamp(this.accS * T.accelLean, T.accelLeanMax[0], T.accelLeanMax[1]) * free;
        this.leanS += (lean - this.leanS) * Math.min(1, dt * 10);
        const roll = clamp(-this.yawS * Math.min(mag, 8) * T.bank, -T.bankMax, T.bankMax) * free;
        this.rollS += (roll - this.rollS) * Math.min(1, dt * 10);
        addRot(this.q, B.Spine, 0, this.leanS * 0.4); addRot(this.q, B.Spine1, 0, this.leanS * 0.3); addRot(this.q, B.Spine2, 0, this.leanS * 0.3);
        addRot(this.q, B.Spine, 2, this.rollS * 0.4); addRot(this.q, B.Spine1, 2, this.rollS * 0.35); addRot(this.q, B.Spine2, 2, this.rollS * 0.25);
        // head look at the ball
        let look = 0;
        if (S.ballDist < 38 && free > 0.5) look = clamp(wrap(Math.atan2(S.bz - S.z, S.bx - S.x) - this.vh), -T.headYawMax, T.headYawMax);
        this.lookS += (look - this.lookS) * Math.min(1, dt * 7);
        addRot(this.q, B.Neck, 1, this.lookS * T.headWeight[0]); addRot(this.q, B.Head, 1, this.lookS * T.headWeight[1]);

        // write to the skeleton
        const q = this.q;
        for (let b = 0; b < NB; b++) { const n = nodes[b]; if (n) n.rotationQuaternion.set(q[b * 4], q[b * 4 + 1], q[b * 4 + 2], q[b * 4 + 3]); }
        nodes[0].position.set(this.h[0], this.h[1], this.h[2]);
        return this.vh;
    }
}
