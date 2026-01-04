import React, { useMemo } from 'react';
import { X, Copy, FolderOpen } from 'lucide-react';

const modes = [
  { id: 'hil', label: 'Save to HIL' },
  { id: 'clipboard', label: 'Clipboard Only' },
  { id: 'both', label: 'Save + Clipboard' },
];

export function CaptureRoutingSheet({
  open,
  previewUrl,
  note,
  onNoteChange,
  targets,
  selectedTargetId,
  onSelectTarget,
  mode,
  onModeChange,
  onConfirm,
  onCancel,
  error,
}) {
  const selectedTarget = useMemo(
    () => targets.find((target) => target.id === selectedTargetId) || targets[0],
    [selectedTargetId, targets]
  );
  if (!open) {
    return null;
  }
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-2xl border border-border/20 bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border/10 px-5 py-4">
          <div>
            <div className="text-[12px] font-semibold text-foreground">Route Screenshot</div>
            <div className="text-[10px] text-muted-foreground/60">
              Choose where the capture should be stored.
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md p-1 text-muted-foreground/50 hover:text-foreground hover:bg-muted/10 transition-all"
          >
            <X size={14} />
          </button>
        </div>

        <div className="grid grid-cols-[1.4fr_1fr] gap-4 px-5 py-4">
          <div className="rounded-xl border border-border/10 bg-muted/5 p-3">
            {previewUrl ? (
              <img src={previewUrl} alt="Capture preview" className="max-h-72 w-full rounded-lg object-contain" />
            ) : (
              <div className="flex h-40 items-center justify-center text-[11px] text-muted-foreground/50">
                Preview unavailable
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-border/10 bg-muted/5 px-3 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
                Destination
              </div>
              <div className="mt-2 flex items-center gap-2">
                <FolderOpen size={12} className="text-muted-foreground/50" />
                <select
                  value={selectedTarget?.id || ''}
                  onChange={(event) => onSelectTarget?.(event.target.value)}
                  className="flex-1 rounded-md border border-border/20 bg-background px-2 py-1.5 text-[11px] text-foreground focus:border-primary/40 focus:outline-none"
                >
                  {targets.map((target) => (
                    <option key={target.id} value={target.id}>
                      {target.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-1 text-[10px] text-muted-foreground/40 font-mono">
                {selectedTarget?.worktreePath || 'No target selected.'}
              </div>
            </div>

            <div className="rounded-xl border border-border/10 bg-muted/5 px-3 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
                Action
              </div>
              <div className="mt-2 flex flex-col gap-2">
                {modes.map((option) => (
                  <label key={option.id} className="flex items-center gap-2 text-[11px] text-muted-foreground/70">
                    <input
                      type="radio"
                      name="capture-route"
                      checked={mode === option.id}
                      onChange={() => onModeChange?.(option.id)}
                      className="h-3 w-3 rounded-full border-border/40 bg-background text-primary focus:ring-primary/20"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border/10 bg-muted/5 px-3 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
                Note
              </div>
              <textarea
                value={note}
                onChange={(event) => onNoteChange?.(event.target.value)}
                rows={3}
                placeholder="Optional note for the screenshot..."
                className="mt-2 w-full resize-none rounded-md border border-border/20 bg-background px-2 py-2 text-[11px] text-foreground placeholder:text-muted-foreground/40 focus:border-primary/40 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {error ? (
          <div className="px-5 pb-2 text-[11px] text-rose-300">
            {error}
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-2 border-t border-border/10 px-5 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/10 transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex items-center gap-2 rounded-md bg-primary hover:bg-primary/90 px-4 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-sm transition-all active:scale-95"
          >
            <Copy size={12} />
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
