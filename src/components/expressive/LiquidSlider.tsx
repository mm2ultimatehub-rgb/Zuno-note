import React, { useEffect, useRef } from 'react';
import { CIRC_SHAPE, getShapeArray, SHAPE_N, TAU, useExpressive } from './shapes';

interface LiquidSliderProps {
  value: number; // 0..1
  onChange: (next: number) => void;
  ariaLabel: string;
  height?: number;
}

const LIQ: [number, number, number] = [20, 34, 37];

function clamp(x: number, a: number, b: number) {
  return x < a ? a : x > b ? b : x;
}

export const LiquidSlider: React.FC<LiquidSliderProps> = ({
  value,
  onChange,
  ariaLabel,
  height = 42,
}) => {
  const elRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const { settings, rgb, darkRgb, reducedMotion } = useExpressive();

  const animRef = useRef({
    target: clamp(value, 0, 1),
    val: clamp(value, 0, 1),
    vel: 0,
    press: 0,
    pt: 0,
    drag: false,
    clock: 0,
    settings,
    rgb,
    darkRgb,
    reducedMotion,
  });

  animRef.current.target = clamp(value, 0, 1);
  animRef.current.settings = settings;
  animRef.current.rgb = rgb;
  animRef.current.darkRgb = darkRgb;
  animRef.current.reducedMotion = reducedMotion;

  useEffect(() => {
    const el = elRef.current;
    const cv = cvRef.current;
    if (!el || !cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    let dpr = 1;
    let w = 0;
    let h = 0;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = el.clientWidth;
      h = el.clientHeight;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
    };
    resize();
    window.addEventListener('resize', resize);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    ro?.observe(el);

    const pillPath = (L: number, T: number) => {
      const p = new Path2D();
      const r = T / 2;
      p.moveTo(r, 0);
      p.lineTo(L - r, 0);
      p.arc(L - r, r, r, -Math.PI / 2, Math.PI / 2);
      p.lineTo(r, T);
      p.arc(r, r, r, Math.PI / 2, Math.PI * 1.5);
      p.closePath();
      return p;
    };

    const wavePath = (T: number, edge: number, A: number, ph: number, tilt: number) => {
      const p = new Path2D();
      const st = T / 10;
      p.moveTo(-4, -4);
      p.lineTo(edge + Math.sin(ph) * A - (T / 2 + 4) * tilt, -4);
      for (let y = 0; y <= T + st; y += st) {
        p.lineTo(
          edge + Math.sin((y / T) * TAU * 1.2 + ph) * A + (y - T / 2) * tilt,
          y
        );
      }
      p.lineTo(-4, T + 4);
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

      if (st.reducedMotion) {
        st.val = st.target;
        st.vel = 0;
      } else {
        const kk = 260 * sp * sp;
        const cc = 2 * Math.sqrt(kk) * 0.5;
        const n = 3;
        const hh = dt / n;
        for (let j = 0; j < n; j++) {
          st.vel += ((st.target - st.val) * kk - st.vel * cc) * hh;
          st.val += st.vel * hh;
        }
        if (Math.abs(st.target - st.val) < 0.0003 && Math.abs(st.vel) < 0.01) {
          st.val = st.target;
          st.vel = 0;
        }
      }
      st.press += (st.pt - st.press) * Math.min(1, dt * 14);

      if (w && h) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);

        const L = w;
        const T = h;
        const v = clamp(st.val, -0.04, 1.04);
        const track = pillPath(L, T);
        const kx = T / 2 + (L - T) * v;
        const ky = T / 2;
        const edge = kx + (v - 0.5) * T;
        const motion = st.reducedMotion ? 0 : Math.min(1.2, Math.abs(st.vel) * 0.9);
        const A = T * 0.07 * st.settings.amp * (0.25 + motion);
        const tilt = st.reducedMotion
          ? 0
          : clamp(-st.vel * 0.1 * st.settings.amp, -0.5, 0.5);

        ctx.fillStyle = `rgb(${LIQ[0]},${LIQ[1]},${LIQ[2]})`;
        ctx.fill(track);
        ctx.save();
        ctx.clip(track);
        ctx.fillStyle = `rgba(${st.rgb[0]},${st.rgb[1]},${st.rgb[2]},0.4)`;
        ctx.fill(wavePath(T, edge - T * 0.08, A * 1.1, st.clock * 2.2, tilt * 0.8));
        ctx.fillStyle = `rgb(${st.rgb[0]},${st.rgb[1]},${st.rgb[2]})`;
        ctx.fill(wavePath(T, edge, A, -st.clock * 3.1 + 1.2, tilt));
        ctx.restore();

        const R = T * 0.34 * (1 + 0.12 * st.press);
        const m = st.settings.shape === 'circ' ? 0 : 0.25 + 0.75 * st.press;
        const knob = knobPath(
          kx,
          ky,
          R,
          v * TAU * 1.25,
          m,
          getShapeArray(st.settings.shape)
        );
        ctx.fillStyle = `rgb(${st.darkRgb[0]},${st.darkRgb[1]},${st.darkRgb[2]})`;
        ctx.fill(knob);
        ctx.lineWidth = Math.max(1.5, T * 0.04);
        ctx.strokeStyle = 'rgba(230,242,242,0.92)';
        ctx.stroke(knob);
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

  const updateFromPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = elRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const next = clamp((e.clientX - r.left - r.height / 2) / Math.max(1, r.width - r.height), 0, 1);
    onChange(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    let d = 0;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') d = 0.05;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') d = -0.05;
    else if (e.key === 'PageUp') d = 0.1;
    else if (e.key === 'PageDown') d = -0.1;
    else if (e.key === 'Home') {
      e.preventDefault();
      onChange(0);
      return;
    } else if (e.key === 'End') {
      e.preventDefault();
      onChange(1);
      return;
    } else return;
    e.preventDefault();
    onChange(clamp(value + d, 0, 1));
  };

  return (
    <div
      ref={elRef}
      role="slider"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      style={{ height: `${height}px` }}
      onPointerDown={(e) => {
        e.stopPropagation();
        animRef.current.drag = true;
        animRef.current.pt = 1;
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // ignore
        }
        updateFromPointer(e);
      }}
      onPointerMove={(e) => {
        if (animRef.current.drag) {
          e.stopPropagation();
          updateFromPointer(e);
        }
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        animRef.current.drag = false;
        animRef.current.pt = 0;
      }}
      onPointerCancel={() => {
        animRef.current.drag = false;
        animRef.current.pt = 0;
      }}
      onKeyDown={handleKeyDown}
      className="relative w-full rounded-full cursor-pointer select-none touch-none"
    >
      <canvas ref={cvRef} className="block w-full h-full pointer-events-none" />
    </div>
  );
};
