I read through everything you’ve built so far. Most of the frontend and the Babylon game core already exist, so I’m only giving you the gaps that are still missing or broken. The most important are the missing /login page (every auth redirect points to it) and wrong AI team codes in trainingOptions.ts.

Before the files, one install command, because @babylonjs/core is not in your package.json:

bash
npm i @babylonjs/core
1. app/login/page.tsx (new)

RequireAuth redirects here, and it didn’t exist yet.

tsx
'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const { ready, token, login, register } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [identifier, setIdentifier] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (ready && token) router.replace('/'); }, [ready, token, router]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      if (mode === 'login') await login(identifier.trim(), password);
      else await register(username.trim(), email.trim(), password);
      router.replace('/');
    } catch (err: any) { setError(err.message); } finally { setBusy(false); }
  }

  return (
    <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', p: 3 }}>
      <Box component="form" onSubmit={submit} sx={{ width: '100%', maxWidth: 380 }}>
        <Typography variant="overline" color="secondary" letterSpacing={3}>PRO LEAGUE AFRICA</Typography>
        <Typography variant="h4" fontWeight={900} gutterBottom>Club Owners</Typography>
        <Tabs value={mode} onChange={(_, v) => { setMode(v); setError(null); }} variant="fullWidth" sx={{ mb: 2 }}>
          <Tab value="login" label="Sign in" />
          <Tab value="register" label="Create account" />
        </Tabs>
        <Stack spacing={2}>
          {mode === 'login' ? (
            <TextField label="Email or username" value={identifier} onChange={e => setIdentifier(e.target.value)} required autoComplete="username" />
          ) : (
            <>
              <TextField label="Username" value={username} onChange={e => setUsername(e.target.value)} required autoComplete="username" />
              <TextField label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
            </>
          )}
          <TextField label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            slotProps={{ htmlInput: { minLength: mode === 'register' ? 6 : undefined } }} />
          {error && <Alert severity="error">{error}</Alert>}
          <Button type="submit" variant="contained" size="large" disabled={busy}>
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
2. lib/trainingOptions.ts (replace)

Your old codes didn’t match the backend seeder. startTrainingSession would have thrown “AI training team not found”. These now match bootstrapSeeder.ts.

ts
/** Codes match the Strapi bootstrap seeder (ai-team.team_code, ai-difficulty-profile.difficulty_code). */
export const AI_TEAMS = [
  { code: 'training-opponent-alpha', name: 'Training XI' },
];
export const DIFFICULTIES = [
  { code: 'easy', name: 'Easy' },
  { code: 'medium', name: 'Medium' },
  { code: 'hard', name: 'Hard' },
  { code: 'world-class', name: 'World' },
];

export const matchKey = (id: string) => `placo.match.${id}`;
3. lib/api.ts (add to the api object)

Add these two lines inside the api = { ... } object, next to formations. They use the generic read-only find routes your permission matrix already grants.

ts
  stadiums: async () => (await request<{ data: any[] }>('/stadium-presets?pagination[pageSize]=50')).data.filter(s => s.stadium_game_status === 'active'),
  kits: async () => (await request<{ data: any[] }>('/kit-presets?pagination[pageSize]=50')).data.filter(k => k.kit_game_status === 'active'),
4. app/(app)/club/customise/page.tsx (new)

This lets players pick a stadium and kit. The backend enforces unlocks and returns a 403 if the stadium isn’t bought yet.

tsx
'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import LockIcon from '@mui/icons-material/Lock';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Squad } from '@/lib/types';

export default function CustomisePage() {
  const { clubId } = useAuth();
  const [squad, setSquad] = useState<Squad | null>(null);
  const [stadiums, setStadiums] = useState<any[]>([]);
  const [kits, setKits] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    if (!clubId) return;
    try {
      const [s, st, k] = await Promise.all([api.squad(clubId), api.stadiums(), api.kits()]);
      setSquad(s); setStadiums(st); setKits(k);
    } catch (e: any) { setMsg({ ok: false, text: e.message }); }
  }, [clubId]);
  useEffect(() => { load(); }, [load]);

  if (!clubId) return <Alert severity="info">Club not found.</Alert>;
  if (!squad) return <LinearProgress />;

  const run = async (fn: () => Promise<any>, ok: string) => {
    setBusy(true); setMsg(null);
    try { await fn(); setMsg({ ok: true, text: ok }); await load(); }
    catch (e: any) { setMsg({ ok: false, text: e.message }); } finally { setBusy(false); }
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h5" fontWeight={900}>Customise</Typography>
        <Button component={Link} href="/club" size="small">Back</Button>
      </Stack>
      {busy && <LinearProgress />}
      {msg && <Alert severity={msg.ok ? 'success' : 'error'} onClose={() => setMsg(null)}>{msg.text}</Alert>}

      <Typography variant="subtitle2" color="text.secondary">Stadium</Typography>
      {stadiums.map(s => {
        const active = squad.stadium === s.stadium_code;
        const locked = s.unlock_currency !== 'none' && Number(s.unlock_price_coins) > 0;
        return (
          <Card key={s.documentId} sx={active ? { borderColor: 'primary.main' } : undefined}>
            <CardActionArea disabled={busy} onClick={() => run(() => api.chooseStadium(clubId, s.stadium_code), `${s.stadium_name} selected`)}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: '12px !important' }}>
                <div style={{ flex: 1 }}>
                  <Typography fontWeight={700}>{s.stadium_name}</Typography>
                  <Typography variant="caption" color="text.secondary">{String(s.pitch_surface).replace('_', ' ')}</Typography>
                </div>
                {locked && <Chip size="small" icon={<LockIcon />} label={`${s.unlock_price_coins} ${s.unlock_currency === 'diamond' ? '💎' : '🪙'}`} />}
                {active && <Chip size="small" color="primary" label="Active" />}
              </CardContent>
            </CardActionArea>
          </Card>
        );
      })}

      <Typography variant="subtitle2" color="text.secondary" mt={1}>Kit</Typography>
      {kits.map(k => {
        const active = squad.kit === k.kit_code;
        return (
          <Card key={k.documentId} sx={active ? { borderColor: 'primary.main' } : undefined}>
            <CardActionArea disabled={busy} onClick={() => run(() => api.chooseKit(clubId, k.kit_code), `${k.kit_name} selected`)}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: '12px !important' }}>
                <Box sx={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid', borderColor: k.trim_color, background: `linear-gradient(135deg, ${k.primary_color} 50%, ${k.secondary_color} 50%)` }} />
                <Typography fontWeight={700} flex={1}>{k.kit_name}</Typography>
                {active && <Chip size="small" color="primary" label="Active" />}
              </CardContent>
            </CardActionArea>
          </Card>
        );
      })}
    </Stack>
  );
}

