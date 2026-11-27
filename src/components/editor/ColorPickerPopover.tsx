import React, { useEffect, useRef, useState } from 'react';
import { Pipette } from 'lucide-react';
import { LiquidTabs } from '../expressive/LiquidTabs';
import { LiquidSlider } from '../expressive/LiquidSlider';
import { useExpressive } from '../expressive/shapes';

interface ColorPickerPopoverProps {
  isOpen: boolean;
  topOffsetClass?: string;
  color: string;
  recentColors: string[];
  onApply: (nextHex: string) => void;
  onClose: () => void;
}

type ColorTab = 'swatches' | 'spectrum';

function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const toHex = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean.padEnd(6, '0');
  const num = parseInt(full, 16) || 0;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = 60 * (((gn - bn) / d) % 6);
    else if (max === gn) h = 60 * ((bn - rn) / d + 2);
    else h = 60 * ((rn - gn) / d + 4);
  }
  if (h < 0) h += 360;
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}

// 12x10 Swatch Grid matching Samsung Notes Kartelalar layout
const SWATCH_GRID: string[][] = Array.from({ length: 10 }, (_, row) => {
  return Array.from({ length: 12 }, (_, col) => {
    if (col === 0) {
      const lum = Math.round(255 - (row / 9) * 245);
      const h = lum.toString(16).padStart(2, '0');
      return `#${h}${h}${h}`;
    }
    const hue = ((col - 1) / 11) * 340;
    const sat = row < 3 ? 0.35 + row * 0.2 : row < 6 ? 0.85 : 0.9;
    const val = row < 5 ? 1 - row * 0.04 : 0.9 - (row - 4) * 0.14;
    return hsvToHex(hue, sat, Math.max(0.18, val));
  });
});

