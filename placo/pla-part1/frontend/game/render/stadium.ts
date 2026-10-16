import {
  Color3, DynamicTexture, Mesh, MeshBuilder, Scene, StandardMaterial, VertexBuffer, VertexData, Vector3,
} from '@babylonjs/core';
import type { Physics } from '../core/params';

/**
 * Empty, minimal stadium: striped pitch with markings, goals with nets, a ring of ad boards that read
 * only "PRO LEAGUE AFRICA", a dark apron/wall and four floodlight masts. No seats, no crowd.
 */
export interface Net { mesh: Mesh; base: Float32Array; side: 1 | -1; nu: number; nv: number }

const std = (scene: Scene, name: string, color: string, emissive = 0.15) => {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor = Color3.FromHexString(color); m.specularColor = Color3.Black();
  m.emissiveColor = Color3.FromHexString(color).scale(emissive);
  return m;
};

function paintPitch(ctx: CanvasRenderingContext2D, W: number, H: number, L: number, Wd: number) {
  const s = W / L;
  const stripes = 14;
  for (let i = 0; i < stripes; i++) { ctx.fillStyle = i % 2 ? '#3fa34f' : '#369547'; ctx.fillRect((i * W) / stripes, 0, W / stripes + 1, H); }
  ctx.strokeStyle = 'rgba(255,255,255,0.92)'; ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.lineWidth = 0.13 * s;
  const X = (x: number) => W / 2 + x * s, Z = (z: number) => H / 2 + z * s;
  const hx = L / 2, hz = Wd / 2;
  ctx.strokeRect(X(-hx), Z(-hz), L * s, Wd * s);
  ctx.beginPath(); ctx.moveTo(X(0), Z(-hz)); ctx.lineTo(X(0), Z(hz)); ctx.stroke();
  ctx.beginPath(); ctx.arc(X(0), Z(0), 9.15 * s, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(X(0), Z(0), 0.3 * s, 0, Math.PI * 2); ctx.fill();
  for (const sg of [-1, 1]) {
    const gx = sg * hx;
    ctx.strokeRect(sg > 0 ? X(gx - 16.5) : X(gx), Z(-20.16), 16.5 * s, 40.32 * s);
    ctx.strokeRect(sg > 0 ? X(gx - 5.5) : X(gx), Z(-9.16), 5.5 * s, 18.32 * s);
    const px = gx - sg * 11;
    ctx.beginPath(); ctx.arc(X(px), Z(0), 0.3 * s, 0, Math.PI * 2); ctx.fill();
    const a = Math.acos((16.5 - 11) / 9.15);
    ctx.beginPath();
    if (sg > 0) ctx.arc(X(px), Z(0), 9.15 * s, Math.PI - a, Math.PI + a); else ctx.arc(X(px), Z(0), 9.15 * s, -a, a);
    ctx.stroke();
  }
  for (const cx of [-hx, hx]) for (const cz of [-hz, hz]) {
    ctx.beginPath();
    const a0 = (cx < 0 ? 0 : Math.PI / 2) + (cz < 0 ? 0 : -Math.PI / 2) * (cx < 0 ? 1 : -1);
    ctx.arc(X(cx), Z(cz), 1 * s, 0, Math.PI * 2); ctx.stroke(); void a0;
  }
}

export function buildStadium(scene: Scene, P: Physics) {
  const L = P.pitchLength, W = P.pitchWidth, hx = L / 2, hz = W / 2;

  // pitch (unlit texture = stable brightness on every device)
  const tex = new DynamicTexture('pitchTex', { width: 2048, height: Math.round((2048 * W) / L) }, scene, true);
  paintPitch(tex.getContext() as CanvasRenderingContext2D, 2048, Math.round((2048 * W) / L), L, W);
  tex.update();
  const pm = new StandardMaterial('pitch', scene);
  pm.diffuseTexture = tex; pm.emissiveTexture = tex; pm.disableLighting = true; pm.specularColor = Color3.Black();
  const pitch = MeshBuilder.CreateGround('pitch', { width: L, height: W }, scene);
  pitch.material = pm; pitch.isPickable = false; pitch.freezeWorldMatrix();

  const apron = MeshBuilder.CreateGround('apron', { width: L + 60, height: W + 46 }, scene);
  apron.position.y = -0.03; apron.material = std(scene, 'apronM', '#1c5428', 0.5); apron.freezeWorldMatrix();

  // perimeter wall (plain dark concrete, no seating)
  const wallM = std(scene, 'wallM', '#1b2229', 0.35);
  const wx = hx + 26, wz = hz + 19, wh = 9;
  for (const [w, d, x, z] of [[2 * wx, 1, 0, -wz], [2 * wx, 1, 0, wz], [1, 2 * wz, -wx, 0], [1, 2 * wz, wx, 0]] as const) {
    const m = MeshBuilder.CreateBox('wall', { width: w, depth: d, height: wh }, scene);
    m.position.set(x, wh / 2, z); m.material = wallM; m.freezeWorldMatrix();
  }

  // floodlight masts
  const poleM = std(scene, 'poleM', '#3a434b', 0.3), lampM = std(scene, 'lampM', '#fff6d5', 1);
  lampM.emissiveColor = new Color3(1, 0.97, 0.85); lampM.disableLighting = true;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const pole = MeshBuilder.CreateCylinder('pole', { diameter: 0.7, height: 34, tessellation: 8 }, scene);
    pole.position.set(sx * (hx + 17), 17, sz * (hz + 13)); pole.material = poleM; pole.freezeWorldMatrix();
    const lamp = MeshBuilder.CreateBox('lamp', { width: 5, height: 3, depth: 1 }, scene);
    lamp.position.set(sx * (hx + 17), 34, sz * (hz + 13)); lamp.lookAt(new Vector3(0, 0, 0)); lamp.material = lampM; lamp.freezeWorldMatrix();
  }

  // ad boards: only the club-neutral league name
  const mkBoardMat = (len: number) => {
    // one texture per segment, tiled so each repeat of the league name is ~5.3 m wide
    const reps = 3, bw = 2048, bh = 128;
    const bt = new DynamicTexture('adTex', { width: bw, height: bh }, scene, true);
    const c = bt.getContext() as CanvasRenderingContext2D;
    c.fillStyle = '#0f6b3a'; c.fillRect(0, 0, bw, bh);
    c.fillStyle = '#f4cb34'; c.fillRect(0, 0, bw, 8); c.fillRect(0, bh - 8, bw, 8);
    c.fillStyle = '#ffffff'; c.font = '800 66px Arial, Helvetica, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let i = 0; i < reps; i++) c.fillText('PRO LEAGUE AFRICA', (bw / reps) * (i + 0.5), bh / 2 + 3);
    bt.update(); bt.uScale = len / 16;
    const m = new StandardMaterial('ad', scene);
    m.diffuseTexture = bt; m.emissiveTexture = bt; m.disableLighting = true; m.specularColor = Color3.Black(); m.backFaceCulling = true;
    return m;
  };
  const boardH = 1.25, bx = hx + 7, bz = hz + 5;
  const seg = (len: number, x: number, z: number, rotY: number) => {
    const m = mkBoardMat(len);
    // inward face + outward face so the text reads correctly from either side
    for (const flip of [0, Math.PI]) {
      const p = MeshBuilder.CreatePlane('board', { width: len, height: boardH }, scene);
      p.position.set(x, boardH / 2, z); p.rotation.y = rotY + flip; p.material = m; p.freezeWorldMatrix();
    }
    const base = MeshBuilder.CreateBox('boardBase', { width: len, height: 0.12, depth: 0.2 }, scene);
    base.position.set(x, 0.06, z); base.rotation.y = rotY; base.material = wallM; base.freezeWorldMatrix();
  };
  // plane faces −z by default; rotY chosen so the visible side faces the pitch centre
  seg(2 * bx, 0, -bz, Math.PI); seg(2 * bx, 0, bz, 0);
  seg(2 * bz, -bx, 0, -Math.PI / 2); seg(2 * bz, bx, 0, Math.PI / 2);

  // goals
  const nets: Net[] = [];
  const white = std(scene, 'post', '#ffffff', 0.9);
  const gt = new DynamicTexture('netTex', { width: 256, height: 256 }, scene, true);
  const gc = gt.getContext() as CanvasRenderingContext2D;
  gc.clearRect(0, 0, 256, 256); gc.strokeStyle = 'rgba(255,255,255,0.65)'; gc.lineWidth = 3;
  for (let i = 0; i <= 256; i += 32) { gc.beginPath(); gc.moveTo(i, 0); gc.lineTo(i, 256); gc.stroke(); gc.beginPath(); gc.moveTo(0, i); gc.lineTo(256, i); gc.stroke(); }
  gt.hasAlpha = true; gt.update();
  const netM = new StandardMaterial('net', scene);
  netM.diffuseTexture = gt; netM.useAlphaFromDiffuseTexture = true; netM.emissiveColor = new Color3(1, 1, 1); netM.disableLighting = true; netM.backFaceCulling = false; netM.specularColor = Color3.Black();
  const gw = P.goalWidth, gh = P.goalHeight, gd = P.goalDepth;
  for (const sg of [1, -1] as const) {
    const gx = sg * hx;
    for (const z of [-gw / 2, gw / 2]) {
      const post = MeshBuilder.CreateCylinder('post', { diameter: 0.12, height: gh, tessellation: 10 }, scene);
      post.position.set(gx, gh / 2, z); post.material = white; post.freezeWorldMatrix();
    }
    const bar = MeshBuilder.CreateCylinder('bar', { diameter: 0.12, height: gw + 0.12, tessellation: 10 }, scene);
    bar.rotation.x = Math.PI / 2; bar.position.set(gx, gh, 0); bar.material = white; bar.freezeWorldMatrix();
    // back net: custom grid mesh so it can ripple
    const nu = 22, nv = 9, pos: number[] = [], uv: number[] = [], idx: number[] = [];
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
      pos.push(sg * (hx + gd), (gh * j) / nv, -gw / 2 + (gw * i) / nu); uv.push((i / nu) * 14, (j / nv) * 8);
    }
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i, b = a + 1, c2 = a + nu + 1, d = c2 + 1; idx.push(a, b, c2, b, d, c2);
    }
    const back = new Mesh('netBack', scene), vd = new VertexData();
    vd.positions = pos; vd.indices = idx; vd.uvs = uv; vd.normals = pos.map(() => 0);
    vd.applyToMesh(back, true); back.material = netM; back.alwaysSelectAsActiveMesh = true;
    nets.push({ mesh: back, base: new Float32Array(pos), side: sg, nu, nv });
    const sideNet = (z: number) => {
      const p = MeshBuilder.CreatePlane('netSide', { width: gd, height: gh }, scene);
      p.rotation.y = Math.PI / 2 * 0; p.position.set(gx + (sg * gd) / 2, gh / 2, z); p.material = netM;
      p.scaling.x = 1; p.freezeWorldMatrix();
    };
    sideNet(-gw / 2); sideNet(gw / 2);
    const roof = MeshBuilder.CreatePlane('netRoof', { width: gd, height: gw }, scene);
    roof.rotation.x = Math.PI / 2; roof.position.set(gx + (sg * gd) / 2, gh, 0); roof.material = netM; roof.freezeWorldMatrix();
  }

  return { nets };
}

