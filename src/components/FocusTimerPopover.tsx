import React, { useEffect, useState } from 'react';
import { Pause, Play, RotateCcw, Timer, X } from 'lucide-react';
import { useExpressive } from './expressive/shapes';

interface FocusTimerPopoverProps {
  onNotify: (msg: string) => void;
}

function playSoftChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.18);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.65);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.7);
  } catch {
    // Ignore audio errors
  }
}

export const FocusTimerPopover: React.FC<FocusTimerPopoverProps> = ({
  onNotify,
}) => {
  const { accentCss, darkCss } = useExpressive();
  const [isOpen, setIsOpen] = useState(false);
  const [presetMin, setPresetMin] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setRunning(false);
          playSoftChime();
          onNotify('Odak süresi tamamlandı!');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, onNotify]);

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secs = String(secondsLeft % 60).padStart(2, '0');

  const selectPreset = (m: number) => {
    setRunning(false);
    setPresetMin(m);
    setSecondsLeft(m * 60);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        title="Odak Zamanlayıcı (Pomodoro)"
        style={
          running
            ? { backgroundColor: accentCss, color: darkCss }
            : undefined
        }
        className={`h-9 px-2.5 rounded-full flex items-center gap-1.5 text-xs font-medium transition-colors ${
          running
            ? ''
            : 'text-[#84a0a0] hover:text-[#e6f2f2] hover:bg-[#142225]'
        }`}
        aria-label="Odak Zamanlayıcı"
      >
        <Timer className="w-4 h-4" />
        {(running || secondsLeft !== presetMin * 60) && (
          <span className="font-display tabular-nums">
            {mins}:{secs}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 top-12 w-60 rounded-[18px] bg-[rgba(14,24,26,0.96)] border border-white/[0.14] shadow-2xl p-4 z-50 space-y-3.5"
          >
          <div className="flex items-center justify-between">
            <span className="label-caps">Odak Sayacı</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-full text-[#84a0a0] hover:text-[#e6f2f2]"
              aria-label="Kapat"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="font-display text-3xl font-semibold text-center text-[#e6f2f2] tabular-nums py-1">
            {mins}:{secs}
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {[25, 15, 5].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => selectPreset(m)}
                style={
                  presetMin === m
                    ? { backgroundColor: accentCss, color: darkCss }
                    : undefined
                }
                className={`py-1.5 rounded-full text-xs font-medium transition-colors ${
                  presetMin === m
                    ? ''
                    : 'bg-[#142225] border border-[#1b2c2e] text-[#84a0a0] hover:text-[#e6f2f2]'
                }`}
              >
                {m} dk
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRunning((r) => !r)}
              style={{ backgroundColor: accentCss, color: darkCss }}
              className="flex-1 h-9 rounded-full flex items-center justify-center gap-1.5 text-xs font-semibold"
            >
              {running ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Duraklat</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Başlat</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => selectPreset(presetMin)}
              className="w-9 h-9 rounded-full bg-[#142225] border border-[#1b2c2e] flex items-center justify-center text-[#84a0a0] hover:text-[#e6f2f2]"
              title="Sıfırla"
              aria-label="Sıfırla"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
          </div>
        </>
      )}
    </div>
  );
};
