'use client';
import { Box, Button, TextField, Typography, Chip } from '@mui/material';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { endpoints, mediaUrl } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import { useSocketRoom } from '@/hooks/useSocket';
import { useToast } from '@/hooks/useToast';
import { fmtCurrencyAmount, fmtDate, fmtPlapo, label } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import Surface from '@/components/Surface';
import ActionSheet from '@/components/ActionSheet';
import SkeletonList from '@/components/SkeletonList';
import ErrorNote from '@/components/ErrorNote';
import ClickableImage from '@/components/ClickableImage';
import { useCountdown } from '@/hooks/useCountdown';
import { AFRICA } from '@/lib/theme';

function StageSchedule({ stage }) {
  const [expanded, setExpanded] = useState(false);
  const schedule = useApi(`schedule-${stage.documentId}`, () => endpoints.stageSchedule(stage.documentId), { enabled: expanded });

  return (
    <Box sx={{ mt: 1 }}>
      <Button size="small" color="secondary" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
        {expanded ? 'Hide schedule' : 'View schedule'}
      </Button>
      {expanded && (schedule.loading ? <Typography variant="body2" color="text.secondary">Loading schedule…</Typography>
        : schedule.error ? <Typography variant="body2" color="error.main">Schedule unavailable.</Typography>
          : schedule.data?.matches?.length ? <Box sx={{ display: 'grid', gap: 1, mt: 1 }}>
            {schedule.data.matches.map((match, index) => (
              <Box key={`${stage.documentId}-${index}`} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, py: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography fontWeight={700}>{match.player1 || 'TBD'} vs {match.player2 || 'TBD'}</Typography>
                  <Typography variant="caption" color="text.secondary">{label(match.status)} · {fmtDate(match.deadline)}</Typography>
                </Box>
                {match.player1_score != null && <Typography fontWeight={800}>{match.player1_score}–{match.player2_score}</Typography>}
              </Box>
            ))}
          </Box> : <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Fixtures have not been published yet.</Typography>)}
    </Box>
  );
}

function tournamentCountdownVisible(tournament, countdown) {
  return Boolean(
    tournament?.starts_at
    && !countdown.done
    && !['in_progress', 'completed', 'cancelled'].includes(tournament.tournament_status),
  );
}

