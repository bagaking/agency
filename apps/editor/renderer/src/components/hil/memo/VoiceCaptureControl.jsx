import React from 'react';
import { Loader2, Mic, Square } from 'lucide-react';
import { openSystemPermissions } from '../../../services/agencyBridge.js';

export function VoiceCaptureControl({ voice, segments = [] }) {
  if (!voice) {
    return null;
  }
  const {
    supported,
    status,
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
  const isStarting = status === 'starting';
  const isActive = status === 'recording';
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
  const errorText = String(error || '').toLowerCase();
  const permissionKind = errorText.includes('speech')
    ? 'speech'
    : errorText.includes('microphone')
      ? 'microphone'
      : null;
  const showPermissionsHint =
    Boolean(permissionKind) ||
    errorText.includes('permission') ||
    errorText.includes('denied') ||
    errorText.includes('not-allowed');
  const liveSegments = Array.isArray(segments) ? segments : [];
  const hasLiveTranscript = liveSegments.length > 0 || Boolean(interimText);
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border/20 bg-background/70 px-2.5 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          <span
            className={`h-2 w-2 rounded-full ${
              isActive
                ? 'bg-emerald-400 animate-pulse'
                : isStarting
                ? 'bg-amber-400 animate-pulse'
                : 'bg-muted-foreground/30'
            }`}
          />
          Voice Input
        </div>
        <div className="flex items-center gap-2">
          {isStarting ? (
            <span className="text-[9px] font-semibold uppercase tracking-widest text-amber-300 animate-pulse">
              Starting...
            </span>
          ) : null}
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
            {isStarting ? (
              <Loader2 size={10} className="animate-spin" />
            ) : isRecording ? (
              <Square size={10} />
            ) : (
              <Mic size={10} />
            )}
            {isRecording ? 'Stop' : 'Start'}
          </button>
        </div>
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
      {hasLiveTranscript ? (
        <div className="rounded-md border border-border/20 bg-muted/20 px-2 py-1 text-[10px] text-foreground/70 space-y-1">
          <div className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/50">
            Live Transcript
          </div>
          {liveSegments.map((segment) => (
            <div key={segment.id} className="flex items-start justify-between gap-2">
              <span className="leading-relaxed">{segment.text}</span>
              {segment.status === 'rescoring' ? (
                <span className="text-[8px] font-semibold uppercase tracking-widest text-amber-300">
                  Rescoring
                </span>
              ) : null}
            </div>
          ))}
          {interimText ? (
            <div className="italic text-foreground/60">{interimText}</div>
          ) : null}
        </div>
      ) : null}
      {error ? (
        <div className="flex items-center justify-between gap-2 text-[10px] font-medium text-rose-400">
          <span>{error}</span>
          {showPermissionsHint ? (
            <button
              type="button"
              onClick={() => openSystemPermissions?.({ kind: permissionKind })}
              className="rounded border border-rose-400/40 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-rose-300 hover:border-rose-400/70 hover:text-rose-200 transition-all"
            >
              Open System Settings
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
