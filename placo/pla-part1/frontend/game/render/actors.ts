import {
  Color3, DynamicTexture, InstancedMesh, Mesh, MeshBuilder, Quaternion, Scene, StandardMaterial, TransformNode, Vector3,
} from '@babylonjs/core';
import type { TeamSetup } from '@/lib/engine/contract';
import type { Physics } from '../core/params';
import type { World } from '../sim/world';

/**
 * Pose buffers: the renderer never reads the live sim directly. Each sim tick (or replay frame) writes
 * into `cur` and the previous tick is kept in `prev`, so drawing at any display rate interpolates smoothly.
 */
export class Pose {
  x = new Float32Array(22); z = new Float32Array(22); h = new Float32Array(22);
  spd = new Float32Array(22); ph = new Float32Array(22); kick = new Float32Array(22); dive = new Float32Array(22);
  bx = 0; by = 0; bz = 0;
  copy(o: Pose) { this.x.set(o.x); this.z.set(o.z); this.h.set(o.h); this.spd.set(o.spd); this.ph.set(o.ph); this.kick.set(o.kick); this.dive.set(o.dive); this.bx = o.bx; this.by = o.by; this.bz = o.bz; }
  fromWorld(w: World) {
    for (let i = 0; i < 22; i++) {
      const p = w.players[i]; if (!p) continue;
      this.x[i] = p.x; this.z[i] = p.z; this.h[i] = p.heading; this.spd[i] = p.speed; this.ph[i] = p.phase; this.kick[i] = p.kickT;
      this.dive[i] = p.dive && p.dive.t > p.dive.delay ? Math.sign(p.dive.z - p.dive.z0 || 1) * Math.min(1, (p.dive.t - p.dive.delay) / 0.25) : 0;
    }
    this.bx = w.ball.x; this.by = w.ball.y; this.bz = w.ball.z;
  }
}

