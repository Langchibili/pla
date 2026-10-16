'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { useAuth } from '@/lib/auth';

export default function RequireAuth({ children, allowNoProfile = false }) {
    const { ready, token, profile, needsOnboarding, loadError, refresh } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!ready)
            return;
        if (!token)
            router.replace('/login');
        else if (needsOnboarding && !allowNoProfile)
            router.replace('/onboarding');
    }, [ready, token, needsOnboarding, allowNoProfile, router]);

    if (!ready || !token || (!profile && !allowNoProfile && !loadError))
        return (
            <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
                <CircularProgress />
            </Box>
        );

    if (loadError && !profile)
        return (
            <Stack spacing={2} sx={{ maxWidth: 480, mx: 'auto', mt: 8, p: 2 }}>
                <Alert severity="error">{loadError}</Alert>
                <Button variant="contained" onClick={() => { void refresh(); }}>Retry</Button>
            </Stack>
        );

    return children;
}
