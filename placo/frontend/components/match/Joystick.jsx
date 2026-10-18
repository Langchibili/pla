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
    const [dragging, setDragging] = useState(false);
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
    const end = () => { active.current = null; setDragging(false); setKnob({ x: 0, y: 0 }); onChange({ x: 0, y: 0 }); };
    return (<Box ref={baseRef} role="group" aria-label="Movement joystick" className="no-touch-actions" onPointerDown={e => { if (active.current !== null)
        return; active.current = e.pointerId; setDragging(true); e.currentTarget.setPointerCapture(e.pointerId); update(e); }} onPointerMove={e => { if (active.current === e.pointerId)
        update(e); }} onPointerUp={e => { if (active.current === e.pointerId)
        end(); }} onPointerCancel={e => { if (active.current === e.pointerId)
        end(); }} sx={{ width: size, height: size, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.13) 0 34%, rgba(8,20,15,0.32) 35% 67%, rgba(255,255,255,0.08) 68% 100%)', border: '1px solid rgba(255,255,255,0.4)', boxShadow: 'inset 0 0 0 7px rgba(255,255,255,0.04), 0 0 0 5px rgba(4,17,11,0.24)', position: 'relative', backdropFilter: 'blur(3px)' }}>
      <Box sx={{
            position: 'absolute', width: size * 0.38, height: size * 0.38, borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.96), rgba(214,232,220,0.72) 58%, rgba(116,147,127,0.68))',
            border: '1px solid rgba(255,255,255,0.72)', boxShadow: '0 4px 16px rgba(0,0,0,0.42), inset 0 1px 2px rgba(255,255,255,0.8)',
            left: '50%', top: '50%', transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))`, transition: dragging ? 'none' : 'transform 110ms ease-out',
        }}/>
    </Box>);
}
