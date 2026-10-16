'use client';
import { useRef, useState } from 'react';
import Box from '@mui/material/Box';
/**
 * Floating-base virtual stick. Output: x right = +1, y UP = +1 (screen-up = "forward" for the camera-relative mapping in the engine).
 * Has a small dead zone and a smooth response curve so tiny thumb drift does not move the player.
 */
export default function Joystick({ onChange, size = 130 }) {
    const baseRef = useRef(null);
    const [knob, setKnob] = useState({ x: 0, y: 0 });
    const active = useRef(null);
    const R = size / 2;
    const update = (e) => {
        const r = baseRef.current.getBoundingClientRect();
        let dx = e.clientX - (r.left + r.width / 2);
        let dy = e.clientY - (r.top + r.height / 2);
        const len = Math.hypot(dx, dy);
        if (len > R) {
            dx = (dx / len) * R;
            dy = (dy / len) * R;
        }
        setKnob({ x: dx, y: dy });
        const m = Math.min(1, len / R);
        const dead = 0.12;
        const mag = m < dead ? 0 : Math.pow((m - dead) / (1 - dead), 1.2);
        const n = len || 1;
        onChange({ x: (dx / n) * mag * (len > R ? 1 : 1), y: (-dy / n) * mag });
    };
    const end = () => { active.current = null; setKnob({ x: 0, y: 0 }); onChange({ x: 0, y: 0 }); };
    return (<Box ref={baseRef} className="no-touch-actions" onPointerDown={e => { if (active.current !== null)
        return; active.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); update(e); }} onPointerMove={e => { if (active.current === e.pointerId)
        update(e); }} onPointerUp={e => { if (active.current === e.pointerId)
        end(); }} onPointerCancel={e => { if (active.current === e.pointerId)
        end(); }} sx={{ width: size, height: size, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.10)', border: '2px solid rgba(255,255,255,0.25)', position: 'relative' }}>
      <Box sx={{
            position: 'absolute', width: size * 0.42, height: size * 0.42, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.55)',
            left: '50%', top: '50%', transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))`,
        }}/>
    </Box>);
}
