'use client';
import { motion } from 'framer-motion';
import { haptic } from '@/lib/haptics';
// Pressable wrapper: spring scale + haptic tick
export default function Tap({ children, onClick, kind = 'tap', sx, component = 'div', ...rest }) {
  const M = motion[component] || motion.div;
  return (
    <M whileTap={{ scale: 0.965 }} transition={{ type: 'spring', stiffness: 1040, damping: 37 }}
      onClick={(e) => { haptic(kind); onClick?.(e); }} style={{ cursor: onClick ? 'pointer' : 'default', ...sx }} {...rest}>
      {children}
    </M>
  );
}
