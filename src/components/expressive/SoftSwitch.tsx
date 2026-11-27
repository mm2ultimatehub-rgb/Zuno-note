import React, { useEffect, useRef } from 'react';
import { CIRC_SHAPE, getShapeArray, SHAPE_N, TAU, useExpressive } from './shapes';

interface SoftSwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  size?: 'sm' | 'big';
}

const TOFF: [number, number, number] = [27, 44, 46];
const KOFF: [number, number, number] = [132, 160, 160];
const LIQ: [number, number, number] = [20, 34, 37];

function clamp(x: number, a: number, b: number) {
  return x < a ? a : x > b ? b : x;
}

function mix(a: [number, number, number], b: [number, number, number], t: number) {
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(
    a[1] + (b[1] - a[1]) * t
  )},${Math.round(a[2] + (b[2] - a[2]) * t)})`;
}

export const SoftSwitch: React.FC<SoftSwitchProps> = ({
  checked,
  onChange,
  ariaLabel,
  ariaLabelledBy,
  size = 'sm',
}) => {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const { settings, rgb, darkRgb, reducedMotion } = useExpressive();

  const animRef = useRef({
    s: checked ? 1 : 0,
    v: 0,
    press: 0,
    pt: 0,
    spin: 0,
    clock: 0,
    checked,
    settings,
    rgb,
    darkRgb,
    reducedMotion,
  });

  animRef.current.checked = checked;
  animRef.current.settings = settings;
  animRef.current.rgb = rgb;
  animRef.current.darkRgb = darkRgb;
  animRef.current.reducedMotion = reducedMotion;

  useEffect(() => {
    const cv = cvRef.current;
    const btn = btnRef.current;
    if (!cv || !btn) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    let dpr = 1;
    let w = 0;
    let h = 0;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = btn.clientWidth;
      h = btn.clientHeight;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
    };
    resize();
    window.addEventListener('resize', resize);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    ro?.observe(btn);

    const pillPath = (pw: number, ph: number) => {
      const p = new Path2D();
      const r = ph / 2;
      p.moveTo(r, 0);
      p.lineTo(pw - r, 0);
      p.arc(pw - r, r, r, -Math.PI / 2, Math.PI / 2);
      p.lineTo(r, ph);
      p.arc(r, r, r, Math.PI / 2, Math.PI * 1.5);
      p.closePath();
      return p;
    };

    const wavePath = (ph: number, edge: number, A: number, phase: number) => {
      const p = new Path2D();
      const st = ph / 10;
      p.moveTo(-4, -4);
      p.lineTo(edge + Math.sin(phase) * A, -4);
      for (let y = 0; y <= ph + st; y += st) {
        p.lineTo(edge + Math.sin((y / ph) * TAU * 1.2 + phase) * A, y);
      }
      p.lineTo(-4, ph + 4);
      p.closePath();
      return p;
    };

    const knobPath = (
      x: number,
      y: number,
      R: number,
      rot: number,
      m: number,
      shape: Float32Array
    ) => {
      const p = new Path2D();
      for (let i = 0; i < SHAPE_N; i++) {
        const r = (CIRC_SHAPE[i] + (shape[i] - CIRC_SHAPE[i]) * m) / 0.92;
        const a = (i / SHAPE_N) * TAU + rot;
        if (i === 0) p.moveTo(x + Math.cos(a) * R * r, y + Math.sin(a) * R * r);
        else p.lineTo(x + Math.cos(a) * R * r, y + Math.sin(a) * R * r);
      }
      p.closePath();
      return p;
    };

    let last = performance.now();
    let rafId = 0;

    const frame = () => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const st = animRef.current;
      const sp = st.settings.speed;
      st.clock += dt * sp;

      const tgt = st.checked ? 1 : 0;
      if (st.reducedMotion) {
        st.s = tgt;
        st.v = 0;
      } else {
        const kk = 200 * sp * sp;
        const cc = 2 * Math.sqrt(kk) * 0.55;
        const steps = 3;
        const hh = dt / steps;
        for (let j = 0; j < steps; j++) {
          st.v += ((tgt - st.s) * kk - st.v * cc) * hh;
          st.s += st.v * hh;
        }
        if (Math.abs(tgt - st.s) < 0.0005 && Math.abs(st.v) < 0.01) {
          st.s = tgt;
          st.v = 0;
        }
      }
      st.press += (st.pt - st.press) * Math.min(1, dt * 16);
      st.spin += dt * sp * 1.1 * clamp(st.s, 0, 1);

      if (w && h) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);

        const s = st.s;
        const sc = clamp(s, 0, 1);
        const track = pillPath(w, h);
        const R = h * 0.38 * (0.7 + 0.3 * clamp(s, 0, 1.1)) * (1 - 0.1 * st.press);
        const x = h / 2 + (w - h) * clamp(s, -0.04, 1.06);
        const y = h / 2;
        const rot = s * 2.0 + st.spin;
        const shape = getShapeArray(st.settings.shape);
        const knob = knobPath(x, y, R, rot, sc, shape);

        if (st.settings.switchStyle === 'shape') {
          ctx.fillStyle = mix(TOFF, st.rgb, sc);
          ctx.fill(track);
          ctx.fillStyle = mix(KOFF, st.darkRgb, clamp(sc * 1.3 - 0.15, 0, 1));
          ctx.fill(knob);
        } else {
          ctx.fillStyle = `rgb(${LIQ[0]},${LIQ[1]},${LIQ[2]})`;
          ctx.fill(track);
          ctx.save();
          ctx.clip(track);
          const edge = -h * 0.4 + (w + h * 0.8) * sc;
          const A = h * 0.16 * st.settings.amp * Math.sin(Math.PI * sc);
          ctx.fillStyle = `rgba(${st.rgb[0]},${st.rgb[1]},${st.rgb[2]},0.4)`;
          ctx.fill(wavePath(h, edge + h * 0.1, A * 1.1, st.clock * 2.2));
          const front = wavePath(h, edge, A, -st.clock * 3.1 + 1.2);
          ctx.fillStyle = `rgb(${st.rgb[0]},${st.rgb[1]},${st.rgb[2]})`;
          ctx.fill(front);
          ctx.fillStyle = `rgb(${KOFF[0]},${KOFF[1]},${KOFF[2]})`;
          ctx.fill(knob);
          ctx.save();
          ctx.clip(front);
          ctx.fillStyle = `rgb(${st.darkRgb[0]},${st.darkRgb[1]},${st.darkRgb[2]})`;
          ctx.fill(knob);
          ctx.restore();
          ctx.restore();
        }
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    const backupTimer = window.setInterval(() => {
      if (performance.now() - last > 120) frame();
    }, 50);

    return () => {
      cancelAnimationFrame(rafId);
      window.clearInterval(backupTimer);
      window.removeEventListener('resize', resize);
      ro?.disconnect();
    };
  }, []);

  return (
    <button
      ref={btnRef}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      onClick={() => onChange(!checked)}
      onPointerDown={() => {
        animRef.current.pt = 1;
      }}
      onPointerUp={() => {
        animRef.current.pt = 0;
      }}
      onPointerLeave={() => {
        animRef.current.pt = 0;
      }}
      onPointerCancel={() => {
        animRef.current.pt = 0;
      }}
      className={`block p-0 border-0 bg-transparent rounded-full touch-manipulation select-none shrink-0 ${
        size === 'big' ? 'w-32 h-16' : 'w-[58px] h-[32px]'
      }`}
    >
      <canvas ref={cvRef} className="block w-full h-full pointer-events-none" />
    </button>
  );
};
