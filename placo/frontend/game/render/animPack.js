/**
 * Animation pack loader. Clips are stored as int16 quaternions (22 bones x F frames) + float32 hips position,
 * already retargeted to the PLACO player skeleton by tools/build_pack.py. See docs/README.md.
 */
export const BONE = {
    Hips: 0, Spine: 1, Spine1: 2, Spine2: 3, Neck: 4, Head: 5,
    LShoulder: 6, LArm: 7, LForeArm: 8, LHand: 9, RShoulder: 10, RArm: 11, RForeArm: 12, RHand: 13,
    LUpLeg: 14, LLeg: 15, LFoot: 16, LToe: 17, RUpLeg: 18, RLeg: 19, RFoot: 20, RToe: 21,
};
export const NB = 22;

export async function loadPack(dir) {
    const [meta, buf] = await Promise.all([
        fetch(dir + 'anims.json').then(r => { if (!r.ok) throw new Error('anims.json ' + r.status); return r.json(); }),
        fetch(dir + 'anims.bin').then(r => { if (!r.ok) throw new Error('anims.bin ' + r.status); return r.arrayBuffer(); }),
    ]);
    const clips = {};
    for (const [name, e] of Object.entries(meta.clips)) {
        const F = e.F;
        const qi = new Int16Array(buf, e.q, F * NB * 4);
        const q = new Float32Array(F * NB * 4);
        for (let i = 0; i < q.length; i += 4) {
            const x = qi[i] / 32767, y = qi[i + 1] / 32767, z = qi[i + 2] / 32767, w = qi[i + 3] / 32767;
            const l = 1 / (Math.hypot(x, y, z, w) || 1);
            q[i] = x * l; q[i + 1] = y * l; q[i + 2] = z * l; q[i + 3] = w * l;
        }
        const h = new Float32Array(buf.slice(e.h, e.h + F * 12));
        // direction of travel in glTF-local space (x = character LEFT, z = forward), for locomotion clips
        const dl = Math.hypot(e.disp[0], e.disp[1]);
        clips[name] = { name, F, dur: e.dur, q, h, loop: !!e.loop, loco: !!e.loco, speed: e.speed, contact: e.contact ?? 0,
            ang: dl > 0.3 ? Math.atan2(e.disp[0], e.disp[1]) : 0 };
    }
    return { fps: meta.fps, clips };
}

/** sample clip at time t (seconds) into q (88 floats) and h (3 floats) */
export function sampleClip(c, t, q, h) {
    const f = c.F;
    let u = t * 30;
    if (c.loop) { u = u % (f - 1); if (u < 0) u += f - 1; } else u = Math.max(0, Math.min(f - 1, u));
    const i0 = Math.floor(u), i1 = Math.min(f - 1, i0 + 1), a = u - i0;
    const A = c.q, o0 = i0 * 88, o1 = i1 * 88;
    for (let b = 0; b < 88; b += 4) {
        const ax = A[o0 + b], ay = A[o0 + b + 1], az = A[o0 + b + 2], aw = A[o0 + b + 3];
        let bx = A[o1 + b], by = A[o1 + b + 1], bz = A[o1 + b + 2], bw = A[o1 + b + 3];
        if (ax * bx + ay * by + az * bz + aw * bw < 0) { bx = -bx; by = -by; bz = -bz; bw = -bw; }
        let x = ax + (bx - ax) * a, y = ay + (by - ay) * a, z = az + (bz - az) * a, w = aw + (bw - aw) * a;
        const l = 1 / (Math.hypot(x, y, z, w) || 1);
        q[b] = x * l; q[b + 1] = y * l; q[b + 2] = z * l; q[b + 3] = w * l;
    }
    const H = c.h;
    h[0] = H[i0 * 3] + (H[i1 * 3] - H[i0 * 3]) * a;
    h[1] = H[i0 * 3 + 1] + (H[i1 * 3 + 1] - H[i0 * 3 + 1]) * a;
    h[2] = H[i0 * 3 + 2] + (H[i1 * 3 + 2] - H[i0 * 3 + 2]) * a;
}

/** dst = nlerp(dst, src, w) for a full pose */
export function blendPose(dq, dh, sq, sh, w) {
    if (w <= 0) return;
    if (w >= 1) { dq.set(sq); dh.set(sh); return; }
    for (let b = 0; b < 88; b += 4) {
        let sx = sq[b], sy = sq[b + 1], sz = sq[b + 2], sw = sq[b + 3];
        if (dq[b] * sx + dq[b + 1] * sy + dq[b + 2] * sz + dq[b + 3] * sw < 0) { sx = -sx; sy = -sy; sz = -sz; sw = -sw; }
        const x = dq[b] + (sx - dq[b]) * w, y = dq[b + 1] + (sy - dq[b + 1]) * w, z = dq[b + 2] + (sz - dq[b + 2]) * w, ww = dq[b + 3] + (sw - dq[b + 3]) * w;
        const l = 1 / (Math.hypot(x, y, z, ww) || 1);
        dq[b] = x * l; dq[b + 1] = y * l; dq[b + 2] = z * l; dq[b + 3] = ww * l;
    }
    dh[0] += (sh[0] - dh[0]) * w; dh[1] += (sh[1] - dh[1]) * w; dh[2] += (sh[2] - dh[2]) * w;
}

/** pre-multiply bone `b` by a rotation about a local axis (parent frame): axis 0=X,1=Y,2=Z */
export function addRot(q, b, axis, ang) {
    const s = Math.sin(ang * 0.5), c = Math.cos(ang * 0.5);
    const rx = axis === 0 ? s : 0, ry = axis === 1 ? s : 0, rz = axis === 2 ? s : 0, rw = c;
    const o = b * 4, x = q[o], y = q[o + 1], z = q[o + 2], w = q[o + 3];
    q[o] = rw * x + rx * w + ry * z - rz * y;
    q[o + 1] = rw * y - rx * z + ry * w + rz * x;
    q[o + 2] = rw * z + rx * y - ry * x + rz * w;
    q[o + 3] = rw * w - rx * x - ry * y - rz * z;
}
