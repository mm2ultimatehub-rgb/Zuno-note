import React, { useEffect } from 'react';
import {
  ACCENT_SWATCHES,
  LoadStyle,
  SHAPE_DEFS,
  SwitchStyle,
  TabStyle,
  useExpressive,
} from './shapes';
import { LiquidSlider } from './LiquidSlider';
import { SoftMorphLoader } from './SoftMorphLoader';

interface ExpressiveSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExpressiveSettingsPanel: React.FC<ExpressiveSettingsPanelProps> = ({
  isOpen,
  onClose,
}) => {
  const { settings, updateSettings } = useExpressive();

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-label="Görünüm ve Hareket Ayarları"
      onClick={(e) => e.stopPropagation()}
      className="absolute top-14 right-3 sm:right-5 z-50 w-[min(calc(100vw-24px),360px)] p-4 rounded-[18px] bg-[rgba(14,24,26,0.94)] border border-white/[0.14] shadow-[0_18px_50px_rgba(0,0,0,0.55)] flex flex-col gap-4 max-h-[82vh] overflow-y-auto"
    >
      {/* Canlı önizleme */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1b2c2e]">
        <div className="flex flex-col gap-0.5">
          <span className="label-caps">Yumuşak UI</span>
          <span className="text-sm font-medium text-[#e6f2f2]">Canlı kontrol stili</span>
        </div>
        <SoftMorphLoader size={46} />
      </div>

      {/* Sekme göstergesi stili */}
      <div className="flex flex-col gap-2">
        <span className="label-caps">Sekme stili</span>
        <div className="flex p-[3px] rounded-xl bg-white/[0.06] gap-[3px]">
          {(
            [
              { id: 'pill', label: 'Akan hap' },
              { id: 'shape', label: 'Şekil' },
              { id: 'line', label: 'Dalgalı' },
            ] as { id: TabStyle; label: string }[]
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={settings.tabStyle === item.id}
              onClick={() => updateSettings({ tabStyle: item.id })}
              className={`flex-1 py-2 px-2 rounded-[9px] text-xs font-medium transition-colors whitespace-nowrap ${
                settings.tabStyle === item.id
                  ? 'bg-white/[0.16] text-[#e6f2f2]'
                  : 'text-[#84a0a0] hover:text-[#e6f2f2]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Anahtar & Yükleme stili */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <span className="label-caps">Anahtar</span>
          <div className="flex p-[3px] rounded-xl bg-white/[0.06] gap-[3px]">
            {(
              [
                { id: 'shape', label: 'Şekil' },
                { id: 'liquid', label: 'Sıvı' },
              ] as { id: SwitchStyle; label: string }[]
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={settings.switchStyle === item.id}
                onClick={() => updateSettings({ switchStyle: item.id })}
                className={`flex-1 py-1.5 px-2 rounded-[9px] text-xs font-medium transition-colors ${
                  settings.switchStyle === item.id
                    ? 'bg-white/[0.16] text-[#e6f2f2]'
                    : 'text-[#84a0a0]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="label-caps">Yükleme</span>
          <div className="flex p-[3px] rounded-xl bg-white/[0.06] gap-[3px]">
            {(
              [
                { id: 'line', label: 'Çizgi' },
                { id: 'fill', label: 'Dolum' },
              ] as { id: LoadStyle; label: string }[]
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={settings.loadStyle === item.id}
                onClick={() => updateSettings({ loadStyle: item.id })}
                className={`flex-1 py-1.5 px-2 rounded-[9px] text-xs font-medium transition-colors ${
                  settings.loadStyle === item.id
                    ? 'bg-white/[0.16] text-[#e6f2f2]'
                    : 'text-[#84a0a0]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tutamaç şekli */}
      <div className="flex flex-col gap-2">
        <span className="label-caps">Tutamaç şekli</span>
        <div className="flex flex-wrap gap-1.5">
          {SHAPE_DEFS.map((d) => {
            const active = settings.shape === d.id;
            return (
              <button
                key={d.id}
                type="button"
                aria-pressed={active}
                onClick={() => updateSettings({ shape: d.id })}
                className={`px-3 py-1.5 rounded-full border text-xs transition-colors ${
                  active
                    ? 'bg-white/[0.16] text-[#e6f2f2] border-white/30'
                    : 'bg-transparent text-[#84a0a0] border-white/[0.14] hover:text-[#e6f2f2]'
                }`}
              >
                {d.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Renk seçimi */}
      <div className="flex flex-col gap-2">
        <span className="label-caps">Renk</span>
        <div className="flex flex-wrap items-center gap-2.5">
          {ACCENT_SWATCHES.map((sw) => {
            const active = settings.color.toLowerCase() === sw.hex.toLowerCase();
            return (
              <button
                key={sw.hex}
                type="button"
                aria-label={sw.label}
                aria-pressed={active}
                onClick={() => updateSettings({ color: sw.hex })}
                style={{ backgroundColor: sw.hex }}
                className={`w-[30px] h-[30px] rounded-full border-2 transition-transform ${
                  active
                    ? 'border-white shadow-[0_0_0_2px_rgba(255,255,255,0.25)] scale-105'
                    : 'border-transparent hover:scale-105'
                }`}
              />
            );
          })}
          <label className="inline-flex items-center gap-2 text-xs text-[#84a0a0] cursor-pointer ml-1">
            <span>Kendi rengin</span>
            <input
              type="color"
              value={settings.color}
              onChange={(e) => updateSettings({ color: e.target.value })}
              className="w-8 h-7 p-0 border border-white/[0.14] rounded-lg bg-transparent cursor-pointer"
            />
          </label>
        </div>
      </div>

      {/* Dalga yüksekliği & Yaylanma hızı */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="label-caps">Dalga yüksekliği</span>
          <span className="font-display text-xs text-[#e6f2f2] tabular-nums">
            {settings.amp.toFixed(1)}x
          </span>
        </div>
        <LiquidSlider
          ariaLabel="Dalga yüksekliği"
          height={34}
          value={(settings.amp - 0.3) / 1.5}
          onChange={(v) =>
            updateSettings({ amp: Number((0.3 + v * 1.5).toFixed(2)) })
          }
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="label-caps">Yaylanma hızı</span>
          <span className="font-display text-xs text-[#e6f2f2] tabular-nums">
            {settings.speed.toFixed(1)}x
          </span>
        </div>
        <LiquidSlider
          ariaLabel="Yaylanma hızı"
          height={34}
          value={(settings.speed - 0.4) / 1.6}
          onChange={(v) =>
            updateSettings({ speed: Number((0.4 + v * 1.6).toFixed(2)) })
          }
        />
      </div>
    </div>
  );
};
