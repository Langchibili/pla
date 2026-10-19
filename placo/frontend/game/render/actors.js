import '@babylonjs/loaders/glTF';
import { Color3, DynamicTexture, MeshBuilder, Quaternion, RawTexture, SceneLoader, StandardMaterial, Texture, TransformNode } from '@babylonjs/core';
import { loadPack } from './animPack';
import { PlayerAnimator } from './playerAnimator';

export const ASSETS = { dir: '/assets/players/', model: 'player.glb', height: 1.8, scale: 1.1, heightVariance: 0.04 };

const PH = { kickoff: 1, live: 0, dead: 2, goal: 3, halftime: 4, fulltime: 5 };
const RK = { free: 1, penalty: 2, throw: 3, corner: 4, goalkick: 5, indirect: 6, kickoff: 7 };
const KK = { pass: 1, through: 2, shot: 3, lob: 4, clear: 5, throw: 6, head: 7, parry: 8 };

/**
 * Pose buffers: the renderer never reads the live sim directly. Each sim tick (or replay frame) writes
 * into `cur` and the previous tick is kept in `prev`, so drawing at any display rate interpolates smoothly.
 * Everything below `dive` is READ-ONLY animation metadata copied from the sim; it never feeds back into it.
 */
export class Pose {
    x = new Float32Array(22); z = new Float32Array(22); h = new Float32Array(22);
    spd = new Float32Array(22); ph = new Float32Array(22); kick = new Float32Array(22); dive = new Float32Array(22);
    vx = new Float32Array(22); vz = new Float32Array(22);
    tk = new Float32Array(22); stun = new Float32Array(22); hold = new Uint8Array(22);
    dvy = new Float32Array(22); kk = new Uint8Array(22);
    own = -1; gph = 0; scorer = -1; scorerSide = -1; rk = 0; rtaker = -1; rside = -1; rx = 0; rz = 0;
    bx = 0; by = 0; bz = 0; bvx = 0; bvy = 0; bvz = 0;
    copy(o) {
        for (const k of ['x', 'z', 'h', 'spd', 'ph', 'kick', 'dive', 'vx', 'vz', 'tk', 'stun', 'hold', 'dvy', 'kk']) this[k].set(o[k]);
        for (const k of ['own', 'gph', 'scorer', 'scorerSide', 'rk', 'rtaker', 'rside', 'rx', 'rz', 'bx', 'by', 'bz', 'bvx', 'bvy', 'bvz']) this[k] = o[k];
    }
    fromWorld(w) {
        for (let i = 0; i < 22; i++) {
            const p = w.players[i];
            if (!p) continue;
            this.x[i] = p.x; this.z[i] = p.z; this.h[i] = p.heading; this.spd[i] = p.speed; this.ph[i] = p.phase; this.kick[i] = p.kickT;
            this.dive[i] = p.dive && p.dive.t > p.dive.delay ? Math.sign(p.dive.z - p.dive.z0 || 1) * Math.min(1, (p.dive.t - p.dive.delay) / 0.25) : 0;
            this.vx[i] = p.vx; this.vz[i] = p.vz; this.tk[i] = p.tackleCd; this.stun[i] = p.stun; this.hold[i] = p.gkHolding ? 1 : 0;
            this.dvy[i] = p.dive ? p.dive.y : 0;
            this.kk[i] = p.kickKind ? (KK[p.kickKind] ?? 0) : 0; // optional 1-line sim metadata, see docs/README.md
        }
        this.own = w.owner ? w.owner.id : -1;
        this.gph = PH[w.phase] ?? 0;
        this.scorer = -1; this.scorerSide = -1;
        if (w.phase === 'goal' && w.lastGoal) {
            const s = w.lastGoal.side;
            const sc = w.lastToucher && w.lastToucher.side === s ? w.lastToucher : (w.prevToucher && w.prevToucher.side === s ? w.prevToucher : null);
            this.scorerSide = s; this.scorer = sc ? sc.id : -1;
        }
        const R = w.restart;
        this.rk = R ? (RK[R.kind] ?? 0) : 0; this.rtaker = R && R.taker ? R.taker.id : -1; this.rside = R ? R.side : -1;
        this.rx = R ? R.x : 0; this.rz = R ? R.z : 0;
        this.bx = w.ball.x; this.by = w.ball.y; this.bz = w.ball.z;
        this.bvx = w.ball.vx; this.bvy = w.ball.vy; this.bvz = w.ball.vz;
    }
}

