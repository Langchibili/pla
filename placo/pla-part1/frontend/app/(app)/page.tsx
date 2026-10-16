'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import StatTile from '@/components/StatTile';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import type { MatchRecord } from '@/lib/types';

export default function HomePage() {
  const { profile, logout } = useAuth();
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  useEffect(() => { api.myMatches().then(setMatches).catch(() => {}); }, []);
  if (!profile) return null;

  return (
    <Stack spacing={2.5}>
      <div>
        <Typography variant="h5" fontWeight={900}>{profile.public_handle}</Typography>
        <Typography color="text.secondary" variant="body2">{profile.country?.name ?? 'Africa'} · {profile.app_xp.toLocaleString()} XP</Typography>
      </div>
      <Stack direction="row" spacing={1}>
        <StatTile label="Played" value={profile.matches_played} />
        <StatTile label="Wins" value={profile.wins} />
        <StatTile label="Draws" value={profile.draws} />
        <StatTile label="Losses" value={profile.losses} />
      </Stack>
      <Button component={Link} href="/play" variant="contained" size="large" startIcon={<SportsSoccerIcon />} sx={{ py: 1.8, fontSize: 18 }}>
        Play now
      </Button>
      <Typography variant="subtitle1" fontWeight={800}>Recent matches</Typography>
      <Stack spacing={1}>
        {matches.length === 0 && <Typography color="text.secondary" variant="body2">No matches yet. Start with a training game.</Typography>}
        {matches.map(m => (
          <Card key={m.documentId}>
            <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: '12px !important' }}>
              <div>
                <Typography fontWeight={700}>{m.home_score ?? '–'} : {m.away_score ?? '–'}</Typography>
                <Typography variant="caption" color="text.secondary">{m.match_mode} · {m.match_code}</Typography>
              </div>
              <Chip size="small" label={m.match_status.replace('_', ' ')} />
            </CardContent>
          </Card>
        ))}
      </Stack>
      <Button color="inherit" onClick={logout} sx={{ opacity: 0.6 }}>Sign out</Button>
    </Stack>
  );
}