export default function TournamentDetail() {
  const { id } = useParams(); const router = useRouter(); const toast = useToast();
  useSocketRoom('tournament', id);
  const { user, refresh } = useAuth();
  const { data: t, loading, error, reload } = useApi(`t-${id}`, () => endpoints.tournament(id));
  const board = useApi(`b-${id}`, () => endpoints.entries(id), { interval: 30000 });
  const countdown = useCountdown(t?.starts_at);
  const sourceCurrency = t?.prize_pool_currency?.code;
  const viewerCurrency = user?.country?.default_currency?.code;
  const shouldConvertPrize = Boolean(t?.has_prize_pool && sourceCurrency && viewerCurrency && sourceCurrency !== viewerCurrency);
  const prizeConversion = useApi(
    `prize-${id}-${t?.prize_pool_current_amount ?? ''}-${sourceCurrency ?? ''}-${viewerCurrency ?? ''}`,
    () => endpoints.convertPrice(Number(t.prize_pool_current_amount), sourceCurrency),
    { enabled: shouldConvertPrize },
  );
  const [open, setOpen] = useState(false); const [name, setName] = useState(''); const [busy, setBusy] = useState(false);
  if (loading) return <SkeletonList count={3} height={140} />;
  if (error) return <ErrorNote error={error} onRetry={reload} />;
  const fmt = t.game?.in_game_id_format ? new RegExp(t.game.in_game_id_format) : null;
  const valid = name.trim().length > 1 && (!fmt || fmt.test(name.trim()));
  const joined = (board.data || []).some((e) => e.is_me);
  const canEnter = t.tournament_status === 'registration_open' && t.game?.game_status === 'active';
  const enter = async () => {
    setBusy(true);
    try { await endpoints.enter(id, name.trim()); haptic('success'); toast('You are in. Good luck!'); setOpen(false); refresh(); board.reload(); }
    catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Surface sx={{ p: 3, background: `linear-gradient(145deg, #0c4a26, #0d1810)` }}>
        <Chip size="small" color="secondary" label={label(t.tournament_status)} sx={{ mb: 1 }} />
        <Typography variant="h4">{t.title}</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5 }}>{t.game?.name} · {t.country?.name || 'Pan-Africa'}</Typography>
        {t.description && <Typography sx={{ mt: 1.5 }} variant="body2">{t.description}</Typography>}
        {tournamentCountdownVisible(t, countdown) && <Typography variant="h6" color={countdown.urgent ? 'warning.main' : 'secondary.main'} sx={{ mt: 1.5, fontVariantNumeric: 'tabular-nums' }}>Starts in {countdown.text}</Typography>}
      </Surface>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
        {[['Entry', t.requires_entry_fee ? `${fmtPlapo(t.entry_fee_plapo)} Plapo` : 'Free'], ['Prize pool', null], ['Players', `${board.data?.length ?? 0}/${t.max_players ?? '∞'}`], ['Starts', fmtDate(t.starts_at)]].map(([k, v]) => (
          <Surface key={k} sx={{ p: 1.8 }}>
            <Typography variant="caption" color="text.secondary">{k}</Typography>
            <Typography fontWeight={800} color={k === 'Prize pool' ? 'secondary.main' : 'text.primary'}>
              {k !== 'Prize pool' ? v : !t.has_prize_pool ? '—'
                : shouldConvertPrize
                  ? prizeConversion.error ? 'Conversion unavailable'
                    : prizeConversion.data ? fmtCurrencyAmount(prizeConversion.data.amount, { symbol: prizeConversion.data.currencySymbol, code: prizeConversion.data.currencyCode })
                      : 'Converting…'
                  : fmtCurrencyAmount(t.prize_pool_current_amount, t.prize_pool_currency)}
            </Typography>
            {k === 'Prize pool' && t.has_prize_pool && shouldConvertPrize && prizeConversion.error && (
              <Button size="small" onClick={prizeConversion.reload}>Retry conversion</Button>
            )}
          </Surface>
        ))}
      </Box>
      <Typography variant="h6">Stages</Typography>
      <Box sx={{ display: 'grid', gap: 1.2 }}>
        {[...(t.stages || [])].sort((a, b) => a.stage_order - b.stage_order).map((s) => (
          <Surface key={s.documentId} accent={AFRICA.gold} sx={{ p: 1.8 }}>
            <Typography fontWeight={800}>{s.stage_order}. {s.stage_name} <Typography component="span" variant="caption" color="text.secondary">({label(s.stage_type)})</Typography></Typography>
            <Typography variant="caption" color="text.secondary">{fmtDate(s.starts_at)} → {fmtDate(s.ends_at)} · top {s.advance_count ?? '—'} advance</Typography>
            <StageSchedule stage={s} />
          </Surface>))}
      </Box>
      <Button variant="outlined" color="secondary" onClick={() => router.push(`/leaderboard?t=${id}`)}>View leaderboard</Button>
      <Box>
        <Button fullWidth size="large" variant="contained" color={joined ? 'primary' : 'secondary'} disabled={joined || !canEnter} onClick={() => { haptic('medium'); setOpen(true); }}>
          {joined ? 'You are registered' : canEnter ? (t.requires_entry_fee ? `Join for ${fmtPlapo(t.entry_fee_plapo)} Plapo` : 'Join free') : 'Registration closed'}
        </Button>
      </Box>
      <ActionSheet open={open} onClose={() => setOpen(false)} title="Enter your in-game name">
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Type the exact name {t.game?.name} shows during a match. It is locked for this tournament.</Typography>
        <TextField label={t.game?.in_game_id_label || 'In-game name'} value={name} onChange={(e) => setName(e.target.value)} error={!!name && !valid} helperText={!!name && !valid ? 'This does not match the format for this game.' : ' '} />
        <Button fullWidth size="large" variant="contained" color="secondary" disabled={!valid || busy} onClick={enter} sx={{ mt: 1 }}>{busy ? 'Joining…' : 'Confirm and join'}</Button>
        {mediaUrl(t.game?.in_game_id_example) && (
          <Box sx={{ mt: 1, mb: 2 }}>
            <Typography variant="caption" color="text.secondary">Example in-game ID</Typography>
            <ClickableImage src={mediaUrl(t.game.in_game_id_example)} alt={`${t.game?.name || 'Game'} in-game ID example`} sx={{ display: 'block', width: '100%', maxHeight: 220, objectFit: 'contain', borderRadius: 2, mt: 0.75 }} />
          </Box>
        )}
      </ActionSheet>
    </Box>
  );
}
