import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { useModal } from './ModalSystem';

export function SmartSessionNamePending({
  modalId,
  sessionName,
  startedAt,
}: {
  modalId: string;
  sessionName: string;
  startedAt?: number;
}) {
  const modal = useModal();
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!startedAt) {
      return undefined;
    }
    setElapsedMs(Math.max(0, Date.now() - startedAt));
    const handle = window.setInterval(() => {
      setElapsedMs(Math.max(0, Date.now() - startedAt));
    }, 1000);
    return () => window.clearInterval(handle);
  }, [startedAt]);

  const elapsedSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const elapsedLabel =
    elapsedSeconds >= 60
      ? `${Math.floor(elapsedSeconds / 60)}m ${String(elapsedSeconds % 60).padStart(2, '0')}s`
      : `${elapsedSeconds}s`;

  return (
    <div className="space-y-4">
      <div className="rounded-[22px] bg-white/[0.035] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-cyan-400/10 text-cyan-100 shadow-[inset_0_0_0_1px_rgba(125,211,252,0.12)]">
            <Loader2 size={18} className="animate-spin" />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="text-[14px] font-semibold leading-6 text-foreground">
              Commander is generating smart session names.
            </div>
            <div className="text-[12px] leading-6 text-muted-foreground/78">
              Reviewing recent session context can take a while. This dialog stays open until the run actually finishes or you explicitly cancel it.
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-2">
              {sessionName ? (
                <span className="inline-flex items-center rounded-full bg-white/[0.045] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100/82 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
                  Target Session:
                  <span className="ml-2 normal-case tracking-normal text-foreground">{sessionName}</span>
                </span>
              ) : null}
              {startedAt ? (
                <span className="inline-flex items-center rounded-full bg-white/[0.045] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
                  Elapsed:
                  <span className="ml-2 normal-case tracking-normal text-foreground">{elapsedLabel}</span>
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => modal?.closeModal?.(modalId, 'cancel')}
          className="rounded-full bg-white/[0.04] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:bg-rose-500/14 hover:text-rose-100"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function SmartSessionNameSuggestions({
  modalId,
  currentName,
  suggestions,
}: {
  modalId: string;
  currentName: string;
  suggestions: string[];
}) {
  const modal = useModal();
  const uniqueSuggestions = Array.from(
    new Set((suggestions || []).map((item) => String(item || '').trim()).filter(Boolean))
  );

  return (
    <div className="space-y-3">
      {currentName ? (
        <div className="rounded-2xl bg-white/[0.035] px-3.5 py-3 text-[11px] text-muted-foreground/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          Current name: <span className="font-medium text-foreground">{currentName}</span>
        </div>
      ) : null}
      <div className="space-y-2 rounded-[22px] bg-white/[0.025] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
        {uniqueSuggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => modal?.closeModal?.(modalId, suggestion)}
            className="w-full rounded-2xl px-3.5 py-3 text-left text-[13px] font-medium text-foreground transition-colors hover:bg-white/[0.055] hover:text-white"
          >
            {suggestion}
          </button>
        ))}
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => modal?.closeModal?.(modalId, '')}
          className="rounded-full bg-white/[0.04] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
