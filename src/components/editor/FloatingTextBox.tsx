import React, { useEffect, useRef, useState } from 'react';
import { Bold, Minus, Move, Plus, Trash2 } from 'lucide-react';
import { CanvasTextBox } from '../../types/notes';

interface FloatingTextBoxProps {
  box: CanvasTextBox;
  logicalWidth: number;
  sheetUnit: number;
  isLightPaper: boolean;
  isSelected: boolean;
  isInteractive: boolean;
  isReadMode: boolean;
  accentCss: string;
  darkCss: string;
  autoFocus?: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<CanvasTextBox>) => void;
  onDelete: () => void;
}

const BOX_COLORS = ['#e6f2f2', '#a3f0f0', '#ffb454', '#ff9db8', '#9ccaff', '#0b1214'];

export const FloatingTextBox: React.FC<FloatingTextBoxProps> = ({
  box,
  logicalWidth,
  sheetUnit,
  isLightPaper,
  isSelected,
  isInteractive,
  isReadMode,
  accentCss,
  darkCss,
  autoFocus,
  onSelect,
  onChange,
  onDelete,
}) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const latestTextRef = useRef(box.text);
  latestTextRef.current = box.text;
  const [livePos, setLivePos] = useState<{ x: number; y: number; width: number } | null>(
    null
  );
  const livePosRef = useRef<{ x: number; y: number; width: number } | null>(null);
  const gestureRef = useRef<{
    kind: 'move' | 'resizeW';
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    moved: boolean;
  } | null>(null);

  const safeUnit = sheetUnit > 0 ? sheetUnit : 1;
  const x = livePos?.x ?? box.x;
  const y = livePos?.y ?? box.y;
  const width = livePos?.width ?? box.width;
  const fontSize = box.fontSize ?? 16;
  const textColor =
    box.color || (isLightPaper ? '#0b1214' : '#e6f2f2');

  useEffect(() => {
    setLivePos(null);
    livePosRef.current = null;
  }, [box.x, box.y, box.width]);

  useEffect(() => {
    if (autoFocus && inputRef.current && !isReadMode) {
      inputRef.current.focus();
    }
  }, [autoFocus, isReadMode]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, 34)}px`;
  }, [box.text, width, fontSize, safeUnit]);

  const startGesture = (
    e: React.PointerEvent<HTMLElement>,
    kind: 'move' | 'resizeW'
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
    gestureRef.current = {
      kind,
      startX: e.clientX,
      startY: e.clientY,
      origX: x,
      origY: y,
      origW: width,
      moved: false,
    };
  };

  const moveGesture = (e: React.PointerEvent<HTMLElement>) => {
    const g = gestureRef.current;
    if (!g) return;
    e.stopPropagation();
    const dx = (e.clientX - g.startX) / safeUnit;
    const dy = (e.clientY - g.startY) / safeUnit;
    if (Math.abs(dx) > 1.5 || Math.abs(dy) > 1.5) g.moved = true;

    let next = { x: g.origX, y: g.origY, width: g.origW };
    if (g.kind === 'move') {
      next = {
        x: Math.round(Math.max(8, Math.min(logicalWidth - g.origW - 8, g.origX + dx))),
        y: Math.round(Math.max(12, g.origY + dy)),
        width: g.origW,
      };
    } else {
      next = {
        x: g.origX,
        y: g.origY,
        width: Math.round(Math.max(110, Math.min(logicalWidth - g.origX - 8, g.origW + dx))),
      };
    }
    livePosRef.current = next;
    setLivePos(next);
  };

  const endGesture = (e: React.PointerEvent<HTMLElement>) => {
    const g = gestureRef.current;
    if (!g) return;
    e.stopPropagation();
    gestureRef.current = null;
    if (g.moved && livePosRef.current) {
      onChange(livePosRef.current);
    }
  };

  const zClass = isSelected ? 'z-[35]' : isInteractive ? 'z-[26]' : 'z-[16]';

  return (
    <div
      ref={rootRef}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => {
        if (!isInteractive) return;
        e.stopPropagation();
        onSelect();
      }}
      style={{
        left: `${(x / logicalWidth) * 100}%`,
        top: `${y * safeUnit}px`,
        width: `${(width / logicalWidth) * 100}%`,
        borderColor: isSelected && !isReadMode ? accentCss : 'transparent',
      }}
      className={`absolute ${zClass} rounded-xl border border-dashed transition-colors ${
        isInteractive ? 'pointer-events-auto' : 'pointer-events-none'
      } ${isSelected && !isReadMode ? 'bg-[#0b1214]/45 backdrop-blur-[2px]' : ''}`}
    >
      {/* Floating toolbar when selected */}
      {isSelected && !isReadMode && (
        <div
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="no-print absolute -top-10 left-0 flex flex-wrap items-center gap-1 pointer-events-auto z-10"
        >
          <div
            onPointerDown={(e) => startGesture(e, 'move')}
            onPointerMove={moveGesture}
            onPointerUp={endGesture}
            onPointerCancel={endGesture}
            style={{ backgroundColor: accentCss, color: darkCss }}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-semibold cursor-grab active:cursor-grabbing touch-none shadow-lg select-none"
            title="Metin kutusunu taşı"
          >
            <Move className="w-3 h-3" />
            <span>Taşı</span>
          </div>

          <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[rgba(14,24,26,0.96)] border border-white/[0.16] shadow-lg">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onChange({ fontSize: Math.max(12, fontSize - 2) })}
              className="p-1.5 text-[#84a0a0] hover:text-[#e6f2f2] touch-manipulation"
              title="Küçült"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="font-display text-[10px] text-[#e6f2f2] px-1 tabular-nums">
              {fontSize}
            </span>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onChange({ fontSize: Math.min(36, fontSize + 2) })}
              className="p-1.5 text-[#84a0a0] hover:text-[#e6f2f2] touch-manipulation"
              title="Büyüt"
            >
              <Plus className="w-3 h-3" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onChange({ bold: !box.bold })}
              className={`p-1.5 rounded-full touch-manipulation ${
                box.bold ? 'text-[var(--accent)]' : 'text-[#84a0a0] hover:text-[#e6f2f2]'
              }`}
              title="Kalın"
            >
              <Bold className="w-3 h-3" />
            </button>
          </div>

          <div className="flex items-center gap-1 px-1.5 py-1 rounded-full bg-[rgba(14,24,26,0.96)] border border-white/[0.16] shadow-lg">
            {BOX_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onChange({ color: c })}
                style={{ backgroundColor: c }}
                className={`w-4 h-4 rounded-full border touch-manipulation ${
                  textColor.toLowerCase() === c.toLowerCase()
                    ? 'border-white scale-115'
                    : 'border-white/25'
                }`}
                aria-label={c}
              />
            ))}
          </div>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onDelete}
            className="p-1.5 rounded-full bg-[rgba(14,24,26,0.96)] border border-white/[0.16] text-[#ff9db8] hover:bg-[#ff9db8]/20 shadow-lg touch-manipulation"
            title="Metin kutusunu sil"
            aria-label="Metin kutusunu sil"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {isReadMode ? (
        <div
          style={{
            color: textColor,
            fontSize: `${Math.round(fontSize * safeUnit)}px`,
            fontWeight: box.bold ? 600 : 400,
          }}
          className="px-2 py-1 whitespace-pre-wrap break-words leading-snug"
        >
          {box.text}
        </div>
      ) : (
        <textarea
          ref={inputRef}
          value={box.text}
          onFocus={onSelect}
          onChange={(e) => onChange({ text: e.target.value })}
          onBlur={() => {
            window.setTimeout(() => {
              if (
                !rootRef.current?.contains(document.activeElement) &&
                !gestureRef.current &&
                !latestTextRef.current.trim()
              ) {
                onDelete();
              }
            }, 90);
          }}
          placeholder="Buraya yazın..."
          rows={1}
          style={{
            color: textColor,
            fontSize: `${Math.round(fontSize * safeUnit)}px`,
            fontWeight: box.bold ? 600 : 400,
          }}
          className="w-full resize-none bg-transparent px-2 py-1 leading-snug focus:outline-none placeholder:opacity-45 overflow-hidden"
        />
      )}

      {/* Right edge width resize handle */}
      {isSelected && !isReadMode && (
        <div
          onPointerDown={(e) => startGesture(e, 'resizeW')}
          onPointerMove={moveGesture}
          onPointerUp={endGesture}
          onPointerCancel={endGesture}
          className="no-print absolute top-1/2 -right-4 -translate-y-1/2 w-8 h-11 flex items-center justify-center cursor-ew-resize touch-none"
          title="Genişliği ayarla"
        >
          <span
            style={{ backgroundColor: accentCss, borderColor: darkCss }}
            className="w-2.5 h-5 rounded-full border shadow"
          />
        </div>
      )}
    </div>
  );
};
