'use client';
import { createContext, useCallback, useContext, useState } from 'react';
import { Snackbar, Alert, Slide } from '@mui/material';
import { haptic } from '@/lib/haptics';
const Ctx = createContext(() => {});
export const useToast = () => useContext(Ctx);
const Down = (p) => <Slide {...p} direction="down" />;
export function ToastProvider({ children }) {
  const [t, setT] = useState(null);
  const show = useCallback((msg, severity = 'success') => { haptic(severity === 'error' ? 'error' : 'success'); setT({ msg, severity, k: Date.now() }); }, []);
  return (<Ctx.Provider value={show}>{children}
    <Snackbar key={t?.k} open={!!t} autoHideDuration={3200} onClose={() => setT(null)} TransitionComponent={Down} anchorOrigin={{ vertical: 'top', horizontal: 'center' }} sx={{ top: 'calc(env(safe-area-inset-top) + 8px) !important' }}>
      <Alert severity={t?.severity} variant="filled" sx={{ borderRadius: 4, boxShadow: 12, fontWeight: 600 }}>{t?.msg}</Alert>
    </Snackbar></Ctx.Provider>);
}
