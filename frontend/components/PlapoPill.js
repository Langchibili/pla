'use client';
import { Box, Typography } from '@mui/material';
import { motion, useSpring, useTransform } from 'framer-motion';
import { useEffect } from 'react';
import { fmtPlapo } from '@/lib/format';
import { AFRICA } from '@/lib/theme';

export default function PlapoPill({ value = 0, onClick }) {
  const s = useSpring(value, { stiffness: 90, damping: 18 });
  const t = useTransform(s, (v) => fmtPlapo(Math.round(v)));
  useEffect(() => { s.set(value); }, [value, s]);
  return (
    <Box onClick={onClick} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.8, pl: 0.6, pr: 1.6, py: 0.5, borderRadius: 99, cursor: 'pointer',
      background: 'linear-gradient(135deg,#2a1d00,#171000)', border: `1px solid ${AFRICA.gold}55`, boxShadow: '0 8px 20px rgba(0,0,0,.55), 0 0 18px rgba(253,185,19,.18)' }}>
      <Box sx={{ width: 26, height: 26, borderRadius: '50%', display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 13, color: '#1a1200', background: `radial-gradient(circle at 30% 30%, #FFE08A, ${AFRICA.gold})` }}>P</Box>
      <Typography component={motion.span} fontWeight={800} color="secondary.main">{t}</Typography>
    </Box>
  );
}
