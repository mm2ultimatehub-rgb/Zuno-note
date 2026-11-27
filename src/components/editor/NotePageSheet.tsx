import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckSquare, Square, Trash2, Volume2, X } from 'lucide-react';
import {
  CanvasStamp,
  CanvasTextBox,
  EditorTool,
  InkStroke,
  NoteAttachment,
  NotePage,
  PageHistorySnapshot,
  PenStyle,
  ShapeKind,
  StampKind,
  StrokeDashStyle,
  StrokePoint,
  VoiceRecording,
} from '../../types/notes';
import {
  buildShapePoints,
  drawCanvasStamp,
  drawCanvasStroke,
  drawLaserTrail,
  LaserTrailPoint,
  recognizeAndBeautifyShape,
} from '../../utils/shapeRecognition';
import { MarkdownPreview } from '../MarkdownPreview';
import { useExpressive } from '../expressive/shapes';
import { FloatingMediaItem, getAttachmentBox } from './FloatingMediaItem';
import { FloatingTextBox } from './FloatingTextBox';

interface NotePageSheetProps {
  page: NotePage;
  pageIndex: number;
  totalPages: number;
  isActive: boolean;
  isReadMode: boolean;
  isFullWidth: boolean;
  logicalWidth: number;
  logicalHeight: number;
  fontSize: number;
  isMonospace?: boolean;
  tool: EditorTool;
  penStyle: PenStyle;
  dashStyle: StrokeDashStyle;
  shapeKind: ShapeKind;
  shapeFilled: boolean;
  stampKind: StampKind;
  stampSize: number;
  penColor: string;
  strokeWidth: number;
  penOpacity: number;
  eraserSize: number;
  smartShapeEnabled: boolean;
  autoStylusEnabled?: boolean;
  stylusOnlyDrawing?: boolean;
  showRuler: boolean;
  rulerPos: { x: number; y: number; angleDeg: number };
  easyPadHighlight?: { x: number; y: number; width: number; height: number } | null;
  zoom: number;
  selectedStrokeIds: string[];
  selectedAttachmentId: string | null;
  selectedTextBoxId: string | null;
  voiceNotes?: VoiceRecording[];
  topSlot?: React.ReactNode;
  onDeleteVoice?: (voiceId: string) => void;
  onRulerPosChange: (next: { x: number; y: number; angleDeg: number }) => void;
  onCloseRuler: () => void;
  onSelectStrokes: (ids: string[]) => void;
  onSelectAttachment: (id: string | null) => void;
  onSelectTextBox: (id: string | null) => void;
  onPreviewAttachment: (att: NoteAttachment) => void;
  onFocusPage: () => void;
  onStylusDetected?: (switchToPen: boolean) => void;
  onUpdatePage: (patch: Partial<NotePage>, historySnapshot?: PageHistorySnapshot) => void;
  onToast: (
    msg: string,
    rawSnap?: { pageIdx: number; strokeId: string; rawStroke: InkStroke }
  ) => void;
  onOpenPagesDrawer: () => void;
}

function pointNearStroke(
  x: number,
  y: number,
  stroke: InkStroke,
  threshold = 18
): boolean {
  const hitDist = threshold + stroke.width;
  for (let i = 0; i < stroke.points.length; i++) {
    const p = stroke.points[i];
    const dx = p.x - x;
    const dy = p.y - y;
    if (dx * dx + dy * dy <= hitDist * hitDist) return true;
  }
  return false;
}

