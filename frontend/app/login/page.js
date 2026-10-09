'use client';
import { Box, Button, MenuItem, Tab, Tabs, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useApi } from '@/hooks/useApi';
import { endpoints } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { haptic } from '@/lib/haptics';
import KenteStripe from '@/components/KenteStripe';
import { createDeviceHash, useReferralCode } from '@/lib/device';

export default function Login() {
  const { requestOtp, resendOtp, verifyOtp } = useAuth(); const toast = useToast();
  const countries = useApi('active-countries', endpoints.countries);
  const attributedCode = useReferralCode();
  const [mode, setMode] = useState(null); const [email, setEmail] = useState(''); const [code, setCode] = useState('');
  const [manualReferralCode, setManualReferralCode] = useState(''); const [countryId, setCountryId] = useState('');
  const [stage, setStage] = useState('email'); const [busy, setBusy] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(30);
  const selectedMode = mode ?? (attributedCode ? 1 : 0);
  const referralCode = manualReferralCode || attributedCode;
  const purpose = selectedMode === 0 ? 'login' : 'signup';

  useEffect(() => {
    if (stage !== 'code') return undefined;
    const timer = setInterval(() => {
      setResendSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [stage]);

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); haptic('medium');
    try {
      if (stage === 'email') {
        const hash = await createDeviceHash();
        setStage('code');
        setResendSeconds(30);
        await requestOtp(email, purpose, referralCode || undefined, hash, countryId || undefined);
        toast('A verification code was sent to your email.', 'success');
      } else {
        await verifyOtp(email, code, purpose);
        sessionStorage.removeItem('pla_referral_code');
        haptic('success');
      }
    }
    catch (err) { toast(err.message, 'error'); } finally { setBusy(false); }
  };
  const resend = async () => {
    setBusy(true);
    setResendSeconds(30);
    try {
      const hash = await createDeviceHash();
      await resendOtp(email, purpose, referralCode || undefined, hash, countryId || undefined);
      toast('A new verification code was sent.', 'success');
    } catch (err) { toast(err.message, 'error'); } finally { setBusy(false); }
  };
  return (
    <Box sx={{ minHeight: '100dvh', display: 'grid', alignContent: 'center', px: 3, py: 6, maxWidth: 440, mx: 'auto' }}>
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 31 }}>
        <Typography variant="h2" sx={{ lineHeight: 1 }}>ProLeague<br /><Box component="span" sx={{ color: 'secondary.main' }}>Africa</Box></Typography>
        <KenteStripe height={6} sx={{ my: 2.5, width: 120 }} />
        <Tabs value={selectedMode} onChange={(_, value) => { haptic('select'); setMode(value); setStage('email'); setCode(''); setResendSeconds(30); }} variant="fullWidth" textColor="secondary" indicatorColor="secondary" sx={{ mb: 3 }}><Tab label="Sign in" /><Tab label="Create account" /></Tabs>
        <Box component="form" onSubmit={submit} sx={{ display: 'grid', gap: 2 }}>
          <Typography color="text.secondary">{stage === 'email' ? 'Use your email address. We will send you a one-time code.' : `Enter the six-digit code sent to ${email}.`}</Typography>
          {stage === 'email' ? <>
            <TextField label="Email address" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
            {selectedMode === 1 && <TextField select label="Country" value={countryId} onChange={(event) => setCountryId(event.target.value)} required disabled={countries.loading}>
              {(countries.data || []).map((country) => <MenuItem key={country.id} value={country.id}>{country.name} {country.default_currency?.code ? `(${country.default_currency.code})` : ''}</MenuItem>)}
            </TextField>}
            {selectedMode === 1 && <TextField label="Referral code (optional)" value={manualReferralCode || attributedCode} onChange={(event) => setManualReferralCode(event.target.value)} />}
          </> : <>
            <TextField label="Email verification code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} required inputProps={{ inputMode: 'numeric', autoComplete: 'one-time-code', maxLength: 6 }} />
            <Button
              type="button"
              variant="text"
              color="secondary"
              onClick={resend}
              disabled={busy || resendSeconds > 0}
              sx={{ alignSelf: 'start', border: 0, boxShadow: 'none', px: 0, minWidth: 0 }}
            >
              {resendSeconds > 0 ? `Resend code in ${resendSeconds}s` : 'Resend code'}
            </Button>
            <Button type="button" onClick={() => { setStage('email'); setCode(''); }} sx={{ justifySelf: 'start', width: 'fit-content' }}>Change email</Button>
          </>}
          <Button type="submit" size="large" variant="contained" color="secondary" disabled={busy || (stage === 'code' && code.length !== 6)} sx={{ mt: 1 }}>{busy ? 'Please wait…' : stage === 'email' ? 'Send verification code' : selectedMode ? 'Create account' : 'Sign in'}</Button>
        </Box>
      </motion.div>
    </Box>
  );
}
