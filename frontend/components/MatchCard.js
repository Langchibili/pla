'use client';
import { Box, Chip, Typography } from '@mui/material';
import { useRouter } from 'next/navigation';
import Surface from './Surface';
import { useCountdown } from '@/hooks/useCountdown';
import { label, STATUS_COLOR } from '@/lib/format';
import { AFRICA } from '@/lib/theme';

export default function MatchCard({ m }) {
  const router = useRouter();
  const cd = useCountdown(m.match_deadline);
  const open = ['scheduled', 'postponed', 'awaiting_confirmation'].includes(m.match_status);
  return (
    <Surface onClick={() => router.push(`/matches/${m.documentId}`)} accent={cd.urgent && open ? AFRICA.red : AFRICA.green}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="caption" color="text.secondary">{m.tournament?.title} · {m.tournament_stage?.stage_name}</Typography>
        <Chip size="small" color={STATUS_COLOR[m.match_status] || 'default'} label={label(m.match_status)} sx={{ maxWidth: '48%', borderTopRightRadius: '16px', '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }} />
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)', alignItems: 'center', gap: 1 }}>
        <Typography fontWeight={800} sx={{ overflowWrap: 'anywhere', lineHeight: 1.2 }}>You</Typography>
        <Typography variant="h5" sx={{ fontVariantNumeric: 'tabular-nums' }}>{m.player1_score ?? '–'} : {m.player2_score ?? '–'}</Typography>
        <Typography fontWeight={800} align="right" sx={{ overflowWrap: 'anywhere', lineHeight: 1.2 }}>{m.opponent_label || 'Opponent'}</Typography>
      </Box>
      {open && <Typography variant="body2" sx={{ mt: 1.2, fontVariantNumeric: 'tabular-nums' }} color={cd.urgent ? 'error.main' : 'text.secondary'}>{cd.done ? 'Deadline passed' : `Time left ${cd.text}`}</Typography>}
    </Surface>
  );
}
