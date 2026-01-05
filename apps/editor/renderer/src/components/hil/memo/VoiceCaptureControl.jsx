import React from 'react';
import { Mic, Square } from 'lucide-react';

export function VoiceCaptureControl({ voice }) {
  if (!voice) {
    return null;
  }
  const {
    supported,
    isRecording,
    language,
    languageOptions,
    resolvedLanguage,
    setLanguage,
    interimText,
    statusMessage,
    error,
    start,
    stop,
  } = voice;
  const disabled = !supported;
  const languageDisabled = disabled || isRecording;
  const handleClick = () => {
    if (isRecording) {
      stop?.();
    } else {
      start?.();
    }
  };
  const handleLanguageChange = (event) => {
    setLanguage?.(event.target.value);
  };
  const renderLanguageLabel = (value) => {
    if (value === 'auto') {
      return `Auto (${resolvedLanguage || 'browser'})`;
    }
    return value;
  };
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border/20 bg-background/70 px-2.5 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          <span
            className={`h-2 w-2 rounded-full ${
              isRecording ? 'bg-emerald-400 animate-pulse' : 'bg-muted-foreground/30'
            }`}
          />
          Voice Input
        </div>
        <button
          type="button"
          onClick={handleClick}
          disabled={disabled}
          className={`flex items-center gap-1 rounded-md border px-2 py-1 text-[9px] font-semibold uppercase tracking-widest transition-all ${
            disabled
              ? 'border-border/10 text-muted-foreground/40'
              : isRecording
              ? 'border-rose-400/40 text-rose-300 hover:border-rose-400/70'
              : 'border-border/30 text-muted-foreground/70 hover:border-primary/40 hover:text-foreground'
          }`}
          aria-label={isRecording ? 'Stop voice input' : 'Start voice input'}
        >
          {isRecording ? <Square size={10} /> : <Mic size={10} />}
          {isRecording ? 'Stop' : 'Start'}
        </button>
      </div>
      {languageOptions?.length ? (
        <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground/60">
          <span className="font-semibold uppercase tracking-widest">Language</span>
          <select
            value={language || 'auto'}
            onChange={handleLanguageChange}
            disabled={languageDisabled}
            className={`rounded-md border px-2 py-1 text-[10px] ${
              languageDisabled
                ? 'border-border/10 bg-muted/20 text-muted-foreground/40'
                : 'border-border/30 bg-background text-foreground hover:border-primary/40 focus:border-primary/40 focus:outline-none'
            }`}
          >
            {languageOptions.map((option) => (
              <option key={option} value={option}>
                {renderLanguageLabel(option)}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div className="text-[10px] text-muted-foreground/60">
        {statusMessage}
      </div>
      {interimText ? (
        <div className="rounded-md border border-border/20 bg-muted/20 px-2 py-1 text-[10px] text-foreground/70">
          {interimText}
        </div>
      ) : null}
      {error ? (
        <div className="text-[10px] font-medium text-rose-400">
          {error}
        </div>
      ) : null}
    </div>
  );
}
