import React, { useState } from 'react';
import { Check, Sparkles, X } from 'lucide-react';
import {
  NOTE_TEMPLATES,
  NoteTemplate,
  TemplateCategory,
} from '../data/templates';
import { useExpressive } from './expressive/shapes';

interface TemplatePreviewCardProps {
  template: NoteTemplate;
  compact?: boolean;
  onSelect: (tpl: NoteTemplate) => void;
}

export const TemplatePreviewCard: React.FC<TemplatePreviewCardProps> = ({
  template,
  compact = false,
  onSelect,
}) => {
  const isLight = template.paperTheme === 'paper';
  const bg =
    template.paperTheme === 'paper'
      ? 'bg-[#f4f7f7] text-[#0b1214]'
      : template.paperTheme === 'charcoal'
      ? 'bg-[#070b0c] text-[#e6f2f2]'
      : 'bg-[#142225] text-[#e6f2f2]';

  const patternClass =
    template.paperPattern === 'ruled'
      ? isLight
        ? 'paper-pattern-ruled-light'
        : 'paper-pattern-ruled-dark'
      : template.paperPattern === 'grid'
      ? isLight
        ? 'paper-pattern-grid-light'
        : 'paper-pattern-grid-dark'
      : template.paperPattern === 'dotted'
      ? isLight
        ? 'paper-pattern-dotted-light'
        : 'paper-pattern-dotted-dark'
      : '';

  const lineMuted = isLight ? 'bg-[#0b1214]/15' : 'bg-white/15';

  return (
    <button
      type="button"
      onClick={() => onSelect(template)}
      className={`group text-left flex flex-col gap-2 focus:outline-none ${
        compact ? 'w-32 shrink-0' : 'w-full'
      }`}
    >
      <div
        className={`relative w-full aspect-[4/5] rounded-2xl border border-[#1b2c2e] group-hover:border-[var(--accent)] transition-all overflow-hidden p-3 flex flex-col justify-between ${bg} ${patternClass} group-hover:-translate-y-0.5`}
      >
        {/* Top accent strip */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-1">
            <span
              className="h-2 rounded-full w-10"
              style={{ backgroundColor: template.accentColor }}
            />
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: template.accentColor }}
            />
          </div>

          {/* Visual miniature layout matching previewKind */}
          {template.previewKind === 'weekly' && (
            <div className="grid grid-cols-2 gap-1 pt-1">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-5 rounded-md border border-white/10 bg-white/[0.04] p-1"
                >
                  <div
                    className="h-1 w-4 rounded-full opacity-75"
                    style={{ backgroundColor: template.accentColor }}
                  />
                </div>
              ))}
            </div>
          )}

          {template.previewKind === 'daily' && (
            <div className="space-y-1.5 pt-1">
              {['09', '11', '14', '17'].map((hr) => (
                <div key={hr} className="flex items-center gap-1.5">
                  <span
                    className="font-display text-[8px] font-semibold"
                    style={{ color: template.accentColor }}
                  >
                    {hr}
                  </span>
                  <div className={`h-1.5 flex-1 rounded-full ${lineMuted}`} />
                </div>
              ))}
            </div>
          )}

          {template.previewKind === 'cornell' && (
            <div className="grid grid-cols-3 gap-1 pt-1 h-20">
              <div className="col-span-1 border-r border-white/15 pr-1 space-y-1.5">
                <div
                  className="h-1.5 w-full rounded-full opacity-80"
                  style={{ backgroundColor: template.accentColor }}
                />
                <div className={`h-1 w-4/5 rounded-full ${lineMuted}`} />
                <div className={`h-1 w-3/4 rounded-full ${lineMuted}`} />
              </div>
              <div className="col-span-2 pl-1 space-y-1.5">
                <div className={`h-1.5 w-full rounded-full ${lineMuted}`} />
                <div className={`h-1.5 w-5/6 rounded-full ${lineMuted}`} />
                <div className={`h-1.5 w-full rounded-full ${lineMuted}`} />
                <div className={`h-1.5 w-2/3 rounded-full ${lineMuted}`} />
              </div>
            </div>
          )}

          {template.previewKind === 'meeting' && (
            <div className="space-y-1.5 pt-1">
              <div className={`h-2 w-3/4 rounded-full ${lineMuted}`} />
              <div className="flex gap-1">
                <span className="w-3 h-3 rounded-full bg-white/15" />
                <span className="w-3 h-3 rounded-full bg-white/15" />
              </div>
              <div className={`h-1.5 w-full rounded-full ${lineMuted}`} />
              <div className="flex items-center gap-1">
                <span
                  className="w-2.5 h-2.5 rounded-sm border"
                  style={{ borderColor: template.accentColor }}
                />
                <div className={`h-1.5 flex-1 rounded-full ${lineMuted}`} />
              </div>
            </div>
          )}

          {template.previewKind === 'habit' && (
            <div className="space-y-1.5 pt-1">
              {[true, true, false, false].map((chk, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <span
                    className="w-3 h-3 rounded flex items-center justify-center border"
                    style={
                      chk
                        ? {
                            backgroundColor: template.accentColor,
                            borderColor: template.accentColor,
                            color: '#0b1214',
                          }
                        : { borderColor: 'rgba(255,255,255,0.25)' }
                    }
                  >
                    {chk && <Check className="w-2 h-2" />}
                  </span>
                  <div className={`h-1.5 flex-1 rounded-full ${lineMuted}`} />
                </div>
              ))}
            </div>
          )}

          {template.previewKind === 'reading' && (
            <div className="space-y-1.5 pt-1">
              <div className="text-[9px] tracking-widest" style={{ color: template.accentColor }}>
                ★★★★★
              </div>
              <div className="border-l-2 pl-1.5 space-y-1" style={{ borderColor: template.accentColor }}>
                <div className={`h-1.5 w-full rounded-full ${lineMuted}`} />
                <div className={`h-1.5 w-4/5 rounded-full ${lineMuted}`} />
              </div>
              <div className={`h-1.5 w-3/4 rounded-full ${lineMuted}`} />
            </div>
          )}

          {template.previewKind === 'code' && (
            <div className="space-y-1.5 pt-1">
              <div className="rounded-lg bg-black/40 border border-white/10 p-1.5 space-y-1">
                <div
                  className="h-1 w-2/3 rounded-full opacity-80"
                  style={{ backgroundColor: template.accentColor }}
                />
                <div className={`h-1 w-4/5 rounded-full ${lineMuted}`} />
                <div className={`h-1 w-1/2 rounded-full ${lineMuted}`} />
              </div>
            </div>
          )}

          {(template.previewKind === 'grid' ||
            template.previewKind === 'dotted' ||
            template.previewKind === 'sketchLight') && (
            <div className="pt-2 flex items-center justify-center">
              <svg viewBox="0 0 80 54" className="w-full h-12 opacity-80">
                <rect
                  x="6"
                  y="8"
                  width="26"
                  height="22"
                  rx="3"
                  fill="none"
                  stroke={template.accentColor}
                  strokeWidth="2"
                />
                <circle
                  cx="56"
                  cy="28"
                  r="14"
                  fill="none"
                  stroke={template.accentColor}
                  strokeWidth="2"
                />
                <path
                  d="M 10 44 Q 36 32 68 46"
                  fill="none"
                  stroke={template.accentColor}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          )}

          {template.previewKind === 'mindmap' && (
            <div className="pt-1 flex items-center justify-center">
              <svg viewBox="0 0 80 56" className="w-full h-14">
                <line x1="40" y1="28" x2="16" y2="12" stroke="#ffb454" strokeWidth="1.6" />
                <line x1="40" y1="28" x2="64" y2="12" stroke="#9ccaff" strokeWidth="1.6" />
                <line x1="40" y1="28" x2="16" y2="44" stroke="#a6f0a6" strokeWidth="1.6" />
                <line x1="40" y1="28" x2="64" y2="44" stroke="#ff9db8" strokeWidth="1.6" />
                <rect x="6" y="6" width="20" height="10" rx="3" fill="#0b1214" stroke="#ffb454" strokeWidth="1.4" />
                <rect x="54" y="6" width="20" height="10" rx="3" fill="#0b1214" stroke="#9ccaff" strokeWidth="1.4" />
                <rect x="6" y="40" width="20" height="10" rx="3" fill="#0b1214" stroke="#a6f0a6" strokeWidth="1.4" />
                <rect x="54" y="40" width="20" height="10" rx="3" fill="#0b1214" stroke="#ff9db8" strokeWidth="1.4" />
                <ellipse cx="40" cy="28" rx="14" ry="8" fill={template.accentColor} fillOpacity="0.28" stroke={template.accentColor} strokeWidth="1.8" />
              </svg>
            </div>
          )}

          {template.previewKind === 'kanban' && (
            <div className="grid grid-cols-3 gap-1 pt-1 h-20">
              {['#ffb454', '#9ccaff', '#a6f0a6'].map((col, idx) => (
                <div
                  key={idx}
                  className="rounded-md border border-white/10 bg-white/[0.03] p-1 space-y-1"
                >
                  <div className="h-1.5 rounded-full" style={{ backgroundColor: col }} />
                  <div className={`h-2.5 rounded-sm ${lineMuted}`} />
                  {idx < 2 && <div className={`h-2.5 rounded-sm ${lineMuted}`} />}
                </div>
              ))}
            </div>
          )}

          {template.previewKind === 'swot' && (
            <div className="grid grid-cols-2 gap-1 pt-1 h-20">
              {['#a6f0a6', '#ffb454', '#9ccaff', '#ff9db8'].map((col, idx) => (
                <div
                  key={idx}
                  className="rounded-md border border-white/10 bg-white/[0.03] p-1 space-y-1"
                >
                  <div className="h-1.5 w-3 rounded-full" style={{ backgroundColor: col }} />
                  <div className={`h-1 w-full rounded-full ${lineMuted}`} />
                </div>
              ))}
            </div>
          )}

          {template.previewKind === 'monthly' && (
            <div className="grid grid-cols-7 gap-0.5 pt-2">
              {Array.from({ length: 21 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-2.5 rounded-[2px] border border-white/10 bg-white/[0.04]"
                  style={idx === 8 ? { borderColor: template.accentColor } : undefined}
                />
              ))}
            </div>
          )}

          {template.previewKind === 'timetable' && (
            <div className="space-y-1 pt-1">
              <div className="grid grid-cols-5 gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-1.5 rounded-sm opacity-80" style={{ backgroundColor: template.accentColor }} />
                ))}
              </div>
              <div className="grid grid-cols-5 gap-0.5">
                {Array.from({ length: 15 }).map((_, i) => (
                  <div key={i} className={`h-3 rounded-[2px] ${i % 4 === 0 ? 'bg-white/15' : 'bg-white/[0.04]'} border border-white/10`} />
                ))}
              </div>
            </div>
          )}

          {template.previewKind === 'vocab' && (
            <div className="grid grid-cols-2 gap-1 pt-1">
              {['#a6f0a6', '#a3f0f0', '#ffb454', '#ff9db8'].map((c, i) => (
                <div
                  key={i}
                  className="h-7 rounded-md border p-1 space-y-1"
                  style={{ borderColor: `${c}80` }}
                >
                  <div className="h-1 w-5 rounded-full" style={{ backgroundColor: c }} />
                  <div className={`h-1 w-full rounded-full ${lineMuted}`} />
                </div>
              ))}
            </div>
          )}

          {template.previewKind === 'music' && (
            <div className="space-y-2.5 pt-2">
              {[0, 1, 2].map((g) => (
                <div key={g} className="space-y-0.5">
                  {[0, 1, 2, 3, 4].map((l) => (
                    <div
                      key={l}
                      className="h-[1px] w-full opacity-55"
                      style={{ backgroundColor: template.accentColor }}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}

          {template.previewKind === 'budget' && (
            <div className="grid grid-cols-2 gap-1 pt-1 h-20">
              <div className="rounded-md border border-[#a6f0a6]/45 p-1 space-y-1">
                <div className="h-1.5 w-6 rounded-full bg-[#a6f0a6]" />
                <div className={`h-1 w-full rounded-full ${lineMuted}`} />
                <div className={`h-1 w-4/5 rounded-full ${lineMuted}`} />
              </div>
              <div className="rounded-md border border-[#ff9db8]/45 p-1 space-y-1">
                <div className="h-1.5 w-6 rounded-full bg-[#ff9db8]" />
                <div className={`h-1 w-full rounded-full ${lineMuted}`} />
                <div className={`h-1 w-3/4 rounded-full ${lineMuted}`} />
              </div>
            </div>
          )}

          {template.previewKind === 'fitness' && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#ff9db8]" />
                <div className={`h-1.5 flex-1 rounded-full ${lineMuted}`} />
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#a3f0f0]" />
                <div className={`h-1.5 flex-1 rounded-full ${lineMuted}`} />
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#a6f0a6]" />
                <div className={`h-1.5 w-3/4 rounded-full ${lineMuted}`} />
              </div>
            </div>
          )}

          {(template.previewKind === 'ruled' || template.previewKind === 'blank') && (
            <div className="space-y-2 pt-2">
              <div className={`h-1.5 w-3/4 rounded-full ${lineMuted}`} />
              <div className={`h-1.5 w-full rounded-full ${lineMuted}`} />
              <div className={`h-1.5 w-5/6 rounded-full ${lineMuted}`} />
            </div>
          )}
        </div>

        <span
          className={`text-[9px] font-medium px-2 py-0.5 rounded-full self-start ${
            isLight
              ? 'bg-[#0b1214]/10 text-[#0b1214]'
              : 'bg-[#0b1214]/80 text-[#e6f2f2]'
          }`}
        >
          Kullan
        </span>
      </div>

      <div className="px-0.5">
        <p className="font-display text-xs font-semibold text-[#e6f2f2] truncate">
          {template.title}
        </p>
        {!compact && (
          <p className="text-[11px] text-[#84a0a0] line-clamp-1 mt-0.5">
            {template.subtitle}
          </p>
        )}
      </div>
    </button>
  );
};

interface TemplateGalleryModalProps {
  isOpen: boolean;
  onSelectTemplate: (template: NoteTemplate) => void;
  onClose: () => void;
}

const CATEGORIES: { id: TemplateCategory; label: string }[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'plan', label: 'Planlama' },
  { id: 'study', label: 'Ders & Dil' },
  { id: 'work', label: 'İş & Strateji' },
  { id: 'life', label: 'Yaşam & Bütçe' },
  { id: 'sketch', label: 'Çizim & Müzik' },
];

export const TemplateGalleryModal: React.FC<TemplateGalleryModalProps> = ({
  isOpen,
  onSelectTemplate,
  onClose,
}) => {
  const { accentCss, darkCss } = useExpressive();
  const [category, setCategory] = useState<TemplateCategory>('all');

  React.useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const list =
    category === 'all'
      ? NOTE_TEMPLATES
      : NOTE_TEMPLATES.filter((t) => t.category === category);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[88vh] rounded-[22px] bg-[#0e181a] border border-white/[0.14] shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1b2c2e] shrink-0">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-[var(--accent)]" />
            <div>
              <h2 className="font-display text-base sm:text-lg font-semibold text-[#e6f2f2]">
                Şablon Galerisi
              </h2>
              <p className="text-xs text-[#84a0a0]">
                Görsel düzenlerden birini seçip hemen yeni not başlatın
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[#84a0a0] hover:text-[#e6f2f2] hover:bg-white/[0.08]"
            aria-label="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 px-5 py-3 border-b border-[#1b2c2e] overflow-x-auto no-scrollbar shrink-0">
          {CATEGORIES.map((cat) => {
            const active = category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                style={active ? { backgroundColor: accentCss, color: darkCss } : undefined}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  active
                    ? ''
                    : 'bg-[#142225] border border-[#1b2c2e] text-[#84a0a0] hover:text-[#e6f2f2]'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {list.map((tpl) => (
              <TemplatePreviewCard
                key={tpl.id}
                template={tpl}
                onSelect={(picked) => {
                  onSelectTemplate(picked);
                  onClose();
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
