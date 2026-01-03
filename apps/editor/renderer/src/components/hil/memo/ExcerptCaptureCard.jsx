import React from 'react';

export function ExcerptCaptureCard({
  selectionText,
  selectionLines,
  selectionPath,
  note,
  onNoteChange,
  onSave,
  loading,
}) {
  const hasSelection = Boolean(selectionText?.trim());
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1 text-[10px] text-muted-foreground/60">
          <span className="uppercase tracking-[0.2em] font-bold text-muted-foreground/40">
            Selection
          </span>
          {selectionPath ? (
            <span className="font-mono text-muted-foreground/70">
              {selectionPath}
              {selectionLines?.start ? `:${selectionLines.start}` : ''}
              {selectionLines?.end && selectionLines.end !== selectionLines.start
                ? `-${selectionLines.end}`
                : ''}
            </span>
          ) : (
            <span className="italic text-muted-foreground/40">
              Select text in the editor to capture.
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={loading || !hasSelection}
          className="rounded-md bg-primary px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Excerpt'}
        </button>
      </div>
      <div className="rounded-lg border border-border/10 bg-background/60 p-3 text-[11px] text-muted-foreground/70 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto custom-scrollbar">
        {hasSelection ? selectionText : 'No excerpt captured yet.'}
      </div>
      <input
        value={note}
        onChange={(event) => onNoteChange?.(event.target.value)}
        placeholder="Optional note about this excerpt..."
        className="h-9 rounded-md border border-border/20 bg-background px-3 text-[11px] text-foreground placeholder:text-muted-foreground/40 focus:border-primary/30 focus:outline-none transition-all"
      />
    </div>
  );
}
