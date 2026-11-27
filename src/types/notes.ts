export interface StrokePoint {
  x: number;
  y: number;
  pressure: number;
  tiltX?: number;
  tiltY?: number;
}

export type PenStyle =
  | 'ballpoint'
  | 'fountain'
  | 'pencil'
  | 'marker'
  | 'brush'
  | 'calligraphy'
  | 'watercolor'
  | 'crayon'
  | 'charcoal'
  | 'rainbow'
  | 'dottedLine'
  | 'neon'
  | 'dashed'
  | 'spray'
  | 'highlighter';

export type ShapeKind =
  | 'line'
  | 'arrow'
  | 'doubleArrow'
  | 'rect'
  | 'roundedRect'
  | 'circle'
  | 'triangle'
  | 'diamond'
  | 'star'
  | 'hexagon';

export type StampKind =
  | 'check'
  | 'star'
  | 'heart'
  | 'idea'
  | 'pin'
  | 'target'
  | 'alert'
  | 'arrow';

export interface CanvasStamp {
  id: string;
  kind: StampKind;
  x: number;
  y: number;
  size: number;
  color: string;
}

export interface CanvasTextBox {
  id: string;
  x: number;
  y: number;
  width: number;
  text: string;
  color?: string;
  fontSize?: number;
  bold?: boolean;
}

export type StrokeDashStyle = 'solid' | 'dashed' | 'dotted';

export interface InkStroke {
  id: string;
  tool: 'pen' | 'highlighter';
  penStyle?: PenStyle;
  dashStyle?: StrokeDashStyle;
  color: string;
  width: number;
  opacity: number;
  filled?: boolean;
  points: StrokePoint[];
}

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export type AttachmentMediaType = 'image' | 'video';

export interface NoteAttachment {
  id: string;
  name: string;
  mediaType?: AttachmentMediaType;
  dataUrl: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  aspectRatio?: number;
  createdAt: number;
}

export interface VoiceRecording {
  id: string;
  name: string;
  dataUrl: string;
  durationSec: number;
  createdAt: number;
}

export type PaperTheme = 'amoled' | 'charcoal' | 'paper';
export type PaperPattern = 'blank' | 'ruled' | 'grid' | 'dotted' | 'margin' | 'cornell';

export interface FavoritePenPreset {
  id: string;
  label: string;
  tool: 'pen' | 'highlighter';
  penStyle: PenStyle;
  color: string;
  width: number;
  opacity: number;
  dashStyle: StrokeDashStyle;
}
export type EditorTool =
  | 'text'
  | 'textbox'
  | 'pen'
  | 'highlighter'
  | 'laser'
  | 'eraser'
  | 'lasso'
  | 'shape'
  | 'stamp'
  | 'pan';
export type SortBy = 'updatedAt' | 'createdAt' | 'title';
export type ViewLayout = 'grid' | 'list';
export type NavSection = 'all' | 'favorites' | 'trash' | 'folder';

export interface NotePage {
  id: string;
  content: string;
  checklists: ChecklistItem[];
  strokes: InkStroke[];
  attachments: NoteAttachment[];
  stamps?: CanvasStamp[];
  textBoxes?: CanvasTextBox[];
  paperTheme?: PaperTheme;
  paperPattern?: PaperPattern;
}

export interface PageHistorySnapshot {
  strokes: InkStroke[];
  stamps: CanvasStamp[];
  textBoxes: CanvasTextBox[];
}

export interface Note {
  id: string;
  title: string;
  content: string;
  tags?: string[];
  checklists: ChecklistItem[];
  strokes: InkStroke[];
  attachments: NoteAttachment[];
  stamps?: CanvasStamp[];
  textBoxes?: CanvasTextBox[];
  pages?: NotePage[];
  activePageIndex?: number;
  voiceNotes?: VoiceRecording[];
  folderId: string | null;
  isPinned: boolean;
  isLocked?: boolean;
  isTrashed: boolean;
  reminderAt?: number | null;
  paperTheme: PaperTheme;
  paperPattern: PaperPattern;
  fontSize?: number;
  isMonospace?: boolean;
  canvasWidth: number;
  canvasHeight: number;
  createdAt: number;
  updatedAt: number;
  trashedAt: number | null;
}

export interface Folder {
  id: string;
  name: string;
  color: string;
  createdAt: number;
}

export interface AppBackupData {
  version: number;
  exportedAt: number;
  notes: Note[];
  folders: Folder[];
}
