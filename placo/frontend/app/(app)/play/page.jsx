'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import { api } from '@/lib/api';
import { AI_TEAMS, DIFFICULTIES, matchKey } from '@/lib/trainingOptions';
export default function PlayPage() {
    const router = useRouter();
    const [team, setTeam] = useState(AI_TEAMS[0].code);
    const [diff, setDiff] = useState(DIFFICULTIES[1].code);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    async function startTraining() {
        setBusy(true);
        setError(null);
        try {
            const { match } = await api.startTraining(team, diff);
            sessionStorage.setItem(matchKey(match.documentId), JSON.stringify(match));
            router.push(`/match/${match.documentId}`);
        }
        catch (e) {
            setError(e.message);
            setBusy(false);
        }
    }
    return (<Stack spacing={2.5} sx={{ pb: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ py: 0.5 }}>
        <SportsSoccerIcon sx={{ color: '#f4cb34', fontSize: 32 }} />
        <Box>
          <Typography variant="overline" fontWeight={900} letterSpacing={1.5} color="#f4cb34">MATCH CENTRE</Typography>
          <Typography variant="h5" fontWeight={900} lineHeight={1.1}>Choose your fixture</Typography>
        </Box>
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      {busy && <LinearProgress />}

      <Card sx={{ overflow: 'hidden', borderRadius: 4, border: '1px solid rgba(244,203,52,0.24)', background: 'linear-gradient(145deg, rgba(15,73,44,0.5), rgba(255,255,255,0.025) 55%)' }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography variant="overline" fontWeight={900} letterSpacing={1.3} color="#f4cb34">SINGLE PLAYER</Typography>
          <Typography variant="h6" fontWeight={900}>Training match</Typography>
          <Typography variant="body2" color="text.secondary" mb={2.5}>Take your club into a match against the AI. Earn XP and bronze coins.</Typography>
          <Typography variant="caption" fontWeight={800} color="text.secondary">OPPONENT</Typography>
          <ToggleButtonGroup exclusive fullWidth size="small" value={team} onChange={(_, v) => v && setTeam(v)} sx={{ mb: 2.25, mt: 0.7, '& .MuiToggleButton-root': { borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(234,245,238,0.72)', fontWeight: 800, textTransform: 'none' }, '& .Mui-selected': { color: '#f4cb34 !important', bgcolor: 'rgba(244,203,52,0.12) !important', borderColor: 'rgba(244,203,52,0.45) !important' } }}>
            {AI_TEAMS.map(t => <ToggleButton key={t.code} value={t.code}>{t.name}</ToggleButton>)}
          </ToggleButtonGroup>
          <Typography variant="caption" fontWeight={800} color="text.secondary">DIFFICULTY</Typography>
          <ToggleButtonGroup exclusive fullWidth size="small" value={diff} onChange={(_, v) => v && setDiff(v)} sx={{ mb: 2.5, mt: 0.7, '& .MuiToggleButton-root': { borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(234,245,238,0.72)', fontWeight: 800, textTransform: 'none' }, '& .Mui-selected': { color: '#f4cb34 !important', bgcolor: 'rgba(244,203,52,0.12) !important', borderColor: 'rgba(244,203,52,0.45) !important' } }}>
            {DIFFICULTIES.map(d => <ToggleButton key={d.code} value={d.code}>{d.name}</ToggleButton>)}
          </ToggleButtonGroup>
          <Button variant="contained" fullWidth size="large" disabled={busy} onClick={startTraining} startIcon={<SportsSoccerIcon />} sx={{ minHeight: 52, color: '#07110b', bgcolor: '#f4cb34', fontWeight: 950, borderRadius: 2.5, '&:hover': { bgcolor: '#ffdb59' }, '&.Mui-disabled': { color: 'rgba(7,17,11,0.55)', bgcolor: 'rgba(244,203,52,0.45)' } }}>
            {busy ? 'Preparing match…' : 'Kick off'}
          </Button>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 3, border: '1px solid rgba(255,255,255,0.07)', bgcolor: 'rgba(255,255,255,0.025)', opacity: 0.76 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={900}>Online competition</Typography>
          <Typography variant="body2" color="text.secondary">Casual and ranked PvP arrive once the realtime relay is live.</Typography>
        </CardContent>
      </Card>
    </Stack>);
}