Then add a link to it in app/(app)/club/page.tsx. Import Link from 'next/link' at the top, and put this right under the club name <Typography variant="h5">:

tsx
<Button component={Link} href="/club/customise" size="small" variant="outlined" sx={{ alignSelf: 'flex-start' }}>Stadium & kit</Button>
5. app/error.tsx (new)

This catches runtime errors instead of showing a white screen in the webview.

tsx
'use client';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', p: 3 }}>
      <Stack spacing={2} alignItems="center" textAlign="center">
        <Typography variant="h5" fontWeight={900}>Something went wrong</Typography>
        <Typography color="text.secondary" variant="body2">{error.message}</Typography>
        <Button variant="contained" onClick={reset}>Try again</Button>
      </Stack>
    </Box>
  );
}
6. app/manifest.ts (new)

Needed for PWA install and a clean webview.

ts
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Pro League Africa',
    short_name: 'PLA Club Owners',
    start_url: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#07110b',
    theme_color: '#07110b',
    // add icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }, ...] once you have them in /public
  };
}
7. .env.local (frontend root)
bash
NEXT_PUBLIC_API_URL=http://localhost:1337/api
STRAPI_INTERNAL_URL=http://localhost:1337/api
MATCH_ENGINE_HMAC_SECRET=<same value as in Strapi>
NEXT_PUBLIC_SIM_BUILD=babylon-0.1.0
8. Backend items the frontend depends on
GET /me/club: add it exactly as written in your backend-additions.md, and add api::club.club.mine to the Authenticated allowlist. Without it, clubId is null and the Club tab shows “Club not found”.
Allowlist: make sure api::stadium-preset.stadium-preset.find and api::kit-preset.kit-preset.find are in the Authenticated role. Your matrix says they are, but verify after running the sync.
Cheating risk: the finalise route trusts the client’s score. This is fine for training, but keep cash_tournaments_enabled off until the sim is verified server-side.
What is intentionally not built yet
Online PvP UI: the backend queue exists, but there is no realtime relay or ticket-status endpoint, so the Play screen correctly shows it as “coming soon”.
“My managers” screen: the backend has no owner-filtered list route. Add one before building a manager selection UI.
Game and config files: you asked to hold these. The sim, renderer, and cameras you already have are the full Babylon core.

