'use client';
import { motion } from 'framer-motion';
// Native-style page push/fade on every route change
export default function Template({ children }) {
  return <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 36, mass: 0.8 }}>{children}</motion.div>;
}
