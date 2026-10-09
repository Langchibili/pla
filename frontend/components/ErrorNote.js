'use client';
import { Alert, Button } from '@mui/material';
export default function ErrorNote({ error, onRetry }) {
  if (!error) return null;
  return <Alert severity="error" variant="outlined" sx={{ borderRadius: '14px' }} action={onRetry && <Button color="inherit" size="small" onClick={onRetry}>Retry</Button>}>{error.message}</Alert>;
}
