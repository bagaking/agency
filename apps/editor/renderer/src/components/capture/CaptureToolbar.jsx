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
import { IconButton } from '../ui/IconButton.jsx';

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
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-3 py-2 text-white shadow-xl backdrop-blur">
      <div className="flex items-center gap-1">
        {tools.map(({ id, label, icon: Icon }) => (
          <IconButton
            key={id}
            label={label}
            tooltip={`${label}${tool === id ? ' (active)' : ''}`}
            side="bottom"
            focusRing="inverse"
            onClick={() => onToolChange?.(id)}
            aria-pressed={tool === id}
            className={`h-7 w-7 rounded-full transition-colors ${
              tool === id ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white'
            }`}
          >
            <Icon size={12} aria-hidden="true" />
          </IconButton>
        ))}
      </div>

      <div className="h-4 w-px bg-white/10" />

      <IconButton
        label="Undo"
        tooltip="Undo"
        side="bottom"
        focusRing="inverse"
        onClick={onUndo}
        className="h-7 w-7 rounded-full text-white/60 transition-colors hover:text-white"
      >
        <Undo2 size={12} aria-hidden="true" />
      </IconButton>

      <IconButton
        label={includeAgencyWindows ? 'Include app windows' : 'Hide app windows'}
        tooltip={includeAgencyWindows ? 'Include app windows' : 'Hide app windows'}
        side="bottom"
        focusRing="inverse"
        onClick={onToggleInclude}
        aria-pressed={includeAgencyWindows}
        className="h-7 w-7 rounded-full text-white/60 transition-colors hover:text-white"
      >
        {includeAgencyWindows ? (
          <Eye size={12} aria-hidden="true" />
        ) : (
          <EyeOff size={12} aria-hidden="true" />
        )}
      </IconButton>

      <div className="h-4 w-px bg-white/10" />

      <IconButton
        label="Cancel capture"
        tooltip="Cancel capture"
        side="bottom"
        focusRing="inverse"
        onClick={onCancel}
        className="h-7 w-7 rounded-full text-white/60 transition-colors hover:text-white"
      >
        <X size={12} aria-hidden="true" />
      </IconButton>
      <IconButton
        label="Capture screenshot"
        tooltip="Capture screenshot"
        side="bottom"
        focusRing="inverse"
        onClick={onConfirm}
        disabled={!canConfirm}
        className="h-7 w-7 rounded-full bg-primary/80 text-white transition-colors hover:bg-primary disabled:opacity-40"
      >
        <Check size={12} aria-hidden="true" />
      </IconButton>
    </div>
  );
}
