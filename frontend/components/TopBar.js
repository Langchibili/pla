'use client';
import { Box, IconButton, Typography } from '@mui/material';
import ArrowBackIosNewRoundedIcon from '@mui/icons-material/ArrowBackIosNewRounded';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { haptic } from '@/lib/haptics';
import PlapoPill from './PlapoPill';
import KenteStripe from './KenteStripe';
import NotificationCenter from './NotificationCenter';
import { useAuth } from '@/hooks/useAuth';

export default function TopBar({ title, showBack }) {
  const router = useRouter();
  const { user } = useAuth();
  return (
    <Box component="header" sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1200, pt: 'env(safe-area-inset-top)', backdropFilter: 'blur(22px) saturate(160%)', background: 'rgba(7,16,10,.78)', boxShadow: '0 12px 30px rgba(0,0,0,.6)' }}>
      <KenteStripe height={3} sx={{ borderRadius: 0 }} />
      <Box sx={{ height: 56, px: 2, display: 'flex', alignItems: 'center', gap: 1.5, maxWidth: 640, mx: 'auto' }}>
        <AnimatePresence mode="wait">
          <Typography key={title} component={motion.h1} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.09 }}
            variant="h6" noWrap sx={{ flex: 1, fontSize: 20 }}>{title}</Typography>
        </AnimatePresence>
        {user && <PlapoPill value={user.spendable_balance} onClick={() => { haptic('light'); router.push('/wallet'); }} />}
        {user && <NotificationCenter />}
        <AnimatePresence>
          {showBack && (
            <motion.div initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 1000, damping: 34 }}>
              <IconButton aria-label="Go back" onClick={() => { haptic('light'); router.back(); }}
                sx={{ width: 42, height: 42, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', boxShadow: 6, '&:active': { transform: 'scale(.9)' } }}>
                <ArrowBackIosNewRoundedIcon fontSize="small" sx={{ color: 'secondary.main' }} />
              </IconButton>
            </motion.div>
          )}
        </AnimatePresence>
      </Box>
    </Box>
  );
}
