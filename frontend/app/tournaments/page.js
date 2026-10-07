'use client';
import { Box, Chip } from '@mui/material';
import { useState } from 'react';
import { endpoints } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { haptic } from '@/lib/haptics';
import TournamentCard from '@/components/TournamentCard';
import SkeletonList from '@/components/SkeletonList';
import EmptyState from '@/components/EmptyState';
import ErrorNote from '@/components/ErrorNote';

export default function Tournaments() {
  const [game, setGame] = useState('all');
  const { data, loading, error, reload } = useApi('tours', () => endpoints.tournaments());
  const games = [...new Map((data || []).filter((t) => t.game).map((t) => [t.game.slug, t.game.name])).entries()];
  const list = (data || []).filter((t) => game === 'all' || t.game?.slug === game);
  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', mx: -2, px: 2, pb: 0.5, '&::-webkit-scrollbar': { display: 'none' } }}>
        {[['all', 'All games'], ...games].map(([slug, name]) => (
          <Chip key={slug} label={name} clickable color={game === slug ? 'secondary' : 'default'} variant={game === slug ? 'filled' : 'outlined'} onClick={() => { haptic('select'); setGame(slug); }} />
        ))}
      </Box>
      <ErrorNote error={error} onRetry={reload} />
      {loading ? <SkeletonList /> : list.length ? list.map((t) => <TournamentCard key={t.documentId} t={t} />) : <EmptyState title="Nothing here yet" body="No open tournaments for this game." />}
    </Box>
  );
}
