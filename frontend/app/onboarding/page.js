'use client';
import { Box, Button, MobileStepper, Typography } from '@mui/material';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { endpoints } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { haptic } from '@/lib/haptics';

const STEPS = [
  ['🏆', 'Join with Plapo', 'Pick a tournament, enter your exact in-game name and pay the Plapo entry fee.'],
  ['🔑', 'Get your match code', 'Each fixture has a code. Use it as your team or room name in the game.'],
  ['📱', 'Screenshot in landscape', 'At full time, take a clean landscape screenshot with the score visible.'],
  ['⬆️', 'Upload before the deadline', 'Both players upload. If scores agree, the result is final.'],
  ['🤝', 'Forfeit or postpone', "Can't play? Request a new time or forfeit. The opponent receives the win."],
];
export default function Onboarding() {
  const [i, setI] = useState(0); const router = useRouter(); const { user, refresh } = useAuth(); const last = i === STEPS.length - 1;
  const next = async () => { haptic('medium'); if (!last) return setI(i + 1); try { await endpoints.updateMe(user.id, { has_completed_tutorial: true }); await refresh(); haptic('success'); router.replace('/'); } catch {} };
  const [e, t, b] = STEPS[i];
  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', p: 3, pt: 'calc(env(safe-area-inset-top) + 24px)', pb: 'calc(env(safe-area-inset-bottom) + 24px)', maxWidth: 480, mx: 'auto' }}>
      <Box sx={{ flex: 1, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        <AnimatePresence mode="wait"><motion.div key={i} initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }} transition={{ type: 'spring', stiffness: 600, damping: 42 }}>
          <Typography sx={{ fontSize: 96, filter: 'drop-shadow(0 20px 24px rgba(0,0,0,.6))' }}>{e}</Typography>
          <Typography variant="h4" sx={{ mt: 2 }}>{t}</Typography><Typography color="text.secondary" sx={{ mt: 1.5 }}>{b}</Typography>
        </motion.div></AnimatePresence>
      </Box>
      <MobileStepper variant="dots" steps={STEPS.length} activeStep={i} position="static" backButton={null} nextButton={null} sx={{ justifyContent: 'center', bgcolor: 'transparent', '& .MuiMobileStepper-dotActive': { bgcolor: 'secondary.main' } }} />
      <Button fullWidth size="large" variant="contained" color="secondary" onClick={next} sx={{ mt: 2 }}>{last ? 'Start playing' : 'Next'}</Button>
    </Box>
  );
}
