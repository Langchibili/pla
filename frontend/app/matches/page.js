'use client';
import { Box, Tab, Tabs } from '@mui/material';
import { useState } from 'react';
import { endpoints } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { haptic } from '@/lib/haptics';
import MatchCard from '@/components/MatchCard';
import SkeletonList from '@/components/SkeletonList';
import EmptyState from '@/components/EmptyState';
import ErrorNote from '@/components/ErrorNote';

const OPEN = ['scheduled', 'postponed', 'awaiting_confirmation', 'in_dispute'];
export default function Matches() {
  const [tab, setTab] = useState(0);
  const { data, loading, error, reload } = useApi('my-matches', endpoints.myMatches, { interval: 60000 });
  const list = (data || []).filter((m) => (tab === 0) === OPEN.includes(m.match_status));
  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Tabs value={tab} onChange={(_, v) => { haptic('select'); setTab(v); }} variant="fullWidth" textColor="secondary" indicatorColor="secondary" sx={{ bgcolor: 'background.paper', borderRadius: '16px', boxShadow: 8 }}>
        <Tab label="To play" /><Tab label="History" />
      </Tabs>
      <ErrorNote error={error} onRetry={reload} />
      {loading ? <SkeletonList /> : list.length ? list.map((m) => <MatchCard key={m.documentId} m={m} />) : <EmptyState icon="⚽" title={tab === 0 ? 'No matches to play' : 'No history yet'} body="Your fixtures show up here when a stage starts." />}
    </Box>
  );
}
