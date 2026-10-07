'use client';
import { Box, Button, Tab, Tabs, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { haptic } from '@/lib/haptics';
import KenteStripe from '@/components/KenteStripe';
import { AFRICA } from '@/lib/theme';

// Replace with a real fingerprint lib (e.g. FingerprintJS) — server stores only the hash
const deviceHash = async () => { const s = [navigator.userAgent, screen.width, screen.height, navigator.language, Intl.DateTimeFormat().resolvedOptions().timeZone].join('|'); const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join(''); };

export default function Login() {
  const { signIn, signUp } = useAuth(); const toast = useToast();
  const [mode, setMode] = useState(0); const [f, setF] = useState({ username: '', email: '', password: '', ref: '' }); const [busy, setBusy] = useState(false);
  useEffect(() => { const r = new URLSearchParams(location.search).get('ref'); if (r) { setF((x) => ({ ...x, ref: r })); setMode(1); } }, []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); haptic('medium');
    try { mode === 0 ? await signIn(f.email, f.password) : await signUp({ username: f.username, email: f.email, password: f.password, device_hash: await deviceHash(), referral_code: f.ref || undefined }); haptic('success'); }
    catch (err) { toast(err.message, 'error'); } finally { setBusy(false); }
  };
  return (
    <Box sx={{ minHeight: '100dvh', display: 'grid', alignContent: 'center', px: 3, py: 6, maxWidth: 440, mx: 'auto' }}>
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 22 }}>
        <Typography variant="h2" sx={{ lineHeight: 1 }}>ProLeague<br /><Box component="span" sx={{ color: 'secondary.main' }}>Africa</Box></Typography>
        <KenteStripe height={6} sx={{ my: 2.5, width: 120 }} />
        <Tabs value={mode} onChange={(_, v) => { haptic('select'); setMode(v); }} variant="fullWidth" textColor="secondary" indicatorColor="secondary" sx={{ mb: 3 }}><Tab label="Sign in" /><Tab label="Create account" /></Tabs>
        <Box component="form" onSubmit={submit} sx={{ display: 'grid', gap: 2 }}>
          {mode === 1 && <TextField label="Username" value={f.username} onChange={set('username')} required />}
          <TextField label={mode === 0 ? 'Email or username' : 'Email'} value={f.email} onChange={set('email')} required autoComplete="username" />
          <TextField label="Password" type="password" value={f.password} onChange={set('password')} required autoComplete={mode ? 'new-password' : 'current-password'} />
          {mode === 1 && <TextField label="Referral code (optional)" value={f.ref} onChange={set('ref')} />}
          <Button type="submit" size="large" variant="contained" color="secondary" disabled={busy} sx={{ mt: 1 }}>{busy ? 'Please wait…' : mode ? 'Create account' : 'Sign in'}</Button>
        </Box>
      </motion.div>
    </Box>
  );
}
