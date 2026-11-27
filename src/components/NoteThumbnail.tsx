import React, { useMemo } from 'react';
import { Bell, CheckSquare, Film, Lock, Mic, Square } from 'lucide-react';
import { Note } from '../types/notes';
import { isVideoAttachment } from './editor/FloatingMediaItem';

interface NoteThumbnailProps {
  note: Note;
}

export const NoteThumbnail: React.FC<NoteThumbnailProps> = ({ note }) => {
  const isLightPaper = note.paperTheme === 'paper';

  const paperBgClass =
    note.paperTheme === 'paper'
      ? 'bg-[#f4f7f7] text-[#0b1214]'
      : note.paperTheme === 'charcoal'
      ? 'bg-[#070b0c] text-[#e6f2f2]'
      : 'bg-[#142225] text-[#e6f2f2]';

  const patternClass = useMemo(() => {
    if (note.paperPattern === 'ruled') {
      return isLightPaper ? 'paper-pattern-ruled-light' : 'paper-pattern-ruled-dark';
    }
    if (note.paperPattern === 'grid') {
      return isLightPaper ? 'paper-pattern-grid-light' : 'paper-pattern-grid-dark';
    }
    if (note.paperPattern === 'dotted') {
      return isLightPaper ? 'paper-pattern-dotted-light' : 'paper-pattern-dotted-dark';
    }
    if (note.paperPattern === 'margin') {
      return isLightPaper ? 'paper-pattern-margin-light' : 'paper-pattern-margin-dark';
    }
    if (note.paperPattern === 'cornell') {
      return isLightPaper ? 'paper-pattern-cornell-light' : 'paper-pattern-cornell-dark';
    }
    return '';
  }, [note.paperPattern, isLightPaper]);

  const strokePaths = useMemo(() => {
    if (!note.strokes || note.strokes.length === 0 || note.isLocked) return [];
    return note.strokes.slice(0, 120).map((stroke) => {
      if (stroke.points.length === 0) return null;
      if (stroke.points.length === 1) {
        const p = stroke.points[0];
        return {
          id: stroke.id,
          d: `M ${p.x.toFixed(1)} ${p.y.toFixed(1)} L ${(p.x + 0.5).toFixed(1)} ${(p.y + 0.5).toFixed(1)}`,
          color: stroke.color,
          width: stroke.width,
          opacity: stroke.opacity,
          filled: Boolean(stroke.filled),
        };
      }
      let d = `M ${stroke.points[0].x.toFixed(1)} ${stroke.points[0].y.toFixed(1)}`;
      for (let i = 1; i < stroke.points.length; i++) {
        const pt = stroke.points[i];
        d += ` L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
      }
      return {
        id: stroke.id,
        d,
        color: stroke.color,
        width: stroke.width,
        opacity: stroke.opacity,
        filled: Boolean(stroke.filled),
      };
    });
  }, [note.strokes, note.isLocked]);

  if (note.isLocked) {
    return (
      <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden border border-[#1b2c2e] bg-[#142225] flex flex-col items-center justify-center p-4 gap-2.5 text-center">
        <div className="w-11 h-11 rounded-2xl bg-[#0b1214] border border-[#1b2c2e] flex items-center justify-center text-[var(--accent)]">
          <Lock className="w-5 h-5" />
        </div>
        <span className="label-caps">Kilitli Not</span>
      </div>
    );
  }

  const firstAttachment = note.attachments?.[0];
  const attachmentCount = note.attachments?.length || 0;
  const stamps = note.stamps || [];
  const hasVoice = (note.voiceNotes?.length || 0) > 0;
  const hasReminder = Boolean(note.reminderAt);
  const firstTag = note.tags?.[0];
  const pageCount = note.pages?.length || 1;
  const boxTextPreview = (note.textBoxes || [])
    .map((b) => b.text.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(' · ');
  const displayText = note.content.trim() || boxTextPreview;
  const hasContent =
    displayText.length > 0 ||
    note.checklists.length > 0 ||
    strokePaths.length > 0 ||
    stamps.length > 0 ||
    Boolean(firstAttachment);

  return (
    <div
      className={`relative w-full aspect-[4/5] rounded-2xl overflow-hidden border border-[#1b2c2e] ${paperBgClass} ${patternClass}`}
    >
      {firstAttachment &&
        (isVideoAttachment(firstAttachment) ? (
          <div className="absolute inset-0 w-full h-full bg-[#070b0c]">
            <video
              src={firstAttachment.dataUrl}
              muted
              playsInline
              preload="metadata"
              className="w-full h-full object-cover opacity-85"
            />
            <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-[#0b1214]/85 border border-[#1b2c2e] text-[10px] font-medium text-[var(--accent)] flex items-center gap-1">
              <Film className="w-3 h-3" />
              <span>Video</span>
            </span>
          </div>
        ) : (
          <img
            src={firstAttachment.dataUrl}
            alt={firstAttachment.name}
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover opacity-90"
          />
        ))}

      {(displayText.length > 0 || note.checklists.length > 0) && (
        <div
          className={`relative z-10 p-3 text-[10px] leading-[1.45] overflow-hidden h-full select-none ${
            firstAttachment ? 'bg-[#0b1214]/75 text-[#e6f2f2]' : ''
          }`}
        >
          {displayText.length > 0 && (
            <p className="whitespace-pre-wrap break-words line-clamp-9 font-normal opacity-90">
              {displayText}
            </p>
          )}
          {note.checklists.length > 0 && (
            <div className="mt-2 space-y-1">
              {note.checklists.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-start gap-1.5 opacity-90">
                  {item.checked ? (
                    <CheckSquare className="w-3 h-3 text-[var(--accent)] shrink-0 mt-0.5" />
                  ) : (
                    <Square className="w-3 h-3 opacity-50 shrink-0 mt-0.5" />
                  )}
                  <span className={`truncate ${item.checked ? 'line-through opacity-55' : ''}`}>
                    {item.text || 'Görev'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {(strokePaths.length > 0 || stamps.length > 0) && (
        <svg
          viewBox={`0 0 ${note.canvasWidth || 860} ${note.canvasHeight || 1100}`}
          preserveAspectRatio="xMidYMin meet"
          className="absolute inset-0 z-20 w-full h-full pointer-events-none"
        >
          {strokePaths.map(
            (s) =>
              s && (
                <path
                  key={s.id}
                  d={s.d}
                  fill={s.filled ? s.color : 'none'}
                  fillOpacity={s.filled ? 0.28 : 0}
                  stroke={s.color}
                  strokeWidth={Math.max(s.width * 1.4, 3)}
                  strokeOpacity={s.opacity}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )
          )}
          {stamps.slice(0, 24).map((st) => {
            const r = (st.size || 44) * 0.48;
            return (
              <g key={st.id} transform={`translate(${st.x}, ${st.y})`}>
                <circle
                  cx={0}
                  cy={0}
                  r={r}
                  fill={st.color}
                  fillOpacity={0.22}
                  stroke={st.color}
                  strokeWidth={Math.max(2.5, r * 0.16)}
                />
                {st.kind === 'check' && (
                  <path
                    d={`M ${-r * 0.42} 0 L ${-r * 0.1} ${r * 0.34} L ${r * 0.45} ${-r * 0.32}`}
                    fill="none"
                    stroke={st.color}
                    strokeWidth={Math.max(3, r * 0.18)}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </g>
            );
          })}
        </svg>
      )}

      {!hasContent && (
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <span className="label-caps opacity-60">Boş not</span>
        </div>
      )}

      {(hasVoice || hasReminder || firstTag || pageCount > 1 || attachmentCount > 1) && (
        <div className="absolute bottom-2 left-2 right-2 z-30 flex items-center justify-between gap-1 pointer-events-none">
          <div className="flex items-center gap-1 min-w-0">
            {firstTag && (
              <span className="px-2 py-0.5 rounded-full bg-[#0b1214]/85 border border-[#1b2c2e] text-[10px] font-medium text-[var(--accent)] truncate max-w-[90px]">
                #{firstTag}
              </span>
            )}
            {pageCount > 1 && (
              <span className="font-display px-2 py-0.5 rounded-full bg-[#0b1214]/85 border border-[#1b2c2e] text-[10px] font-medium text-[#e6f2f2] tabular-nums shrink-0">
                {pageCount} sayfa
              </span>
            )}
            {attachmentCount > 1 && (
              <span className="font-display px-2 py-0.5 rounded-full bg-[#0b1214]/85 border border-[#1b2c2e] text-[10px] font-medium text-[#e6f2f2] tabular-nums shrink-0">
                +{attachmentCount - 1}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {hasVoice && (
              <span className="w-5 h-5 rounded-full bg-[#0b1214]/85 border border-[#1b2c2e] flex items-center justify-center text-[var(--accent)]">
                <Mic className="w-3 h-3" />
              </span>
            )}
            {hasReminder && (
              <span className="w-5 h-5 rounded-full bg-[#0b1214]/85 border border-[#1b2c2e] flex items-center justify-center text-[#ffb454]">
                <Bell className="w-3 h-3" />
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
