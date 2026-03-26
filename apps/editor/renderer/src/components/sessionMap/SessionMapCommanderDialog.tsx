import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Copy,
  MessageSquareText,
  Radar,
  RefreshCcw,
  Send,
  ShieldAlert,
  Square,
  X,
} from 'lucide-react';
import { AgentAvatarBadge } from '../ui/AgentAvatarBadge';
import {
  buildCommanderAssistantTurn,
  buildCommanderQuickPrompts,
  buildCommanderWelcomeTurn,
  resolveCommanderContext,
  type CommanderAction,
} from '../../utils/sessionMapCommander';

const COMMANDER_AVATAR_ID = 'AGENCY_BACKEND_COMMANDER';

const buildMessageId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const toneClasses = {
  info: {
    border: 'border-cyan-300/15',
    bg: 'bg-cyan-500/[0.06]',
    label: 'text-cyan-100/72',
  },
  warn: {
    border: 'border-amber-300/18',
    bg: 'bg-amber-500/[0.07]',
    label: 'text-amber-100/78',
  },
  success: {
    border: 'border-emerald-300/16',
    bg: 'bg-emerald-500/[0.07]',
    label: 'text-emerald-100/78',
  },
} as const;

function renderActionIcon(kind: CommanderAction['kind']) {
  if (kind === 'cancel_run') {
    return <Square size={10} />;
  }
  if (kind === 'resume_run') {
    return <RefreshCcw size={10} />;
  }
  if (kind === 'dismiss_error') {
    return <ShieldAlert size={10} />;
  }
  return <Radar size={10} />;
}

