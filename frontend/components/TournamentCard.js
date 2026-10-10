'use client';
import { useEffect, useState } from 'react';
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
  const isPlapoPrize = t.prize_type === 'plapo';
  const hasPrize = t.has_prize_pool && t.prize_type !== 'no-prize';
  const shouldConvert = Boolean(hasPrize && !isPlapoPrize && sourceCurrency && viewerCurrency && sourceCurrency !== viewerCurrency);
  const conversion = useApi(
    `pool-${t.documentId}-${t.prize_pool_current_amount ?? ''}-${sourceCurrency ?? ''}-${viewerCurrency ?? ''}`,
    () => endpoints.convertPrice(Number(t.prize_pool_current_amount), sourceCurrency),
    { enabled: shouldConvert },
  );
  const hasViewerConversion = shouldConvert
    && conversion.data?.currencyCode === viewerCurrency
    && Number.isFinite(Number(conversion.data.amount));
  const poolDisplay = !hasPrize
    ? 'No prize'
    : isPlapoPrize
      ? `${fmtPlapo(t.prize_pool_current_amount)} Plapo`
      : shouldConvert
    ? hasViewerConversion
      ? fmtCurrencyAmount(conversion.data.amount, { symbol: conversion.data.currencySymbol, code: viewerCurrency })
      : conversion.error ? 'Conversion unavailable' : 'Converting…'
    : fmtCurrencyAmount(t.prize_pool_current_amount, t.prize_pool_currency);
  const prizeDistribution = (t.prize_distribution || []).filter((prize) =>
    Number.isInteger(Number(prize.place)) && Number(prize.place) > 0
    && Number.isFinite(Number(prize.percent)) && Number(prize.percent) > 0);
  const [prizeIndex, setPrizeIndex] = useState(0);
  useEffect(() => {
    if (prizeDistribution.length < 2) return undefined;
    const timer = setInterval(() => {
      setPrizeIndex((index) => (index + 1) % prizeDistribution.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [prizeDistribution.length]);
  const poolAmount = hasViewerConversion
    ? Number(conversion.data.amount)
    : Number(t.prize_pool_current_amount);
  const selectedPrize = prizeDistribution[prizeIndex];
  const distributionAmount = selectedPrize
    ? poolAmount * Number(selectedPrize.percent) / 100
    : null;
  const distributionCurrency = hasViewerConversion
    ? { symbol: conversion.data.currencySymbol, code: viewerCurrency }
    : t.prize_pool_currency;
  const place = Number(selectedPrize?.place);
  const placeLabel = place === 1 ? '1st' : place === 2 ? '2nd' : place === 3 ? '3rd' : `${place}th`;
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
        {hasPrize && <Chip size="small" color="secondary" label={`PRICE POOL: ${poolDisplay}`} title={conversion.error && shouldConvert ? 'Local currency conversion is unavailable.' : undefined} sx={{ position: 'absolute', top: 10, right: 10, maxWidth: '58%', borderTopRightRadius: '22px', boxShadow: 6, '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }} />}
      </Box>
      <Box sx={{ p: 2 }}>
        {hasPrize && prizeDistribution.length > 0 && (
          <Box
            aria-label="Prize distribution"
            sx={{
              mb: 1.25,
              p: 1.1,
              borderRadius: 2,
              bgcolor: 'rgba(227, 163, 0, 0.1)',
              border: '1px solid',
              borderColor: 'rgba(227, 163, 0, 0.28)',
            }}
          >
            <Typography
              key={prizeIndex}
              aria-live="polite"
              variant="body2"
              fontWeight={800}
              sx={{ textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}
            >
              {shouldConvert && !hasViewerConversion
                ? `PRICE DISTRIBUTION · ${placeLabel} place`
                : `${placeLabel} place: ${isPlapoPrize
                  ? `${fmtPlapo(Math.round(distributionAmount))} Plapo`
                  : fmtCurrencyAmount(distributionAmount, distributionCurrency)}`}
            </Typography>
            {prizeDistribution.length > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.65, mt: 0.8 }}>
                {prizeDistribution.map((prize, index) => {
                  const label = Number(prize.place) === 1
                    ? '1st'
                    : Number(prize.place) === 2
                      ? '2nd'
                      : Number(prize.place) === 3
                        ? '3rd'
                        : `${prize.place}th`;
                  return (
                    <Box
                      key={prize.place}
                      component="button"
                      type="button"
                      aria-label={`Show ${label} place prize`}
                      aria-current={index === prizeIndex ? 'true' : undefined}
                      onClick={(event) => {
                        event.stopPropagation();
                        setPrizeIndex(index);
                      }}
                      sx={{
                        width: index === prizeIndex ? 16 : 6,
                        height: 6,
                        p: 0,
                        border: 0,
                        borderRadius: 4,
                        bgcolor: index === prizeIndex ? 'secondary.main' : 'text.disabled',
                        cursor: 'pointer',
                      }}
                    />
                  );
                })}
              </Box>
            )}
          </Box>
        )}
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