If you want, my next step would be a GET /me/managers backend route plus the matching UI, or tuning passes on the physics and AI (ball feel, tackle balance, goalkeeper saves).

yes please provide

Building the managers endpoint and matching interface.

Here is the managers feature: one backend route and one screen. Without the route, a manager bought in the Market could never be equipped, because the generic list is deliberately not granted.

Backend
1. api/club-manager/controllers/club-manager.ts (add inside the controller object, next to rename)
ts
  async mine(ctx:any) {
    const userId=requireUserId(ctx); if(!userId) return ctx.unauthorized();
    const profile=await getProfileForUser(strapi,userId); if(!profile) return ctx.notFound('Game profile not found');
    const managers=await strapi.db.query('api::club-manager.club-manager').findMany({
      where:{owner:profile.id,manager_game_status:{$in:['owned','active']}},
      populate:{manager_template:true},orderBy:{createdAt:'asc'},limit:50,
    });
    return ctx.send({data:managers.map((m:any)=>({
      documentId:m.documentId,
      name:m.custom_name||m.default_name,
      is_selected:Boolean(m.is_selected),
      experience_level:m.experience_level,
      archetype:m.manager_template?.manager_archetype??null,
      premium_tier:m.manager_template?.premium_tier??'standard',
      modifiers:m.manager_template?.attribute_modifiers??{},
    }))});
  },
2. api/club-manager/routes/01-custom-routes.ts (replace)
ts
export default {
  routes: [
    { method: 'GET', path: '/me/managers', handler: 'club-manager.mine', config: { auth: true, policies: [] } },
    { method: 'POST', path: '/club-managers/:documentId/rename', handler: 'club-manager.rename', config: { auth: true, policies: [] } },
  ],
};
3. src/services/apiPermissionSeeder.ts

Add api::club-manager.club-manager.mine to the Authenticated allowlist, then re-run the permission sync from RUN_PERMISSIONS_SYNC.md.

Frontend
4. lib/types.ts (add)
ts
export interface Manager {
  documentId: string; name: string; is_selected: boolean; experience_level: number;
  archetype: string | null; premium_tier: string; modifiers: Record<string, number>;
}
5. lib/api.ts

Add Manager to the type import at the top, then add this inside the api object:

ts
  managers: () => unwrap<Manager[]>(request('/me/managers')),
6. app/(app)/club/managers/page.tsx (new)
tsx
'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import StarIcon from '@mui/icons-material/Star';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Manager } from '@/lib/types';

const label = (s: string) => s.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').toLowerCase();

