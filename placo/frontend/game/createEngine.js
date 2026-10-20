import { Color3, Color4, DirectionalLight, Engine, HemisphericLight, Layer, MeshBuilder, Scene, Vector3, } from '@babylonjs/core';
import { SIM_BUILD } from '@/lib/config';
import { DT, World } from './sim/world';
import { Actors, Pose } from './render/actors';
import { CameraRig } from './render/cameras';
import { buildStadium, rippleNet, resetNet } from './render/stadium';
const MAX_STEPS = 5;
const REC_HZ = 30, REC_N = REC_HZ * 14;
let activeMatchEngines = 0;
/**
 * Babylon match engine. Black box: MatchConfig in → events / MatchResult out.
 * Fixed 60 Hz simulation (ball at 240 Hz), decoupled from render rate with pose interpolation.
 */
export const createEngine = async (canvas, config, options = {}) => {
    const { signal, onProgress } = options;
    if (signal?.aborted)
        throw signal.reason ?? new Error('Match engine creation was cancelled');
    const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 1.75);
    const engine = new Engine(canvas, false, { stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: false }, false);
    activeMatchEngines++;
    if (process.env.NODE_ENV === 'development' && activeMatchEngines > 1)
        console.warn(`Multiple PLACO match engines are active (${activeMatchEngines}).`);
    const baseScale = 1 / dpr;
    engine.setHardwareScalingLevel(baseScale);
    const scene = new Scene(engine);
    let actors = null;
    let disposed = false, frame = null, ro = null, readyEmitted = false;
    let debug = false, dbgLines = null;
    const onResize = () => engine.resize();
    const onKey = (e) => {
        if (e.key === 'F3') {
            debug = !debug;
            dbgLines.isVisible = debug;
            e.preventDefault();
        }
    };
    const cleanup = () => {
        if (disposed)
            return;
        disposed = true;
        if (frame)
            engine.stopRenderLoop(frame);
        window.removeEventListener('resize', onResize);
        window.removeEventListener('keydown', onKey);
        ro?.disconnect();
        signal?.removeEventListener('abort', onAbort);
        scene.dispose();
        actors?.dispose();
        engine.dispose();
        activeMatchEngines = Math.max(0, activeMatchEngines - 1);
    };
    const onAbort = () => cleanup();
    signal?.addEventListener('abort', onAbort, { once: true });
    scene.clearColor = new Color4(0.04, 0.08, 0.11, 1);
    scene.skipPointerMovePicking = true;
    scene.autoClearDepthAndStencil = true;
    scene.fogMode = Scene.FOGMODE_EXP2;
    scene.fogDensity = 0.0035;
    scene.fogColor = new Color3(0.04, 0.08, 0.11);
    const hemi = new HemisphericLight('hemi', new Vector3(0.2, 1, 0.1), scene);
    hemi.intensity = 0.7;
    hemi.groundColor = new Color3(0.25, 0.3, 0.28);
    const sun = new DirectionalLight('sun', new Vector3(-0.35, -1, 0.45), scene);
    sun.intensity = 0.75;
    // listeners
    const handlers = { ready: [], score: [], clock: [], goal: [], banner: [], fps: [], finished: [], error: [], stats: [], commentary: [], event: [] };
    const emit = (ev, ...args) => { for (const f of handlers[ev])
        f(...args); };
    const commentary = {
        goal: side => `${side === 0 ? config.home.clubName : config.away.clubName} score!`,
        shot: side => `${side === 0 ? config.home.clubName : config.away.clubName} shoot.`,
        save: side => `${side === 0 ? config.home.clubName : config.away.clubName} keeper makes the save.`,
        foul: side => `Foul by ${side === 0 ? config.home.clubName : config.away.clubName}.`,
        advantage_played: side => `${side === 0 ? config.home.clubName : config.away.clubName} keep the advantage.`,
        offside: side => `Offside against ${side === 0 ? config.home.clubName : config.away.clubName}.`,
        corner: side => `Corner to ${side === 0 ? config.home.clubName : config.away.clubName}.`,
        yellow_card: side => `Yellow card for ${side === 0 ? config.home.clubName : config.away.clubName}.`,
        red_card: side => `A player from ${side === 0 ? config.home.clubName : config.away.clubName} is sent off.`,
        penalty_scored: side => `${side === 0 ? config.home.clubName : config.away.clubName} convert the penalty.`,
        penalty_missed: side => `${side === 0 ? config.home.clubName : config.away.clubName} miss the penalty.`,
        half_time: () => 'The referee signals for half-time.',
        extra_time: () => 'The match goes to extra time.',
        full_time: () => 'The referee signals for full-time.',
    };
    let world;
    try {
        world = new World(config, {
            event: event => {
                emit('event', event);
                const line = commentary[event.type]?.(event.side);
                if (line)
                    emit('commentary', line);
            },
            banner: t => emit('banner', t),
            score: (h, a) => emit('score', { home: h, away: a }),
            goal: side => onGoal(side === 0 ? 'home' : 'away'),
            finished: r => emit('finished', r),
            kick: () => { },
        }, SIM_BUILD);
    }
    catch (error) {
        cleanup();
        throw error;
    }
    const P = world.P;
    let nets = [];
    try {
        ({ nets } = buildStadium(scene, P));
        actors = await Actors.create(scene, P, config.home, config.away, { signal, onProgress });
        if (signal?.aborted)
            throw signal.reason ?? new Error('Match engine creation was cancelled');
    }
    catch (error) {
        cleanup();
        throw error;
    }
    if (world.players.length !== 22 || actors.playerRootCount !== 22) {
        cleanup();
        throw new Error(`Match setup requires 22 players and rigs; received ${world.players.length} players and ${actors.playerRootCount} rigs`);
    }
    const rig = new CameraRig(scene, world.hx, world.hz);
    rig.setMode(config.camera);
    // pose buffers
    let prev = new Pose(), cur = new Pose(), tmpPose = new Pose();
    cur.fromWorld(world);
    prev.copy(cur);
    try {
        actors.draw(prev, cur, 1, 0, new Vector3(), -1);
        await scene.whenReadyAsync();
        if (signal?.aborted || disposed)
            throw signal?.reason ?? new Error('Match engine creation was cancelled');
        actors.setPlayersEnabled(true);
        actors.draw(prev, cur, 1, 0, new Vector3(), -1);
        engine.resize();
        scene.render();
        scene.render();
        if (process.env.NODE_ENV === 'development') {
            scene.onNewMeshAddedObservable.add(mesh => {
                if (readyEmitted && actors.rigs.some(rig => rig.root.getChildMeshes().includes(mesh)))
                    console.warn(`Player mesh ${mesh.name} was added after the match engine became ready.`);
            });
        }
        onProgress?.({ asset: 'complete', loaded: 1, total: 1 });
    }
    catch (error) {
        cleanup();
        throw error;
    }
    // replay recorder (ring buffer of poses at 30 Hz)
    const rec = Array.from({ length: REC_N }, () => new Pose());
    let recCount = 0;
    const record = () => { rec[recCount % REC_N].copy(cur); recCount++; };
    let rstate = 'live', waitT = 0, goalIdx = 0, replayPos = 0, goalNet = null, rippleAge = 99, rippleNet_ = null;
    const kickoffFade = new Layer('kickoff-fade', null, scene, false);
    kickoffFade.color = Color3.Black();
    kickoffFade.alpha = 0;
    const fadeDuration = 0.42;
    let fadeRemaining = 0;
    function onGoal(_side) {
        emit('goal', { side: _side });
        world.extendGoalHold(600);
        rstate = 'wait';
        waitT = 1.7;
        goalIdx = recCount - 1;
        // netHit gets captured in the loop (ball reaches the net a few frames after the whistle)
    }
    // debug overlay (F3)
    dbgLines = MeshBuilder.CreateLineSystem('dbg', { lines: Array.from({ length: 23 }, () => [Vector3.Zero(), Vector3.Zero()]), updatable: true }, scene);
    dbgLines.color = new Color3(1, 0.2, 0.9);
    dbgLines.isVisible = false;
    dbgLines.alwaysSelectAsActiveMesh = true;
    let dbgInst = dbgLines;
    window.addEventListener('keydown', onKey);
    const updateDebug = () => {
        const lines = world.players.map(p => [new Vector3(p.x, 0.1, p.z), new Vector3(p.tx, 0.1, p.tz)]);
        lines.push([new Vector3(world.ball.x, world.ball.y, world.ball.z), new Vector3(world.ball.x + world.ball.vx * 0.4, world.ball.y + world.ball.vy * 0.4, world.ball.z + world.ball.vz * 0.4)]);
        dbgInst = MeshBuilder.CreateLineSystem('dbg', { lines, instance: dbgInst });
    };
    // resize
    window.addEventListener('resize', onResize);
    ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null;
    ro?.observe(canvas);
    let acc = 0, paused = true, started = false, lastClock = '', fpsT = 0, govT = 0, statsT = 0;
    const spin = new Vector3();
    let lastNow = performance.now();
    frame = () => {
        if (disposed)
            return;
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
                    if (rstate !== 'replay') {
                        statsT += dt;
                        if (statsT >= 0.2) {
                            statsT %= 0.2;
                            emit('stats', world.liveState());
                        }
                    }
                }
            }
            else {
                rig.setMode(rig.mode); // keep
                if (rig.mode === 'ball')
                    world.setCamBasis(rig.forward.x, rig.forward.z);
                else if (rig.mode === 'goal_to_goal' || rig.mode === 'top_down')
                    world.setCamBasis(world.dir(world.humanSide), 0);
                else
                    world.setCamBasis(0, 1);
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
        if (!readyEmitted) {
            readyEmitted = true;
            emit('ready');
        }
        if (fadeRemaining > 0) {
            fadeRemaining = Math.max(0, fadeRemaining - dt);
            kickoffFade.alpha = fadeRemaining / fadeDuration;
        }
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
    function replay() {
        if (rstate !== 'live' || world.phase === 'fulltime' || world.phase === 'shootout' || recCount < REC_HZ * 2)
            return false;
        goalIdx = recCount - 1;
        startReplay();
        return true;
    }
    function endReplay() {
        rstate = 'live';
        rippleAge = 99;
        kickoffFade.alpha = 1;
        fadeRemaining = fadeDuration;
        for (const n of nets)
            resetNet(n);
        rippleNet_ = null;
        rig.setMode(userCam);
        world.endGoalSequence();
        cur.fromWorld(world);
        prev.copy(cur);
        acc = 0;
        recCount = 0;
        record();
        replayPos = 0;
        goalIdx = 0;
    }
    let userCam = config.camera;
    const api = {
        start() {
            if (disposed || started)
                return;
            started = true;
            paused = false;
            lastNow = performance.now();
            engine.runRenderLoop(frame);
        },
        pause() { paused = true; world.clearHumanInput(true); },
        resume() { paused = false; lastNow = performance.now(); },
        setInput(i) { world.setInput(i); },
        setCamera(m) { userCam = m; if (rstate !== 'replay')
            rig.setMode(m); },
        switchPlayer() { world.switchPlayer(); },
        replay,
        on(ev, cb) { handlers[ev].push(cb); return () => { const a = handlers[ev]; const i = a.indexOf(cb); if (i >= 0)
            a.splice(i, 1); }; },
        dispose() { cleanup(); },
    };
    void tmpPose;
    engine.resize();
    return api;
};
