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
          <button
            key={id}
            type="button"
            onClick={() => onToolChange?.(id)}
            className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] uppercase tracking-widest transition-all ${
              tool === id ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white'
            }`}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      <div className="h-4 w-px bg-white/10" />

      <button
        type="button"
        onClick={onUndo}
        className="flex items-center gap-1 rounded-full px-2 py-1 text-[10px] uppercase tracking-widest text-white/60 hover:text-white"
      >
        <Undo2 size={12} />
        Undo
      </button>

      <button
        type="button"
        onClick={onToggleInclude}
        className="flex items-center gap-1 rounded-full px-2 py-1 text-[10px] uppercase tracking-widest text-white/60 hover:text-white"
      >
        {includeAgencyWindows ? <Eye size={12} /> : <EyeOff size={12} />}
        {includeAgencyWindows ? 'Include App' : 'Hide App'}
      </button>

      <div className="h-4 w-px bg-white/10" />

      <button
        type="button"
        onClick={onCancel}
        className="flex items-center gap-1 rounded-full px-2 py-1 text-[10px] uppercase tracking-widest text-white/60 hover:text-white"
      >
        <X size={12} />
        Cancel
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={!canConfirm}
        className="flex items-center gap-1 rounded-full bg-primary/80 px-2 py-1 text-[10px] uppercase tracking-widest text-white transition-all hover:bg-primary disabled:opacity-40"
      >
        <Check size={12} />
        Capture
      </button>
    </div>
  );
}
