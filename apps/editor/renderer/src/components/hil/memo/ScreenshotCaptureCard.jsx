import React from 'react';
import { ArrowUpRight, Camera, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Tooltip } from '../../ui/Tooltip.jsx';

export function ScreenshotCaptureCard({
  asset,
  pending,
  note,
  onNoteChange,
  onCapture,
  onOpenRouting,
  loading,
  captureShortcut,
  noteInputRef,
}) {
  const focusRingClass =
    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background';
  const normalizedShortcut = String(captureShortcut || '').trim();
  const shortcutHint = normalizedShortcut ? `Shortcut: ${normalizedShortcut}` : 'Shortcut: unassigned';
  const captureLabel = loading ? 'Capturing…' : 'Capture screenshot';
  const captureTooltip = loading ? 'Capturing…' : `${captureLabel} · ${shortcutHint}`;
  const routeLabel = 'Route capture';
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1 text-[10px] text-muted-foreground/60">
          <span className="uppercase tracking-[0.2em] font-bold text-muted-foreground/40">
            Screenshot
          </span>
          <span className="italic text-muted-foreground/40">
            Capture a region from your screen.
          </span>
        </div>
        <Tooltip label={captureTooltip} side="left">
          <button
            type="button"
            onClick={onCapture}
            disabled={loading}
            aria-label={captureLabel}
            className={`inline-flex h-7 w-7 items-center justify-center rounded-md border border-primary/40 bg-primary/5 text-primary transition-colors hover:bg-primary/10 disabled:opacity-50 ${focusRingClass}`}
          >
            {loading ? (
              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
            ) : (
              <Camera size={14} aria-hidden="true" />
            )}
          </button>
        </Tooltip>
      </div>
      {pending ? (
        <div className="rounded-xl border border-border/10 bg-background/70 p-3 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
            <ImageIcon size={12} aria-hidden="true" />
            <span className="min-w-0 truncate font-mono" title="Pending capture">
              Pending capture
            </span>
            {pending.width ? (
              <span className="ml-auto text-[9px] text-muted-foreground/40">
                {pending.width}×{pending.height || '?'}
              </span>
            ) : null}
          </div>
          {pending.dataUrl ? (
            <div className="h-40 rounded-lg border border-border/10 bg-black/20 flex items-center justify-center overflow-hidden">
              <img
                src={pending.dataUrl}
                alt="Captured screenshot"
                loading="lazy"
                width={pending.width || 320}
                height={pending.height || 180}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          ) : null}
          <div className="flex items-center justify-end">
            <Tooltip label={routeLabel} side="left">
              <button
                type="button"
                onClick={onOpenRouting}
                aria-label={routeLabel}
                className={`inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary/90 ${focusRingClass}`}
              >
                <ArrowUpRight size={14} aria-hidden="true" />
              </button>
            </Tooltip>
          </div>
        </div>
      ) : null}

      {asset ? (
        <div className="rounded-xl border border-border/10 bg-background/70 p-3 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
            <ImageIcon size={12} aria-hidden="true" />
            <span className="min-w-0 truncate font-mono" title={asset.path}>
              {asset.path}
            </span>
            {asset.width ? (
              <span className="ml-auto text-[9px] text-muted-foreground/40">
                {asset.width}×{asset.height || '?'}
              </span>
            ) : null}
          </div>
          {asset.url ? (
            <div className="h-40 rounded-lg border border-border/10 bg-black/20 flex items-center justify-center overflow-hidden">
              <img
                src={asset.url}
                alt="Captured screenshot"
                loading="lazy"
                width={asset.width || 320}
                height={asset.height || 180}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          ) : null}
        </div>
      ) : null}
      <input
        ref={noteInputRef}
        value={note}
        onChange={(event) => onNoteChange?.(event.target.value)}
        placeholder="Optional note for the screenshot…"
        aria-label="Screenshot note"
        name="screenshot-note"
        autoComplete="off"
        className="h-9 rounded-md border border-border/20 bg-background px-3 text-[11px] text-foreground placeholder:text-muted-foreground/40 focus:border-primary/30 focus:outline-none transition-colors"
      />
    </div>
  );
}
