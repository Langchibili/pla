'use client';
import { Box, CircularProgress } from '@mui/material';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useHaptics } from '@/hooks/useHaptics';
import { useSocketEvent } from '@/hooks/useSocket';
import { useToast } from '@/hooks/useToast';
import { haptic } from '@/lib/haptics';
import TopBar from './TopBar';
import BottomNav, { TABS } from './BottomNav';
import AppDownloadGate from './AppDownloadGate';
import { createDeviceHash, notifyReferralCodeChange, referralCodeFromUrl } from '@/lib/device';
import { endpoints, tokenStore } from '@/lib/api';

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
  const [frontendMode, setFrontendMode] = useState(null);
  const touchStart = useRef(null);
  const nativeUserId = user?.id;
  const toast = useToast();
  const clientReady = useSyncExternalStore(subscribeClient, readClient, readServer);
  const isWebView = clientReady && Boolean(window.ReactNativeWebView);
  useHaptics();
  const isPublic = PUBLIC.includes(path);
  const isOnboarding = path === '/onboarding';
  const isRoot = TABS.some((t) => t.href === path);
  const activeTabIndex = TABS.findIndex(({ href }) => (href === '/' ? path === '/' : path.startsWith(href)));

  const handleTouchStart = (event) => {
    if (event.touches.length !== 1 || activeTabIndex < 0) {
      touchStart.current = null;
      return;
    }
    const target = event.target;
    if (target instanceof Element && target.closest('a, button, input, textarea, select, [role="tab"], [data-no-tab-swipe], .MuiDrawer-root')) {
      touchStart.current = null;
      return;
    }
    for (let node = target instanceof Element ? target : null; node && node !== event.currentTarget; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (node.scrollWidth > node.clientWidth + 4 && ['auto', 'scroll'].includes(style.overflowX)) {
        touchStart.current = null;
        return;
      }
    }
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY, tab: activeTabIndex };
  };

  const handleTouchEnd = (event) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || !event.changedTouches.length) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.3) return;
    const nextTab = start.tab + (dx < 0 ? 1 : -1);
    if (nextTab < 0 || nextTab >= TABS.length) return;
    haptic('select');
    router.push(TABS[nextTab].href);
  };

  useEffect(() => {
    let active = true;
    endpoints.frontendMode()
      .then((mode) => {
        if (active) setFrontendMode(mode);
      })
      .catch((error) => {
        console.error('Unable to load frontend mode; using native mode', error);
        if (active) setFrontendMode('native');
      });
    return () => { active = false; };
  }, []);

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
    if (!ready || !clientReady || !frontendMode) return;
    if (!user && (isWebView || frontendMode === 'web') && !isPublic) router.replace('/login');
    else if (user && !user.has_completed_tutorial && !isOnboarding) router.replace('/onboarding');
    else if (user && isPublic) router.replace('/');
  }, [ready, clientReady, frontendMode, isWebView, user, isPublic, isOnboarding, router]);

  useEffect(() => {
    if (!ready || !window.ReactNativeWebView) return;
    if (!nativeUserId) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DISCONNECT_SOCKET' }));
      return;
    }

    const authToken = tokenStore.get();
    if (authToken) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'INITIALIZE_SERVICES',
        payload: { userId: nativeUserId, authToken },
      }));
    }
  }, [ready, nativeUserId]);

  useEffect(() => {
    const handleNativeMessage = (event) => {
      const message = event.detail;
      if (message?.type === 'NOTIFICATION_TAPPED') {
        const route = message.payload?.route;
        if (message.payload?.notificationId) {
          endpoints.readNotification(message.payload.notificationId).catch((error) => {
            console.error('Unable to mark the tapped notification as read', error);
          });
          window.dispatchEvent(new CustomEvent('pla:notification-updated'));
        }
        if (typeof route === 'string' && route.startsWith('/') && !route.startsWith('//')) {
          router.push(route);
        }
      } else if ([
        'notification:new',
        'notification:broadcast',
        'system:announcement',
        'NOTIFICATION_RECEIVED',
      ].includes(message?.type)) {
        window.dispatchEvent(new CustomEvent('pla:notification-updated'));
        const notification = message.payload;
        if (typeof notification?.body === 'string') {
          toast(notification.body);
        }
      }
    };
    window.addEventListener('pla:native-message', handleNativeMessage);
    return () => window.removeEventListener('pla:native-message', handleNativeMessage);
  }, [router, toast]);

  const handleSocketNotification = useCallback((notification) => {
    window.dispatchEvent(new CustomEvent('pla:notification-updated'));
    if (typeof notification?.body === 'string') toast(notification.body);
  }, [toast]);
  useSocketEvent('notification:new', handleSocketNotification);
  useSocketEvent('notification:broadcast', handleSocketNotification);
  useSocketEvent('system:announcement', handleSocketNotification);

  useSocketEvent('wallet:updated', () => { refresh(); });
  useSocketEvent('match:result_ready', () => toast('Match result is in'));

  if (!clientReady || !ready || !frontendMode) return <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}><CircularProgress color="secondary" /></Box>;
  if (!user && !isWebView && frontendMode === 'native') return <AppDownloadGate />;
  if (isPublic || isOnboarding) return <>{children}</>;
  if (!user) return <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}><CircularProgress color="secondary" /></Box>;

  return (
    <>
      <TopBar title={titleFor(path)} showBack={!isRoot} />
      <Box component="main" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} sx={{ maxWidth: 640, mx: 'auto', px: 2, pt: 'calc(env(safe-area-inset-top) + 76px)', pb: 'calc(env(safe-area-inset-bottom) + 112px)', minHeight: '100dvh' }}>{children}</Box>
      <BottomNav />
    </>
  );
}
