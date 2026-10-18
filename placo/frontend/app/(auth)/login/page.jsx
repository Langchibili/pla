'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { useAuth } from '@/lib/auth';

function plaAuthUrl(mode) {
    const base = process.env.NEXT_PUBLIC_PLA_FRONTEND_URL?.trim();
    if (!base) return null;

    const target = new URL('/login', base);
    target.searchParams.set('redirectTo', 'placo');
    target.searchParams.set('mode', mode);
    return target.toString();
}

function plaCheckUrl() {
    const base = process.env.NEXT_PUBLIC_PLA_FRONTEND_URL?.trim();
    if (!base) return null;

    const target = new URL('/check-login-status', base);
    target.searchParams.set('redirectTo', 'placo');
    target.searchParams.set('returnTo', '/');
    return target.toString();
}

export default function LoginPage() {
    const { ready, token, plaExchangeComplete, needsOnboarding, loadError } = useAuth();
    const router = useRouter();
    const signupUrl = plaAuthUrl('signup');
    const loginUrl = plaAuthUrl('login');
    const sessionCheckUrl = plaCheckUrl();
    useEffect(() => {
        if (ready && token && !plaExchangeComplete && sessionCheckUrl) {
            window.location.replace(sessionCheckUrl);
            return;
        }
        if (ready && token && plaExchangeComplete && !loadError)
            router.replace(needsOnboarding ? '/onboarding' : '/');
    }, [ready, token, plaExchangeComplete, sessionCheckUrl, needsOnboarding, loadError, router]);

    return (
        <Box sx={{
            minHeight: '100dvh',
            display: 'grid',
            placeItems: 'center',
            px: 2.5,
            py: 5,
            background: 'radial-gradient(ellipse at top, rgba(38, 119, 64, 0.23), transparent 55%), #07110b',
        }}>
            <Card sx={{
                width: '100%',
                maxWidth: 460,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'linear-gradient(160deg, rgba(23,42,28,0.98), rgba(12,23,16,0.98))',
                boxShadow: '0 28px 90px rgba(0,0,0,0.45)',
            }}>
                <CardContent sx={{ p: { xs: 3, sm: 4 }, '&:last-child': { pb: { xs: 3, sm: 4 } } }}>
                    <Stack spacing={3} alignItems="center" textAlign="center">
                        <Box
                            component="img"
                            src="/pro-league-africa.png"
                            alt=""
                            sx={{ width: 84, height: 84, borderRadius: 3, objectFit: 'cover', boxShadow: '0 8px 30px rgba(0,0,0,0.35)' }}
                        />
                        <Box>
                            <Typography variant="overline" color="secondary.light" fontWeight={800} letterSpacing={2}>
                                PLA · PRO LEAGUE AFRICA
                            </Typography>
                            <Typography variant="h4" fontWeight={950} sx={{ mt: 0.5 }}>
                                PLACO
                            </Typography>
                            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                                Pro League Africa Club Owners Game
                            </Typography>
                        </Box>
                        <Typography variant="h6" fontWeight={750}>
                            To play PLACO, you must have a PLA account.
                        </Typography>
                        <Typography color="text.secondary" variant="body2">
                            Use your Pro League Africa account to continue. Your PLA sign-in will be securely verified before your game account is connected.
                        </Typography>
                        {loadError && <Alert severity="error" sx={{ width: '100%', textAlign: 'left' }}>{loadError}</Alert>}
                        {!signupUrl && <Alert severity="error" sx={{ width: '100%', textAlign: 'left' }}>
                            PLA sign-in is not configured. Set NEXT_PUBLIC_PLA_FRONTEND_URL and rebuild or restart the frontend.
                        </Alert>}
                        <Stack spacing={1.5} sx={{ width: '100%' }}>
                            <Button
                                component="a"
                                href={signupUrl ?? undefined}
                                disabled={!signupUrl}
                                variant="contained"
                                size="large"
                                startIcon={<Box component="img" src="/pro-league-africa.png" alt="" sx={{ width: 28, height: 28, borderRadius: 1, objectFit: 'cover' }} />}
                                sx={{
                                    minHeight: 58,
                                    justifyContent: 'flex-start',
                                    px: 2,
                                    fontWeight: 850,
                                    color: '#121208',
                                    background: 'linear-gradient(100deg, #f4cf43, #e5a929)',
                                    '&:hover': { background: 'linear-gradient(100deg, #ffe16a, #edb83b)' },
                                    '& .MuiButton-startIcon': { mr: 1.5 },
                                }}
                            >
                                Create your PLA account now
                            </Button>
                            <Button
                                component="a"
                                href={loginUrl ?? undefined}
                                disabled={!loginUrl}
                                variant="outlined"
                                size="large"
                                startIcon={<Box component="img" src="/pro-league-africa.png" alt="" sx={{ width: 28, height: 28, borderRadius: 1, objectFit: 'cover' }} />}
                                sx={{
                                    minHeight: 58,
                                    justifyContent: 'flex-start',
                                    px: 2,
                                    fontWeight: 750,
                                    color: '#fff',
                                    borderColor: 'rgba(255,255,255,0.28)',
                                    '&:hover': { borderColor: 'secondary.light', backgroundColor: 'rgba(255,255,255,0.06)' },
                                    '& .MuiButton-startIcon': { mr: 1.5 },
                                }}
                            >
                                Sign in with an existing PLA account
                            </Button>
                        </Stack>
                    </Stack>
                </CardContent>
            </Card>
        </Box>
    );
}
