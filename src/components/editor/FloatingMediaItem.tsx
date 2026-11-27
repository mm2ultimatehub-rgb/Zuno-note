import React, { useEffect, useRef, useState } from 'react';
import { Film, Move, Play, RotateCcw, Trash2 } from 'lucide-react';
import { NoteAttachment } from '../../types/notes';

export function isVideoAttachment(att: NoteAttachment): boolean {
  if (att.mediaType === 'video') return true;
  if (att.mediaType === 'image') return false;
  return att.dataUrl.startsWith('data:video/');
}

export function getAttachmentBox(
  att: NoteAttachment,
  index: number
): { x: number; y: number; width: number; height: number; aspectRatio: number } {
  const width = att.width ?? 340;
  const height = att.height ?? 240;
  const x = att.x ?? 56 + (index % 2) * 380;
  const y = att.y ?? 220 + Math.floor(index / 2) * 280;
  const aspectRatio = att.aspectRatio || width / Math.max(height, 1);
  return { x, y, width, height, aspectRatio };
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Dosya okunamadı'));
    };
    reader.onerror = () => reject(reader.error || new Error('Dosya okunamadı'));
    reader.readAsDataURL(file);
  });
}

export async function optimizeImageDataUrl(
  file: File,
  maxEdge = 1800,
  quality = 0.86
): Promise<string> {
  const fallbackDataUrl = await readFileAsDataUrl(file);
  if (
    !file.type.startsWith('image/') ||
    file.type === 'image/gif' ||
    file.type === 'image/svg+xml' ||
    file.size < 350 * 1024
  ) {
    return fallbackDataUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        if (!w || !h) {
          resolve(fallbackDataUrl);
          return;
        }
        const scale = Math.min(1, maxEdge / Math.max(w, h));
        if (scale >= 1 && file.size < 900 * 1024) {
          resolve(fallbackDataUrl);
          return;
        }
        const outW = Math.max(1, Math.round(w * scale));
        const outH = Math.max(1, Math.round(h * scale));
        const canvas = document.createElement('canvas');
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(fallbackDataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, outW, outH);
        const outputType =
          file.type === 'image/png' ? 'image/webp' : 'image/jpeg';
        let optimized = canvas.toDataURL(outputType, quality);
        if (!optimized.startsWith(`data:${outputType}`)) {
          optimized = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(
          optimized.length < fallbackDataUrl.length ? optimized : fallbackDataUrl
        );
      } catch {
        resolve(fallbackDataUrl);
      }
    };
    img.onerror = () => resolve(fallbackDataUrl);
    img.src = fallbackDataUrl;
  });
}

export function detectMediaDimensions(
  dataUrl: string,
  mediaType: 'image' | 'video'
): Promise<{ width: number; height: number; aspectRatio: number }> {
  return new Promise((resolve) => {
    if (mediaType === 'video') {
      const vid = document.createElement('video');
      vid.preload = 'metadata';
      vid.muted = true;
      let done = false;
      const finish = (vw: number, vh: number) => {
        if (done) return;
        done = true;
        const ratio = vw > 0 && vh > 0 ? vw / vh : 16 / 9;
        const width = 360;
        const height = Math.max(120, Math.min(480, Math.round(width / ratio)));
        resolve({ width, height, aspectRatio: ratio });
      };
      const tid = window.setTimeout(() => finish(16, 9), 1200);
      vid.onloadedmetadata = () => {
        window.clearTimeout(tid);
        finish(vid.videoWidth, vid.videoHeight);
      };
      vid.onerror = () => {
        window.clearTimeout(tid);
        finish(16, 9);
      };
      vid.src = dataUrl;
      return;
    }

    const img = new Image();
    img.onload = () => {
      const ratio =
        img.naturalWidth > 0 && img.naturalHeight > 0
          ? img.naturalWidth / img.naturalHeight
          : 4 / 3;
      const width = Math.min(360, Math.max(220, img.naturalWidth || 320));
      const height = Math.max(96, Math.min(520, Math.round(width / ratio)));
      resolve({ width, height, aspectRatio: ratio });
    };
    img.onerror = () => {
      resolve({ width: 320, height: 240, aspectRatio: 4 / 3 });
    };
    img.src = dataUrl;
  });
}

