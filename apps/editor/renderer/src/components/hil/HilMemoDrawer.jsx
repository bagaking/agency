import React from 'react';
import { StickyNote, Camera, Inbox } from 'lucide-react';

const shortcuts = [
  {
    id: 'flash',
    label: 'Flash',
    description: 'Quick note capture',
    icon: StickyNote,
  },
  {
    id: 'screenshot',
    label: 'Screenshot',
    description: 'Capture and annotate',
    icon: Camera,
  },
];

export function HilMemoDrawer({
  activeInboxId,
  onSelectInbox,
  onOpenInbox,
}) {
  return (
    <div className="flex flex-col gap-4 py-1 select-none">
      <div className="px-0.5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground/50">
          Inbox Shortcuts
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground/60">
          Jump to capture modes in the Memo inbox.
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {shortcuts.map((shortcut) => {
          const Icon = shortcut.icon;
          const active = activeInboxId === shortcut.id;
          return (
            <button
              key={shortcut.id}
              type="button"
              onClick={() => onSelectInbox?.(shortcut.id)}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-left transition ${
                active
                  ? 'border-primary/40 bg-primary/5 text-primary'
                  : 'border-border/10 bg-muted/5 text-muted-foreground/70 hover:text-foreground hover:border-primary/30'
              }`}
            >
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
                active ? 'border-primary/40 bg-primary/10' : 'border-border/20 bg-background/60'
              }`}>
                <Icon size={14} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-semibold">{shortcut.label}</div>
                <div className="text-[10px] text-muted-foreground/50">{shortcut.description}</div>
              </div>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => onOpenInbox?.()}
        className="flex items-center justify-between rounded-xl border border-border/10 bg-muted/5 px-3 py-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 transition hover:text-foreground hover:border-primary/30"
      >
        <span className="flex items-center gap-2">
          <Inbox size={12} />
          Open Inbox
        </span>
        <span className="text-[9px] font-medium text-muted-foreground/40">Comments</span>
      </button>
    </div>
  );
}
