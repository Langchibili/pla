'use client';
import { useEffect, useState } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
export default function LeaderboardPage() {
    const { profile } = useAuth();
    const [rows, setRows] = useState(null);
    const [error, setError] = useState(null);
    useEffect(() => { api.leaderboard(100).then(setRows).catch(e => setError(e.message)); }, []);
    if (error)
        return <Alert severity="error">{error}</Alert>;
    if (!rows)
        return <LinearProgress />;
    return (<Stack spacing={1}>
      <Typography variant="h5" fontWeight={900} mb={1}>Leaderboard</Typography>
      {rows.map(r => {
            const me = r.player.documentId === profile?.documentId;
            return (<Card key={r.player.documentId} sx={me ? { borderColor: 'primary.main' } : undefined}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: '10px !important' }}>
              <Typography variant="h6" fontWeight={900} width={36}>{r.rank}</Typography>
              <div style={{ flex: 1 }}>
                <Typography fontWeight={700}>{r.player.handle}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {r.country ?? '—'} · {r.wins}W {r.draws}D {r.losses}L · GD {r.goal_difference}
                </Typography>
              </div>
              <Typography fontWeight={800}>{r.app_xp.toLocaleString()} XP</Typography>
            </CardContent>
          </Card>);
        })}
    </Stack>);
}