type HandleDir = 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';

interface FloatingMediaItemProps {
  attachment: NoteAttachment;
  index: number;
  logicalWidth: number;
  sheetUnit: number;
  isSelected: boolean;
  isInteractive: boolean;
  isReadMode: boolean;
  accentCss: string;
  darkCss: string;
  onSelect: () => void;
  onPreview: () => void;
  onEnterEditModeToast?: () => void;
  onCommitRect: (rect: { x: number; y: number; width: number; height: number }) => void;
  onDelete: () => void;
}

export const FloatingMediaItem: React.FC<FloatingMediaItemProps> = ({
  attachment,
  index,
  logicalWidth,
  sheetUnit,
  isSelected,
  isInteractive,
  isReadMode,
  accentCss,
  darkCss,
  onSelect,
  onPreview,
  onEnterEditModeToast,
  onCommitRect,
  onDelete,
}) => {
  const baseBox = getAttachmentBox(attachment, index);
  const [liveBox, setLiveBox] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [holdingFeedback, setHoldingFeedback] = useState(false);

  const holdTimerRef = useRef<number | null>(null);
  const pressOriginRef = useRef<{
    clientX: number;
    clientY: number;
    pointerId: number;
    longPressed: boolean;
    wasSelectedAtDown: boolean;
  } | null>(null);

  const dragRef = useRef<{
    dir: HandleDir;
    startClientX: number;
    startClientY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
    ratio: number;
    moved: boolean;
  } | null>(null);

  const liveBoxRef = useRef<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    setLiveBox(null);
    liveBoxRef.current = null;
  }, [attachment.x, attachment.y, attachment.width, attachment.height]);

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current);
    };
  }, []);

  const box = liveBox || {
    x: baseBox.x,
    y: baseBox.y,
    width: baseBox.width,
    height: baseBox.height,
  };

  const isVideo = isVideoAttachment(attachment);
  const safeUnit = sheetUnit > 0 ? sheetUnit : 1;

  const beginDrag = (clientX: number, clientY: number, dir: HandleDir) => {
    dragRef.current = {
      dir,
      startClientX: clientX,
      startClientY: clientY,
      origX: box.x,
      origY: box.y,
      origW: box.width,
      origH: box.height,
      ratio: baseBox.aspectRatio || box.width / Math.max(box.height, 1),
      moved: false,
    };
  };

  const startHandleGesture = (
    e: React.PointerEvent<HTMLElement>,
    dir: HandleDir
  ) => {
    if (isReadMode || !isInteractive) return;
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    beginDrag(e.clientX, e.clientY, dir);
  };

  const updateDrag = (clientX: number, clientY: number) => {
    const g = dragRef.current;
    if (!g) return;

    const dx = (clientX - g.startClientX) / safeUnit;
    const dy = (clientY - g.startClientY) / safeUnit;
    if (Math.abs(dx) > 1.5 || Math.abs(dy) > 1.5) {
      g.moved = true;
    }

    const minW = 96;
    const minH = 72;
    const maxW = Math.max(200, logicalWidth - 16);

    let nextX = g.origX;
    let nextY = g.origY;
    let nextW = g.origW;
    let nextH = g.origH;

    if (g.dir === 'move') {
      nextX = Math.max(0, Math.min(logicalWidth - g.origW, g.origX + dx));
      nextY = Math.max(12, g.origY + dy);
    } else if (g.dir === 'se') {
      nextW = Math.max(minW, Math.min(logicalWidth - g.origX, g.origW + dx));
      nextH = Math.max(minH, Math.round(nextW / g.ratio));
    } else if (g.dir === 'sw') {
      const rawW = Math.max(minW, Math.min(g.origX + g.origW, g.origW - dx));
      nextW = Math.min(maxW, rawW);
      nextH = Math.max(minH, Math.round(nextW / g.ratio));
      nextX = g.origX + (g.origW - nextW);
    } else if (g.dir === 'ne') {
      nextW = Math.max(minW, Math.min(logicalWidth - g.origX, g.origW + dx));
      nextH = Math.max(minH, Math.round(nextW / g.ratio));
      nextY = Math.max(12, g.origY + (g.origH - nextH));
    } else if (g.dir === 'nw') {
      const rawW = Math.max(minW, Math.min(g.origX + g.origW, g.origW - dx));
      nextW = Math.min(maxW, rawW);
      nextH = Math.max(minH, Math.round(nextW / g.ratio));
      nextX = g.origX + (g.origW - nextW);
      nextY = Math.max(12, g.origY + (g.origH - nextH));
    } else if (g.dir === 'e') {
      nextW = Math.max(minW, Math.min(logicalWidth - g.origX, g.origW + dx));
    } else if (g.dir === 'w') {
      const rawW = Math.max(minW, Math.min(g.origX + g.origW, g.origW - dx));
      nextW = Math.min(maxW, rawW);
      nextX = g.origX + (g.origW - nextW);
    } else if (g.dir === 's') {
      nextH = Math.max(minH, g.origH + dy);
    } else if (g.dir === 'n') {
      nextH = Math.max(minH, g.origH - dy);
      nextY = Math.max(12, g.origY + (g.origH - nextH));
    }

    const rounded = {
      x: Math.round(nextX),
      y: Math.round(nextY),
      width: Math.round(nextW),
      height: Math.round(nextH),
    };
    liveBoxRef.current = rounded;
    setLiveBox(rounded);
  };

  const moveHandleGesture = (e: React.PointerEvent<HTMLElement>) => {
    if (!dragRef.current) return;
    e.stopPropagation();
    updateDrag(e.clientX, e.clientY);
  };

  const endHandleGesture = (e: React.PointerEvent<HTMLElement>) => {
    const g = dragRef.current;
    if (!g) return;
    e.stopPropagation();
    dragRef.current = null;
    if (g.moved && liveBoxRef.current) {
      onCommitRect(liveBoxRef.current);
    }
  };

  // Body pointer interactions:
  // - If in read mode -> short tap opens preview viewer
  // - If unselected -> short tap opens preview viewer; holding ~360ms enters Move/Resize Edit Mode (and allows immediate drag!)
  // - If already selected -> dragging body moves media; short tap without dragging opens preview viewer!
  const handleBodyPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isInteractive && !isReadMode) return;
    e.stopPropagation();

    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    pressOriginRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      pointerId: e.pointerId,
      longPressed: false,
      wasSelectedAtDown: isSelected,
    };

    if (isReadMode) return;

    if (isSelected) {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      beginDrag(e.clientX, e.clientY, 'move');
    } else {
      const targetEl = e.currentTarget;
      const pid = e.pointerId;
      setHoldingFeedback(true);
      holdTimerRef.current = window.setTimeout(() => {
        if (!pressOriginRef.current) return;
        pressOriginRef.current.longPressed = true;
        setHoldingFeedback(false);
        try {
          targetEl.setPointerCapture(pid);
        } catch {
          // ignore
        }
        onSelect();
        onEnterEditModeToast?.();
        beginDrag(
          pressOriginRef.current.clientX,
          pressOriginRef.current.clientY,
          'move'
        );
      }, 360);
    }
  };

  const handleBodyPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const origin = pressOriginRef.current;
    if (!origin) return;

    const movedDist = Math.hypot(
      e.clientX - origin.clientX,
      e.clientY - origin.clientY
    );

    if (!origin.wasSelectedAtDown && !origin.longPressed) {
      if (movedDist > 6) {
        if (holdTimerRef.current) {
          window.clearTimeout(holdTimerRef.current);
          holdTimerRef.current = null;
        }
        setHoldingFeedback(false);
        pressOriginRef.current = null;
      }
      return;
    }

    if (dragRef.current) {
      e.stopPropagation();
      updateDrag(e.clientX, e.clientY);
    }
  };

  const handleBodyPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setHoldingFeedback(false);

    const origin = pressOriginRef.current;
    pressOriginRef.current = null;

    if (dragRef.current) {
      const g = dragRef.current;
      dragRef.current = null;
      if (g.moved && liveBoxRef.current) {
        onCommitRect(liveBoxRef.current);
        return;
      }
    }

    if (!origin) return;
    e.stopPropagation();

    const dist = Math.hypot(
      e.clientX - origin.clientX,
      e.clientY - origin.clientY
    );

    // Short tap (not a drag and not just long-press activation) -> view image / play video full screen
    if (!origin.longPressed && dist < 8) {
      onPreview();
    }
  };

  const handleBodyPointerCancel = () => {
    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setHoldingFeedback(false);
    pressOriginRef.current = null;
    dragRef.current = null;
  };

  const handleResetAspect = (e: React.MouseEvent) => {
    e.stopPropagation();
    const targetH = Math.max(72, Math.round(box.width / baseBox.aspectRatio));
    onCommitRect({
      x: box.x,
      y: box.y,
      width: box.width,
      height: targetH,
    });
  };

  const zIndexClass = isSelected ? 'z-30' : isInteractive || isReadMode ? 'z-[25]' : 'z-[15]';

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      style={{
        left: `${(box.x / logicalWidth) * 100}%`,
        top: `${box.y * safeUnit}px`,
        width: `${(box.width / logicalWidth) * 100}%`,
        height: `${box.height * safeUnit}px`,
        borderColor:
          (isSelected || holdingFeedback) && !isReadMode
            ? accentCss
            : 'rgba(27, 44, 46, 0.75)',
      }}
      className={`absolute ${zIndexClass} group rounded-xl border-2 transition-all select-none ${
        isInteractive || isReadMode ? 'pointer-events-auto' : 'pointer-events-none'
      } ${isSelected && !isReadMode ? 'shadow-2xl' : 'hover:border-[#84a0a0]/50'} ${
        holdingFeedback ? 'scale-[0.98]' : ''
      }`}
    >
      {/* Floating Control Pill when selected */}
      {isSelected && !isReadMode && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="no-print absolute -top-10 left-0 right-0 flex items-center justify-between gap-1 pointer-events-auto"
        >
          <div
            onPointerDown={(e) => startHandleGesture(e, 'move')}
            onPointerMove={moveHandleGesture}
            onPointerUp={endHandleGesture}
            onPointerCancel={endHandleGesture}
            style={{ backgroundColor: accentCss, color: darkCss }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-grab active:cursor-grabbing touch-none shadow-lg"
            title="İstediğiniz yere sürükleyin"
          >
            <Move className="w-3 h-3" />
            <span>Taşı</span>
            <span className="opacity-75 font-display tabular-nums">
              {box.width}×{box.height}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleResetAspect}
              title="Doğal en-boy oranına döndür"
              className="p-1.5 rounded-full bg-[rgba(14,24,26,0.94)] border border-white/[0.16] text-[#e6f2f2] hover:border-[var(--accent)] shadow-lg"
              aria-label="Oranı sıfırla"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title="Medyayı kaldır"
              className="p-1.5 rounded-full bg-[rgba(14,24,26,0.94)] border border-white/[0.16] text-[#ff9db8] hover:bg-[#ff9db8]/20 shadow-lg"
              aria-label="Medyayı kaldır"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Media Body: Tap to view/play, Long-press to move & resize */}
      <div
        onPointerDown={handleBodyPointerDown}
        onPointerMove={handleBodyPointerMove}
        onPointerUp={handleBodyPointerUp}
        onPointerCancel={handleBodyPointerCancel}
        onContextMenu={(e) => e.preventDefault()}
        className={`w-full h-full rounded-[10px] overflow-hidden bg-[#0e181a]/70 relative ${
          isSelected && !isReadMode
            ? 'cursor-move touch-none'
            : isInteractive || isReadMode
            ? 'cursor-pointer touch-manipulation'
            : ''
        }`}
        title={
          isReadMode
            ? 'Açmak için dokunun'
            : isSelected
            ? 'Taşımak için sürükleyin · Açmak için kısa dokunun'
            : 'Bakmak için dokunun · Yerini ve boyutunu değiştirmek için basılı tutun'
        }
      >
        {isVideo ? (
          <>
            <video
              src={attachment.dataUrl}
              muted
              playsInline
              preload="metadata"
              className="w-full h-full object-contain bg-black/60 pointer-events-none"
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="w-11 h-11 rounded-full bg-[#0b1214]/80 border border-white/25 flex items-center justify-center text-[#e6f2f2] shadow-xl">
                <Play className="w-5 h-5 fill-current ml-0.5" />
              </span>
            </div>
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/70 text-[10px] text-white flex items-center gap-1 pointer-events-none">
              <Film className="w-3 h-3 text-[var(--accent)]" />
              <span>Video</span>
            </div>
          </>
        ) : (
          <img
            src={attachment.dataUrl}
            alt={attachment.name}
            draggable={false}
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain pointer-events-none"
          />
        )}

        {/* Quick Edit Trigger Badge on hover/touch when unselected */}
        {!isSelected && isInteractive && !isReadMode && (
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
              onEnterEditModeToast?.();
            }}
            title="Taşı ve boyutlandır"
            className="no-print absolute top-2 right-2 px-2.5 py-1.5 rounded-full bg-[#0b1214]/90 border border-white/20 text-[10px] font-medium text-[#e6f2f2] flex items-center gap-1 opacity-85 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:border-[var(--accent)] touch-manipulation"
          >
            <Move className="w-3 h-3 text-[var(--accent)]" />
            <span className="hidden sm:inline">Düzenle</span>
          </button>
        )}
      </div>

      {/* Corner & Edge Resize Handles (shown when selected) */}
      {isSelected && !isReadMode && (
        <>
          {(
            [
              { dir: 'nw', pos: '-top-4 -left-4 cursor-nwse-resize' },
              { dir: 'ne', pos: '-top-4 -right-4 cursor-nesw-resize' },
              { dir: 'sw', pos: '-bottom-4 -left-4 cursor-nesw-resize' },
              { dir: 'se', pos: '-bottom-4 -right-4 cursor-nwse-resize' },
            ] as { dir: HandleDir; pos: string }[]
          ).map((h) => (
            <div
              key={h.dir}
              onPointerDown={(e) => startHandleGesture(e, h.dir)}
              onPointerMove={moveHandleGesture}
              onPointerUp={endHandleGesture}
              onPointerCancel={endHandleGesture}
              className={`no-print absolute ${h.pos} w-10 h-10 flex items-center justify-center touch-none z-10`}
              title="Köşeden boyutlandır"
            >
              <span
                style={{ backgroundColor: accentCss, borderColor: darkCss }}
                className="w-4 h-4 rounded-full border-2 shadow-md"
              />
            </div>
          ))}

          {/* Edge handles for free width / height adjustment */}
          <div
            onPointerDown={(e) => startHandleGesture(e, 'e')}
            onPointerMove={moveHandleGesture}
            onPointerUp={endHandleGesture}
            onPointerCancel={endHandleGesture}
            className="no-print absolute top-1/2 -right-4 -translate-y-1/2 w-8 h-12 flex items-center justify-center cursor-ew-resize touch-none z-10"
            title="Genişliği ayarla"
          >
            <span
              style={{ backgroundColor: accentCss, borderColor: darkCss }}
              className="w-2.5 h-6 rounded-full border shadow"
            />
          </div>
          <div
            onPointerDown={(e) => startHandleGesture(e, 'w')}
            onPointerMove={moveHandleGesture}
            onPointerUp={endHandleGesture}
            onPointerCancel={endHandleGesture}
            className="no-print absolute top-1/2 -left-4 -translate-y-1/2 w-8 h-12 flex items-center justify-center cursor-ew-resize touch-none z-10"
            title="Genişliği ayarla"
          >
            <span
              style={{ backgroundColor: accentCss, borderColor: darkCss }}
              className="w-2.5 h-6 rounded-full border shadow"
            />
          </div>
          <div
            onPointerDown={(e) => startHandleGesture(e, 's')}
            onPointerMove={moveHandleGesture}
            onPointerUp={endHandleGesture}
            onPointerCancel={endHandleGesture}
            className="no-print absolute -bottom-4 left-1/2 -translate-x-1/2 w-12 h-8 flex items-center justify-center cursor-ns-resize touch-none z-10"
            title="Yüksekliği ayarla"
          >
            <span
              style={{ backgroundColor: accentCss, borderColor: darkCss }}
              className="w-6 h-2.5 rounded-full border shadow"
            />
          </div>
        </>
      )}
    </div>
  );
};