export function SessionMapCommanderDialog({
  focusData,
  harnessRuns,
  sessionError,
  onCancelHarnessRun,
  onResumeHarnessRun,
  onClearSessionError,
  onClose,
}: any) {
  const context = useMemo(
    () =>
      resolveCommanderContext({
        focusData,
        harnessRuns,
        sessionError,
      }),
    [focusData, harnessRuns, sessionError]
  );
  const quickPrompts = useMemo(() => buildCommanderQuickPrompts(context), [context]);
  const [messages, setMessages] = useState<any[]>([]);
  const [draft, setDraft] = useState('');
  const [boundContextKey, setBoundContextKey] = useState('');
  const [pendingActionId, setPendingActionId] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!messages.length) {
      const welcome = buildCommanderWelcomeTurn(context, 'initial');
      setMessages([
        {
          id: buildMessageId('assistant'),
          role: 'assistant',
          ...welcome,
        },
      ]);
      setBoundContextKey(context.contextKey);
      return;
    }
    if (boundContextKey && boundContextKey !== context.contextKey) {
      const rebound = buildCommanderWelcomeTurn(context, 'updated');
      setMessages((current) => [
        ...current,
        {
          id: buildMessageId('assistant'),
          role: 'assistant',
          ...rebound,
        },
      ]);
      setBoundContextKey(context.contextKey);
      return;
    }
    if (!boundContextKey) {
      setBoundContextKey(context.contextKey);
    }
  }, [boundContextKey, context, messages.length]);

  useEffect(() => {
    if (!scrollRef.current) {
      return;
    }
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, pendingActionId]);

  const appendAssistantTurn = (turn: any) => {
    setMessages((current) => [
      ...current,
      {
        id: buildMessageId('assistant'),
        role: 'assistant',
        ...turn,
      },
    ]);
  };

  const handleSubmitPrompt = (input: string) => {
    const trimmed = String(input || '').trim();
    if (!trimmed) {
      return;
    }
    setMessages((current) => [
      ...current,
      {
        id: buildMessageId('user'),
        role: 'user',
        body: trimmed,
      },
    ]);
    appendAssistantTurn(buildCommanderAssistantTurn(trimmed, context));
    setDraft('');
  };

  const handleAction = async (action: CommanderAction) => {
    if (!action?.kind) {
      return;
    }
    if (action.kind === 'open_ops') {
      onClose?.();
      return;
    }

    setPendingActionId(action.id);
    try {
      if (action.kind === 'dismiss_error') {
        onClearSessionError?.();
        appendAssistantTurn({
          title: 'Visible Error Dismissed',
          body: 'I cleared the visible session error. Ops still retains run evidence if you need it.',
          tone: 'success',
          actions: [],
        });
        return;
      }

      if (action.kind === 'cancel_run') {
        const runId = String(action.runId || context.activeRun?.runId || '').trim();
        const result = await onCancelHarnessRun?.(runId);
        appendAssistantTurn({
          title: result ? 'Cancellation Requested' : 'Cancellation Did Not Complete',
          body: result
            ? 'The run is back under Harness control. Watch Ops for the transition to cancelling or cancelled.'
            : 'I could not confirm cancellation through the Harness control plane.',
          tone: result ? 'warn' : 'warn',
          actions: result ? [{ id: 'open_ops', kind: 'open_ops', label: 'Open Ops' }] : [],
        });
        return;
      }

      if (action.kind === 'resume_run') {
        const runId = String(action.runId || context.relevantRun?.runId || '').trim();
        const result = await onResumeHarnessRun?.(runId);
        appendAssistantTurn({
          title: result ? 'Retry Requested' : 'Retry Did Not Start',
          body: result
            ? 'The resumable run has been handed back to the Harness lifecycle. Switch to Ops if you want to watch the step timeline live.'
            : 'I could not resume that run through the Harness control plane.',
          tone: result ? 'success' : 'warn',
          actions: result ? [{ id: 'open_ops', kind: 'open_ops', label: 'Open Ops' }] : [],
        });
      }
    } finally {
      setPendingActionId('');
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[24px] border border-cyan-300/12 bg-[linear-gradient(180deg,rgba(14,20,29,0.985),rgba(7,10,16,0.985))] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03),0_24px_80px_rgba(0,0,0,0.45)]">
      <div className="flex items-center justify-between gap-3 border-b border-white/6 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <AgentAvatarBadge
            avatarId={COMMANDER_AVATAR_ID}
            size={18}
            ringSize={24}
            showRing={false}
            className="shrink-0 rounded-full bg-black/45 p-1"
          />
          <div className="min-w-0">
            <div className="truncate font-mono text-[8px] font-black uppercase tracking-[0.16em] text-cyan-100/86">
              Commander Briefing
            </div>
            <div className="truncate text-[7px] uppercase tracking-[0.12em] text-white/38">
              Evidence-bound to current session and Harness state
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              const latestMessage = messages[messages.length - 1];
              const payload = latestMessage?.body || '';
              if (!payload) {
                return;
              }
              void navigator.clipboard?.writeText(payload);
            }}
            className="rounded-lg bg-white/[0.04] p-1 text-white/46 transition-colors hover:bg-white/[0.08] hover:text-cyan-100"
            aria-label="Copy latest briefing message"
          >
            <Copy size={12} />
          </button>
          <button
            type="button"
            onClick={() => onClose?.()}
            className="rounded-lg bg-white/[0.04] p-1 text-white/46 transition-colors hover:bg-rose-500/14 hover:text-rose-100"
            aria-label="Close commander dialog"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-2.5 py-2 pr-1.5">
        {messages.map((message) => {
          if (message.role === 'user') {
            return (
              <div key={message.id} className="ml-8 flex justify-end">
                <div className="max-w-[88%] rounded-2xl border border-white/8 bg-white/[0.05] px-3 py-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)]">
                  <div className="text-[7px] font-bold uppercase tracking-[0.14em] text-white/36">
                    You
                  </div>
                  <div className="mt-1 whitespace-pre-wrap break-words text-[12px] leading-relaxed text-white/88">
                    {message.body}
                  </div>
                </div>
              </div>
            );
          }

          const tone = toneClasses[message.tone || 'info'];
          return (
            <div key={message.id} className="mr-4">
              <div className="flex items-start gap-2">
                <AgentAvatarBadge
                  avatarId={COMMANDER_AVATAR_ID}
                  size={16}
                  ringSize={20}
                  showRing={false}
                  className="mt-1 shrink-0 rounded-full bg-black/45 p-0.5"
                />
                <div
                  className={`min-w-0 flex-1 rounded-2xl border px-3 py-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)] ${tone.border} ${tone.bg}`}
                >
                  <div className={`text-[7px] font-bold uppercase tracking-[0.14em] ${tone.label}`}>
                    {message.title}
                  </div>
                  <div className="mt-1 whitespace-pre-wrap break-words text-[12px] leading-relaxed text-white/84">
                    {message.body}
                  </div>
                  {Array.isArray(message.actions) && message.actions.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {message.actions.map((action: CommanderAction) => {
                        const isPending = pendingActionId === action.id;
                        return (
                          <button
                            key={action.id}
                            type="button"
                            onClick={() => void handleAction(action)}
                            disabled={Boolean(pendingActionId)}
                            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/28 px-2.5 py-1 text-[7px] font-bold uppercase tracking-[0.12em] text-white/72 transition-colors hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {renderActionIcon(action.kind)}
                            <span>{isPending ? 'Working' : action.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-white/6 px-2.5 py-2">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt.id}
              type="button"
              onClick={() => handleSubmitPrompt(prompt.prompt)}
              className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[7px] font-bold uppercase tracking-[0.12em] text-white/62 transition-colors hover:border-cyan-300/25 hover:bg-cyan-500/[0.08] hover:text-cyan-100"
            >
              {prompt.label}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2">
          <div className="relative flex-1">
            <MessageSquareText size={12} className="pointer-events-none absolute left-2.5 top-2.5 text-white/24" />
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  handleSubmitPrompt(draft);
                }
              }}
              rows={2}
              placeholder="Ask the commander about the current session or run"
              className="w-full resize-none rounded-2xl border border-white/10 bg-black/28 py-2 pl-7 pr-3 text-[12px] leading-relaxed text-white/86 outline-none transition-colors placeholder:text-white/24 focus:border-cyan-300/28 focus:bg-black/34"
            />
          </div>
          <button
            type="button"
            onClick={() => handleSubmitPrompt(draft)}
            disabled={!draft.trim()}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-300/18 bg-cyan-500/[0.12] text-cyan-100 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)] transition-colors hover:bg-cyan-500/[0.18] disabled:cursor-not-allowed disabled:opacity-45"
            aria-label="Send commander prompt"
          >
            <Send size={13} />
          </button>
        </div>
        <div className="mt-2 text-[7px] uppercase tracking-[0.12em] text-white/30">
          Bound to current session identity, Harness evidence, and approved operational actions.
        </div>
      </div>
    </div>
  );
}
