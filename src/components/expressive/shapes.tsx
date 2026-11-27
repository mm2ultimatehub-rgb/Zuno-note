import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export const TAU = Math.PI * 2;
export const SHAPE_N = 120;

export type ShapeId =
  | 'burst'
  | 'sun'
  | 'pent'
  | 'hex'
  | 'sq'
  | 'tri'
  | 'pill'
  | 'circ';

export type SwitchStyle = 'shape' | 'liquid';
export type TabStyle = 'pill' | 'shape' | 'line';
export type LoadStyle = 'line' | 'fill';

export interface ShapeDef {
  id: ShapeId;
  name: string;
  r: Float32Array;
}

function smooth(arr: Float32Array, sigma: number): Float32Array {
  if (sigma < 0.1) return new Float32Array(arr);
  const rad = Math.ceil(3 * sigma);
  const w: number[] = [];
  let sum = 0;
  for (let d = -rad; d <= rad; d++) {
    const v = Math.exp(-(d * d) / (2 * sigma * sigma));
    w.push(v);
    sum += v;
  }
  const out = new Float32Array(SHAPE_N);
  for (let i = 0; i < SHAPE_N; i++) {
    let acc = 0;
    for (let d = -rad; d <= rad; d++) {
      acc += arr[((i + d) % SHAPE_N + SHAPE_N) % SHAPE_N] * w[d + rad];
    }
    out[i] = acc / sum;
  }
  return out;
}

function polyR(n: number, t: number, off = 0): number {
  const tp = t + Math.PI / 2 + off;
  const seg = TAU / n;
  const phi = (((tp % seg) + seg) % seg) - seg / 2;
  return Math.cos(Math.PI / n) / Math.cos(phi);
}

function buildShape(
  fn: (t: number) => number,
  sigma: number,
  mean: number
): Float32Array {
  const raw = new Float32Array(SHAPE_N);
  for (let i = 0; i < SHAPE_N; i++) {
    raw[i] = fn((i / SHAPE_N) * TAU);
  }
  const a = smooth(raw, sigma);
  let sum = 0;
  for (let i = 0; i < SHAPE_N; i++) sum += a[i];
  const k = mean / (sum / SHAPE_N);
  for (let i = 0; i < SHAPE_N; i++) a[i] *= k;
  return a;
}

export const CIRC_SHAPE = new Float32Array(SHAPE_N).fill(0.92);

export const SHAPE_DEFS: ShapeDef[] = [
  {
    id: 'burst',
    name: 'Yumuşak yıldız',
    r: buildShape((t) => 1 + 0.1 * Math.cos(10 * t), 0, 0.92),
  },
  {
    id: 'sun',
    name: 'Güneş',
    r: buildShape((t) => 1 + 0.14 * Math.cos(8 * t), 0, 0.92),
  },
  {
    id: 'pent',
    name: 'Beşgen',
    r: buildShape((t) => polyR(5, t, 0), 5.5, 0.92),
  },
  {
    id: 'hex',
    name: 'Altıgen',
    r: buildShape((t) => polyR(6, t, 0), 4.5, 0.92),
  },
  {
    id: 'sq',
    name: 'Kare',
    r: buildShape((t) => polyR(4, t, Math.PI / 4), 5.5, 0.92),
  },
  {
    id: 'tri',
    name: 'Üçgen',
    r: buildShape((t) => polyR(3, t, 0), 7, 0.88),
  },
  {
    id: 'pill',
    name: 'Hap',
    r: buildShape((t) => {
      const a = 0.74;
      const b = 1;
      const p = 3.2;
      const c = Math.abs(Math.cos(t)) / a;
      const s = Math.abs(Math.sin(t)) / b;
      return Math.pow(Math.pow(c, p) + Math.pow(s, p), -1 / p);
    }, 0, 0.88),
  },
  {
    id: 'circ',
    name: 'Daire',
    r: CIRC_SHAPE,
  },
];