const hex = (s, fb) => Color3.FromHexString(/^#[0-9a-f]{6}$/i.test(s ?? '') ? s : fb);
const SKIN = ['#f1c9a5', '#e0ac82', '#c68642', '#a9683f', '#8d5524', '#6b3e26', '#4a2c1a'];
const HAIR = ['#0e0c0a', '#1b130e', '#2b1b10', '#3a2616', '#6a4a2a', '#b08a52'];
const hash = (i, m) => ((i * 2654435761) >>> 0) % m;
const BONE_NAMES = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand',
    'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase', 'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase'];

/** palette order matches the UVs baked into player.glb: skin, jersey, shorts, socks, trim, hair, boots */
function paletteTexture(scene, name, c) {
    const d = new Uint8Array(8 * 4);
    c.forEach((col, i) => { d[i * 4] = Math.round(col.r * 255); d[i * 4 + 1] = Math.round(col.g * 255); d[i * 4 + 2] = Math.round(col.b * 255); d[i * 4 + 3] = 255; });
    const t = RawTexture.CreateRGBATexture(d, 8, 1, scene, false, false, Texture.NEAREST_SAMPLINGMODE);
    t.name = name; t.wrapU = t.wrapV = Texture.CLAMP_ADDRESSMODE;
    return t;
}

export class Actors {
    /** `await Actors.create(scene, P, home, away, { shadows })` — same draw() contract as the old class. */
    static async create(scene, P, home, away, opts = {}) {
        const a = new Actors(scene, P, home, away, opts);
        await a.load();
        return a;
    }
    constructor(scene, P, home, away, opts) {
        this.scene = scene; this.P = P; this.home = home; this.away = away; this.opts = opts;
        this.rigs = []; this.markerT = 0; this.ballQ = Quaternion.Identity(); this.time = 0;
        this.S = Array.from({ length: 22 }, () => ({}));
        this._buildShadowBlob(); this._buildBall();
    }

