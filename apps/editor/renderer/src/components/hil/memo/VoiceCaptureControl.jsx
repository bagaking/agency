import React from 'react';
import { ChevronDown, Loader2, Mic, Square } from 'lucide-react';
import { openSystemPermissions } from '../../../services/agencyBridge.js';
import { Tooltip } from '../../ui/Tooltip.jsx';

export function VoiceCaptureControl({ voice, segments = [], shortcut }) {
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
  const focusRingClass =
    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background';
  const statusText =
    statusMessage ||
    (disabled
      ? 'Voice capture unavailable.'
      : isStarting
      ? 'Starting...'
      : isRecording
      ? 'Listening...'
      : 'Ready.');
  const statusDotClass = disabled
    ? 'bg-muted-foreground/30'
    : isActive
    ? 'bg-emerald-400 animate-pulse'
    : isStarting
    ? 'bg-amber-400 animate-pulse'
    : 'bg-emerald-300/70';
  const normalizedShortcut = String(shortcut || '').trim();
  const shortcutHint = normalizedShortcut ? `Shortcut: ${normalizedShortcut}` : 'Shortcut: unassigned';
  const startLabel = isRecording ? 'Stop voice input' : 'Start voice input';
  const startTooltip = `${startLabel} · ${shortcutHint}`;
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/20 bg-card/50 px-3 py-2.5 shadow-[0_10px_24px_rgba(15,23,42,0.18)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${statusDotClass}`} />
          <Tooltip label="Voice input" side="bottom">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-border/20 bg-background/70 text-muted-foreground/70">
              <Mic size={12} />
              <span className="sr-only">Voice input</span>
            </span>
          </Tooltip>
          <span className="h-3 w-px bg-border/30" />
          <span className="min-w-0 truncate text-[9px] text-muted-foreground/60" title={statusText}>
            {statusText}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {languageOptions?.length ? (
            <div className="relative">
              <select
                value={language || 'auto'}
                onChange={handleLanguageChange}
                disabled={languageDisabled}
                aria-label="Voice input language"
                className={`h-7 appearance-none rounded-full border px-2.5 pr-7 text-[9px] font-semibold transition-all ${focusRingClass} ${
                  languageDisabled
                    ? 'border-border/10 bg-muted/20 text-muted-foreground/40'
                    : 'border-border/30 bg-background/80 text-foreground hover:border-primary/40'
                }`}
              >
                {languageOptions.map((option) => (
                  <option key={option} value={option}>
                    {renderLanguageLabel(option)}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={12}
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/60"
              />
            </div>
          ) : null}
          <Tooltip label={startTooltip} side="top">
            <button
              type="button"
              onClick={handleClick}
              disabled={disabled}
              className={`inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[9px] font-semibold uppercase tracking-widest transition-all ${focusRingClass} ${
                disabled
                  ? 'border-border/10 text-muted-foreground/40'
                  : isRecording
                  ? 'border-rose-400/40 text-rose-300 hover:border-rose-400/70'
                  : 'border-border/30 text-muted-foreground/70 hover:border-primary/40 hover:text-foreground'
              }`}
              aria-label={startLabel}
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
          </Tooltip>
        </div>
      </div>
      {hasLiveTranscript ? (
        <div className="rounded-lg border border-border/10 bg-background/60 px-2.5 py-2 text-[10px] text-foreground/70 space-y-1 max-h-28 overflow-y-auto custom-scrollbar">
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
        <div className="flex items-center justify-between gap-2 rounded-md border border-rose-400/30 bg-rose-500/5 px-2 py-1 text-[10px] font-medium text-rose-300">
          <span>{error}</span>
          {showPermissionsHint ? (
            <button
              type="button"
              onClick={() => openSystemPermissions?.({ kind: permissionKind })}
              className={`rounded border border-rose-400/40 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-rose-300 transition-all hover:border-rose-400/70 hover:text-rose-200 ${focusRingClass}`}
            >
              Open System Settings
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