export function getShapeArray(id: ShapeId): Float32Array {
  return SHAPE_DEFS.find((d) => d.id === id)?.r ?? SHAPE_DEFS[0].r;
}

export function hexToRgb(h: string): [number, number, number] {
  let clean = String(h).replace('#', '');
  if (clean.length === 3) {
    clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
  }
  const n = parseInt(clean, 16) || 0xa3f0f0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  let h = 0;
  let s = 0;
  const d = mx - mn;
  if (d) {
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}

export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hue = (((h % 360) + 360) % 360) / 360;
  const f = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(f(p, q, hue + 1 / 3) * 255),
    Math.round(f(p, q, hue) * 255),
    Math.round(f(p, q, hue - 1 / 3) * 255),
  ];
}

export function computeDarkTone(rgb: [number, number, number]): [number, number, number] {
  const [h, s] = rgbToHsl(rgb[0], rgb[1], rgb[2]);
  return hslToRgb(h, Math.min(1, s * 1.35), 0.14);
}

export function mixRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): string {
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(
    a[1] + (b[1] - a[1]) * t
  )},${Math.round(a[2] + (b[2] - a[2]) * t)})`;
}

export const ACCENT_SWATCHES = [
  { hex: '#a3f0f0', label: 'Turkuaz' },
  { hex: '#ffb454', label: 'Turuncu' },
  { hex: '#ff9db8', label: 'Pembe' },
  { hex: '#9ccaff', label: 'Mavi' },
  { hex: '#a6f0a6', label: 'Yeşil' },
  { hex: '#cdb4ff', label: 'Mor' },
];

export interface ExpressiveSettings {
  color: string;
  shape: ShapeId;
  switchStyle: SwitchStyle;
  tabStyle: TabStyle;
  loadStyle: LoadStyle;
  speed: number;
  amp: number;
  stretch: number;
}

const DEFAULT_SETTINGS: ExpressiveSettings = {
  color: '#a3f0f0',
  shape: 'burst',
  switchStyle: 'shape',
  tabStyle: 'pill',
  loadStyle: 'line',
  speed: 1,
  amp: 1,
  stretch: 0.7,
};

const STORAGE_KEY = 'karanot-expressive-v1';

interface ExpressiveContextValue {
  settings: ExpressiveSettings;
  updateSettings: (patch: Partial<ExpressiveSettings>) => void;
  rgb: [number, number, number];
  darkRgb: [number, number, number];
  accentCss: string;
  darkCss: string;
  reducedMotion: boolean;
}

const ExpressiveContext = createContext<ExpressiveContextValue | null>(null);

export const ExpressiveProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [settings, setSettings] = useState<ExpressiveSettings>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<ExpressiveSettings>) };
      }
    } catch {
      // ignore localStorage errors
    }
    return DEFAULT_SETTINGS;
  });

  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReducedMotion(mq.matches);
      const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    } catch {
      return undefined;
    }
  }, []);

  const rgb = useMemo(() => hexToRgb(settings.color), [settings.color]);
  const darkRgb = useMemo(() => computeDarkTone(rgb), [rgb]);
  const accentCss = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
  const darkCss = `rgb(${darkRgb[0]},${darkRgb[1]},${darkRgb[2]})`;

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', settings.color);
    document.documentElement.style.setProperty('--accent-dark', darkCss);
  }, [settings.color, darkCss]);

  const updateSettings = (patch: Partial<ExpressiveSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const value = useMemo(
    () => ({
      settings,
      updateSettings,
      rgb,
      darkRgb,
      accentCss,
      darkCss,
      reducedMotion,
    }),
    [settings, rgb, darkRgb, accentCss, darkCss, reducedMotion]
  );

  return (
    <ExpressiveContext.Provider value={value}>{children}</ExpressiveContext.Provider>
  );
};

export function useExpressive(): ExpressiveContextValue {
  const ctx = useContext(ExpressiveContext);
  if (!ctx) throw new Error('useExpressive must be used inside ExpressiveProvider');
  return ctx;
}
