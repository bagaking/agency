import React from 'react';
import { Image as ImageIcon } from 'lucide-react';

export function ScreenshotCaptureCard({
  asset,
  pending,
  note,
  onNoteChange,
  onCapture,
  onOpenRouting,
  loading,
  noteInputRef,
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
          Capture a region from your screen.
        </div>
        <button
          type="button"
          onClick={onCapture}
          disabled={loading}
          className="rounded-md border border-border/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 hover:text-foreground hover:border-primary/30 transition-all disabled:opacity-50"
        >
          {loading ? 'Capturing...' : 'Capture'}
        </button>
      </div>
      {pending ? (
        <div className="rounded-xl border border-border/10 bg-background/70 p-3 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
            <ImageIcon size={12} />
            <span className="font-mono">Pending capture</span>
            {pending.width ? (
              <span className="ml-auto text-[9px] text-muted-foreground/40">
                {pending.width}×{pending.height || '?'}
              </span>
            ) : null}
          </div>
          {pending.dataUrl ? (
            <div className="h-40 rounded-lg border border-border/10 bg-black/20 flex items-center justify-center overflow-hidden">
              <img src={pending.dataUrl} alt="Captured screenshot" className="max-h-full max-w-full object-contain" />
            </div>
          ) : null}
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={onOpenRouting}
              className="rounded-md bg-primary px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary-foreground transition-all hover:bg-primary/90"
            >
              Route Capture
            </button>
          </div>
        </div>
      ) : null}

      {asset ? (
        <div className="rounded-xl border border-border/10 bg-background/70 p-3 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
            <ImageIcon size={12} />
            <span className="font-mono">{asset.path}</span>
            {asset.width ? (
              <span className="ml-auto text-[9px] text-muted-foreground/40">
                {asset.width}×{asset.height || '?'}
              </span>
            ) : null}
          </div>
          {asset.url ? (
            <div className="h-40 rounded-lg border border-border/10 bg-black/20 flex items-center justify-center overflow-hidden">
              <img src={asset.url} alt="Captured screenshot" className="max-h-full max-w-full object-contain" />
            </div>
          ) : null}
        </div>
      ) : null}
      <input
        ref={noteInputRef}
        value={note}
        onChange={(event) => onNoteChange?.(event.target.value)}
        placeholder="Optional note for the screenshot..."
        className="h-9 rounded-md border border-border/20 bg-background px-3 text-[11px] text-foreground placeholder:text-muted-foreground/40 focus:border-primary/30 focus:outline-none transition-all"
      />
    </div>
  );
}