function pointInPolygon(x: number, y: number, poly: StrokePoint[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export const NotePageSheet: React.FC<NotePageSheetProps> = ({
  page,
  pageIndex,
  totalPages,
  isActive,
  isReadMode,
  isFullWidth,
  logicalWidth,
  logicalHeight,
  fontSize,
  isMonospace,
  tool,
  penStyle,
  dashStyle,
  shapeKind,
  shapeFilled,
  stampKind,
  stampSize,
  penColor,
  strokeWidth,
  penOpacity,
  eraserSize,
  smartShapeEnabled,
  autoStylusEnabled = true,
  stylusOnlyDrawing = false,
  showRuler,
  rulerPos,
  easyPadHighlight = null,
  zoom,
  selectedStrokeIds,
  selectedAttachmentId,
  selectedTextBoxId,
  voiceNotes = [],
  topSlot,
  onDeleteVoice,
  onRulerPosChange,
  onCloseRuler,
  onSelectStrokes,
  onSelectAttachment,
  onSelectTextBox,
  onPreviewAttachment,
  onFocusPage,
  onStylusDetected,
  onUpdatePage,
  onToast,
  onOpenPagesDrawer,
}) => {
  const { accentCss, darkCss } = useExpressive();
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [sheetUnit, setSheetUnit] = useState<number>(1);
  const activeStrokeRef = useRef<InkStroke | null>(null);
  const shapeStartRef = useRef<StrokePoint | null>(null);
  const lassoPolygonRef = useRef<StrokePoint[] | null>(null);
  const isDrawingRef = useRef(false);
  const isDraggingLassoRef = useRef(false);
  const lastDragPtRef = useRef<StrokePoint | null>(null);
  const holdTimerRef = useRef<number | null>(null);
  const rulerDragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const barrelErasingRef = useRef(false);
  const isWindowStylusActiveRef = useRef(false);
  const windowStylusCleanupRef = useRef<(() => void) | null>(null);
  const sheetPointerStartRef = useRef<{
    x: number;
    y: number;
    hadSelection: boolean;
  } | null>(null);
  const textboxOverlayStartRef = useRef<{
    x: number;
    y: number;
    hadSelection: boolean;
  } | null>(null);
  const lastOpenAreaTapRef = useRef<{
    x: number;
    y: number;
    time: number;
  } | null>(null);
  const liveAutoShapeIdRef = useRef<string | null>(null);
  const laserTrailRef = useRef<LaserTrailPoint[]>([]);
  const laserRafRef = useRef<number | null>(null);
  const isLaserDownRef = useRef(false);
  const newlyCreatedBoxIdRef = useRef<string | null>(null);
  const lassoDragSnapshotRef = useRef<PageHistorySnapshot | null>(null);
  const lassoDidMoveRef = useRef(false);
  const eraserSnapshotRef = useRef<PageHistorySnapshot | null>(null);
  const eraserChangedRef = useRef(false);

  const pageTheme = page.paperTheme || 'amoled';
  const pagePattern = page.paperPattern || 'blank';
  const isLightPaper = pageTheme === 'paper';
  const pageStamps = useMemo(() => page.stamps || [], [page.stamps]);
  const pageTextBoxes = useMemo(() => page.textBoxes || [], [page.textBoxes]);

  const latestStrokesRef = useRef(page.strokes);
  const latestStampsRef = useRef(pageStamps);
  const latestTextBoxesRef = useRef(pageTextBoxes);
  latestStrokesRef.current = page.strokes;
  latestStampsRef.current = pageStamps;
  latestTextBoxesRef.current = pageTextBoxes;

  const getCurrentSnapshot = useCallback(
    (): PageHistorySnapshot => ({
      strokes: latestStrokesRef.current,
      stamps: latestStampsRef.current,
      textBoxes: latestTextBoxesRef.current,
    }),
    []
  );

  const maxMediaBottom = useMemo(() => {
    let maxB = 0;
    page.attachments.forEach((att, idx) => {
      const b = getAttachmentBox(att, idx);
      if (b.y + b.height > maxB) maxB = b.y + b.height;
    });
    pageTextBoxes.forEach((box) => {
      if (box.y + 110 > maxB) maxB = box.y + 110;
    });
    return maxB;
  }, [page.attachments, pageTextBoxes]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el || isReadMode) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, Math.round(140 * zoom))}px`;
  }, [page.content, isFullWidth, fontSize, zoom, isReadMode]);

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current);
      if (laserRafRef.current) window.cancelAnimationFrame(laserRafRef.current);
      windowStylusCleanupRef.current?.();
      windowStylusCleanupRef.current = null;
    };
  }, []);

  const redrawCanvas = useCallback(
    (extraStroke?: InkStroke | null, lassoPts?: StrokePoint[] | null) => {
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

      const scale = canvas.width / logicalWidth;
      const selectedSet = isActive ? new Set(selectedStrokeIds) : new Set<string>();

      for (const s of page.strokes) {
        drawCanvasStroke(ctx, s, scale, scale, selectedSet.has(s.id));
      }
      for (const st of pageStamps) {
        drawCanvasStamp(ctx, st, scale, scale);
      }
      if (extraStroke) {
        drawCanvasStroke(ctx, extraStroke, scale, scale);
      }

      if (lassoPts && lassoPts.length > 1) {
        ctx.save();
        ctx.strokeStyle = '#a3f0f0';
        ctx.lineWidth = 2 * dpr;
        ctx.setLineDash([6 * dpr, 5 * dpr]);
        ctx.beginPath();
        ctx.moveTo(lassoPts[0].x * scale, lassoPts[0].y * scale);
        for (let i = 1; i < lassoPts.length; i++) {
          ctx.lineTo(lassoPts[i].x * scale, lassoPts[i].y * scale);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.fillStyle = 'rgba(163, 240, 240, 0.08)';
        ctx.fill();
        ctx.restore();
      }

      if (isActive && selectedStrokeIds.length > 0) {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (const s of page.strokes) {
          if (!selectedSet.has(s.id)) continue;
          for (const p of s.points) {
            if (p.x < minX) minX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.x > maxX) maxX = p.x;
            if (p.y > maxY) maxY = p.y;
          }
        }
        if (minX <= maxX && minY <= maxY) {
          const pad = 10;
          const bx = (minX - pad) * scale;
          const by = (minY - pad) * scale;
          const bw = (maxX - minX + pad * 2) * scale;
          const bh = (maxY - minY + pad * 2) * scale;
          ctx.save();
          ctx.strokeStyle = '#a3f0f0';
          ctx.lineWidth = 1.5 * dpr;
          ctx.setLineDash([5 * dpr, 4 * dpr]);
          ctx.strokeRect(bx, by, bw, bh);
          ctx.setLineDash([]);
          const hs = 6 * dpr;
          ctx.fillStyle = '#a3f0f0';
          const corners = [
            [bx, by],
            [bx + bw, by],
            [bx, by + bh],
            [bx + bw, by + bh],
          ];
          for (const [cx, cy] of corners) {
            ctx.fillRect(cx - hs / 2, cy - hs / 2, hs, hs);
          }
          ctx.restore();
        }
      }

      if (laserTrailRef.current.length > 0) {
        drawLaserTrail(ctx, laserTrailRef.current, penColor, scale, performance.now(), 1400);
      }
    },
    [page.strokes, pageStamps, logicalWidth, selectedStrokeIds, isActive, penColor]
  );

  const startLaserLoop = useCallback(() => {
    if (laserRafRef.current !== null) return;
    const step = () => {
      const now = performance.now();
      laserTrailRef.current = laserTrailRef.current.filter((p) => now - p.t <= 1450);
      redrawCanvas(activeStrokeRef.current, lassoPolygonRef.current);
      if (laserTrailRef.current.length > 0 || isLaserDownRef.current) {
        laserRafRef.current = window.requestAnimationFrame(step);
      } else {
        laserRafRef.current = null;
      }
    };
    laserRafRef.current = window.requestAnimationFrame(step);
  }, [redrawCanvas]);

  useEffect(() => {
    const syncUnit = () => {
      const rect = sheetRef.current?.getBoundingClientRect();
      if (rect && rect.width > 0) {
        setSheetUnit(rect.width / logicalWidth);
      }
    };
    syncUnit();
    redrawCanvas();
    const onResize = () => {
      syncUnit();
      redrawCanvas();
    };
    window.addEventListener('resize', onResize);
    const cv = canvasRef.current;
    const sh = sheetRef.current;
    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            syncUnit();
            redrawCanvas();
          })
        : null;
    if (cv && ro) ro.observe(cv);
    if (sh && ro) ro.observe(sh);
    return () => {
      window.removeEventListener('resize', onResize);
      ro?.disconnect();
    };
  }, [redrawCanvas, logicalWidth]);

  const snapPointToRulerIfNear = (pt: StrokePoint): StrokePoint => {
    if (!showRuler || !isActive) return pt;
    const rad = (rulerPos.angleDeg * Math.PI) / 180;
    const ux = Math.cos(rad);
    const uy = Math.sin(rad);
    const nx = -uy;
    const ny = ux;
    const edgeX = rulerPos.x + nx * -22;
    const edgeY = rulerPos.y + ny * -22;
    const vx = pt.x - edgeX;
    const vy = pt.y - edgeY;
    const along = vx * ux + vy * uy;
    const perp = vx * nx + vy * ny;
    if (Math.abs(perp) < 28 && Math.abs(along) < 230) {
      return { ...pt, x: edgeX + ux * along, y: edgeY + uy * along };
    }
    return pt;
  };

  const getLogicalCoordsFromClient = (ev: {
    clientX: number;
    clientY: number;
    pressure?: number;
    tiltX?: number;
    tiltY?: number;
  }): StrokePoint => {
    const el = canvasRef.current || sheetRef.current;
    if (!el) return { x: 0, y: 0, pressure: 0.5, tiltX: 0, tiltY: 0 };
    const rect = el.getBoundingClientRect();
    const unit = Math.max(rect.width, 1) / logicalWidth;
    return {
      x: (ev.clientX - rect.left) / unit,
      y: (ev.clientY - rect.top) / unit,
      pressure: ev.pressure && ev.pressure > 0 ? ev.pressure : 0.5,
      tiltX: ev.tiltX || 0,
      tiltY: ev.tiltY || 0,
    };
  };

  const getLogicalCoords = (e: React.PointerEvent<HTMLCanvasElement>): StrokePoint =>
    getLogicalCoordsFromClient(e);

  const eraseAtPoint = (pt: StrokePoint) => {
    const curStrokes = latestStrokesRef.current;
    const curStamps = latestStampsRef.current;
    const remaining = curStrokes.filter(
      (s) => !pointNearStroke(pt.x, pt.y, s, eraserSize)
    );
    const remainingStamps = curStamps.filter(
      (st) => Math.hypot(st.x - pt.x, st.y - pt.y) > st.size * 0.65 + eraserSize
    );
    if (
      remaining.length !== curStrokes.length ||
      remainingStamps.length !== curStamps.length
    ) {
      latestStrokesRef.current = remaining;
      latestStampsRef.current = remainingStamps;
      eraserChangedRef.current = true;
      onUpdatePage({ strokes: remaining, stamps: remainingStamps });
    }
  };

  const triggerLiveHoldShape = () => {
    const stroke = activeStrokeRef.current;
    if (!stroke || stroke.tool === 'highlighter') return;
    const recognized = recognizeAndBeautifyShape(stroke.points);
    if (recognized) {
      liveAutoShapeIdRef.current = stroke.id;
      const rawCopy: InkStroke = { ...stroke, points: [...stroke.points] };
      activeStrokeRef.current = { ...stroke, points: recognized.points };
      redrawCanvas(activeStrokeRef.current);
      onToast(`${recognized.label} algılandı`, {
        pageIdx: pageIndex,
        strokeId: stroke.id,
        rawStroke: rawCopy,
      });
    }
  };

  const createTextBoxAtClientPos = useCallback(
    (clientX: number, clientY: number) => {
      const sheet = sheetRef.current;
      if (!sheet || isReadMode) return;
      const rect = sheet.getBoundingClientRect();
      if (rect.width <= 0) return;
      const unit = rect.width / logicalWidth;
      const rawX = (clientX - rect.left) / unit;
      const rawY = (clientY - rect.top) / unit;
      const boxW = 240;
      const clampedX = Math.round(Math.max(16, Math.min(logicalWidth - boxW - 16, rawX - 18)));
      const clampedY = Math.round(Math.max(24, rawY - 14));
      const newBox: CanvasTextBox = {
        id: `tb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        x: clampedX,
        y: clampedY,
        width: boxW,
        text: '',
        fontSize,
        color: isLightPaper ? '#0b1214' : '#e6f2f2',
      };
      newlyCreatedBoxIdRef.current = newBox.id;
      onFocusPage();
      onSelectAttachment(null);
      onSelectTextBox(newBox.id);
      onUpdatePage({ textBoxes: [...pageTextBoxes, newBox] }, getCurrentSnapshot());
    },
    [
      isReadMode,
      logicalWidth,
      fontSize,
      isLightPaper,
      onFocusPage,
      onSelectAttachment,
      onSelectTextBox,
      onUpdatePage,
      pageTextBoxes,
      getCurrentSnapshot,
    ]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isReadMode || tool === 'text' || tool === 'textbox' || tool === 'pan') return;
    if (e.pointerType === 'pen') {
      onStylusDetected?.(false);
    }
    if (stylusOnlyDrawing && e.pointerType === 'touch') {
      return;
    }
    onFocusPage();
    onSelectAttachment(null);
    onSelectTextBox(null);
    if (activePointerIdRef.current !== null && activePointerIdRef.current !== e.pointerId) {
      return;
    }

    const rawPt = getLogicalCoords(e);
    const isBarrelErase =
      e.pointerType === 'pen' && ((e.buttons & 32) !== 0 || e.button === 5);

    if (tool === 'laser' && !isBarrelErase) {
      activePointerIdRef.current = e.pointerId;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      isLaserDownRef.current = true;
      laserTrailRef.current.push({ x: rawPt.x, y: rawPt.y, t: performance.now() });
      startLaserLoop();
      return;
    }

    if (tool === 'stamp' && !isBarrelErase) {
      const stamp: CanvasStamp = {
        id: `stp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        kind: stampKind,
        x: rawPt.x,
        y: rawPt.y,
        size: stampSize,
        color: penColor,
      };
      onUpdatePage({ stamps: [...pageStamps, stamp] }, getCurrentSnapshot());
      return;
    }

    activePointerIdRef.current = e.pointerId;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    const pt =
      (tool === 'pen' || tool === 'highlighter') && !isBarrelErase
        ? snapPointToRulerIfNear(rawPt)
        : rawPt;

    if (tool === 'lasso' && !isBarrelErase) {
      if (isActive && selectedStrokeIds.length > 0) {
        const selSet = new Set(selectedStrokeIds);
        const hitSelected = page.strokes
          .filter((s) => selSet.has(s.id))
          .some((s) => pointNearStroke(pt.x, pt.y, s, 26));
        if (hitSelected) {
          isDraggingLassoRef.current = true;
          lastDragPtRef.current = pt;
          lassoDragSnapshotRef.current = getCurrentSnapshot();
          lassoDidMoveRef.current = false;
          return;
        }
      }
      onSelectStrokes([]);
      isDrawingRef.current = true;
      lassoPolygonRef.current = [pt];
      redrawCanvas(null, lassoPolygonRef.current);
      return;
    }

    if (tool === 'eraser' || isBarrelErase) {
      barrelErasingRef.current = isBarrelErase;
      isDrawingRef.current = true;
      eraserSnapshotRef.current = getCurrentSnapshot();
      eraserChangedRef.current = false;
      eraseAtPoint(pt);
      return;
    }

    if (tool === 'shape') {
      isDrawingRef.current = true;
      shapeStartRef.current = pt;
      const canFill =
        shapeFilled &&
        shapeKind !== 'line' &&
        shapeKind !== 'arrow' &&
        shapeKind !== 'doubleArrow';
      const preview: InkStroke = {
        id: `sh_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        tool: 'pen',
        penStyle: 'ballpoint',
        dashStyle,
        color: penColor,
        width: strokeWidth,
        opacity: penOpacity,
        filled: canFill,
        points: [pt, pt],
      };
      activeStrokeRef.current = preview;
      redrawCanvas(preview);
      return;
    }

    isDrawingRef.current = true;
    liveAutoShapeIdRef.current = null;
    const activeStyle: PenStyle =
      tool === 'highlighter' ? 'highlighter' : penStyle;
    const newStroke: InkStroke = {
      id: `st_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      tool: tool === 'highlighter' ? 'highlighter' : 'pen',
      penStyle: activeStyle,
      dashStyle: tool === 'highlighter' ? 'solid' : dashStyle,
      color: penColor,
      width: strokeWidth,
      opacity: tool === 'highlighter' ? 0.36 : penOpacity,
      points: [pt],
    };
    activeStrokeRef.current = newStroke;
    redrawCanvas(newStroke);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isReadMode || isWindowStylusActiveRef.current) return;
    if (activePointerIdRef.current !== null && activePointerIdRef.current !== e.pointerId) {
      return;
    }
    const rawPt = getLogicalCoords(e);

    if (tool === 'laser' && isLaserDownRef.current) {
      laserTrailRef.current.push({ x: rawPt.x, y: rawPt.y, t: performance.now() });
      startLaserLoop();
      return;
    }

    if (tool === 'lasso' && isDraggingLassoRef.current && lastDragPtRef.current) {
      const dx = rawPt.x - lastDragPtRef.current.x;
      const dy = rawPt.y - lastDragPtRef.current.y;
      if (Math.abs(dx) > 0.2 || Math.abs(dy) > 0.2) {
        lassoDidMoveRef.current = true;
      }
      lastDragPtRef.current = rawPt;
      const selSet = new Set(selectedStrokeIds);
      const moved = page.strokes.map((s) =>
        selSet.has(s.id)
          ? {
              ...s,
              points: s.points.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy })),
            }
          : s
      );
      onUpdatePage({ strokes: moved });
      return;
    }

    if (!isDrawingRef.current) return;

    if (tool === 'lasso' && lassoPolygonRef.current) {
      lassoPolygonRef.current.push(rawPt);
      redrawCanvas(null, lassoPolygonRef.current);
      return;
    }

    if (tool === 'eraser' || barrelErasingRef.current) {
      eraseAtPoint(rawPt);
      return;
    }

    if (tool === 'shape' && shapeStartRef.current && activeStrokeRef.current) {
      activeStrokeRef.current = {
        ...activeStrokeRef.current,
        points: buildShapePoints(shapeKind, shapeStartRef.current, rawPt),
      };
      redrawCanvas(activeStrokeRef.current);
      return;
    }

    const pt = snapPointToRulerIfNear(rawPt);
    const stroke = activeStrokeRef.current;
    if (!stroke || liveAutoShapeIdRef.current === stroke.id) return;
    const last = stroke.points[stroke.points.length - 1];
    const dist = Math.hypot(pt.x - last.x, pt.y - last.y);
    if (dist < 1.2) return;

    stroke.points.push(pt);
    redrawCanvas(stroke);

    if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current);
    holdTimerRef.current = window.setTimeout(() => {
      if (isDrawingRef.current) triggerLiveHoldShape();
    }, 550);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isWindowStylusActiveRef.current) return;
    if (activePointerIdRef.current !== null && activePointerIdRef.current !== e.pointerId) {
      return;
    }
    activePointerIdRef.current = null;

    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    if (isLaserDownRef.current) {
      isLaserDownRef.current = false;
      return;
    }

    if (isDraggingLassoRef.current) {
      isDraggingLassoRef.current = false;
      lastDragPtRef.current = null;
      if (lassoDidMoveRef.current && lassoDragSnapshotRef.current) {
        onUpdatePage({}, lassoDragSnapshotRef.current);
      }
      lassoDragSnapshotRef.current = null;
      lassoDidMoveRef.current = false;
      return;
    }

    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (tool === 'eraser' || barrelErasingRef.current) {
      barrelErasingRef.current = false;
      if (eraserChangedRef.current && eraserSnapshotRef.current) {
        onUpdatePage({}, eraserSnapshotRef.current);
      }
      eraserSnapshotRef.current = null;
      eraserChangedRef.current = false;
      return;
    }

    if (tool === 'lasso' && lassoPolygonRef.current) {
      const poly = lassoPolygonRef.current;
      lassoPolygonRef.current = null;
      if (poly.length > 4) {
        const picked = page.strokes
          .filter((s) => s.points.some((p) => pointInPolygon(p.x, p.y, poly)))
          .map((s) => s.id);
        onSelectStrokes(picked);
        if (picked.length > 0) {
          onToast(`${picked.length} çizgi seçildi`);
        }
      }
      redrawCanvas();
      return;
    }

    if (activeStrokeRef.current) {
      let finished = activeStrokeRef.current;
      activeStrokeRef.current = null;
      shapeStartRef.current = null;

      if (
        smartShapeEnabled &&
        tool === 'pen' &&
        finished.penStyle !== 'spray' &&
        liveAutoShapeIdRef.current !== finished.id
      ) {
        const recognized = recognizeAndBeautifyShape(finished.points);
        if (recognized) {
          const rawCopy: InkStroke = { ...finished, points: [...finished.points] };
          finished = { ...finished, points: recognized.points };
          onToast(`${recognized.label} algılandı ve düzeltildi`, {
            pageIdx: pageIndex,
            strokeId: finished.id,
            rawStroke: rawCopy,
          });
        }
      }

      onUpdatePage({ strokes: [...latestStrokesRef.current, finished] }, getCurrentSnapshot());
    }
  };

  // Zero-drop S Pen / Stylus automatic detection even when currently in text / textbox / pan mode
  const handleSheetPointerDownCapture = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isReadMode || e.pointerType !== 'pen' || !autoStylusEnabled) return;
    const isNonCanvasMode = tool === 'text' || tool === 'textbox' || tool === 'pan';
    onStylusDetected?.(isNonCanvasMode);
    if (!isNonCanvasMode) return;

    const target = e.target as HTMLElement | null;
    if (
      target?.closest(
        'button, select, input, audio, [data-no-stylus-hijack="true"]'
      )
    ) {
      return;
    }

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    e.preventDefault();
    e.stopPropagation();

    onFocusPage();
    onSelectAttachment(null);
    onSelectTextBox(null);

    const capturedId = e.pointerId;
    isWindowStylusActiveRef.current = true;
    activePointerIdRef.current = capturedId;
    const rawPt = getLogicalCoordsFromClient(e);
    const isBarrelErase = (e.buttons & 32) !== 0 || e.button === 5;

    if (isBarrelErase) {
      barrelErasingRef.current = true;
      isDrawingRef.current = true;
      eraserSnapshotRef.current = getCurrentSnapshot();
      eraserChangedRef.current = false;
      eraseAtPoint(rawPt);
    } else {
      const pt = snapPointToRulerIfNear(rawPt);
      isDrawingRef.current = true;
      liveAutoShapeIdRef.current = null;
      const newStroke: InkStroke = {
        id: `st_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        tool: 'pen',
        penStyle,
        dashStyle,
        color: penColor,
        width: strokeWidth,
        opacity: penOpacity,
        points: [pt],
      };
      activeStrokeRef.current = newStroke;
      redrawCanvas(newStroke);
    }

    windowStylusCleanupRef.current?.();

    const onWinMove = (ev: PointerEvent) => {
      if (ev.pointerId !== capturedId || !isDrawingRef.current) return;
      const moveRaw = getLogicalCoordsFromClient(ev);
      if (barrelErasingRef.current) {
        eraseAtPoint(moveRaw);
        return;
      }
      const pt = snapPointToRulerIfNear(moveRaw);
      const stroke = activeStrokeRef.current;
      if (!stroke || liveAutoShapeIdRef.current === stroke.id) return;
      const last = stroke.points[stroke.points.length - 1];
      if (Math.hypot(pt.x - last.x, pt.y - last.y) < 1.2) return;
      stroke.points.push(pt);
      redrawCanvas(stroke);
    };

    const cleanup = () => {
      window.removeEventListener('pointermove', onWinMove);
      window.removeEventListener('pointerup', onWinUp);
      window.removeEventListener('pointercancel', onWinUp);
      windowStylusCleanupRef.current = null;
      isWindowStylusActiveRef.current = false;
    };

    const onWinUp = (ev: PointerEvent) => {
      if (ev.pointerId !== capturedId) return;
      cleanup();
      if (activePointerIdRef.current === capturedId) {
        activePointerIdRef.current = null;
      }
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;

      if (barrelErasingRef.current) {
        barrelErasingRef.current = false;
        if (eraserChangedRef.current && eraserSnapshotRef.current) {
          onUpdatePage({}, eraserSnapshotRef.current);
        }
        eraserSnapshotRef.current = null;
        eraserChangedRef.current = false;
        return;
      }

      if (activeStrokeRef.current) {
        let finished = activeStrokeRef.current;
        activeStrokeRef.current = null;
        if (smartShapeEnabled && finished.penStyle !== 'spray') {
          const recognized = recognizeAndBeautifyShape(finished.points);
          if (recognized) {
            const rawCopy: InkStroke = { ...finished, points: [...finished.points] };
            finished = { ...finished, points: recognized.points };
            onToast(`${recognized.label} algılandı ve düzeltildi`, {
              pageIdx: pageIndex,
              strokeId: finished.id,
              rawStroke: rawCopy,
            });
          }
        }
        onUpdatePage(
          { strokes: [...latestStrokesRef.current, finished] },
          getCurrentSnapshot()
        );
      }
    };

    windowStylusCleanupRef.current = cleanup;
    window.addEventListener('pointermove', onWinMove);
    window.addEventListener('pointerup', onWinUp);
    window.addEventListener('pointercancel', onWinUp);
  };

  const paperSurfaceClass =
    pageTheme === 'paper'
      ? 'bg-[#f4f7f7] text-[#0b1214] border-[#84a0a0]/40'
      : pageTheme === 'charcoal'
      ? 'bg-[#070b0c] text-[#e6f2f2] border-[#1b2c2e]'
      : 'bg-[#0b1214] text-[#e6f2f2] border-[#1b2c2e]';

  const patternClass =
    pagePattern === 'ruled'
      ? isLightPaper
        ? 'paper-pattern-ruled-light'
        : 'paper-pattern-ruled-dark'
      : pagePattern === 'grid'
      ? isLightPaper
        ? 'paper-pattern-grid-light'
        : 'paper-pattern-grid-dark'
      : pagePattern === 'dotted'
      ? isLightPaper
        ? 'paper-pattern-dotted-light'
        : 'paper-pattern-dotted-dark'
      : pagePattern === 'margin'
      ? isLightPaper
        ? 'paper-pattern-margin-light'
        : 'paper-pattern-margin-dark'
      : pagePattern === 'cornell'
      ? isLightPaper
        ? 'paper-pattern-cornell-light'
        : 'paper-pattern-cornell-dark'
      : '';

  return (
    <div
      ref={sheetRef}
      id={`note-page-sheet-${pageIndex}`}
      onPointerDownCapture={handleSheetPointerDownCapture}
      onPointerDown={(e) => {
        sheetPointerStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          hadSelection: Boolean(
            selectedAttachmentId || selectedTextBoxId || selectedStrokeIds.length > 0
          ),
        };
        onFocusPage();
      }}
      onClick={(e) => {
        if (isReadMode) return;
        const start = sheetPointerStartRef.current;
        sheetPointerStartRef.current = null;
        if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) >= 8) {
          return;
        }
        onSelectAttachment(null);
        onSelectTextBox(null);
        if (selectedStrokeIds.length > 0) onSelectStrokes([]);
        if (start?.hadSelection) {
          return;
        }
        const targetEl = e.target as HTMLElement | null;
        if (
          tool === 'text' &&
          (e.target === sheetRef.current || targetEl?.dataset?.sheetOpenArea === 'true')
        ) {
          const now = performance.now();
          const prev = lastOpenAreaTapRef.current;
          if (
            prev &&
            now - prev.time < 380 &&
            Math.hypot(e.clientX - prev.x, e.clientY - prev.y) < 30
          ) {
            lastOpenAreaTapRef.current = null;
            createTextBoxAtClientPos(e.clientX, e.clientY);
          } else {
            lastOpenAreaTapRef.current = { x: e.clientX, y: e.clientY, time: now };
          }
        }
      }}
      style={{
        minHeight: `${Math.round(Math.max(logicalHeight, maxMediaBottom + 80) * zoom)}px`,
        maxWidth: isFullWidth ? '100%' : `${Math.round(logicalWidth * zoom)}px`,
      }}
      className={`relative mx-auto border sm:rounded-2xl overflow-hidden transition-colors ${paperSurfaceClass} ${patternClass} ${
        isActive ? 'ring-1 ring-[var(--accent)]/40' : ''
      } ${!isReadMode && tool === 'textbox' ? 'cursor-text' : ''} ${
        pageIndex < totalPages - 1 ? 'print-page-break' : ''
      }`}
    >
      <div data-sheet-open-area="true" className="relative z-10 p-5 sm:p-10 space-y-5">
        {topSlot && <div className="relative z-30">{topSlot}</div>}

        {isReadMode ? (
          <MarkdownPreview
            content={page.content}
            isLightPaper={isLightPaper}
            fontSize={Math.round(fontSize * zoom)}
            isMonospace={isMonospace}
          />
        ) : (
          <textarea
            ref={textareaRef}
            value={page.content}
            onFocus={() => {
              onFocusPage();
              onSelectAttachment(null);
              onSelectTextBox(null);
            }}
            onChange={(e) => onUpdatePage({ content: e.target.value })}
            style={{
              fontSize: `${Math.round(fontSize * zoom)}px`,
              minHeight: `${Math.round(140 * zoom)}px`,
            }}
            placeholder={
              pageIndex === 0
                ? 'Notunuzu yazın... (İstediğiniz yere metin kutusu için "T" aracını kullanın veya boş alana çift dokunun)'
                : `Sayfa ${pageIndex + 1} içeriği...`
            }
            className={`w-full resize-none bg-transparent leading-[32px] focus:outline-none placeholder:opacity-40 ${
              isMonospace ? 'font-mono' : ''
            } ${isLightPaper ? 'text-[#0b1214]' : 'text-[#e6f2f2]'}`}
            rows={4}
          />
        )}

        {page.checklists.length > 0 && (
          <div className="relative z-30 space-y-2 pt-2">
            {page.checklists.map((item) => (
              <div key={item.id} className="flex items-center gap-2.5 group">
                <button
                  type="button"
                  disabled={isReadMode}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() =>
                    onUpdatePage({
                      checklists: page.checklists.map((c) =>
                        c.id === item.id ? { ...c, checked: !c.checked } : c
                      ),
                    })
                  }
                  className="p-1 text-[var(--accent)] shrink-0"
                  aria-label="Tamamlandı olarak işaretle"
                >
                  {item.checked ? (
                    <CheckSquare className="w-5 h-5" />
                  ) : (
                    <Square className="w-5 h-5 opacity-55" />
                  )}
                </button>
                <input
                  type="text"
                  value={item.text}
                  readOnly={isReadMode}
                  onPointerDown={(e) => e.stopPropagation()}
                  onFocus={onFocusPage}
                  onChange={(e) =>
                    onUpdatePage({
                      checklists: page.checklists.map((c) =>
                        c.id === item.id ? { ...c, text: e.target.value } : c
                      ),
                    })
                  }
                  placeholder="Görev..."
                  className={`flex-1 bg-transparent text-sm py-1 focus:outline-none ${
                    item.checked ? 'line-through opacity-50' : ''
                  }`}
                />
                {!isReadMode && (
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() =>
                      onUpdatePage({
                        checklists: page.checklists.filter((c) => c.id !== item.id),
                      })
                    }
                    className="opacity-75 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 p-1.5 rounded-lg hover:opacity-100 hover:text-[#ff9db8]"
                    aria-label="Sil"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {pageIndex === 0 && voiceNotes.length > 0 && (
          <div className="relative z-30 space-y-2.5 pt-2">
            {voiceNotes.map((vn) => (
              <div
                key={vn.id}
                onPointerDown={(e) => e.stopPropagation()}
                className={`flex flex-wrap items-center gap-3 p-3 rounded-2xl border ${
                  isLightPaper
                    ? 'bg-[#e6f2f2] border-[#84a0a0]/30'
                    : 'bg-[#142225] border-[#1b2c2e]'
                }`}
              >
                <Volume2 className="w-4 h-4 text-[var(--accent)] shrink-0" />
                <span className="text-xs font-medium shrink-0">{vn.name}</span>
                <audio controls src={vn.dataUrl} className="h-8 flex-1 min-w-[180px]" />
                {!isReadMode && onDeleteVoice && (
                  <button
                    type="button"
                    onClick={() => onDeleteVoice(vn.id)}
                    className="p-1.5 rounded-lg text-[#84a0a0] hover:text-[#ff9db8]"
                    aria-label="Ses kaydını sil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Click-anywhere overlay when Text Box tool is active */}
      {!isReadMode && tool === 'textbox' && (
        <div
          onPointerDown={(e) => {
            e.stopPropagation();
            textboxOverlayStartRef.current = {
              x: e.clientX,
              y: e.clientY,
              hadSelection: Boolean(selectedAttachmentId || selectedTextBoxId),
            };
            onFocusPage();
          }}
          onClick={(e) => {
            e.stopPropagation();
            const start = textboxOverlayStartRef.current;
            textboxOverlayStartRef.current = null;
            if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) >= 8) {
              return;
            }
            if (start?.hadSelection) {
              onSelectAttachment(null);
              onSelectTextBox(null);
              return;
            }
            createTextBoxAtClientPos(e.clientX, e.clientY);
          }}
          className="absolute inset-0 z-[24] cursor-text touch-pan-y"
          title="Yazmaya başlamak için istediğiniz yere dokunun"
        />
      )}

      {/* Freely Positioned Floating Text Boxes */}
      {pageTextBoxes.map((box) => {
        const isSel = isActive && selectedTextBoxId === box.id;
        const canInteract =
          !isReadMode &&
          (isSel || tool === 'text' || tool === 'textbox' || tool === 'pan');
        return (
          <FloatingTextBox
            key={box.id}
            box={box}
            logicalWidth={logicalWidth}
            sheetUnit={sheetUnit}
            isLightPaper={isLightPaper}
            isSelected={isSel}
            isInteractive={canInteract}
            isReadMode={isReadMode}
            accentCss={accentCss}
            darkCss={darkCss}
            autoFocus={newlyCreatedBoxIdRef.current === box.id}
            onSelect={() => {
              onFocusPage();
              onSelectAttachment(null);
              onSelectTextBox(box.id);
            }}
            onChange={(patch) => {
              if (newlyCreatedBoxIdRef.current === box.id) {
                newlyCreatedBoxIdRef.current = null;
              }
              onUpdatePage({
                textBoxes: pageTextBoxes.map((b) =>
                  b.id === box.id ? { ...b, ...patch } : b
                ),
              });
            }}
            onDelete={() => {
              if (selectedTextBoxId === box.id) {
                onSelectTextBox(null);
              }
              onUpdatePage(
                {
                  textBoxes: pageTextBoxes.filter((b) => b.id !== box.id),
                },
                box.text.trim() ? getCurrentSnapshot() : undefined
              );
            }}
          />
        );
      })}

      {/* Freely Positioned & Resizable Image/Video Layer (Tap to View, Hold to Move/Resize) */}
      {page.attachments.map((att, idx) => {
        const isSel = isActive && selectedAttachmentId === att.id;
        const canInteract =
          !isReadMode &&
          (isSel || tool === 'text' || tool === 'textbox' || tool === 'pan');
        return (
          <FloatingMediaItem
            key={att.id}
            attachment={att}
            index={idx}
            logicalWidth={logicalWidth}
            sheetUnit={sheetUnit}
            isSelected={isSel}
            isInteractive={canInteract}
            isReadMode={isReadMode}
            accentCss={accentCss}
            darkCss={darkCss}
            onSelect={() => {
              onFocusPage();
              onSelectTextBox(null);
              onSelectAttachment(att.id);
            }}
            onPreview={() => {
              onFocusPage();
              onPreviewAttachment(att);
            }}
            onEnterEditModeToast={() =>
              onToast('Düzenleme modu — sürükleyip boyutlandırabilirsiniz')
            }
            onCommitRect={(rect) =>
              onUpdatePage({
                attachments: page.attachments.map((a) =>
                  a.id === att.id ? { ...a, ...rect } : a
                ),
              })
            }
            onDelete={() => {
              if (selectedAttachmentId === att.id) {
                onSelectAttachment(null);
              }
              onUpdatePage({
                attachments: page.attachments.filter((a) => a.id !== att.id),
              });
            }}
          />
        );
      })}

      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          touchAction:
            !isReadMode &&
            tool !== 'text' &&
            tool !== 'textbox' &&
            tool !== 'pan'
              ? stylusOnlyDrawing
                ? 'pan-y'
                : 'none'
              : 'auto',
        }}
        className={`absolute inset-0 z-20 w-full h-full ${
          isReadMode || tool === 'text' || tool === 'textbox' || tool === 'pan'
            ? 'pointer-events-none'
            : tool === 'eraser'
            ? 'cursor-cell pointer-events-auto'
            : 'cursor-crosshair pointer-events-auto'
        }`}
      />

      {/* Easy Writing Pad Region Highlight on Active Sheet */}
      {easyPadHighlight && isActive && !isReadMode && (
        <div
          style={{
            left: `${Math.round(easyPadHighlight.x * sheetUnit)}px`,
            top: `${Math.round(easyPadHighlight.y * sheetUnit)}px`,
            width: `${Math.round(easyPadHighlight.width * sheetUnit)}px`,
            height: `${Math.round(easyPadHighlight.height * sheetUnit)}px`,
            borderColor: accentCss,
          }}
          className="no-print pointer-events-none absolute z-[25] rounded-lg border-2 border-dashed bg-[var(--accent)]/10 transition-all duration-150"
        />
      )}

      {/* Ruler Overlay on Active Sheet */}
      {showRuler && isActive && !isReadMode && (
        <div
          onPointerDown={(e) => {
            e.stopPropagation();
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {
              // ignore
            }
            rulerDragRef.current = {
              startX: e.clientX,
              startY: e.clientY,
              origX: rulerPos.x,
              origY: rulerPos.y,
            };
          }}
          onPointerMove={(e) => {
            if (!rulerDragRef.current) return;
            const safeUnit = sheetUnit > 0 ? sheetUnit : 1;
            const dx = (e.clientX - rulerDragRef.current.startX) / safeUnit;
            const dy = (e.clientY - rulerDragRef.current.startY) / safeUnit;
            onRulerPosChange({
              ...rulerPos,
              x: rulerDragRef.current.origX + dx,
              y: rulerDragRef.current.origY + dy,
            });
          }}
          onPointerUp={() => {
            rulerDragRef.current = null;
          }}
          onPointerCancel={() => {
            rulerDragRef.current = null;
          }}
          style={{
            left: `${(rulerPos.x / logicalWidth) * 100}%`,
            top: `${(rulerPos.y / logicalHeight) * 100}%`,
            transform: `translate(-50%, -50%) rotate(${rulerPos.angleDeg}deg)`,
          }}
          className="no-print absolute z-30 w-[440px] max-w-[90%] h-11 rounded-xl bg-[rgba(20,34,37,0.88)] border border-[var(--accent)]/60 flex items-center justify-between px-3 cursor-grab active:cursor-grabbing select-none shadow-xl touch-none"
        >
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() =>
                onRulerPosChange({ ...rulerPos, angleDeg: rulerPos.angleDeg - 15 })
              }
              className="px-2 py-0.5 rounded-lg bg-[#0b1214] text-[11px] text-[#e6f2f2] hover:text-[var(--accent)]"
            >
              -15°
            </button>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onRulerPosChange({ ...rulerPos, angleDeg: 0 })}
              className="font-display px-2 py-0.5 rounded-lg bg-[#0b1214] text-[11px] text-[var(--accent)] tabular-nums"
            >
              {rulerPos.angleDeg}°
            </button>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() =>
                onRulerPosChange({ ...rulerPos, angleDeg: rulerPos.angleDeg + 15 })
              }
              className="px-2 py-0.5 rounded-lg bg-[#0b1214] text-[11px] text-[#e6f2f2] hover:text-[var(--accent)]"
            >
              +15°
            </button>
          </div>
          <span className="label-caps text-[10px]">Cetvel</span>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onCloseRuler}
            className="p-1 text-[#84a0a0] hover:text-[#e6f2f2]"
            aria-label="Cetveli kapat"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Samsung Notes style bottom-right Page Counter (1/2, 2/2) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenPagesDrawer();
        }}
        className={`no-print absolute bottom-3 right-4 z-30 font-display text-xs font-medium tabular-nums px-2 py-0.5 rounded-md transition-colors ${
          isLightPaper
            ? 'text-[#0b1214]/55 hover:text-[#0b1214]'
            : 'text-[#84a0a0] hover:text-[#e6f2f2]'
        }`}
        title="Sayfalar panelini aç"
      >
        {pageIndex + 1}/{totalPages}
      </button>
    </div>
  );
};
