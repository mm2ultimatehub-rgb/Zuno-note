import React, { useEffect, useState } from 'react';
import { Delete, Lock, ShieldCheck, X } from 'lucide-react';
import { useExpressive } from './expressive/shapes';

interface PinLockModalProps {
  isOpen: boolean;
  mode: 'unlock' | 'setup';
  title?: string;
  onSuccess: () => void;
  onClose: () => void;
  onSubmitPin: (pin: string) => Promise<boolean>;
}

export const PinLockModal: React.FC<PinLockModalProps> = ({
  isOpen,
  mode,
  title,
  onSuccess,
  onClose,
  onSubmitPin,
}) => {
  const { accentCss, darkCss } = useExpressive();
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setFirstPin(null);
      setErrorMsg(null);
      setBusy(false);
    }
  }, [isOpen, mode]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (/^\d$/.test(e.key)) {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        setPin((p) => p.slice(0, -1));
        setErrorMsg(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const handleDigit = async (digit: string) => {
    if (busy || pin.length >= 4) return;
    const next = pin + digit;
    setPin(next);
    setErrorMsg(null);

    if (next.length === 4) {
      if (mode === 'setup' && !firstPin) {
        setFirstPin(next);
        setPin('');
        return;
      }

      if (mode === 'setup' && firstPin) {
        if (next !== firstPin) {
          setErrorMsg('PIN kodları eşleşmedi, tekrar deneyin.');
          setFirstPin(null);
          setPin('');
          return;
        }
      }

      setBusy(true);
      const ok = await onSubmitPin(next);
      setBusy(false);
      if (ok) {
        onSuccess();
      } else {
        setErrorMsg('Hatalı PIN kodu.');
        setPin('');
      }
    }
  };

  if (!isOpen) return null;

  const subtitle =
    mode === 'setup'
      ? firstPin
        ? 'Doğrulamak için 4 haneli PIN kodunu tekrar girin'
        : 'Notlarınızı kilitlemek için 4 haneli bir PIN belirleyin'
      : 'Bu kilitli notu açmak için PIN kodunuzu girin';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xs rounded-[22px] bg-[rgba(14,24,26,0.96)] border border-white/[0.14] shadow-2xl p-5 space-y-5 text-center"
      >
        <div className="flex items-center justify-between">
          <span className="label-caps">
            {mode === 'setup' ? 'PIN Oluştur' : 'Kilitli Not'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[#84a0a0] hover:text-[#e6f2f2] hover:bg-white/[0.08]"
            aria-label="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-2">
          <div
            style={{ backgroundColor: accentCss, color: darkCss }}
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
          >
            {mode === 'setup' ? (
              <ShieldCheck className="w-6 h-6" />
            ) : (
              <Lock className="w-6 h-6" />
            )}
          </div>
          {title && (
            <h3 className="font-display text-base font-semibold text-[#e6f2f2] truncate max-w-full">
              {title}
            </h3>
          )}
          <p className="text-xs text-[#84a0a0] leading-relaxed">{subtitle}</p>
        </div>

        {/* PIN dots */}
        <div className="flex items-center justify-center gap-3.5 py-1">
          {[0, 1, 2, 3].map((idx) => {
            const filled = idx < pin.length;
            return (
              <span
                key={idx}
                style={
                  filled
                    ? { backgroundColor: accentCss, borderColor: accentCss }
                    : undefined
                }
                className={`w-3.5 h-3.5 rounded-full border transition-transform ${
                  filled ? 'scale-110' : 'border-[#84a0a0]/50 bg-transparent'
                }`}
              />
            );
          })}
        </div>

        {errorMsg && (
          <p className="text-xs font-medium text-[#ff9db8]">{errorMsg}</p>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2.5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => handleDigit(d)}
              className="font-display h-12 rounded-2xl bg-[#142225] border border-[#1b2c2e] text-lg font-semibold text-[#e6f2f2] hover:border-[var(--accent)] active:scale-95 transition-transform"
            >
              {d}
            </button>
          ))}
          <div />
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="font-display h-12 rounded-2xl bg-[#142225] border border-[#1b2c2e] text-lg font-semibold text-[#e6f2f2] hover:border-[var(--accent)] active:scale-95 transition-transform"
          >
            0
          </button>
          <button
            type="button"
            onClick={() => {
              setPin((p) => p.slice(0, -1));
              setErrorMsg(null);
            }}
            className="h-12 rounded-2xl bg-[#142225] border border-[#1b2c2e] flex items-center justify-center text-[#84a0a0] hover:text-[#e6f2f2] active:scale-95 transition-transform"
            aria-label="Sil"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
