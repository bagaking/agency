import React from 'react';

import { useModal } from './ModalSystem';

export function SmartSessionNameSuggestions({
  modalId,
  currentName,
  suggestions,
}: {
  modalId: string;
  currentName: string;
  suggestions: string[];
}) {
  const modal = useModal();
  const uniqueSuggestions = Array.from(
    new Set((suggestions || []).map((item) => String(item || '').trim()).filter(Boolean))
  );

  return (
    <div className="space-y-3">
      {currentName ? (
        <div className="rounded-lg border border-border/50 bg-background/40 px-3 py-2 text-[11px] text-muted-foreground/80">
          Current name: <span className="font-medium text-foreground">{currentName}</span>
        </div>
      ) : null}
      <div className="space-y-2">
        {uniqueSuggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => modal?.closeModal?.(modalId, suggestion)}
            className="w-full rounded-lg border border-border/50 bg-background/60 px-3 py-2 text-left text-[12px] text-foreground transition-colors hover:border-primary/50 hover:bg-primary/10"
          >
            {suggestion}
          </button>
        ))}
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => modal?.closeModal?.(modalId, '')}
          className="rounded-md border border-border/50 px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground hover:border-primary/40"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
