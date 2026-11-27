import React from 'react';
import { Check, Star, X } from 'lucide-react';
import { FavoritePenPreset, PenStyle, StrokeDashStyle } from '../../types/notes';
import { LiquidSlider } from '../expressive/LiquidSlider';
import { SoftSwitch } from '../expressive/SoftSwitch';

interface PenStudioPopoverProps {
  isOpen: boolean;
  topOffsetClass?: string;
  penStyle: PenStyle;
  dashStyle: StrokeDashStyle;
  strokeWidth: number;
  penOpacity: number;
  penColor: string;
  smartShapeEnabled: boolean;
  autoStylusEnabled: boolean;
  stylusOnlyDrawing: boolean;
  favoritePens: FavoritePenPreset[];
  quickColors: string[];
  onSelectPenStyle: (style: PenStyle) => void;
  onSelectDashStyle: (dash: StrokeDashStyle) => void;
  onChangeWidth: (w: number) => void;
  onChangeOpacity: (op: number) => void;
  onToggleSmartShape: (next: boolean) => void;
  onToggleAutoStylus: (next: boolean) => void;
  onToggleStylusOnly: (next: boolean) => void;
  onSaveFavoritePen: () => void;
  onApplyFavoritePen: (preset: FavoritePenPreset) => void;
  onDeleteFavoritePen: (id: string) => void;
  onSelectColor: (hex: string) => void;
  onOpenColorPicker: () => void;
  onClose: () => void;
}

const ILLUSTRATED_PENS: {
  id: PenStyle;
  label: string;
  renderNib: (color: string) => React.ReactNode;
}[] = [
  {
    id: 'fountain',
    label: 'Dolma',
    renderNib: (color) => (
      <svg viewBox="0 0 32 54" className="w-7 h-12">
        <path d="M16 4 L23 22 L19 30 L13 30 L9 22 Z" fill="#b7c6c8" />
        <line x1="16" y1="4" x2="16" y2="18" stroke="#0b1214" strokeWidth="1.4" />
        <circle cx="16" cy="18" r="1.8" fill="#0b1214" />
        <rect x="11" y="30" width="10" height="5" rx="1.5" fill={color} />
        <rect x="10" y="35" width="12" height="19" rx="3" fill="#2c3e42" />
      </svg>
    ),
  },
  {
    id: 'marker',
    label: 'Keçeli',
    renderNib: (color) => (
      <svg viewBox="0 0 32 54" className="w-7 h-12">
        <path d="M12 7 L20 7 L22 18 L10 18 Z" fill={color} />
        <rect x="9" y="18" width="14" height="7" rx="2" fill="#9fb2b4" />
        <rect x="8" y="25" width="16" height="29" rx="3.5" fill="#1e2d30" />
        <rect x="8" y="31" width="16" height="5" fill={color} opacity="0.85" />
      </svg>
    ),
  },
  {
    id: 'ballpoint',
    label: 'Tükenmez',
    renderNib: (color) => (
      <svg viewBox="0 0 32 54" className="w-7 h-12">
        <circle cx="16" cy="6" r="1.8" fill={color} />
        <path d="M14 7 L18 7 L20 18 L12 18 Z" fill="#cdd9db" />
        <path d="M11 18 L21 18 L22 30 L10 30 Z" fill={color} />
        <rect x="10" y="30" width="12" height="24" rx="3" fill={color} opacity="0.85" />
      </svg>
    ),
  },
  {
    id: 'pencil',
    label: 'Kurşun',
    renderNib: (color) => (
      <svg viewBox="0 0 32 54" className="w-7 h-12">
        <path d="M16 4 L19 11 L13 11 Z" fill={color} />
        <path d="M13 11 L19 11 L22 22 L10 22 Z" fill="#e5c8a8" />
        <rect x="10" y="22" width="12" height="32" fill="#ffb454" />
        <rect x="14" y="22" width="4" height="32" fill="#e09238" />
      </svg>
    ),
  },
  {
    id: 'brush',
    label: 'Fırça',
    renderNib: (color) => (
      <svg viewBox="0 0 32 54" className="w-7 h-12">
        <path d="M16 3 Q22 14 19 23 L13 23 Q10 14 16 3 Z" fill={color} />
        <rect x="12" y="23" width="8" height="7" rx="1.5" fill="#9fb2b4" />
        <rect x="11" y="30" width="10" height="24" rx="4" fill="#2d4448" />
      </svg>
    ),
  },
  {
    id: 'calligraphy',
    label: 'Kaligrafi',
    renderNib: (color) => (
      <svg viewBox="0 0 32 54" className="w-7 h-12">
        <path d="M11 8 L21 4 L22 22 L10 22 Z" fill="#cfdadd" />
        <line x1="16" y1="6" x2="16" y2="17" stroke="#0b1214" strokeWidth="1.4" />
        <rect x="10" y="22" width="12" height="5" rx="1.5" fill={color} />
        <rect x="9" y="27" width="14" height="27" rx="3.5" fill="#1b2c2e" />
      </svg>
    ),
  },
];

