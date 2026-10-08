'use client';
import { Avatar, Box, Typography } from '@mui/material';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback } from 'react';
import { endpoints } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { useSocketEvent } from '@/hooks/useSocket';
import Surface from '@/components/Surface';
import SkeletonList from '@/components/SkeletonList';
import EmptyState from '@/components/EmptyState';
import { AFRICA } from '@/lib/theme';

const MEDAL = [AFRICA.gold, '#C0C6CC', '#CD7F32'];
function Board() {
  const t = useSearchParams().get('t');
  const { data, loading, reload } = useApi(`lb-${t}`, () => endpoints.entries(t), { interval: 30000, enabled: !!t });
  useSocketEvent('leaderboard:updated', useCallback(() => reload(), [reload]));
  if (!t) return <EmptyState title="Pick a tournament" body="Open a tournament and tap View leaderboard." />;
  if (loading) return <SkeletonList count={6} height={64} />;
  const me = (data || []).findIndex((e) => e.is_me);
  return (
    <Box sx={{ display: 'grid', gap: 1.2 }}>
      {(data || []).map((e, i) => (
        <Surface key={e.documentId} sx={{ p: 1.5, display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 1.5, alignItems: 'center', ...(i === me && { outline: `2px solid ${AFRICA.green}` }) }}>
          <Avatar sx={{ width: 34, height: 34, fontWeight: 900, bgcolor: i < 3 ? MEDAL[i] : 'background.default', color: i < 3 ? '#1a1200' : 'text.primary' }}>{i + 1}</Avatar>
          <Box><Typography fontWeight={800} noWrap>{i === me ? 'You' : e.anon_label || `Player ${i + 1}`}</Typography><Typography variant="caption" color="text.secondary">{e.matches_played}P · {e.wins}W {e.draws}D {e.losses}L · GD {e.goals_for - e.goals_against}</Typography></Box>
          <Typography variant="h6" color="secondary.main">{e.points}</Typography>
        </Surface>))}
      {me > 9 && <Box sx={{ position: 'sticky', bottom: 'calc(env(safe-area-inset-bottom) + 100px)' }}><Surface accent={AFRICA.green} sx={{ boxShadow: 20 }}>Your position: #{me + 1}</Surface></Box>}
    </Box>
  );
}
export default function Leaderboard() { return <Suspense fallback={<SkeletonList count={6} height={64} />}><Board /></Suspense>; }
