'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import GroupsIcon from '@mui/icons-material/Groups';
import StorefrontIcon from '@mui/icons-material/Storefront';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import HomeIcon from '@mui/icons-material/Home';
import RequireAuth from './RequireAuth';
import WalletChips from './WalletChips';
import { useAuth } from '@/lib/auth';

const tabs = [
    { href: '/', label: 'Home', icon: <HomeIcon /> },
    { href: '/play', label: 'Play', icon: <SportsSoccerIcon /> },
    { href: '/club', label: 'Club', icon: <GroupsIcon /> },
    { href: '/market', label: 'Market', icon: <StorefrontIcon /> },
    { href: '/leaderboard', label: 'Ranks', icon: <LeaderboardIcon /> },
];

export default function AppShell({ children }) {
    const path = usePathname();
    const { loadError } = useAuth();
    const active = tabs.findIndex(tab => (tab.href === '/' ? path === '/' : path.startsWith(tab.href)));

    return (
        <RequireAuth>
            <AppBar
                position="sticky"
                color="transparent"
                elevation={0}
                sx={{ bgcolor: 'rgba(7,17,11,0.86)', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(244,203,52,0.14)' }}
            >
                <Toolbar sx={{ justifyContent: 'space-between', pt: 'env(safe-area-inset-top)', minHeight: { xs: 62, sm: 68 } }}>
                    <Stack direction="row" alignItems="center" spacing={1.1}>
                        <Box sx={{ width: 34, height: 34, display: 'grid', placeItems: 'center', borderRadius: 2, color: '#07110b', bgcolor: '#f4cb34', boxShadow: '0 3px 12px rgba(244,203,52,0.22)' }}>
                            <SportsSoccerIcon sx={{ fontSize: 21 }} />
                        </Box>
                        <Box>
                            <Typography variant="subtitle2" fontWeight={950} letterSpacing={1.1} lineHeight={1.1}>
                                PRO LEAGUE AFRICA
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 9, letterSpacing: 1.1 }}>
                                CLUB OWNERS
                            </Typography>
                        </Box>
                    </Stack>
                    <WalletChips />
                </Toolbar>
            </AppBar>
            <Box component="main" sx={{ px: { xs: 1.5, sm: 2 }, pt: { xs: 1.5, sm: 2.5 }, pb: 'calc(88px + env(safe-area-inset-bottom))', maxWidth: 760, mx: 'auto' }}>
                {loadError && <Alert severity="error" sx={{ mb: 2 }}>{loadError}</Alert>}
                {children}
            </Box>
            <Paper
                elevation={8}
                sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, pb: 'env(safe-area-inset-bottom)', bgcolor: 'rgba(7,17,11,0.96)', borderTop: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(14px)' }}
            >
                <BottomNavigation value={active < 0 ? false : active} showLabels sx={{
                    bgcolor: 'transparent',
                    '& .MuiBottomNavigationAction-root': { color: 'rgba(234,245,238,0.52)', minWidth: 52, pt: 1 },
                    '& .MuiBottomNavigationAction-root.Mui-selected': { color: '#f4cb34' },
                    '& .MuiBottomNavigationAction-label': { fontSize: 10, fontWeight: 700 },
                    '& .MuiBottomNavigationAction-label.Mui-selected': { fontSize: 10 },
                }}>
                    {tabs.map(tab => (
                        <BottomNavigationAction
                            key={tab.href}
                            component={Link}
                            href={tab.href}
                            label={tab.label}
                            icon={tab.icon}
                        />
                    ))}
                </BottomNavigation>
            </Paper>
        </RequireAuth>
    );
}
