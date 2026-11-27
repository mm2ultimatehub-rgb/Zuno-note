import React, { useCallback, useEffect, useRef } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CornerDownLeft,
  X,
} from 'lucide-react';
import {
  EditorTool,
  InkStroke,
  NotePage,
  PenStyle,
  StrokeDashStyle,
  StrokePoint,
} from '../../types/notes';
import { drawCanvasStamp, drawCanvasStroke } from '../../utils/shapeRecognition';

interface EasyWritingPadProps {
  page: NotePage;
  padRegion: { x: number; y: number; width: number; height: number };
  penStyle: PenStyle;
  dashStyle: StrokeDashStyle;
  penColor: string;
  strokeWidth: number;
  penOpacity: number;
  tool: EditorTool;
  stylusOnlyDrawing: boolean;
  accentCss: string;
  darkCss: string;
  onStepRegion: (dx: number, dy: number) => void;
  onNewLine: () => void;
  onCommitStroke: (stroke: InkStroke) => void;
  onEraseAt: (x: number, y: number) => void;
  onStylusDetected?: () => void;
  onClose: () => void;
}

export const EasyWritingPad: React.FC<EasyWritingPadProps> = ({
  page,
  padRegion,
  penStyle,
  dashStyle,
  penColor,
  strokeWidth,
  penOpacity,
  tool,
  stylusOnlyDrawing,
  accentCss,
  darkCss,
  onStepRegion,
  onNewLine,
  onCommitStroke,
  onEraseAt,
  onStylusDetected,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeStrokeRef = useRef<InkStroke | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const modeRef = useRef<'draw' | 'erase' | null>(null);

  const pageTheme = page.paperTheme || 'amoled';
  const isLightPaper = pageTheme === 'paper';

  const redraw = useCallback(
    (extraStroke?: InkStroke | null) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const targetW = Math.round(rect.width * dpr);
      const targetH = Math.round(rect.height * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const scaleX = canvas.width / padRegion.width;
      const scaleY = canvas.height / padRegion.height;

      // Subtle ruled writing guide lines every 32 logical px
      ctx.save();
      ctx.strokeStyle = isLightPaper
        ? 'rgba(11, 18, 20, 0.12)'
        : 'rgba(163, 240, 240, 0.14)';
      ctx.lineWidth = Math.max(1, dpr);
      const firstRule = Math.ceil(padRegion.y / 32) * 32;
      for (let ry = firstRule; ry < padRegion.y + padRegion.height; ry += 32) {
        const cy = (ry - padRegion.y) * scaleY;
        ctx.beginPath();
        ctx.moveTo(0, cy);
        ctx.lineTo(canvas.width, cy);
        ctx.stroke();
      }
      ctx.restore();

      ctx.save();
      ctx.translate(-padRegion.x * scaleX, -padRegion.y * scaleY);
      for (const s of page.strokes) {
        drawCanvasStroke(ctx, s, scaleX, scaleY);
      }
      for (const st of page.stamps || []) {
        drawCanvasStamp(ctx, st, scaleX, scaleY);
      }
      if (extraStroke) {
        drawCanvasStroke(ctx, extraStroke, scaleX, scaleY);
      }
      ctx.restore();
    },
    [page.strokes, page.stamps, padRegion, isLightPaper]
  );

  useEffect(() => {
    redraw(activeStrokeRef.current);
    const onResize = () => redraw(activeStrokeRef.current);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [redraw]);

  const toLogicalPoint = (e: React.PointerEvent<HTMLCanvasElement>): StrokePoint => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / Math.max(rect.width, 1);
    const ny = (e.clientY - rect.top) / Math.max(rect.height, 1);
    return {
      x: padRegion.x + nx * padRegion.width,
      y: padRegion.y + ny * padRegion.height,
      pressure: e.pressure && e.pressure > 0 ? e.pressure : 0.5,
      tiltX: e.tiltX || 0,
      tiltY: e.tiltY || 0,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    if (e.pointerType === 'pen') {
      onStylusDetected?.();
    }
    if (stylusOnlyDrawing && e.pointerType === 'touch') {
      return;
    }
    if (activePointerIdRef.current !== null && activePointerIdRef.current !== e.pointerId) {
      return;
    }
    activePointerIdRef.current = e.pointerId;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    const pt = toLogicalPoint(e);
    const barrelErase =
      e.pointerType === 'pen' && ((e.buttons & 32) !== 0 || e.button === 5);

    if (tool === 'eraser' || barrelErase) {
      modeRef.current = 'erase';
      onEraseAt(pt.x, pt.y);
      return;
    }

    modeRef.current = 'draw';
    const isHighlighter = tool === 'highlighter';
    const stroke: InkStroke = {
      id: `ez_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      tool: isHighlighter ? 'highlighter' : 'pen',
      penStyle: isHighlighter ? 'highlighter' : penStyle,
      dashStyle: isHighlighter ? 'solid' : dashStyle,
      color: penColor,
      width: strokeWidth,
      opacity: isHighlighter ? 0.36 : penOpacity,
      points: [pt],
    };
    activeStrokeRef.current = stroke;
    redraw(stroke);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointerIdRef.current !== e.pointerId || !modeRef.current) return;
    e.stopPropagation();
    const pt = toLogicalPoint(e);
    if (modeRef.current === 'erase') {
      onEraseAt(pt.x, pt.y);
      return;
    }
    const stroke = activeStrokeRef.current;
    if (!stroke) return;
    const last = stroke.points[stroke.points.length - 1];
    if (Math.hypot(pt.x - last.x, pt.y - last.y) < 0.8) return;
    stroke.points.push(pt);
    redraw(stroke);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    e.stopPropagation();
    activePointerIdRef.current = null;
    const mode = modeRef.current;
    modeRef.current = null;
    if (mode === 'draw' && activeStrokeRef.current) {
      const finished = activeStrokeRef.current;
      activeStrokeRef.current = null;
      onCommitStroke(finished);
    }
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      className="no-print fixed bottom-16 sm:bottom-5 left-1/2 -translate-x-1/2 z-40 w-[min(520px,calc(100vw-24px))] rounded-[22px] bg-[rgba(14,24,26,0.97)] border border-white/[0.14] shadow-2xl overflow-hidden"
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[#1b2c2e]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="label-caps truncate">Kolay Yazma Pedi</span>
          <span className="font-display text-[10px] text-[#84a0a0] tabular-nums hidden sm:inline">
            X:{Math.round(padRegion.x)} Y:{Math.round(padRegion.y)}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onStepRegion(-120, 0)}
            className="p-1.5 rounded-lg bg-[#142225] text-[#e6f2f2] hover:border-[var(--accent)] border border-[#1b2c2e] touch-manipulation"
            title="Sola kaydır"
            aria-label="Sola kaydır"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onStepRegion(120, 0)}
            className="p-1.5 rounded-lg bg-[#142225] text-[#e6f2f2] hover:border-[var(--accent)] border border-[#1b2c2e] touch-manipulation"
            title="Sağa kaydır"
            aria-label="Sağa kaydır"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onStepRegion(0, -64)}
            className="p-1.5 rounded-lg bg-[#142225] text-[#e6f2f2] hover:border-[var(--accent)] border border-[#1b2c2e] touch-manipulation"
            title="Üst satır"
            aria-label="Üst satır"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onStepRegion(0, 64)}
            className="p-1.5 rounded-lg bg-[#142225] text-[#e6f2f2] hover:border-[var(--accent)] border border-[#1b2c2e] touch-manipulation"
            title="Alt satır"
            aria-label="Alt satır"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onNewLine}
            style={{ backgroundColor: accentCss, color: darkCss }}
            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 touch-manipulation"
            title="Alt satır başına geç"
          >
            <CornerDownLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Satır</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#84a0a0] hover:text-[#e6f2f2] hover:bg-white/[0.06] touch-manipulation"
            aria-label="Kolay yazma pedini kapat"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ touchAction: stylusOnlyDrawing ? 'pan-y' : 'none' }}
        className={`w-full h-32 sm:h-36 block cursor-crosshair ${
          isLightPaper
            ? 'bg-[#f4f7f7]'
            : pageTheme === 'charcoal'
            ? 'bg-[#070b0c]'
            : 'bg-[#0b1214]'
        }`}
      />
    </div>
  );
};
