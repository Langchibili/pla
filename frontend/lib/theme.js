import { createTheme, alpha } from '@mui/material/styles';

export const AFRICA = {
  green: '#00A651', gold: '#FDB913', red: '#E8392B', night: '#07100A',
  paper: '#0E1A11', raised: '#15251A', line: 'rgba(253,185,19,0.14)',
};

// Deep, dense, layered shadows (index 0 = none)
const shadows = ['none', ...Array.from({ length: 24 }, (_, i) => {
  const d = i + 1;
  return `0 ${d}px ${d * 2}px rgba(0,0,0,${Math.min(0.35 + d * 0.02, 0.75)}), 0 ${d * 3}px ${d * 6}px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)`;
})];

export const kente = `repeating-linear-gradient(90deg, ${AFRICA.green} 0 18px, ${AFRICA.gold} 18px 30px, ${AFRICA.red} 30px 42px, #000 42px 48px)`;

export function buildTheme(fontFamily) {
  return createTheme({
    palette: {
      mode: 'dark',
      primary: { main: AFRICA.green, contrastText: '#fff' },
      secondary: { main: AFRICA.gold, contrastText: '#1a1200' },
      error: { main: AFRICA.red },
      background: { default: AFRICA.night, paper: AFRICA.paper },
      text: { primary: '#F4F1E6', secondary: 'rgba(244,241,230,0.62)' },
      divider: AFRICA.line,
    },
    shape: { borderRadius: 18 },
    shadows,
    typography: {
      fontFamily,
      h1: { fontWeight: 800, letterSpacing: -1, fontSize: 'clamp(2rem, 8vw, 3rem)' },
      h2: { fontWeight: 800, letterSpacing: -0.8, fontSize: 'clamp(1.75rem, 7vw, 2.5rem)' },
      h3: { fontWeight: 800, letterSpacing: -0.5, fontSize: 'clamp(1.5rem, 6vw, 2rem)' },
      h4: { fontWeight: 700, fontSize: 'clamp(1.3rem, 5.5vw, 2.125rem)' },
      h5: { fontWeight: 700, fontSize: 'clamp(1.2rem, 4.8vw, 1.5rem)' },
      h6: { fontWeight: 700, fontSize: 'clamp(1.05rem, 4vw, 1.25rem)' },
      button: { textTransform: 'none', fontWeight: 700 },
    },
    components: {
      MuiCssBaseline: { styleOverrides: {
        html: { WebkitTapHighlightColor: 'transparent', overscrollBehavior: 'none' },
        body: { overscrollBehavior: 'none', userSelect: 'none', WebkitUserSelect: 'none',
          background: `radial-gradient(120% 60% at 50% -10%, ${alpha(AFRICA.green, 0.22)}, transparent 60%), ${AFRICA.night}` },
        'input,textarea': { userSelect: 'text' },
        '@media (prefers-reduced-motion: reduce)': { '*': { animationDuration: '0.01ms !important', transitionDuration: '0.01ms !important' } },
      } },
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none', border: `1px solid ${AFRICA.line}` } } },
      MuiButton: { styleOverrides: {
        root: { borderRadius: 16, minWidth: 0, maxWidth: '100%', padding: '12px 22px', whiteSpace: 'normal', overflowWrap: 'anywhere', lineHeight: 1.25, transition: 'transform .075s cubic-bezier(.2,.9,.3,1.4)', '&:active': { transform: 'scale(.96)' } },
        containedPrimary: { background: `linear-gradient(135deg, ${AFRICA.green}, #00793B)`, boxShadow: '0 10px 24px rgba(0,166,81,.4), 0 2px 0 rgba(255,255,255,.2) inset' },
        containedSecondary: { background: `linear-gradient(135deg, ${AFRICA.gold}, #E39A00)`, boxShadow: '0 10px 24px rgba(253,185,19,.35), 0 2px 0 rgba(255,255,255,.35) inset' },
      } },
      MuiChip: { styleOverrides: { root: { fontWeight: 700 } } },
      MuiTextField: { defaultProps: { variant: 'filled', fullWidth: true }, styleOverrides: { root: { '& .MuiFilledInput-root': { borderRadius: 16, background: AFRICA.raised, '&:before,&:after': { display: 'none' } } } } },
      MuiDrawer: { styleOverrides: { paper: { borderRadius: '28px 28px 0 0', paddingBottom: 'env(safe-area-inset-bottom)' } } },
    },
  });
}
