import React, { useEffect, useState } from 'react';
import { Download, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react';
import { NoteAttachment } from '../../types/notes';
import { isVideoAttachment } from './FloatingMediaItem';
import { useExpressive } from '../expressive/shapes';

interface MediaLightboxModalProps {
  attachment: NoteAttachment | null;
  onClose: () => void;
}

export const MediaLightboxModal: React.FC<MediaLightboxModalProps> = ({
  attachment,
  onClose,
}) => {
  const { accentCss, darkCss } = useExpressive();
  const [imgZoom, setImgZoom] = useState(1);

  useEffect(() => {
    setImgZoom(1);
    if (!attachment) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [attachment, onClose]);

  if (!attachment) return null;

  const isVideo = isVideoAttachment(attachment);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = attachment.dataUrl;
    a.download = attachment.name || (isVideo ? 'video.mp4' : 'gorsel.png');
    a.click();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[70] bg-black/90 flex flex-col p-3 sm:p-6"
    >
      {/* Top Bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-[rgba(14,24,26,0.94)] border border-white/[0.14] mb-3 shrink-0"
      >
        <div className="min-w-0">
          <p className="font-display text-sm font-semibold text-[#e6f2f2] truncate">
            {attachment.name || (isVideo ? 'Video' : 'Görsel')}
          </p>
          <p className="text-[11px] text-[#84a0a0]">
            {isVideo ? 'Video oynatıcı' : `Yakınlaştırma: %${Math.round(imgZoom * 100)}`} · Taşımak için sayfada basılı tutun
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!isVideo && (
            <>
              <button
                type="button"
                onClick={() => setImgZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
                className="p-2 rounded-xl bg-[#142225] border border-[#1b2c2e] text-[#e6f2f2] hover:border-[var(--accent)]"
                title="Uzaklaştır"
                aria-label="Uzaklaştır"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setImgZoom(1)}
                className="p-2 rounded-xl bg-[#142225] border border-[#1b2c2e] text-[#e6f2f2] hover:border-[var(--accent)]"
                title="Sıfırla"
                aria-label="Boyutu sıfırla"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setImgZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}
                className="p-2 rounded-xl bg-[#142225] border border-[#1b2c2e] text-[#e6f2f2] hover:border-[var(--accent)]"
                title="Yakınlaştır"
                aria-label="Yakınlaştır"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleDownload}
            style={{ backgroundColor: accentCss, color: darkCss }}
            className="px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
            title="Cihaza indir"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">İndir</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-[#142225] border border-[#1b2c2e] text-[#e6f2f2] hover:text-[#ff9db8]"
            aria-label="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Center Media */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex-1 min-h-0 flex items-center justify-center overflow-auto rounded-2xl"
      >
        {isVideo ? (
          <video
            src={attachment.dataUrl}
            controls
            autoPlay
            playsInline
            className="max-w-full max-h-full rounded-2xl shadow-2xl bg-black"
          />
        ) : (
          <img
            src={attachment.dataUrl}
            alt={attachment.name}
            referrerPolicy="no-referrer"
            style={{
              transform: `scale(${imgZoom})`,
              transformOrigin: 'center center',
            }}
            className="max-w-full max-h-full object-contain rounded-xl transition-transform duration-150 select-none"
          />
        )}
      </div>
    </div>
  );
};
