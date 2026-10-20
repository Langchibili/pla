'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import LinearProgress from '@mui/material/LinearProgress';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import PauseIcon from '@mui/icons-material/Pause';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import VideocamIcon from '@mui/icons-material/Videocam';
import ReplayIcon from '@mui/icons-material/Replay';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import Joystick from './Joystick';
import ActionButtons from './ActionButtons';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { matchKey } from '@/lib/trainingOptions';
import { buildMatchConfig, loadEngine } from '@/lib/engine/loader';
import { submitResult } from '@/lib/submitResult';
const CAMS = [
    { v: 'tv', l: 'Broadcast' }, { v: 'side', l: 'Side' }, { v: 'sideline', l: 'Line' },
    { v: 'ball', l: 'Ball' }, { v: 'goal_to_goal', l: 'End-to-end' }, { v: 'top_down', l: 'Tactical' },
];
const IDLE = { move: { x: 0, y: 0 }, sprint: false, action: null, actionHeld: false, modifier: null, switch: false };
const DEFAULT_LIVE = { players: [], metrics: null, selected: null, pitch: { halfLength: 52.5, halfWidth: 34 }, ball: { x: 0, z: 0 }, weather: { wetness: 0 } };
function MatchRadar({ state }) {
    const { halfLength, halfWidth } = state.pitch;
    const px = x => 140 * (x + halfLength) / (2 * halfLength);
    const py = z => 84 * (z + halfWidth) / (2 * halfWidth);
    return (<Box role="img" aria-label="Live match radar" sx={{ position: 'absolute', left: '50%', bottom: 'max(10px, env(safe-area-inset-bottom))', transform: 'translateX(-50%)', width: { xs: 112, sm: 140 }, height: { xs: 68, sm: 84 }, border: '1px solid rgba(255,255,255,.5)', borderRadius: 1.5, bgcolor: 'rgba(4,35,19,.72)', pointerEvents: 'none', overflow: 'hidden' }}>
      <svg viewBox="0 0 140 84" width="100%" height="100%">
        <rect x="1" y="1" width="138" height="82" fill="none" stroke="rgba(255,255,255,.55)" />
        <line x1="70" y1="1" x2="70" y2="83" stroke="rgba(255,255,255,.4)" />
        <circle cx="70" cy="42" r="10" fill="none" stroke="rgba(255,255,255,.4)" />
        {state.players.filter(p => !p.sentOff).map(p => <circle key={p.id} cx={px(p.x)} cy={py(p.z)} r="2" fill={p.side === 0 ? '#f4cb34' : '#fff'} />)}
        <circle cx={px(state.ball.x)} cy={py(state.ball.z)} r="2.6" fill="#ff594d" stroke="#fff" strokeWidth=".7" />
      </svg>
    </Box>);
}
export default function MatchHost({ matchId }) {
    const router = useRouter();
    const { refresh } = useAuth();
    const canvasRef = useRef(null);
    const engineRef = useRef(null);
    const cfgRef = useRef(null);
    const input = useRef({ ...IDLE });
    const [phase, setPhase] = useState('loading');
    const [error, setError] = useState(null);
    const [score, setScore] = useState({ home: 0, away: 0 });
    const [teamNames, setTeamNames] = useState({ home: 'Home', away: 'Away' });
    const [clock, setClock] = useState({ seconds: 0, label: '00:00', period: 1 });
    const [banner, setBanner] = useState(null);
    const [goal, setGoal] = useState(false);
    const [fps, setFps] = useState(0);
    const [paused, setPaused] = useState(false);
    const [cam, setCam] = useState('tv');
    const [controlledSide, setControlledSide] = useState('home');
    const [matchResult, setMatchResult] = useState(null);
    const [camOpen, setCamOpen] = useState(false);
    const [rewards, setRewards] = useState(null);
    const [submitErr, setSubmitErr] = useState(null);
    const [portrait, setPortrait] = useState(null);
    const [orientationError, setOrientationError] = useState(null);
    const [loadPercent, setLoadPercent] = useState(0);
    const [liveState, setLiveState] = useState(DEFAULT_LIVE);
    const [statsOpen, setStatsOpen] = useState(false);
    const [commentary, setCommentary] = useState(null);
    const [spokenCommentary, setSpokenCommentary] = useState(false);
    const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
    const lastResult = useRef(null);
    const bannerT = useRef(undefined);
    const commentaryT = useRef(undefined);
    const spokenCommentaryRef = useRef(false);
    const push = useCallback(() => engineRef.current?.setInput({ ...input.current, move: { ...input.current.move } }), []);
    const pulseSwitch = useCallback(() => {
        input.current.switch = true;
        push();
        input.current.switch = false;
        push();
    }, [push]);
    useEffect(() => {
        const isPortraitTouch = () => {
            const touchDevice = navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches;
            return touchDevice && window.innerHeight > window.innerWidth;
        };
        const update = () => setPortrait(isPortraitTouch());
        const frame = window.requestAnimationFrame(update);
        window.addEventListener('resize', update);
        window.visualViewport?.addEventListener('resize', update);
        window.screen.orientation?.addEventListener('change', update);
        return () => {
            window.cancelAnimationFrame(frame);
            window.removeEventListener('resize', update);
            window.visualViewport?.removeEventListener('resize', update);
            window.screen.orientation?.removeEventListener('change', update);
        };
    }, []);
    useEffect(() => {
        const engine = engineRef.current;
        if (!engine || phase !== 'playing' || portrait === null)
            return;
        if (portrait)
            engine.pause();
        else if (!paused)
            engine.resume();
    }, [portrait, phase, paused]);
    const submit = useCallback(async () => {
        if (!cfgRef.current || !lastResult.current)
            return;
        setPhase('finishing');
        setSubmitErr(null);
        try {
            const out = await submitResult(cfgRef.current, lastResult.current);
            setRewards(out.rewards ?? []);
            setPhase('done');
            await refresh();
        }
        catch (e) {
            setSubmitErr(e.message);
            setPhase('done');
        }
    }, [refresh]);
    // boot engine
    useEffect(() => {
        let disposed = false;
        const offs = [];
        const controller = new AbortController();
        const assetProgress = new Map();
        const expectedSizes = { 'player.glb': 842000, 'anims.bin': 705000, 'anims.json': 9000 };
        const reportProgress = ({ asset, loaded, total }) => {
            if (disposed)
                return;
            if (asset === 'complete') {
                setLoadPercent(100);
                return;
            }
            const expected = expectedSizes[asset];
            assetProgress.set(asset, {
                loaded: Math.max(0, Number(loaded) || 0),
                total: Number(total) > 0 ? Number(total) : expected ?? 1,
            });
            const totalBytes = Object.values(expectedSizes).reduce((sum, size) => sum + size, 0);
            const loadedBytes = Object.entries(expectedSizes).reduce((sum, [name]) => {
                const item = assetProgress.get(name);
                return sum + Math.min(item?.loaded ?? 0, item?.total ?? expectedSizes[name]);
            }, 0);
            setLoadPercent(Math.min(99, Math.round(loadedBytes / totalBytes * 100)));
        };
        (async () => {
            try {
                let issued = null;
                try {
                    const raw = sessionStorage.getItem(matchKey(matchId));
                    if (raw)
                        issued = JSON.parse(raw);
                }
                catch (storageError) {
                    console.warn('Could not read the saved match; requesting it from the backend instead.', storageError);
                }
                if (!issued)
                    issued = (await api.startMatch(matchId)).match;
                const cfg = buildMatchConfig(issued);
                cfgRef.current = cfg;
                setTeamNames({ home: cfg.home.clubName || 'Home', away: cfg.away.clubName || 'Away' });
                setCam(cfg.camera);
                setControlledSide(cfg.controlledSide);
                const create = await loadEngine();
                if (disposed || !canvasRef.current)
                    return;
                const eng = await create(canvasRef.current, cfg, { signal: controller.signal, onProgress: reportProgress });
                if (disposed) {
                    eng.dispose();
                    return;
                }
                engineRef.current = eng;
                offs.push(eng.on('ready', () => { if (!disposed) setPhase('playing'); }), eng.on('score', setScore), eng.on('clock', c => setClock(c)), eng.on('stats', setLiveState), eng.on('commentary', text => { setCommentary(text); clearTimeout(commentaryT.current); commentaryT.current = setTimeout(() => setCommentary(null), 3200); if (spokenCommentaryRef.current && 'speechSynthesis' in window) { window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(text)); } }), eng.on('fps', setFps), eng.on('goal', () => { setGoal(true); setTimeout(() => setGoal(false), 2600); }), eng.on('banner', t => { setBanner(t); clearTimeout(bannerT.current); bannerT.current = setTimeout(() => setBanner(null), 1800); }), eng.on('error', m => { setError(m); setPhase('error'); }), eng.on('finished', r => { lastResult.current = r; setMatchResult(r); setScore({ home: r.home_score, away: r.away_score }); submit(); }));
                eng.start();
                try {
                    sessionStorage.removeItem(matchKey(matchId));
                }
                catch (storageError) {
                    console.warn('Could not clear the saved match from session storage.', storageError);
                }
            }
            catch (e) {
                if (!disposed && !controller.signal.aborted) {
                    setError(e.message ?? 'Failed to start match');
                    setPhase('error');
                }
            }
        })();
        return () => { disposed = true; controller.abort(); offs.forEach(f => f()); clearTimeout(bannerT.current); clearTimeout(commentaryT.current); if ('speechSynthesis' in window) window.speechSynthesis.cancel(); engineRef.current?.dispose(); engineRef.current = null; };
    }, [matchId, submit]);
    // keyboard fallback (desktop testing)
    useEffect(() => {
        const keys = new Set();
        const recompute = () => {
            const x = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
            const y = (keys.has('w') || keys.has('arrowup') ? 1 : 0) - (keys.has('s') || keys.has('arrowdown') ? 1 : 0);
            const n = Math.hypot(x, y) || 1;
            input.current.move = { x: x / n, y: y / n };
            input.current.sprint = keys.has('shift');
            push();
        };
        const act = { j: 'pass', k: 'shoot', l: 'through', u: 'lob', i: 'tackle', o: 'slide' };
        const down = (e) => {
            const k = e.key.toLowerCase();
            if (act[k]) {
                if (!e.repeat) {
                    input.current.action = act[k];
                    input.current.actionHeld = true;
                    push();
                }
                return;
            }
            if (k === 'tab') {
                e.preventDefault();
                pulseSwitch();
                return;
            }
            if (k === 'r') {
                e.preventDefault();
                engineRef.current?.replay();
                return;
            }
            keys.add(k);
            recompute();
        };
        const up = (e) => {
            const k = e.key.toLowerCase();
            if (act[k]) {
                input.current.actionHeld = false;
                push();
                input.current.action = null;
                return;
            }
            keys.delete(k);
            recompute();
        };
        window.addEventListener('keydown', down);
        window.addEventListener('keyup', up);
        return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
    }, [pulseSwitch, push]);
    const togglePause = () => {
        const e = engineRef.current;
        if (!e)
            return;
        if (paused) {
            e.resume();
            setPaused(false);
        }
        else {
            e.pause();
            setPaused(true);
        }
    };
    const onAction = (a, held) => {
        input.current.action = a;
        input.current.actionHeld = held;
        push();
        if (!held)
            input.current.action = null;
    };
    const requestLandscape = async () => {
        setOrientationError(null);
        try {
            if (!document.fullscreenElement && document.documentElement.requestFullscreen)
                await document.documentElement.requestFullscreen();
            const orientation = screen.orientation;
            if (orientation?.lock)
                await orientation.lock('landscape');
            else
                setOrientationError('This browser cannot rotate automatically. Turn your device sideways to continue.');
        }
        catch (e) {
            setOrientationError(`${e.message || 'Automatic rotation is unavailable.'} Turn your device sideways to continue.`);
        }
    };
    const youHome = controlledSide !== 'away';
    const shootoutWinner = matchResult?.shootout_score?.winner;
    const won = matchResult && (shootoutWinner !== undefined ? shootoutWinner === (youHome ? 0 : 1) : youHome ? matchResult.home_score > matchResult.away_score : matchResult.away_score > matchResult.home_score);
    const drew = matchResult && shootoutWinner === undefined && matchResult.home_score === matchResult.away_score;
    return (<Box className="no-touch-actions" sx={{ position: 'fixed', inset: 0, bgcolor: '#000', overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', outline: 'none' }}/>

      {phase === 'loading' && (<Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', bgcolor: '#07110b' }}>
          <Stack alignItems="center" spacing={2}><CircularProgress variant="determinate" value={loadPercent} /><Typography>Preparing the pitch… {loadPercent}%</Typography></Stack>
        </Box>)}

      {phase === 'playing' && (<>
          {/* scoreboard */}
          <Box sx={{ position: 'absolute', top: 'max(10px, env(safe-area-inset-top))', left: 'max(10px, env(safe-area-inset-left))', display: 'flex', alignItems: 'center', gap: { xs: 0.25, sm: 1.5 }, px: { xs: 0.5, sm: 1.75 }, py: 0.8, borderRadius: 3, bgcolor: 'rgba(4,17,11,0.88)', border: '1px solid rgba(244,203,52,0.32)', boxShadow: '0 8px 28px rgba(0,0,0,0.38)', backdropFilter: 'blur(12px)', minWidth: { xs: 160, sm: 220 }, justifyContent: 'center' }}>
            <Box sx={{ minWidth: { xs: 34, sm: 52 }, textAlign: 'right' }}>
              <Typography noWrap fontWeight={800} fontSize={10} sx={{ maxWidth: 96 }}>{teamNames.home}</Typography>
              <Typography fontWeight={900} fontSize={21} lineHeight={1}>{score.home}</Typography>
            </Box>
            <Box sx={{ textAlign: 'center', px: 0.8 }}>
              <Typography fontWeight={800} fontSize={13} sx={{ fontVariantNumeric: 'tabular-nums' }}>{liveState.shootout ? `PEN ${liveState.shootout.attempts[0] + liveState.shootout.attempts[1] + 1}` : clock.label}</Typography>
              {liveState.weather.wetness > 0.05 && <Typography variant="caption" color="#8ee4ff">WET PITCH</Typography>}
            </Box>
            <Box sx={{ minWidth: { xs: 34, sm: 52 } }}>
              <Typography noWrap fontWeight={800} fontSize={10} sx={{ maxWidth: 96 }}>{teamNames.away}</Typography>
              <Typography fontWeight={900} fontSize={21} lineHeight={1}>{score.away}</Typography>
            </Box>
          </Box>
          <Stack direction="row" spacing={{ xs: 0.1, sm: 0.6 }} sx={{ position: 'absolute', top: 'max(10px, env(safe-area-inset-top))', right: 'max(10px, env(safe-area-inset-right))' }}>
            <IconButton aria-label="Camera options" onClick={() => { setCamOpen(o => !o); setStatsOpen(false); }} sx={{ width: { xs: 28, sm: 44 }, height: { xs: 28, sm: 44 }, p: 0.4, color: '#fff', bgcolor: 'rgba(4,17,11,0.76)', border: '1px solid rgba(255,255,255,0.16)', '&:hover': { bgcolor: 'rgba(15,107,58,0.9)' } }}><VideocamIcon /></IconButton>
            <IconButton aria-label="Match statistics" onClick={() => { setStatsOpen(o => !o); setCamOpen(false); }} sx={{ width: { xs: 28, sm: 44 }, height: { xs: 28, sm: 44 }, p: 0.4, color: '#fff', bgcolor: 'rgba(4,17,11,0.76)', border: '1px solid rgba(255,255,255,0.16)', '&:hover': { bgcolor: 'rgba(15,107,58,0.9)' } }}><AssessmentOutlinedIcon /></IconButton>
            <IconButton aria-label="Replay recent play" onClick={() => engineRef.current?.replay()} sx={{ width: { xs: 28, sm: 44 }, height: { xs: 28, sm: 44 }, p: 0.4, color: '#f4cb34', bgcolor: 'rgba(4,17,11,0.76)', border: '1px solid rgba(255,255,255,0.16)', '&:hover': { bgcolor: 'rgba(15,107,58,0.9)' } }}><ReplayIcon /></IconButton>
            <IconButton disabled={!speechSupported} aria-label={spokenCommentary ? 'Disable spoken commentary' : 'Enable spoken commentary'} onClick={() => { const next = !spokenCommentaryRef.current; spokenCommentaryRef.current = next; setSpokenCommentary(next); if (!next && speechSupported) window.speechSynthesis.cancel(); }} sx={{ width: { xs: 28, sm: 44 }, height: { xs: 28, sm: 44 }, p: 0.4, color: spokenCommentary ? '#f4cb34' : '#fff', bgcolor: 'rgba(4,17,11,0.76)', border: '1px solid rgba(255,255,255,0.16)' }}>{spokenCommentary ? <VolumeUpIcon /> : <VolumeOffIcon />}</IconButton>
            <IconButton aria-label="Switch player" onClick={pulseSwitch} sx={{ width: { xs: 28, sm: 44 }, height: { xs: 28, sm: 44 }, p: 0.4, color: '#f4cb34', bgcolor: 'rgba(4,17,11,0.76)', border: '1px solid rgba(255,255,255,0.16)', '&:hover': { bgcolor: 'rgba(15,107,58,0.9)' } }}><SwapHorizIcon /></IconButton>
            <IconButton aria-label="Pause match" onClick={togglePause} sx={{ width: { xs: 28, sm: 44 }, height: { xs: 28, sm: 44 }, p: 0.4, color: '#fff', bgcolor: 'rgba(4,17,11,0.76)', border: '1px solid rgba(255,255,255,0.16)', '&:hover': { bgcolor: 'rgba(15,107,58,0.9)' } }}><PauseIcon /></IconButton>
          </Stack>
          {process.env.NODE_ENV !== 'production' && (<Typography variant="caption" sx={{ position: 'absolute', top: 8, left: 8, opacity: 0.6 }}>{fps} fps</Typography>)}
          {camOpen && (<ToggleButtonGroup exclusive size="small" value={cam} onChange={(_, v) => { if (v) {
                setCam(v);
                engineRef.current?.setCamera(v);
                setCamOpen(false);
            } }} sx={{ position: 'absolute', top: 'calc(max(8px, env(safe-area-inset-top)) + 48px)', right: 8, bgcolor: 'rgba(0,0,0,0.6)' }}>
              {CAMS.map(c => <ToggleButton key={c.v} value={c.v} sx={{ color: '#fff', px: 1.2 }}>{c.l}</ToggleButton>)}
            </ToggleButtonGroup>)}
          {statsOpen && liveState.metrics && (<Card sx={{ position: 'absolute', top: 'calc(max(10px, env(safe-area-inset-top)) + 48px)', right: 'max(10px, env(safe-area-inset-right))', width: 270, maxWidth: 'calc(100vw - 20px)', bgcolor: 'rgba(4,17,11,.92)', color: '#fff', border: '1px solid rgba(244,203,52,.35)', backdropFilter: 'blur(12px)' }}>
              <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
                <Typography variant="overline" color="#f4cb34" fontWeight={900}>Live match stats</Typography>
                <Typography variant="body2">Possession {liveState.metrics.home.possession_percent}% – {liveState.metrics.away.possession_percent}%</Typography>
                <Typography variant="body2">xG {liveState.metrics.home.expected_goals.toFixed(2)} – {liveState.metrics.away.expected_goals.toFixed(2)}</Typography>
                <Typography variant="body2">Shots {liveState.metrics.home.shots} – {liveState.metrics.away.shots} · On target {liveState.metrics.home.shots_on_target} – {liveState.metrics.away.shots_on_target}</Typography>
                <Typography variant="body2">Fouls {liveState.metrics.home.fouls} – {liveState.metrics.away.fouls} · Saves {liveState.metrics.home.saves} – {liveState.metrics.away.saves}</Typography>
                <Typography variant="body2">Cards 🟨 {liveState.metrics.home.yellow_cards} – {liveState.metrics.away.yellow_cards} · 🟥 {liveState.metrics.home.red_cards} – {liveState.metrics.away.red_cards}</Typography>
              </CardContent>
            </Card>)}

          {banner && (<Typography variant="h5" fontWeight={900} sx={{ position: 'absolute', top: '22%', width: '100%', textAlign: 'center', textShadow: '0 2px 12px #000', pointerEvents: 'none' }}>{banner}</Typography>)}
          {commentary && (<Typography aria-live="polite" variant="body2" sx={{ position: 'absolute', top: 'calc(max(10px, env(safe-area-inset-top)) + 62px)', left: '50%', transform: 'translateX(-50%)', px: 1.5, py: 0.6, borderRadius: 2, bgcolor: 'rgba(4,17,11,.78)', border: '1px solid rgba(255,255,255,.16)', textAlign: 'center', pointerEvents: 'none', maxWidth: 'min(80vw, 460px)' }}>{commentary}</Typography>)}
          {goal && (<Typography fontWeight={900} sx={{ position: 'absolute', top: '32%', width: '100%', textAlign: 'center', fontSize: { xs: 64, sm: 96 }, color: '#f4cb34', textShadow: '0 4px 24px #000', pointerEvents: 'none', letterSpacing: 4 }}>GOAL!</Typography>)}
          {liveState.selected && (<Box sx={{ position: 'absolute', left: '50%', bottom: 'calc(max(10px, env(safe-area-inset-bottom)) + 92px)', transform: 'translateX(-50%)', width: 150, px: 1, py: .55, borderRadius: 2, bgcolor: 'rgba(4,17,11,.78)', color: '#fff' }}>
              <Typography variant="caption" fontWeight={800}>P-{liveState.selected.number} · {liveState.selected.role} · {Math.round(liveState.selected.stamina * 100)}%</Typography>
              <LinearProgress variant="determinate" value={liveState.selected.stamina * 100} sx={{ height: 5, borderRadius: 3, bgcolor: 'rgba(255,255,255,.18)', '& .MuiLinearProgress-bar': { bgcolor: liveState.selected.stamina < .25 ? '#ff5d4f' : '#f4cb34' } }} />
            </Box>)}
          {liveState.players.length > 0 && <MatchRadar state={liveState} />}

          {/* controls */}
          <Box sx={{ position: 'absolute', left: 'max(24px, env(safe-area-inset-left))', bottom: 'max(20px, env(safe-area-inset-bottom))', filter: 'drop-shadow(0 5px 18px rgba(0,0,0,0.4))' }}>
            <Joystick onChange={v => { input.current.move = v; push(); }}/>
          </Box>
          <Box sx={{ position: 'absolute', right: 'max(20px, env(safe-area-inset-right))', bottom: 'max(20px, env(safe-area-inset-bottom))', filter: 'drop-shadow(0 5px 18px rgba(0,0,0,0.4))' }}>
            <ActionButtons onAction={onAction} onSprint={on => { input.current.sprint = on; push(); }}/>
          </Box>

          {paused && (<Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.65)', display: 'grid', placeItems: 'center' }}>
              <Stack spacing={2} width={240}>
                <Typography variant="h5" fontWeight={900} textAlign="center">Paused</Typography>
                <Button variant="contained" onClick={togglePause}>Resume</Button>
                <Button color="inherit" onClick={() => router.replace('/')}>Quit (forfeits result)</Button>
              </Stack>
            </Box>)}
        </>)}

      {(phase === 'finishing' || phase === 'done') && (<Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(7,17,11,0.94)', display: 'grid', placeItems: 'center', p: 3 }}>
          <Stack spacing={2} alignItems="center" maxWidth={340} width="100%">
            <Typography variant="overline" color="text.secondary">Full time</Typography>
            <Typography variant="h2" fontWeight={900}>{score.home} – {score.away}</Typography>
            {matchResult?.shootout_score && <Typography variant="h6">Penalties: {matchResult.shootout_score.home} – {matchResult.shootout_score.away}</Typography>}
            {phase === 'finishing' && <><CircularProgress /><Typography color="text.secondary">Verifying result…</Typography></>}
            {phase === 'done' && !submitErr && (<>
                <Typography variant="h5" fontWeight={800}>{drew ? 'Draw' : won ? 'Victory' : 'Defeat'}</Typography>
                {rewards?.[0] && <Typography>+{rewards[0].xp} XP · +{rewards[0].bronzeCoins} 🪙</Typography>}
              </>)}
            {submitErr && <Alert severity="error" sx={{ width: '100%' }}>{submitErr}</Alert>}
            {submitErr && <Button variant="outlined" onClick={submit}>Retry submit</Button>}
            {phase === 'done' && <Button variant="contained" fullWidth onClick={() => router.replace('/')}>Continue</Button>}
          </Stack>
        </Box>)}

      {phase === 'error' && (<Box sx={{ position: 'absolute', inset: 0, bgcolor: '#07110b', display: 'grid', placeItems: 'center', p: 3 }}>
          <Stack spacing={2} maxWidth={340}>
            <Alert severity="error">{error}</Alert>
            <Button variant="contained" onClick={() => router.replace('/play')}>Back</Button>
          </Stack>
        </Box>)}
      {portrait && phase === 'playing' && (<Box sx={{ position: 'fixed', inset: 0, zIndex: 20, display: 'grid', placeItems: 'center', p: 3, bgcolor: 'rgba(4,17,11,0.97)', backgroundImage: 'radial-gradient(ellipse at 50% 20%, rgba(15,107,58,0.38), transparent 58%)' }}>
          <Card sx={{ width: 'min(100%, 420px)', border: '1px solid rgba(244,203,52,0.38)', bgcolor: 'rgba(10,28,19,0.94)', textAlign: 'center', borderRadius: 4 }}>
            <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
              <Typography variant="overline" color="#f4cb34" fontWeight={900} letterSpacing={2}>PLACO · MATCH DAY</Typography>
              <Typography variant="h5" fontWeight={900} sx={{ mt: 1 }}>Turn your phone sideways</Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>PLACO matches are designed for landscape play. The match is paused until you rotate your device.</Typography>
              <Button fullWidth variant="contained" onClick={requestLandscape} sx={{ mt: 3, py: 1.4, fontWeight: 900 }}>Try landscape mode</Button>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5 }}>{orientationError || 'If your browser does not rotate automatically, rotate the phone manually.'}</Typography>
            </CardContent>
          </Card>
        </Box>)}
    </Box>);
}