const hex = (s: string | undefined, fb: string) => Color3.FromHexString(/^#[0-9a-f]{6}$/i.test(s ?? '') ? (s as string) : fb);
const SKIN = ['#8d5a3b', '#6b4029', '#b27a53'];

interface Rig { root: TransformNode; hipL: TransformNode; hipR: TransformNode; armL: TransformNode; armR: TransformNode; shadow: InstancedMesh; body: TransformNode }

export class Actors {
  rigs: Rig[] = [];
  ball: Mesh; ballShadow: Mesh; marker: Mesh;
  private ballQ = Quaternion.Identity();
  private markerT = 0;

  constructor(private scene: Scene, private P: Physics, home: TeamSetup, away: TeamSetup) {
    const mat = (name: string, col: Color3, emi = 0.25) => {
      const m = new StandardMaterial(name, scene); m.diffuseColor = col; m.specularColor = Color3.Black(); m.emissiveColor = col.scale(emi); return m;
    };
    // shared geometry
    const torsoSrc = MeshBuilder.CreateCapsule('torso', { height: 0.72, radius: 0.2, tessellation: 8, subdivisions: 1 }, scene);
    const headSrc = MeshBuilder.CreateSphere('head', { diameter: 0.27, segments: 6 }, scene);
    const legSrc = MeshBuilder.CreateCylinder('leg', { height: 0.84, diameterTop: 0.15, diameterBottom: 0.11, tessellation: 6 }, scene);
    const armSrc = MeshBuilder.CreateCylinder('arm', { height: 0.6, diameter: 0.09, tessellation: 5 }, scene);
    const sh = MeshBuilder.CreateDisc('shadow', { radius: 0.5, tessellation: 14 }, scene);
    sh.rotation.x = Math.PI / 2;
    const shM = new StandardMaterial('shM', scene); shM.diffuseColor = Color3.Black(); shM.emissiveColor = Color3.Black(); shM.alpha = 0.32; shM.specularColor = Color3.Black(); shM.disableDepthWrite = true;
    shM.zOffset = -2;
    sh.material = shM; sh.isVisible = false; sh.bakeCurrentTransformIntoVertices();
    [torsoSrc, headSrc, legSrc, armSrc].forEach(m => (m.isVisible = false));

    const kits = [home.kit, away.kit];
    const defaults = [{ primary: '#18a04a', secondary: '#ffffff', trim: '#f4cb34' }, { primary: '#ffffff', secondary: '#17202a', trim: '#147a3b' }];
    const gkCols = ['#f4cb34', '#2dd4ee'];

    // one source mesh per (team, part) so every player is a hardware instance
    const srcs = [0, 1].map(s => {
      const k = kits[s] ?? defaults[s];
      const prim = hex(k.primary, defaults[s].primary), sec = hex(k.secondary, defaults[s].secondary);
      const mk = (base: Mesh, name: string, col: Color3) => { const m = base.clone(`${name}${s}`); m.material = mat(`${name}${s}`, col); m.isVisible = false; return m; };
      return {
        torso: mk(torsoSrc, 'torso', prim), torsoGK: mk(torsoSrc, 'torsoGK', hex(gkCols[s], '#f4cb34')),
        leg: mk(legSrc, 'leg', sec), arm: mk(armSrc, 'arm', prim), armGK: mk(armSrc, 'armGK', hex(gkCols[s], '#f4cb34')),
      };
    });
    const heads = SKIN.map((c, i) => { const m = headSrc.clone(`head${i}`); m.material = mat(`skin${i}`, hex(c, '#8d5a3b'), 0.2); m.isVisible = false; return m; });

    for (let i = 0; i < 22; i++) {
      const side = i < 11 ? 0 : 1, S = srcs[side], isGK = (i % 11) === 0;
      const root = new TransformNode(`p${i}`, scene);
      const body = new TransformNode(`b${i}`, scene); body.parent = root;
      const torso = (isGK ? S.torsoGK : S.torso).createInstance(`t${i}`); torso.parent = body; torso.position.y = 1.2;
      const head = heads[i % 3].createInstance(`h${i}`); head.parent = body; head.position.y = 1.72;
      const mkHip = (x: number) => {
        const hip = new TransformNode(`hip${i}`, scene); hip.parent = body; hip.position.set(x, 0.86, 0);
        const leg = S.leg.createInstance(`l${i}`); leg.parent = hip; leg.position.y = -0.42; return hip;
      };
      const mkArm = (x: number) => {
        const a = new TransformNode(`sh${i}`, scene); a.parent = body; a.position.set(x, 1.45, 0);
        const m = (isGK ? S.armGK : S.arm).createInstance(`a${i}`); m.parent = a; m.position.y = -0.28; return a;
      };
      const shadow = sh.createInstance(`s${i}`); shadow.position.y = 0.02;
      this.rigs.push({ root, body, hipL: mkHip(-0.12), hipR: mkHip(0.12), armL: mkArm(-0.28), armR: mkArm(0.28), shadow });
    }

    // ball
    this.ball = MeshBuilder.CreateSphere('ball', { diameter: P.ballRadius * 2, segments: 12 }, scene);
    const bt = new DynamicTexture('ballTex', { width: 256, height: 128 }, scene, true);
    const c = bt.getContext() as CanvasRenderingContext2D;
    c.fillStyle = '#fafafa'; c.fillRect(0, 0, 256, 128); c.fillStyle = '#1b1b1b';
    for (const [x, y] of [[30, 30], [95, 90], [160, 35], [225, 95], [128, 64], [10, 100], [200, 20]]) { c.beginPath(); for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2 - Math.PI / 2; c.lineTo(x + Math.cos(a) * 15, y + Math.sin(a) * 15); } c.closePath(); c.fill(); }
    bt.update();
    const bm = new StandardMaterial('ballM', scene); bm.diffuseTexture = bt; bm.emissiveTexture = bt; bm.specularColor = Color3.Black(); bm.emissiveColor = new Color3(0.35, 0.35, 0.35);
    this.ball.material = bm; this.ball.rotationQuaternion = this.ballQ;
    this.ballShadow = sh.clone('ballShadow'); this.ballShadow.isVisible = true; this.ballShadow.position.y = 0.02;

    // controlled-player marker
    this.marker = MeshBuilder.CreateCylinder('marker', { height: 0.5, diameterTop: 0.5, diameterBottom: 0, tessellation: 4 }, scene);
    const mm = mat('markerM', new Color3(1, 0.85, 0.1), 1); mm.disableLighting = true; this.marker.material = mm;
    this.marker.rotation.x = Math.PI; this.marker.isVisible = false;
  }

  /** draw pose `a`→`b` at interpolation t (0..1), spin the ball by (wx,wy,wz) over dt */
  draw(a: Pose, b: Pose, t: number, dt: number, spin: Vector3, controlledIdx: number) {
    const lerp = (p: number, q: number) => p + (q - p) * t;
    for (let i = 0; i < 22; i++) {
      const r = this.rigs[i];
      const x = lerp(a.x[i], b.x[i]), z = lerp(a.z[i], b.z[i]);
      r.root.position.set(x, 0, z);
      let dh = b.h[i] - a.h[i]; while (dh > Math.PI) dh -= 2 * Math.PI; while (dh < -Math.PI) dh += 2 * Math.PI;
      r.root.rotation.y = Math.PI / 2 - (a.h[i] + dh * t);
      const spd = lerp(a.spd[i], b.spd[i]);
      const amp = Math.min(1, spd / 6) * 0.95, ph = lerp(a.ph[i], b.ph[i]);
      const sw = Math.sin(ph) * amp;
      r.hipL.rotation.x = -sw; r.hipR.rotation.x = sw;
      r.armL.rotation.x = sw * 0.9; r.armR.rotation.x = -sw * 0.9;
      const k = b.kick[i];
      if (k > 0) { // the single kick clip: plant, swing through
        const u = 1 - k / 0.32;
        r.hipR.rotation.x = u < 0.35 ? 0.9 * (u / 0.35) : 0.9 - 2.5 * ((u - 0.35) / 0.65);
        r.armL.rotation.x = -0.6; r.armR.rotation.x = 0.5;
      }
      r.body.rotation.x = Math.min(0.28, spd * 0.03);
      // goalkeeper dive pose
      const dv = b.dive[i];
      if (dv !== 0) { r.body.rotation.z = -dv * 1.25 * Math.sign(Math.cos(r.root.rotation.y)) ; r.body.position.y = -0.35 * Math.abs(dv); r.body.position.x = 0; } else { r.body.rotation.z = 0; r.body.position.y = 0; }
      r.shadow.position.set(x, 0.02, z);
    }
    const bx = lerp(a.bx, b.bx), by = lerp(a.by, b.by), bz = lerp(a.bz, b.bz);
    this.ball.position.set(bx, by, bz);
    const w = spin.length();
    if (w > 0.01) { const q = Quaternion.RotationAxis(spin.scale(1 / w), w * dt); this.ballQ.copyFrom(q.multiply(this.ballQ)); }
    this.ballShadow.position.set(bx, 0.025, bz);
    const sc = Math.max(0.35, 1 - by * 0.12); this.ballShadow.scaling.set(sc * 0.35, sc * 0.35, sc * 0.35);

    if (controlledIdx >= 0) {
      this.marker.isVisible = true; this.markerT += dt;
      this.marker.position.set(lerp(a.x[controlledIdx], b.x[controlledIdx]), 2.35 + Math.sin(this.markerT * 6) * 0.07, lerp(a.z[controlledIdx], b.z[controlledIdx]));
    } else this.marker.isVisible = false;
  }
}
