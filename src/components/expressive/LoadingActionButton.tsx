import React, { useEffect, useRef } from 'react';
import { CIRC_SHAPE, getShapeArray, SHAPE_N, TAU, useExpressive } from './shapes';

interface LoadingActionButtonProps {
  label: string;
  onAction: () => void | Promise<void>;
  width?: number;
  height?: number;
}

const LIQ: [number, number, number] = [20, 34, 37];
const FG: [number, number, number] = [230, 242, 242];

function clamp(x: number, a: number, b: number) {
  return x < a ? a : x > b ? b : x;
}
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function easeIO(x: number) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}
function mix(a: [number, number, number], b: [number, number, number], t: number) {
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(
    a[1] + (b[1] - a[1]) * t
  )},${Math.round(a[2] + (b[2] - a[2]) * t)})`;
}
function css(c: [number, number, number], a = 1) {
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
}

export const LoadingActionButton: React.FC<LoadingActionButtonProps> = ({
  label,
  onAction,
  width,
  height = 84,
}) => {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const { settings, rgb, darkRgb, reducedMotion } = useExpressive();

  const animRef = useRef({
    phase: 0, // 0 ready, 1 squeeze, 2 loading, 3 circle, 4 check, 5 reopen
    t: 0,
    press: 0,
    pt: 0,
    clock: 0,
    label,
    onAction,
    settings,
    rgb,
    darkRgb,
    reducedMotion,
    triggered: false,
  });

  animRef.current.label = label;
  animRef.current.onAction = onAction;
  animRef.current.settings = settings;
  animRef.current.rgb = rgb;
  animRef.current.darkRgb = darkRgb;
  animRef.current.reducedMotion = reducedMotion;

  useEffect(() => {
    const btn = btnRef.current;
    const cv = cvRef.current;
    if (!btn || !cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    let dpr = 1;
    let W = 0;
    let H = 0;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = btn.clientWidth;
      H = btn.clientHeight;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
    };
    resize();
    window.addEventListener('resize', resize);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    ro?.observe(btn);

    const pillPath = (cx: number, cy: number, pw: number, ph: number) => {
      const p = new Path2D();
      const r = ph / 2;
      const x = cx - pw / 2;
      const y = cy - ph / 2;
      p.moveTo(x + r, y);
      p.lineTo(x + pw - r, y);
      p.arc(x + pw - r, y + r, r, -Math.PI / 2, Math.PI / 2);
      p.lineTo(x + r, y + ph);
      p.arc(x + r, y + r, r, Math.PI / 2, Math.PI * 1.5);
      p.closePath();
      return p;
    };

    const wavePath = (T: number, edge: number, A: number, ph: number) => {
      const p = new Path2D();
      const st = T / 10;
      p.moveTo(-4, -4);
      p.lineTo(edge + Math.sin(ph) * A, -4);
      for (let y = 0; y <= T + st; y += st) {
        p.lineTo(edge + Math.sin((y / T) * TAU * 1.2 + ph) * A, y);
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

    const drawLabelText = (
      txt: string,
      x: number,
      y: number,
      size: number,
      color: string,
      alpha: number
    ) => {
      if (alpha <= 0.01) return;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `600 ${Math.round(size)}px 'Space Grotesk', system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      ctx.fillText(txt, x, y);
      ctx.restore();
    };

    const drawCheck = (
      cx: number,
      cy: number,
      R: number,
      prog: number,
      alpha: number,
      darkColor: [number, number, number]
    ) => {
      const P = [
        [-0.36, 0.02],
        [-0.1, 0.28],
        [0.38, -0.24],
      ];
      const l1 = Math.hypot(P[1][0] - P[0][0], P[1][1] - P[0][1]);
      const l2 = Math.hypot(P[2][0] - P[1][0], P[2][1] - P[1][1]);
      const d = clamp(prog, 0, 1) * (l1 + l2);
      if (d <= 0.001 || alpha <= 0.01) return;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(cx + P[0][0] * R, cy + P[0][1] * R);
      if (d <= l1) {
        const f = d / l1;
        ctx.lineTo(
          cx + (P[0][0] + (P[1][0] - P[0][0]) * f) * R,
          cy + (P[0][1] + (P[1][1] - P[0][1]) * f) * R
        );
      } else {
        ctx.lineTo(cx + P[1][0] * R, cy + P[1][1] * R);
        const f = (d - l1) / l2;
        ctx.lineTo(
          cx + (P[1][0] + (P[2][0] - P[1][0]) * f) * R,
          cy + (P[1][1] + (P[2][1] - P[1][1]) * f) * R
        );
      }
      ctx.lineWidth = R * 0.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = css(darkColor);
      ctx.stroke();
      ctx.restore();
    };

    const phaseDur = (p: number) => {
      if (p === 1) return 0.3;
      if (p === 2) return 0.95;
      if (p === 3) return 0.35;
      if (p === 4) return 1.1;
      return 0.45;
    };

    let last = performance.now();
    let rafId = 0;

    const frame = () => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const st = animRef.current;
      st.clock += dt * st.settings.speed;
      st.press += (st.pt - st.press) * Math.min(1, dt * 16);

      if (st.phase !== 0) {
        st.t += dt * st.settings.speed;
        const dur = phaseDur(st.phase);
        if (st.t >= dur) {
          if (st.phase === 5) {
            st.phase = 0;
            st.t = 0;
            st.triggered = false;
            btn.setAttribute('aria-busy', 'false');
          } else {
            st.phase += 1;
            st.t = 0;
          }
        }
      }

      if (W && H) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);

        const cx = W / 2;
        const cy = H / 2;
        const bh = Math.round(H * 0.56);
        const lw = Math.max(5, bh * 0.16);
        const lineMode = st.settings.loadStyle === 'line';
        const Tt = lineMode ? lw : bh;
        const ph = st.phase;
        const u = ph === 0 ? 0 : clamp(st.t / phaseDur(ph), 0, 1);
        const e = easeIO(u);
        const accent = css(st.rgb);
        const dark = css(st.darkRgb);
        const fsz = Math.max(12, bh * 0.32);
        const shape = getShapeArray(st.settings.shape);

        if (ph === 0) {
          const sc = 1 - 0.04 * st.press;
          ctx.fillStyle = accent;
          ctx.fill(pillPath(cx, cy, W * sc, bh * sc));
          drawLabelText(st.label, cx, cy, fsz * sc, dark, 1);
        } else if (ph === 1) {
          const h1 = lerp(bh, Tt, e);
          ctx.fillStyle = lineMode ? css(st.rgb, lerp(1, 0.25, e)) : mix(st.rgb, LIQ, e);
          ctx.fill(pillPath(cx, cy, W, h1));
          drawLabelText(st.label, cx, cy, fsz, dark, clamp(1 - e * 2.2, 0, 1));
        } else if (ph === 2) {
          const ep = -(Math.cos(Math.PI * u) - 1) / 2;
          const pct = `${Math.round(ep * 100)}%`;
          const env = clamp(u / 0.1, 0, 1) * clamp((1 - u) / 0.1, 0, 1);
          if (lineMode) {
            const x0 = cx - W / 2 + lw / 2;
            const x1 = cx + W / 2 - lw / 2;
            const xe = x0 + (x1 - x0) * ep;
            const Aw = (st.reducedMotion ? 0 : bh * 0.2 * st.settings.amp) * env;
            const len = bh * 2.2;
            const phs = st.clock * 4;
            const gap = lw * 1.8 * clamp(ep * 15, 0, 1);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineWidth = lw;
            if (xe + gap < x1) {
              ctx.strokeStyle = css(st.rgb, 0.25);
              ctx.beginPath();
              ctx.moveTo(xe + gap, cy);
              ctx.lineTo(x1, cy);
              ctx.stroke();
              ctx.fillStyle = accent;
              ctx.beginPath();
              ctx.arc(x1, cy, lw * 0.28, 0, TAU);
              ctx.fill();
            }
            if (xe > x0 + 0.5) {
              ctx.strokeStyle = accent;
              ctx.beginPath();
              for (let xx = x0; xx <= xe; xx += 3) {
                const amp =
                  Aw *
                  clamp((xx - x0) / (len * 0.8), 0, 1) *
                  clamp((xe - xx) / (len * 0.5), 0, 1);
                const yy = cy + Math.sin(((xx - x0) / len) * TAU - phs) * amp;
                if (xx === x0) ctx.moveTo(xx, yy);
                else ctx.lineTo(xx, yy);
              }
              ctx.lineTo(xe, cy);
              ctx.stroke();
            }
            drawLabelText(pct, cx, cy - bh * 0.65, bh * 0.42, css(FG, 0.95), 1);
          } else {
            ctx.save();
            ctx.translate(cx - W / 2, cy - bh / 2);
            const track = pillPath(W / 2, bh / 2, W, bh);
            ctx.fillStyle = css(LIQ);
            ctx.fill(track);
            ctx.clip(track);
            const edge = -bh * 0.4 + (W + bh * 0.8) * ep;
            const A =
              (st.reducedMotion ? 0 : bh * 0.16 * st.settings.amp) *
              Math.sin(Math.PI * ep);
            ctx.fillStyle = css(st.rgb, 0.4);
            ctx.fill(wavePath(bh, edge - bh * 0.08, A * 1.1, st.clock * 2.2));
            const front = wavePath(bh, edge, A, -st.clock * 3.1 + 1.2);
            ctx.fillStyle = accent;
            ctx.fill(front);
            drawLabelText(pct, W / 2, bh / 2, bh * 0.4, css(FG, 0.95), 1);
            ctx.clip(front);
            drawLabelText(pct, W / 2, bh / 2, bh * 0.4, dark, 1);
            ctx.restore();
          }
        } else if (ph === 3) {
          ctx.fillStyle = accent;
          ctx.fill(pillPath(cx, cy, lerp(W, bh, e), lerp(Tt, bh, e)));
        } else if (ph === 4) {
          const t = st.t;
          const m = easeIO(clamp(t / 0.35, 0, 1));
          const pop = 1 + 0.18 * Math.sin(clamp(t / 0.5, 0, 1) * Math.PI);
          const R = (bh / 2) * (1 + 0.1 * m) * pop;
          ctx.fillStyle = accent;
          ctx.fill(knobPath(cx, cy, R, t * 0.8, m, shape));
          drawCheck(
            cx,
            cy,
            bh / 2,
            easeIO(clamp((t - 0.15) / 0.45, 0, 1)),
            1,
            st.darkRgb
          );
        } else {
          if (u < 0.2) {
            const m5 = 1 - Math.min(1, u * 5);
            ctx.fillStyle = accent;
            ctx.fill(knobPath(cx, cy, (bh / 2) * (1 + 0.1 * m5), st.t * 0.8, m5, shape));
            drawCheck(cx, cy, bh / 2, 1, m5, st.darkRgb);
          } else {
            const e5 = easeIO(clamp((u - 0.2) / 0.8, 0, 1));
            ctx.fillStyle = accent;
            ctx.fill(pillPath(cx, cy, lerp(bh, W, e5), bh));
            drawLabelText(st.label, cx, cy, fsz, dark, clamp((e5 - 0.5) * 2, 0, 1));
          }
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
      onClick={() => {
        if (animRef.current.phase === 0) {
          animRef.current.phase = 1;
          animRef.current.t = 0;
          animRef.current.triggered = true;
          btnRef.current?.setAttribute('aria-busy', 'true');
          Promise.resolve(animRef.current.onAction()).catch(() => {});
        }
      }}
      onPointerDown={() => {
        if (animRef.current.phase === 0) animRef.current.pt = 1;
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
      style={{
        width: width ? `${width}px` : '100%',
        height: `${height}px`,
      }}
      className="block p-0 border-0 bg-transparent rounded-2xl touch-manipulation select-none"
      aria-label={label}
    >
      <canvas ref={cvRef} className="block w-full h-full pointer-events-none" />
    </button>
  );
};
