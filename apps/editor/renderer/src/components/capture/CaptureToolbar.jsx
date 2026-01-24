import React from 'react';
import {
  Crop,
  Square,
  ArrowUpRight,
  Type,
  Highlighter,
  Undo2,
  Check,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Tooltip } from '../ui/Tooltip.jsx';

const tools = [
  { id: 'select', label: 'Select', icon: Crop },
  { id: 'rect', label: 'Rect', icon: Square },
  { id: 'arrow', label: 'Arrow', icon: ArrowUpRight },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'highlight', label: 'Highlight', icon: Highlighter },
];

export function CaptureToolbar({
  tool,
  onToolChange,
  onUndo,
  onConfirm,
  onCancel,
  canConfirm,
  includeAgencyWindows,
  onToggleInclude,
}) {
  const focusRingClass =
    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:ring-offset-1 focus-visible:ring-offset-black';
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-3 py-2 text-white shadow-xl backdrop-blur">
      <div className="flex items-center gap-1">
        {tools.map(({ id, label, icon: Icon }) => (
          <Tooltip key={id} label={`${label}${tool === id ? ' (active)' : ''}`} side="bottom">
            <button
              type="button"
              onClick={() => onToolChange?.(id)}
              aria-label={label}
              aria-pressed={tool === id}
              className={`inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors ${focusRingClass} ${
                tool === id ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              <Icon size={12} aria-hidden="true" />
            </button>
          </Tooltip>
        ))}
      </div>

      <div className="h-4 w-px bg-white/10" />

      <Tooltip label="Undo" side="bottom">
        <button
          type="button"
          onClick={onUndo}
          aria-label="Undo"
          className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-white/60 transition-colors hover:text-white ${focusRingClass}`}
        >
          <Undo2 size={12} aria-hidden="true" />
        </button>
      </Tooltip>

      <Tooltip label={includeAgencyWindows ? 'Include app windows' : 'Hide app windows'} side="bottom">
        <button
          type="button"
          onClick={onToggleInclude}
          aria-pressed={includeAgencyWindows}
          aria-label={includeAgencyWindows ? 'Include app windows' : 'Hide app windows'}
          className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-white/60 transition-colors hover:text-white ${focusRingClass}`}
        >
          {includeAgencyWindows ? (
            <Eye size={12} aria-hidden="true" />
          ) : (
            <EyeOff size={12} aria-hidden="true" />
          )}
        </button>
      </Tooltip>

      <div className="h-4 w-px bg-white/10" />

      <Tooltip label="Cancel capture" side="bottom">
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel capture"
          className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-white/60 transition-colors hover:text-white ${focusRingClass}`}
        >
          <X size={12} aria-hidden="true" />
        </button>
      </Tooltip>
      <Tooltip label="Capture screenshot" side="bottom">
        <button
          type="button"
          onClick={onConfirm}
          disabled={!canConfirm}
          aria-label="Capture screenshot"
          className={`inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/80 text-white transition-colors hover:bg-primary disabled:opacity-40 ${focusRingClass}`}
        >
          <Check size={12} aria-hidden="true" />
        </button>
      </Tooltip>
    </div>
  );
}