const EXTRA_EFFECT_PENS: { id: PenStyle; label: string }[] = [
  { id: 'watercolor', label: 'Sulu Boya' },
  { id: 'crayon', label: 'Pastel' },
  { id: 'charcoal', label: 'Kömür' },
  { id: 'rainbow', label: 'Gökkuşağı' },
  { id: 'dottedLine', label: 'İnci Nokta' },
  { id: 'neon', label: 'Neon' },
  { id: 'spray', label: 'Sprey' },
];

export const PenStudioPopover: React.FC<PenStudioPopoverProps> = ({
  isOpen,
  topOffsetClass = 'top-[152px] max-h-[calc(100dvh-166px)]',
  penStyle,
  dashStyle,
  strokeWidth,
  penOpacity,
  penColor,
  smartShapeEnabled,
  autoStylusEnabled,
  stylusOnlyDrawing,
  favoritePens,
  quickColors,
  onSelectPenStyle,
  onSelectDashStyle,
  onChangeWidth,
  onChangeOpacity,
  onToggleSmartShape,
  onToggleAutoStylus,
  onToggleStylusOnly,
  onSaveFavoritePen,
  onApplyFavoritePen,
  onDeleteFavoritePen,
  onSelectColor,
  onOpenColorPicker,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`fixed ${topOffsetClass} left-1/2 -translate-x-1/2 w-[min(340px,calc(100vw-24px))] overflow-y-auto touch-pan-y rounded-[22px] bg-[rgba(14,24,26,0.97)] border border-white/[0.14] shadow-2xl p-4 z-50 space-y-3.5`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="label-caps">Kalem & Fırça Stüdyosu</span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onSaveFavoritePen}
            title="Bu kalem ayarını favorilere ekle"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#142225] border border-[#1b2c2e] text-[11px] font-medium text-[var(--accent)] hover:border-[var(--accent)] transition-colors"
          >
            <Star className="w-3 h-3 fill-current" />
            <span>Favorile</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-[#142225] text-[#84a0a0] hover:text-[#e6f2f2]"
            aria-label="Kapat"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {favoritePens.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {favoritePens.map((fp) => {
            const isMatch =
              fp.penStyle === penStyle &&
              fp.color.toLowerCase() === penColor.toLowerCase() &&
              fp.width === strokeWidth;
            return (
              <div
                key={fp.id}
                className={`inline-flex items-center gap-1 pl-2 pr-1 py-1 rounded-full border text-[10.5px] shrink-0 transition-colors ${
                  isMatch
                    ? 'bg-white/[0.12] border-[var(--accent)] text-[#e6f2f2]'
                    : 'bg-[#142225] border-[#1b2c2e] text-[#84a0a0] hover:text-[#e6f2f2]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onApplyFavoritePen(fp)}
                  className="inline-flex items-center gap-1.5"
                >
                  <span
                    className="w-3 h-3 rounded-full border border-white/30 shrink-0"
                    style={{ backgroundColor: fp.color }}
                  />
                  <span className="font-medium truncate max-w-[78px]">{fp.label}</span>
                  <span className="font-display opacity-75 tabular-nums">{fp.width}</span>
                </button>
                {favoritePens.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onDeleteFavoritePen(fp.id)}
                    className="p-0.5 rounded-full hover:text-[#ff9db8]"
                    aria-label="Favoriyi kaldır"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Illustrated Upright Pen Nibs */}
      <div className="flex items-end justify-between gap-0.5 px-1 pt-2 pb-1 border-b border-[#1b2c2e] bg-[#0b1214]/50 rounded-2xl overflow-x-auto no-scrollbar">
        {ILLUSTRATED_PENS.map((pen) => {
          const active = penStyle === pen.id;
          return (
            <button
              key={pen.id}
              type="button"
              onClick={() => onSelectPenStyle(pen.id)}
              title={pen.label}
              className={`flex flex-col items-center gap-1 px-1 pt-1 pb-1.5 rounded-xl transition-transform shrink-0 ${
                active
                  ? '-translate-y-1.5 scale-105 bg-white/[0.08]'
                  : 'opacity-70 hover:opacity-100 hover:-translate-y-0.5'
              }`}
            >
              {pen.renderNib(penColor)}
              <span className="text-[9.5px] font-medium text-[#e6f2f2]">
                {pen.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Extra Artistic Brushes */}
      <div className="space-y-1.5">
        <span className="label-caps block">Sanatsal Fırçalar & Efektler</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {EXTRA_EFFECT_PENS.map((ef) => {
            const active = penStyle === ef.id;
            return (
              <button
                key={ef.id}
                type="button"
                onClick={() => onSelectPenStyle(ef.id)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                  active
                    ? 'bg-[var(--accent)] text-[#0b1214] font-semibold'
                    : 'bg-[#142225] border border-[#1b2c2e] text-[#e6f2f2] hover:border-[var(--accent)]'
                }`}
              >
                {ef.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Thickness Slider */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="label-caps">Kalınlık</span>
          <span className="font-display text-xs font-semibold text-[#e6f2f2] tabular-nums">
            {strokeWidth}px · %{Math.round(penOpacity * 100)}
          </span>
        </div>
        <LiquidSlider
          ariaLabel="Kalem kalınlığı"
          height={34}
          value={(strokeWidth - 1.5) / 14.5}
          onChange={(v) => onChangeWidth(Math.round(1.5 + v * 14.5))}
        />
        <LiquidSlider
          ariaLabel="Mürekkep opaklığı"
          height={28}
          value={(penOpacity - 0.2) / 0.8}
          onChange={(v) => onChangeOpacity(Number((0.2 + v * 0.8).toFixed(2)))}
        />
      </div>

      {/* Dash Style Pills (Solid / Dashed / Dotted) */}
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            { id: 'solid', label: 'Düz', preview: 'border-solid' },
            { id: 'dashed', label: 'Kesikli', preview: 'border-dashed' },
            { id: 'dotted', label: 'Noktalı', preview: 'border-dotted' },
          ] as { id: StrokeDashStyle; label: string; preview: string }[]
        ).map((d) => {
          const active = dashStyle === d.id;
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => onSelectDashStyle(d.id)}
              title={d.label}
              className={`h-9 px-3 rounded-full border flex items-center justify-center transition-colors ${
                active
                  ? 'bg-white/[0.14] border-white/40'
                  : 'bg-[#142225] border-[#1b2c2e] hover:border-white/20'
              }`}
            >
              <span className={`w-full border-t-[3px] border-[#e6f2f2] ${d.preview}`} />
            </button>
          );
        })}
      </div>

      {/* Samsung Notes Stylus & Smart Shape Toggles */}
      <div className="space-y-2 pt-1 border-t border-[#1b2c2e]">
        <div className="flex items-center justify-between px-1 py-0.5">
          <span className="text-xs font-medium text-[#e6f2f2]">
            Çizgileri düzleştir (Akıllı Şekil)
          </span>
          <SoftSwitch
            checked={smartShapeEnabled}
            onChange={onToggleSmartShape}
            ariaLabel="Çizgileri düzleştir"
            size="sm"
          />
        </div>
        <div className="flex items-center justify-between px-1 py-0.5">
          <span className="text-xs font-medium text-[#e6f2f2]">
            Kalem dokununca otomatik geç
          </span>
          <SoftSwitch
            checked={autoStylusEnabled}
            onChange={onToggleAutoStylus}
            ariaLabel="Kalem dokununca otomatik geç"
            size="sm"
          />
        </div>
        <div className="flex items-center justify-between px-1 py-0.5">
          <span className="text-xs font-medium text-[#e6f2f2]">
            Yalnızca kalemle çiz (Avuç içi reddi)
          </span>
          <SoftSwitch
            checked={stylusOnlyDrawing}
            onChange={onToggleStylusOnly}
            ariaLabel="Yalnızca kalemle çiz"
            size="sm"
          />
        </div>
      </div>

      {/* Quick 8 Color Swatches + Rainbow Wheel Button */}
      <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-[#1b2c2e]">
        {quickColors.slice(0, 8).map((hex) => {
          const active = penColor.toLowerCase() === hex.toLowerCase();
          return (
            <button
              key={hex}
              type="button"
              onClick={() => onSelectColor(hex)}
              style={{ backgroundColor: hex }}
              className={`w-6 h-6 rounded-full border transition-transform shrink-0 flex items-center justify-center ${
                active ? 'border-white scale-115 ring-2 ring-white/40' : 'border-white/15'
              }`}
              aria-label={hex}
            >
              {active && <Check className="w-3.5 h-3.5 text-[#0b1214] drop-shadow" />}
            </button>
          );
        })}
        <button
          type="button"
          onClick={onOpenColorPicker}
          title="Kartelalar ve Spektrum Aç"
          className="w-6 h-6 rounded-full border border-white/30 shrink-0 hover:scale-110 transition-transform"
          style={{
            background:
              'conic-gradient(#ff4d4d, #ffb454, #fde047, #a6f0a6, #67e8f9, #818cf8, #f472b6, #ff4d4d)',
          }}
          aria-label="Tüm renk kartelasını aç"
        />
      </div>
    </div>
  );
};
