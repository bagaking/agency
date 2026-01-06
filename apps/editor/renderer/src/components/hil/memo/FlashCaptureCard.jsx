import React from 'react';
import { VoiceCaptureControl } from './VoiceCaptureControl.jsx';

export function FlashCaptureCard({ value, onChange, onSave, loading, voice }) {
  const audio = voice?.audio;
  return (
    <div className="flex flex-col gap-3">
      {voice ? <VoiceCaptureControl voice={voice} /> : null}
      {audio?.previewUrl ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border/20 bg-muted/10 px-3 py-2">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            Voice Capture
          </div>
          <audio src={audio.previewUrl} controls className="h-8 w-48" />
          <button
            type="button"
            onClick={() => voice?.clearAudio?.()}
            className="rounded-md border border-border/30 px-2 py-1 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/70 hover:border-primary/40 hover:text-foreground"
          >
            Clear
          </button>
        </div>
      ) : null}
      <textarea
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        rows={3}
        placeholder="Write a flash memo..."
        className="w-full resize-none rounded-lg border border-border/20 bg-background px-3 py-2.5 text-[12px] text-foreground placeholder:text-muted-foreground/30 focus:border-primary/30 focus:ring-1 focus:ring-primary/10 focus:outline-none transition-all"
      />
      <div className="flex items-center justify-between text-[10px] text-muted-foreground/50">
        <span>{value.trim() ? 'Ready to save.' : 'Keep it short and direct.'}</span>
        <button
          type="button"
          onClick={onSave}
          disabled={loading || !value.trim()}
          className="rounded-md bg-primary px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Flash'}
        </button>
      </div>
    </div>
  );
}
