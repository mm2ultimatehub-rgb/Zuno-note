import React, { useEffect, useRef } from 'react';
import { getShapeArray, SHAPE_N, ShapeId, TAU, useExpressive } from './shapes';

interface SoftMorphLoaderProps {
  size?: number;
  withContainer?: boolean;
}

const CYCLE: ShapeId[] = ['burst', 'pent', 'pill', 'sun'];

function easeOutBack(x: number) {
  const c1 = 1.1;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

export const SoftMorphLoader: React.FC<SoftMorphLoaderProps> = ({
  size = 56,
  withContainer = true,
}) => {
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const { settings, rgb, darkRgb, reducedMotion } = useExpressive();

  const refState = useRef({
    acc: 0,
    settings,
    rgb,
    darkRgb,
    reducedMotion,
  });
  refState.current.settings = settings;
  refState.current.rgb = rgb;
  refState.current.darkRgb = darkRgb;
  refState.current.reducedMotion = reducedMotion;

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    cv.width = Math.round(size * dpr);
    cv.height = Math.round(size * dpr);

    const STEP = 0.8;
    const MOVE = 0.55;
    let last = performance.now();
    let rafId = 0;

    const frame = () => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;

      const st = refState.current;
      st.acc += st.reducedMotion ? 0 : dt * st.settings.speed;

      const stepIdx = Math.floor(st.acc / STEP);
      const local = st.acc - stepIdx * STEP;
      const s = local < MOVE ? easeOutBack(local / MOVE) : 1;
      const A = getShapeArray(CYCLE[stepIdx % CYCLE.length]);
      const B = getShapeArray(CYCLE[(stepIdx + 1) % CYCLE.length]);
      const rot = st.acc * 0.9 + (stepIdx + Math.min(s, 1.0)) * 0.55;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);

      const cx = size / 2;
      const cy = size / 2;
      const Rc = size * 0.46;
      const Rs = Rc * 0.7;

      if (withContainer) {
        ctx.fillStyle = `rgb(${st.darkRgb[0]},${st.darkRgb[1]},${st.darkRgb[2]})`;
        ctx.beginPath();
        ctx.arc(cx, cy, Rc, 0, TAU);
        ctx.fill();
      }

      const path = new Path2D();
      for (let i = 0; i < SHAPE_N; i++) {
        const r = A[i] + (B[i] - A[i]) * s;
        const a = (i / SHAPE_N) * TAU + rot;
        const x = cx + Math.cos(a) * Rs * r;
        const y = cy + Math.sin(a) * Rs * r;
        if (i === 0) path.moveTo(x, y);
        else path.lineTo(x, y);
      }
      path.closePath();
      ctx.fillStyle = `rgb(${st.rgb[0]},${st.rgb[1]},${st.rgb[2]})`;
      ctx.fill(path);

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    const backup = window.setInterval(() => {
      if (performance.now() - last > 120) frame();
    }, 50);

    return () => {
      cancelAnimationFrame(rafId);
      window.clearInterval(backup);
    };
  }, [size, withContainer]);

  return (
    <canvas
      ref={cvRef}
      style={{ width: `${size}px`, height: `${size}px` }}
      className="block shrink-0"
      aria-label="Yükleniyor"
    />
  );
};