export default function ManagersPage() {
  const { clubId } = useAuth();
  const [list, setList] = useState<Manager[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    try { setList(await api.managers()); } catch (e: any) { setMsg({ ok: false, text: e.message }); setList([]); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (!clubId) return <Alert severity="info">Club not found.</Alert>;
  if (!list) return <LinearProgress />;

  async function select(m: Manager) {
    setBusy(m.documentId); setMsg(null);
    try { await api.chooseManager(clubId!, m.documentId); setMsg({ ok: true, text: `${m.name} is now your manager` }); await load(); }
    catch (e: any) { setMsg({ ok: false, text: e.message }); } finally { setBusy(null); }
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h5" fontWeight={900}>Managers</Typography>
        <Button component={Link} href="/club" size="small">Back</Button>
      </Stack>
      {msg && <Alert severity={msg.ok ? 'success' : 'error'} onClose={() => setMsg(null)}>{msg.text}</Alert>}
      {list.length === 0 && <Typography color="text.secondary">No managers yet. Buy one in the Market.</Typography>}
      {list.map(m => (
        <Card key={m.documentId} sx={m.is_selected ? { borderColor: 'primary.main' } : undefined}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography fontWeight={800} flex={1}>{m.name}</Typography>
              {m.premium_tier !== 'standard' && <StarIcon fontSize="small" color="secondary" />}
              {m.is_selected && <Chip size="small" color="primary" label="Selected" />}
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {m.archetype ? label(m.archetype) : 'balanced'} · level {m.experience_level}
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.5} mt={1}>
              {Object.entries(m.modifiers).map(([k, v]) => <Chip key={k} size="small" variant="outlined" label={`${label(k)} ${v}`} />)}
            </Stack>
            {!m.is_selected && (
              <Button fullWidth variant="contained" size="small" sx={{ mt: 1.5 }} disabled={busy === m.documentId} onClick={() => select(m)}>
                Select
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
7. app/(app)/club/page.tsx

Next to the “Stadium & kit” button from before, add:

tsx
<Button component={Link} href="/club/managers" size="small" variant="outlined" sx={{ alignSelf: 'flex-start' }}>Managers</Button>

Wrap the two buttons in <Stack direction="row" spacing={1}> so they sit side by side.

Notes
Manager effects: attribute_modifiers is only displayed for now. The engine doesn’t read it, so the manager is cosmetic until you add a small bonus to resolveTraits or the AI tactics.
Renaming: custom_manager_naming_enabled is false for the MVP, so I left rename out of the UI. The route and the restricted-names check are ready for later.

For the next step, I’d suggest a tuning pass on the game core, covering ball feel, tackle and foul balance, and goalkeeper save rates against the stat targets in your AI spec. If you want it, tell me which feels worst when you play.

give me as much as you can, so yes, give me the next step

This step is a headless calibration harness plus tuning knobs for the game core. Your AI spec (section 16) says to tune against real match statistics instead of by feel. World has no Babylon dependency, so it can play full matches in Node, with no browser, at many times real speed.

I haven’t run any of this against your repo, so I can’t tell you the current stat numbers. Run the harness first and let it tell you what is off.

Install tsx once, and add a script to package.json:

bash
npm i -D tsx
json
"scripts": { "calibrate": "tsx game/tools/calibrate.ts" }
1. game/core/tuning.ts (new)

The defaults equal your current hardcoded values, so behaviour is unchanged until you move a knob.

ts
/**
 * Global balance knobs. Defaults reproduce the original hardcoded behaviour.
 * The calibration harness mutates this object; the shipped game just reads the defaults.
 * When you are happy with a tuned set, paste the numbers into TUNE_DEFAULTS below.
 */
export const TUNE_DEFAULTS = {
  shootThreshold: 1,   // × AI xG threshold to shoot (higher = fewer shots)
  tackleAttempt: 1,    // × AI chance to attempt a tackle when in range
  foulScale: 1,        // × foul probability on a tackle
  errorScale: 1,       // × pass/shot execution error
  gkCatchBonus: 0,     // + goalkeeper catch probability (−0.3 … +0.3)
  touchShift: 0,       // + first-touch quality (−0.2 … +0.2)
};
export type Tune = typeof TUNE_DEFAULTS;
export const TUNE: Tune = { ...TUNE_DEFAULTS };
export const applyTune = (o: Partial<Tune>) => { Object.assign(TUNE, o); };
2. Patches to game/sim/ai.ts

Add the import at the top:

ts
import { TUNE } from '../core/tuning';

Replace the shot threshold line:

ts
  const thr = (p.role === 'FWD' ? 0.09 : p.role === 'MID' ? 0.11 : 0.16) * TUNE.shootThreshold;

In the chaser block, replace the tackle line with:

ts
          if (dd < 1.25 && w.rng.next() < TUNE.tackleAttempt * (0.14 + 0.2 * p.traits.aggression)) w.tackle(p, dd < 2 && w.owner.speed > 6.5 && w.rng.next() < 0.1);
3. Patches to game/sim/world.ts

a) Add the import at the top:

ts
import { TUNE } from '../core/tuning';

b) Bug fix: the right winger (slot 7) was being classified as a midfielder. The seeder gives him position 'W', which matched none of your regexes and fell through to the shirt-number fallback. 'FB' also only worked through that fallback. Replace the three regex lines in roleOf:

ts
  if (/(^|[^A-Z])(CB|LB|RB|WB|FB|DF|DEF|SW)/.test(s) || /BACK/.test(s)) return 'DEF';
  if (/(^|[^A-Z])(CM|DM|AM|LM|RM|MF|MID|CDM|CAM)/.test(s)) return 'MID';
  if (/^W$/.test(s) || /(ST|CF|FW|FWD|LW|RW|WING|STRIK|ATT)/.test(s)) return 'FWD';

c) Add these fields next to debug = { xg: 0, think: 0 };:

ts
  extra = { tackles: [0, 0], tacklesWon: [0, 0] };
  lastShot: { side: Side; t: number } | null = null;

d) Tackle stats and foul scaling.

After const T = p.traits, O = o.traits; in tackle(), add this.extra.tackles[p.side]++;
As the first line inside if (won) {, add this.extra.tacklesWon[p.side]++;
Replace the foul clamp line with:
ts
    foulP = Math.max(0.02, Math.min(0.85, foulP * TUNE.foulScale));

e) Error scaling. In kick(), replace the let sigma = ... line with:

ts
    let sigma = ((0.012 + (1 - acc) * 0.07) * (0.6 + 0.8 * Math.pow(power, 1.5)) * (1 + 0.8 * runFrac) + pressure * (1 - T.composure) * 0.05) * TUNE.errorScale;

f) Track on-target shots. In kick(), replace the shots_on_target++ line with:

ts
          if (Math.abs(out.z) < this.P.goalWidth / 2 + 0.05 && out.y < this.P.goalHeight + 0.05) { m.shots_on_target++; this.lastShot = { side: p.side, t: this.simT }; }

g) First touch. In firstTouch, add + TUNE.touchShift inside the q expression, right after (isGK ? 0.15 : 0):

ts
    const q = Math.max(0.05, Math.min(0.97, 0.35 + 0.65 * T.firstTouch - rel / 38 + (1 - this.pressureOn(p)) * 0.05 + (isGK ? 0.15 : 0) + TUNE.touchShift));

h) Bug fix: catches were never counted as saves. Only parries incremented saves, so your save% would always read low. Replace the whole gkCatch method:

ts
  gkCatch(p: Player): boolean {
    this.setToucher(p);
    const b = this.ball, T = p.traits;
    const sp = b.speed;
    if (this.lastShot && this.lastShot.side !== p.side && this.simT - this.lastShot.t < 4) {
      this.metrics[p.side].saves++; this.emit('save', p.side, p); this.lastShot = null;
    }
    const catchLim = 12 + 16 * T.gkHands;
    if (sp < catchLim && this.rngPhys.next() < 0.55 + 0.4 * T.gkHands + TUNE.gkCatchBonus) {
      p.gkHolding = true; p.holdT = 0; this.owner = p;
      b.vx = b.vy = b.vz = 0; b.wx = b.wy = b.wz = 0; p.dive = null;
      p.vx *= 0.2; p.vz *= 0.2; this.pending = null;
      return true;
    }
    // parry
    const s = this.dir(p.side);
    b.vx = s * (3 + this.rngPhys.next() * 4) + b.vx * -0.2; b.vz = b.vz * 0.4 + this.rngPhys.gauss() * 4; b.vy = 2 + this.rngPhys.next() * 3;
    b.wx = b.wy = b.wz = 0; this.owner = null; p.touchCd = 0.5; p.kickT = 0.3;
    this.pending = null;
    return true;
  }
4. game/tools/calibrate.ts (new)
ts
/**
 * Headless calibration harness. Plays full AI-vs-AI matches with no rendering and compares the averages
 * to the targets from the AI spec (section 3), then optionally tunes the TUNE knobs by coordinate descent.
 *
 *   npx tsx game/tools/calibrate.ts --n 60                      report only
 *   npx tsx game/tools/calibrate.ts --n 60 --set shootThreshold=1.3,foulScale=0.8
 *   npx tsx game/tools/calibrate.ts --tune --n 40 --rounds 2    auto-tune
 *   npx tsx game/tools/calibrate.ts --determinism               same seed must replay identically
 *   options: --half 180 (seconds per half)  --k 0.2 (volume scale)  --boost 10 (home team attribute bonus)
 */
import { World, DT } from '../sim/world';
import { TUNE, TUNE_DEFAULTS, applyTune, type Tune } from '../core/tuning';
import type { MatchConfig, MatchResult, TeamSetup } from '@/lib/engine/contract';

const argv = process.argv.slice(2);
const flag = (n: string) => argv.includes(`--${n}`);
const num = (n: string, d: number) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? Number(argv[i + 1]) : d; };
const txt = (n: string) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };

