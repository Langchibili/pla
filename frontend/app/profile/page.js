'use client';
import { Avatar, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Switch, Typography } from '@mui/material';
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
  const [shareOpen, setShareOpen] = useState(false);
  const [hap, setHap] = useState(() => (typeof localStorage === 'undefined' ? true : localStorage.getItem('pla_haptics') !== '0'));
  const link = typeof location !== 'undefined' && user.referral_code
    ? `${location.origin}/login?ref=${encodeURIComponent(user.referral_code)}`
    : '';
  const copyLink = async () => {
    try {
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard access is unavailable');
        await navigator.clipboard.writeText(link);
      } catch {
        const input = document.createElement('textarea');
        input.value = link;
        input.setAttribute('readonly', '');
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        let copied = false;
        try {
          input.select();
          copied = document.execCommand('copy');
        } finally {
          input.remove();
        }
        if (!copied) throw new Error('Could not copy the invite link');
      }
      haptic('success');
      toast('Invite link copied');
      setShareOpen(false);
    } catch {
      toast('Unable to copy the invite link. Please try again.', 'error');
    }
  };
  const share = async () => {
    if (!link) {
      toast('Your invite link is not available yet', 'error');
      return;
    }
    if (navigator.share) {
      try {
        await navigator.share({ title: 'ProLeague Africa', text: 'Join me on ProLeague Africa', url: link });
        haptic('success');
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return;
      }
    }
    setShareOpen(true);
  };
  const shareVia = (destination) => {
    const message = `Join me on ProLeague Africa: ${link}`;
    const destinations = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(message)}`,
      email: `mailto:?subject=${encodeURIComponent('Join me on ProLeague Africa')}&body=${encodeURIComponent(message)}`,
      sms: `sms:?body=${encodeURIComponent(message)}`,
    };
    window.open(destinations[destination], '_blank', 'noopener,noreferrer');
    setShareOpen(false);
  };
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
        <Button fullWidth variant="contained" color="secondary" onClick={share} disabled={!user.referral_code}>Share invite link</Button>
        <Button fullWidth variant="text" color="secondary" onClick={copyLink} disabled={!user.referral_code} sx={{ mt: 0.5 }}>Copy link</Button>
      </Surface>
      <Dialog open={shareOpen} onClose={() => setShareOpen(false)} fullWidth maxWidth="xs" aria-labelledby="share-invite-title">
        <DialogTitle id="share-invite-title">Share your invite link</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">Choose how you want to share your invite.</Typography>
          <Typography component="div" variant="body2" sx={{ mt: 1.5, p: 1.25, borderRadius: 2, bgcolor: 'action.hover', overflowWrap: 'anywhere' }}>{link}</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, display: 'grid', gap: 1 }}>
          <Button fullWidth variant="contained" color="secondary" onClick={() => shareVia('whatsapp')}>Share with WhatsApp</Button>
          <Button fullWidth variant="outlined" color="secondary" onClick={() => shareVia('email')}>Share by email</Button>
          <Button fullWidth variant="outlined" color="secondary" onClick={() => shareVia('sms')}>Share by text message</Button>
          <Button fullWidth onClick={copyLink}>Copy link</Button>
        </DialogActions>
      </Dialog>
      <Surface sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box><Typography fontWeight={800}>Haptic feedback</Typography><Typography variant="caption" color="text.secondary">Vibrate on taps and results</Typography></Box>
        <Switch color="secondary" checked={hap} onChange={(e) => { setHap(e.target.checked); setHapticsEnabled(e.target.checked); haptic('success'); }} />
      </Surface>
      <Button color="error" variant="outlined" onClick={() => { haptic('warning'); signOut(); }}>Sign out</Button>
    </Box>
  );
}
