'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Link from '@mui/material/Link';
import { useAuth } from '@/lib/auth';
export default function LoginPage() {
    const { login, register } = useAuth();
    const router = useRouter();
    const [mode, setMode] = useState('login');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);
    async function submit(e) {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
            if (mode === 'login')
                await login(email, password);
            else
                await register(username, email, password);
            router.replace('/');
        }
        catch (err) {
            setError(err.message ?? 'Something went wrong');
        }
        finally {
            setBusy(false);
        }
    }
    return (<Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', p: 3 }}>
      <Box component="form" onSubmit={submit} sx={{ width: '100%', maxWidth: 380 }}>
        <Typography variant="h4" fontWeight={900} letterSpacing={1} gutterBottom>PRO LEAGUE AFRICA</Typography>
        <Typography color="text.secondary" mb={3}>{mode === 'login' ? 'Welcome back, manager.' : 'Create your account and build your club.'}</Typography>
        <Stack spacing={2}>
          {mode === 'register' && <TextField label="Username" value={username} onChange={e => setUsername(e.target.value)} required autoComplete="username"/>}
          <TextField label={mode === 'login' ? 'Email or username' : 'Email'} value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email"/>
          <TextField label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete={mode === 'login' ? 'current-password' : 'new-password'}/>
          {error && <Alert severity="error">{error}</Alert>}
          <Button type="submit" variant="contained" size="large" disabled={busy}>{mode === 'login' ? 'Sign in' : 'Create account'}</Button>
          <Link component="button" type="button" underline="hover" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }}>
            {mode === 'login' ? 'New here? Create an account' : 'Have an account? Sign in'}
          </Link>
        </Stack>
      </Box>
    </Box>);
}
