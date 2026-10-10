'use client';
import { Avatar, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Switch, Typography } from '@mui/material';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import FacebookRoundedIcon from '@mui/icons-material/FacebookRounded';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { useState } from 'react';
import { endpoints } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { haptic, setHapticsEnabled } from '@/lib/haptics';
import { useConfirm } from '@/hooks/useConfirm';
import Surface from '@/components/Surface';
import KenteStripe from '@/components/KenteStripe';

export default function Profile() {
  const { user, signOut } = useAuth(); const toast = useToast();
  const confirm = useConfirm();
  const { data: refs } = useApi('refs', endpoints.referrals);
  const [shareOpen, setShareOpen] = useState(false);
  const [hap, setHap] = useState(() => (typeof localStorage === 'undefined' ? true : localStorage.getItem('pla_haptics') !== '0'));
  const shareText = 'Earn money playing your favorite games and tournaments with me.';
  const link = typeof location !== 'undefined' && user.referral_code
    ? `${location.origin}/login?ref=${encodeURIComponent(user.referral_code)}`
    : '';
  const share = () => {
    if (!link) {
      toast('Your invite link is not available yet', 'error');
      return;
    }
    setShareOpen(true);
  };
  const shareToWhatsApp = () => {
    const message = `${shareText}\n${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    setShareOpen(false);
    haptic('success');
  };
  const shareToFacebook = () => {
    const url = new URL('https://www.facebook.com/sharer/sharer.php');
    url.searchParams.set('u', link);
    url.searchParams.set('quote', shareText);
    window.open(url.toString(), '_blank', 'noopener,noreferrer');
    setShareOpen(false);
    haptic('success');
  };
  const copyLink = async () => {
    if (!link) {
      toast('Your invite link is not available yet', 'error');
      return;
    }
    try {
      await navigator.clipboard.writeText(link);
      toast('Invite link copied');
    } catch (error) {
      console.error('Could not copy the referral link', error);
      toast('Could not copy the invite link', 'error');
    }
  };
  const confirmSignOut = async () => {
    const accepted = await confirm({
      title: 'Sign out?',
      message: 'You can sign back in anytime with your email.',
      confirmText: 'Sign out',
      destructive: true,
    });
    if (accepted) { haptic('warning'); signOut(); }
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
        <Button fullWidth variant="contained" color="secondary" onClick={share} disabled={!user.referral_code}>Share</Button>
        <Button fullWidth variant="outlined" startIcon={<ContentCopyRoundedIcon />} onClick={copyLink} disabled={!user.referral_code} sx={{ mt: 1 }}>Copy link</Button>
      </Surface>
      <Dialog open={shareOpen} onClose={() => setShareOpen(false)} fullWidth maxWidth="xs" aria-labelledby="invite-share-title">
        <DialogTitle id="invite-share-title">Share your invite</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 1.5 }}>{shareText}</Typography>
          <Typography
            component="a"
            href={link}
            color="secondary.main"
            sx={{ overflowWrap: 'anywhere' }}
          >
            {link}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, display: 'grid', gap: 1 }}>
          <Button fullWidth variant="contained" color="success" startIcon={<WhatsAppIcon />} onClick={shareToWhatsApp}>
            Share to WhatsApp
          </Button>
          <Button fullWidth variant="contained" startIcon={<FacebookRoundedIcon />} onClick={shareToFacebook}>
            Share to Facebook
          </Button>
          <Button fullWidth onClick={() => setShareOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
      <Surface sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box><Typography fontWeight={800}>Haptic feedback</Typography><Typography variant="caption" color="text.secondary">Vibrate on taps and results</Typography></Box>
        <Switch color="secondary" checked={hap} onChange={(e) => { setHap(e.target.checked); setHapticsEnabled(e.target.checked); haptic('success'); }} />
      </Surface>
      <Button color="error" variant="outlined" onClick={confirmSignOut}>Sign out</Button>
    </Box>
  );
}
