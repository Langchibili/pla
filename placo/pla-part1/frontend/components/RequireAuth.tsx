'use client';
import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import { useAuth } from '@/lib/auth';

export default function RequireAuth({ children, allowNoProfile = false }: { children: ReactNode; allowNoProfile?: boolean }) {
  const { ready, token, profile, needsOnboarding } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!ready) return;
    if (!token) router.replace('/login');
    else if (needsOnboarding && !allowNoProfile) router.replace('/onboarding');
  }, [ready, token, needsOnboarding, allowNoProfile, router]);

  if (!ready || !token || (!profile && !allowNoProfile))
    return <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}><CircularProgress /></Box>;
  return <>{children}</>;
}
