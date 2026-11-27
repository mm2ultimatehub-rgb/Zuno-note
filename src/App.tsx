import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  Check,
  CheckSquare,
  Copy,
  FileUp,
  Folder as FolderIcon,
  Grid,
  LayoutList,
  LayoutTemplate,
  Lock,
  LockOpen,
  Menu,
  MoreVertical,
  PenTool,
  RotateCcw,
  Search,
  Settings,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import {
  createNewFolderObject,
  createNewNoteObject,
  deleteFolder,
  deleteNotePermanently,
  flushPendingSaves,
  initDatabase,
  replaceAllData,
  saveFolder,
  saveNote,
  scheduleSaveNote,
} from './db/localDb';
import {
  AppBackupData,
  CanvasTextBox,
  Folder,
  InkStroke,
  NavSection,
  Note,
  PaperPattern,
  PaperTheme,
  SortBy,
  ViewLayout,
} from './types/notes';
import { formatShortDateTR } from './utils/dateFormat';
import { SidebarRail } from './components/SidebarRail';
import { NoteThumbnail } from './components/NoteThumbnail';
import { NoteEditor } from './components/NoteEditor';
import { SettingsBackupModal } from './components/SettingsBackupModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PinLockModal } from './components/PinLockModal';
import { hasStoredPin, savePin, verifyPin } from './utils/pinLock';
import { useExpressive } from './components/expressive/shapes';
import { LiquidTabs } from './components/expressive/LiquidTabs';
import { SoftMorphLoader } from './components/expressive/SoftMorphLoader';
import { ExpressiveSettingsPanel } from './components/expressive/ExpressiveSettingsPanel';
import { NOTE_TEMPLATES, NoteTemplate } from './data/templates';
import {
  detectMediaDimensions,
  optimizeImageDataUrl,
  readFileAsDataUrl,
} from './components/editor/FloatingMediaItem';
import {
  TemplateGalleryModal,
  TemplatePreviewCard,
} from './components/TemplateGalleryModal';

type PrimaryTab = 'all' | 'favorites' | 'trash';