    async load() {
        const { scene } = this;
        const [container, pack] = await Promise.all([
            SceneLoader.LoadAssetContainerAsync(ASSETS.dir, ASSETS.model, scene),
            loadPack(ASSETS.dir),
        ]);
        // The instantiated meshes share geometry with the container.
        this.assetContainer = container;
        this.pack = pack;
        const kits = [this.home.kit, this.away.kit];
        const defaults = [{ primary: '#18a04a', secondary: '#ffffff', trim: '#f4cb34' }, { primary: '#ffffff', secondary: '#17202a', trim: '#147a3b' }];
        const gkCols = ['#f4cb34', '#2dd4ee'];
        const mat = new StandardMaterial('kitM', scene);
        mat.specularColor = new Color3(0.06, 0.06, 0.06); mat.emissiveColor = new Color3(0.1, 0.1, 0.1);
        mat.useVertexColors = true; mat.vertexAlpha = false;
        let fit = null;
        for (let i = 0; i < 22; i++) {
            const side = i < 11 ? 0 : 1, keeper = i % 11 === 0, kit = kits[side] ?? defaults[side], d = defaults[side];
            const inst = container.instantiateModelsToScene(n => n, false, { doNotInstantiate: true });
            const root = new TransformNode(`p${i}`, scene), wrap = new TransformNode(`w${i}`, scene);
            wrap.parent = root;
            inst.rootNodes.forEach(n => { n.parent = wrap; });
            const m = mat.clone(`kit${i}`);
            const jersey = hex(keeper ? gkCols[side] : kit.primary, d.primary), shorts = hex(kit.secondary, d.secondary), trim = hex(kit.trim, d.trim);
            m.diffuseTexture = paletteTexture(scene, `pal${i}`, [hex(SKIN[hash(i + 3, SKIN.length)], '#c68642'), jersey, shorts, keeper ? jersey : shorts, trim, hex(HAIR[hash(i + 11, HAIR.length)], '#1b130e'), hex('#101418', '#101418'), Color3.White()]);
            for (const mesh of root.getChildMeshes()) {
                mesh.material = m; mesh.isPickable = false; mesh.alwaysSelectAsActiveMesh = true;
                this.opts.shadows?.addShadowCaster(mesh);
            }
            const nodes = new Array(22);
            const all = [...root.getChildTransformNodes(false)];
            BONE_NAMES.forEach((n, b) => { nodes[b] = all.find(t => t.name === n) ?? null; if (nodes[b] && !nodes[b].rotationQuaternion) nodes[b].rotationQuaternion = new Quaternion(); });
            const missingBones = BONE_NAMES.filter((_, b) => !nodes[b]);
            if (missingBones.length) throw new Error(`Player GLB is missing required bones: ${missingBones.join(', ')}`);
            if (fit === null) fit = ASSETS.scale * ASSETS.height / 1.8;
            wrap.scaling.setAll(fit * (1 + ((hash(i * 7 + 1, 1000) / 1000 - 0.5) * 2) * ASSETS.heightVariance));
            const shadow = this.blob.createInstance(`s${i}`); shadow.position.y = 0.02;
            this.rigs.push({ root, wrap, nodes, shadow, anim: new PlayerAnimator(i, pack, keeper) });
        }
    }

    dispose() { /* scene.dispose() in createEngine frees everything */ }

    /** draw pose a→b at interpolation t (0..1), spin the ball by `spin` over dt */
    draw(a, b, t, dt, spin, controlledIdx) {
        const lerp = (p, q) => p + (q - p) * t;
        this.time += dt;
        const ball = { x: lerp(a.bx, b.bx), y: lerp(a.by, b.by), z: lerp(a.bz, b.bz) };
        const bsp = Math.hypot(b.bvx, b.bvz, b.bvy);
        const ownIdx = b.own;
        for (let i = 0; i < 22; i++) {
            const r = this.rigs[i];
            if (!r) continue;
            const x = lerp(a.x[i], b.x[i]), z = lerp(a.z[i], b.z[i]);
            let dh = b.h[i] - a.h[i];
            while (dh > Math.PI) dh -= 2 * Math.PI;
            while (dh < -Math.PI) dh += 2 * Math.PI;
            const S = this.S[i];
            S.idx = i; S.side = i < 11 ? 0 : 1; S.dt = dt; S.time = this.time;
            S.x = x; S.z = z; S.h = a.h[i] + dh * t;
            S.vx = lerp(a.vx[i], b.vx[i]); S.vz = lerp(a.vz[i], b.vz[i]); S.spd = lerp(a.spd[i], b.spd[i]);
            S.kick = b.kick[i]; S.tk = b.tk[i]; S.stun = b.stun[i]; S.hold = !!b.hold[i]; S.dive = b.dive[i]; S.dvy = b.dvy[i]; S.kk = b.kk[i];
            S.own = ownIdx; S.gph = b.gph; S.scorer = b.scorer; S.scorerSide = b.scorerSide;
            S.rk = b.rk; S.rtaker = b.rtaker; S.rside = b.rside; S.rnear = Math.hypot(b.rx - x, b.rz - z);
            S.bx = ball.x; S.bz = ball.z; S.by = ball.y; S.bvy = b.bvy; S.bsp = bsp;
            S.ballDist = Math.hypot(ball.x - x, ball.z - z);
            S.defending = false; S.ox = 0; S.oz = 0;
            if (ownIdx >= 0 && (ownIdx < 11) !== (i < 11) && b.gph === 0) {
                S.ox = lerp(a.x[ownIdx], b.x[ownIdx]); S.oz = lerp(a.z[ownIdx], b.z[ownIdx]);
                S.defending = i % 11 !== 0 && Math.hypot(S.ox - x, S.oz - z) < 9;
            }
            const vh = r.anim.update(S, r.nodes);
            r.root.position.set(x, 0, z);
            r.root.rotation.y = Math.PI / 2 - vh;
            r.shadow.position.set(x, 0.02, z);
        }
        this.ball.position.set(ball.x, ball.y, ball.z);
        const w = spin.length();
        if (w > 0.01) this.ballQ.copyFrom(Quaternion.RotationAxis(spin.scale(1 / w), w * dt).multiply(this.ballQ));
        this.ballShadow.position.set(ball.x, 0.025, ball.z);
        const sc = Math.max(0.35, 1 - ball.y * 0.12);
        this.ballShadow.scaling.setAll(sc * 0.35);
        if (controlledIdx >= 0) {
            this.marker.isVisible = true; this.markerT += dt;
            this.marker.position.set(lerp(a.x[controlledIdx], b.x[controlledIdx]), 2.45 + Math.sin(this.markerT * 6) * 0.07, lerp(a.z[controlledIdx], b.z[controlledIdx]));
        } else this.marker.isVisible = false;
    }