export const ColorPickerPopover: React.FC<ColorPickerPopoverProps> = ({
  isOpen,
  topOffsetClass = 'top-[152px] max-h-[calc(100dvh-166px)]',
  color,
  recentColors,
  onApply,
  onClose,
}) => {
  const { accentCss, darkCss } = useExpressive();
  const [tab, setTab] = useState<ColorTab>('swatches');
  const [draftColor, setDraftColor] = useState(color);
  const [hsv, setHsv] = useState(() => {
    const { r, g, b } = hexToRgb(color);
    return rgbToHsv(r, g, b);
  });

  const specRef = useRef<HTMLCanvasElement | null>(null);
  const draggingRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setDraftColor(color);
      const { r, g, b } = hexToRgb(color);
      setHsv(rgbToHsv(r, g, b));
    }
  }, [isOpen, color]);

  useEffect(() => {
    if (!isOpen || tab !== 'spectrum') return;
    const cv = specRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    const w = cv.width;
    const h = cv.height;

    const hueGrad = ctx.createLinearGradient(0, 0, w, 0);
    hueGrad.addColorStop(0, '#ff0000');
    hueGrad.addColorStop(1 / 6, '#ffff00');
    hueGrad.addColorStop(2 / 6, '#00ff00');
    hueGrad.addColorStop(3 / 6, '#00ffff');
    hueGrad.addColorStop(4 / 6, '#0000ff');
    hueGrad.addColorStop(5 / 6, '#ff00ff');
    hueGrad.addColorStop(1, '#ff0000');
    ctx.fillStyle = hueGrad;
    ctx.fillRect(0, 0, w, h);

    const satGrad = ctx.createLinearGradient(0, 0, 0, h);
    satGrad.addColorStop(0, 'rgba(255,255,255,0.92)');
    satGrad.addColorStop(0.55, 'rgba(255,255,255,0)');
    satGrad.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.fillStyle = satGrad;
    ctx.fillRect(0, 0, w, h);

    if (hsv.v < 0.99) {
      ctx.fillStyle = `rgba(0,0,0,${Math.max(0, 1 - hsv.v) * 0.72})`;
      ctx.fillRect(0, 0, w, h);
    }

    // Draw indicator ring at current HSV coordinate
    const ix = Math.max(6, Math.min(w - 6, (hsv.h / 360) * w));
    const iy = Math.max(6, Math.min(h - 6, (1 - hsv.v) * h * 0.45 + hsv.s * h * 0.55));
    ctx.beginPath();
    ctx.arc(ix, iy, 7, 0, Math.PI * 2);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(ix, iy, 5, 0, Math.PI * 2);
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = '#0b1214';
    ctx.stroke();
  }, [isOpen, tab, hsv]);

  if (!isOpen) return null;

  const { r, g, b } = hexToRgb(draftColor);

  const pickFromSpectrum = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const cv = specRef.current;
    if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const fx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const fy = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const nextH = fx * 360;
    const nextS = fy < 0.55 ? 0.1 + (fy / 0.55) * 0.9 : 1;
    const nextV = fy < 0.55 ? 1 : Math.max(0.12, 1 - ((fy - 0.55) / 0.45) * 0.88);
    setHsv({ h: nextH, s: nextS, v: nextV });
    setDraftColor(hsvToHex(nextH, nextS, nextV));
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`fixed ${topOffsetClass} left-1/2 -translate-x-1/2 w-[min(308px,calc(100vw-24px))] overflow-y-auto touch-pan-y rounded-[22px] bg-[rgba(14,24,26,0.97)] border border-white/[0.14] shadow-2xl p-3.5 z-50 space-y-3`}
    >
      <LiquidTabs<ColorTab>
        ariaLabel="Renk seçici sekmeleri"
        compact
        value={tab}
        onChange={setTab}
        items={[
          { id: 'swatches', label: 'Kartelalar' },
          { id: 'spectrum', label: 'Spektrum' },
        ]}
      />

      {tab === 'swatches' ? (
        <div className="grid grid-cols-12 rounded-xl overflow-hidden border border-[#1b2c2e]">
          {SWATCH_GRID.flat().map((hex, idx) => {
            const selected = draftColor.toLowerCase() === hex.toLowerCase();
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setDraftColor(hex);
                  const rgb = hexToRgb(hex);
                  setHsv(rgbToHsv(rgb.r, rgb.g, rgb.b));
                }}
                style={{ backgroundColor: hex }}
                className={`h-5 w-full transition-transform ${
                  selected ? 'ring-2 ring-white z-10 scale-110' : ''
                }`}
                aria-label={hex}
              />
            );
          })}
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="relative rounded-xl overflow-hidden border border-[#1b2c2e]">
            <canvas
              ref={specRef}
              width={256}
              height={176}
              onPointerDown={(e) => {
                e.stopPropagation();
                draggingRef.current = true;
                try {
                  e.currentTarget.setPointerCapture(e.pointerId);
                } catch {
                  // ignore
                }
                pickFromSpectrum(e);
              }}
              onPointerMove={(e) => {
                if (draggingRef.current) {
                  e.stopPropagation();
                  pickFromSpectrum(e);
                }
              }}
              onPointerUp={() => {
                draggingRef.current = false;
              }}
              onPointerCancel={() => {
                draggingRef.current = false;
              }}
              className="w-full h-44 cursor-crosshair block touch-none"
            />
          </div>

          <div className="space-y-1">
            <span className="label-caps block">Parlaklık</span>
            <LiquidSlider
              ariaLabel="Renk parlaklığı"
              height={32}
              value={hsv.v}
              onChange={(v) => {
                const next = { ...hsv, v: Math.max(0.08, v) };
                setHsv(next);
                setDraftColor(hsvToHex(next.h, next.s, next.v));
              }}
            />
          </div>
        </div>
      )}

      {/* Hex & RGB Readout */}
      <div className="flex items-center justify-between gap-2 px-1 pt-0.5">
        <div className="flex items-center gap-1 rounded-xl overflow-hidden border border-white/15 shrink-0">
          <span className="w-5 h-7" style={{ backgroundColor: color }} />
          <span className="w-5 h-7" style={{ backgroundColor: draftColor }} />
        </div>
        <div className="grid grid-cols-4 gap-1.5 text-center flex-1">
          <div>
            <p className="text-[9px] text-[#84a0a0]">Altıgen</p>
            <p className="font-display text-[11px] font-medium text-[#e6f2f2] uppercase">
              {draftColor}
            </p>
          </div>
          <div>
            <p className="text-[9px] text-[#84a0a0]">Kırmızı</p>
            <p className="font-display text-[11px] font-medium text-[#e6f2f2] tabular-nums">
              {r}
            </p>
          </div>
          <div>
            <p className="text-[9px] text-[#84a0a0]">Yeşil</p>
            <p className="font-display text-[11px] font-medium text-[#e6f2f2] tabular-nums">
              {g}
            </p>
          </div>
          <div>
            <p className="text-[9px] text-[#84a0a0]">Mavi</p>
            <p className="font-display text-[11px] font-medium text-[#e6f2f2] tabular-nums">
              {b}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Colors + Custom Eyedropper */}
      <div className="flex items-center justify-between pt-2 border-t border-dashed border-[#1b2c2e]">
        <div className="flex items-center gap-2">
          {[0, 1, 2, 3, 4].map((slot) => {
            const rc = recentColors[slot];
            return (
              <button
                key={slot}
                type="button"
                disabled={!rc}
                onClick={() => {
                  if (!rc) return;
                  setDraftColor(rc);
                  const rgb = hexToRgb(rc);
                  setHsv(rgbToHsv(rgb.r, rgb.g, rgb.b));
                }}
                style={rc ? { backgroundColor: rc } : undefined}
                className={`w-7 h-7 rounded-full border transition-transform ${
                  rc
                    ? 'border-white/25 hover:scale-110'
                    : 'border-[#1b2c2e] bg-[#142225]/60 cursor-default'
                }`}
                aria-label={rc || 'Boş renk yuvası'}
              />
            );
          })}
        </div>

        <label
          title="Sistem Renk Seçici"
          className="w-8 h-8 rounded-full bg-[#142225] border border-[#1b2c2e] flex items-center justify-center text-[#e6f2f2] hover:border-[var(--accent)] cursor-pointer"
        >
          <Pipette className="w-4 h-4" />
          <input
            type="color"
            value={draftColor}
            onChange={(e) => {
              const val = e.target.value;
              setDraftColor(val);
              const rgb = hexToRgb(val);
              setHsv(rgbToHsv(rgb.r, rgb.g, rgb.b));
            }}
            className="sr-only"
          />
        </label>
      </div>

      {/* Bottom Cancel / Done */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="py-2 rounded-full bg-[#142225] border border-[#1b2c2e] text-xs font-medium text-[#84a0a0] hover:text-[#e6f2f2]"
        >
          İptal et
        </button>
        <button
          type="button"
          onClick={() => {
            onApply(draftColor);
            onClose();
          }}
          style={{ backgroundColor: accentCss, color: darkCss }}
          className="py-2 rounded-full text-xs font-semibold"
        >
          Bitti
        </button>
      </div>
    </div>
  );
};