export default function App() {
  const { accentCss, darkCss } = useExpressive();

  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<NavSection>('all');
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('updatedAt');
  const [viewLayout, setViewLayout] = useState<ViewLayout>('grid');

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);

  const [isRailExpanded, setIsRailExpanded] = useState(true);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [showTopMoreMenu, setShowTopMoreMenu] = useState(false);
  const [showExpressivePanel, setShowExpressivePanel] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [contextMenuNoteId, setContextMenuNoteId] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const [pinModalState, setPinModalState] = useState<{
    open: boolean;
    mode: 'unlock' | 'setup';
    noteId: string | null;
    action: 'open' | 'lock';
  }>({ open: false, mode: 'unlock', noteId: null, action: 'open' });

  const [dueReminderNote, setDueReminderNote] = useState<Note | null>(null);
  const alertedRemindersRef = useRef<Set<string>>(new Set());

  const fileImportRef = useRef<HTMLInputElement | null>(null);
  const [importNotice, setImportNotice] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    initDatabase().then(({ notes: loadedNotes, folders: loadedFolders }) => {
      if (!mounted) return;
      setNotes(loadedNotes);
      setFolders(loadedFolders);
      setIsLoaded(true);
    }).catch(() => {
      if (!mounted) return;
      setIsLoaded(true);
      setImportNotice('Notlar yüklenemedi. Cihaz depolama izinlerini ve boş alanı kontrol et.');
    });
    const handleFlush = () => {
      void flushPendingSaves();
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        void flushPendingSaves();
      }
    };
    window.addEventListener('beforeunload', handleFlush);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      mounted = false;
      window.removeEventListener('beforeunload', handleFlush);
      document.removeEventListener('visibilitychange', handleVisibility);
      void flushPendingSaves();
    };
  }, []);

  useEffect(() => {
    const checkReminders = () => {
      const now = Date.now();
      const due = notes.find(
        (n) =>
          !n.isTrashed &&
          n.reminderAt &&
          n.reminderAt <= now &&
          !alertedRemindersRef.current.has(`${n.id}:${n.reminderAt}`)
      );
      if (due && due.reminderAt) {
        alertedRemindersRef.current.add(`${due.id}:${due.reminderAt}`);
        setDueReminderNote(due);
      }
    };
    checkReminders();
    const id = window.setInterval(checkReminders, 20000);
    return () => window.clearInterval(id);
  }, [notes]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const modifier = e.metaKey || e.ctrlKey;
      const target = e.target as HTMLElement | null;
      const isTyping =
        target?.isContentEditable ||
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT';

      if (modifier && e.key.toLowerCase() === 'k' && !activeNoteId) {
        e.preventDefault();
        setSearchOpen(true);
      } else if (modifier && e.key.toLowerCase() === 'n' && !activeNoteId && !isTyping) {
        e.preventDefault();
        void handleCreateNote({ title: 'Yeni Not' });
      } else if (e.key === 'Escape') {
        setShowTopMoreMenu(false);
        setShowExpressivePanel(false);
        setShowTemplatePicker(false);
        setContextMenuNoteId(null);
        if (searchOpen) {
          if (searchQuery) setSearchQuery('');
          else setSearchOpen(false);
        }
        if (isSelectionMode) {
          setIsSelectionMode(false);
          setSelectedNoteIds([]);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeNoteId, isSelectionMode, searchOpen, searchQuery]);

  const activeNote = useMemo(
    () => notes.find((n) => n.id === activeNoteId) || null,
    [notes, activeNoteId]
  );

  const folderMap = useMemo(() => {
    const map: Record<string, Folder> = {};
    folders.forEach((f) => {
      map[f.id] = f;
    });
    return map;
  }, [folders]);

  const counts = useMemo(() => {
    let all = 0;
    let favorites = 0;
    let trash = 0;
    const byFolder: Record<string, number> = {};

    for (const n of notes) {
      if (n.isTrashed) {
        trash++;
      } else {
        all++;
        if (n.isPinned) favorites++;
        if (n.folderId) {
          byFolder[n.folderId] = (byFolder[n.folderId] || 0) + 1;
        }
      }
    }
    return { all, favorites, trash, byFolder };
  }, [notes]);

  const allTags = useMemo(() => {
    const countsMap = new Map<string, number>();
    for (const n of notes) {
      if (n.isTrashed) continue;
      for (const t of n.tags || []) {
        countsMap.set(t, (countsMap.get(t) || 0) + 1);
      }
    }
    return Array.from(countsMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag);
  }, [notes]);

  const filteredNotes = useMemo(() => {
    const q = searchQuery.trim().toLocaleLowerCase('tr-TR');
    const list = notes.filter((n) => {
      if (activeSection === 'trash') {
        if (!n.isTrashed) return false;
      } else {
        if (n.isTrashed) return false;
        if (activeSection === 'favorites' && !n.isPinned) return false;
        if (activeSection === 'folder' && n.folderId !== activeFolderId) return false;
      }

      if (activeTag && activeSection !== 'trash') {
        if (!(n.tags || []).includes(activeTag)) return false;
      }

      if (!q) return true;

      // Search every page and supported content type, not only the legacy
      // first-page fields. Locked note bodies remain excluded from indexing.
      const searchableParts = [n.title, ...(n.tags || []).map((tag) => `#${tag}`)];
      if (!n.isLocked) {
        const pages = n.pages || [];
        searchableParts.push(
          n.content,
          ...(n.textBoxes || []).map((box) => box.text),
          ...(n.checklists || []).map((item) => item.text),
          ...(n.attachments || []).map((item) => item.name),
          ...(n.voiceNotes || []).map((voice) => voice.name),
          ...pages.flatMap((page) => [
            page.content || '',
            ...(page.textBoxes || []).map((box) => box.text),
            ...(page.checklists || []).map((item) => item.text),
            ...(page.attachments || []).map((item) => item.name),
          ])
        );
      }
      return searchableParts.some((part) =>
        String(part || '').toLocaleLowerCase('tr-TR').includes(q)
      );
    });

    return list.sort((a, b) => {
      if (activeSection !== 'trash' && a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }
      if (sortBy === 'title') {
        return (a.title || 'Başlıksız').localeCompare(b.title || 'Başlıksız', 'tr');
      }
      if (sortBy === 'createdAt') {
        return b.createdAt - a.createdAt;
      }
      return b.updatedAt - a.updatedAt;
    });
  }, [notes, activeSection, activeFolderId, searchQuery, sortBy, activeTag]);

  const sectionTitle = useMemo(() => {
    if (activeSection === 'favorites') return 'Favoriler';
    if (activeSection === 'trash') return 'Çöp kutusu';
    if (activeSection === 'folder') {
      const f = folders.find((item) => item.id === activeFolderId);
      return f ? f.name : 'Klasör';
    }
    return 'Tüm notlar';
  }, [activeSection, activeFolderId, folders]);

  const handleCreateNote = async (preset?: {
    title?: string;
    content?: string;
    tags?: string[];
    paperTheme?: PaperTheme;
    paperPattern?: PaperPattern;
    withChecklist?: boolean;
    checklistDefaults?: string[];
    isMonospace?: boolean;
    strokes?: InkStroke[];
    textBoxes?: CanvasTextBox[];
  }) => {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');

    const checklistItems = preset?.checklistDefaults
      ? preset.checklistDefaults.map((text, idx) => ({
          id: `chk_${Date.now()}_${idx}`,
          text,
          checked: false,
        }))
      : preset?.withChecklist
      ? [{ id: `chk_${Date.now()}`, text: '', checked: false }]
      : [];

    const newNote = createNewNoteObject({
      title: preset?.title ?? `Not ${dd}/${mm}`,
      content: preset?.content ?? '',
      tags: preset?.tags ?? (activeTag ? [activeTag] : []),
      folderId: activeSection === 'folder' ? activeFolderId : null,
      paperTheme: preset?.paperTheme ?? 'amoled',
      paperPattern: preset?.paperPattern ?? 'blank',
      isMonospace: preset?.isMonospace ?? false,
      checklists: checklistItems,
      strokes: preset?.strokes ?? [],
      textBoxes: preset?.textBoxes ?? [],
    });

    setNotes((prev) => [newNote, ...prev]);
    setActiveNoteId(newNote.id);
    setShowTemplatePicker(false);
    await saveNote(newNote);
  };

  const handleCreateFromTemplate = async (tpl: NoteTemplate) => {
    const now = Date.now();
    const strokes: InkStroke[] = (tpl.strokes || []).map((st, idx) => ({
      ...st,
      id: `tpl_st_${now}_${idx}`,
    }));
    const textBoxes: CanvasTextBox[] = (tpl.textBoxes || []).map((tb, idx) => ({
      ...tb,
      id: `tpl_tb_${now}_${idx}`,
    }));
    await handleCreateNote({
      title: tpl.title,
      content: tpl.content,
      tags: tpl.tags,
      paperTheme: tpl.paperTheme,
      paperPattern: tpl.paperPattern,
      checklistDefaults: tpl.checklistDefaults,
      isMonospace: tpl.isMonospace,
      strokes,
      textBoxes,
    });
  };

  const handleUpdateNote = (updated: Note) => {
    setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    scheduleSaveNote(updated);
  };

  const handleDuplicateNote = async (noteId: string) => {
    const source = notes.find((n) => n.id === noteId);
    if (!source) return;
    const copy = createNewNoteObject({
      ...source,
      id: undefined,
      title: source.title ? `${source.title} (Kopya)` : 'Kopya Not',
      isPinned: false,
      isTrashed: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      trashedAt: null,
    });
    setNotes((prev) => [copy, ...prev]);
    setContextMenuNoteId(null);
    await saveNote(copy);
  };

  const handleAssignFolder = async (noteId: string, folderId: string | null) => {
    const target = notes.find((n) => n.id === noteId);
    if (!target) return;
    const updated: Note = { ...target, folderId, updatedAt: Date.now() };
    setNotes((prev) => prev.map((n) => (n.id === noteId ? updated : n)));
    setContextMenuNoteId(null);
    await saveNote(updated);
  };

  const handleMoveToTrash = async (noteId: string) => {
    const target = notes.find((n) => n.id === noteId);
    if (!target) return;
    const trashed: Note = {
      ...target,
      isTrashed: true,
      isPinned: false,
      trashedAt: Date.now(),
    };
    setNotes((prev) => prev.map((n) => (n.id === noteId ? trashed : n)));
    if (activeNoteId === noteId) {
      setActiveNoteId(null);
    }
    setContextMenuNoteId(null);
    await saveNote(trashed);
  };

  const handleRestoreNote = async (noteId: string) => {
    const target = notes.find((n) => n.id === noteId);
    if (!target) return;
    const restored: Note = {
      ...target,
      isTrashed: false,
      trashedAt: null,
      updatedAt: Date.now(),
    };
    setNotes((prev) => prev.map((n) => (n.id === noteId ? restored : n)));
    setContextMenuNoteId(null);
    await saveNote(restored);
  };

  const handleDeleteForever = async (noteId: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    setContextMenuNoteId(null);
    await deleteNotePermanently(noteId);
  };

  const handleEmptyTrash = async () => {
    const trashedIds = notes.filter((n) => n.isTrashed).map((n) => n.id);
    setNotes((prev) => prev.filter((n) => !n.isTrashed));
    await Promise.all(trashedIds.map((id) => deleteNotePermanently(id)));
  };

  const handleTogglePin = async (noteId: string) => {
    const target = notes.find((n) => n.id === noteId);
    if (!target) return;
    const updated = { ...target, isPinned: !target.isPinned, updatedAt: Date.now() };
    setNotes((prev) => prev.map((n) => (n.id === noteId ? updated : n)));
    setContextMenuNoteId(null);
    await saveNote(updated);
  };

  const handleOpenNote = (note: Note) => {
    if (note.isTrashed) return;
    if (note.isLocked) {
      setPinModalState({
        open: true,
        mode: 'unlock',
        noteId: note.id,
        action: 'open',
      });
      return;
    }
    setActiveNoteId(note.id);
  };

  const handleToggleNoteLock = async (note: Note) => {
    setContextMenuNoteId(null);
    if (!note.isLocked && !hasStoredPin()) {
      setPinModalState({
        open: true,
        mode: 'setup',
        noteId: note.id,
        action: 'lock',
      });
      return;
    }
    const updated = { ...note, isLocked: !note.isLocked, updatedAt: Date.now() };
    setNotes((prev) => prev.map((n) => (n.id === note.id ? updated : n)));
    await saveNote(updated);
  };

  const toggleSelectNote = (noteId: string) => {
    setSelectedNoteIds((prev) =>
      prev.includes(noteId) ? prev.filter((id) => id !== noteId) : [...prev, noteId]
    );
  };

  const handleBatchTrashOrDelete = async () => {
    if (selectedNoteIds.length === 0) return;
    const selSet = new Set(selectedNoteIds);
    if (activeSection === 'trash') {
      setNotes((prev) => prev.filter((n) => !selSet.has(n.id)));
      await Promise.all(selectedNoteIds.map((id) => deleteNotePermanently(id)));
    } else {
      const updated = notes.map((n) =>
        selSet.has(n.id)
          ? { ...n, isTrashed: true, isPinned: false, trashedAt: Date.now() }
          : n
      );
      setNotes(updated);
      await Promise.all(
        updated.filter((n) => selSet.has(n.id)).map((n) => saveNote(n))
      );
    }
    setSelectedNoteIds([]);
    setIsSelectionMode(false);
  };

  const handleBatchRestore = async () => {
    if (selectedNoteIds.length === 0) return;
    const selSet = new Set(selectedNoteIds);
    const updated = notes.map((n) =>
      selSet.has(n.id)
        ? { ...n, isTrashed: false, trashedAt: null, updatedAt: Date.now() }
        : n
    );
    setNotes(updated);
    await Promise.all(
      updated.filter((n) => selSet.has(n.id)).map((n) => saveNote(n))
    );
    setSelectedNoteIds([]);
    setIsSelectionMode(false);
  };

  const handleBatchFolder = async (folderId: string | null) => {
    if (selectedNoteIds.length === 0) return;
    const selSet = new Set(selectedNoteIds);
    const updated = notes.map((n) =>
      selSet.has(n.id) ? { ...n, folderId, updatedAt: Date.now() } : n
    );
    setNotes(updated);
    await Promise.all(
      updated.filter((n) => selSet.has(n.id)).map((n) => saveNote(n))
    );
    setSelectedNoteIds([]);
    setIsSelectionMode(false);
  };

  const handleCreateFolder = async (name: string, color: string) => {
    const folder = createNewFolderObject(name, color);
    setFolders((prev) => [...prev, folder]);
    await saveFolder(folder);
  };

  const handleRenameFolder = async (folderId: string, name: string) => {
    const target = folders.find((f) => f.id === folderId);
    if (!target) return;
    const updated: Folder = { ...target, name };
    setFolders((prev) => prev.map((f) => (f.id === folderId ? updated : f)));
    await saveFolder(updated);
  };

  const handleDeleteFolder = async (folderId: string) => {
    setFolders((prev) => prev.filter((f) => f.id !== folderId));
    const affected = notes.filter((n) => n.folderId === folderId);
    const updatedNotes = notes.map((n) =>
      n.folderId === folderId ? { ...n, folderId: null } : n
    );
    setNotes(updatedNotes);
    if (activeSection === 'folder' && activeFolderId === folderId) {
      setActiveSection('all');
      setActiveFolderId(null);
    }
    await deleteFolder(folderId);
    await Promise.all(affected.map((n) => saveNote({ ...n, folderId: null })));
  };

  const handleImportTextOrImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportNotice(null);
    try {
      // Data URLs are stored in note records, so prevent oversized media/text
      // imports from exhausting WebView memory or local storage.
      const maxBytes = file.type.startsWith('video/') ? 35 * 1024 * 1024 : 50 * 1024 * 1024;
      if (file.size > maxBytes) {
        setImportNotice(`Dosya çok büyük. Bu tür için sınır ${Math.round(maxBytes / 1024 / 1024)} MB.`);
        return;
      }

      if (file.type.startsWith('image/') || file.type.startsWith('video/') || file.type.startsWith('audio/')) {
        const dataUrl = file.type.startsWith('image/')
          ? await optimizeImageDataUrl(file)
          : await readFileAsDataUrl(file);
        const createdAt = Date.now();
        const title = file.name.replace(/\.[^/.]+$/, '');

        if (file.type.startsWith('audio/')) {
          const durationSec = await new Promise<number>((resolve) => {
            const audio = new Audio();
            const timeout = window.setTimeout(() => resolve(0), 2500);
            const finish = (duration: number) => {
              window.clearTimeout(timeout);
              resolve(Number.isFinite(duration) ? Math.max(0, Math.round(duration)) : 0);
            };
            audio.onloadedmetadata = () => finish(audio.duration);
            audio.onerror = () => finish(0);
            audio.src = dataUrl;
          });
          const created = createNewNoteObject({
            title,
            voiceNotes: [{
              id: `voice_${createdAt}`,
              name: file.name,
              dataUrl,
              durationSec,
              createdAt,
            }],
          });
          setNotes((prev) => [created, ...prev]);
          setActiveNoteId(created.id);
          await saveNote(created);
          setImportNotice('Ses dosyası yeni nota eklendi.');
        } else {
          const mediaType: 'image' | 'video' = file.type.startsWith('video/') ? 'video' : 'image';
          const dims = await detectMediaDimensions(dataUrl, mediaType);
          const created = createNewNoteObject({
            title,
            attachments: [{
              id: `${mediaType === 'video' ? 'vid' : 'img'}_${createdAt}`,
              name: file.name,
              mediaType,
              dataUrl,
              x: 64,
              y: 180,
              width: dims.width,
              height: dims.height,
              aspectRatio: dims.aspectRatio,
              createdAt,
            }],
          });
          setNotes((prev) => [created, ...prev]);
          setActiveNoteId(created.id);
          await saveNote(created);
          setImportNotice('Görsel veya video yeni bir nota eklendi.');
        }
      } else {
        const text = await file.text();
        if (file.name.toLowerCase().endsWith('.json')) {
          let parsed: unknown;
          try {
            parsed = JSON.parse(text);
          } catch {
            parsed = null;
          }
          if (parsed && typeof parsed === 'object' && 'notes' in parsed) {
            const backup = parsed as Partial<AppBackupData>;
            if (backup.version !== 1 || !Array.isArray(backup.notes) || !Array.isArray(backup.folders)) {
              setImportNotice('Bu Zuno yedeği geçersiz veya desteklenmiyor. Mevcut notların korunuyor.');
              return;
            }
            const confirmed = window.confirm(
              `Bu yedek ${backup.notes.length} not ve ${backup.folders.length} klasör içeriyor. Mevcut not ve klasörlerin yedekteki içerikle tamamen değiştirilecek. Önce güncel yedeğini aldığından emin ol. Devam edilsin mi?`
            );
            if (!confirmed) {
              setImportNotice('Yedek geri yükleme iptal edildi. Mevcut notların korundu.');
              return;
            }
            const restored = await replaceAllData(backup as AppBackupData);
            setNotes(restored.notes);
            setFolders(restored.folders);
            setImportNotice(`${restored.notes.length} not ve ${restored.folders.length} klasör geri yüklendi.`);
            return;
          }
        }
        const created = createNewNoteObject({
          title: file.name.replace(/\.[^/.]+$/, ''),
          content: text,
        });
        setNotes((prev) => [created, ...prev]);
        setActiveNoteId(created.id);
        await saveNote(created);
        setImportNotice('Dosya içeriği yeni bir nota aktarıldı.');
      }
    } catch {
      setImportNotice('Dosya içe aktarılamadı. Dosyanın türünü, sağlamlığını ve cihazdaki boş alanı kontrol et.');
    } finally {
      e.target.value = '';
    }
  };

  const handleImportBackup = async (backup: AppBackupData) => {
    const restored = await replaceAllData(backup);
    setNotes(restored.notes);
    setFolders(restored.folders);
  };

  if (activeNote) {
    return (
      <>
        <NoteEditor
          note={activeNote}
          folders={folders}
          onChange={handleUpdateNote}
          onBack={() => {
            void flushPendingSaves();
            setActiveNoteId(null);
          }}
          onMoveToTrash={handleMoveToTrash}
        />
        <OfflineIndicator />
      </>
    );
  }

  return (
    <div
      className="flex h-screen w-full bg-[#0b1214] text-[#e6f2f2] overflow-hidden"
      onClick={() => {
        setShowTopMoreMenu(false);
        setShowExpressivePanel(false);
        setContextMenuNoteId(null);
      }}
    >
      <input
        ref={fileImportRef}
        type="file"
        accept=".txt,.md,.json,image/*,video/*,audio/*"
        onChange={handleImportTextOrImage}
        className="hidden"
      />

      {/* Left Navigation Rail / Drawer */}
      <SidebarRail
        isOpen={isMobileDrawerOpen}
        isExpanded={isRailExpanded}
        activeSection={activeSection}
        activeFolderId={activeFolderId}
        folders={folders}
        counts={counts}
        onSelectSection={(sec, fId) => {
          setActiveSection(sec);
          setActiveFolderId(fId ?? null);
          setIsSelectionMode(false);
          setSelectedNoteIds([]);
        }}
        onCreateFolder={handleCreateFolder}
        onRenameFolder={handleRenameFolder}
        onDeleteFolder={handleDeleteFolder}
        onOpenBackup={() => setShowBackupModal(true)}
        onCloseMobile={() => setIsMobileDrawerOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {(showTopMoreMenu || showExpressivePanel || contextMenuNoteId !== null) && (
          <div
            className="fixed inset-0 z-[35]"
            onClick={() => {
              setShowTopMoreMenu(false);
              setShowExpressivePanel(false);
              setContextMenuNoteId(null);
            }}
            aria-hidden="true"
          />
        )}
        {/* Top Bar */}
        <header className="flex items-center justify-between gap-3 px-3 sm:px-6 h-14 sm:h-16 bg-[#0b1214] border-b border-[#1b2c2e] shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => {
                if (window.innerWidth < 768) {
                  setIsMobileDrawerOpen((v) => !v);
                } else {
                  setIsRailExpanded((v) => !v);
                }
              }}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-[#84a0a0] hover:text-[#e6f2f2] hover:bg-[#142225] transition-colors shrink-0"
              aria-label="Menüyü aç veya daralt"
            >
              <Menu className="w-5 h-5" />
            </button>

            {!searchOpen && (
              <div className="flex items-baseline gap-2.5 min-w-0">
                <h1 className="font-display text-lg sm:text-xl font-semibold tracking-tight text-[#e6f2f2] truncate">
                  {isSelectionMode ? `${selectedNoteIds.length} seçili` : sectionTitle}
                </h1>
                {!isSelectionMode && (
                  <span className="font-display text-xs text-[#84a0a0] tabular-nums shrink-0">
                    {filteredNotes.length} not
                  </span>
                )}
              </div>
            )}
          </div>

          {searchOpen && (
            <div className="flex-1 max-w-md flex items-center gap-2 bg-[#142225] border border-[#1b2c2e] rounded-full px-3.5 h-10">
              <Search className="w-4 h-4 text-[#84a0a0] shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Notlarda ara..."
                autoFocus
                className="w-full bg-transparent text-sm text-[#e6f2f2] placeholder:text-[#84a0a0] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchOpen(false);
                }}
                className="p-1 text-[#84a0a0] hover:text-[#e6f2f2]"
                aria-label="Aramayı kapat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Right Controls */}
          <div className="flex items-center gap-1.5 shrink-0 relative">
            {filteredNotes.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setIsSelectionMode((v) => !v);
                  setSelectedNoteIds([]);
                }}
                title={isSelectionMode ? 'Seçimi İptal Et' : 'Çoklu Seçim'}
                style={
                  isSelectionMode
                    ? { backgroundColor: accentCss, color: darkCss }
                    : undefined
                }
                className={`min-w-[40px] min-h-[40px] px-3 flex items-center justify-center gap-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  isSelectionMode
                    ? ''
                    : 'text-[#84a0a0] hover:text-[#e6f2f2] hover:bg-[#142225]'
                }`}
              >
                <CheckSquare className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {isSelectionMode ? 'İptal' : 'Seç'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => fileImportRef.current?.click()}
              title="Dosya veya Görsel İçe Aktar"
              className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-[#84a0a0] hover:text-[#e6f2f2] hover:bg-[#142225] transition-colors"
              aria-label="Dosya içe aktar"
            >
              <FileUp className="w-5 h-5" />
            </button>

            {!searchOpen && (
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                title="Notlarda Ara (Ctrl+K)"
                className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-[#84a0a0] hover:text-[#e6f2f2] hover:bg-[#142225] transition-colors"
                aria-label="Ara"
              >
                <Search className="w-5 h-5" />
              </button>
            )}

            {/* Signature "⚙ Ayarlar" pill button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowTopMoreMenu(false);
                setShowExpressivePanel((v) => !v);
              }}
              aria-expanded={showExpressivePanel}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-white/[0.14] text-xs font-medium transition-colors whitespace-nowrap ${
                showExpressivePanel
                  ? 'bg-white/[0.14] text-[#e6f2f2]'
                  : 'bg-white/[0.06] text-[#e6f2f2] hover:bg-white/[0.1]'
              }`}
            >
              <Settings className="w-4 h-4" aria-hidden="true" />
              <span>Ayarlar</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowExpressivePanel(false);
                setShowTopMoreMenu((v) => !v);
              }}
              title="Görünüm ve Sıralama"
              className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-[#84a0a0] hover:text-[#e6f2f2] hover:bg-[#142225] transition-colors"
              aria-label="Seçenekler"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {showTopMoreMenu && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-12 w-56 rounded-[18px] bg-[rgba(14,24,26,0.94)] border border-white/[0.14] shadow-2xl p-2 z-40 space-y-1"
              >
                <div className="px-3 py-1.5 label-caps">Sıralama</div>
                {(
                  [
                    { id: 'updatedAt', label: 'Son düzenlemeye göre' },
                    { id: 'createdAt', label: 'Oluşturma tarihine göre' },
                    { id: 'title', label: 'Ada göre (A-Z)' },
                  ] as { id: SortBy; label: string }[]
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSortBy(item.id);
                      setShowTopMoreMenu(false);
                    }}
                    style={
                      sortBy === item.id
                        ? { backgroundColor: accentCss, color: darkCss }
                        : undefined
                    }
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                      sortBy === item.id
                        ? ''
                        : 'text-[#e6f2f2] hover:bg-white/[0.08]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}

                <div className="my-1 border-t border-[#1b2c2e]" />

                <button
                  type="button"
                  onClick={() => {
                    setViewLayout((v) => (v === 'grid' ? 'list' : 'grid'));
                    setShowTopMoreMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-[#e6f2f2] hover:bg-white/[0.08]"
                >
                  {viewLayout === 'grid' ? (
                    <>
                      <LayoutList className="w-4 h-4 text-[var(--accent)]" />
                      <span>Liste Görünümü</span>
                    </>
                  ) : (
                    <>
                      <Grid className="w-4 h-4 text-[var(--accent)]" />
                      <span>Izgara Görünümü</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </header>

        {importNotice && (
          <div role="status" aria-live="polite" className="mx-3 sm:mx-6 mt-2 flex items-start gap-3 rounded-xl border border-[var(--accent)]/25 bg-[#142225] px-3.5 py-3 text-sm text-[#e6f2f2]">
            <span className="flex-1 min-w-0 leading-relaxed">{importNotice}</span>
            <button type="button" onClick={() => setImportNotice(null)} aria-label="Bildirimi kapat" className="shrink-0 rounded-lg p-1 text-[#84a0a0] hover:text-[#e6f2f2]">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <ExpressiveSettingsPanel
          isOpen={showExpressivePanel}
          onClose={() => setShowExpressivePanel(false)}
        />

        {/* Expressive LiquidTabs Filter Strip (Compact, Phone-Friendly) */}
        {activeSection !== 'folder' && (
          <div className="px-4 sm:px-6 py-2.5 border-b border-[#1b2c2e] bg-[#0b1214] space-y-2.5">
            <div className="max-w-[440px]">
              <LiquidTabs<PrimaryTab>
                ariaLabel="Not görünümleri"
                compact
                value={
                  activeSection === 'favorites' || activeSection === 'trash'
                    ? activeSection
                    : 'all'
                }
                onChange={(next) => {
                  setActiveSection(next);
                  setActiveFolderId(null);
                  setIsSelectionMode(false);
                  setSelectedNoteIds([]);
                }}
                items={[
                  { id: 'all', label: 'Tüm notlar' },
                  { id: 'favorites', label: 'Favoriler' },
                  { id: 'trash', label: 'Çöp kutusu' },
                ]}
              />
            </div>

            {activeSection !== 'trash' && allTags.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setActiveTag(null)}
                  style={
                    activeTag === null
                      ? { backgroundColor: accentCss, color: darkCss }
                      : undefined
                  }
                  className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    activeTag === null
                      ? ''
                      : 'bg-[#142225] border border-[#1b2c2e] text-[#84a0a0] hover:text-[#e6f2f2]'
                  }`}
                >
                  Tüm etiketler
                </button>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setActiveTag((cur) => (cur === tag ? null : tag))}
                    style={
                      activeTag === tag
                        ? { backgroundColor: accentCss, color: darkCss }
                        : undefined
                    }
                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                      activeTag === tag
                        ? ''
                        : 'bg-[#142225] border border-[#1b2c2e] text-[#84a0a0] hover:text-[#e6f2f2]'
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Batch Action Bar */}
        {isSelectionMode && selectedNoteIds.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-2.5 bg-[#142225] border-b border-[#1b2c2e] text-xs">
            <span className="font-display font-medium text-[#e6f2f2] tabular-nums">
              {selectedNoteIds.length} not seçildi
            </span>
            <div className="flex items-center gap-2">
              {activeSection !== 'trash' && folders.length > 0 && (
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value === '__none__') handleBatchFolder(null);
                    else if (e.target.value) handleBatchFolder(e.target.value);
                  }}
                  className="rounded-full bg-[#0b1214] border border-[#1b2c2e] px-3 py-1.5 text-xs text-[#e6f2f2]"
                >
                  <option value="" disabled>
                    Klasöre taşı...
                  </option>
                  <option value="__none__">Klasörsüz</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              )}

              {activeSection === 'trash' && (
                <button
                  type="button"
                  onClick={handleBatchRestore}
                  style={{ backgroundColor: accentCss, color: darkCss }}
                  className="px-3.5 py-1.5 rounded-full font-semibold whitespace-nowrap"
                >
                  Geri Yükle
                </button>
              )}

              <button
                type="button"
                onClick={handleBatchTrashOrDelete}
                className="px-3.5 py-1.5 rounded-full bg-[#ff9db8]/15 text-[#ff9db8] hover:bg-[#ff9db8]/25 font-medium whitespace-nowrap"
              >
                {activeSection === 'trash' ? 'Kalıcı Sil' : 'Çöp Kutusuna At'}
              </button>
            </div>
          </div>
        )}

        {/* Trash Banner */}
        {activeSection === 'trash' && filteredNotes.length > 0 && !isSelectionMode && (
          <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-2.5 bg-[#142225] border-b border-[#1b2c2e] text-xs">
            <span className="text-[#84a0a0]">
              Çöp kutusundaki notları geri yükleyebilir veya kalıcı olarak silebilirsiniz.
            </span>
            <button
              type="button"
              onClick={handleEmptyTrash}
              className="px-3 py-1.5 rounded-full bg-[#ff9db8]/15 text-[#ff9db8] hover:bg-[#ff9db8]/25 font-medium whitespace-nowrap transition-colors"
            >
              Çöpü Boşalt
            </button>
          </div>
        )}

        {/* Notes Grid / List + Visual Templates Shelf */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 pb-28 space-y-7">
          {/* Horizontal Visual Template Shelf (Şablon Yeri) */}
          {isLoaded && activeSection === 'all' && !searchQuery && !activeTag && (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <LayoutTemplate className="w-4 h-4 text-[var(--accent)]" />
                  <span className="label-caps">Şablonlar</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTemplatePicker(true)}
                  className="px-3 py-1 rounded-full bg-[#142225] border border-[#1b2c2e] text-xs font-medium text-[var(--accent)] hover:border-[var(--accent)] transition-colors"
                >
                  Tümünü Gör ({NOTE_TEMPLATES.length})
                </button>
              </div>

              <div className="flex items-start gap-3.5 overflow-x-auto no-scrollbar pb-1">
                {NOTE_TEMPLATES.slice(0, 8).map((tpl) => (
                  <TemplatePreviewCard
                    key={tpl.id}
                    template={tpl}
                    compact
                    onSelect={handleCreateFromTemplate}
                  />
                ))}
              </div>
            </section>
          )}

          {!isLoaded ? (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
              <SoftMorphLoader size={72} />
              <span className="label-caps">Yükleniyor</span>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[45vh] text-center max-w-[440px] mx-auto space-y-5">
              <SoftMorphLoader size={80} />
              <div className="space-y-1.5">
                <h2 className="font-display text-2xl font-semibold text-[#e6f2f2]">
                  {searchQuery
                    ? 'Eşleşen not yok'
                    : activeSection === 'trash'
                    ? 'Çöp kutusu boş'
                    : activeSection === 'favorites'
                    ? 'Favori not yok'
                    : activeSection === 'folder'
                    ? 'Bu klasör boş'
                    : 'Not defterin hazır'}
                </h2>
                <p className="text-sm text-[#84a0a0] leading-relaxed">
                  {searchQuery
                    ? `“${searchQuery}” için sonuç bulunamadı. Başka bir kelime deneyebilir veya aramayı temizleyebilirsin.`
                    : activeSection === 'trash'
                    ? 'Sildiğiniz notlar burada listelenir. İstersen notları geri yükleyebilir veya kalıcı olarak silebilirsin.'
                    : activeSection === 'favorites'
                    ? 'Önemli notlarını yıldızlayarak burada hızlıca bulabilirsin.'
                    : activeSection === 'folder'
                    ? 'Bu klasöre yeni bir not oluştur veya mevcut notları klasör menüsünden buraya taşı.'
                    : 'Notların bu cihazda yerel olarak saklanır. Yeni bir sayfa açabilir veya hazır bir şablonla başlayabilirsin.'}
                </p>
              </div>

              {activeSection !== 'trash' && !searchQuery && (
                <div className="grid grid-cols-2 gap-2.5 w-full pt-1">
                  <button
                    type="button"
                    onClick={() => handleCreateNote({ title: 'Yeni Not' })}
                    style={{ backgroundColor: accentCss, color: darkCss }}
                    className="px-4 py-3 rounded-full text-xs font-semibold transition-transform active:scale-95"
                  >
                    Boş Not Aç
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTemplatePicker(true)}
                    className="px-4 py-3 rounded-full bg-[#142225] border border-[#1b2c2e] text-xs font-medium text-[#e6f2f2] hover:border-[var(--accent)] transition-colors"
                  >
                    Şablon Galerisi
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleCreateNote({
                        paperTheme: 'amoled',
                        paperPattern: 'grid',
                        title: 'Çizim Notu',
                      })
                    }
                    className="px-4 py-3 rounded-full bg-[#142225] border border-[#1b2c2e] text-xs font-medium text-[#e6f2f2] hover:border-[var(--accent)] transition-colors"
                  >
                    Kareli Çizim
                  </button>
                  <button
                    type="button"
                    onClick={() => fileImportRef.current?.click()}
                    className="px-4 py-3 rounded-full bg-[#142225] border border-[#1b2c2e] text-xs font-medium text-[#e6f2f2] hover:border-[var(--accent)] transition-colors"
                  >
                    Dosya Yükle
                  </button>
                </div>
              )}
            </div>
          ) : viewLayout === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-6">
              {filteredNotes.map((note) => {
                const isSelected = selectedNoteIds.includes(note.id);
                const folderObj = note.folderId ? folderMap[note.folderId] : null;
                return (
                  <div key={note.id} className="group relative flex flex-col">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (isSelectionMode) {
                          toggleSelectNote(note.id);
                        } else {
                          handleOpenNote(note);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (isSelectionMode) toggleSelectNote(note.id);
                          else handleOpenNote(note);
                        }
                      }}
                      style={
                        isSelected ? { outline: `2px solid ${accentCss}` } : undefined
                      }
                      className={`relative cursor-pointer focus:outline-none rounded-2xl transition-transform duration-150 ${
                        isSelected
                          ? 'scale-[0.97]'
                          : 'group-hover:-translate-y-0.5'
                      }`}
                    >
                      <NoteThumbnail note={note} />

                      {isSelectionMode && (
                        <div
                          style={
                            isSelected
                              ? { backgroundColor: accentCss, color: darkCss, borderColor: accentCss }
                              : undefined
                          }
                          className={`absolute top-2.5 left-2.5 z-30 w-6 h-6 rounded-full flex items-center justify-center border transition-colors ${
                            isSelected
                              ? ''
                              : 'bg-[#0b1214]/80 border-[#84a0a0] text-transparent'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}

                      {!isSelectionMode && note.isPinned && !note.isTrashed && (
                        <div
                          style={{ color: accentCss }}
                          className="absolute top-2.5 left-2.5 z-30 p-1 rounded-full bg-[#0b1214]/85"
                        >
                          <Star className="w-3.5 h-3.5 fill-current" />
                        </div>
                      )}

                      {!isSelectionMode && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setContextMenuNoteId((prev) =>
                              prev === note.id ? null : note.id
                            );
                          }}
                          className="absolute top-2 right-2 z-30 p-1.5 rounded-full bg-[#0b1214]/80 text-[#e6f2f2] opacity-85 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity hover:bg-[#142225]"
                          aria-label="Not seçenekleri"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {contextMenuNoteId === note.id && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-10 z-40 w-48 rounded-[18px] bg-[rgba(14,24,26,0.94)] border border-white/[0.14] shadow-2xl p-1.5"
                      >
                        {!note.isTrashed ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleTogglePin(note.id)}
                              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#e6f2f2] hover:bg-white/[0.08]"
                            >
                              <Star className="w-3.5 h-3.5 text-[var(--accent)]" />
                              <span>
                                {note.isPinned ? 'Favoriden Çıkar' : 'Favoriye Ekle'}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleNoteLock(note)}
                              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#e6f2f2] hover:bg-white/[0.08]"
                            >
                              {note.isLocked ? (
                                <LockOpen className="w-3.5 h-3.5 text-[var(--accent)]" />
                              ) : (
                                <Lock className="w-3.5 h-3.5 text-[var(--accent)]" />
                              )}
                              <span>
                                {note.isLocked ? 'Kilidi Kaldır' : 'PIN ile Kilitle'}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDuplicateNote(note.id)}
                              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#e6f2f2] hover:bg-white/[0.08]"
                            >
                              <Copy className="w-3.5 h-3.5 text-[#84a0a0]" />
                              <span>Kopyasını Oluştur</span>
                            </button>
                            {folders.length > 0 && (
                              <div className="px-2.5 py-1.5 border-y border-[#1b2c2e] my-1">
                                <div className="flex items-center gap-1.5 text-[11px] text-[#84a0a0] mb-1">
                                  <FolderIcon className="w-3 h-3" />
                                  <span>Klasör</span>
                                </div>
                                <select
                                  value={note.folderId || ''}
                                  onChange={(e) =>
                                    handleAssignFolder(
                                      note.id,
                                      e.target.value || null
                                    )
                                  }
                                  className="w-full rounded-lg bg-[#142225] border border-[#1b2c2e] px-2 py-1 text-xs text-[#e6f2f2]"
                                >
                                  <option value="">Klasörsüz</option>
                                  {folders.map((f) => (
                                    <option key={f.id} value={f.id}>
                                      {f.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => handleMoveToTrash(note.id)}
                              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#ff9db8] hover:bg-[#ff9db8]/10"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Çöp Kutusuna At</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleRestoreNote(note.id)}
                              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[var(--accent)] hover:bg-white/[0.08]"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Geri Yükle</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteForever(note.id)}
                              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#ff9db8] hover:bg-[#ff9db8]/10"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Kalıcı Olarak Sil</span>
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    <div className="mt-2 px-1 text-center space-y-0.5">
                      <h2 className="font-display text-[13.5px] font-medium text-[#e6f2f2] truncate">
                        {note.title || 'Başlıksız not'}
                      </h2>
                      <p className="text-[11.5px] text-[#84a0a0] tabular-nums truncate">
                        {formatShortDateTR(note.updatedAt)}
                        {folderObj ? ` · ${folderObj.name}` : ''}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="max-w-4xl mx-auto divide-y divide-[#1b2c2e] border-y border-[#1b2c2e]">
              {filteredNotes.map((note) => {
                const isSelected = selectedNoteIds.includes(note.id);
                const folderObj = note.folderId ? folderMap[note.folderId] : null;
                return (
                  <div
                    key={note.id}
                    onClick={() => {
                      if (isSelectionMode) toggleSelectNote(note.id);
                      else handleOpenNote(note);
                    }}
                    className={`flex items-center justify-between gap-4 px-2 py-3.5 cursor-pointer transition-colors ${
                      isSelected ? 'bg-[#142225]' : 'hover:bg-[#142225]/50'
                    }`}
                  >
                    <div className="min-w-0 flex-1 flex items-center gap-3">
                      {isSelectionMode && (
                        <div
                          style={
                            isSelected
                              ? { backgroundColor: accentCss, color: darkCss, borderColor: accentCss }
                              : undefined
                          }
                          className={`w-5 h-5 rounded-full flex items-center justify-center border shrink-0 ${
                            isSelected ? '' : 'border-[#84a0a0]'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {note.isPinned && (
                            <Star
                              style={{ color: accentCss }}
                              className="w-3.5 h-3.5 fill-current shrink-0"
                            />
                          )}
                          {note.isLocked && (
                            <Lock className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                          )}
                          <h3 className="font-display text-sm font-medium text-[#e6f2f2] truncate">
                            {note.title || 'Başlıksız not'}
                          </h3>
                        </div>
                        <p className="text-xs text-[#84a0a0] truncate mt-0.5">
                          {note.isLocked
                            ? 'Kilitli not — açmak için PIN gerekli'
                            : note.content ||
                              (note.textBoxes || []).find((b) => b.text.trim())?.text ||
                              (note.strokes.length > 0
                                ? `El yazısı çizimi (${note.strokes.length} çizgi)`
                                : 'Boş not')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-[#84a0a0] tabular-nums">
                        {formatShortDateTR(note.updatedAt)}
                        {folderObj ? ` · ${folderObj.name}` : ''}
                      </span>
                      {!isSelectionMode &&
                        (!note.isTrashed ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveToTrash(note.id);
                            }}
                            className="p-2 rounded-full text-[#84a0a0] hover:text-[#ff9db8]"
                            aria-label="Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRestoreNote(note.id);
                              }}
                              className="p-2 rounded-full text-[var(--accent)]"
                              aria-label="Geri Yükle"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteForever(note.id);
                              }}
                              className="p-2 rounded-full text-[#ff9db8]"
                              aria-label="Kalıcı Sil"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* Bottom-Right Floating Compose FAB + Visual Template Gallery Trigger */}
        {activeSection !== 'trash' && (
          <div className="fixed bottom-5 right-5 sm:bottom-7 sm:right-7 z-30 flex flex-col items-end gap-3 pb-safe">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowTemplatePicker(true)}
                title="Görsel Şablon Galerisi"
                className="h-11 px-4 rounded-full bg-[#142225] border border-[#1b2c2e] flex items-center gap-2 text-xs font-medium text-[#e6f2f2] hover:border-[var(--accent)] transition-colors"
              >
                <LayoutTemplate className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span className="hidden sm:inline">Şablonlar</span>
              </button>

              <button
                type="button"
                onClick={() => handleCreateNote()}
                title="Yeni Not Oluştur"
                aria-label="Yeni Not Oluştur"
                style={{ backgroundColor: accentCss, color: darkCss }}
                className="w-14 h-14 rounded-full flex items-center justify-center hover:scale-105 active:scale-92 transition-transform"
              >
                <PenTool className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}
      </div>

      <TemplateGalleryModal
        isOpen={showTemplatePicker}
        onSelectTemplate={handleCreateFromTemplate}
        onClose={() => setShowTemplatePicker(false)}
      />

      <SettingsBackupModal
        isOpen={showBackupModal}
        notes={notes}
        folders={folders}
        onClose={() => setShowBackupModal(false)}
        onImportBackup={handleImportBackup}
      />

      <PinLockModal
        isOpen={pinModalState.open}
        mode={pinModalState.mode}
        title={
          notes.find((n) => n.id === pinModalState.noteId)?.title || 'Kilitli Not'
        }
        onSubmitPin={async (pin) => {
          if (pinModalState.mode === 'setup') {
            await savePin(pin);
            return true;
          }
          return verifyPin(pin);
        }}
        onSuccess={async () => {
          const targetId = pinModalState.noteId;
          const action = pinModalState.action;
          setPinModalState({ open: false, mode: 'unlock', noteId: null, action: 'open' });
          if (!targetId) return;
          if (action === 'open') {
            setActiveNoteId(targetId);
          } else if (action === 'lock') {
            const target = notes.find((n) => n.id === targetId);
            if (target) {
              const updated = { ...target, isLocked: true, updatedAt: Date.now() };
              setNotes((prev) => prev.map((n) => (n.id === targetId ? updated : n)));
              await saveNote(updated);
            }
          }
        }}
        onClose={() =>
          setPinModalState({ open: false, mode: 'unlock', noteId: null, action: 'open' })
        }
      />

      {dueReminderNote && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[92vw] max-w-sm rounded-[18px] bg-[rgba(14,24,26,0.96)] border border-[#ffb454]/40 shadow-2xl p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Bell className="w-5 h-5 text-[#ffb454] shrink-0" />
            <div className="min-w-0">
              <p className="label-caps text-[#ffb454]">Hatırlatıcı</p>
              <p className="text-sm font-medium text-[#e6f2f2] truncate">
                {dueReminderNote.title || 'Başlıksız not'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                const target = dueReminderNote;
                setDueReminderNote(null);
                handleOpenNote(target);
              }}
              style={{ backgroundColor: accentCss, color: darkCss }}
              className="px-3 py-1.5 rounded-full text-xs font-semibold"
            >
              Aç
            </button>
            <button
              type="button"
              onClick={() => setDueReminderNote(null)}
              className="p-1.5 rounded-full text-[#84a0a0] hover:text-[#e6f2f2]"
              aria-label="Kapat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <OfflineIndicator />
    </div>
  );
}
