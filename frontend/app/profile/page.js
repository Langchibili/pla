'use client';
import { Avatar, Box, Button, Switch, Typography } from '@mui/material';
import { useState } from 'react';
import { endpoints } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { haptic, setHapticsEnabled } from '@/lib/haptics';
import Surface from '@/components/Surface';
import KenteStripe from '@/components/KenteStripe';

export default function Profile() {
  const { user, signOut } = useAuth(); const toast = useToast();
  const { data: refs } = useApi('refs', endpoints.referrals);
  const [hap, setHap] = useState(() => (typeof localStorage === 'undefined' ? true : localStorage.getItem('pla_haptics') !== '0'));
  const link = typeof location !== 'undefined' ? `${location.origin}/login?ref=${user.referral_code}` : '';
  const share = async () => { haptic('success'); try { navigator.share ? await navigator.share({ title: 'ProLeague Africa', url: link }) : (await navigator.clipboard.writeText(link), toast('Link copied')); } catch {} };
  return (
    <Box sx={{ display: 'grid', gap: 2.5 }}>
      <Surface sx={{ p: 3, textAlign: 'center' }}>
        <Avatar sx={{ width: 76, height: 76, mx: 'auto', mb: 1.5, fontSize: 32, fontWeight: 900, bgcolor: 'secondary.main', color: '#1a1200', boxShadow: 12 }}>{user.username?.[0]?.toUpperCase()}</Avatar>
        <Typography variant="h5">{user.username}</Typography>
        <Typography color="text.secondary">{user.country?.name || 'No country set'}</Typography>
        <KenteStripe sx={{ mt: 2, mx: 'auto', width: 90 }} />
      </Surface>
      <Surface>
        <Typography variant="h6">Invite friends</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>Earn Plapo when a friend joins their first tournament. {refs ? `${refs.rewarded ?? 0} rewarded · ${refs.pending ?? 0} pending` : ''}</Typography>
        <Typography variant="h5" sx={{ letterSpacing: 3, mb: 1.5 }}>{user.referral_code || '—'}</Typography>
        <Button fullWidth variant="contained" color="secondary" onClick={share}>Share invite link</Button>
      </Surface>
      <Surface sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box><Typography fontWeight={800}>Haptic feedback</Typography><Typography variant="caption" color="text.secondary">Vibrate on taps and results</Typography></Box>
        <Switch color="secondary" checked={hap} onChange={(e) => { setHap(e.target.checked); setHapticsEnabled(e.target.checked); haptic('success'); }} />
      </Surface>
      <Button color="error" variant="outlined" onClick={() => { haptic('warning'); signOut(); }}>Sign out</Button>
    </Box>
  );
}
