'use client';
import { Box, CircularProgress } from '@mui/material';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useSyncExternalStore } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useHaptics } from '@/hooks/useHaptics';
import { useSocketEvent } from '@/hooks/useSocket';
import { useToast } from '@/hooks/useToast';
import TopBar from './TopBar';
import BottomNav, { TABS } from './BottomNav';
import AppDownloadGate from './AppDownloadGate';
import { createDeviceHash, notifyReferralCodeChange, referralCodeFromUrl } from '@/lib/device';
import { endpoints } from '@/lib/api';

const subscribeClient = () => () => {};
const readClient = () => true;
const readServer = () => false;
const PUBLIC = ['/login'];
const TITLES = { '/': 'ProLeague Africa', '/tournaments': 'Tournaments', '/matches': 'My matches', '/wallet': 'Wallet', '/profile': 'Profile', '/leaderboard': 'Leaderboard' };
const titleFor = (p) => TITLES[p] || (p.startsWith('/tournaments/') ? 'Tournament' : p.startsWith('/matches/') ? 'Match room' : 'ProLeague Africa');

export default function AppShell({ children }) {
  const path = usePathname();
  const router = useRouter();
  const { user, ready, refresh } = useAuth();
  const toast = useToast();
  const clientReady = useSyncExternalStore(subscribeClient, readClient, readServer);
  const isWebView = clientReady && Boolean(window.ReactNativeWebView);
  useHaptics();
  const isPublic = PUBLIC.includes(path);
  const isOnboarding = path === '/onboarding';
  const isRoot = TABS.some((t) => t.href === path);

  useEffect(() => {
    const referralCode = referralCodeFromUrl();
    if (referralCode) {
      sessionStorage.setItem('pla_referral_code', referralCode);
      notifyReferralCodeChange();
    }

    createDeviceHash().then((deviceHash) => {
      if (referralCode) {
        endpoints.trackAffiliateImpression({ referral_code: referralCode, device_hash: deviceHash })
          .catch(() => {});
      }
      if (window.ReactNativeWebView) {
        endpoints.checkAffiliateImpression({ device_hash: deviceHash }).catch(() => {});
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!ready || !clientReady) return;
    if (!user && isWebView && !isPublic) router.replace('/login');
    else if (user && !user.has_completed_tutorial && !isOnboarding) router.replace('/onboarding');
    else if (user && isPublic) router.replace('/');
  }, [ready, clientReady, isWebView, user, isPublic, isOnboarding, router]);

  useSocketEvent('wallet:updated', () => { refresh(); });
  useSocketEvent('match:result_ready', () => toast('Match result is in'));

  if (!clientReady || !ready) return <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}><CircularProgress color="secondary" /></Box>;
  if (!user && !isWebView) return <AppDownloadGate />;
  if (isPublic || isOnboarding) return <>{children}</>;
  if (!user) return <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}><CircularProgress color="secondary" /></Box>;

  return (
    <>
      <TopBar title={titleFor(path)} showBack={!isRoot} />
      <Box component="main" sx={{ maxWidth: 640, mx: 'auto', px: 2, pt: 'calc(env(safe-area-inset-top) + 76px)', pb: 'calc(env(safe-area-inset-bottom) + 112px)', minHeight: '100dvh' }}>{children}</Box>
      <BottomNav />
    </>
  );
}
