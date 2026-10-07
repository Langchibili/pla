'use client';
import { Box, Button, Typography } from '@mui/material';
export default function EmptyState({ title, body, action, onAction, icon = '🏆' }) {
  return (<Box sx={{ textAlign: 'center', py: 8, px: 3 }}><Typography sx={{ fontSize: 56 }}>{icon}</Typography>
    <Typography variant="h6" sx={{ mt: 1 }}>{title}</Typography><Typography color="text.secondary" sx={{ mt: 0.5 }}>{body}</Typography>
    {action && <Button variant="contained" color="secondary" onClick={onAction} sx={{ mt: 3 }}>{action}</Button>}</Box>);
}
