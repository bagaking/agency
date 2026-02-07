import React from 'react';
import { Check, ArrowDownToLine, Loader2 } from 'lucide-react';
import { Tooltip } from '../../ui/Tooltip.jsx';
import { focusRing } from '../../ui/focusRing';

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
  urlInputRef,
  noteInputRef,
}) {
  const hasPreview = Boolean(preview?.summary || preview?.excerpt || preview?.title || preview?.text);
  const canFetch = Boolean(url?.trim());
  const focusRingClass = focusRing.strong;
  const fetchLabel = fetching ? 'Fetching…' : 'Fetch preview';
  const saveLabel = loading ? 'Saving…' : 'Save excerpt';
  const statusLabel = fetching ? 'Fetching…' : hasPreview ? 'Preview ready' : canFetch ? 'Ready to fetch' : 'Waiting for URL';
  const statusClass = fetching ? 'text-amber-300' : hasPreview ? 'text-emerald-300' : 'text-muted-foreground/50';
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="uppercase tracking-[0.2em] font-bold text-[10px] text-muted-foreground/40">
            Source URL
          </span>
          <span className={`text-[9px] font-semibold uppercase tracking-widest ${statusClass}`} aria-live="polite">
            {statusLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip label={fetchLabel} side="left">
            <button
              type="button"
              onClick={onFetch}
              disabled={fetching || !canFetch}
              aria-label={fetchLabel}
              className={`inline-flex h-7 w-7 items-center justify-center rounded-md border border-primary/40 bg-primary/5 text-primary transition-colors hover:bg-primary/10 disabled:opacity-50 ${focusRingClass}`}
            >
              {fetching ? (
                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
              ) : (
                <ArrowDownToLine size={14} aria-hidden="true" />
              )}
            </button>
          </Tooltip>
          <Tooltip label={saveLabel} side="left">
            <button
              type="button"
              onClick={onSave}
              disabled={loading || fetching || !hasPreview}
              aria-label={saveLabel}
              className={`inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 ${focusRingClass}`}
            >
              {loading ? (
                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
              ) : (
                <Check size={14} aria-hidden="true" />
              )}
            </button>
          </Tooltip>
        </div>
      </div>
      <input
        ref={urlInputRef}
        value={url || ''}
        type="url"
        inputMode="url"
        onChange={(event) => onUrlChange?.(event.target.value)}
        placeholder="https://example.com/article"
        aria-label="Excerpt source URL"
        name="excerpt-url"
        autoComplete="off"
        className="h-9 rounded-lg border border-border/20 bg-background/80 px-3 text-[11px] text-foreground placeholder:text-muted-foreground/40 focus:border-primary/30 focus:outline-none transition-colors"
      />
      <div className="rounded-lg border border-border/10 bg-muted/10 p-3 text-[11px] text-muted-foreground/70 whitespace-pre-wrap max-h-40 min-h-[120px] overflow-y-auto custom-scrollbar">
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
        ref={noteInputRef}
        value={note || ''}
        onChange={(event) => onNoteChange?.(event.target.value)}
        placeholder="Optional note about this excerpt…"
        aria-label="Excerpt note"
        name="excerpt-note"
        autoComplete="off"
        className="h-9 rounded-lg border border-border/20 bg-background/80 px-3 text-[11px] text-foreground placeholder:text-muted-foreground/40 focus:border-primary/30 focus:outline-none transition-colors"
      />
    </div>
  );
}
