import React from 'react';

export function ExcerptCaptureCard({
  url,
  onUrlChange,
  onFetch,
  preview,
  fetching,
  note,
  onNoteChange,
  onSave,
  loading,
}) {
  const hasPreview = Boolean(preview?.summary || preview?.excerpt || preview?.title || preview?.text);
  const canFetch = Boolean(url?.trim());
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1 text-[10px] text-muted-foreground/60">
          <span className="uppercase tracking-[0.2em] font-bold text-muted-foreground/40">
            Source URL
          </span>
          <span className="italic text-muted-foreground/40">
            Paste a link to fetch and analyze.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onFetch}
            disabled={fetching || !canFetch}
            className="rounded-md border border-primary/40 bg-primary/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary transition-all hover:bg-primary/10 disabled:opacity-50"
          >
            {fetching ? 'Fetching...' : 'Fetch'}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={loading || fetching || !hasPreview}
            className="rounded-md bg-primary px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Excerpt'}
          </button>
        </div>
      </div>
      <input
        value={url || ''}
        onChange={(event) => onUrlChange?.(event.target.value)}
        placeholder="https://example.com/article"
        className="h-9 rounded-md border border-border/20 bg-background px-3 text-[11px] text-foreground placeholder:text-muted-foreground/40 focus:border-primary/30 focus:outline-none transition-all"
      />
      <div className="rounded-lg border border-border/10 bg-background/60 p-3 text-[11px] text-muted-foreground/70 whitespace-pre-wrap max-h-40 overflow-y-auto custom-scrollbar">
        {hasPreview ? (
          <div className="flex flex-col gap-2">
            <div className="text-[12px] font-semibold text-foreground/80">
              {preview?.title || preview?.url || 'Excerpt'}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground/40">
              {preview?.siteName || 'Source'} · {preview?.wordCount || 0} words
              {preview?.truncated ? ' · truncated' : ''}
            </div>
            <div className="text-[11px] text-muted-foreground/70">
              {preview?.summary || preview?.excerpt || preview?.text || ''}
            </div>
          </div>
        ) : (
          'No excerpt fetched yet.'
        )}
      </div>
      <input
        value={note || ''}
        onChange={(event) => onNoteChange?.(event.target.value)}
        placeholder="Optional note about this excerpt..."
        className="h-9 rounded-md border border-border/20 bg-background px-3 text-[11px] text-foreground placeholder:text-muted-foreground/40 focus:border-primary/30 focus:outline-none transition-all"
      />
    </div>
  );
}
