'use client';
import { Paper } from '@mui/material';
import { motion } from 'framer-motion';
import { haptic } from '@/lib/haptics';
// Dense raised card; pass onClick to make it a pressable
export default function Surface({ children, onClick, accent, sx, ...rest }) {
  return (
    <Paper component={motion.div} elevation={onClick ? 10 : 6} whileTap={onClick ? { scale: 0.97 } : undefined} transition={{ type: 'spring', stiffness: 1000, damping: 40 }}
      onClick={onClick ? () => { haptic('tap'); onClick(); } : undefined}
      sx={{ p: 2, borderRadius: '32px', position: 'relative', overflow: 'hidden', cursor: onClick ? 'pointer' : 'default', background: 'linear-gradient(160deg,#162a1b 0%,#0d1810 100%)',
        ...(accent && { '&:before': { content: '""', position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: accent } }), ...sx }} {...rest}>
      {children}
    </Paper>
  );
}
