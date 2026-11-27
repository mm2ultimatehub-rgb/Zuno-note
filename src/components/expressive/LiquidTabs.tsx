import React, { useEffect, useRef } from 'react';
import { getShapeArray, mixRgb, SHAPE_N, TAU, useExpressive } from './shapes';

export interface LiquidTabItem<T extends string> {
  id: T;
  label: string;
}

interface LiquidTabsProps<T extends string> {
  items: LiquidTabItem<T>[];
  value: T;
  onChange: (next: T) => void;
  ariaLabel: string;
  compact?: boolean;
}

const MUTED: [number, number, number] = [132, 160, 160];
const FG: [number, number, number] = [230, 242, 242];

function clamp(x: number, a: number, b: number) {
  return x < a ? a : x > b ? b : x;
}

export function LiquidTabs<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
  compact = false,
}: LiquidTabsProps<T>) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const { settings, rgb, darkRgb, reducedMotion } = useExpressive();

  const activeIdx = Math.max(
    0,
    items.findIndex((item) => item.id === value)
  );

  const animRef = useRef({
    i: activeIdx,
    L: 0,
    R: 0,
    vl: 0,
    vr: 0,
    dir: 1,
    tl: 0,
    tr: 0,
    ty: 0,
    th: 0,
    w: 0,
    h: 0,
    ready: false,
    clock: 0,
    settings,
    rgb,
    darkRgb,
    reducedMotion,
  });

  useEffect(() => {
    const st = animRef.current;
    if (activeIdx !== st.i && st.ready) {
      const b = btnRefs.current[activeIdx];
      if (b) {
        const oldC = (st.L + st.R) / 2;
        const newC = b.offsetLeft + b.offsetWidth / 2;
        st.dir = newC >= oldC ? 1 : -1;
      }
    }
    st.i = activeIdx;
    const b = btnRefs.current[activeIdx];
    if (b) {
      st.tl = b.offsetLeft;
      st.tr = b.offsetLeft + b.offsetWidth;
      st.ty = b.offsetTop;
      st.th = b.offsetHeight;
      if (!st.ready) {
        st.L = st.tl;
        st.R = st.tr;
        st.ready = true;
      }
    }
  }, [activeIdx, items.length, compact]);

  animRef.current.settings = settings;
  animRef.current.rgb = rgb;
  animRef.current.darkRgb = darkRgb;
  animRef.current.reducedMotion = reducedMotion;

  useEffect(() => {
    const root = rootRef.current;
    const cv = cvRef.current;
    if (!root || !cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    let dpr = 1;
    const layout = (snap = false) => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const st = animRef.current;
      st.w = root.clientWidth;
      st.h = root.clientHeight;
      cv.width = Math.round(st.w * dpr);
      cv.height = Math.round(st.h * dpr);
      const b = btnRefs.current[st.i];
      if (b) {
        st.tl = b.offsetLeft;
        st.tr = b.offsetLeft + b.offsetWidth;
        st.ty = b.offsetTop;
        st.th = b.offsetHeight;
        if (snap || !st.ready) {
          st.L = st.tl;
          st.R = st.tr;
          st.vl = 0;
          st.vr = 0;
          st.ready = true;
        }
      }
    };

    const onResize = () => layout(true);
    layout(true);
    window.addEventListener('resize', onResize);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null;
    ro?.observe(root);

    const shapePath = (R: number, rot: number, shape: Float32Array) => {
      const p = new Path2D();
      for (let i = 0; i < SHAPE_N; i++) {
        const r = shape[i] / 0.92;
        const a = (i / SHAPE_N) * TAU + rot;
        if (i === 0) p.moveTo(Math.cos(a) * R * r, Math.sin(a) * R * r);
        else p.lineTo(Math.cos(a) * R * r, Math.sin(a) * R * r);
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
        st.L = st.tl;
        st.R = st.tr;
        st.vl = 0;
        st.vr = 0;
      } else {
        const fastK = 320 * sp * sp;
        const slowK = fastK * (1 - 0.75 * st.settings.stretch);
        const kr = st.dir > 0 ? fastK : slowK;
        const kl = st.dir > 0 ? slowK : fastK;
        const zr = st.dir > 0 ? 0.55 : 0.8;
        const zl = st.dir > 0 ? 0.8 : 0.55;
        const n = 3;
        const hh = dt / n;
        for (let j = 0; j < n; j++) {
          st.vr += ((st.tr - st.R) * kr - st.vr * 2 * Math.sqrt(kr) * zr) * hh;
          st.R += st.vr * hh;
          st.vl += ((st.tl - st.L) * kl - st.vl * 2 * Math.sqrt(kl) * zl) * hh;
          st.L += st.vl * hh;
        }
      }

      if (st.w && st.h) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, st.w, st.h);

        const L = st.L;
        const R = st.R;
        const top = st.ty;
        const h = st.th;
        const cx = (L + R) / 2;
        const wI = Math.max(R - L, 2);
        const activeBtn = btnRefs.current[st.i];
        const tabW = activeBtn?.offsetWidth || wI;
        const accent = `rgb(${st.rgb[0]},${st.rgb[1]},${st.rgb[2]})`;
        const style = st.settings.tabStyle;

        if (style === 'pill') {
          const r = Math.min(h / 2, wI / 2);
          ctx.beginPath();
          ctx.moveTo(L + r, top);
          ctx.lineTo(R - r, top);
          ctx.arc(R - r, top + r, r, -Math.PI / 2, 0);
          ctx.lineTo(R, top + h - r);
          ctx.arc(R - r, top + h - r, r, 0, Math.PI / 2);
          ctx.lineTo(L + r, top + h);
          ctx.arc(L + r, top + h - r, r, Math.PI / 2, Math.PI);
          ctx.lineTo(L, top + r);
          ctx.arc(L + r, top + r, r, Math.PI, Math.PI * 1.5);
          ctx.closePath();
          ctx.fillStyle = accent;
          ctx.fill();
        } else if (style === 'shape') {
          const Rm = h * 0.15;
          const sx = clamp(wI / tabW, 0.7, 2);
          const sy = 1 / Math.sqrt(sx);
          ctx.save();
          ctx.translate(cx, top + h * 0.22);
          ctx.scale(sx, sy);
          ctx.fillStyle = accent;
          ctx.fill(
            shapePath(Rm, (cx / Math.max(1, h)) * 0.9 + st.clock * 0.6, getShapeArray(st.settings.shape))
          );
          ctx.restore();
        } else {
          const y0 = top + h - h * 0.14;
          let x0 = L + tabW * 0.12;
          let x1 = R - tabW * 0.12;
          if (x1 - x0 < 4) {
            x0 = cx - 2;
            x1 = cx + 2;
          }
          const motion = Math.min(3, (Math.abs(st.vl) + Math.abs(st.vr)) * 0.006);
          const A = st.reducedMotion ? 0 : 2.2 + motion;
          ctx.lineWidth = Math.max(3, h * 0.075);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = accent;
          ctx.beginPath();
          for (let x = x0; x <= x1; x += 3) {
            const f = (x - x0) / (x1 - x0);
            const yy =
              y0 +
              Math.sin(((x - x0) / (h * 0.55)) * TAU - st.clock * 5) *
                A *
                Math.sin(Math.PI * f);
            if (x === x0) ctx.moveTo(x, yy);
            else ctx.lineTo(x, yy);
          }
          ctx.lineTo(x1, y0);
          ctx.stroke();
        }

        btnRefs.current.forEach((b) => {
          if (!b) return;
          const bc = b.offsetLeft + b.offsetWidth / 2;
          const kf = clamp(1 - Math.abs(cx - bc) / (Math.max(1, b.offsetWidth) * 0.65), 0, 1);
          b.style.color = mixRgb(MUTED, style === 'pill' ? st.darkRgb : FG, kf);
        });
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
      window.removeEventListener('resize', onResize);
      ro?.disconnect();
    };
  }, []);

  return (
    <div
      ref={rootRef}
      role="tablist"
      aria-label={ariaLabel}
      className="relative flex p-[5px] rounded-full bg-[#142225] border border-[#1b2c2e] select-none"
    >
      <canvas
        ref={cvRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
      {items.map((item, j) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            ref={(el) => {
              btnRefs.current[j] = el;
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.id)}
            onKeyDown={(e) => {
              let d = 0;
              if (e.key === 'ArrowRight') d = 1;
              else if (e.key === 'ArrowLeft') d = -1;
              else return;
              e.preventDefault();
              const nj = (j + d + items.length) % items.length;
              onChange(items[nj].id);
              btnRefs.current[nj]?.focus();
            }}
            style={{
              paddingTop: settings.tabStyle === 'shape' ? '8px' : '0px',
              paddingBottom: settings.tabStyle === 'line' ? '4px' : '0px',
            }}
            className={`relative z-10 flex-1 min-w-0 px-3 border-0 rounded-full bg-transparent font-medium whitespace-nowrap touch-manipulation transition-[padding] ${
              compact ? 'h-9 text-xs' : 'h-10 text-sm'
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
