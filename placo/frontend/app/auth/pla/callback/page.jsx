'use client';

import { useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { useAuth } from '@/lib/auth';

function localReturnTo() {
    const value = new URLSearchParams(window.location.search).get('returnTo');
    if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
        return '/';
    }
    const target = new URL(value, window.location.origin);
    return target.origin === window.location.origin ? `${target.pathname}${target.search}` : '/';
}

export default function PlaCallbackPage() {
    const { ready, token, plaExchangeComplete, logout } = useAuth();
    const [error, setError] = useState('');

    useEffect(() => {
        if (!ready) return;
        if (!token || !plaExchangeComplete) {
            logout();
            window.location.replace('/logout');
            return;
        }

        let active = true;
        fetch('/api/auth/pla/check-complete', { method: 'POST', credentials: 'same-origin' })
            .then(response => {
                if (!response.ok) throw new Error('Could not finish verifying your PLA session.');
                if (active) window.location.replace(localReturnTo());
            })
            .catch(caught => {
                if (active) setError(caught instanceof Error ? caught.message : 'Could not verify your PLA session.');
            });
        return () => { active = false; };
    }, [ready, token, plaExchangeComplete, logout]);

    return (
        <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', px: 3, textAlign: 'center' }}>
            <Stack spacing={2} alignItems="center" sx={{ maxWidth: 480 }}>
                {error
                    ? <Alert severity="error">{error}</Alert>
                    : <CircularProgress />}
                <Typography color="text.secondary">
                    {error ? 'Your session has not been verified. Please retry.' : 'Verifying your PLA session…'}
                </Typography>
                {error && <Button variant="contained" onClick={() => window.location.reload()}>Retry</Button>}
            </Stack>
        </Box>
    );
}
