/**
 * Physics parameter + attribute→trait resolution.
 *
 * The match's frozen `physics_snapshot` is searched by normalised key name anywhere in the object
 * (so { ball: { restitution } }, { ball_restitution } and { restitution } all resolve). Anything missing falls
 * back to the defaults below, and every value is clamped to a sane range so a bad snapshot can never
 * blow up the integrator.
 */
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
function flatten(obj, out, prefix = '', depth = 0) {
    if (!obj || typeof obj !== 'object' || depth > 5)
        return;
    for (const k of Object.keys(obj)) {
        const v = obj[k];
        const nk = norm(k);
        if (typeof v === 'number' && isFinite(v)) {
            if (!out.has(nk))
                out.set(nk, v);
            if (prefix)
                out.set(prefix + nk, v);
        }
        else if (v && typeof v === 'object' && !Array.isArray(v))
            flatten(v, out, norm(k), depth + 1);
    }
}
const DEFAULTS = {
    gravity: 9.81, ballRadius: 0.11, ballMass: 0.43,
    airDensity: 1.2, dragCd: 0.25, magnusS: 0.0053, spinDecay: 0.06,
    restitution: 0.62, groundMu: 0.5, rollingResistance: 0.06, netDamping: 0.12,
    postRestitution: 0.55,
    pitchLength: 105, pitchWidth: 68, goalWidth: 7.32, goalHeight: 2.44, goalDepth: 2.0,
    playerMaxSpeedHi: 9.6, playerMaxSpeedLo: 5.2, tractionMu: 0.95,
};
const RANGE = {
    gravity: [5, 15], ballRadius: [0.08, 0.14], ballMass: [0.3, 0.6], airDensity: [0.5, 2],
    dragCd: [0.05, 0.6], magnusS: [0, 0.02], spinDecay: [0, 0.5], restitution: [0.3, 0.85],
    groundMu: [0.1, 1], rollingResistance: [0.01, 0.3], netDamping: [0, 0.6], postRestitution: [0.2, 0.9],
    pitchLength: [90, 120], pitchWidth: [45, 90], goalWidth: [5, 9], goalHeight: [2, 3], goalDepth: [1, 3],
    playerMaxSpeedHi: [7, 12], playerMaxSpeedLo: [3, 7], tractionMu: [0.5, 1.4],
};
const ALIASES = {
    gravity: ['gravity', 'g'], ballRadius: ['ballradius', 'radius', 'radiusm'], ballMass: ['ballmass', 'mass', 'masskg'],
    airDensity: ['airdensity', 'rho'], dragCd: ['dragcoefficient', 'cd', 'drag', 'dragcd'], magnusS: ['magnus', 'magnuscoefficient', 'liftcoefficient'],
    spinDecay: ['spindecay', 'spindamping'], restitution: ['restitution', 'bouncerestitution', 'groundrestitution'],
    groundMu: ['groundfriction', 'friction', 'mu', 'kineticfriction'], rollingResistance: ['rollingresistance', 'rollingfriction', 'crr'],
    netDamping: ['netdamping', 'netrestitution'], postRestitution: ['postrestitution', 'woodworkrestitution'],
    pitchLength: ['pitchlength', 'length'], pitchWidth: ['pitchwidth', 'width'],
    goalWidth: ['goalwidth'], goalHeight: ['goalheight'], goalDepth: ['goaldepth', 'netdepth'],
    playerMaxSpeedHi: ['playermaxspeed', 'maxsprintspeed', 'topspeed'], playerMaxSpeedLo: ['playerminspeed'],
    tractionMu: ['tractionmu', 'tractioncoefficient', 'playerfriction'],
};
export function resolvePhysics(snapshot) {
    const flat = new Map();
    flatten(snapshot, flat);
    const out = { ...DEFAULTS };
    Object.keys(DEFAULTS).forEach(k => {
        for (const a of ALIASES[k] ?? [norm(k)]) {
            const v = flat.get(norm(a));
            if (v !== undefined) {
                const [lo, hi] = RANGE[k];
                out[k] = Math.min(hi, Math.max(lo, v));
                break;
            }
        }
    });
    return out;
}
/** Case/underscore-insensitive attribute bag; every attribute is 1–100 on the server, defaulting to 50. */
export class Attrs {
    m = new Map();
    constructor(raw) {
        if (raw)
            for (const k of Object.keys(raw)) {
                const v = Number(raw[k]);
                if (isFinite(v))
                    this.m.set(norm(k), v);
            }
    }
    /** returns 0..1 */
    get(names, def = 50) {
        for (const n of names) {
            const v = this.m.get(norm(n));
            if (v !== undefined)
                return Math.min(1, Math.max(0.01, v / 100));
        }
        return def / 100;
    }
}
const lerp = (a, b, t) => a + (b - a) * t;
/** Perceptual attribute→physics curve: gentle at the bottom, steeper near the top so 90s are visibly better than 70s. */
export const curve = (a, lo, hi, gamma = 1.0) => lerp(lo, hi, Math.pow(a, gamma));
function measurement(raw, names, fallback, min, max, fromCentimeters = false) {
    for (const [key, value] of Object.entries(raw ?? {})) {
        if (!names.includes(norm(key)) || !Number.isFinite(Number(value)))
            continue;
        const numeric = Number(value);
        const metres = fromCentimeters && numeric > 100 ? numeric / 100 : numeric;
        return Math.max(min, Math.min(max, metres));
    }
    return fallback;
}
export function resolveTraits(raw, gkRaw, P, role = 'MID') {
    const a = new Attrs(raw);
    const g = new Attrs({ ...(raw ?? {}), ...(gkRaw ?? {}) });
    const speed = a.get(['sprintSpeed', 'pace', 'speed', 'topSpeed']);
    const accel = a.get(['acceleration', 'accel', 'explosiveness'], speed * 100);
    const stam = a.get(['stamina', 'endurance']);
    const str = a.get(['strength', 'power', 'physical']);
    const agi = a.get(['agility', 'balance', 'turning']);
    const drib = a.get(['dribbling', 'ballControl', 'control']);
    const ft = a.get(['firstTouch', 'ballControl', 'control', 'dribbling']);
    const spass = a.get(['shortPassing', 'passing', 'passAccuracy']);
    const lpass = a.get(['longPassing', 'passing', 'passPower']);
    const shot = a.get(['shotPower', 'shooting', 'power']);
    const fin = a.get(['finishing', 'shotAccuracy', 'shooting']);
    const height = measurement(raw, ['height', 'heightcm', 'heightm', 'stature'], role === 'GK' ? 1.9 : role === 'DEF' ? 1.84 : role === 'FWD' ? 1.77 : 1.79, 1.5, 2.1, true);
    const mass = measurement(raw, ['weight', 'weightkg', 'mass', 'masskg'], role === 'GK' ? 82 : role === 'DEF' ? 80 : role === 'FWD' ? 73 : 76, 50, 120);
    const bodyTurn = Math.max(0.78, Math.min(1.12, 1.08 - Math.max(0, height - 1.72) * 0.32 - Math.max(0, mass - 70) * 0.003));
    return {
        vMax: curve(speed, P.playerMaxSpeedLo, P.playerMaxSpeedHi, 1.15),
        aAccel: curve(accel, 4.2, 8.2, 1.1),
        aBrake: curve(accel, 7.0, 10.5, 1),
        aLat: curve(agi, 5.5, 9.4, 1) * Math.min(1.2, P.tractionMu / 0.95) * bodyTurn,
        height, mass, bodyTurn,
        staminaMax: 1, recovery: curve(stam, 0.02, 0.07, 1),
        reach: 0.55 + 0.2 * drib,
        firstTouch: ft, control: drib,
        passAcc: spass, passPower: lpass, vision: a.get(['vision', 'passing']),
        shotPower: shot, shotAcc: fin, curveSkill: a.get(['curve', 'shotCurve', 'technique'], 45),
        tackle: a.get(['tackling', 'standingTackle', 'defending', 'defence']),
        intercept: a.get(['interceptions', 'anticipation', 'defending', 'positioning']),
        strength: str, agility: agi, aggression: a.get(['aggression']), composure: a.get(['composure', 'reactions']),
        penalties: a.get(['penalties', 'penaltyAccuracy', 'composure']),
        reaction: a.get(['reactions', 'reaction', 'anticipation']),
        jump: a.get(['jumping', 'jump']), heading: a.get(['heading', 'headingAccuracy']),
        positioning: a.get(['positioning', 'offTheBall', 'defensiveAwareness', 'awareness']),
        work: stam,
        gkDive: g.get(['gkDiving', 'diving', 'goalkeeping']),
        gkReach: g.get(['gkReach', 'reach', 'height', 'goalkeeping']),
        gkReflex: g.get(['gkReflexes', 'reflexes', 'reactions', 'goalkeeping']),
        gkHands: g.get(['gkHandling', 'handling', 'goalkeeping']),
        gkPos: g.get(['gkPositioning', 'positioning', 'goalkeeping']),
        gkKick: g.get(['gkKicking', 'kicking', 'longPassing']),
    };
}
/** Look up a number anywhere in a snapshot by normalised key name (first alias that matches wins). */
export function findNumber(snapshot, names, def) {
    const flat = new Map();
    flatten(snapshot, flat);
    for (const n of names) {
        const v = flat.get(norm(n));
        if (v !== undefined)
            return v;
    }
    return def;
}
