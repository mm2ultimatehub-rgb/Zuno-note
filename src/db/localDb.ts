import { AppBackupData, Folder, Note } from '../types/notes';

const DB_NAME = 'karanot_local_db';
const DB_VERSION = 1;
const NOTES_STORE = 'notes';
const FOLDERS_STORE = 'folders';
const INIT_FLAG_KEY = 'karanot_initialized_v1';
const CLEANED_DEMO_KEY = 'karanot_cleaned_demo_v2';
const FALLBACK_NOTES_KEY = 'karanot_fallback_notes_v1';
const FALLBACK_FOLDERS_KEY = 'karanot_fallback_folders_v1';

const DEMO_NOTE_IDS = new Set([
  'note_sample_welcome',
  'note_sample_sketch',
  'note_sample_code',
  'note_sample_ruled',
]);

const DEMO_FOLDER_IDS = new Set([
  'folder_general',
  'folder_study',
  'folder_code',
]);

function generateId(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

let dbPromise: Promise<IDBDatabase> | null = null;
const pendingNoteWrites = new Map<string, { note: Note; timer: number }>();

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      dbPromise = null;
      reject(new Error('IndexedDB desteklenmiyor'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(NOTES_STORE)) {
        db.createObjectStore(NOTES_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(FOLDERS_STORE)) {
        db.createObjectStore(FOLDERS_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      db.onclose = () => {
        dbPromise = null;
      };
      resolve(db);
    };
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });
  return dbPromise;
}

function getFallbackNotes(): Note[] {
  try {
    const raw = localStorage.getItem(FALLBACK_NOTES_KEY);
    return raw ? (JSON.parse(raw) as Note[]) : [];
  } catch {
    return [];
  }
}

function setFallbackNotes(notes: Note[]): void {
  try {
    localStorage.setItem(FALLBACK_NOTES_KEY, JSON.stringify(notes));
  } catch {
    // Ignore storage quota errors in fallback
  }
}

function getFallbackFolders(): Folder[] {
  try {
    const raw = localStorage.getItem(FALLBACK_FOLDERS_KEY);
    return raw ? (JSON.parse(raw) as Folder[]) : [];
  } catch {
    return [];
  }
}

function setFallbackFolders(folders: Folder[]): void {
  try {
    localStorage.setItem(FALLBACK_FOLDERS_KEY, JSON.stringify(folders));
  } catch {
    // Ignore storage quota errors in fallback
  }
}

function readAllFromStore<T>(db: IDBDatabase, storeName: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result as T[]) || []);
    req.onerror = () => reject(req.error);
  });
}

export async function initDatabase(): Promise<{ notes: Note[]; folders: Folder[] }> {
  const demoCleaned = localStorage.getItem(CLEANED_DEMO_KEY) === 'true';

  if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
    navigator.storage.persist().catch(() => {
      // Ignore persistent storage denial
    });
  }

  try {
    const db = await openDB();
    let [notes, folders] = await Promise.all([
      readAllFromStore<Note>(db, NOTES_STORE),
      readAllFromStore<Folder>(db, FOLDERS_STORE),
    ]);

    // Clean up any pre-seeded demo notes/folders from earlier build
    if (!demoCleaned) {
      const demoNotesToDelete = notes.filter((n) => DEMO_NOTE_IDS.has(n.id));
      const userNotes = notes.filter((n) => !DEMO_NOTE_IDS.has(n.id));
      const usedFolderIds = new Set(
        userNotes.map((n) => n.folderId).filter((id): id is string => Boolean(id))
      );
      const demoFoldersToDelete = folders.filter(
        (f) => DEMO_FOLDER_IDS.has(f.id) && !usedFolderIds.has(f.id)
      );

      if (demoNotesToDelete.length > 0 || demoFoldersToDelete.length > 0) {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction([NOTES_STORE, FOLDERS_STORE], 'readwrite');
          const nStore = tx.objectStore(NOTES_STORE);
          const fStore = tx.objectStore(FOLDERS_STORE);
          demoNotesToDelete.forEach((n) => nStore.delete(n.id));
          demoFoldersToDelete.forEach((f) => fStore.delete(f.id));
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
        notes = userNotes;
        const deletedFolderSet = new Set(demoFoldersToDelete.map((f) => f.id));
        folders = folders.filter((f) => !deletedFolderSet.has(f.id));
      }
      localStorage.setItem(CLEANED_DEMO_KEY, 'true');
    }

    localStorage.setItem(INIT_FLAG_KEY, 'true');
    return { notes, folders };
  } catch {
    let notes = getFallbackNotes();
    let folders = getFallbackFolders();

    if (!demoCleaned) {
      notes = notes.filter((n) => !DEMO_NOTE_IDS.has(n.id));
      const usedFolderIds = new Set(
        notes.map((n) => n.folderId).filter((id): id is string => Boolean(id))
      );
      folders = folders.filter(
        (f) => !(DEMO_FOLDER_IDS.has(f.id) && !usedFolderIds.has(f.id))
      );
      setFallbackNotes(notes);
      setFallbackFolders(folders);
      localStorage.setItem(CLEANED_DEMO_KEY, 'true');
    }

    localStorage.setItem(INIT_FLAG_KEY, 'true');
    return { notes, folders };
  }
}

