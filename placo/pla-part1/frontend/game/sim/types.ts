import type { Traits } from '../core/params';

export type Side = 0 | 1; // 0 = home (attacks +x), 1 = away (attacks −x)
export type Role = 'GK' | 'DEF' | 'MID' | 'FWD';
export type Phase = 'kickoff' | 'live' | 'dead' | 'goal' | 'halftime' | 'fulltime';
export type RestartKind = 'kickoff' | 'throw' | 'corner' | 'goalkick' | 'free' | 'indirect' | 'penalty';

export class Player {
  x = 0; z = 0; vx = 0; vz = 0; heading = 0;
  stamina = 1;
  /** formation anchor in normalised units: depth 0 (own goal) … 1 (opp goal), lat −1…1 (z) */
  depth = 0.5; lat = 0;
  // intent written by AI / human each tick
  tx = 0; tz = 0; speedFrac = 0.65; sprint = false;
  // timers
  touchCd = 0; tackleCd = 0; stun = 0; thinkCd = 0; holdT = 0;
  // animation hints for the renderer
  phase = 0; kickT = 0;
  // goalkeeper dive state
  dive: { t: number; delay: number; z: number; y: number; z0: number; reachZ: number; reachY: number } | null = null;
  gkHolding = false;
  constructor(
    public readonly id: number, public readonly side: Side, public readonly slot: string,
    public readonly num: number, public readonly role: Role, public readonly playerId: string, public readonly traits: Traits,
  ) {}
  get speed() { return Math.hypot(this.vx, this.vz); }
}

export interface Restart { kind: RestartKind; side: Side; x: number; z: number; timer: number; taker: Player | null }

export type SimEventType =
  | 'kickoff' | 'goal' | 'shot' | 'save' | 'foul' | 'corner' | 'offside' | 'half_time' | 'full_time';

export interface SimEvent { type: SimEventType; side: Side | null; t: number; period: number; actorId?: string; x?: number; z?: number }
