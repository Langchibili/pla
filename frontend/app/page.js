'use client';
import { Box, Typography, Button } from '@mui/material';
import { useRouter } from 'next/navigation';
import { endpoints } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import { useSocketEvent } from '@/hooks/useSocket';
import { useCallback } from 'react';
import Surface from '@/components/Surface';
import MatchCard from '@/components/MatchCard';
import TournamentCard from '@/components/TournamentCard';
import SkeletonList from '@/components/SkeletonList';
import ErrorNote from '@/components/ErrorNote';
import EmptyState from '@/components/EmptyState';
import KenteStripe from '@/components/KenteStripe';
import { AFRICA } from '@/lib/theme';
import { fmtPlapo } from '@/lib/format';

export default function Home() {
  const router = useRouter(); const { user } = useAuth();
  const matches = useApi('my-matches', endpoints.myMatches, { interval: 60000 });
  const tours = useApi('tours-home', () => endpoints.tournaments());
  useSocketEvent('leaderboard:updated', useCallback(() => matches.reload(), [matches.reload]));
  const active = (matches.data || []).filter((m) => ['scheduled', 'postponed', 'awaiting_confirmation', 'in_dispute'].includes(m.match_status));
  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <Surface sx={{ p: 3, background: `linear-gradient(145deg, #0c4a26, #07100A 70%)` }}>
        <Typography variant="body2" color="text.secondary">Welcome back</Typography>
        <Typography variant="h4" sx={{ minWidth: 0, fontSize: 'clamp(1.2rem, 6vw, 2.125rem)', lineHeight: 1.2, overflowWrap: 'anywhere' }}>{user?.username}</Typography>
        <KenteStripe sx={{ my: 2, width: 96 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          <Box><Typography variant="caption" color="text.secondary">Spendable</Typography><Typography variant="h5" color="secondary.main">{fmtPlapo(user?.spendable_balance)}</Typography></Box>
          <Box><Typography variant="caption" color="text.secondary">Transferable</Typography><Typography variant="h5">{fmtPlapo(user?.transferable_balance)}</Typography></Box>
        </Box>
        <Button fullWidth variant="contained" color="secondary" sx={{ mt: 2.5 }} onClick={() => router.push('/tournaments')}>Find a tournament</Button>
      </Surface>

      <Box><Typography variant="h6" sx={{ mb: 1.5 }}>Your active matches</Typography>
        <ErrorNote error={matches.error} onRetry={matches.reload} />
        {matches.loading ? <SkeletonList count={2} height={110} /> : active.length ? <Box sx={{ display: 'grid', gap: 1.5 }}>{active.map((m) => <MatchCard key={m.documentId} m={m} />)}</Box>
          : <Surface><Typography color="text.secondary">No matches waiting. Join a tournament to get fixtures.</Typography></Surface>}
      </Box>

      <Box><Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}><Typography variant="h6">Open for entry</Typography>
        <Button size="small" color="secondary" onClick={() => router.push('/leaderboard')}>Leaderboards</Button></Box>
        {tours.loading ? <SkeletonList count={2} /> : tours.data?.length ? <Box sx={{ display: 'grid', gap: 2 }}>{tours.data.slice(0, 3).map((t) => <TournamentCard key={t.documentId} t={t} />)}</Box>
          : <EmptyState title="No tournaments yet" body="New events appear here as soon as they are published." />}
      </Box>
    </Box>
  );
}
