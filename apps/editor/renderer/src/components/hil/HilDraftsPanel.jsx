import React from 'react';
import { Layers } from 'lucide-react';

export function HilDraftsPanel({
  drafts = [],
  summarizeBody,
  onOpenDraft,
}) {
  return (
    <div className="flex flex-col gap-3 py-1 select-none">
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold tracking-wider text-foreground/80">
            Drafts
          </span>
          <span className="text-[9px] font-medium text-muted-foreground/60">
            {drafts.length} total
          </span>
        </div>
      </div>

      {drafts.length ? (
        <div className="flex flex-col gap-2">
          {drafts.map((draft) => (
            <button
              key={draft.id}
              type="button"
              onClick={() => onOpenDraft?.(draft.id)}
              className="group flex w-full items-center gap-3 rounded-xl border border-border/10 bg-muted/5 px-3 py-2 text-left transition hover:border-primary/30 hover:bg-muted/10"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/20 bg-background/60 text-muted-foreground/60 group-hover:text-primary/70">
                <Layers size={14} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-semibold text-foreground/80 truncate group-hover:text-foreground">
                  {summarizeBody ? summarizeBody(draft) : draft.body || 'Untitled Draft'}
                </div>
                <div className="text-[9px] uppercase tracking-widest text-muted-foreground/40">
                  {draft.status || 'open'}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border/10 bg-muted/5 px-4 py-6 text-center text-[10px] text-muted-foreground/40">
          No active drafts
        </div>
      )}
    </div>
  );
}