const N = num('n', 60), HALF = num('half', 180), BOOST = num('boost', 0), ROUNDS = num('rounds', 2);
// Volume stats (passes, fouls, corners, offsides, tackles) are real-match numbers per 90 min. A compressed match has
// far fewer events, so they are scaled by K. Goals, shots, shots on target and save% are NOT scaled: they define result feel.
const K = num('k', Math.min(1, ((2 * HALF) / 5400) * 3));

const BASE: Record<string, number> = {
  sprintSpeed: 65, acceleration: 65, agility: 60, balance: 60, strength: 60, stamina: 65, jumping: 60,
  dribbling: 55, ballControl: 55, shortPassing: 55, longPassing: 50, crossing: 45, finishing: 45, shotPower: 60,
  longShots: 45, volleys: 40, curve: 45, freeKickAccuracy: 40, penalties: 50, headingAccuracy: 50,
  standingTackle: 45, slideTackle: 40, interceptions: 45, marking: 45, aggression: 55, vision: 50, composure: 50,
  reactions: 55, attackPositioning: 50, defendPositioning: 45, anticipation: 50, decisions: 50, workRate: 60, weakFoot: 50,
};
const GK = { reflexes: 60, diving: 60, handling: 58, gkPositioning: 60, kicking: 50 };
const POS = ['GK', 'FB', 'CB', 'CB', 'FB', 'DM', 'W', 'CM', 'ST', 'AM', 'W'];

