import React, { useEffect, useId, useRef } from 'react';
import { ChevronDown, Link2, Loader2, Reply, Send, Sparkles, StickyNote, Users, X } from 'lucide-react';

import { resolveAvatarId } from '../../utils/agentAvatar';
import { AgentAvatarBadge } from '../ui/AgentAvatarBadge';
import { focusRing } from '../ui/focusRing';
import { Tooltip } from '../ui/Tooltip';
import { useDismissibleLayer } from '../ui/useDismissibleLayer';
import { SCOPE_LABELS, renderReplySiteSegments } from './sessionReplyShared';

export function SessionReplyComposerChrome({
  quickPromptMenuRef,
  quickPromptTriggerRef,
  availableQuickPrompts,
  quickPromptMenuOpen,
  setQuickPromptMenuOpen,
  handleInsertQuickPrompt,
  selectedTarget,
  setSelectedTarget,
  otherTargets,
  sendMenuOpen,
  setSendMenuOpen,
  hasContent,
  submitting,
  handleCreateReply,
  selectionContext,
  siteText,
  onClearSelection,
}: any) {
  const focusRingClass = focusRing.default;
  const sendMenuRef = useRef<HTMLDivElement | null>(null);
  const sendMenuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const quickPromptFirstItemRef = useRef<HTMLButtonElement | null>(null);
  const routeFirstItemRef = useRef<HTMLButtonElement | null>(null);
  const quickPromptPopoverId = useId();
  const routePopoverId = useId();
  const canChooseTarget = otherTargets.length > 0 || Boolean(selectedTarget);
  const routeSummary = selectedTarget
    ? `${selectedTarget.sessionName || selectedTarget.sessionId} · ${
        selectedTarget.cellName || selectedTarget.cellId
      }`
    : 'Current Session';
  const targetLabel = selectedTarget
    ? `${selectedTarget.sessionName || selectedTarget.sessionId}`
    : 'Current';

  useDismissibleLayer({
    open: quickPromptMenuOpen,
    onDismiss: () => setQuickPromptMenuOpen(false),
    refs: [quickPromptTriggerRef, quickPromptMenuRef],
  });

  useDismissibleLayer({
    open: sendMenuOpen,
    onDismiss: () => setSendMenuOpen(false),
    refs: [sendMenuTriggerRef, sendMenuRef],
  });

  useEffect(() => {
    if (!quickPromptMenuOpen) {
      return undefined;
    }
    const frameId = window.requestAnimationFrame(() => {
      quickPromptFirstItemRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [quickPromptMenuOpen]);

  useEffect(() => {
    if (!sendMenuOpen) {
      return undefined;
    }
    const frameId = window.requestAnimationFrame(() => {
      routeFirstItemRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [sendMenuOpen]);

  return (
    <>
      <div className="border-b border-border/10 bg-muted/10">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 px-2.5 py-1.5">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              Compose
            </span>
            <div className="relative min-w-0">
              <button
                ref={quickPromptTriggerRef}
                type="button"
                onClick={() =>
                  setQuickPromptMenuOpen((current: boolean) => {
                    const next = !current;
                    if (next) {
                      setSendMenuOpen(false);
                    }
                    return next;
                  })
                }
                disabled={!availableQuickPrompts.length}
                aria-expanded={quickPromptMenuOpen ? 'true' : 'false'}
                aria-haspopup="dialog"
                aria-controls={quickPromptMenuOpen ? quickPromptPopoverId : undefined}
                className={`inline-flex h-6 items-center gap-1 rounded-md border border-border/30 bg-background/60 px-2 text-[10px] font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-35 ${focusRingClass}`}
              >
                <Sparkles size={10} />
                <span>Quick Reply</span>
                <ChevronDown size={10} />
              </button>
              {quickPromptMenuOpen ? (
                <div
                  id={quickPromptPopoverId}
                  ref={quickPromptMenuRef}
                  role="dialog"
                  aria-modal="false"
                  aria-label="Quick reply suggestions"
                  className="absolute left-0 top-full z-50 mt-2 w-80 max-h-72 overflow-y-auto overscroll-contain rounded-lg border border-border/50 bg-popover p-1 shadow-2xl"
                >
                  {availableQuickPrompts.length ? (
                    availableQuickPrompts.map((prompt: any, index: number) => (
                      <button
                        key={prompt.id}
                        ref={index === 0 ? quickPromptFirstItemRef : undefined}
                        type="button"
                        onClick={() => {
                          handleInsertQuickPrompt(prompt.text);
                          setQuickPromptMenuOpen(false);
                        }}
                        className={`w-full rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted/40 ${focusRingClass}`}
                      >
                        {prompt.title ? (
                          <div className="truncate text-[10px] font-semibold text-foreground">{prompt.title}</div>
                        ) : null}
                        <div className="line-clamp-2 whitespace-pre-wrap break-words text-[10px] font-mono text-muted-foreground">
                          {prompt.text}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {(prompt.sources || []).map((source: string) => (
                            <span
                              key={`${prompt.id}-${source}`}
                              className="rounded border border-border/60 bg-muted/20 px-1 py-0.5 text-[8px] font-bold uppercase tracking-widest text-muted-foreground/70"
                            >
                              {SCOPE_LABELS[source] || source}
                            </span>
                          ))}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-2 py-3 text-[10px] text-muted-foreground/70">No quick prompts configured.</div>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Tooltip label="Record Reply" side="top">
              <button
                type="button"
                onClick={() => handleCreateReply({ action: 'record' })}
                disabled={!hasContent || submitting}
                aria-label="Record reply locally"
                className={`flex h-6 w-6 items-center justify-center rounded-md border border-border/30 bg-background/50 text-muted-foreground transition-colors hover:text-primary hover:border-primary/30 disabled:opacity-30 ${focusRingClass}`}
              >
                {submitting && !sendMenuOpen ? <Loader2 size={12} className="animate-spin" /> : <StickyNote size={12} />}
              </button>
            </Tooltip>
            <Tooltip label={`Send to ${targetLabel}`} side="top">
              <button
                type="button"
                onClick={() => handleCreateReply({ action: 'send', target: selectedTarget })}
                disabled={!hasContent || submitting}
                aria-label={`Send reply to ${targetLabel}`}
                className={`flex h-6 items-center gap-1.5 rounded-md bg-primary px-3 text-[10px] font-bold text-primary-foreground shadow-lg transition-colors hover:bg-primary/90 disabled:opacity-50 active:scale-95 ${focusRingClass}`}
              >
                <span>Send</span>
                {submitting ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />}
              </button>
            </Tooltip>
          </div>
        </div>

        <div className="relative border-t border-border/10 bg-background/20 px-2.5 py-1.5">
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-[8px] font-bold uppercase tracking-widest text-muted-foreground/45">
              Route
            </span>
            <button
              ref={sendMenuTriggerRef}
              type="button"
              onClick={() =>
                setSendMenuOpen((current: boolean) => {
                  const next = !current;
                  if (next) {
                    setQuickPromptMenuOpen(false);
                  }
                  return next;
                })
              }
              disabled={!canChooseTarget}
              aria-expanded={sendMenuOpen ? 'true' : 'false'}
              aria-haspopup="dialog"
              aria-controls={sendMenuOpen ? routePopoverId : undefined}
              aria-label={selectedTarget ? `Change target from ${routeSummary}` : 'Select reply target'}
              className={`flex min-w-0 flex-1 items-center gap-2 rounded-md border border-border/20 bg-background/60 px-2 py-1 text-left transition-colors hover:border-primary/35 hover:bg-background/80 disabled:opacity-45 ${focusRingClass}`}
            >
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary/80">
                {selectedTarget ? (
                  <AgentAvatarBadge
                    avatarId={resolveAvatarId(selectedTarget.avatar || selectedTarget.sessionId || selectedTarget.cellId)}
                    size={12}
                    showRing={false}
                  />
                ) : (
                  <Users size={10} />
                )}
              </div>
              <span className="min-w-0 flex-1 truncate text-[10px] font-semibold text-foreground/85">
                {routeSummary}
              </span>
              <ChevronDown
                size={10}
                className={`shrink-0 text-muted-foreground/55 transition-transform ${sendMenuOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {selectedTarget ? (
              <button
                type="button"
                onClick={() => setSelectedTarget(null)}
                aria-label="Reset reply target to current session"
                className={`shrink-0 rounded-md border border-primary/20 bg-primary/10 px-2 py-1 text-[9px] font-semibold text-primary transition-colors hover:border-primary/35 hover:bg-primary/15 ${focusRingClass}`}
              >
                Current
              </button>
            ) : null}
          </div>

          {sendMenuOpen ? (
            <div
              id={routePopoverId}
              ref={sendMenuRef}
              role="dialog"
              aria-modal="false"
              aria-label="Reply route chooser"
              className="absolute bottom-full left-2.5 right-2.5 z-50 mb-2 overflow-hidden rounded-xl border border-border/20 bg-popover text-popover-foreground shadow-2xl animate-in fade-in zoom-in-95 duration-100"
            >
              <div className="border-b border-border/10 bg-muted/5 px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">
                Route Reply To…
              </div>
              <div className="max-h-52 overflow-y-auto overscroll-contain custom-scrollbar p-1">
                <button
                  ref={routeFirstItemRef}
                  type="button"
                  onClick={() => {
                    setSelectedTarget(null);
                    setSendMenuOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] transition-colors hover:bg-primary/5 hover:text-primary ${!selectedTarget ? 'bg-primary/10 text-primary' : ''} ${focusRingClass}`}
                >
                  <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Reply size={10} />
                  </div>
                  <span className="flex-1 truncate font-semibold">Current Session</span>
                </button>
                {otherTargets.map((target: any) => (
                  <button
                    key={`${target.cellId}:${target.sessionId}`}
                    type="button"
                    onClick={() => {
                      setSelectedTarget(target);
                      setSendMenuOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] transition-colors hover:bg-primary/5 hover:text-primary ${selectedTarget?.sessionId === target.sessionId ? 'bg-primary/10 text-primary' : ''} ${focusRingClass}`}
                  >
                    <AgentAvatarBadge
                      avatarId={resolveAvatarId(target.avatar || target.sessionId || target.cellId)}
                      size={16}
                      showRing={false}
                    />
                    <span className="flex-1 truncate font-medium opacity-80">
                      {target.cellName || target.cellId} / {target.sessionName || target.sessionId}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {selectionContext ? (
        <div className="border-b border-border/10 bg-black/20 px-3 py-2">
          <div className="flex flex-col gap-1 rounded-md border border-border/10 bg-muted/5 p-2">
            <div className="mb-0.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-widest text-primary/50">
                <Link2 size={10} />
                <span>Context Cite</span>
              </div>
              <button
                type="button"
                onClick={() => onClearSelection?.()}
                aria-label="Clear selection context"
                className={`rounded-full p-1 text-muted-foreground/30 transition-colors hover:bg-rose-500/10 hover:text-rose-500 ${focusRingClass}`}
              >
                <X size={10} />
              </button>
            </div>
            <div className="line-clamp-2 text-[10px] font-mono text-muted-foreground/70 leading-normal">
              {siteText ? renderReplySiteSegments(siteText) : <span className="italic opacity-30">No content</span>}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
