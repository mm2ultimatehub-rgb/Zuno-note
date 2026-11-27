import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Bell,
  Bold,
  Brush,
  CalendarClock,
  Check,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleDot,
  Code,
  Copy,
  Diamond,
  Droplets,
  Eraser,
  Feather,
  FilePlus2,
  FileText,
  Folder as FolderIcon,
  Hand,
  Hash,
  Heading,
  Heart,
  Hexagon,
  Highlighter,
  ImagePlus,
  Italic,
  Keyboard,
  Lasso,
  Layers,
  LayoutTemplate,
  Lightbulb,
  List,
  Lock,
  LockOpen,
  Maximize,
  Maximize2,
  Mic,
  MicOff,
  Minimize,
  Minimize2,
  Minus,
  MoreVertical,
  Paintbrush,
  Palette,
  Pen,
  Pencil,
  PenTool,
  Pin,
  Plus,
  Printer,
  Quote,
  Redo2,
  Replace,
  RotateCcw,
  Ruler,
  Search,
  Shapes,
  Sparkles,
  Square,
  Star,
  Sticker,
  Target,
  Trash2,
  Triangle,
  Type,
  Undo2,
  Video,
  Wand2,
  X,
  Zap,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  EditorTool,
  FavoritePenPreset,
  Folder,
  InkStroke,
  Note,
  NoteAttachment,
  NotePage,
  PageHistorySnapshot,
  PaperPattern,
  PaperTheme,
  PenStyle,
  ShapeKind,
  StampKind,
  StrokeDashStyle,
} from '../types/notes';
import { NoteTemplate } from '../data/templates';
import { flushPendingSaves } from '../db/localDb';
import { formatFullDateTR, formatShortDateTR } from '../utils/dateFormat';
import { hasStoredPin, savePin } from '../utils/pinLock';
import { drawCanvasStamp, drawCanvasStroke } from '../utils/shapeRecognition';
import { useExpressive } from './expressive/shapes';
import { SoftSwitch } from './expressive/SoftSwitch';
import { LiquidSlider } from './expressive/LiquidSlider';
import { LoadingActionButton } from './expressive/LoadingActionButton';
import { ExpressiveSettingsPanel } from './expressive/ExpressiveSettingsPanel';
import { FocusTimerPopover } from './FocusTimerPopover';
import { PinLockModal } from './PinLockModal';
import { TemplateGalleryModal } from './TemplateGalleryModal';
import { PenStudioPopover } from './editor/PenStudioPopover';
import { ColorPickerPopover } from './editor/ColorPickerPopover';
import { NotePageSheet } from './editor/NotePageSheet';
import { MediaLightboxModal } from './editor/MediaLightboxModal';
import { EasyWritingPad } from './editor/EasyWritingPad';
import {
  detectMediaDimensions,
  getAttachmentBox,
  isVideoAttachment,
  optimizeImageDataUrl,
  readFileAsDataUrl,
} from './editor/FloatingMediaItem';

interface NoteEditorProps {
  note: Note;
  folders: Folder[];
  onChange: (updated: Note) => void;
  onBack: () => void;
  onMoveToTrash: (noteId: string) => void;
}

const QUICK_PALETTE_COLORS = [
  '#ef4444',
  '#ffb454',
  '#fde047',
  '#a3f0f0',
  '#38bdf8',
  '#9ccaff',
  '#cdb4ff',
  '#e6f2f2',
];

const DEFAULT_RECENT_COLORS = ['#a3f0f0', '#ffb454', '#ff9db8', '#9ccaff', '#a6f0a6'];
const RECENT_COLORS_KEY = 'karanot_recent_colors_v1';
const AUTO_STYLUS_KEY = 'karanot_auto_stylus_v1';
const STYLUS_ONLY_KEY = 'karanot_stylus_only_v1';
const FAVORITE_PENS_KEY = 'karanot_favorite_pens_v1';

const DEFAULT_FAVORITE_PENS: FavoritePenPreset[] = [
  {
    id: 'fav_fountain',
    label: 'Dolma',
    tool: 'pen',
    penStyle: 'fountain',
    color: '#a3f0f0',
    width: 3,
    opacity: 1,
    dashStyle: 'solid',
  },
  {
    id: 'fav_marker',
    label: 'Keçeli',
    tool: 'pen',
    penStyle: 'marker',
    color: '#ffb454',
    width: 6,
    opacity: 1,
    dashStyle: 'solid',
  },
  {
    id: 'fav_high',
    label: 'Fosforlu',
    tool: 'highlighter',
    penStyle: 'highlighter',
    color: '#fde047',
    width: 10,
    opacity: 0.36,
    dashStyle: 'solid',
  },
];

const PEN_LABEL_MAP: Record<PenStyle, { label: string; icon: typeof Pen }> = {
  ballpoint: { label: 'Tükenmez', icon: Pen },
  fountain: { label: 'Dolma', icon: PenTool },
  pencil: { label: 'Kurşun', icon: Pencil },
  marker: { label: 'Keçeli', icon: Paintbrush },
  brush: { label: 'Fırça', icon: Brush },
  calligraphy: { label: 'Kaligrafi', icon: Feather },
  watercolor: { label: 'Sulu Boya', icon: Droplets },
  crayon: { label: 'Pastel', icon: Palette },
  charcoal: { label: 'Kömür', icon: Pencil },
  rainbow: { label: 'Gökkuşağı', icon: Sparkles },
  dottedLine: { label: 'İnci Nokta', icon: CircleDot },
  neon: { label: 'Neon', icon: Sparkles },
  dashed: { label: 'Kesikli', icon: Minus },
  spray: { label: 'Sprey', icon: Droplets },
  highlighter: { label: 'Fosforlu', icon: Highlighter },
};

const SHAPE_OPTIONS: { id: ShapeKind; label: string; icon: typeof Minus }[] = [
  { id: 'line', label: 'Çizgi', icon: Minus },
  { id: 'arrow', label: 'Ok', icon: ArrowUpRight },
  { id: 'doubleArrow', label: 'Çift Ok', icon: ArrowLeftRight },
  { id: 'rect', label: 'Dikdörtgen', icon: Square },
  { id: 'roundedRect', label: 'Yuvarlak Kutu', icon: Square },
  { id: 'circle', label: 'Daire / Elips', icon: Circle },
  { id: 'triangle', label: 'Üçgen', icon: Triangle },
  { id: 'diamond', label: 'Elmas', icon: Diamond },
  { id: 'hexagon', label: 'Altıgen', icon: Hexagon },
  { id: 'star', label: 'Yıldız', icon: Star },
];

const STAMP_OPTIONS: { id: StampKind; label: string; icon: typeof Check }[] = [
  { id: 'check', label: 'Onay', icon: Check },
  { id: 'star', label: 'Yıldız', icon: Star },
  { id: 'heart', label: 'Kalp', icon: Heart },
  { id: 'idea', label: 'Fikir', icon: Lightbulb },
  { id: 'pin', label: 'Sabit', icon: Pin },
  { id: 'target', label: 'Hedef', icon: Target },
  { id: 'alert', label: 'Dikkat', icon: AlertCircle },
  { id: 'arrow', label: 'Yön', icon: ArrowRight },
];

const QUICK_TAG_SUGGESTIONS = ['ders', 'iş', 'fikir', 'günlük', 'önemli'];

function toLocalDatetimeValue(ts?: number | null): string {
  if (!ts) return '';
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function normalizeNotePages(note: Note): NotePage[] {
  if (note.pages && note.pages.length > 0) {
    return note.pages;
  }
  return [
    {
      id: `page_${note.id}_0`,
      content: note.content || '',
      checklists: note.checklists || [],
      strokes: note.strokes || [],
      attachments: note.attachments || [],
      stamps: note.stamps || [],
      textBoxes: note.textBoxes || [],
      paperTheme: note.paperTheme || 'amoled',
      paperPattern: note.paperPattern || 'blank',
    },
  ];
}

function loadRecentColors(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_COLORS_KEY);
    if (!raw) return DEFAULT_RECENT_COLORS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.slice(0, 5);
    }
  } catch {
    // ignore storage errors
  }
  return DEFAULT_RECENT_COLORS;
}

function loadBooleanPref(key: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(key);
    if (raw === 'true') return true;
    if (raw === 'false') return false;
  } catch {
    // ignore storage errors
  }
  return fallback;
}

function loadFavoritePens(): FavoritePenPreset[] {
  try {
    const raw = localStorage.getItem(FAVORITE_PENS_KEY);
    if (!raw) return DEFAULT_FAVORITE_PENS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.slice(0, 6);
    }
  } catch {
    // ignore storage errors
  }
  return DEFAULT_FAVORITE_PENS;
}