function mkTeam(name: string, boost = 0): TeamSetup {
  return {
    clubName: name, formationCode: '4-3-3', formation: null, kit: null,
    players: POS.map((position, i) => {
      const attributes: Record<string, number> = {};
      for (const [k, v] of Object.entries(BASE)) attributes[k] = Math.max(1, Math.min(100, v + boost));
      return { playerId: `${name}-${i + 1}`, slot: `P-${i + 1}`, position, attributes, goalkeeperAttributes: i === 0 ? GK : null, traits: [], appearance: {} };
    }),
  };
}

function playMatch(seed: string) {
  const cfg: MatchConfig = {
    matchId: seed, matchCode: seed, mode: 'training', seed, controlledSide: 'home', opponentIsAI: true,
    home: mkTeam('H', BOOST), away: mkTeam('A'), physics: {}, rules: { halfLengthSeconds: HALF }, ai: {},
    hashes: { roster: '', physics: '' }, stadium: null, camera: 'tv',
  };
  const out: { r: MatchResult | null } = { r: null };
  const w = new World(cfg, { event() {}, banner() {}, score() {}, goal() {}, finished(r) { out.r = r; }, kick() {} }, 'calibrate');
  w.autoPlay = true; w.controlled = null; // both sides AI-driven; nobody stands idle as the "human"
  let guard = 0;
  while (!out.r && guard++ < 60 * 60 * 40) w.step(DT);
  if (!out.r) throw new Error(`match ${seed} did not finish`);
  return { r: out.r, w };
}

const newAgg = () => ({ n: 0, goals: 0, shots: 0, sot: 0, passes: 0, done: 0, fouls: 0, corners: 0, off: 0, tk: 0, tkw: 0, saves: 0, hw: 0, dr: 0, aw: 0, zero: 0, five: 0 });
type Agg = ReturnType<typeof newAgg>;

