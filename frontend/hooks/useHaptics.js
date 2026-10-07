'use client';
import { useEffect } from 'react';
import { haptic, initHaptics } from '@/lib/haptics';
export function useHaptics() { useEffect(() => { initHaptics(); }, []); return haptic; }
