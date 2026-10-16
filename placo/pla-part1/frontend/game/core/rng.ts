/**
 * Deterministic seeded RNG (sfc32, 128-bit state, 32-bit integer math only → identical on every JS engine).
 * Independent named streams (physics noise / AI / referee) are forked from the match seed so that
 * adding a random call in one subsystem never shifts the sequence of another.
 */
function xmur3(str: string) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

export class Rng {
  private a: number; private b: number; private c: number; private d: number;
  private spare: number | null = null;

  constructor(public readonly seed: string) {
    const s = xmur3(seed);
    this.a = s(); this.b = s(); this.c = s(); this.d = s();
    for (let i = 0; i < 12; i++) this.u32();
  }

  fork(label: string) { return new Rng(`${this.seed}::${label}`); }

  u32(): number {
    this.a >>>= 0; this.b >>>= 0; this.c >>>= 0; this.d >>>= 0;
    const t = (((this.a + this.b) | 0) + this.d) | 0;
    this.d = (this.d + 1) | 0;
    this.a = this.b ^ (this.b >>> 9);
    this.b = (this.c + (this.c << 3)) | 0;
    this.c = (this.c << 21) | (this.c >>> 11);
    this.c = (this.c + t) | 0;
    return t >>> 0;
  }

  /** [0,1) */
  next(): number { return this.u32() / 4294967296; }
  range(lo: number, hi: number) { return lo + (hi - lo) * this.next(); }
  chance(p: number) { return this.next() < p; }
  /** standard normal (Box–Muller, cached pair) */
  gauss(): number {
    if (this.spare !== null) { const s = this.spare; this.spare = null; return s; }
    let u = 0; while (u < 1e-12) u = this.next();
    const v = this.next();
    const m = Math.sqrt(-2 * Math.log(u));
    this.spare = m * Math.sin(2 * Math.PI * v);
    return m * Math.cos(2 * Math.PI * v);
  }
}
