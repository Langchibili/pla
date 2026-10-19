import { Camera, FreeCamera, Vector3 } from '@babylonjs/core';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
/**
 * One camera, six smoothed rigs. The rig also exposes its ground-plane forward vector so the sim can map the
 * touch stick camera-relatively (stick-up always means "away from the camera").
 */
export class CameraRig {
    hx;
    hz;
    cam;
    mode = 'tv';
    forward = { x: 0, z: 1 };
    pos = new Vector3(0, 26, -44);
    tgt = new Vector3(0, 0, 0);
    dp = new Vector3();
    dt_ = new Vector3();
    dirX = 1;
    dirZ = 0;
    first = true;
    constructor(scene, hx, hz) {
        this.hx = hx;
        this.hz = hz;
        this.cam = new FreeCamera('cam', this.pos.clone(), scene);
        this.cam.fovMode = Camera.FOVMODE_HORIZONTAL_FIXED;
        this.cam.minZ = 0.5;
        this.cam.maxZ = 400;
        this.cam.fov = 0.75;
        scene.activeCamera = this.cam;
    }
    setMode(m) { this.mode = m; }
    update(dt, ball, attackDir) {
        const { hx, hz } = this;
        const bx = ball.x, bz = ball.z;
        let fov = 0.75;
        const p = this.dp, t = this.dt_;
        switch (this.mode) {
            case 'tv': {
                const fx = clamp(bx * 0.88, -hx + 8, hx - 8);
                p.set(fx * 0.96, 15, -31);
                t.set(fx, 0, bz * 0.25);
                fov = 0.62;
                break;
            }
            case 'side': {
                const fx = clamp(bx, -hx + 12, hx - 12);
                p.set(fx, 9, -41);
                t.set(fx, 0, bz * 0.2);
                fov = 0.6;
                break;
            }
            case 'sideline': {
                const fx = clamp(bx, -hx + 8, hx - 8);
                p.set(fx - attackDir * 6, 3.4, -38.5);
                t.set(fx + attackDir * 7, 0.6, bz * 0.45);
                fov = 0.9;
                break;
            }
            case 'ball': {
                const sp = Math.hypot(ball.vx, ball.vz);
                if (sp > 2) {
                    this.dirX += (ball.vx / sp - this.dirX) * Math.min(1, dt * 2);
                    this.dirZ += (ball.vz / sp - this.dirZ) * Math.min(1, dt * 2);
                }
                else {
                    this.dirX += (attackDir - this.dirX) * Math.min(1, dt);
                    this.dirZ += (0 - this.dirZ) * Math.min(1, dt);
                }
                const n = Math.hypot(this.dirX, this.dirZ) || 1, dx = this.dirX / n, dz = this.dirZ / n;
                p.set(bx - dx * 9, 5.2, bz - dz * 9);
                t.set(bx + dx * 7, 0.4, bz + dz * 7);
                fov = 0.9;
                break;
            }
            case 'goal_to_goal': {
                p.set(-attackDir * (hx + 16), 17, clamp(bz * 0.3, -10, 10));
                t.set(clamp(bx, -hx, hx) + attackDir * 14, 0, bz * 0.4);
                fov = 0.82;
                break;
            }
            case 'top_down': {
                const fx = clamp(bx * 0.7, -hx + 20, hx - 20);
                p.set(fx, 64, -9);
                t.set(fx, 0, 0);
                fov = 0.8;
                break;
            }
        }
        if (this.first) {
            this.pos.copyFrom(p);
            this.tgt.copyFrom(t);
            this.first = false;
        }
        const kp = 1 - Math.exp(-dt * 3.5), kt = 1 - Math.exp(-dt * 6);
        Vector3.LerpToRef(this.pos, p, kp, this.pos);
        Vector3.LerpToRef(this.tgt, t, kt, this.tgt);
        this.cam.position.copyFrom(this.pos);
        this.cam.setTarget(this.tgt);
        this.cam.fov += (fov - this.cam.fov) * kp;
        const fx = this.tgt.x - this.pos.x, fz = this.tgt.z - this.pos.z, n = Math.hypot(fx, fz) || 1;
        this.forward.x = fx / n;
        this.forward.z = fz / n;
    }
}
