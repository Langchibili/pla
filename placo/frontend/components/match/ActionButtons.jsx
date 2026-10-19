'use client';
import Box from '@mui/material/Box';
const BTN = [
    { act: 'shoot', label: 'SHOOT', color: '#e5484d', pos: [0, 78] },
    { act: 'pass', label: 'PASS', color: '#1fbf5b', pos: [80, 78] },
    { act: 'through', label: 'THRU', color: '#3b82f6', pos: [0, 0] },
    { act: 'lob', label: 'LOB', color: '#a855f7', pos: [80, 0] },
];
/**
 * Hold-to-charge buttons. Released → engine fires the action.
 * Tackle (stand-up) sits left of the cluster, SLIDE is new (the sim already supports input.action === 'slide', it was keyboard-only 'O'),
 * sprint is a hold toggle.
 */
export default function ActionButtons({ onAction, onSprint, }) {
    const mk = (act) => ({
        onPointerDown: (e) => { e.currentTarget.setPointerCapture(e.pointerId); onAction(act, true); },
        onPointerUp: () => onAction(act, false),
        onPointerCancel: () => onAction(act, false),
    });
    const base = {
        position: 'absolute', width: 70, height: 70, borderRadius: '50%', display: 'grid', placeItems: 'center',
        color: '#fff', fontWeight: 900, fontSize: 11, letterSpacing: 0.5,
        border: '1px solid rgba(255,255,255,0.68)', textShadow: '0 1px 3px rgba(0,0,0,0.65)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -9px 14px rgba(0,0,0,0.25), 0 5px 12px rgba(0,0,0,0.35)',
        backdropFilter: 'blur(3px)', touchAction: 'none', userSelect: 'none',
    };
    return (<Box className="no-touch-actions" sx={{ position: 'relative', width: 160, height: 150 }}>
      {BTN.map(b => (<Box key={b.act} role="button" aria-label={b.label} {...mk(b.act)} sx={{ ...base, bgcolor: b.color, background: `linear-gradient(155deg, ${b.color}, rgba(5,12,10,0.72))`, left: b.pos[0], top: b.pos[1], '&:active': { transform: 'scale(0.92)' } }}>{b.label}</Box>))}
      <Box role="button" aria-label="Tackle" {...mk('tackle')} sx={{ ...base, bgcolor: '#d99a16', background: 'linear-gradient(155deg, #f4cb34, #8e5a12)', left: -78, top: 78 }}>TACKLE</Box>
      <Box role="button" aria-label="Slide tackle" {...mk('slide')} sx={{ ...base, width: 62, height: 62, bgcolor: '#b45309', background: 'linear-gradient(155deg, #f08a3a, #6b2d0c)', left: -152, top: 86, '&:active': { transform: 'scale(0.92)' } }}>SLIDE</Box>
      <Box role="button" aria-label="Hold to sprint" onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); onSprint(true); }} onPointerUp={() => onSprint(false)} onPointerCancel={() => onSprint(false)} sx={{ ...base, bgcolor: '#334155', background: 'linear-gradient(155deg, #536879, #121d22)', left: -78, top: 0 }}>SPRINT</Box>
    </Box>);
}
