'use client';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Box from '@mui/material/Box';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Paper from '@mui/material/Paper';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import GroupsIcon from '@mui/icons-material/Groups';
import StorefrontIcon from '@mui/icons-material/Storefront';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import HomeIcon from '@mui/icons-material/Home';
import RequireAuth from './RequireAuth';
import WalletChips from './WalletChips';

const tabs = [
  { href: '/', label: 'Home', icon: <HomeIcon /> },
  { href: '/play', label: 'Play', icon: <SportsSoccerIcon /> },
  { href: '/club', label: 'Club', icon: <GroupsIcon /> },
  { href: '/market', label: 'Market', icon: <StorefrontIcon /> },
  { href: '/leaderboard', label: 'Ranks', icon: <LeaderboardIcon /> },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const active = tabs.findIndex(t => (t.href === '/' ? path === '/' : path.startsWith(t.href)));
  return (
    <RequireAuth>
      <AppBar position="sticky" color="transparent" elevation={0} sx={{ backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Toolbar sx={{ justifyContent: 'space-between', pt: 'env(safe-area-inset-top)' }}>
          <Typography variant="subtitle1" fontWeight={800} letterSpacing={1}>PRO LEAGUE AFRICA</Typography>
          <WalletChips />
        </Toolbar>
      </AppBar>
      <Box component="main" sx={{ px: 2, pt: 2, pb: 12, maxWidth: 720, mx: 'auto' }}>{children}</Box>
      <Paper elevation={8} sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, pb: 'env(safe-area-inset-bottom)' }}>
        <BottomNavigation value={active < 0 ? false : active} showLabels>
          {tabs.map(t => <BottomNavigationAction key={t.href} component={Link} href={t.href} label={t.label} icon={t.icon} />)}
        </BottomNavigation>
      </Paper>
    </RequireAuth>
  );
}
