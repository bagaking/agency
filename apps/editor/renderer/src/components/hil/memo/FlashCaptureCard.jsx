import React from 'react';
import { Check, Loader2 } from 'lucide-react';
import { VoiceCaptureControl } from './VoiceCaptureControl.jsx';
import { Tooltip } from '../../ui/Tooltip.jsx';

export function FlashCaptureCard({
  value,
  onChange,
  onSave,
  loading,
  voice,
  voiceSegments,
  inputRef,
  voiceShortcut,
}) {
  const focusRingClass =
    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background';
  const audio = voice?.audio;
  const saveLabel = loading ? 'Saving…' : 'Save flash memo';
  return (
    <div className="flex flex-col gap-3">
      {voice ? (
        <VoiceCaptureControl voice={voice} segments={voiceSegments} shortcut={voiceShortcut} />
      ) : null}
      {audio?.previewUrl ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border/20 bg-muted/10 px-3 py-2">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            Voice Capture
          </div>
          <audio src={audio.previewUrl} controls className="h-8 w-48" />
          <button
            type="button"
            onClick={() => voice?.clearAudio?.()}
            className={`rounded-md border border-border/30 px-2 py-1 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/70 transition-colors hover:border-primary/40 hover:text-foreground ${focusRingClass}`}
          >
            Clear
          </button>
        </div>
      ) : null}
      <textarea
        ref={inputRef}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        rows={3}
        placeholder="Write a flash memo…"
        aria-label="Flash memo"
        name="flash-memo"
        autoComplete="off"
        className="w-full resize-none rounded-lg border border-border/20 bg-background px-3 py-2.5 text-[12px] text-foreground placeholder:text-muted-foreground/30 focus:border-primary/30 focus:ring-1 focus:ring-primary/10 focus:outline-none transition-colors"
      />
      <div className="flex items-center justify-between text-[10px] text-muted-foreground/50">
        <span>{value.trim() ? 'Ready to save.' : 'Keep it short and direct.'}</span>
        <Tooltip label={saveLabel} side="left">
          <button
            type="button"
            onClick={onSave}
            disabled={loading || !value.trim()}
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
  );
}
