'use client';

import { useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { useAuth } from '@/hooks/useAuth';
import { placoHandoffUrl, tokenStore } from '@/lib/api';

function placoLogoutUrl() {
  const configured = process.env.NEXT_PUBLIC_PLACO_FRONTEND_URL || 'http://localhost:3013';
  const base = new URL(configured);
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password) {
    throw new Error('The PLACO address is not configured correctly.');
  }
  return new URL('/logout', base.origin).toString();
}

export default function CheckLoginStatusPage() {
  const { ready, user, authCheckError, refresh } = useAuth();
  const [error, setError] = useState('');
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (!ready || retrying) return;
    if (authCheckError) return;
    Promise.resolve().then(() => {
      if (new URLSearchParams(window.location.search).get('redirectTo') !== 'placo') {
        window.location.replace('/login');
        return;
      }

      try {
        const returnTo = new URLSearchParams(window.location.search).get('returnTo') || '/';
        window.location.replace(tokenStore.get() && user ? placoHandoffUrl(returnTo) : placoLogoutUrl());
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Could not continue to PLACO.');
      }
    });
  }, [ready, user, authCheckError, refresh, retrying]);

  const displayedError = error || authCheckError;
  return (
    <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', px: 3, textAlign: 'center' }}>
      {displayedError
        ? <Stack spacing={2} alignItems="center" sx={{ maxWidth: 480 }}>
          <Alert severity="error">{displayedError}</Alert>
          <Button variant="contained" onClick={() => {
            setError('');
            setRetrying(true);
            void refresh().finally(() => setRetrying(false));
          }}>Retry PLA session check</Button>
        </Stack>
        : <Box><CircularProgress color="secondary" /><Typography sx={{ mt: 2 }}>Checking your PLA sign-in…</Typography></Box>}
    </Box>
  );
}
