'use client';
import { Box, Button, Chip, MenuItem, TextField, Typography } from '@mui/material';
import { useParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { endpoints } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { useCountdown } from '@/hooks/useCountdown';
import { emit, useSocketEvent, useSocketRoom } from '@/hooks/useSocket';
import { useToast } from '@/hooks/useToast';
import { haptic } from '@/lib/haptics';
import { fmtDate, label, SCORE_FLAG, STATUS_COLOR } from '@/lib/format';
import Surface from '@/components/Surface';
import ScreenshotUpload from '@/components/ScreenshotUpload';
import ActionSheet from '@/components/ActionSheet';
import SkeletonList from '@/components/SkeletonList';
import ErrorNote from '@/components/ErrorNote';
import { AFRICA } from '@/lib/theme';

const REASONS = [['technical_difficulty', 'Technical difficulty'], ['emergency', 'Emergency'], ['other', 'Other']];

export default function MatchRoom() {
  const { id } = useParams(); const toast = useToast();
  useSocketRoom('match', id);
  const { data: m, loading, error, reload } = useApi(`m-${id}`, () => endpoints.match(id), { interval: 20000 });
  const cd = useCountdown(m?.match_deadline);
  const [sheet, setSheet] = useState(null); const [reason, setReason] = useState('technical_difficulty'); const [slot, setSlot] = useState('');
  const refresh = useCallback(() => reload(), [reload]);
  useSocketEvent('match:submission_received', refresh); useSocketEvent('match:result_ready', refresh);
  useSocketEvent('match:postpone_response', refresh); useSocketEvent('match:dispute_opened', refresh);
  if (loading) return <SkeletonList count={3} height={130} />;
  if (error) return <ErrorNote error={error} onRetry={reload} />;
  const open = ['scheduled', 'postponed', 'awaiting_confirmation'].includes(m.match_status);
  const mine = (m.submissions || []).find((s) => s.mine);
  const act = async (fn, ok) => { try { await fn(); toast(ok); setSheet(null); reload(); } catch (e) { toast(e.message, 'error'); } };

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Surface sx={{ p: 3, textAlign: 'center', background: 'linear-gradient(160deg,#0c4a26,#0d1810)' }}>
        <Chip size="small" color={STATUS_COLOR[m.match_status] || 'default'} label={label(m.match_status)} />
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', mt: 2, gap: 1 }}>
          <Typography fontWeight={800}>You</Typography>
          <Typography variant="h2" sx={{ fontVariantNumeric: 'tabular-nums' }}>{m.player1_score ?? '–'}:{m.player2_score ?? '–'}</Typography>
          <Typography fontWeight={800}>{m.opponent_label}</Typography>
        </Box>
        {open && <Typography variant="h5" sx={{ mt: 2, fontVariantNumeric: 'tabular-nums' }} color={cd.urgent ? 'error.main' : 'secondary.main'}>{cd.text}</Typography>}
        <Typography variant="caption" color="text.secondary">Deadline {fmtDate(m.match_deadline)}{m.postponement_count ? ` · postponed ${m.postponement_count}×` : ''}</Typography>
      </Surface>

      <Surface accent={AFRICA.gold}>
        <Typography variant="caption" color="text.secondary">Match code</Typography>
        <Typography variant="h4" sx={{ letterSpacing: 4, cursor: 'pointer' }} onClick={() => { navigator.clipboard?.writeText(m.match_code); haptic('success'); toast('Code copied'); }}>{m.match_code}</Typography>
        <Typography variant="body2" color="text.secondary">Use this code as your team or room name so your screenshot is tied to this match.</Typography>
      </Surface>

      {open && <Surface>
        <Typography variant="h6" sx={{ mb: 1.5 }}>Submit your result</Typography>
        {mine && <Chip sx={{ mb: 1.5 }} color={mine.match_submission_status === 'valid' ? 'success' : mine.match_submission_status === 'invalid' ? 'error' : 'warning'} label={SCORE_FLAG[mine.match_submission_status]} />}
        <ScreenshotUpload onUpload={(f) => endpoints.submitResult(id, f).then(reload)} />
      </Surface>}

      {m.dispute_status === 'open' && <Surface accent={AFRICA.red}><Typography fontWeight={800}>Dispute open</Typography><Typography variant="body2" color="text.secondary">An admin is reviewing both screenshots.</Typography></Surface>}

      {open && <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
        <Button variant="outlined" color="secondary" onClick={() => { haptic('medium'); setSheet('unavailable'); }}>Can&apos;t play</Button>
        <Button variant="outlined" color="error" onClick={() => { haptic('warning'); setSheet('dispute'); }}>Dispute</Button>
      </Box>}

      <ActionSheet open={sheet === 'unavailable'} onClose={() => setSheet(null)} title="Can&apos;t play this match?">
        <TextField select label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} sx={{ mb: 2 }}>{REASONS.map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}</TextField>
        <TextField type="datetime-local" label="Proposed new time" value={slot} onChange={(e) => setSlot(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ mb: 2 }} />
        <Box sx={{ display: 'grid', gap: 1.2 }}>
          <Button variant="contained" color="secondary" disabled={!slot || m.postponement_count >= 1} onClick={() => act(() => endpoints.matchAction(id, 'postpone', { reason_code: reason, proposed_slots: [new Date(slot).toISOString()] }), 'Request sent')}>Request postponement</Button>
          <Button variant="outlined" color="error" onClick={() => { emit('match:forfeit', { matchId: id }); act(() => endpoints.matchAction(id, 'forfeit'), 'You forfeited this match'); }}>Forfeit instead</Button>
        </Box>
      </ActionSheet>
      <ActionSheet open={sheet === 'dispute'} onClose={() => setSheet(null)} title="Open a dispute?">
        <Typography color="text.secondary" sx={{ mb: 2 }}>The match locks and an admin reviews both screenshots.</Typography>
        <Button fullWidth variant="contained" color="error" onClick={() => act(() => endpoints.matchAction(id, 'dispute'), 'Dispute opened')}>Open dispute</Button>
      </ActionSheet>
    </Box>
  );
}