/** Radial damped wave pushed outward from an impact point on the back net. */
export function rippleNet(n: Net, hit: { y: number; z: number; speed: number }, age: number, P: Physics) {
  const gw = P.goalWidth, gh = P.goalHeight;
  const posArr = n.mesh.getVerticesData(VertexBuffer.PositionKind)!;
  const amp = Math.min(0.9, 0.12 + hit.speed * 0.035) * Math.exp(-age * 2.4);
  const k = 5.5, w = 16;
  for (let j = 0; j <= n.nv; j++) for (let i = 0; i <= n.nu; i++) {
    const o = (j * (n.nu + 1) + i) * 3;
    const y = (gh * j) / n.nv, z = -gw / 2 + (gw * i) / n.nu;
    const r = Math.hypot(y - hit.y, z - hit.z);
    const edge = Math.min(1, i / 2, (n.nu - i) / 2, j / 2 + 0.2, (n.nv - j) / 2);
    posArr[o] = n.base[o] + n.side * amp * Math.exp(-r * 0.55) * Math.cos(k * r - w * age) * Math.max(0, edge);
  }
  n.mesh.updateVerticesData(VertexBuffer.PositionKind, posArr);
}

export function resetNet(n: Net) { n.mesh.updateVerticesData(VertexBuffer.PositionKind, new Float32Array(n.base)); }
