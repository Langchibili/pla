'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import RequireAuth from '@/components/RequireAuth';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function OnboardingPage() {
  return <RequireAuth allowNoProfile><Form /></RequireAuth>;
}

function Form() {
  const { refresh } = useAuth();
  const router = useRouter();
  const [club, setClub] = useState('');
  const [handle, setHandle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await api.initialise(club.trim(), handle.trim() || undefined);
      await refresh();
      router.replace('/');
    } catch (err: any) { setError(err.message); } finally { setBusy(false); }
  }

  return (
    <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', p: 3 }}>
      <Box component="form" onSubmit={submit} sx={{ width: '100%', maxWidth: 380 }}>
        <Typography variant="h4" fontWeight={900} gutterBottom>Found your club</Typography>
        <Typography color="text.secondary" mb={3}>You start with eleven players, P-1 to P-11. Make them legends.</Typography>
        <Stack spacing={2}>
          <TextField label="Club name" value={club} onChange={e => setClub(e.target.value)} required slotProps={{ htmlInput: { maxLength: 40 } }} />
          <TextField label="Public handle (optional)" value={handle} onChange={e => setHandle(e.target.value)} helperText="Shown on leaderboards" />
          {error && <Alert severity="error">{error}</Alert>}
          <Button type="submit" variant="contained" size="large" disabled={busy || !club.trim()}>Create club</Button>
        </Stack>
      </Box>
    </Box>
  );
}