function evaluate(n: number): Agg {
  const A = newAgg();
  for (let i = 0; i < n; i++) {
    const { r, w } = playMatch(`cal-${i}`);
    const { home: h, away: a } = r.metrics;
    const goals = r.home_score + r.away_score;
    A.n++; A.goals += goals;
    for (const m of [h, a]) { A.shots += m.shots; A.sot += m.shots_on_target; A.passes += m.passes_attempted; A.done += m.passes_completed; A.fouls += m.fouls; A.corners += m.corners; A.saves += m.saves; }
    A.off += r.events.filter(e => e.event_type === 'offside').length;
    A.tk += w.extra.tackles[0] + w.extra.tackles[1]; A.tkw += w.extra.tacklesWon[0] + w.extra.tacklesWon[1];
    if (r.home_score > r.away_score) A.hw++; else if (r.home_score < r.away_score) A.aw++; else A.dr++;
    if (goals === 0) A.zero++; if (goals >= 5) A.five++;
  }
  return A;
}

interface Row { label: string; target: number; tol: number; w: number; val: (A: Agg) => number }
const rows: Row[] = [
  { label: 'Goals / match (both)', target: 2.7, tol: 0.3, w: 3, val: A => A.goals / A.n },
  { label: 'Shots / team', target: 12.5, tol: 1.5, w: 3, val: A => A.shots / (2 * A.n) },
  { label: 'Shots on target / team', target: 4.2, tol: 0.55, w: 2, val: A => A.sot / (2 * A.n) },
  { label: 'GK save % (saves/(saves+goals))', target: 70, tol: 5, w: 2, val: A => (100 * A.saves) / Math.max(1, A.saves + A.goals) },
  { label: 'Pass accuracy %', target: 82, tol: 3, w: 1, val: A => (100 * A.done) / Math.max(1, A.passes) },
  { label: `Passes / team (×${K.toFixed(2)})`, target: 450 * K, tol: 75 * K, w: 1, val: A => A.passes / (2 * A.n) },
  { label: `Fouls / team (×${K.toFixed(2)})`, target: 11.5 * K, tol: Math.max(0.5, 1.75 * K), w: 1, val: A => A.fouls / (2 * A.n) },
  { label: `Corners / team (×${K.toFixed(2)})`, target: 5 * K, tol: Math.max(0.4, 0.8 * K), w: 1, val: A => A.corners / (2 * A.n) },
  { label: `Offsides / team (×${K.toFixed(2)})`, target: 2 * K, tol: Math.max(0.3, 0.6 * K), w: 1, val: A => A.off / (2 * A.n) },
  { label: `Tackles / team (×${K.toFixed(2)})`, target: 18 * K, tol: Math.max(0.8, 3 * K), w: 1, val: A => A.tk / (2 * A.n) },
  { label: 'Tackle win %', target: 60, tol: 7, w: 1, val: A => (100 * A.tkw) / Math.max(1, A.tk) },
];
const loss = (A: Agg) => rows.reduce((s, r) => s + r.w * ((r.val(A) - r.target) / r.tol) ** 2, 0);

function report(A: Agg) {
  console.log(`\n${A.n} matches · half=${HALF}s · k=${K.toFixed(2)} · boost=${BOOST}`);
  console.log('tune', JSON.stringify(TUNE));
  console.log('─'.repeat(78));
  for (const r of rows) {
    const v = r.val(A), ok = Math.abs(v - r.target) <= r.tol;
    console.log(`${ok ? 'OK  ' : v < r.target ? 'LOW ' : 'HIGH'}  ${r.label.padEnd(36)} ${v.toFixed(2).padStart(8)}   target ${r.target.toFixed(2)} ± ${r.tol.toFixed(2)}`);
  }
  console.log('─'.repeat(78));
  console.log(`H/D/A ${(100 * A.hw / A.n).toFixed(0)}% / ${(100 * A.dr / A.n).toFixed(0)}% / ${(100 * A.aw / A.n).toFixed(0)}%   (real: 45/25/30)`);
  console.log(`0-0 ${(100 * A.zero / A.n).toFixed(0)}% (real ≈7)   5+ goals ${(100 * A.five / A.n).toFixed(0)}% (real ≈13)   loss ${loss(A).toFixed(2)}`);
}

