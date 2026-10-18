'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { Box, Button, Stack, Typography } from '@mui/material';
import Link from 'next/link';

export default function LogoutPage() {
    const { logout } = useAuth();

    useEffect(() => {
        logout();
    }, [logout]);

    return (
        <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', px: 3 }}>
            <Stack spacing={2} alignItems="center" textAlign="center">
                <Typography variant="h4" fontWeight={850}>You are signed out</Typography>
                <Typography color="text.secondary">
                    Your PLACO session has been cleared because your PLA session is no longer active.
                </Typography>
                <Button component={Link} href="/login" variant="contained">
                    Continue to sign in
                </Button>
            </Stack>
        </Box>
    );
}