interface PageHistoryEntry extends PageHistorySnapshot {
  pageIdx: number;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
  note,
  folders,
  onChange,
  onBack,
  onMoveToTrash,
}) => {
  const { accentCss, darkCss } = useExpressive();

  const pages = useMemo(() => normalizeNotePages(note), [note]);
  const activePageIdx = Math.min(
    Math.max(0, note.activePageIndex || 0),
    pages.length - 1
  );
  const currentPage = pages[activePageIdx];

  const pageTheme = currentPage.paperTheme || note.paperTheme || 'amoled';
  const pagePattern = currentPage.paperPattern || note.paperPattern || 'blank';
  const pageStamps = currentPage.stamps || [];

  const [tool, setTool] = useState<EditorTool>(
    currentPage.strokes.length > 0 && !currentPage.content ? 'pen' : 'text'
  );
  const [penStyle, setPenStyle] = useState<PenStyle>('ballpoint');
  const [dashStyle, setDashStyle] = useState<StrokeDashStyle>('solid');
  const [shapeKind, setShapeKind] = useState<ShapeKind>('line');
  const [shapeFilled, setShapeFilled] = useState(false);
  const [stampKind, setStampKind] = useState<StampKind>('check');
  const [stampSize, setStampSize] = useState<number>(48);
  const [penColor, setPenColor] = useState<string>('#a3f0f0');
  const [recentColors, setRecentColors] = useState<string[]>(loadRecentColors);
  const [strokeWidth, setStrokeWidth] = useState<number>(4);
  const [penOpacity, setPenOpacity] = useState<number>(1);
  const [eraserSize, setEraserSize] = useState<number>(18);
  const [smartShapeEnabled, setSmartShapeEnabled] = useState<boolean>(true);
  const [autoStylusEnabled, setAutoStylusEnabled] = useState<boolean>(() =>
    loadBooleanPref(AUTO_STYLUS_KEY, true)
  );
  const [stylusOnlyDrawing, setStylusOnlyDrawing] = useState<boolean>(() =>
    loadBooleanPref(STYLUS_ONLY_KEY, false)
  );
  const [favoritePens, setFavoritePens] = useState<FavoritePenPreset[]>(loadFavoritePens);
  const [stylusDetected, setStylusDetected] = useState<boolean>(false);
  const stylusToastedRef = useRef<boolean>(false);

  const [showRuler, setShowRuler] = useState<boolean>(false);
  const [rulerPos, setRulerPos] = useState<{ x: number; y: number; angleDeg: number }>({
    x: 430,
    y: 380,
    angleDeg: 0,
  });

  const [isReadMode, setIsReadMode] = useState(false);
  const [isFullWidth, setIsFullWidth] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scrollLocked, setScrollLocked] = useState(false);
  const [showEasyWritingPad, setShowEasyWritingPad] = useState(false);
  const [easyPadPos, setEasyPadPos] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>({ x: 40, y: 180, width: 340, height: 120 });
  const [zoom, setZoom] = useState<number>(1);
  const [showPagesDrawer, setShowPagesDrawer] = useState(false);

  const [showFindBar, setShowFindBar] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [replaceText, setReplaceText] = useState('');

  const [newTagInput, setNewTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [showPinSetupModal, setShowPinSetupModal] = useState(false);
  const [showTemplateApplyModal, setShowTemplateApplyModal] = useState(false);

  const [showInsertMenu, setShowInsertMenu] = useState(false);
  const [showPageMenu, setShowPageMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showWidthMenu, setShowWidthMenu] = useState(false);
  const [showPenStyleMenu, setShowPenStyleMenu] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showShapeMenu, setShowShapeMenu] = useState(false);
  const [showStampMenu, setShowStampMenu] = useState(false);
  const [showExpressivePanel, setShowExpressivePanel] = useState(false);

  const [undoHistory, setUndoHistory] = useState<PageHistoryEntry[]>([]);
  const [redoStack, setRedoStack] = useState<PageHistoryEntry[]>([]);
  const lastAutoShapeRawRef = useRef<{
    pageIdx: number;
    strokeId: string;
    rawStroke: InkStroke;
  } | null>(null);

  const [selectedStrokeIds, setSelectedStrokeIds] = useState<string[]>([]);
  const [selectedAttachmentId, setSelectedAttachmentId] = useState<string | null>(null);
  const [selectedTextBoxId, setSelectedTextBoxId] = useState<string | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<NoteAttachment | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [editorToast, setEditorToast] = useState<string | null>(null);
  const [canRevertAutoShape, setCanRevertAutoShape] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  const logicalWidth = note.canvasWidth || 860;
  const logicalHeight = note.canvasHeight || 1100;
  const isLightPaper = pageTheme === 'paper';
  const fontSize = note.fontSize || 16;

  const showToast = useCallback(
    (
      msg: string,
      rawSnap?: { pageIdx: number; strokeId: string; rawStroke: InkStroke }
    ) => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      if (rawSnap) {
        lastAutoShapeRawRef.current = rawSnap;
        setCanRevertAutoShape(true);
      } else {
        setCanRevertAutoShape(false);
      }
      setEditorToast(msg);
      toastTimerRef.current = window.setTimeout(() => {
        setEditorToast(null);
        setCanRevertAutoShape(false);
      }, 3200);
    },
    []
  );

  const closeAllMenus = useCallback(() => {
    setShowInsertMenu(false);
    setShowPageMenu(false);
    setShowMoreMenu(false);
    setShowWidthMenu(false);
    setShowPenStyleMenu(false);
    setShowColorMenu(false);
    setShowShapeMenu(false);
    setShowStampMenu(false);
    setShowExpressivePanel(false);
  }, []);

  const selectTool = useCallback(
    (nextTool: EditorTool) => {
      closeAllMenus();
      setTool(nextTool);
      if (nextTool !== 'lasso') {
        setSelectedStrokeIds([]);
      }
      if (
        nextTool === 'pen' ||
        nextTool === 'highlighter' ||
        nextTool === 'laser' ||
        nextTool === 'eraser' ||
        nextTool === 'lasso' ||
        nextTool === 'shape' ||
        nextTool === 'stamp'
      ) {
        setSelectedAttachmentId(null);
        setSelectedTextBoxId(null);
      }
    },
    [closeAllMenus]
  );

  const anyHeaderMenuOpen = showInsertMenu || showPageMenu || showMoreMenu;
  const anyToolbarMenuOpen =
    showWidthMenu ||
    showPenStyleMenu ||
    showColorMenu ||
    showShapeMenu ||
    showStampMenu;
  const anyMenuOpen =
    anyHeaderMenuOpen || anyToolbarMenuOpen || showExpressivePanel;

  const applyColor = useCallback((hex: string) => {
    setPenColor(hex);
    setRecentColors((prev) => {
      const next = [hex, ...prev.filter((c) => c.toLowerCase() !== hex.toLowerCase())].slice(
        0,
        5
      );
      try {
        localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  const handleToggleAutoStylus = useCallback((next: boolean) => {
    setAutoStylusEnabled(next);
    try {
      localStorage.setItem(AUTO_STYLUS_KEY, String(next));
    } catch {
      // ignore storage errors
    }
  }, []);

  const handleToggleStylusOnly = useCallback(
    (next: boolean) => {
      setStylusOnlyDrawing(next);
      try {
        localStorage.setItem(STYLUS_ONLY_KEY, String(next));
      } catch {
        // ignore storage errors
      }
      showToast(
        next
          ? 'Avuç içi reddi açık — parmak sayfayı kaydırır, yalnızca kalem çizer'
          : 'Parmak ve kalem ile çizim açık'
      );
    },
    [showToast]
  );

  const handleStylusDetected = useCallback(
    (switchToPen: boolean) => {
      setStylusDetected(true);
      if (switchToPen) {
        closeAllMenus();
        setTool('pen');
        setSelectedAttachmentId(null);
        setSelectedTextBoxId(null);
        if (!stylusToastedRef.current) {
          stylusToastedRef.current = true;
          showToast('Kalem algılandı — yazmaya hazırsınız');
        }
      }
    },
    [closeAllMenus, showToast]
  );

  const handleSaveFavoritePen = useCallback(() => {
    const activeTool: 'pen' | 'highlighter' =
      tool === 'highlighter' ? 'highlighter' : 'pen';
    const activeStyle: PenStyle =
      activeTool === 'highlighter' ? 'highlighter' : penStyle;
    const label = PEN_LABEL_MAP[activeStyle]?.label || 'Kalem';
    const newPreset: FavoritePenPreset = {
      id: `fav_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      label,
      tool: activeTool,
      penStyle: activeStyle,
      color: penColor,
      width: strokeWidth,
      opacity: activeTool === 'highlighter' ? 0.36 : penOpacity,
      dashStyle: activeTool === 'highlighter' ? 'solid' : dashStyle,
    };
    setFavoritePens((prev) => {
      const filtered = prev.filter(
        (fp) =>
          !(
            fp.penStyle === newPreset.penStyle &&
            fp.color.toLowerCase() === newPreset.color.toLowerCase() &&
            fp.width === newPreset.width &&
            fp.dashStyle === newPreset.dashStyle
          )
      );
      const next = [newPreset, ...filtered].slice(0, 6);
      try {
        localStorage.setItem(FAVORITE_PENS_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
    showToast(`${label} (${strokeWidth}px) favori kalemlere eklendi`);
  }, [tool, penStyle, penColor, strokeWidth, penOpacity, dashStyle, showToast]);

  const handleApplyFavoritePen = useCallback(
    (fp: FavoritePenPreset) => {
      setPenStyle(fp.penStyle);
      applyColor(fp.color);
      setStrokeWidth(fp.width);
      setPenOpacity(fp.opacity);
      setDashStyle(fp.dashStyle);
      setTool(fp.tool);
      setSelectedAttachmentId(null);
      setSelectedTextBoxId(null);
      closeAllMenus();
    },
    [applyColor, closeAllMenus]
  );

  const handleDeleteFavoritePen = useCallback((id: string) => {
    setFavoritePens((prev) => {
      const next = prev.filter((fp) => fp.id !== id);
      try {
        localStorage.setItem(FAVORITE_PENS_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const updatePageAt = useCallback(
    (idx: number, patch: Partial<NotePage>, historySnapshot?: PageHistorySnapshot) => {
      if (historySnapshot) {
        setUndoHistory((prev) => [
          ...prev.slice(-29),
          {
            pageIdx: idx,
            strokes: historySnapshot.strokes,
            stamps: historySnapshot.stamps,
            textBoxes: historySnapshot.textBoxes,
          },
        ]);
        setRedoStack([]);
      }
      const nextPages = pages.map((p, i) => (i === idx ? { ...p, ...patch } : p));
      const first = nextPages[0];
      onChange({
        ...note,
        pages: nextPages,
        activePageIndex: idx,
        content: first.content,
        checklists: first.checklists,
        strokes: first.strokes,
        attachments: first.attachments,
        stamps: first.stamps || [],
        textBoxes: first.textBoxes || [],
        paperTheme: first.paperTheme || note.paperTheme,
        paperPattern: first.paperPattern || note.paperPattern,
        updatedAt: Date.now(),
      });
    },
    [pages, note, onChange]
  );

  const scrollToPageSheet = useCallback((idx: number) => {
    window.setTimeout(() => {
      const el = document.getElementById(`note-page-sheet-${idx}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 40);
  }, []);

  const switchToPage = useCallback(
    (idx: number, shouldScroll = true) => {
      const clamped = Math.min(Math.max(0, idx), pages.length - 1);
      if (clamped !== activePageIdx) {
        setSelectedStrokeIds([]);
        setSelectedAttachmentId(null);
        setSelectedTextBoxId(null);
        onChange({
          ...note,
          pages,
          activePageIndex: clamped,
        });
      }
      if (shouldScroll) {
        scrollToPageSheet(clamped);
      }
    },
    [activePageIdx, pages, note, onChange, scrollToPageSheet]
  );

  const handleAddPage = useCallback(
    (insertAfterCurrent = true) => {
      const newPage: NotePage = {
        id: `page_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        content: '',
        checklists: [],
        strokes: [],
        attachments: [],
        stamps: [],
        textBoxes: [],
        paperTheme: pageTheme,
        paperPattern: pagePattern,
      };
      const insertIdx = insertAfterCurrent ? activePageIdx + 1 : pages.length;
      const nextPages = [
        ...pages.slice(0, insertIdx),
        newPage,
        ...pages.slice(insertIdx),
      ];
      setSelectedStrokeIds([]);
      setSelectedAttachmentId(null);
      setSelectedTextBoxId(null);
      onChange({
        ...note,
        pages: nextPages,
        activePageIndex: insertIdx,
        updatedAt: Date.now(),
      });
      showToast(`Sayfa ${insertIdx + 1} oluşturuldu`);
      scrollToPageSheet(insertIdx);
    },
    [activePageIdx, pages, pageTheme, pagePattern, note, onChange, showToast, scrollToPageSheet]
  );

  const handleDuplicatePage = (idx: number) => {
    const src = pages[idx];
    const copy: NotePage = {
      ...src,
      id: `page_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      strokes: src.strokes.map((s) => ({ ...s, id: `${s.id}_c` })),
      checklists: src.checklists.map((c) => ({ ...c, id: `${c.id}_c` })),
      stamps: (src.stamps || []).map((st) => ({ ...st, id: `${st.id}_c` })),
      textBoxes: (src.textBoxes || []).map((tb) => ({ ...tb, id: `${tb.id}_c` })),
    };
    const nextPages = [...pages.slice(0, idx + 1), copy, ...pages.slice(idx + 1)];
    onChange({
      ...note,
      pages: nextPages,
      activePageIndex: idx + 1,
      updatedAt: Date.now(),
    });
    showToast(`Sayfa ${idx + 1} çoğaltıldı`);
    scrollToPageSheet(idx + 1);
  };

  const handleDeletePage = (idx: number) => {
    if (pages.length <= 1) {
      showToast('En az bir sayfa kalmalıdır');
      return;
    }
    const nextPages = pages.filter((_, i) => i !== idx);
    const nextIdx = Math.min(activePageIdx, nextPages.length - 1);
    const first = nextPages[0];
    onChange({
      ...note,
      pages: nextPages,
      activePageIndex: nextIdx,
      content: first.content,
      checklists: first.checklists,
      strokes: first.strokes,
      attachments: first.attachments,
      stamps: first.stamps || [],
      textBoxes: first.textBoxes || [],
      paperTheme: first.paperTheme || note.paperTheme,
      paperPattern: first.paperPattern || note.paperPattern,
      updatedAt: Date.now(),
    });
    showToast(`Sayfa ${idx + 1} silindi`);
  };

  const handleMovePage = (idx: number, dir: -1 | 1) => {
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= pages.length) return;
    const nextPages = [...pages];
    const [moved] = nextPages.splice(idx, 1);
    nextPages.splice(targetIdx, 0, moved);
    let nextActive = activePageIdx;
    if (activePageIdx === idx) nextActive = targetIdx;
    else if (activePageIdx === targetIdx) nextActive = idx;
    const first = nextPages[0];
    onChange({
      ...note,
      pages: nextPages,
      activePageIndex: nextActive,
      content: first.content,
      checklists: first.checklists,
      strokes: first.strokes,
      attachments: first.attachments,
      stamps: first.stamps || [],
      textBoxes: first.textBoxes || [],
      paperTheme: first.paperTheme || note.paperTheme,
      paperPattern: first.paperPattern || note.paperPattern,
      updatedAt: Date.now(),
    });
    showToast(`Sayfa ${idx + 1} → ${targetIdx + 1}. sıraya taşındı`);
  };

  const handleApplyTemplateToPage = (tpl: NoteTemplate) => {
    const nextContent = currentPage.content
      ? `${currentPage.content}\n\n${tpl.content}`.trim()
      : tpl.content;
    const nextChecklists = tpl.checklistDefaults
      ? [
          ...currentPage.checklists,
          ...tpl.checklistDefaults.map((text, idx) => ({
            id: `chk_${Date.now()}_${idx}`,
            text,
            checked: false,
          })),
        ]
      : currentPage.checklists;
    const nextStrokes = tpl.strokes
      ? [
          ...currentPage.strokes,
          ...tpl.strokes.map((st, idx) => ({
            ...st,
            id: `tpl_st_${Date.now()}_${idx}`,
          })),
        ]
      : currentPage.strokes;
    const nextTextBoxes = tpl.textBoxes
      ? [
          ...(currentPage.textBoxes || []),
          ...tpl.textBoxes.map((tb, idx) => ({
            ...tb,
            id: `tpl_tb_${Date.now()}_${idx}`,
          })),
        ]
      : currentPage.textBoxes || [];

    updatePageAt(activePageIdx, {
      paperTheme: tpl.paperTheme,
      paperPattern: tpl.paperPattern,
      content: nextContent,
      checklists: nextChecklists,
      strokes: nextStrokes,
      textBoxes: nextTextBoxes,
    });
    showToast(`"${tpl.title}" şablonu sayfaya uygulandı`);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      if (recordingTimerRef.current) window.clearInterval(recordingTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const handleUndo = useCallback(() => {
    if (undoHistory.length > 0) {
      const entry = undoHistory[undoHistory.length - 1];
      const targetPage = pages[entry.pageIdx];
      if (!targetPage) return;
      setUndoHistory((prev) => prev.slice(0, -1));
      setRedoStack((prev) => [
        ...prev,
        {
          pageIdx: entry.pageIdx,
          strokes: targetPage.strokes,
          stamps: targetPage.stamps || [],
          textBoxes: targetPage.textBoxes || [],
        },
      ]);
      updatePageAt(entry.pageIdx, {
        strokes: entry.strokes,
        stamps: entry.stamps,
        textBoxes: entry.textBoxes,
      });
    } else if (currentPage.strokes.length > 0) {
      const removed = currentPage.strokes[currentPage.strokes.length - 1];
      setRedoStack((prev) => [
        ...prev,
        {
          pageIdx: activePageIdx,
          strokes: currentPage.strokes,
          stamps: pageStamps,
          textBoxes: currentPage.textBoxes || [],
        },
      ]);
      updatePageAt(activePageIdx, {
        strokes: currentPage.strokes.filter((s) => s.id !== removed.id),
      });
    } else if (pageStamps.length > 0) {
      const removedStamp = pageStamps[pageStamps.length - 1];
      setRedoStack((prev) => [
        ...prev,
        {
          pageIdx: activePageIdx,
          strokes: currentPage.strokes,
          stamps: pageStamps,
          textBoxes: currentPage.textBoxes || [],
        },
      ]);
      updatePageAt(activePageIdx, {
        stamps: pageStamps.filter((st) => st.id !== removedStamp.id),
      });
    }
  }, [
    undoHistory,
    pages,
    currentPage.strokes,
    currentPage.textBoxes,
    pageStamps,
    activePageIdx,
    updatePageAt,
  ]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const entry = redoStack[redoStack.length - 1];
    const targetPage = pages[entry.pageIdx];
    if (!targetPage) return;
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoHistory((prev) => [
      ...prev,
      {
        pageIdx: entry.pageIdx,
        strokes: targetPage.strokes,
        stamps: targetPage.stamps || [],
        textBoxes: targetPage.textBoxes || [],
      },
    ]);
    updatePageAt(entry.pageIdx, {
      strokes: entry.strokes,
      stamps: entry.stamps,
      textBoxes: entry.textBoxes,
    });
  }, [redoStack, pages, updatePageAt]);

  const handleRevertAutoShape = () => {
    const snap = lastAutoShapeRawRef.current;
    if (!snap) return;
    const targetPage = pages[snap.pageIdx];
    if (!targetPage) return;
    updatePageAt(snap.pageIdx, {
      strokes: targetPage.strokes.map((s) =>
        s.id === snap.strokeId ? snap.rawStroke : s
      ),
    });
    lastAutoShapeRawRef.current = null;
    setCanRevertAutoShape(false);
    setEditorToast(null);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const activeTag = (document.activeElement?.tagName || '').toUpperCase();
      const inTextInput = activeTag === 'INPUT' || activeTag === 'TEXTAREA';
      if (mod && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setShowFindBar((v) => !v);
      } else if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void flushPendingSaves().then(() => {
          showToast('Not yerel belleğe kaydedildi');
        });
      } else if (mod && e.key.toLowerCase() === 'z' && !inTextInput) {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if (mod && e.key.toLowerCase() === 'y' && !inTextInput) {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'Escape') {
        closeAllMenus();
        setShowFindBar(false);
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleUndo, handleRedo, showToast, closeAllMenus]);

  const currentHistorySnap: PageHistorySnapshot = {
    strokes: currentPage.strokes,
    stamps: pageStamps,
    textBoxes: currentPage.textBoxes || [],
  };

  const handleDeleteSelectedStrokes = () => {
    if (selectedStrokeIds.length === 0) return;
    const selSet = new Set(selectedStrokeIds);
    updatePageAt(
      activePageIdx,
      { strokes: currentPage.strokes.filter((s) => !selSet.has(s.id)) },
      currentHistorySnap
    );
    setSelectedStrokeIds([]);
  };

  const handleDuplicateSelectedStrokes = () => {
    if (selectedStrokeIds.length === 0) return;
    const selSet = new Set(selectedStrokeIds);
    const clones: InkStroke[] = currentPage.strokes
      .filter((s) => selSet.has(s.id))
      .map((s) => ({
        ...s,
        id: `st_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        points: s.points.map((p) => ({ ...p, x: p.x + 28, y: p.y + 28 })),
      }));
    updatePageAt(
      activePageIdx,
      { strokes: [...currentPage.strokes, ...clones] },
      currentHistorySnap
    );
    setSelectedStrokeIds(clones.map((c) => c.id));
    showToast(`${clones.length} çizgi çoğaltıldı`);
  };

  const handleRecolorSelectedStrokes = () => {
    if (selectedStrokeIds.length === 0) return;
    const selSet = new Set(selectedStrokeIds);
    updatePageAt(
      activePageIdx,
      {
        strokes: currentPage.strokes.map((s) =>
          selSet.has(s.id) ? { ...s, color: penColor } : s
        ),
      },
      currentHistorySnap
    );
    showToast('Seçili çizgilerin rengi güncellendi');
  };

  const handleClearStrokes = () => {
    if (currentPage.strokes.length === 0 && pageStamps.length === 0) return;
    setSelectedStrokeIds([]);
    updatePageAt(activePageIdx, { strokes: [], stamps: [] }, currentHistorySnap);
  };

  const handleAddTag = (rawTag: string) => {
    const clean = rawTag.replace(/^#/, '').trim().toLowerCase();
    if (!clean) return;
    const existing = note.tags || [];
    if (existing.includes(clean)) {
      setNewTagInput('');
      setShowTagInput(false);
      return;
    }
    onChange({
      ...note,
      tags: [...existing, clean],
      updatedAt: Date.now(),
    });
    setNewTagInput('');
    setShowTagInput(false);
  };

  const handleRemoveTag = (tag: string) => {
    onChange({
      ...note,
      tags: (note.tags || []).filter((t) => t !== tag),
      updatedAt: Date.now(),
    });
  };

  const handleAddChecklist = () => {
    updatePageAt(activePageIdx, {
      checklists: [
        ...currentPage.checklists,
        {
          id: `chk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          text: '',
          checked: false,
        },
      ],
    });
    setShowInsertMenu(false);
  };

  const attachMediaFile = async (file: File) => {
    const isVideo = file.type.startsWith('video/');
    if (isVideo && file.size > 45 * 1024 * 1024) {
      showToast('Video dosyası 45 MB sınırını aşıyor');
      return;
    }
    const mediaType: 'image' | 'video' = isVideo ? 'video' : 'image';
    try {
      const dataUrl = isVideo
        ? await readFileAsDataUrl(file)
        : await optimizeImageDataUrl(file);
      const dims = await detectMediaDimensions(dataUrl, mediaType);
      const count = currentPage.attachments.length;
      const newId = `${isVideo ? 'vid' : 'img'}_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 5)}`;
      const item: NoteAttachment = {
        id: newId,
        name: file.name || (isVideo ? 'video.mp4' : 'yapıştırılan-görsel.png'),
        mediaType,
        dataUrl,
        x: Math.min(logicalWidth - dims.width - 20, 64 + (count % 3) * 44),
        y: 180 + (count % 4) * 44,
        width: dims.width,
        height: dims.height,
        aspectRatio: dims.aspectRatio,
        createdAt: Date.now(),
      };
      updatePageAt(activePageIdx, {
        attachments: [...currentPage.attachments, item],
      });
      setSelectedAttachmentId(newId);
      showToast(
        isVideo
          ? 'Video eklendi — izlemek için dokunun, taşımak için basılı tutun'
          : 'Görsel eklendi — bakmak için dokunun, taşımak için basılı tutun'
      );
    } catch {
      showToast('Medya dosyası eklenemedi');
    }
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) attachMediaFile(file);
    e.target.value = '';
    setShowInsertMenu(false);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (isReadMode) return;
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/') || items[i].type.startsWith('video/')) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          attachMediaFile(file);
          break;
        }
      }
    }
  };

  const handleToggleVoiceRecording = async () => {
    setShowInsertMenu(false);
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      showToast('Bu tarayıcıda ses kaydı desteklenmiyor');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      let elapsed = 0;
      setRecordingSeconds(0);

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result !== 'string') return;
          const existing = note.voiceNotes || [];
          onChange({
            ...note,
            voiceNotes: [
              ...existing,
              {
                id: `voice_${Date.now()}`,
                name: `Ses kaydı (${elapsed} sn)`,
                dataUrl: reader.result,
                durationSec: elapsed,
                createdAt: Date.now(),
              },
            ],
            updatedAt: Date.now(),
          });
          showToast('Ses kaydı nota eklendi');
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      recordingTimerRef.current = window.setInterval(() => {
        elapsed++;
        setRecordingSeconds(elapsed);
      }, 1000);
    } catch {
      showToast('Mikrofon izni verilmedi');
    }
  };

  const insertTextSnippet = (snippet: string, wrapEnd?: string) => {
    const sheet = document.getElementById(`note-page-sheet-${activePageIdx}`);
    const el = sheet?.querySelector('textarea') as HTMLTextAreaElement | null;
    if (!el) {
      updatePageAt(activePageIdx, {
        content: currentPage.content
          ? `${currentPage.content}\n${snippet}`
          : snippet,
      });
      return;
    }
    const start = el.selectionStart ?? currentPage.content.length;
    const end = el.selectionEnd ?? currentPage.content.length;
    const selected = currentPage.content.slice(start, end);
    const replacement = wrapEnd
      ? `${snippet}${selected || 'metin'}${wrapEnd}`
      : `${snippet}${selected}`;
    const updated =
      currentPage.content.slice(0, start) +
      replacement +
      currentPage.content.slice(end);
    updatePageAt(activePageIdx, { content: updated });
    setTimeout(() => {
      el.focus();
      const cursorPos =
        wrapEnd && !selected ? start + snippet.length : start + replacement.length;
      const cursorEnd = wrapEnd && !selected ? start + snippet.length + 5 : cursorPos;
      el.setSelectionRange(cursorPos, cursorEnd);
    }, 20);
  };

  const handleInsertTimestamp = () => {
    insertTextSnippet(`[${formatFullDateTR(Date.now())}] `);
    setTool('text');
    setShowInsertMenu(false);
  };

  const findMatchCount = useMemo(() => {
    const q = findQuery.trim().toLowerCase();
    if (!q || !currentPage.content) return 0;
    const hay = currentPage.content.toLowerCase();
    let count = 0;
    let idx = 0;
    while ((idx = hay.indexOf(q, idx)) !== -1) {
      count++;
      idx += q.length;
    }
    return count;
  }, [findQuery, currentPage.content]);

  const handleReplaceOne = () => {
    const q = findQuery;
    if (!q) return;
    const idx = currentPage.content.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) {
      showToast('Eşleşme bulunamadı');
      return;
    }
    const next =
      currentPage.content.slice(0, idx) +
      replaceText +
      currentPage.content.slice(idx + q.length);
    updatePageAt(activePageIdx, { content: next });
    showToast('1 eşleşme değiştirildi');
  };

  const handleReplaceAll = () => {
    const q = findQuery;
    if (!q) return;
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    const matches = currentPage.content.match(regex);
    if (!matches || matches.length === 0) {
      showToast('Eşleşme bulunamadı');
      return;
    }
    const next = currentPage.content.replace(regex, replaceText);
    updatePageAt(activePageIdx, { content: next });
    showToast(`${matches.length} eşleşme değiştirildi`);
  };

  const handleToggleLock = () => {
    if (!note.isLocked && !hasStoredPin()) {
      setShowMoreMenu(false);
      setShowPinSetupModal(true);
      return;
    }
    const nextLocked = !note.isLocked;
    onChange({ ...note, isLocked: nextLocked, updatedAt: Date.now() });
    setShowMoreMenu(false);
    showToast(nextLocked ? 'Not PIN ile kilitlendi' : 'Not kilidi kaldırıldı');
  };

  const handleExportMarkdown = () => {
    const lines: string[] = [];
    lines.push(`# ${note.title || 'Başlıksız Not'}`);
    if ((note.tags || []).length > 0) {
      lines.push(`Etiketler: ${(note.tags || []).map((t) => `#${t}`).join(' ')}`);
    }
    pages.forEach((p, idx) => {
      lines.push('');
      if (pages.length > 1) lines.push(`## Sayfa ${idx + 1}`);
      if (p.content) lines.push(p.content);
      (p.textBoxes || []).forEach((tb) => {
        if (tb.text.trim()) lines.push(tb.text.trim());
      });
      p.checklists.forEach((c) => {
        lines.push(`- [${c.checked ? 'x' : ' '}] ${c.text}`);
      });
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(note.title || 'not').replace(/[^a-z0-9ğüşıöçĞÜŞİÖÇ_-]/gi, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPNG = async () => {
    const outCanvas = document.createElement('canvas');
    outCanvas.width = logicalWidth;
    outCanvas.height = logicalHeight;
    const ctx = outCanvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle =
      pageTheme === 'paper'
        ? '#f4f7f7'
        : pageTheme === 'charcoal'
        ? '#070b0c'
        : '#0b1214';
    ctx.fillRect(0, 0, logicalWidth, logicalHeight);

    ctx.fillStyle = isLightPaper ? '#0b1214' : '#e6f2f2';
    ctx.font = '600 28px "Space Grotesk", sans-serif';
    if (note.title) {
      ctx.fillText(
        pages.length > 1 ? `${note.title} — Sayfa ${activePageIdx + 1}` : note.title,
        48,
        64
      );
    }
    ctx.font = `${fontSize}px ${
      note.isMonospace ? '"JetBrains Mono", monospace' : '"Inter", sans-serif'
    }`;

    const maxChars = Math.floor((logicalWidth - 96) / (fontSize * 0.56));
    let yPos = note.title ? 114 : 64;
    for (const rawLine of (currentPage.content || '').split('\n')) {
      if (rawLine.length === 0) {
        yPos += 28;
        continue;
      }
      for (let i = 0; i < rawLine.length; i += maxChars) {
        ctx.fillText(rawLine.slice(i, i + maxChars), 48, yPos);
        yPos += 28;
        if (yPos > logicalHeight - 60) break;
      }
      if (yPos > logicalHeight - 60) break;
    }

    for (const item of currentPage.checklists) {
      if (yPos > logicalHeight - 50) break;
      ctx.fillText(`${item.checked ? '[x]' : '[ ]'} ${item.text}`, 48, yPos);
      yPos += 28;
    }

    for (let idx = 0; idx < currentPage.attachments.length; idx++) {
      const att = currentPage.attachments[idx];
      if (isVideoAttachment(att)) continue;
      const box = getAttachmentBox(att, idx);
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const ratio = img.naturalWidth / Math.max(img.naturalHeight, 1);
          const boxRatio = box.width / Math.max(box.height, 1);
          let dw = box.width;
          let dh = box.height;
          if (ratio > boxRatio) {
            dh = box.width / ratio;
          } else {
            dw = box.height * ratio;
          }
          const dx = box.x + (box.width - dw) / 2;
          const dy = box.y + (box.height - dh) / 2;
          ctx.drawImage(img, dx, dy, dw, dh);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = att.dataUrl;
      });
    }

    for (const stroke of currentPage.strokes) {
      drawCanvasStroke(ctx, stroke, 1, 1);
    }
    for (const stamp of pageStamps) {
      drawCanvasStamp(ctx, stamp, 1, 1);
    }
    for (const box of currentPage.textBoxes || []) {
      if (!box.text.trim()) continue;
      const fs = box.fontSize || 16;
      ctx.save();
      ctx.fillStyle = box.color || (isLightPaper ? '#0b1214' : '#e6f2f2');
      ctx.font = `${box.bold ? '600' : '400'} ${fs}px "Inter", sans-serif`;
      const maxBoxChars = Math.max(8, Math.floor((box.width - 12) / (fs * 0.56)));
      let ty = box.y + fs + 4;
      for (const rawLine of box.text.split('\n')) {
        if (!rawLine) {
          ty += fs * 1.3;
          continue;
        }
        for (let i = 0; i < rawLine.length; i += maxBoxChars) {
          ctx.fillText(rawLine.slice(i, i + maxBoxChars), box.x + 8, ty);
          ty += fs * 1.3;
        }
      }
      ctx.restore();
    }

    const url = outCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(note.title || 'not').replace(/[^a-z0-9ğüşıöçĞÜŞİÖÇ_-]/gi, '_')}-sayfa${activePageIdx + 1}.png`;
    a.click();
  };

  const docStats = useMemo(() => {
    const allText = pages
      .map((p) => [p.content, ...(p.textBoxes || []).map((tb) => tb.text)].join(' '))
      .join('\n')
      .trim();
    const words = allText ? allText.split(/\s+/).length : 0;
    const totalStrokes = pages.reduce((sum, p) => sum + p.strokes.length, 0);
    return { words, totalStrokes };
  }, [pages]);

  const toolBtnClass =
    'min-w-[36px] h-9 px-2 rounded-xl flex items-center justify-center transition-colors shrink-0 touch-manipulation';
  const popoverTopClass =
    tool !== 'textbox'
      ? 'top-[152px] max-h-[calc(100dvh-166px)]'
      : 'top-[116px] max-h-[calc(100dvh-132px)]';

  const cycleFontSize = () => {
    const next = fontSize === 14 ? 16 : fontSize === 16 ? 19 : 14;
    onChange({ ...note, fontSize: next, updatedAt: Date.now() });
  };

  const voiceNotes = note.voiceNotes || [];
  const tags = note.tags || [];
  const activePenInfo = PEN_LABEL_MAP[penStyle] || PEN_LABEL_MAP.ballpoint;
  const ActivePenIcon = activePenInfo.icon;

  return (
    <div
      onPaste={handlePaste}
      className="flex flex-col h-screen w-full bg-[#0b1214] text-[#e6f2f2] overflow-hidden relative"
    >
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleMediaUpload}
        className="hidden"
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        onChange={handleMediaUpload}
        className="hidden"
      />

      {anyMenuOpen && (
        <div
          className="fixed inset-0 z-[35]"
          onClick={closeAllMenus}
          aria-hidden="true"
        />
      )}

      {isFullscreen && (
        <button
          type="button"
          onClick={() => setIsFullscreen(false)}
          className="no-print fixed top-3 right-4 z-50 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[rgba(14,24,26,0.94)] border border-white/[0.16] text-xs font-medium text-[#e6f2f2] hover:border-[var(--accent)] shadow-xl touch-manipulation"
          title="Tam Ekrandan Çık (Esc)"
        >
          <Minimize className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span>Tam Ekrandan Çık</span>
        </button>
      )}

      {/* Top Editor Header */}
      {!isFullscreen && (
      <header
        className={`relative ${
          anyHeaderMenuOpen ? 'z-50' : 'z-40'
        } flex items-center justify-between gap-2 px-2 sm:px-4 h-14 bg-[#0b1214] border-b border-[#1b2c2e] shrink-0`}
      >
        <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="min-w-[42px] min-h-[42px] flex items-center justify-center rounded-xl text-[#84a0a0] hover:text-[#e6f2f2] hover:bg-[#142225] transition-colors shrink-0"
            aria-label="Geri dön"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <input
            type="text"
            value={note.title}
            readOnly={isReadMode}
            onChange={(e) =>
              onChange({ ...note, title: e.target.value, updatedAt: Date.now() })
            }
            placeholder="Başlık"
            className="font-display w-full min-w-0 bg-transparent text-base sm:text-lg font-semibold text-[#e6f2f2] placeholder:text-[#84a0a0]/60 focus:outline-none truncate"
          />
        </div>

        <div className="flex items-center gap-1 shrink-0 relative">
          {isRecording && (
            <button
              type="button"
              onClick={handleToggleVoiceRecording}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500 text-white text-xs font-medium mr-1"
            >
              <MicOff className="w-3.5 h-3.5" />
              <span className="font-display tabular-nums">
                Durdur ({recordingSeconds}s)
              </span>
            </button>
          )}

          {/* Side Pages Drawer Toggle */}
          <button
            type="button"
            onClick={() => {
              closeAllMenus();
              setShowPagesDrawer((v) => !v);
            }}
            title="Sayfalar Paneli"
            style={
              showPagesDrawer
                ? { backgroundColor: accentCss, color: darkCss }
                : undefined
            }
            className={`h-9 px-2.5 rounded-full flex items-center gap-1.5 text-xs font-medium transition-colors ${
              showPagesDrawer
                ? ''
                : 'bg-[#142225] border border-[#1b2c2e] text-[#e6f2f2] hover:border-[var(--accent)]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="font-display tabular-nums">
              {activePageIdx + 1}/{pages.length}
            </span>
          </button>

          {/* Focus Timer */}
          <FocusTimerPopover onNotify={(m) => showToast(m)} />

          {/* Find & Replace toggle */}
          <button
            type="button"
            onClick={() => {
              closeAllMenus();
              setShowFindBar((v) => !v);
            }}
            title="Not içinde ara ve değiştir (Ctrl+F)"
            style={
              showFindBar
                ? { backgroundColor: accentCss, color: darkCss }
                : undefined
            }
            className={`min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl transition-colors ${
              showFindBar
                ? ''
                : 'text-[#84a0a0] hover:text-[#e6f2f2] hover:bg-[#142225]'
            }`}
            aria-label="Not içinde ara"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Read-mode toggle */}
          <div className="hidden md:flex items-center gap-2 mr-1 px-2 py-1 rounded-full bg-[#142225] border border-[#1b2c2e]">
            <span className="text-[11px] text-[#84a0a0]">Okuma</span>
            <SoftSwitch
              checked={isReadMode}
              onChange={setIsReadMode}
              ariaLabel="Okuma modu"
              size="sm"
            />
          </div>

          {/* Insert Menu (+) */}
          <div className="relative">
            <button
              type="button"
              disabled={isReadMode}
              onClick={() => {
                const next = !showInsertMenu;
                closeAllMenus();
                setShowInsertMenu(next);
              }}
              title="Ekle"
              className="min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl text-[#84a0a0] hover:text-[#e6f2f2] hover:bg-[#142225] disabled:opacity-40 transition-colors"
              aria-label="İçerik ekle"
            >
              <Plus className="w-5 h-5" />
            </button>

            {showInsertMenu && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-12 w-60 rounded-[18px] bg-[rgba(14,24,26,0.96)] border border-white/[0.14] shadow-2xl p-1.5 z-50"
              >
                <button
                  type="button"
                  onClick={() => {
                    handleAddPage(true);
                    setShowInsertMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#e6f2f2] hover:bg-white/[0.08]"
                >
                  <FilePlus2 className="w-4 h-4 text-[var(--accent)]" />
                  <span>Yeni Sayfa Ekle</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowInsertMenu(false);
                    setShowTemplateApplyModal(true);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#e6f2f2] hover:bg-white/[0.08]"
                >
                  <LayoutTemplate className="w-4 h-4 text-[var(--accent)]" />
                  <span>Şablon Uygula</span>
                </button>
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#e6f2f2] hover:bg-white/[0.08]"
                >
                  <ImagePlus className="w-4 h-4 text-[var(--accent)]" />
                  <span>Görsel Ekle</span>
                </button>
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#e6f2f2] hover:bg-white/[0.08]"
                >
                  <Video className="w-4 h-4 text-[var(--accent)]" />
                  <span>Video Ekle</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddChecklist}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#e6f2f2] hover:bg-white/[0.08]"
                >
                  <CheckSquare className="w-4 h-4 text-[var(--accent)]" />
                  <span>Kontrol Listesi Öğesi</span>
                </button>
                <button
                  type="button"
                  onClick={handleToggleVoiceRecording}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#e6f2f2] hover:bg-white/[0.08]"
                >
                  <Mic className="w-4 h-4 text-[var(--accent)]" />
                  <span>{isRecording ? 'Kaydı Durdur' : 'Ses Kaydı Ekle'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleInsertTimestamp}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#e6f2f2] hover:bg-white/[0.08]"
                >
                  <CalendarClock className="w-4 h-4 text-[var(--accent)]" />
                  <span>Tarih & Saat Ekle</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowTagInput(true);
                    setShowInsertMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#e6f2f2] hover:bg-white/[0.08]"
                >
                  <Hash className="w-4 h-4 text-[var(--accent)]" />
                  <span>Etiket Ekle</span>
                </button>
              </div>
            )}
          </div>

          {/* Page Style */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                const next = !showPageMenu;
                closeAllMenus();
                setShowPageMenu(next);
              }}
              title="Sayfa ve Kağıt Stili"
              className="min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl text-[#84a0a0] hover:text-[#e6f2f2] hover:bg-[#142225] transition-colors"
              aria-label="Sayfa stili"
            >
              <FileText className="w-5 h-5" />
            </button>

            {showPageMenu && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-12 w-64 rounded-[18px] bg-[rgba(14,24,26,0.96)] border border-white/[0.14] shadow-2xl p-4 z-50 space-y-4"
              >
                <div>
                  <span className="label-caps block mb-2">
                    Sayfa Rengi (Sayfa {activePageIdx + 1})
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: 'amoled', label: 'Turkuaz', bg: 'bg-[#0b1214] text-[#e6f2f2]' },
                        { id: 'charcoal', label: 'Gece', bg: 'bg-[#070b0c] text-[#e6f2f2]' },
                        { id: 'paper', label: 'Açık', bg: 'bg-[#f4f7f7] text-[#0b1214]' },
                      ] as { id: PaperTheme; label: string; bg: string }[]
                    ).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => updatePageAt(activePageIdx, { paperTheme: t.id })}
                        style={pageTheme === t.id ? { borderColor: accentCss } : undefined}
                        className={`py-2 px-2 rounded-xl text-xs font-medium border transition-colors ${t.bg} ${
                          pageTheme === t.id ? '' : 'border-[#1b2c2e]'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="label-caps block mb-2">Sayfa Deseni</span>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        { id: 'blank', label: 'Düz' },
                        { id: 'ruled', label: 'Çizgili' },
                        { id: 'grid', label: 'Kareli' },
                        { id: 'dotted', label: 'Noktalı' },
                        { id: 'margin', label: 'Kenar Çizgili' },
                        { id: 'cornell', label: 'Cornell' },
                      ] as { id: PaperPattern; label: string }[]
                    ).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => updatePageAt(activePageIdx, { paperPattern: p.id })}
                        style={
                          pagePattern === p.id
                            ? { backgroundColor: accentCss, color: darkCss }
                            : undefined
                        }
                        className={`py-2 px-2.5 rounded-xl text-xs font-medium transition-colors ${
                          pagePattern === p.id
                            ? ''
                            : 'bg-[#142225] text-[#84a0a0] hover:text-[#e6f2f2]'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowPageMenu(false);
                    setShowTemplateApplyModal(true);
                  }}
                  style={{ backgroundColor: accentCss, color: darkCss }}
                  className="w-full py-2 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <LayoutTemplate className="w-3.5 h-3.5" />
                  <span>Şablon Galerisi</span>
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsFullWidth((v) => !v)}
            title={isFullWidth ? 'Standart Genişlik' : 'Tam Genişlik'}
            className="hidden sm:flex min-w-[38px] min-h-[38px] items-center justify-center rounded-xl text-[#84a0a0] hover:text-[#e6f2f2] hover:bg-[#142225] transition-colors"
            aria-label="Genişlik değiştir"
          >
            {isFullWidth ? (
              <Minimize2 className="w-5 h-5" />
            ) : (
              <Maximize2 className="w-5 h-5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              closeAllMenus();
              setIsFullscreen(true);
            }}
            title="Tam Ekran Odak Modu"
            className="min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl text-[#84a0a0] hover:text-[#e6f2f2] hover:bg-[#142225] transition-colors"
            aria-label="Tam ekran modu"
          >
            <Maximize className="w-4 h-4" />
          </button>

          {/* Expressive Settings Gear */}
          <button
            type="button"
            onClick={() => {
              const next = !showExpressivePanel;
              closeAllMenus();
              setShowExpressivePanel(next);
            }}
            aria-expanded={showExpressivePanel}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/[0.14] text-xs font-medium transition-colors ${
              showExpressivePanel
                ? 'bg-white/[0.14] text-[#e6f2f2]'
                : 'bg-white/[0.06] text-[#e6f2f2] hover:bg-white/[0.1]'
            }`}
          >
            <span>⚙</span>
            <span className="hidden sm:inline">Ayarlar</span>
          </button>

          {/* More Menu (⋮) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                const next = !showMoreMenu;
                closeAllMenus();
                setShowMoreMenu(next);
              }}
              title="Diğer seçenekler"
              className="min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl text-[#84a0a0] hover:text-[#e6f2f2] hover:bg-[#142225] transition-colors"
              aria-label="Diğer seçenekler"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {showMoreMenu && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-12 w-72 rounded-[18px] bg-[rgba(14,24,26,0.96)] border border-white/[0.14] shadow-2xl p-3.5 z-50 space-y-3 max-h-[82vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-medium text-[#e6f2f2]">Favori</span>
                  <SoftSwitch
                    checked={note.isPinned}
                    onChange={(next) =>
                      onChange({ ...note, isPinned: next, updatedAt: Date.now() })
                    }
                    ariaLabel="Favorilere ekle"
                    size="sm"
                  />
                </div>

                <div className="flex items-center justify-between px-1 md:hidden">
                  <span className="text-xs font-medium text-[#e6f2f2]">Okuma Modu</span>
                  <SoftSwitch
                    checked={isReadMode}
                    onChange={setIsReadMode}
                    ariaLabel="Okuma modu"
                    size="sm"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleToggleLock}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-[#142225] border border-[#1b2c2e] text-xs font-medium text-[#e6f2f2] hover:border-[var(--accent)]"
                >
                  <span className="flex items-center gap-2">
                    {note.isLocked ? (
                      <LockOpen className="w-3.5 h-3.5 text-[var(--accent)]" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-[var(--accent)]" />
                    )}
                    <span>{note.isLocked ? 'Kilidi Kaldır' : 'Notu PIN ile Kilitle'}</span>
                  </span>
                  <span className="text-[11px] text-[#84a0a0]">
                    {note.isLocked ? 'Açık' : 'Kapalı'}
                  </span>
                </button>

                <div className="p-2.5 rounded-xl bg-[#142225] border border-[#1b2c2e] space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-[#84a0a0]">
                    <span className="flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-[#ffb454]" />
                      <span>Hatırlatıcı</span>
                    </span>
                    {note.reminderAt && (
                      <button
                        type="button"
                        onClick={() =>
                          onChange({ ...note, reminderAt: null, updatedAt: Date.now() })
                        }
                        className="text-[11px] text-[#ff9db8] hover:underline"
                      >
                        Kaldır
                      </button>
                    )}
                  </div>
                  <input
                    type="datetime-local"
                    value={toLocalDatetimeValue(note.reminderAt)}
                    onChange={(e) => {
                      const val = e.target.value;
                      onChange({
                        ...note,
                        reminderAt: val ? new Date(val).getTime() : null,
                        updatedAt: Date.now(),
                      });
                    }}
                    className="w-full rounded-lg bg-[#0b1214] border border-[#1b2c2e] px-2 py-1 text-xs text-[#e6f2f2] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>

                {folders.length > 0 && (
                  <div className="py-2 border-y border-[#1b2c2e]">
                    <div className="flex items-center gap-2 text-xs text-[#84a0a0] mb-1.5">
                      <FolderIcon className="w-3.5 h-3.5" />
                      <span>Klasör</span>
                    </div>
                    <select
                      value={note.folderId || ''}
                      onChange={(e) => {
                        onChange({
                          ...note,
                          folderId: e.target.value || null,
                          updatedAt: Date.now(),
                        });
                      }}
                      className="w-full rounded-xl bg-[#142225] border border-[#1b2c2e] px-2.5 py-1.5 text-xs text-[#e6f2f2]"
                    >
                      <option value="">Klasör yok</option>
                      {folders.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <LoadingActionButton
                  label="Sayfayı PNG Kaydet"
                  onAction={handleExportPNG}
                  height={62}
                />

                <LoadingActionButton
                  label="Markdown (.md)"
                  onAction={handleExportMarkdown}
                  height={62}
                />

                <button
                  type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    window.print();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-[#e6f2f2] hover:bg-white/[0.08]"
                >
                  <Printer className="w-4 h-4 text-[var(--accent)]" />
                  <span>Yazdır / PDF Kaydet</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onMoveToTrash(note.id);
                    setShowMoreMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-[#ff9db8] hover:bg-[#ff9db8]/10"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Çöp Kutusuna Taşı</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      )}

      <ExpressiveSettingsPanel
        isOpen={showExpressivePanel}
        onClose={() => setShowExpressivePanel(false)}
      />

      {/* Find & Replace Bar */}
      {showFindBar && (
        <div className="no-print relative z-20 flex flex-wrap items-center justify-center gap-2 px-3 py-2 bg-[#142225] border-b border-[#1b2c2e]">
          <div className="flex items-center gap-1.5 bg-[#0b1214] border border-[#1b2c2e] rounded-full px-3 h-8">
            <Search className="w-3.5 h-3.5 text-[#84a0a0]" />
            <input
              type="text"
              value={findQuery}
              onChange={(e) => setFindQuery(e.target.value)}
              placeholder="Sayfada ara..."
              autoFocus
              className="w-28 sm:w-36 bg-transparent text-xs text-[#e6f2f2] placeholder:text-[#84a0a0] focus:outline-none"
            />
            {findQuery && (
              <span className="font-display text-[11px] text-[var(--accent)] tabular-nums">
                {findMatchCount}
              </span>
            )}
          </div>

          {!isReadMode && (
            <>
              <div className="flex items-center gap-1.5 bg-[#0b1214] border border-[#1b2c2e] rounded-full px-3 h-8">
                <Replace className="w-3.5 h-3.5 text-[#84a0a0]" />
                <input
                  type="text"
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                  placeholder="Yeni metin..."
                  className="w-28 sm:w-36 bg-transparent text-xs text-[#e6f2f2] placeholder:text-[#84a0a0] focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={handleReplaceOne}
                className="px-3 h-8 rounded-full bg-[#0b1214] border border-[#1b2c2e] text-xs font-medium text-[#e6f2f2] hover:border-[var(--accent)]"
              >
                Değiştir
              </button>
              <button
                type="button"
                onClick={handleReplaceAll}
                style={{ backgroundColor: accentCss, color: darkCss }}
                className="px-3 h-8 rounded-full text-xs font-semibold"
              >
                Tümünü Değiştir
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setShowFindBar(false)}
            className="p-1.5 rounded-full text-[#84a0a0] hover:text-[#e6f2f2]"
            aria-label="Aramayı kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Samsung Notes Inspired Toolbar */}
      {!isReadMode && !isFullscreen && (
        <div
          className={`no-print relative ${
            anyToolbarMenuOpen ? 'z-50' : 'z-20'
          } flex flex-col items-center gap-1.5 px-2 py-2 bg-[#0b1214] border-b border-[#1b2c2e] shrink-0`}
        >
          <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#142225] border border-[#1b2c2e] max-w-full overflow-x-auto no-scrollbar">
            {/* Text / Keyboard Mode */}
            <button
              type="button"
              onClick={() => selectTool('text')}
              title="Klavye / Metin Modu"
              style={
                tool === 'text'
                  ? { backgroundColor: accentCss, color: darkCss }
                  : undefined
              }
              className={`${toolBtnClass} ${
                tool === 'text' ? '' : 'text-[#84a0a0] hover:text-[#e6f2f2]'
              }`}
            >
              <Keyboard className="w-4 h-4" />
            </button>

            {/* Click Anywhere to Write (Metin Kutusu) */}
            <button
              type="button"
              onClick={() => {
                selectTool('textbox');
                showToast('Sayfanın istediğiniz yerine dokunup hemen yazabilirsiniz');
              }}
              title="İstediğin Yere Yaz (Metin Kutusu)"
              style={
                tool === 'textbox'
                  ? { backgroundColor: accentCss, color: darkCss }
                  : undefined
              }
              className={`${toolBtnClass} ${
                tool === 'textbox' ? '' : 'text-[#84a0a0] hover:text-[#e6f2f2]'
              }`}
            >
              <Type className="w-4 h-4" />
            </button>

            {/* Pen Studio Button & Popover */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (tool === 'pen') {
                    const next = !showPenStyleMenu;
                    closeAllMenus();
                    setShowPenStyleMenu(next);
                  } else {
                    selectTool('pen');
                    setShowPenStyleMenu(true);
                  }
                }}
                title={`${activePenInfo.label} (Kalem Stüdyosu)`}
                style={
                  tool === 'pen'
                    ? { backgroundColor: accentCss, color: darkCss }
                    : undefined
                }
                className={`${toolBtnClass} gap-1.5 ${
                  tool === 'pen' ? '' : 'text-[#84a0a0] hover:text-[#e6f2f2]'
                }`}
              >
                <ActivePenIcon className="w-4 h-4" />
                <span className="hidden lg:inline text-xs font-medium">
                  {activePenInfo.label}
                </span>
              </button>
            </div>

            {/* Highlighter */}
            <button
              type="button"
              onClick={() => selectTool('highlighter')}
              title="Fosforlu Kalem"
              style={
                tool === 'highlighter'
                  ? { backgroundColor: accentCss, color: darkCss }
                  : undefined
              }
              className={`${toolBtnClass} ${
                tool === 'highlighter' ? '' : 'text-[#84a0a0] hover:text-[#e6f2f2]'
              }`}
            >
              <Highlighter className="w-4 h-4" />
            </button>

            {/* Samsung Notes Laser Pointer */}
            <button
              type="button"
              onClick={() => {
                selectTool('laser');
                showToast('Lazer işaretçi — iziniz 1.4 sn sonra kaybolur');
              }}
              title="Lazer İşaretçi (Geçici Sunum Lazeri)"
              style={
                tool === 'laser'
                  ? { backgroundColor: accentCss, color: darkCss }
                  : undefined
              }
              className={`${toolBtnClass} gap-1 ${
                tool === 'laser' ? '' : 'text-[#84a0a0] hover:text-[#e6f2f2]'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span className="hidden xl:inline text-[11px] font-semibold">Lazer</span>
            </button>

            {/* Eraser */}
            <button
              type="button"
              onClick={() => selectTool('eraser')}
              title="Silgi"
              style={
                tool === 'eraser'
                  ? { backgroundColor: accentCss, color: darkCss }
                  : undefined
              }
              className={`${toolBtnClass} ${
                tool === 'eraser' ? '' : 'text-[#84a0a0] hover:text-[#e6f2f2]'
              }`}
            >
              <Eraser className="w-4 h-4" />
            </button>

            {/* Lasso */}
            <button
              type="button"
              onClick={() => selectTool('lasso')}
              title="Kement Seçim Aracı"
              style={
                tool === 'lasso'
                  ? { backgroundColor: accentCss, color: darkCss }
                  : undefined
              }
              className={`${toolBtnClass} ${
                tool === 'lasso' ? '' : 'text-[#84a0a0] hover:text-[#e6f2f2]'
              }`}
            >
              <Lasso className="w-4 h-4" />
            </button>

            <div className="h-5 w-px bg-[#1b2c2e] mx-0.5 shrink-0" />

            {/* Inline Color Dots + Rainbow Color Picker Trigger */}
            <div className="relative shrink-0 flex items-center gap-1 px-1">
              {recentColors.slice(0, 3).map((hex) => {
                const active = penColor.toLowerCase() === hex.toLowerCase();
                return (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => {
                      applyColor(hex);
                      if (
                        tool === 'text' ||
                        tool === 'textbox' ||
                        tool === 'eraser' ||
                        tool === 'pan'
                      ) {
                        selectTool('pen');
                      }
                    }}
                    style={{ backgroundColor: hex }}
                    className={`w-5 h-5 rounded-full border transition-transform shrink-0 touch-manipulation ${
                      active ? 'border-white scale-115 ring-2 ring-white/30' : 'border-white/20'
                    }`}
                    aria-label={hex}
                  />
                );
              })}
              <button
                type="button"
                onClick={() => {
                  const next = !showColorMenu;
                  closeAllMenus();
                  setShowColorMenu(next);
                }}
                title="Kartelalar ve Spektrum Renk Seçici"
                className="w-5 h-5 rounded-full border border-white/35 shrink-0 hover:scale-110 transition-transform touch-manipulation"
                style={{
                  background:
                    'conic-gradient(#ff4d4d, #ffb454, #fde047, #a6f0a6, #67e8f9, #818cf8, #f472b6, #ff4d4d)',
                }}
                aria-label="Renk seçici aç"
              />
            </div>

            <div className="h-5 w-px bg-[#1b2c2e] mx-0.5 shrink-0" />

            {/* Width / Opacity / Eraser Size Sliders */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => {
                  const next = !showWidthMenu;
                  closeAllMenus();
                  setShowWidthMenu(next);
                }}
                title="Kalem Kalınlığı, Opaklık ve Silgi Çapı"
                className="min-w-[36px] h-9 px-2 rounded-xl flex items-center justify-center text-[#e6f2f2] hover:bg-white/[0.08] touch-manipulation"
              >
                <span
                  className="block rounded-full bg-current"
                  style={{
                    width: Math.min(strokeWidth * 1.6 + 6, 20),
                    height: Math.max(2, Math.min(strokeWidth, 8)),
                  }}
                />
              </button>
            </div>

            {/* Shapes */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (tool === 'shape') {
                    const next = !showShapeMenu;
                    closeAllMenus();
                    setShowShapeMenu(next);
                  } else {
                    selectTool('shape');
                    setShowShapeMenu(true);
                  }
                }}
                title="Hazır Şekil Çiz"
                style={
                  tool === 'shape'
                    ? { backgroundColor: accentCss, color: darkCss }
                    : undefined
                }
                className={`${toolBtnClass} ${
                  tool === 'shape' ? '' : 'text-[#84a0a0] hover:text-[#e6f2f2]'
                }`}
              >
                <Shapes className="w-4 h-4" />
              </button>
            </div>

            {/* Stamps */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (tool === 'stamp') {
                    const next = !showStampMenu;
                    closeAllMenus();
                    setShowStampMenu(next);
                  } else {
                    selectTool('stamp');
                    setShowStampMenu(true);
                  }
                }}
                title="Damga / Çıkartma"
                style={
                  tool === 'stamp'
                    ? { backgroundColor: accentCss, color: darkCss }
                    : undefined
                }
                className={`${toolBtnClass} ${
                  tool === 'stamp' ? '' : 'text-[#84a0a0] hover:text-[#e6f2f2]'
                }`}
              >
                <Sticker className="w-4 h-4" />
              </button>
            </div>

            {/* Smart Auto-Shape */}
            <button
              type="button"
              onClick={() => {
                const next = !smartShapeEnabled;
                setSmartShapeEnabled(next);
                showToast(
                  next
                    ? 'Akıllı Şekil Düzeltme açıldı (çizdiğiniz kare, daire, üçgen otomatik düzelir)'
                    : 'Akıllı Şekil Düzeltme kapatıldı'
                );
              }}
              title="Akıllı Şekil Algılama"
              style={
                smartShapeEnabled
                  ? { backgroundColor: accentCss, color: darkCss }
                  : undefined
              }
              className={`${toolBtnClass} gap-1 ${
                smartShapeEnabled ? '' : 'text-[#84a0a0] hover:text-[#e6f2f2]'
              }`}
            >
              <Wand2 className="w-4 h-4" />
              <span className="hidden xl:inline text-[11px] font-semibold">Akıllı</span>
            </button>

            {/* Ruler */}
            <button
              type="button"
              onClick={() => setShowRuler((v) => !v)}
              title="Ekranda Cetvel"
              style={
                showRuler
                  ? { backgroundColor: accentCss, color: darkCss }
                  : undefined
              }
              className={`${toolBtnClass} ${
                showRuler ? '' : 'text-[#84a0a0] hover:text-[#e6f2f2]'
              }`}
            >
              <Ruler className="w-4 h-4" />
            </button>

            {/* Pan */}
            <button
              type="button"
              onClick={() => selectTool('pan')}
              title="Kaydırma / Medya Düzenleme Modu"
              style={
                tool === 'pan'
                  ? { backgroundColor: accentCss, color: darkCss }
                  : undefined
              }
              className={`${toolBtnClass} ${
                tool === 'pan' ? '' : 'text-[#84a0a0] hover:text-[#e6f2f2]'
              }`}
            >
              <Hand className="w-4 h-4" />
            </button>

            {/* Palm Rejection / Stylus-Only Toggle */}
            <button
              type="button"
              onClick={() => handleToggleStylusOnly(!stylusOnlyDrawing)}
              title={
                stylusOnlyDrawing
                  ? 'Yalnızca Kalemle Çiz Açık (Parmak sayfayı kaydırır)'
                  : 'Yalnızca Kalemle Çiz / Avuç İçi Reddi'
              }
              style={
                stylusOnlyDrawing
                  ? { backgroundColor: accentCss, color: darkCss }
                  : undefined
              }
              className={`${toolBtnClass} gap-1 ${
                stylusOnlyDrawing ? '' : 'text-[#84a0a0] hover:text-[#e6f2f2]'
              }`}
              aria-label="Yalnızca kalemle çiz"
            >
              <PenTool className="w-4 h-4" />
              {stylusDetected && (
                <span className="hidden xl:inline text-[10px] font-semibold">
                  S Pen
                </span>
              )}
            </button>

            {/* Samsung Notes Easy Writing Pad (a↕) */}
            <button
              type="button"
              onClick={() => {
                const next = !showEasyWritingPad;
                setShowEasyWritingPad(next);
                if (next && (tool === 'text' || tool === 'textbox' || tool === 'pan')) {
                  selectTool('pen');
                }
              }}
              title="Kolay Yazma Pedi (Yakınlaştırılmış El Yazısı Alanı)"
              style={
                showEasyWritingPad
                  ? { backgroundColor: accentCss, color: darkCss }
                  : undefined
              }
              className={`${toolBtnClass} ${
                showEasyWritingPad ? '' : 'text-[#84a0a0] hover:text-[#e6f2f2]'
              }`}
              aria-label="Kolay yazma pedi"
            >
              <span className="font-display text-xs font-bold leading-none">a↕</span>
            </button>

            {/* Scroll Lock */}
            <button
              type="button"
              onClick={() => {
                const next = !scrollLocked;
                setScrollLocked(next);
                showToast(
                  next
                    ? 'Sayfa kaydırma kilitlendi'
                    : 'Sayfa kaydırma kilidi açıldı'
                );
              }}
              title={scrollLocked ? 'Kaydırma Kilidini Aç' : 'Sayfa Kaydırmayı Kilitle'}
              style={
                scrollLocked
                  ? { backgroundColor: accentCss, color: darkCss }
                  : undefined
              }
              className={`${toolBtnClass} ${
                scrollLocked ? '' : 'text-[#84a0a0] hover:text-[#e6f2f2]'
              }`}
              aria-label="Sayfa kaydırma kilidi"
            >
              {scrollLocked ? (
                <Lock className="w-4 h-4" />
              ) : (
                <LockOpen className="w-4 h-4" />
              )}
            </button>

            {/* Quick Image & Video Insert */}
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              title="Görsel Ekle (Taşınabilir & Boyutlandırılabilir)"
              className={`${toolBtnClass} text-[#84a0a0] hover:text-[#e6f2f2]`}
              aria-label="Görsel ekle"
            >
              <ImagePlus className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              title="Video Ekle (Taşınabilir & Boyutlandırılabilir)"
              className={`${toolBtnClass} text-[#84a0a0] hover:text-[#e6f2f2]`}
              aria-label="Video ekle"
            >
              <Video className="w-4 h-4" />
            </button>

            <div className="h-5 w-px bg-[#1b2c2e] mx-0.5 shrink-0" />

            {/* Undo / Redo */}
            <button
              type="button"
              onClick={handleUndo}
              disabled={
                undoHistory.length === 0 &&
                currentPage.strokes.length === 0 &&
                pageStamps.length === 0
              }
              title="Geri Al"
              className="min-w-[34px] h-9 flex items-center justify-center rounded-xl text-[#84a0a0] hover:text-[#e6f2f2] hover:bg-white/[0.08] disabled:opacity-30 shrink-0"
            >
              <Undo2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              title="Yinele"
              className="min-w-[34px] h-9 flex items-center justify-center rounded-xl text-[#84a0a0] hover:text-[#e6f2f2] hover:bg-white/[0.08] disabled:opacity-30 shrink-0"
            >
              <Redo2 className="w-4 h-4" />
            </button>

            {selectedStrokeIds.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleDuplicateSelectedStrokes}
                  title="Seçileni Çoğalt"
                  className="px-2 h-9 flex items-center gap-1 rounded-xl bg-white/[0.08] text-[#e6f2f2] hover:bg-white/[0.14] shrink-0"
                >
                  <Copy className="w-3.5 h-3.5 text-[var(--accent)]" />
                </button>
                <button
                  type="button"
                  onClick={handleRecolorSelectedStrokes}
                  title="Seçileni Aktif Renge Boya"
                  className="px-2 h-9 flex items-center gap-1 rounded-xl bg-white/[0.08] text-[#e6f2f2] hover:bg-white/[0.14] shrink-0"
                >
                  <Paintbrush className="w-3.5 h-3.5 text-[var(--accent)]" />
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSelectedStrokes}
                  title="Seçileni Sil"
                  className="px-2 h-9 flex items-center gap-1 rounded-xl bg-[#ff9db8]/20 text-[#ff9db8] hover:bg-[#ff9db8]/30 shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            {(currentPage.strokes.length > 0 || pageStamps.length > 0) && (
              <button
                type="button"
                onClick={handleClearStrokes}
                title="Aktif Sayfanın Çizimlerini Temizle"
                className="min-w-[34px] h-9 flex items-center justify-center rounded-xl text-[#84a0a0] hover:text-[#ff9db8] hover:bg-white/[0.08] shrink-0"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Favorite Pens & Quick Colors Strip when drawing */}
          {tool !== 'text' && tool !== 'textbox' && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#142225] border border-[#1b2c2e] max-w-full overflow-x-auto no-scrollbar">
              {favoritePens.slice(0, 4).map((fp) => {
                const isFavActive =
                  tool === fp.tool &&
                  penStyle === fp.penStyle &&
                  penColor.toLowerCase() === fp.color.toLowerCase() &&
                  strokeWidth === fp.width;
                return (
                  <button
                    key={fp.id}
                    type="button"
                    onClick={() => handleApplyFavoritePen(fp)}
                    title={`Favori: ${fp.label} (${fp.width}px)`}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10.5px] shrink-0 transition-colors ${
                      isFavActive
                        ? 'bg-white/[0.14] border-[var(--accent)] text-[#e6f2f2]'
                        : 'bg-[#0b1214] border-[#1b2c2e] text-[#84a0a0] hover:text-[#e6f2f2]'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-white/30 shrink-0"
                      style={{ backgroundColor: fp.color }}
                    />
                    <span className="font-medium">{fp.label}</span>
                    <span className="font-display opacity-70 tabular-nums">{fp.width}</span>
                  </button>
                );
              })}

              <div className="h-4 w-px bg-[#1b2c2e] shrink-0" />

              {QUICK_PALETTE_COLORS.map((hex) => {
                const active = penColor.toLowerCase() === hex.toLowerCase();
                return (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => applyColor(hex)}
                    style={{ backgroundColor: hex }}
                    className={`w-5 h-5 rounded-full border transition-transform shrink-0 ${
                      active
                        ? 'border-white scale-120 shadow-[0_0_0_2px_rgba(255,255,255,0.3)]'
                        : 'border-white/15 hover:scale-110'
                    }`}
                    aria-label={hex}
                  />
                );
              })}
              <button
                type="button"
                onClick={() => {
                  closeAllMenus();
                  setShowColorMenu(true);
                }}
                title="Tüm Kartelalar & Spektrum"
                className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#0b1214] border border-[#1b2c2e] text-[#e6f2f2] hover:border-[var(--accent)] whitespace-nowrap"
              >
                + Tüm Renkler
              </button>
              {stylusDetected && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] text-[10px] font-medium whitespace-nowrap">
                  Kalem Aktif
                </span>
              )}
            </div>
          )}

          {/* Text Formatting Bar */}
          {tool === 'text' && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#142225] border border-[#1b2c2e] text-xs overflow-x-auto max-w-full no-scrollbar">
              <button
                type="button"
                onClick={cycleFontSize}
                title="Yazı Boyutu"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[#e6f2f2] hover:bg-white/[0.08] whitespace-nowrap"
              >
                <Type className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span className="font-display tabular-nums">{fontSize}px</span>
              </button>

              <div className="flex items-center gap-2 px-1">
                <span className="text-[#84a0a0] whitespace-nowrap">Kod yazı</span>
                <SoftSwitch
                  checked={Boolean(note.isMonospace)}
                  onChange={(next) =>
                    onChange({ ...note, isMonospace: next, updatedAt: Date.now() })
                  }
                  ariaLabel="Kod yazı tipi"
                  size="sm"
                />
              </div>

              <div className="h-4 w-px bg-[#1b2c2e] shrink-0" />

              <button
                type="button"
                onClick={() => insertTextSnippet('**', '**')}
                title="Kalın"
                className="p-1.5 rounded-full text-[#84a0a0] hover:text-[#e6f2f2] hover:bg-white/[0.08]"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => insertTextSnippet('*', '*')}
                title="İtalik"
                className="p-1.5 rounded-full text-[#84a0a0] hover:text-[#e6f2f2] hover:bg-white/[0.08]"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => insertTextSnippet('`', '`')}
                title="Satır içi kod"
                className="p-1.5 rounded-full text-[#84a0a0] hover:text-[#e6f2f2] hover:bg-white/[0.08]"
              >
                <Code className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => insertTextSnippet('> ')}
                title="Alıntı"
                className="p-1.5 rounded-full text-[#84a0a0] hover:text-[#e6f2f2] hover:bg-white/[0.08]"
              >
                <Quote className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => insertTextSnippet('# ')}
                className="flex items-center gap-1 px-2 py-1 rounded-full text-[#84a0a0] hover:text-[#e6f2f2] hover:bg-white/[0.08] whitespace-nowrap"
              >
                <Heading className="w-3.5 h-3.5" />
                <span>Başlık</span>
              </button>

              <button
                type="button"
                onClick={() => insertTextSnippet('• ')}
                className="flex items-center gap-1 px-2 py-1 rounded-full text-[#84a0a0] hover:text-[#e6f2f2] hover:bg-white/[0.08] whitespace-nowrap"
              >
                <List className="w-3.5 h-3.5" />
                <span>Madde</span>
              </button>

              <button
                type="button"
                onClick={handleAddChecklist}
                className="flex items-center gap-1 px-2 py-1 rounded-full text-[#84a0a0] hover:text-[#e6f2f2] hover:bg-white/[0.08] whitespace-nowrap"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Görev</span>
              </button>
            </div>
          )}

          {/* Toolbar Popovers rendered outside overflow-x-auto so they never clip */}
          <PenStudioPopover
            isOpen={showPenStyleMenu}
            topOffsetClass={popoverTopClass}
            penStyle={penStyle}
            dashStyle={dashStyle}
            strokeWidth={strokeWidth}
            penOpacity={penOpacity}
            penColor={penColor}
            smartShapeEnabled={smartShapeEnabled}
            autoStylusEnabled={autoStylusEnabled}
            stylusOnlyDrawing={stylusOnlyDrawing}
            favoritePens={favoritePens}
            quickColors={QUICK_PALETTE_COLORS}
            onSelectPenStyle={(st) => {
              setPenStyle(st);
              setTool('pen');
              setSelectedAttachmentId(null);
              setSelectedTextBoxId(null);
            }}
            onSelectDashStyle={setDashStyle}
            onChangeWidth={setStrokeWidth}
            onChangeOpacity={setPenOpacity}
            onToggleSmartShape={setSmartShapeEnabled}
            onToggleAutoStylus={handleToggleAutoStylus}
            onToggleStylusOnly={handleToggleStylusOnly}
            onSaveFavoritePen={handleSaveFavoritePen}
            onApplyFavoritePen={handleApplyFavoritePen}
            onDeleteFavoritePen={handleDeleteFavoritePen}
            onSelectColor={(hex) => {
              applyColor(hex);
              if (
                tool === 'text' ||
                tool === 'textbox' ||
                tool === 'eraser' ||
                tool === 'pan'
              ) {
                setTool('pen');
                setSelectedAttachmentId(null);
                setSelectedTextBoxId(null);
              }
            }}
            onOpenColorPicker={() => {
              setShowPenStyleMenu(false);
              setShowColorMenu(true);
            }}
            onClose={() => setShowPenStyleMenu(false)}
          />

          <ColorPickerPopover
            isOpen={showColorMenu}
            topOffsetClass={popoverTopClass}
            color={penColor}
            recentColors={recentColors}
            onApply={(nextHex) => {
              applyColor(nextHex);
              if (
                tool === 'text' ||
                tool === 'textbox' ||
                tool === 'eraser' ||
                tool === 'pan'
              ) {
                setTool('pen');
                setSelectedAttachmentId(null);
                setSelectedTextBoxId(null);
              }
            }}
            onClose={() => setShowColorMenu(false)}
          />

          {showWidthMenu && (
            <div
              onClick={(e) => e.stopPropagation()}
              className={`fixed ${popoverTopClass} left-1/2 -translate-x-1/2 w-[min(288px,calc(100vw-24px))] overflow-y-auto touch-pan-y p-3.5 rounded-[18px] bg-[rgba(14,24,26,0.97)] border border-white/[0.14] shadow-2xl z-50 space-y-3`}
            >
              <div className="flex items-center justify-between">
                <span className="label-caps">Çizgi ve Silgi Ayarları</span>
                <button
                  type="button"
                  onClick={() => setShowWidthMenu(false)}
                  className="p-1 text-[#84a0a0] hover:text-[#e6f2f2]"
                  aria-label="Kapat"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="label-caps">Kalem Kalınlığı</span>
                  <span className="font-display text-xs font-semibold text-[#e6f2f2] tabular-nums">
                    {strokeWidth}px
                  </span>
                </div>
                <LiquidSlider
                  ariaLabel="Kalem kalınlığı"
                  height={34}
                  value={(strokeWidth - 1.5) / 14.5}
                  onChange={(v) => setStrokeWidth(Math.round(1.5 + v * 14.5))}
                />
              </div>
              <div className="space-y-1.5 pt-2 border-t border-[#1b2c2e]">
                <div className="flex items-center justify-between">
                  <span className="label-caps">Mürekkep Opaklığı</span>
                  <span className="font-display text-xs font-semibold text-[#e6f2f2] tabular-nums">
                    %{Math.round(penOpacity * 100)}
                  </span>
                </div>
                <LiquidSlider
                  ariaLabel="Mürekkep opaklığı"
                  height={34}
                  value={(penOpacity - 0.2) / 0.8}
                  onChange={(v) => setPenOpacity(Number((0.2 + v * 0.8).toFixed(2)))}
                />
              </div>
              <div className="space-y-1.5 pt-2 border-t border-[#1b2c2e]">
                <div className="flex items-center justify-between">
                  <span className="label-caps">Silgi Çapı</span>
                  <span className="font-display text-xs font-semibold text-[#e6f2f2] tabular-nums">
                    {eraserSize}px
                  </span>
                </div>
                <LiquidSlider
                  ariaLabel="Silgi çapı"
                  height={34}
                  value={(eraserSize - 8) / 36}
                  onChange={(v) => setEraserSize(Math.round(8 + v * 36))}
                />
              </div>
            </div>
          )}

          {showShapeMenu && (
            <div
              onClick={(e) => e.stopPropagation()}
              className={`fixed ${popoverTopClass} left-1/2 -translate-x-1/2 w-[min(300px,calc(100vw-24px))] overflow-y-auto touch-pan-y p-3.5 rounded-[18px] bg-[rgba(14,24,26,0.97)] border border-white/[0.14] shadow-2xl z-50 space-y-2.5`}
            >
              <div className="flex items-center justify-between">
                <span className="label-caps">Hazır Şekiller</span>
                <button
                  type="button"
                  onClick={() => setShowShapeMenu(false)}
                  className="p-1 text-[#84a0a0] hover:text-[#e6f2f2]"
                  aria-label="Kapat"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {SHAPE_OPTIONS.map((sh) => {
                  const Icon = sh.icon;
                  const active = shapeKind === sh.id;
                  return (
                    <button
                      key={sh.id}
                      type="button"
                      onClick={() => {
                        setShapeKind(sh.id);
                        selectTool('shape');
                      }}
                      title={sh.label}
                      style={
                        active
                          ? { backgroundColor: accentCss, color: darkCss }
                          : undefined
                      }
                      className={`p-2 rounded-xl flex flex-col items-center gap-1 touch-manipulation ${
                        active
                          ? ''
                          : 'bg-[#142225] border border-[#1b2c2e] text-[#84a0a0] hover:text-[#e6f2f2]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[9px] truncate max-w-full">
                        {sh.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between px-1 pt-2 border-t border-[#1b2c2e]">
                <span className="text-xs text-[#e6f2f2]">İçi Dolu Şekil</span>
                <SoftSwitch
                  checked={shapeFilled}
                  onChange={setShapeFilled}
                  ariaLabel="İçi dolu şekil"
                  size="sm"
                />
              </div>
            </div>
          )}

          {showStampMenu && (
            <div
              onClick={(e) => e.stopPropagation()}
              className={`fixed ${popoverTopClass} left-1/2 -translate-x-1/2 w-[min(288px,calc(100vw-24px))] overflow-y-auto touch-pan-y p-3.5 rounded-[18px] bg-[rgba(14,24,26,0.97)] border border-white/[0.14] shadow-2xl z-50 space-y-2.5`}
            >
              <div className="flex items-center justify-between">
                <span className="label-caps">Çıkartma Damgaları</span>
                <button
                  type="button"
                  onClick={() => setShowStampMenu(false)}
                  className="p-1 text-[#84a0a0] hover:text-[#e6f2f2]"
                  aria-label="Kapat"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {STAMP_OPTIONS.map((sp) => {
                  const Icon = sp.icon;
                  const active = stampKind === sp.id;
                  return (
                    <button
                      key={sp.id}
                      type="button"
                      onClick={() => {
                        setStampKind(sp.id);
                        selectTool('stamp');
                      }}
                      style={
                        active
                          ? { backgroundColor: accentCss, color: darkCss }
                          : undefined
                      }
                      className={`p-2 rounded-xl flex flex-col items-center gap-1 touch-manipulation ${
                        active
                          ? ''
                          : 'bg-[#142225] border border-[#1b2c2e] text-[#84a0a0] hover:text-[#e6f2f2]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[10px]">{sp.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="space-y-1 pt-2 border-t border-[#1b2c2e]">
                <div className="flex items-center justify-between">
                  <span className="label-caps">Boyut</span>
                  <span className="font-display text-xs tabular-nums">
                    {stampSize}px
                  </span>
                </div>
                <LiquidSlider
                  ariaLabel="Damga boyutu"
                  height={32}
                  value={(stampSize - 24) / 64}
                  onChange={(v) => setStampSize(Math.round(24 + v * 64))}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Workspace with Stacked Vertical Multi-Page Sheets + Side Pages Drawer */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        <main
          className={`flex-1 ${
            scrollLocked ? 'overflow-hidden touch-none' : 'overflow-auto'
          } px-2 sm:px-10 md:px-14 py-4 sm:py-6 relative bg-[#080d0f]`}
          onClick={closeAllMenus}
        >
          {/* Floating Left Side Page Arrow (Tablet / Desktop) */}
          {activePageIdx > 0 && (
            <button
              type="button"
              onClick={() => switchToPage(activePageIdx - 1, true)}
              title="Önceki Sayfa"
              className="no-print hidden sm:flex fixed left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-14 rounded-2xl bg-[rgba(14,24,26,0.9)] border border-white/[0.14] items-center justify-center text-[#e6f2f2] hover:border-[var(--accent)] transition-colors shadow-xl touch-manipulation"
              aria-label="Önceki sayfa"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {/* Floating Right Side Page Arrow / Open New Page From Side (Tablet / Desktop) */}
          <button
            type="button"
            onClick={() => {
              if (activePageIdx < pages.length - 1) {
                switchToPage(activePageIdx + 1, true);
              } else if (!isReadMode) {
                handleAddPage(true);
              }
            }}
            title={
              activePageIdx < pages.length - 1
                ? 'Sonraki Sayfa'
                : 'Yandan Yeni Sayfa Aç'
            }
            style={
              activePageIdx === pages.length - 1 && !isReadMode
                ? { borderColor: accentCss, color: accentCss }
                : undefined
            }
            className="no-print hidden sm:flex fixed right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-14 rounded-2xl bg-[rgba(14,24,26,0.9)] border border-white/[0.14] flex-col items-center justify-center gap-0.5 text-[#e6f2f2] hover:border-[var(--accent)] transition-colors shadow-xl touch-manipulation"
            aria-label={
              activePageIdx < pages.length - 1 ? 'Sonraki sayfa' : 'Yeni sayfa aç'
            }
          >
            {activePageIdx < pages.length - 1 ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <ChevronRight className="w-3.5 h-3.5 opacity-75" />
              </>
            )}
          </button>

          {/* Stacked Vertical Pages Container */}
          <div className="space-y-6 pb-20">
            {pages.map((pg, idx) => {
              const topSlot =
                idx === 0 ? (
                  <div className="space-y-2.5 select-none pb-2 border-b border-[#1b2c2e]/40">
                    <div className="flex flex-wrap items-center justify-between gap-2 label-caps">
                      <span className="tabular-nums">
                        {formatFullDateTR(note.updatedAt)} · {docStats.words} kelime
                        {docStats.totalStrokes > 0 ? ` · ${docStats.totalStrokes} çizim` : ''}
                      </span>
                      <div className="flex items-center gap-2">
                        {note.isLocked && (
                          <span className="inline-flex items-center gap-1 text-[var(--accent)]">
                            <Lock className="w-3 h-3" /> Kilitli
                          </span>
                        )}
                        {note.reminderAt && (
                          <span className="inline-flex items-center gap-1 text-[#ffb454]">
                            <Bell className="w-3 h-3" /> {formatShortDateTR(note.reminderAt)}
                          </span>
                        )}
                        {isReadMode && <span>Okuma modu</span>}
                      </div>
                    </div>

                    {(tags.length > 0 || showTagInput || !isReadMode) && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                              isLightPaper
                                ? 'bg-[#0b1214]/10 border-[#0b1214]/20 text-[#0b1214]'
                                : 'bg-[#142225] border-[#1b2c2e] text-[var(--accent)]'
                            }`}
                          >
                            <span>#{tag}</span>
                            {!isReadMode && (
                              <button
                                type="button"
                                onClick={() => handleRemoveTag(tag)}
                                className="opacity-65 hover:opacity-100"
                                aria-label={`${tag} etiketini kaldır`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </span>
                        ))}

                        {!isReadMode &&
                          (showTagInput ? (
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                handleAddTag(newTagInput);
                              }}
                              className="inline-flex items-center gap-1.5"
                            >
                              <input
                                type="text"
                                value={newTagInput}
                                onChange={(e) => setNewTagInput(e.target.value)}
                                onBlur={() => {
                                  if (newTagInput.trim()) handleAddTag(newTagInput);
                                  else setShowTagInput(false);
                                }}
                                placeholder="etiket..."
                                autoFocus
                                className={`w-24 px-2.5 py-0.5 rounded-full text-xs border focus:outline-none ${
                                  isLightPaper
                                    ? 'bg-white border-[#84a0a0]/40 text-[#0b1214]'
                                    : 'bg-[#142225] border-[var(--accent)] text-[#e6f2f2]'
                                }`}
                              />
                              {QUICK_TAG_SUGGESTIONS.filter((t) => !tags.includes(t))
                                .slice(0, 3)
                                .map((sug) => (
                                  <button
                                    key={sug}
                                    type="button"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      handleAddTag(sug);
                                    }}
                                    className="px-2 py-0.5 rounded-full text-[11px] bg-[#142225] border border-[#1b2c2e] text-[#84a0a0] hover:text-[#e6f2f2]"
                                  >
                                    +{sug}
                                  </button>
                                ))}
                            </form>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setShowTagInput(true)}
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] border border-dashed transition-colors ${
                                isLightPaper
                                  ? 'border-[#84a0a0]/50 text-[#0b1214]/60 hover:text-[#0b1214]'
                                  : 'border-[#1b2c2e] text-[#84a0a0] hover:text-[#e6f2f2] hover:border-[var(--accent)]'
                              }`}
                            >
                              <Hash className="w-3 h-3" />
                              <span>Etiket ekle</span>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                ) : undefined;

              return (
                <NotePageSheet
                  key={pg.id}
                  page={pg}
                  pageIndex={idx}
                  totalPages={pages.length}
                  isActive={idx === activePageIdx}
                  isReadMode={isReadMode}
                  isFullWidth={isFullWidth}
                  logicalWidth={logicalWidth}
                  logicalHeight={logicalHeight}
                  fontSize={fontSize}
                  isMonospace={note.isMonospace}
                  tool={tool}
                  penStyle={penStyle}
                  dashStyle={dashStyle}
                  shapeKind={shapeKind}
                  shapeFilled={shapeFilled}
                  stampKind={stampKind}
                  stampSize={stampSize}
                  penColor={penColor}
                  strokeWidth={strokeWidth}
                  penOpacity={penOpacity}
                  eraserSize={eraserSize}
                  smartShapeEnabled={smartShapeEnabled}
                  autoStylusEnabled={autoStylusEnabled}
                  stylusOnlyDrawing={stylusOnlyDrawing}
                  showRuler={showRuler}
                  rulerPos={rulerPos}
                  easyPadHighlight={
                    showEasyWritingPad && idx === activePageIdx ? easyPadPos : null
                  }
                  zoom={zoom}
                  selectedStrokeIds={selectedStrokeIds}
                  selectedAttachmentId={selectedAttachmentId}
                  selectedTextBoxId={selectedTextBoxId}
                  voiceNotes={voiceNotes}
                  topSlot={topSlot}
                  onDeleteVoice={(voiceId) =>
                    onChange({
                      ...note,
                      voiceNotes: voiceNotes.filter((v) => v.id !== voiceId),
                      updatedAt: Date.now(),
                    })
                  }
                  onRulerPosChange={setRulerPos}
                  onCloseRuler={() => setShowRuler(false)}
                  onSelectStrokes={setSelectedStrokeIds}
                  onSelectAttachment={setSelectedAttachmentId}
                  onSelectTextBox={setSelectedTextBoxId}
                  onPreviewAttachment={setPreviewAttachment}
                  onFocusPage={() => switchToPage(idx, false)}
                  onStylusDetected={handleStylusDetected}
                  onUpdatePage={(patch, historySnapshot) =>
                    updatePageAt(idx, patch, historySnapshot)
                  }
                  onToast={(msg, rawSnap) => showToast(msg, rawSnap)}
                  onOpenPagesDrawer={() => setShowPagesDrawer(true)}
                />
              );
            })}

            {/* Samsung Notes Style Bottom "Add New Page" Card Visible Below Last Sheet */}
            {!isReadMode && (
              <div
                className={`mx-auto ${isFullWidth ? 'max-w-full' : 'max-w-[860px]'}`}
              >
                <button
                  type="button"
                  onClick={() => handleAddPage(false)}
                  className="no-print w-full py-7 rounded-2xl border border-dashed border-[#1b2c2e] bg-[#0b1214]/70 hover:bg-[#142225]/70 hover:border-[var(--accent)]/60 transition-colors flex flex-col items-center justify-center gap-2 text-[#84a0a0] hover:text-[#e6f2f2]"
                >
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <ArrowUp className="w-4 h-4 text-[var(--accent)]" />
                    <span>Yeni sayfa eklemek için dokunun</span>
                  </div>
                  <span className="text-[11px] opacity-65">
                    Mevcut sayfalar alt alta sıralanır · Yandaki oklarla da yeni sayfa açabilirsiniz
                  </span>
                </button>
              </div>
            )}
          </div>
        </main>

        {/* Side Pages Drawer (Right Edge) */}
        {showPagesDrawer && (
          <aside className="no-print w-56 sm:w-64 bg-[#0b1214] border-l border-[#1b2c2e] flex flex-col shrink-0 z-30">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1b2c2e]">
              <span className="label-caps">Sayfalar ({pages.length})</span>
              <button
                type="button"
                onClick={() => setShowPagesDrawer(false)}
                className="p-1 rounded-lg text-[#84a0a0] hover:text-[#e6f2f2]"
                aria-label="Paneli kapat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {pages.map((pg, idx) => {
                const active = idx === activePageIdx;
                return (
                  <div
                    key={pg.id}
                    onClick={() => switchToPage(idx, true)}
                    style={active ? { borderColor: accentCss } : undefined}
                    className={`group p-2.5 rounded-2xl border cursor-pointer transition-colors ${
                      active
                        ? 'bg-[#142225]'
                        : 'bg-[#0e181a] border-[#1b2c2e] hover:border-[#84a0a0]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className="font-display text-xs font-semibold tabular-nums"
                        style={active ? { color: accentCss } : undefined}
                      >
                        Sayfa {idx + 1}
                      </span>
                      {!isReadMode && (
                        <div className="flex items-center gap-0.5 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                          {pages.length > 1 && (
                            <>
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMovePage(idx, -1);
                                }}
                                title="Yukarı taşı"
                                className="p-1 rounded-md text-[#84a0a0] hover:text-[#e6f2f2] disabled:opacity-30"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === pages.length - 1}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMovePage(idx, 1);
                                }}
                                title="Aşağı taşı"
                                className="p-1 rounded-md text-[#84a0a0] hover:text-[#e6f2f2] disabled:opacity-30"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicatePage(idx);
                            }}
                            title="Sayfayı çoğalt"
                            className="p-1 rounded-md text-[#84a0a0] hover:text-[#e6f2f2]"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          {pages.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePage(idx);
                              }}
                              title="Sayfayı sil"
                              className="p-1 rounded-md text-[#84a0a0] hover:text-[#ff9db8]"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-[#84a0a0] line-clamp-2 leading-relaxed">
                      {pg.content.trim() ||
                        pg.textBoxes?.find((tb) => tb.text.trim())?.text ||
                        (pg.strokes.length > 0
                          ? `${pg.strokes.length} çizim`
                          : 'Boş sayfa')}
                    </p>
                  </div>
                );
              })}
            </div>

            {!isReadMode && (
              <div className="p-3 border-t border-[#1b2c2e]">
                <button
                  type="button"
                  onClick={() => handleAddPage(false)}
                  style={{ backgroundColor: accentCss, color: darkCss }}
                  className="w-full py-2.5 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <FilePlus2 className="w-4 h-4" />
                  <span>Yeni Sayfa Aç</span>
                </button>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Mobile Bottom-Left Compact Page Switcher */}
      <div className="no-print sm:hidden fixed bottom-4 left-4 z-30 flex items-center gap-0.5 p-1 rounded-full bg-[#142225] border border-[#1b2c2e] text-xs shadow-lg">
        <button
          type="button"
          disabled={activePageIdx === 0}
          onClick={() => switchToPage(activePageIdx - 1, true)}
          className="p-1.5 rounded-full text-[#84a0a0] hover:text-[#e6f2f2] disabled:opacity-30 touch-manipulation"
          aria-label="Önceki sayfa"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setShowPagesDrawer((v) => !v)}
          className="font-display px-1.5 font-medium tabular-nums text-[#e6f2f2] touch-manipulation"
          title="Sayfalar"
        >
          {activePageIdx + 1}/{pages.length}
        </button>
        <button
          type="button"
          onClick={() => {
            if (activePageIdx < pages.length - 1) {
              switchToPage(activePageIdx + 1, true);
            } else if (!isReadMode) {
              handleAddPage(true);
            }
          }}
          style={
            activePageIdx === pages.length - 1 && !isReadMode
              ? { color: accentCss }
              : undefined
          }
          className="p-1.5 rounded-full text-[#84a0a0] hover:text-[#e6f2f2] touch-manipulation"
          aria-label={
            activePageIdx < pages.length - 1 ? 'Sonraki sayfa' : 'Yeni sayfa aç'
          }
        >
          {activePageIdx < pages.length - 1 ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <Plus className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Bottom-Right Zoom Controls */}
      <div className="no-print fixed bottom-4 right-4 z-30 flex items-center gap-1 p-1 rounded-full bg-[#142225] border border-[#1b2c2e] text-xs shadow-lg">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(0.75, Number((z - 0.15).toFixed(2))))}
          className="p-1.5 rounded-full text-[#84a0a0] hover:text-[#e6f2f2] touch-manipulation"
          title="Uzaklaştır"
          aria-label="Uzaklaştır"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setZoom(1)}
          className="font-display px-2 font-medium tabular-nums text-[#e6f2f2] touch-manipulation"
          title="Sıfırla (%100)"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(1.6, Number((z + 0.15).toFixed(2))))}
          className="p-1.5 rounded-full text-[#84a0a0] hover:text-[#e6f2f2] touch-manipulation"
          title="Yakınlaştır"
          aria-label="Yakınlaştır"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
      </div>

      {editorToast && (
        <div
          className={`no-print fixed ${
            showEasyWritingPad && !isReadMode ? 'bottom-60 sm:bottom-52' : 'bottom-16'
          } left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-[rgba(14,24,26,0.96)] border border-[var(--accent)]/45 text-xs font-medium text-[#e6f2f2] flex items-center gap-2.5 shadow-xl`}
        >
          <span>{editorToast}</span>
          {canRevertAutoShape && (
            <button
              type="button"
              onClick={handleRevertAutoShape}
              style={{ color: accentCss }}
              className="font-semibold underline"
            >
              Ham Çizime Dön
            </button>
          )}
        </div>
      )}

      {showEasyWritingPad && !isReadMode && (
        <EasyWritingPad
          page={currentPage}
          padRegion={easyPadPos}
          penStyle={penStyle}
          dashStyle={dashStyle}
          penColor={penColor}
          strokeWidth={strokeWidth}
          penOpacity={penOpacity}
          tool={tool}
          stylusOnlyDrawing={stylusOnlyDrawing}
          accentCss={accentCss}
          darkCss={darkCss}
          onStepRegion={(dx, dy) =>
            setEasyPadPos((prev) => ({
              ...prev,
              x: Math.max(0, Math.min(logicalWidth - prev.width, prev.x + dx)),
              y: Math.max(24, Math.min(logicalHeight - prev.height, prev.y + dy)),
            }))
          }
          onNewLine={() =>
            setEasyPadPos((prev) => ({
              ...prev,
              x: 40,
              y: Math.min(logicalHeight - prev.height, prev.y + 84),
            }))
          }
          onCommitStroke={(stroke) =>
            updatePageAt(
              activePageIdx,
              { strokes: [...currentPage.strokes, stroke] },
              currentHistorySnap
            )
          }
          onEraseAt={(x, y) => {
            const remaining = currentPage.strokes.filter(
              (s) =>
                !s.points.some((p) => {
                  const hit = eraserSize + s.width;
                  return (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y) <= hit * hit;
                })
            );
            const remainingStamps = pageStamps.filter(
              (st) => Math.hypot(st.x - x, st.y - y) > st.size * 0.65 + eraserSize
            );
            if (
              remaining.length !== currentPage.strokes.length ||
              remainingStamps.length !== pageStamps.length
            ) {
              updatePageAt(
                activePageIdx,
                { strokes: remaining, stamps: remainingStamps },
                currentHistorySnap
              );
            }
          }}
          onStylusDetected={() => handleStylusDetected(false)}
          onClose={() => setShowEasyWritingPad(false)}
        />
      )}

      <TemplateGalleryModal
        isOpen={showTemplateApplyModal}
        onSelectTemplate={handleApplyTemplateToPage}
        onClose={() => setShowTemplateApplyModal(false)}
      />

      <MediaLightboxModal
        attachment={previewAttachment}
        onClose={() => setPreviewAttachment(null)}
      />

      <PinLockModal
        isOpen={showPinSetupModal}
        mode="setup"
        title={note.title || 'Not Kilidi'}
        onSubmitPin={async (pin) => {
          await savePin(pin);
          return true;
        }}
        onSuccess={() => {
          setShowPinSetupModal(false);
          onChange({ ...note, isLocked: true, updatedAt: Date.now() });
          showToast('PIN kaydedildi ve not kilitlendi');
        }}
        onClose={() => setShowPinSetupModal(false)}
      />
    </div>
  );
};
