'use client';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { buildTheme } from '@/lib/theme';
import { AuthProvider } from '@/hooks/useAuth';
import { ToastProvider } from '@/hooks/useToast';
import { ConfirmationProvider } from '@/hooks/useConfirm';

export default function ThemeRegistry({ children, fontFamily }) {
  return (
    <AppRouterCacheProvider>
      <ThemeProvider theme={buildTheme(fontFamily)}>
        <CssBaseline />
        <ToastProvider><ConfirmationProvider><AuthProvider>{children}</AuthProvider></ConfirmationProvider></ToastProvider>
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
