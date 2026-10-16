/**
 * Ball rigid body: translation + spin (ω), integrated at 4 substeps per 60 Hz sim tick.
 *  - quadratic drag            a = -k |v| v           k = ½ρ·Cd·A / m
 *  - Magnus force              a =  S · (ω × v)
 *  - ground impact             restitution + Coulomb/stick friction against contact-point slip (thin-shell inertia I = ⅔ m r²)
 *  - rolling                   slip-to-roll coupling + rolling resistance
 *  - woodwork                  posts (vertical capsules) and crossbar (horizontal capsule), reflected with restitution
 *  - net                       soft volume behind each goal line: heavy damping, reports impact for the ripple
 * Axes: x = pitch length (home attacks +x), y = up, z = pitch width.
 */
export class Ball {
    P;
    x = 0;
    y = 0.11;
    z = 0;
    vx = 0;
    vy = 0;
    vz = 0;
    wx = 0;
    wy = 0;
    wz = 0;
    /** last net impact for renderer ripple */
    netHit = { pending: false, x: 0, y: 0, z: 0, speed: 0 };
    groundBounce = 0; // count of bounces since last touch (for GK / header logic)
    onGround = true;
    k;
    I;
    constructor(P) {
        this.P = P;
        const A = Math.PI * P.ballRadius * P.ballRadius;
        this.k = (0.5 * P.airDensity * P.dragCd * A) / P.ballMass;
        this.I = (2 / 3) * P.ballMass * P.ballRadius * P.ballRadius;
        this.y = P.ballRadius;
    }
    get speed() { return Math.hypot(this.vx, this.vy, this.vz); }
    get hSpeed() { return Math.hypot(this.vx, this.vz); }
    place(x, z, y = this.P.ballRadius) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.vx = this.vy = this.vz = 0;
        this.wx = this.wy = this.wz = 0;
    }
    step(dt, substeps = 4) {
        const h = dt / substeps;
        for (let i = 0; i < substeps; i++)
            this.sub(h);
    }
    sub(h) {
        const P = this.P, r = P.ballRadius;
        // --- forces
        const sp = Math.hypot(this.vx, this.vy, this.vz);
        let ax = 0, ay = -P.gravity, az = 0;
        if (sp > 1e-4) {
            const d = this.k * sp;
            ax -= d * this.vx;
            ay -= d * this.vy;
            az -= d * this.vz;
            if (this.y > r + 0.02) { // Magnus only matters in flight
                const S = P.magnusS;
                ax += S * (this.wy * this.vz - this.wz * this.vy);
                ay += S * (this.wz * this.vx - this.wx * this.vz);
                az += S * (this.wx * this.vy - this.wy * this.vx);
            }
        }
        // semi-implicit Euler
        this.vx += ax * h;
        this.vy += ay * h;
        this.vz += az * h;
        this.x += this.vx * h;
        this.y += this.vy * h;
        this.z += this.vz * h;
        const sd = Math.exp(-P.spinDecay * h);
        this.wx *= sd;
        this.wy *= sd;
        this.wz *= sd;
        this.ground(h);
        this.woodwork();
        this.net();
    }
    ground(h) {
        const P = this.P, r = P.ballRadius;
        if (this.y > r) {
            this.onGround = false;
            return;
        }
        this.y = r;
        const mass = P.ballMass, I = this.I;
        if (this.vy < -0.6) {
            // impact: speed-dependent restitution (softer at low speed)
            const vn = -this.vy;
            const e = P.restitution * Math.min(1, 0.55 + vn / 14);
            const Jn = mass * (1 + e) * vn;
            this.vy = vn * e;
            this.groundBounce++;
            this.friction(Jn, mass, I, r);
            this.onGround = false;
        }
        else {
            // resting / rolling contact
            this.vy = 0;
            this.onGround = true;
            this.friction(mass * P.gravity * h, mass, I, r);
            const hs = Math.hypot(this.vx, this.vz);
            if (hs > 1e-4) {
                const dec = Math.min(hs, P.rollingResistance * P.gravity * h);
                this.vx -= (this.vx / hs) * dec;
                this.vz -= (this.vz / hs) * dec;
            }
            if (hs < 0.03) {
                this.vx = this.vz = 0;
                this.wx *= 0.9;
                this.wz *= 0.9;
            }
            // spin about the vertical axis dies quickly on grass
            this.wy *= 0.995;
        }
    }
    /** tangential impulse at the contact point, clamped by Coulomb limit μ·Jn (stick if possible) */
    friction(Jn, mass, I, r) {
        const sx = this.vx + this.wz * r; // contact-point slip velocity (r_vec = (0,-r,0))
        const sz = this.vz - this.wx * r;
        const sl = Math.hypot(sx, sz);
        if (sl < 1e-6)
            return;
        const stick = (mass * sl) / (1 + (mass * r * r) / I);
        const Jt = Math.min(stick, this.P.groundMu * Jn);
        const jx = (-sx / sl) * Jt, jz = (-sz / sl) * Jt;
        this.vx += jx / mass;
        this.vz += jz / mass;
        this.wx += (-r * jz) / I;
        this.wz += (r * jx) / I;
    }
    cap(ax, ay, az, bx, by, bz, rad, e) {
        // sphere vs capsule (segment a-b)
        const abx = bx - ax, aby = by - ay, abz = bz - az;
        const t = Math.max(0, Math.min(1, ((this.x - ax) * abx + (this.y - ay) * aby + (this.z - az) * abz) / (abx * abx + aby * aby + abz * abz)));
        const cx = ax + abx * t, cy = ay + aby * t, cz = az + abz * t;
        let dx = this.x - cx, dy = this.y - cy, dz = this.z - cz;
        const d = Math.hypot(dx, dy, dz), R = this.P.ballRadius + rad;
        if (d >= R || d < 1e-6)
            return false;
        dx /= d;
        dy /= d;
        dz /= d;
        this.x = cx + dx * R;
        this.y = cy + dy * R;
        this.z = cz + dz * R;
        const vn = this.vx * dx + this.vy * dy + this.vz * dz;
        if (vn < 0) {
            const j = -(1 + e) * vn;
            this.vx += j * dx;
            this.vy += j * dy;
            this.vz += j * dz;
            this.wx *= 0.7;
            this.wy *= 0.7;
            this.wz *= 0.7;
        }
        return true;
    }
    /** returns true if woodwork was struck this substep (for shot metrics / sfx hooks) */
    hitWood = false;
    woodwork() {
        const P = this.P, hx = P.pitchLength / 2, hz = P.goalWidth / 2, gh = P.goalHeight, pr = 0.06;
        if (Math.abs(Math.abs(this.x) - hx) > 0.5)
            return;
        const s = this.x > 0 ? 1 : -1, gx = s * hx;
        let hit = false;
        for (const zz of [-hz, hz])
            hit = this.cap(gx, 0, zz, gx, gh, zz, pr, P.postRestitution) || hit;
        hit = this.cap(gx, gh, -hz, gx, gh, hz, pr, P.postRestitution) || hit;
        this.hitWood = hit;
    }
    net() {
        const P = this.P, hx = P.pitchLength / 2, hz = P.goalWidth / 2, gh = P.goalHeight, gd = P.goalDepth, r = P.ballRadius;
        const ax = Math.abs(this.x);
        if (ax < hx + r * 0.2 || ax > hx + gd + 1)
            return;
        if (Math.abs(this.z) > hz + 0.3 || this.y > gh + 0.3)
            return;
        const s = this.x > 0 ? 1 : -1;
        let hit = false;
        const damp = P.netDamping;
        if (ax > hx + gd - r) {
            this.x = s * (hx + gd - r);
            if (this.vx * s > 0) {
                this.vx *= -damp;
                hit = true;
            }
        }
        if (this.y > gh - r) {
            this.y = gh - r;
            if (this.vy > 0) {
                this.vy *= -damp;
                hit = true;
            }
        }
        if (this.z > hz - r) {
            this.z = hz - r;
            if (this.vz > 0) {
                this.vz *= -damp;
                hit = true;
            }
        }
        if (this.z < -hz + r) {
            this.z = -hz + r;
            if (this.vz < 0) {
                this.vz *= -damp;
                hit = true;
            }
        }
        // soft drag inside the net
        this.vx *= 0.995;
        this.vz *= 0.995;
        if (hit) {
            const n = this.netHit;
            n.pending = true;
            n.x = this.x;
            n.y = this.y;
            n.z = this.z;
            n.speed = Math.max(n.speed, this.speed);
        }
    }
    /** Ballistic prediction (no ground friction/net) for AI & GK: position after t seconds, via a cheap clone integrator. */
    predict(t, out, stepDt = 1 / 60) {
        let x = this.x, y = this.y, z = this.z, vx = this.vx, vy = this.vy, vz = this.vz;
        const r = this.P.ballRadius, e = this.P.restitution;
        const wx = this.wx, wy = this.wy, wz = this.wz, S = this.P.magnusS;
        for (let tt = 0; tt < t; tt += stepDt) {
            const sp = Math.hypot(vx, vy, vz), d = this.k * sp;
            let ax = -d * vx, ay = -this.P.gravity - d * vy, az = -d * vz;
            if (y > r + 0.02) {
                ax += S * (wy * vz - wz * vy);
                ay += S * (wz * vx - wx * vz);
                az += S * (wx * vy - wy * vx);
            }
            vx += ax * stepDt;
            vy += ay * stepDt;
            vz += az * stepDt;
            x += vx * stepDt;
            y += vy * stepDt;
            z += vz * stepDt;
            if (y < r) {
                y = r;
                if (vy < -0.6) {
                    vy = -vy * e;
                    vx *= 0.82;
                    vz *= 0.82;
                }
                else {
                    vy = 0;
                    const f = Math.exp(-0.5 * stepDt);
                    vx *= f;
                    vz *= f;
                }
            }
        }
        out.x = x;
        out.y = y;
        out.z = z;
        return out;
    }
}
