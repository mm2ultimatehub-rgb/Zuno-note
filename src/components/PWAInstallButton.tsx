import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useExpressive } from './expressive/shapes';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const { accentCss, darkCss } = useExpressive();

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        title="Uygulamayı Cihaza Yükle"
        style={{ backgroundColor: accentCss, color: darkCss }}
        className={`flex items-center justify-center gap-2.5 rounded-full font-semibold transition-transform active:scale-95 min-h-[44px] ${
          compact ? 'w-11 h-11 p-0' : 'w-full px-4 py-2.5 text-sm'
        }`}
      >
        <Download className="w-4 h-4 shrink-0" />
        {!compact && <span className="whitespace-nowrap truncate">Uygulamayı Yükle</span>}
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          title="Ana Ekrana Ekle (iOS)"
          className={`flex items-center justify-center gap-2.5 rounded-full border border-[#1b2c2e] bg-[#142225] text-[#e6f2f2] hover:border-[var(--accent)] font-medium transition-colors min-h-[44px] ${
            compact ? 'w-11 h-11 p-0' : 'w-full px-4 py-2.5 text-sm'
          }`}
        >
          <Smartphone className="w-4 h-4 shrink-0 text-[var(--accent)]" />
          {!compact && <span className="whitespace-nowrap truncate">Ana Ekrana Ekle</span>}
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
            <div className="w-full max-w-sm rounded-[18px] bg-[#0e181a] border border-white/[0.14] p-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-semibold text-[#e6f2f2]">
                  iPhone / iPad Kurulumu
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-2 rounded-lg text-[#84a0a0] hover:text-[#e6f2f2]"
                  aria-label="Kapat"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ol className="mt-4 space-y-2.5 text-sm text-[#84a0a0] list-decimal list-inside">
                <li>
                  Safari alt araç çubuğundaki <strong className="text-[#e6f2f2]">Paylaş</strong> simgesine dokunun.
                </li>
                <li>
                  Aşağı kaydırıp <strong className="text-[#e6f2f2]">Ana Ekrana Ekle</strong> seçeneğine dokunun.
                </li>
                <li>
                  Sağ üstten <strong className="text-[#e6f2f2]">Ekle</strong> diyerek çevrimdışı uygulama olarak kullanın.
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                style={{ backgroundColor: accentCss, color: darkCss }}
                className="mt-5 w-full rounded-full py-2.5 text-sm font-semibold"
              >
                Anladım
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
