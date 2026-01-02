import React from 'react';
import { FolderOpen } from 'lucide-react';
import { RiveAnimation } from './RiveAnimation.jsx';

const assetBase = import.meta.env.BASE_URL || '/';

export function ProjectEmptyState({ title, description, error, onSelect }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
      <div className="h-28 w-28 mb-4 opacity-50">
        <RiveAnimation
          src={`${assetBase}assets/animations/empty-state.riv`}
          className="w-full h-full"
          fallback={<FolderOpen size={48} className="w-full h-full p-3 opacity-20" />}
        />
      </div>
      <div className="text-sm font-semibold text-foreground">{title}</div>
      <p className="mt-2 text-xs text-muted-foreground">{description}</p>
      {error ? <div className="mt-2 text-xs text-rose-300">{error}</div> : null}
      <button
        type="button"
        onClick={onSelect}
        className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary/40 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-primary transition-colors hover:bg-primary/10"
      >
        Select Project
      </button>
    </div>
  );
}
