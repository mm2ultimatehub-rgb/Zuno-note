import React, { useState } from 'react';
import {
  Check,
  Database,
  Folder as FolderIcon,
  FolderPlus,
  Notebook,
  Pencil,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { Folder, NavSection } from '../types/notes';
import { PWAInstallButton } from './PWAInstallButton';
import { useExpressive } from './expressive/shapes';

interface SidebarRailProps {
  isOpen: boolean;
  isExpanded: boolean;
  activeSection: NavSection;
  activeFolderId: string | null;
  folders: Folder[];
  counts: {
    all: number;
    favorites: number;
    trash: number;
    byFolder: Record<string, number>;
  };
  onSelectSection: (section: NavSection, folderId?: string | null) => void;
  onCreateFolder: (name: string, color: string) => void;
  onRenameFolder: (folderId: string, name: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onOpenBackup: () => void;
  onCloseMobile: () => void;
}

const FOLDER_COLORS = ['#a3f0f0', '#ffb454', '#ff9db8', '#9ccaff', '#a6f0a6', '#cdb4ff'];

export const SidebarRail: React.FC<SidebarRailProps> = ({
  isOpen,
  isExpanded,
  activeSection,
  activeFolderId,
  folders,
  counts,
  onSelectSection,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onOpenBackup,
  onCloseMobile,
}) => {
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[0]);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const { accentCss, darkCss } = useExpressive();

  const handleAddFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    onCreateFolder(newFolderName.trim(), newFolderColor);
    setNewFolderName('');
    setCreatingFolder(false);
  };

  const commitRename = (folderId: string) => {
    if (editingName.trim()) {
      onRenameFolder(folderId, editingName.trim());
    }
    setEditingFolderId(null);
    setEditingName('');
  };

  const navItemClass = (active: boolean) =>
    `w-full flex items-center ${
      isExpanded ? 'justify-between px-3' : 'justify-center px-0'
    } min-h-[44px] rounded-xl transition-colors text-sm font-medium ${
      active
        ? 'bg-[#142225] text-[#e6f2f2] border border-[#1b2c2e]'
        : 'text-[#84a0a0] hover:bg-[#142225]/60 hover:text-[#e6f2f2] border border-transparent'
    }`;

  const content = (
    <div className="flex flex-col h-full py-3 px-2.5 bg-[#0b1214] border-r border-[#1b2c2e] select-none">
      <nav className="space-y-1" aria-label="Not Kategorileri">
        <button
          type="button"
          onClick={() => {
            onSelectSection('all', null);
            onCloseMobile();
          }}
          title="Tüm notlar"
          className={navItemClass(activeSection === 'all')}
        >
          <span className="flex items-center gap-3 min-w-0">
            <Notebook
              className="w-5 h-5 shrink-0"
              style={activeSection === 'all' ? { color: accentCss } : undefined}
            />
            {isExpanded && <span className="truncate">Tüm notlar</span>}
          </span>
          {isExpanded && (
            <span className="font-display text-xs text-[#84a0a0] tabular-nums">
              {counts.all}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            onSelectSection('favorites', null);
            onCloseMobile();
          }}
          title="Favoriler"
          className={navItemClass(activeSection === 'favorites')}
        >
          <span className="flex items-center gap-3 min-w-0">
            <Star
              className="w-5 h-5 shrink-0"
              style={activeSection === 'favorites' ? { color: accentCss } : undefined}
            />
            {isExpanded && <span className="truncate">Favoriler</span>}
          </span>
          {isExpanded && (
            <span className="font-display text-xs text-[#84a0a0] tabular-nums">
              {counts.favorites}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            onSelectSection('trash', null);
            onCloseMobile();
          }}
          title="Çöp kutusu"
          className={navItemClass(activeSection === 'trash')}
        >
          <span className="flex items-center gap-3 min-w-0">
            <Trash2
              className="w-5 h-5 shrink-0"
              style={activeSection === 'trash' ? { color: accentCss } : undefined}
            />
            {isExpanded && <span className="truncate">Çöp kutusu</span>}
          </span>
          {isExpanded && (
            <span className="font-display text-xs text-[#84a0a0] tabular-nums">
              {counts.trash}
            </span>
          )}
        </button>
      </nav>

      <div className="my-3 border-t border-[#1b2c2e]" />

      {/* Folders Section */}
      <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
        {isExpanded && (
          <div className="flex items-center justify-between px-3 py-1">
            <span className="label-caps">Klasörler</span>
            <button
              type="button"
              onClick={() => setCreatingFolder((v) => !v)}
              className="p-1.5 rounded-lg text-[#84a0a0] hover:text-[#e6f2f2] hover:bg-[#142225]"
              title="Yeni Klasör"
              aria-label="Yeni Klasör"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
          </div>
        )}

        {!isExpanded && (
          <button
            type="button"
            onClick={() => {
              if (folders[0]) {
                onSelectSection('folder', folders[0].id);
              }
            }}
            title="Klasörler"
            className={navItemClass(activeSection === 'folder')}
          >
            <FolderIcon
              className="w-5 h-5 shrink-0"
              style={activeSection === 'folder' ? { color: accentCss } : undefined}
            />
          </button>
        )}

        {isExpanded && creatingFolder && (
          <form
            onSubmit={handleAddFolder}
            className="mx-1 p-2.5 rounded-xl bg-[#142225] border border-[#1b2c2e] space-y-2.5"
          >
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Klasör adı..."
              autoFocus
              className="w-full bg-[#0b1214] border border-[#1b2c2e] rounded-lg px-2.5 py-1.5 text-xs text-[#e6f2f2] placeholder:text-[#84a0a0] focus:outline-none focus:border-[var(--accent)]"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {FOLDER_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewFolderColor(c)}
                    className={`w-4 h-4 rounded-full transition-transform ${
                      newFolderColor === c ? 'scale-125 ring-2 ring-white/60' : ''
                    }`}
                    style={{ backgroundColor: c }}
                    aria-label="Klasör rengi"
                  />
                ))}
              </div>
              <button
                type="submit"
                style={{ backgroundColor: accentCss, color: darkCss }}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold"
              >
                Ekle
              </button>
            </div>
          </form>
        )}

        {isExpanded &&
          folders.map((folder) => {
            const isActive =
              activeSection === 'folder' && activeFolderId === folder.id;
            const isEditing = editingFolderId === folder.id;
            return (
              <div
                key={folder.id}
                className={`group flex items-center justify-between rounded-xl px-3 min-h-[42px] transition-colors ${
                  isActive
                    ? 'bg-[#142225] text-[#e6f2f2] border border-[#1b2c2e]'
                    : 'text-[#84a0a0] hover:bg-[#142225]/60 hover:text-[#e6f2f2]'
                }`}
              >
                {isEditing ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      commitRename(folder.id);
                    }}
                    className="flex items-center gap-1.5 flex-1 min-w-0 py-1"
                  >
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setEditingFolderId(null);
                        }
                      }}
                      className="flex-1 min-w-0 bg-[#0b1214] border border-[var(--accent)] rounded-lg px-2 py-1 text-xs text-[#e6f2f2] focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="p-1 text-[var(--accent)]"
                      aria-label="Kaydet"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </form>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectSection('folder', folder.id);
                        onCloseMobile();
                      }}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left text-sm font-medium py-2"
                    >
                      <FolderIcon
                        className="w-4 h-4 shrink-0"
                        style={{ color: folder.color }}
                      />
                      <span className="truncate">{folder.name}</span>
                    </button>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <span className="font-display text-xs text-[#84a0a0] tabular-nums mr-1">
                        {counts.byFolder[folder.id] || 0}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingFolderId(folder.id);
                          setEditingName(folder.name);
                        }}
                        className="opacity-75 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 p-1 rounded-md text-[#84a0a0] hover:text-[#e6f2f2] transition-opacity"
                        title="Yeniden adlandır"
                        aria-label={`${folder.name} klasörünü yeniden adlandır`}
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteFolder(folder.id)}
                        className="opacity-75 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 p-1 rounded-md text-[#84a0a0] hover:text-red-400 transition-opacity"
                        title="Klasörü sil"
                        aria-label={`${folder.name} klasörünü sil`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
      </div>

      {/* Bottom Controls */}
      <div className="pt-3 mt-2 border-t border-[#1b2c2e] space-y-1.5">
        <PWAInstallButton compact={!isExpanded} />

        <button
          type="button"
          onClick={() => {
            onOpenBackup();
            onCloseMobile();
          }}
          title="Yedekle ve APK"
          className={navItemClass(false)}
        >
          <span className="flex items-center gap-3">
            <Database className="w-5 h-5 shrink-0" />
            {isExpanded && (
              <span className="whitespace-nowrap">Yedekle & APK</span>
            )}
          </span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside
        className={`hidden md:block shrink-0 transition-all duration-200 ${
          isExpanded ? 'w-60' : 'w-[68px]'
        }`}
      >
        {content}
      </aside>

      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-black/70" onClick={onCloseMobile} />
          <aside className="relative z-10 w-72 max-w-[82vw] h-full border-r border-[#1b2c2e]">
            {content}
          </aside>
        </div>
      )}
    </>
  );
};
