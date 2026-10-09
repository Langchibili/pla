'use client';
import { Box, Drawer, Typography } from '@mui/material';
import { haptic } from '@/lib/haptics';
// Bottom sheet used by Unavailable / Postpone / Transfer flows
export default function ActionSheet({ open, onClose, title, children }) {
  return (
    <Drawer anchor="bottom" open={open} onClose={() => { haptic('light'); onClose(); }} transitionDuration={{ enter: 160, exit: 110 }} PaperProps={{ sx: { maxWidth: 640, mx: 'auto', boxShadow: '0 -20px 60px rgba(0,0,0,.8)' } }}>
      <Box sx={{ p: 2.5 }}>
        <Box sx={{ width: 44, height: 5, borderRadius: 9, bgcolor: 'divider', mx: 'auto', mb: 2 }} />
        <Typography variant="h6" sx={{ mb: 2 }}>{title}</Typography>{children}
      </Box>
    </Drawer>
  );
}
