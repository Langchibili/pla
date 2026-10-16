/**
 * Physics parameter + attribute→trait resolution.
 *
 * The match's frozen `physics_snapshot` is searched by normalised key name anywhere in the object
 * (so { ball: { restitution } }, { ball_restitution } and { restitution } all resolve). Anything missing falls
 * back to the defaults below, and every value is clamped to a sane range so a bad snapshot can never
 * blow up the integrator.
 */
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

function flatten(obj: any, out: Map<string, number>, prefix = '', depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 5) return;
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    const nk = norm(k);
    if (typeof v === 'number' && isFinite(v)) {
      if (!out.has(nk)) out.set(nk, v);
      if (prefix) out.set(prefix + nk, v);
    } else if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, out, norm(k), depth + 1);
  }
}

export interface Physics {
  gravity: number; ballRadius: number; ballMass: number;
  airDensity: number; dragCd: number; magnusS: number; spinDecay: number;
  restitution: number; groundMu: number; rollingResistance: number; netDamping: number;
  postRestitution: number;
  pitchLength: number; pitchWidth: number; goalWidth: number; goalHeight: number; goalDepth: number;
  playerMaxSpeedHi: number; playerMaxSpeedLo: number; tractionMu: number;
}

const DEFAULTS: Physics = {
  gravity: 9.81, ballRadius: 0.11, ballMass: 0.43,
  airDensity: 1.2, dragCd: 0.25, magnusS: 0.0053, spinDecay: 0.06,
  restitution: 0.62, groundMu: 0.5, rollingResistance: 0.06, netDamping: 0.12,
  postRestitution: 0.55,
  pitchLength: 105, pitchWidth: 68, goalWidth: 7.32, goalHeight: 2.44, goalDepth: 2.0,
  playerMaxSpeedHi: 9.6, playerMaxSpeedLo: 5.2, tractionMu: 0.95,
};
const RANGE: Record<keyof Physics, [number, number]> = {
  gravity: [5, 15], ballRadius: [0.08, 0.14], ballMass: [0.3, 0.6], airDensity: [0.5, 2],
  dragCd: [0.05, 0.6], magnusS: [0, 0.02], spinDecay: [0, 0.5], restitution: [0.3, 0.85],
  groundMu: [0.1, 1], rollingResistance: [0.01, 0.3], netDamping: [0, 0.6], postRestitution: [0.2, 0.9],
  pitchLength: [90, 120], pitchWidth: [45, 90], goalWidth: [5, 9], goalHeight: [2, 3], goalDepth: [1, 3],
  playerMaxSpeedHi: [7, 12], playerMaxSpeedLo: [3, 7], tractionMu: [0.5, 1.4],
};
const ALIASES: Partial<Record<keyof Physics, string[]>> = {
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

export function resolvePhysics(snapshot: any): Physics {
  const flat = new Map<string, number>();
  flatten(snapshot, flat);
  const out = { ...DEFAULTS };
  (Object.keys(DEFAULTS) as (keyof Physics)[]).forEach(k => {
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
  private m = new Map<string, number>();
  constructor(raw: Record<string, number> | null | undefined) {
    if (raw) for (const k of Object.keys(raw)) { const v = Number(raw[k]); if (isFinite(v)) this.m.set(norm(k), v); }
  }
  /** returns 0..1 */
  get(names: string[], def = 50): number {
    for (const n of names) { const v = this.m.get(norm(n)); if (v !== undefined) return Math.min(1, Math.max(0.01, v / 100)); }
    return def / 100;
  }
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Perceptual attribute→physics curve: gentle at the bottom, steeper near the top so 90s are visibly better than 70s. */
export const curve = (a: number, lo: number, hi: number, gamma = 1.0) => lerp(lo, hi, Math.pow(a, gamma));

export interface Traits {
  vMax: number; aAccel: number; aBrake: number; aLat: number; staminaMax: number; recovery: number;
  reach: number; firstTouch: number; control: number;
  passAcc: number; passPower: number; vision: number; shotPower: number; shotAcc: number; curveSkill: number;
  tackle: number; intercept: number; strength: number; agility: number; aggression: number; composure: number;
  reaction: number; jump: number; heading: number; positioning: number; work: number;
  gkDive: number; gkReach: number; gkReflex: number; gkHands: number; gkPos: number; gkKick: number;
}

export function resolveTraits(raw: Record<string, number> | null | undefined, gkRaw: Record<string, number> | null | undefined, P: Physics): Traits {
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
  return {
    vMax: curve(speed, P.playerMaxSpeedLo, P.playerMaxSpeedHi, 1.15),
    aAccel: curve(accel, 4.2, 8.2, 1.1),
    aBrake: curve(accel, 7.0, 10.5, 1),
    aLat: curve(agi, 5.5, 9.4, 1) * Math.min(1.2, P.tractionMu / 0.95),
    staminaMax: 1, recovery: curve(stam, 0.02, 0.07, 1),
    reach: 0.55 + 0.2 * drib,
    firstTouch: ft, control: drib,
    passAcc: spass, passPower: lpass, vision: a.get(['vision', 'passing']),
    shotPower: shot, shotAcc: fin, curveSkill: a.get(['curve', 'shotCurve', 'technique'], 45),
    tackle: a.get(['tackling', 'standingTackle', 'defending', 'defence']),
    intercept: a.get(['interceptions', 'anticipation', 'defending', 'positioning']),
    strength: str, agility: agi, aggression: a.get(['aggression']), composure: a.get(['composure', 'reactions']),
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
export function findNumber(snapshot: any, names: string[], def: number): number {
  const flat = new Map<string, number>();
  flatten(snapshot, flat);
  for (const n of names) { const v = flat.get(norm(n)); if (v !== undefined) return v; }
  return def;
}
