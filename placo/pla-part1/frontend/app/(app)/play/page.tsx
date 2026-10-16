'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import { api } from '@/lib/api';
import { AI_TEAMS, DIFFICULTIES, matchKey } from '@/lib/trainingOptions';

export default function PlayPage() {
  const router = useRouter();
  const [team, setTeam] = useState(AI_TEAMS[0].code);
  const [diff, setDiff] = useState(DIFFICULTIES[1].code);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startTraining() {
    setBusy(true); setError(null);
    try {
      const { match } = await api.startTraining(team, diff);
      sessionStorage.setItem(matchKey(match.documentId), JSON.stringify(match));
      router.push(`/match/${match.documentId}`);
    } catch (e: any) { setError(e.message); setBusy(false); }
  }

  return (
    <Stack spacing={2.5}>
      <Typography variant="h5" fontWeight={900}>Play</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {busy && <LinearProgress />}

      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={800}>Training match</Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>Play an AI opponent. Earn XP and bronze coins.</Typography>
          <Typography variant="caption" color="text.secondary">Opponent</Typography>
          <ToggleButtonGroup exclusive fullWidth size="small" value={team} onChange={(_, v) => v && setTeam(v)} sx={{ mb: 2, mt: 0.5 }}>
            {AI_TEAMS.map(t => <ToggleButton key={t.code} value={t.code}>{t.name}</ToggleButton>)}
          </ToggleButtonGroup>
          <Typography variant="caption" color="text.secondary">Difficulty</Typography>
          <ToggleButtonGroup exclusive fullWidth size="small" value={diff} onChange={(_, v) => v && setDiff(v)} sx={{ mb: 2, mt: 0.5 }}>
            {DIFFICULTIES.map(d => <ToggleButton key={d.code} value={d.code}>{d.name}</ToggleButton>)}
          </ToggleButtonGroup>
          <Button variant="contained" fullWidth size="large" disabled={busy} onClick={startTraining}>Kick off</Button>
        </CardContent>
      </Card>

      <Card sx={{ opacity: 0.6 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={800}>Online match</Typography>
          <Typography variant="body2" color="text.secondary">Casual and ranked PvP arrive once the realtime relay is live.</Typography>
        </CardContent>
      </Card>
    </Stack>
  );
}