export async function saveNote(note: Note): Promise<void> {
  const existing = pendingNoteWrites.get(note.id);
  if (existing) {
    window.clearTimeout(existing.timer);
    pendingNoteWrites.delete(note.id);
  }
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(NOTES_STORE, 'readwrite');
      tx.objectStore(NOTES_STORE).put(note);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    const list = getFallbackNotes();
    const idx = list.findIndex((n) => n.id === note.id);
    if (idx >= 0) list[idx] = note;
    else list.unshift(note);
    setFallbackNotes(list);
  }
}

export function scheduleSaveNote(note: Note, delayMs = 320): void {
  const existing = pendingNoteWrites.get(note.id);
  if (existing) {
    window.clearTimeout(existing.timer);
  }
  const timer = window.setTimeout(() => {
    const current = pendingNoteWrites.get(note.id);
    if (!current) return;
    pendingNoteWrites.delete(note.id);
    void saveNote(current.note);
  }, delayMs);
  pendingNoteWrites.set(note.id, { note, timer });
}

export async function flushPendingSaves(): Promise<void> {
  if (pendingNoteWrites.size === 0) return;
  const entries = Array.from(pendingNoteWrites.values());
  pendingNoteWrites.clear();
  for (const entry of entries) {
    window.clearTimeout(entry.timer);
  }
  await Promise.all(entries.map((entry) => saveNote(entry.note)));
}

export async function getStorageEstimate(): Promise<{
  usedBytes: number;
  quotaBytes: number;
} | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
    return null;
  }
  try {
    const estimate = await navigator.storage.estimate();
    return {
      usedBytes: estimate.usage ?? 0,
      quotaBytes: estimate.quota ?? 0,
    };
  } catch {
    return null;
  }
}

export async function deleteNotePermanently(noteId: string): Promise<void> {
  const existing = pendingNoteWrites.get(noteId);
  if (existing) {
    window.clearTimeout(existing.timer);
    pendingNoteWrites.delete(noteId);
  }
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(NOTES_STORE, 'readwrite');
      tx.objectStore(NOTES_STORE).delete(noteId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    const list = getFallbackNotes().filter((n) => n.id !== noteId);
    setFallbackNotes(list);
  }
}

export async function saveFolder(folder: Folder): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(FOLDERS_STORE, 'readwrite');
      tx.objectStore(FOLDERS_STORE).put(folder);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    const list = getFallbackFolders();
    const idx = list.findIndex((f) => f.id === folder.id);
    if (idx >= 0) list[idx] = folder;
    else list.push(folder);
    setFallbackFolders(list);
  }
}

export async function deleteFolder(folderId: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(FOLDERS_STORE, 'readwrite');
      tx.objectStore(FOLDERS_STORE).delete(folderId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    const list = getFallbackFolders().filter((f) => f.id !== folderId);
    setFallbackFolders(list);
  }
}

export async function replaceAllData(backup: AppBackupData): Promise<{ notes: Note[]; folders: Folder[] }> {
  await flushPendingSaves();
  const cleanNotes = Array.isArray(backup.notes) ? backup.notes : [];
  const cleanFolders = Array.isArray(backup.folders) ? backup.folders : [];

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([NOTES_STORE, FOLDERS_STORE], 'readwrite');
      const nStore = tx.objectStore(NOTES_STORE);
      const fStore = tx.objectStore(FOLDERS_STORE);
      nStore.clear();
      fStore.clear();
      cleanNotes.forEach((n) => nStore.put(n));
      cleanFolders.forEach((f) => fStore.put(f));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    setFallbackNotes(cleanNotes);
    setFallbackFolders(cleanFolders);
  }

  localStorage.setItem(INIT_FLAG_KEY, 'true');
  localStorage.setItem(CLEANED_DEMO_KEY, 'true');
  return { notes: cleanNotes, folders: cleanFolders };
}

export function createNewNoteObject(options?: Partial<Note>): Note {
  const now = Date.now();
  const baseContent = options?.content ?? '';
  const baseChecklists = options?.checklists ?? [];
  const baseStrokes = options?.strokes ?? [];
  const baseAttachments = options?.attachments ?? [];
  const baseStamps = options?.stamps ?? [];
  const baseTextBoxes = options?.textBoxes ?? [];
  const baseTheme = options?.paperTheme ?? 'amoled';
  const basePattern = options?.paperPattern ?? 'blank';

  const defaultPages = options?.pages ?? [
    {
      id: generateId('page'),
      content: baseContent,
      checklists: baseChecklists,
      strokes: baseStrokes,
      attachments: baseAttachments,
      stamps: baseStamps,
      textBoxes: baseTextBoxes,
      paperTheme: baseTheme,
      paperPattern: basePattern,
    },
  ];

  return {
    id: generateId('note'),
    title: '',
    content: baseContent,
    tags: [],
    checklists: baseChecklists,
    strokes: baseStrokes,
    attachments: baseAttachments,
    stamps: baseStamps,
    textBoxes: baseTextBoxes,
    pages: defaultPages,
    activePageIndex: 0,
    voiceNotes: [],
    folderId: null,
    isPinned: false,
    isLocked: false,
    isTrashed: false,
    reminderAt: null,
    paperTheme: baseTheme,
    paperPattern: basePattern,
    fontSize: 16,
    isMonospace: false,
    canvasWidth: 860,
    canvasHeight: 1100,
    createdAt: now,
    updatedAt: now,
    trashedAt: null,
    ...options,
  };
}

export function createNewFolderObject(name: string, color = '#FF6B57'): Folder {
  return {
    id: generateId('folder'),
    name: name.trim(),
    color,
    createdAt: Date.now(),
  };
}
