'use client';
import { createTheme } from '@mui/material/styles';
export const theme = createTheme({
    cssVariables: true,
    palette: {
        mode: 'dark',
        primary: { main: '#1fbf5b' },
        secondary: { main: '#f4cb34' },
        background: { default: '#07110b', paper: '#0e1f15' },
    },
    shape: { borderRadius: 14 },
    typography: { fontFamily: 'var(--font-geist-sans), system-ui, sans-serif', button: { textTransform: 'none', fontWeight: 700 } },
    components: {
        MuiButton: { defaultProps: { disableElevation: true } },
        MuiCard: { styleOverrides: { root: { backgroundImage: 'none', border: '1px solid rgba(255,255,255,0.07)' } } },
    },
});
