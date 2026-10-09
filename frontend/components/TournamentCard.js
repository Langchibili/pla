'use client';
import { Box, Chip, Typography } from '@mui/material';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Surface from './Surface';
import { mediaUrl } from '@/lib/api';
import { fmtDate, fmtMoney, fmtPlapo, label, STATUS_COLOR } from '@/lib/format';
import { AFRICA } from '@/lib/theme';

export default function TournamentCard({ t }) {
  const router = useRouter();
  const banner = mediaUrl(t.banner);
  return (
    <Surface onClick={() => router.push(`/tournaments/${t.documentId}`)} sx={{ p: 0 }}>
      <Box sx={{ height: 120, position: 'relative', background: `linear-gradient(135deg, ${AFRICA.green}, #003d1f 60%, ${AFRICA.red})` }}>
        {banner && <Image src={banner} alt="" fill sizes="640px" style={{ objectFit: 'cover' }} unoptimized />}
        <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg,#0d1810,transparent 70%)' }} />
        <Chip size="small" color={STATUS_COLOR[t.tournament_status] || 'default'} label={label(t.tournament_status)} sx={{ position: 'absolute', top: 10, left: 10, maxWidth: '48%', borderTopLeftRadius: '22px', boxShadow: 6, '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }} />
        {t.has_prize_pool && <Chip size="small" color="secondary" label={`Pool ${fmtMoney(t.prize_pool_current_amount, t.prize_pool_currency?.code)}`} sx={{ position: 'absolute', top: 10, right: 10, maxWidth: '48%', borderTopRightRadius: '22px', boxShadow: 6, '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }} />}
      </Box>
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ overflowWrap: 'anywhere' }}>{t.title}</Typography>
        <Typography variant="body2" color="text.secondary">{t.game?.name} · {t.country?.name || 'Pan-Africa'}</Typography>
        <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">Starts {fmtDate(t.starts_at)}</Typography>
          <Typography fontWeight={800} color={t.requires_entry_fee ? 'secondary.main' : 'primary.main'}>{t.requires_entry_fee ? `${fmtPlapo(t.entry_fee_plapo)} Plapo` : 'Free entry'}</Typography>
        </Box>
      </Box>
    </Surface>
  );
}
