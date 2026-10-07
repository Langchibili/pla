const P = { tap: 8, light: 12, medium: 24, heavy: 40, success: [12, 50, 18], warning: [30, 40, 30], error: [60, 40, 60, 40, 90], select: 6 };
let enabled = true;
export const setHapticsEnabled = (v) => { enabled = v; try { localStorage.setItem('pla_haptics', v ? '1' : '0'); } catch {} };
export const initHaptics = () => { try { enabled = localStorage.getItem('pla_haptics') !== '0'; } catch {} return enabled; };
export const haptic = (kind = 'tap') => {
  if (!enabled || typeof navigator === 'undefined' || !navigator.vibrate) return;
  try { navigator.vibrate(P[kind] ?? P.tap); } catch {}
};
