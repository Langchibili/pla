'use client';
import { Box, Chip, Typography } from '@mui/material';
import { useRouter } from 'next/navigation';
import { endpoints } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import { useCountdown } from '@/hooks/useCountdown';
import Surface from './Surface';
import { mediaUrl } from '@/lib/api';
import ClickableImage from './ClickableImage';
import { fmtCurrencyAmount, fmtDate, fmtPlapo, label, STATUS_COLOR } from '@/lib/format';
import { AFRICA } from '@/lib/theme';

export default function TournamentCard({ t }) {
  const router = useRouter();
  const { user } = useAuth();
  const banner = mediaUrl(t.banner);
  const countdown = useCountdown(t.starts_at);
  const sourceCurrency = t.prize_pool_currency?.code;
  const viewerCurrency = user?.country?.default_currency?.code;
  const shouldConvert = Boolean(t.has_prize_pool && sourceCurrency && viewerCurrency && sourceCurrency !== viewerCurrency);
  const conversion = useApi(
    `pool-${t.documentId}-${t.prize_pool_current_amount ?? ''}-${sourceCurrency ?? ''}-${viewerCurrency ?? ''}`,
    () => endpoints.convertPrice(Number(t.prize_pool_current_amount), sourceCurrency),
    { enabled: shouldConvert },
  );
  const hasViewerConversion = shouldConvert
    && conversion.data?.currencyCode === viewerCurrency
    && Number.isFinite(Number(conversion.data.amount));
  const poolDisplay = shouldConvert
    ? hasViewerConversion
      ? fmtCurrencyAmount(conversion.data.amount, { symbol: conversion.data.currencySymbol, code: viewerCurrency })
      : conversion.error ? 'Conversion unavailable' : 'Converting…'
    : fmtCurrencyAmount(t.prize_pool_current_amount, t.prize_pool_currency);
  const countdownVisible = Boolean(t.starts_at)
    && t.tournament_status !== 'in_progress'
    && t.tournament_status !== 'completed'
    && t.tournament_status !== 'cancelled'
    && !countdown.done;
  return (
    <Surface onClick={() => router.push(`/tournaments/${t.documentId}`)} sx={{ p: 0 }}>
      <Box sx={{ height: 120, position: 'relative', background: `linear-gradient(135deg, ${AFRICA.green}, #003d1f 60%, ${AFRICA.red})` }}>
        {banner && <ClickableImage src={banner} alt={`${t.title} tournament banner`} sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
        <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(0deg,#0d1810,transparent 70%)' }} />
        <Chip size="small" color={STATUS_COLOR[t.tournament_status] || 'default'} label={label(t.tournament_status)} sx={{ position: 'absolute', top: 10, left: 10, maxWidth: '48%', borderTopLeftRadius: '22px', boxShadow: 6, '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }} />
        {t.has_prize_pool && <Chip size="small" color="secondary" label={`Prize pool ${poolDisplay}`} title={conversion.error && shouldConvert ? 'Local currency conversion is unavailable.' : undefined} sx={{ position: 'absolute', top: 10, right: 10, maxWidth: '48%', borderTopRightRadius: '22px', boxShadow: 6, '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }} />}
      </Box>
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ overflowWrap: 'anywhere' }}>{t.title}</Typography>
        <Typography variant="body2" color="text.secondary">{t.game?.name} · {t.country?.name || 'Pan-Africa'}</Typography>
        {countdownVisible && <Typography variant="body2" color={countdown.urgent ? 'warning.main' : 'secondary.main'} sx={{ mt: 1, fontVariantNumeric: 'tabular-nums' }}>Starts in {countdown.text}</Typography>}
        <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">Starts {fmtDate(t.starts_at)}</Typography>
          <Typography fontWeight={800} color={t.requires_entry_fee ? 'secondary.main' : 'primary.main'}>{t.requires_entry_fee ? `${fmtPlapo(t.entry_fee_plapo)} Plapo` : 'Free entry'}</Typography>
        </Box>
      </Box>
    </Surface>
  );
}
