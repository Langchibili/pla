'use client';
import { Box, Typography } from '@mui/material';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import SportsEsportsRoundedIcon from '@mui/icons-material/SportsEsportsRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { haptic } from '@/lib/haptics';
import { AFRICA } from '@/lib/theme';

export const TABS = [
  { href: '/', label: 'Home', Icon: HomeRoundedIcon },
  { href: '/tournaments', label: 'Play', Icon: EmojiEventsRoundedIcon },
  { href: '/matches', label: 'Matches', Icon: SportsEsportsRoundedIcon },
  { href: '/wallet', label: 'Wallet', Icon: AccountBalanceWalletRoundedIcon },
  { href: '/profile', label: 'Me', Icon: PersonRoundedIcon },
];
const active = (p, h) => (h === '/' ? p === '/' : p.startsWith(h));

export default function BottomNav() {
  const path = usePathname();
  return (
    <Box component="nav" sx={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 1300, px: 1.5, pb: 'calc(env(safe-area-inset-bottom) + 10px)', pointerEvents: 'none' }}>
      <Box sx={{ pointerEvents: 'auto', maxWidth: 520, mx: 'auto', display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', p: 0.8, borderRadius: 8, backdropFilter: 'blur(26px) saturate(170%)',
        background: 'linear-gradient(180deg, rgba(24,40,28,.92), rgba(10,18,12,.96))', border: `1px solid ${AFRICA.line}`, boxShadow: '0 -4px 0 rgba(0,0,0,.2), 0 24px 48px rgba(0,0,0,.75), 0 8px 16px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.08)' }}>
        {TABS.map(({ href, label, Icon }) => {
          const on = active(path, href);
          return (
            <Box key={href} component={Link} href={href} prefetch onClick={() => haptic('select')} aria-current={on ? 'page' : undefined}
              sx={{ position: 'relative', textDecoration: 'none', color: on ? '#1a1200' : 'text.secondary', py: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.2, borderRadius: 6, WebkitTapHighlightColor: 'transparent' }}>
              {on && <Box component={motion.div} layoutId="nav-pill" transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                sx={{ position: 'absolute', inset: 0, borderRadius: 6, background: `linear-gradient(135deg, ${AFRICA.gold}, #E39A00)`, boxShadow: '0 10px 22px rgba(253,185,19,.4), inset 0 1px 0 rgba(255,255,255,.5)' }} />}
              <motion.div style={{ position: 'relative', display: 'grid' }} animate={{ y: on ? -1 : 0, scale: on ? 1.12 : 1 }} whileTap={{ scale: 0.82 }} transition={{ type: 'spring', stiffness: 500, damping: 20 }}><Icon /></motion.div>
              <Typography variant="caption" sx={{ position: 'relative', fontWeight: 800, fontSize: 10.5, lineHeight: 1 }}>{label}</Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
