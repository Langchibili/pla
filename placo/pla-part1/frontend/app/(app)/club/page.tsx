'use client';
import { useCallback, useEffect, useState } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import StarIcon from '@mui/icons-material/Star';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Formation, Squad, SquadPlayer } from '@/lib/types';

const avg = (a: Record<string, number>) => {
  const v = Object.values(a ?? {}).filter(n => typeof n === 'number');
  return v.length ? Math.round(v.reduce((s, n) => s + n, 0) / v.length) : 0;
};

export default function ClubPage() {
  const { clubId, refresh } = useAuth();
  const [squad, setSquad] = useState<Squad | null>(null);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [sel, setSel] = useState<SquadPlayer | null>(null);
  const [attr, setAttr] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!clubId) return;
    try {
      const [s, f] = await Promise.all([api.squad(clubId), api.formations()]);
      setSquad(s); setFormations(f);
    } catch (e: any) { setError(e.message); }
  }, [clubId]);
  useEffect(() => { load(); }, [load]);

  if (!clubId) return <Alert severity="info">Club not found. If this persists, the backend route GET /me/club may be missing (see backend-additions.md).</Alert>;
  if (!squad) return <LinearProgress />;

  async function setFormation(code: string) {
    setBusy(true); setError(null);
    try { await api.chooseFormation(clubId!, code); await load(); } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }
  async function upgrade() {
    if (!sel || !attr) return;
    setBusy(true); setError(null);
    try { await api.upgradePlayer(sel.documentId, attr, 'bronze'); setSel(null); await Promise.all([load(), refresh()]); }
    catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }

  const players = [...squad.players].sort((a, b) => a.slot.localeCompare(b.slot, undefined, { numeric: true }));

  return (
    <Stack spacing={2}>
      <Typography variant="h5" fontWeight={900}>{squad.club.club_name}</Typography>
      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
      {busy && <LinearProgress />}

      <Typography variant="subtitle2" color="text.secondary">Formation</Typography>
      <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 0.5 }}>
        {formations.map(f => (
          <Chip key={f.documentId} label={f.formation_name ?? f.formation_code} clickable
            color={squad.formation?.formation_code === f.formation_code ? 'primary' : 'default'}
            onClick={() => setFormation(f.formation_code)} />
        ))}
      </Stack>

      <Typography variant="subtitle2" color="text.secondary">Squad</Typography>
      <Stack spacing={1}>
        {players.map(p => (
          <Card key={p.documentId}>
            <CardActionArea onClick={() => { setSel(p); setAttr(Object.keys(p.attributes ?? {})[0] ?? ''); }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: '10px !important' }}>
                <Chip size="small" label={p.slot} color="primary" variant="outlined" />
                <div style={{ flex: 1 }}>
                  <Typography fontWeight={700}>{p.template?.display_name ?? p.slot}</Typography>
                  <Typography variant="caption" color="text.secondary">{p.position} · {p.squad_role}</Typography>
                </div>
                {p.is_premium && <StarIcon fontSize="small" color="secondary" />}
                <Typography variant="h6" fontWeight={900}>{p.template?.overall_rating ?? avg(p.attributes)}</Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Stack>

      <Dialog open={!!sel} onClose={() => setSel(null)} fullWidth>
        <DialogTitle>{sel?.template?.display_name ?? sel?.slot}</DialogTitle>
        <DialogContent>
          <Stack spacing={1} mt={1}>
            {sel && Object.entries(sel.attributes ?? {}).map(([k, v]) => (
              <Stack key={k} direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">{k.replace(/_/g, ' ')}</Typography>
                <Typography variant="body2" fontWeight={700}>{v}</Typography>
              </Stack>
            ))}
            <Typography variant="caption" color="text.secondary" mt={1}>Develop (bronze coins)</Typography>
            <Select size="small" value={attr} onChange={e => setAttr(e.target.value)}>
              {sel && Object.keys(sel.attributes ?? {}).map(k => <MenuItem key={k} value={k}>{k.replace(/_/g, ' ')}</MenuItem>)}
            </Select>
            <Button variant="contained" onClick={upgrade} disabled={busy || !attr}>Upgrade</Button>
          </Stack>
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
