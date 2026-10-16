'use client';
import Box from '@mui/material/Box';
import type { TouchInput } from '@/lib/engine/contract';

type Act = NonNullable<TouchInput['action']>;
const BTN: { act: Act; label: string; color: string; pos: [number, number] }[] = [
  { act: 'shoot', label: 'SHOOT', color: '#e5484d', pos: [0, 78] },
  { act: 'pass', label: 'PASS', color: '#1fbf5b', pos: [80, 78] },
  { act: 'through', label: 'THRU', color: '#3b82f6', pos: [0, 0] },
  { act: 'lob', label: 'LOB', color: '#a855f7', pos: [80, 0] },
];

/** Hold-to-charge buttons. Released → engine fires the action. Tackle sits left of the cluster, sprint is a hold toggle. */
export default function ActionButtons({
  onAction, onSprint,
}: { onAction: (a: Act | null, held: boolean) => void; onSprint: (on: boolean) => void }) {
  const mk = (act: Act) => ({
    onPointerDown: (e: React.PointerEvent) => { e.currentTarget.setPointerCapture(e.pointerId); onAction(act, true); },
    onPointerUp: () => onAction(act, false),
    onPointerCancel: () => onAction(act, false),
  });
  const base = {
    position: 'absolute' as const, width: 70, height: 70, borderRadius: '50%', display: 'grid', placeItems: 'center',
    color: '#fff', fontWeight: 800, fontSize: 12, border: '2px solid rgba(255,255,255,0.35)', opacity: 0.85,
  };
  return (
    <Box className="no-touch-actions" sx={{ position: 'relative', width: 160, height: 150 }}>
      {BTN.map(b => (
        <Box key={b.act} {...mk(b.act)} sx={{ ...base, bgcolor: b.color, left: b.pos[0], top: b.pos[1], '&:active': { transform: 'scale(0.92)' } }}>{b.label}</Box>
      ))}
      <Box {...mk('tackle')} sx={{ ...base, bgcolor: '#f59e0b', left: -78, top: 78 }}>TACKLE</Box>
      <Box
        onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); onSprint(true); }}
        onPointerUp={() => onSprint(false)} onPointerCancel={() => onSprint(false)}
        sx={{ ...base, bgcolor: '#334155', left: -78, top: 0 }}
      >SPRINT</Box>
    </Box>
  );
}
