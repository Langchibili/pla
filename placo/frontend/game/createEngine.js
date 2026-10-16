import { Color3, Color4, DirectionalLight, Engine, HemisphericLight, MeshBuilder, Scene, Vector3, } from '@babylonjs/core';
import { SIM_BUILD } from '@/lib/config';
import { DT, World } from './sim/world';
import { Actors, Pose } from './render/actors';
import { CameraRig } from './render/cameras';
import { buildStadium, rippleNet, resetNet } from './render/stadium';
const MAX_STEPS = 5;
const REC_HZ = 30, REC_N = REC_HZ * 14;
/**
 * Babylon match engine. Black box: MatchConfig in → events / MatchResult out.
 * Fixed 60 Hz simulation (ball at 240 Hz), decoupled from render rate with pose interpolation.
 */
export const createEngine = async (canvas, config) => {
    const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 1.75);
    const engine = new Engine(canvas, false, { stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: false }, false);
    const baseScale = 1 / dpr;
    engine.setHardwareScalingLevel(baseScale);
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.04, 0.08, 0.11, 1);
    scene.skipPointerMovePicking = true;
    scene.autoClearDepthAndStencil = true;
    scene.fogMode = Scene.FOGMODE_EXP2;
    scene.fogDensity = 0.0035;
    scene.fogColor = new Color3(0.04, 0.08, 0.11);
    const hemi = new HemisphericLight('hemi', new Vector3(0.2, 1, 0.1), scene);
    hemi.intensity = 0.85;
    hemi.groundColor = new Color3(0.25, 0.3, 0.28);
    const sun = new DirectionalLight('sun', new Vector3(-0.4, -1, 0.3), scene);
    sun.intensity = 0.45;
    // listeners
    const handlers = { ready: [], score: [], clock: [], goal: [], banner: [], fps: [], finished: [], error: [] };
    const emit = (ev, ...args) => { for (const f of handlers[ev])
        f(...args); };
    const world = new World(config, {
        event: () => { },
        banner: t => emit('banner', t),
        score: (h, a) => emit('score', { home: h, away: a }),
        goal: side => onGoal(side === 0 ? 'home' : 'away'),
        finished: r => emit('finished', r),
        kick: () => { },
    }, SIM_BUILD);
    const P = world.P;
    const { nets } = buildStadium(scene, P);
    const actors = new Actors(scene, P, config.home, config.away);
    const rig = new CameraRig(scene, world.hx, world.hz);
    rig.setMode(config.camera);
    // pose buffers
    let prev = new Pose(), cur = new Pose(), tmpPose = new Pose();
    cur.fromWorld(world);
    prev.copy(cur);
    // replay recorder (ring buffer of poses at 30 Hz)
    const rec = Array.from({ length: REC_N }, () => new Pose());
    let recCount = 0;
    const record = () => { rec[recCount % REC_N].copy(cur); recCount++; };
    let rstate = 'live', waitT = 0, goalIdx = 0, replayPos = 0, goalNet = null, rippleAge = 99, rippleNet_ = null;
    function onGoal(_side) {
        emit('goal', { side: _side });
        world.extendGoalHold(600);
        rstate = 'wait';
        waitT = 1.7;
        goalIdx = recCount - 1;
        // netHit gets captured in the loop (ball reaches the net a few frames after the whistle)
    }
    // debug overlay (F3)
    let debug = false;
    const dbgLines = MeshBuilder.CreateLineSystem('dbg', { lines: Array.from({ length: 23 }, () => [Vector3.Zero(), Vector3.Zero()]), updatable: true }, scene);
    dbgLines.color = new Color3(1, 0.2, 0.9);
    dbgLines.isVisible = false;
    dbgLines.alwaysSelectAsActiveMesh = true;
    let dbgInst = dbgLines;
    const onKey = (e) => { if (e.key === 'F3') {
        debug = !debug;
        dbgLines.isVisible = debug;
        e.preventDefault();
    } };
    window.addEventListener('keydown', onKey);
    const updateDebug = () => {
        const lines = world.players.map(p => [new Vector3(p.x, 0.1, p.z), new Vector3(p.tx, 0.1, p.tz)]);
        lines.push([new Vector3(world.ball.x, world.ball.y, world.ball.z), new Vector3(world.ball.x + world.ball.vx * 0.4, world.ball.y + world.ball.vy * 0.4, world.ball.z + world.ball.vz * 0.4)]);
        dbgInst = MeshBuilder.CreateLineSystem('dbg', { lines, instance: dbgInst });
    };
    // resize
    const onResize = () => engine.resize();
    window.addEventListener('resize', onResize);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null;
    ro?.observe(canvas);
    let acc = 0, paused = true, started = false, lastClock = '', fpsT = 0, govT = 0;
    const spin = new Vector3();
    let lastNow = performance.now();
    const frame = () => {
        const now = performance.now();
        let dt = Math.min(0.1, (now - lastNow) / 1000);
        lastNow = now;
        if (!started)
            return;
        if (!paused) {
            if (rstate === 'replay') {
                replayPos += dt * REC_HZ * 0.7;
                const end = Math.min(recCount - 1, goalIdx + REC_HZ * 1.6);
                if (replayPos >= end - 0.01) {
                    endReplay();
                }
                else {
                    const i0 = Math.floor(replayPos), f = replayPos - i0;
                    const a = rec[i0 % REC_N], b = rec[Math.min(i0 + 1, recCount - 1) % REC_N];
                    prev.copy(a);
                    cur.copy(b);
                    acc = f * DT; // render alpha uses acc/DT
                    if (goalNet && replayPos >= goalIdx + 2 && rippleAge > 50) {
                        rippleAge = 0;
                        rippleNet_ = nets.find(n => n.side === goalNet.side) ?? null;
                    }
                }
            }
            else {
                rig.setMode(rig.mode); // keep
                world.setCamBasis(rig.forward.x, rig.forward.z);
                acc += dt;
                let steps = 0;
                while (acc >= DT && steps < MAX_STEPS) {
                    world.step(DT);
                    steps++;
                    acc -= DT;
                    // swap pose buffers
                    const t = prev;
                    prev = cur;
                    cur = t;
                    cur.fromWorld(world);
                    if (world.tick % 2 === 0)
                        record();
                    if (world.ball.netHit.pending) {
                        const h = world.ball.netHit;
                        h.pending = false;
                        if (world.phase === 'goal' || world.lastGoal && world.simT - world.lastGoal.t < 1) {
                            rippleAge = 0;
                            rippleNet_ = nets.find(n => n.side === (world.ball.x > 0 ? 1 : -1)) ?? null;
                            goalNet = { y: h.y, z: h.z, speed: h.speed, side: world.ball.x > 0 ? 1 : -1 };
                        }
                        h.speed = 0;
                    }
                }
                if (steps === MAX_STEPS)
                    acc = 0;
                if (rstate === 'wait') {
                    waitT -= dt;
                    if (waitT <= 0)
                        startReplay();
                }
                const label = world.clockLabel;
                if (label !== lastClock) {
                    lastClock = label;
                    emit('clock', { seconds: world.clockT, period: world.period, label });
                }
            }
        }
        const alpha = paused ? 1 : Math.min(1, acc / DT);
        // ball spin from the sim (live only)
        if (rstate !== 'replay')
            spin.set(world.ball.wx, world.ball.wy, world.ball.wz);
        else
            spin.set(0, 0, 0);
        actors.draw(prev, cur, alpha, paused ? 0 : dt, spin, rstate === 'replay' || world.phase === 'goal' ? -1 : (world.controlled?.id ?? -1));
        // camera
        const attackDir = world.dir(world.humanSide);
        const bx = prev.bx + (cur.bx - prev.bx) * alpha, bz = prev.bz + (cur.bz - prev.bz) * alpha;
        rig.update(dt, { x: bx, y: cur.by, z: bz, vx: world.ball.vx, vz: world.ball.vz }, attackDir);
        if (rippleNet_ && rippleAge < 2.4) {
            rippleAge += dt;
            goalNet && rippleNet(rippleNet_, goalNet, rippleAge, P);
            if (rippleAge >= 2.4) {
                resetNet(rippleNet_);
                rippleNet_ = null;
            }
        }
        if (debug)
            updateDebug();
        scene.render();
        fpsT += dt;
        govT += dt;
        if (fpsT >= 1) {
            fpsT = 0;
            emit('fps', Math.round(engine.getFps()));
        }
        if (govT >= 2) { // resolution governor: protect frame rate on weak phones
            govT = 0;
            const fps = engine.getFps(), lvl = engine.getHardwareScalingLevel();
            if (fps < 44 && lvl < baseScale * 2)
                engine.setHardwareScalingLevel(lvl * 1.15);
            else if (fps > 58 && lvl > baseScale)
                engine.setHardwareScalingLevel(Math.max(baseScale, lvl / 1.06));
        }
    };
    function startReplay() {
        const oldest = Math.max(0, recCount - REC_N);
        replayPos = Math.max(oldest + 1, goalIdx - REC_HZ * 5);
        rstate = 'replay';
        emit('banner', 'REPLAY');
        rippleAge = 99;
        if (rippleNet_) {
            resetNet(rippleNet_);
        }
        rig.setMode('tv');
    }
    function endReplay() {
        rstate = 'live';
        rippleAge = 99;
        for (const n of nets)
            resetNet(n);
        rippleNet_ = null;
        rig.setMode(userCam);
        world.endGoalSequence();
        cur.fromWorld(world);
        prev.copy(cur);
        acc = 0;
    }
    let userCam = config.camera;
    const api = {
        start() { started = true; paused = false; lastNow = performance.now(); engine.runRenderLoop(frame); emit('ready'); },
        pause() { paused = true; },
        resume() { paused = false; lastNow = performance.now(); },
        setInput(i) { world.setInput(i); },
        setCamera(m) { userCam = m; if (rstate !== 'replay')
            rig.setMode(m); },
        switchPlayer() { world.switchPlayer(); },
        on(ev, cb) { handlers[ev].push(cb); return () => { const a = handlers[ev]; const i = a.indexOf(cb); if (i >= 0)
            a.splice(i, 1); }; },
        dispose() {
            engine.stopRenderLoop(frame);
            window.removeEventListener('resize', onResize);
            window.removeEventListener('keydown', onKey);
            ro?.disconnect();
            scene.dispose();
            engine.dispose();
        },
    };
    void tmpPose;
    engine.resize();
    return api;
};
