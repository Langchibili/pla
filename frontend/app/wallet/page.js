'use client';
import { Box, Button, Typography, TextField } from '@mui/material';
import { useState } from 'react';
import { endpoints } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import { useSocketEvent } from '@/hooks/useSocket';
import { useToast } from '@/hooks/useToast';
import { fmtDate, fmtPlapo, label } from '@/lib/format';
import Surface from '@/components/Surface';
import ActionSheet from '@/components/ActionSheet';
import SkeletonList from '@/components/SkeletonList';
import { AFRICA } from '@/lib/theme';

const STORE = process.env.NEXT_PUBLIC_STORE_URL || 'https://store.proleagueafrica.com';
export default function Wallet() {
  const { user, refresh } = useAuth(); const toast = useToast();
  const { data, loading, reload } = useApi('wallet', endpoints.wallet);
  useSocketEvent('wallet:updated', () => { reload(); refresh(); });
  const [open, setOpen] = useState(false); const [to, setTo] = useState(''); const [amt, setAmt] = useState('');
  const send = async () => { try { await endpoints.transfer({ to, amount: Number(amt) }); toast('Plapo sent'); setOpen(false); reload(); refresh(); } catch (e) { toast(e.message, 'error'); } };
  return (
    <Box sx={{ display: 'grid', gap: 2.5 }}>
      <Surface sx={{ p: 3, background: 'linear-gradient(145deg,#3a2800,#0d1810 75%)' }}>
        <Typography variant="caption" color="text.secondary">Spendable Plapo</Typography>
        <Typography variant="h2" color="secondary.main">{fmtPlapo(user.spendable_balance)}</Typography>
        <Typography variant="body2" color="text.secondary">Transferable: {fmtPlapo(user.transferable_balance)}</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mt: 2.5 }}>
          <Button variant="contained" color="secondary" href={`${STORE}?token=handoff`}>Buy Plapo</Button>
          <Button variant="outlined" color="secondary" disabled={!user.transferable_balance} onClick={() => setOpen(true)}>Send</Button>
        </Box>
      </Surface>
      <Typography variant="h6">History</Typography>
      {loading ? <SkeletonList count={4} height={64} /> : (data?.ledger || []).map((l) => (
        <Surface key={l.documentId} accent={l.amount >= 0 ? AFRICA.green : AFRICA.red} sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box><Typography fontWeight={800}>{label(l.ledger_type)}</Typography><Typography variant="caption" color="text.secondary">{fmtDate(l.createdAt)} · {label(l.plapo_source)}</Typography></Box>
          <Typography fontWeight={900} color={l.amount >= 0 ? 'primary.main' : 'error.main'}>{l.amount > 0 ? '+' : ''}{fmtPlapo(l.amount)}</Typography>
        </Surface>))}
      <ActionSheet open={open} onClose={() => setOpen(false)} title="Send Plapo">
        <TextField label="Username or referral code" value={to} onChange={(e) => setTo(e.target.value)} sx={{ mb: 2 }} />
        <TextField type="number" label="Amount" value={amt} onChange={(e) => setAmt(e.target.value)} helperText={`Up to ${fmtPlapo(user.transferable_balance)}`} sx={{ mb: 2 }} />
        <Button fullWidth variant="contained" color="secondary" disabled={!to || !(Number(amt) > 0) || Number(amt) > user.transferable_balance} onClick={send}>Send</Button>
      </ActionSheet>
    </Box>
  );
}
