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
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import PauseIcon from '@mui/icons-material/Pause';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import VideocamIcon from '@mui/icons-material/Videocam';
import Joystick from './Joystick';
import ActionButtons from './ActionButtons';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { matchKey } from '@/lib/trainingOptions';
import { buildMatchConfig, loadEngine } from '@/lib/engine/loader';
import { submitResult } from '@/lib/submitResult';
const CAMS = [
    { v: 'tv', l: 'TV' }, { v: 'side', l: 'Side' }, { v: 'sideline', l: 'Line' },
    { v: 'ball', l: 'Ball' }, { v: 'goal_to_goal', l: 'G2G' }, { v: 'top_down', l: 'Top' },
];
const IDLE = { move: { x: 0, y: 0 }, sprint: false, action: null, actionHeld: false, modifier: null };
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
    const lastResult = useRef(null);
    const bannerT = useRef(undefined);
    const push = useCallback(() => engineRef.current?.setInput({ ...input.current, move: { ...input.current.move } }), []);
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
                setCam(cfg.camera);
                setControlledSide(cfg.controlledSide);
                const create = await loadEngine();
                if (disposed || !canvasRef.current)
                    return;
                const eng = await create(canvasRef.current, cfg);
                if (disposed) {
                    eng.dispose();
                    return;
                }
                engineRef.current = eng;
                offs.push(eng.on('score', setScore), eng.on('clock', c => setClock(c)), eng.on('fps', setFps), eng.on('goal', () => { setGoal(true); setTimeout(() => setGoal(false), 2600); }), eng.on('banner', t => { setBanner(t); clearTimeout(bannerT.current); bannerT.current = setTimeout(() => setBanner(null), 1800); }), eng.on('error', m => { setError(m); setPhase('error'); }), eng.on('finished', r => { lastResult.current = r; setMatchResult(r); setScore({ home: r.home_score, away: r.away_score }); submit(); }));
                eng.start();
                setPhase('playing');
                try {
                    sessionStorage.removeItem(matchKey(matchId));
                }
                catch (storageError) {
                    console.warn('Could not clear the saved match from session storage.', storageError);
                }
            }
            catch (e) {
                if (!disposed) {
                    setError(e.message ?? 'Failed to start match');
                    setPhase('error');
                }
            }
        })();
        return () => { disposed = true; offs.forEach(f => f()); clearTimeout(bannerT.current); engineRef.current?.dispose(); engineRef.current = null; };
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
                engineRef.current?.switchPlayer();
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
    }, [push]);
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
    const youHome = controlledSide !== 'away';
    const won = matchResult && (youHome ? matchResult.home_score > matchResult.away_score : matchResult.away_score > matchResult.home_score);
    const drew = matchResult && matchResult.home_score === matchResult.away_score;
    return (<Box className="no-touch-actions" sx={{ position: 'fixed', inset: 0, bgcolor: '#000', overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block', outline: 'none' }}/>

      {phase === 'loading' && (<Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', bgcolor: '#07110b' }}>
          <Stack alignItems="center" spacing={2}><CircularProgress /><Typography>Preparing the pitch…</Typography></Stack>
        </Box>)}

      {phase === 'playing' && (<>
          {/* scoreboard */}
          <Box sx={{ position: 'absolute', top: 'max(8px, env(safe-area-inset-top))', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 0.5, borderRadius: 3, bgcolor: 'rgba(0,0,0,0.55)' }}>
            <Typography fontWeight={900} fontSize={22}>{score.home}</Typography>
            <Typography fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums', opacity: 0.9 }}>{clock.label}</Typography>
            <Typography fontWeight={900} fontSize={22}>{score.away}</Typography>
          </Box>
          <Stack direction="row" spacing={0.5} sx={{ position: 'absolute', top: 'max(8px, env(safe-area-inset-top))', right: 8 }}>
            <IconButton onClick={() => setCamOpen(o => !o)} sx={{ color: '#fff', bgcolor: 'rgba(0,0,0,0.4)' }}><VideocamIcon /></IconButton>
            <IconButton onClick={() => engineRef.current?.switchPlayer()} sx={{ color: '#fff', bgcolor: 'rgba(0,0,0,0.4)' }}><SwapHorizIcon /></IconButton>
            <IconButton onClick={togglePause} sx={{ color: '#fff', bgcolor: 'rgba(0,0,0,0.4)' }}><PauseIcon /></IconButton>
          </Stack>
          {process.env.NODE_ENV !== 'production' && (<Typography variant="caption" sx={{ position: 'absolute', top: 8, left: 8, opacity: 0.6 }}>{fps} fps</Typography>)}
          {camOpen && (<ToggleButtonGroup exclusive size="small" value={cam} onChange={(_, v) => { if (v) {
                setCam(v);
                engineRef.current?.setCamera(v);
                setCamOpen(false);
            } }} sx={{ position: 'absolute', top: 'calc(max(8px, env(safe-area-inset-top)) + 48px)', right: 8, bgcolor: 'rgba(0,0,0,0.6)' }}>
              {CAMS.map(c => <ToggleButton key={c.v} value={c.v} sx={{ color: '#fff', px: 1.2 }}>{c.l}</ToggleButton>)}
            </ToggleButtonGroup>)}

          {banner && (<Typography variant="h5" fontWeight={900} sx={{ position: 'absolute', top: '22%', width: '100%', textAlign: 'center', textShadow: '0 2px 12px #000', pointerEvents: 'none' }}>{banner}</Typography>)}
          {goal && (<Typography fontWeight={900} sx={{ position: 'absolute', top: '32%', width: '100%', textAlign: 'center', fontSize: { xs: 64, sm: 96 }, color: '#f4cb34', textShadow: '0 4px 24px #000', pointerEvents: 'none', letterSpacing: 4 }}>GOAL!</Typography>)}

          {/* controls */}
          <Box sx={{ position: 'absolute', left: 'max(24px, env(safe-area-inset-left))', bottom: 'max(24px, env(safe-area-inset-bottom))' }}>
            <Joystick onChange={v => { input.current.move = v; push(); }}/>
          </Box>
          <Box sx={{ position: 'absolute', right: 'max(20px, env(safe-area-inset-right))', bottom: 'max(24px, env(safe-area-inset-bottom))' }}>
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
    </Box>);
}
