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
import {
  buildCommanderAssistantTurn,
  buildCommanderQuickPrompts,
  buildCommanderWelcomeTurn,
  resolveCommanderContext,
  type CommanderAction,
} from '../../utils/sessionMapCommander';
import { writeTextToClipboard } from '../../utils/clipboard';
import {
  SessionMapCommanderAvatar,
} from './SessionMapCommanderAvatar';
import {
  isCommanderTaskRun,
  resolveActiveCommanderRun,
} from '../../../../shared/commanderCore';

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

function CommanderTurnCard({
  title,
  body,
  tone = 'info',
  actions = [],
  pendingActionId,
  onAction,
  label,
}: any) {
  const resolvedTone = toneClasses[tone || 'info'] || toneClasses.info;

  return (
    <div
      className={`rounded-2xl border px-3 py-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)] ${resolvedTone.border} ${resolvedTone.bg}`}
    >
      {label ? (
        <div className="text-[7px] font-bold uppercase tracking-[0.14em] text-white/34">
          {label}
        </div>
      ) : null}
      <div className={`mt-1 text-[7px] font-bold uppercase tracking-[0.14em] ${resolvedTone.label}`}>
        {title}
      </div>
      <div className="mt-1 whitespace-pre-wrap break-words text-[12px] leading-relaxed text-white/84">
        {body}
      </div>
      {Array.isArray(actions) && actions.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {actions.map((action: CommanderAction) => {
            const isPending = pendingActionId === action.id;
            return (
              <button
                key={action.id}
                type="button"
                onClick={() => void onAction?.(action)}
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
  );
}

export function SessionMapCommanderBriefing({
  active = true,
  focusData,
  harnessRuns,
  sessionError,
  onCancelHarnessRun,
  onResumeHarnessRun,
  onClearSessionError,
  onClose,
}: any) {
  const runList = Array.isArray(harnessRuns) ? harnessRuns : [];
  const commanderRuns = useMemo(
    () => runList.filter((run) => isCommanderTaskRun(run)),
    [runList]
  );
  const context = useMemo(
    () =>
      resolveCommanderContext({
        focusData,
        harnessRuns: commanderRuns,
        sessionError,
      }),
    [commanderRuns, focusData, sessionError]
  );
  const activeCommanderRun = useMemo(
    () => resolveActiveCommanderRun(runList),
    [runList]
  );
  const quickPrompts = useMemo(() => buildCommanderQuickPrompts(context), [context]);
  const [draft, setDraft] = useState('');
  const [latestPrompt, setLatestPrompt] = useState('');
  const [latestResponse, setLatestResponse] = useState<any>(null);
  const [boundContextKey, setBoundContextKey] = useState('');
  const [pendingActionId, setPendingActionId] = useState('');
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const briefing = useMemo(() => buildCommanderWelcomeTurn(context, 'initial'), [context]);

  useEffect(() => {
    if (!active) {
      return;
    }
    inputRef.current?.focus();
  }, [active]);

  useEffect(() => {
    if (!boundContextKey) {
      setBoundContextKey(context.contextKey);
      return;
    }
    if (boundContextKey !== context.contextKey) {
      setBoundContextKey(context.contextKey);
      setLatestPrompt('');
      setLatestResponse(null);
      setDraft('');
    }
  }, [boundContextKey, context.contextKey]);

  const handleSubmitPrompt = (input: string) => {
    const trimmed = String(input || '').trim();
    if (!trimmed) {
      return;
    }
    setLatestPrompt(trimmed);
    setLatestResponse(buildCommanderAssistantTurn(trimmed, context));
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
        setLatestPrompt(action.label);
        setLatestResponse({
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
        setLatestPrompt(action.label);
        setLatestResponse({
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
        setLatestPrompt(action.label);
        setLatestResponse({
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
    <div
      id="session-map-commander-briefing"
      role="region"
      aria-labelledby="session-map-commander-briefing-title"
      className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-cyan-300/12 bg-[linear-gradient(180deg,rgba(14,20,29,0.992),rgba(7,10,16,0.99))] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03),0_16px_36px_rgba(0,0,0,0.28)]"
    >
      <div className="flex items-start justify-between gap-3 border-b border-white/6 px-4 py-4">
        <div className="flex min-w-0 items-center gap-2">
          <SessionMapCommanderAvatar
            busy={Boolean(activeCommanderRun)}
            size={30}
            ringSize={36}
            className="shrink-0"
          />
          <div className="min-w-0">
            <div
              id="session-map-commander-briefing-title"
              className="truncate font-mono text-[8px] font-black uppercase tracking-[0.16em] text-cyan-100/86"
            >
              Commander Briefing
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="rounded-full border border-cyan-300/16 bg-cyan-500/[0.08] px-2 py-0.5 text-[6px] font-bold uppercase tracking-[0.12em] text-cyan-100/74">
                Session Map Scope
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[6px] font-bold uppercase tracking-[0.12em] text-white/56">
                {context.sessionName || 'No Focus Session'}
              </span>
              {context.runStatusLabel ? (
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[6px] font-bold uppercase tracking-[0.12em] text-white/56">
                  {context.runStatusLabel}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              const payload = latestResponse?.body || briefing.body || '';
              if (!payload) {
                return;
              }
              void writeTextToClipboard(payload);
            }}
            className="rounded-lg bg-white/[0.04] p-1 text-white/46 transition-colors hover:bg-white/[0.08] hover:text-cyan-100"
            aria-label="Copy active commander briefing"
          >
            <Copy size={12} />
          </button>
          <button
            type="button"
            onClick={() => onClose?.()}
            className="rounded-lg bg-white/[0.04] p-1 text-white/46 transition-colors hover:bg-rose-500/14 hover:text-rose-100"
            aria-label="Close commander briefing"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 pr-3">
        <div className="rounded-2xl border border-white/8 bg-[linear-gradient(180deg,rgba(16,22,31,0.96),rgba(8,11,17,0.98))] px-3.5 py-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]">
          <div className="flex items-start gap-3">
            <SessionMapCommanderAvatar
              busy={Boolean(activeCommanderRun)}
              size={34}
              ringSize={40}
              className="mt-1 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="text-[7px] font-bold uppercase tracking-[0.14em] text-white/34">
                Current Briefing
              </div>
              <div className="mt-2">
                <CommanderTurnCard
                  title={briefing.title}
                  body={briefing.body}
                  tone={briefing.tone}
                  actions={briefing.actions}
                  pendingActionId={pendingActionId}
                  onAction={handleAction}
                />
              </div>
            </div>
          </div>
        </div>

        {latestResponse ? (
          <div className="pl-10">
            <CommanderTurnCard
              label={latestPrompt ? `Latest Response · ${latestPrompt}` : 'Latest Response'}
              title={latestResponse.title}
              body={latestResponse.body}
              tone={latestResponse.tone}
              actions={latestResponse.actions}
              pendingActionId={pendingActionId}
              onAction={handleAction}
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/8 bg-white/[0.03] px-3.5 py-3 text-[8px] uppercase tracking-[0.14em] text-white/28">
            Use a quick prompt or ask one focused question. This briefing stays bound to the current session and run context instead of accumulating chat history.
          </div>
        )}
      </div>

      <div className="border-t border-white/6 px-4 py-4">
        <div className="mb-2.5 flex flex-wrap gap-1.5">
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
          Rebinding to a different session or run resets prior replies so the briefing stays scoped to current Session Map evidence.
        </div>
      </div>
    </div>
  );
}