const KNOBS: { key: keyof Tune; mul: boolean; lo: number; hi: number; step: number }[] = [
  { key: 'shootThreshold', mul: true, lo: 0.4, hi: 2.5, step: 0.2 },
  { key: 'tackleAttempt', mul: true, lo: 0.3, hi: 2.5, step: 0.2 },
  { key: 'foulScale', mul: true, lo: 0.3, hi: 3, step: 0.25 },
  { key: 'errorScale', mul: true, lo: 0.4, hi: 2, step: 0.15 },
  { key: 'gkCatchBonus', mul: false, lo: -0.3, hi: 0.3, step: 0.05 },
  { key: 'touchShift', mul: false, lo: -0.2, hi: 0.2, step: 0.03 },
];

function tune() {
  let best = loss(evaluate(N));
  console.log(`start loss ${best.toFixed(2)}`);
  for (let round = 0; round < ROUNDS; round++) {
    for (const k of KNOBS) {
      const cur = TUNE[k.key];
      for (const dir of [-1, 1]) {
        const cand = Math.min(k.hi, Math.max(k.lo, k.mul ? cur * (1 + dir * k.step) : cur + dir * k.step));
        if (cand === cur) continue;
        applyTune({ [k.key]: cand });
        const l = loss(evaluate(N));
        if (l < best) { best = l; console.log(`  ${k.key} → ${cand.toFixed(3)}  loss ${l.toFixed(2)}`); break; }
        applyTune({ [k.key]: cur });
      }
    }
  }
  console.log('\nBest knobs (paste into TUNE_DEFAULTS in game/core/tuning.ts):');
  console.log(JSON.stringify(TUNE, null, 2));
}

function determinism() {
  const a = playMatch('det-1'), b = playMatch('det-1');
  const f = (m: { r: MatchResult; w: World }) => JSON.stringify({ ...m.r, match_ended_at: '', x: m.w.extra });
  console.log(f(a) === f(b) ? 'PASS: identical replay for the same seed' : 'FAIL: same seed produced different matches (find the non-seeded randomness)');
}

const set = txt('set');
if (set) applyTune(Object.fromEntries(set.split(',').map(p => p.split('=')).map(([k, v]) => [k, Number(v)])) as Partial<Tune>);
else applyTune(TUNE_DEFAULTS);

if (flag('determinism')) determinism();
else if (flag('tune')) { tune(); report(evaluate(N)); }
else report(evaluate(N));
How to use it
Apply sections 1 to 3, then run npm run calibrate -- --determinism. This must say PASS, because replays and any future server-side verification depend on it.
Run npm run calibrate -- --n 60 for the baseline. Each row says LOW, HIGH or OK against the band.
Fix the biggest red rows with --set, for example --set shootThreshold=1.3,errorScale=1.2. If the row is not controlled by one of the six knobs, the fix is in the AI logic, not the numbers.
Or let it search with npm run calibrate -- --tune --n 40 --rounds 2. It prints the best knob set, and you paste those values into TUNE_DEFAULTS.
Re-run --boost 15, which gives the home team +15 on every attribute. It checks that quality actually produces wins (the spec expects roughly 70 to 75% for a clearly stronger side). If the strong team doesn’t win much more often, attributes aren’t mattering enough in resolveTraits or the contests.
Caveats
The volume targets are scaled. Your spec’s passes, fouls, corners, offsides and tackles are per 90 real minutes, but your matches last 6 real minutes. --k scales those down. Goals, shots, shots on target and save% stay at real values because they define how results feel. Change the rows table if you want a different feel.
Six knobs only cover so much. Pass volume, possession balance and offside counts depend on AI structure (support runs, pass-option scoring), not on any of the six knobs. If those rows stay red, the fix belongs in ai.ts.
Tuning is noisy. Matches are chaotic, so use --n 40 or more per candidate. Always confirm a tuned set with a fresh --n 100 report before trusting it.
Please send me the report output. Paste the table and I can tell you which part of ai.ts to change for each red row (shot selection, defensive positioning, pass scoring).