    _buildShadowBlob() {
        const sh = MeshBuilder.CreateDisc('shadow', { radius: 0.5, tessellation: 20 }, this.scene);
        sh.rotation.x = Math.PI / 2;
        const m = new StandardMaterial('shM', this.scene);
        m.diffuseColor = Color3.Black(); m.emissiveColor = Color3.Black(); m.specularColor = Color3.Black();
        m.alpha = 0.32; m.disableDepthWrite = true; m.zOffset = -2;
        sh.material = m; sh.isVisible = false; sh.bakeCurrentTransformIntoVertices();
        sh.scaling.setAll(0.7);
        this.blob = sh;
    }

    _buildBall() {
        const { scene, P } = this;
        this.ball = MeshBuilder.CreateSphere('ball', { diameter: P.ballRadius * 2, segments: 16 }, scene);
        const bt = new DynamicTexture('ballTex', { width: 256, height: 128 }, scene, true), c = bt.getContext();
        c.fillStyle = '#fafafa'; c.fillRect(0, 0, 256, 128); c.fillStyle = '#1b1b1b';
        for (const [x, y] of [[30, 30], [95, 90], [160, 35], [225, 95], [128, 64], [10, 100], [200, 20]]) {
            c.beginPath();
            for (let k = 0; k < 5; k++) { const an = (k / 5) * Math.PI * 2 - Math.PI / 2; c.lineTo(x + Math.cos(an) * 15, y + Math.sin(an) * 15); }
            c.closePath(); c.fill();
        }
        bt.update();
        const bm = new StandardMaterial('ballM', scene);
        bm.diffuseTexture = bt; bm.emissiveTexture = bt; bm.specularColor = Color3.Black(); bm.emissiveColor = new Color3(0.35, 0.35, 0.35);
        this.ball.material = bm; this.ball.rotationQuaternion = this.ballQ;
        this.ballShadow = this.blob.clone('ballShadow'); this.ballShadow.isVisible = true;
        this.marker = MeshBuilder.CreateCylinder('marker', { height: 0.5, diameterTop: 0.5, diameterBottom: 0, tessellation: 4 }, scene);
        const mm = new StandardMaterial('markerM', scene); mm.emissiveColor = new Color3(1, 0.85, 0.1); mm.disableLighting = true;
        this.marker.material = mm; this.marker.rotation.x = Math.PI; this.marker.isVisible = false;
    }
}
