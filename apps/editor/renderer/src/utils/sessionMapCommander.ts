import {
  isHarnessRunResumableStatus,
  resolveActiveHarnessRun,
  resolvePrimaryHarnessRun,
} from '../../../shared/commanderCore';

type CommanderIntent =
  | 'overview'
  | 'status'
  | 'failure'
  | 'next'
  | 'cancel'
  | 'resume'
  | 'inspect';

export type CommanderActionKind = 'cancel_run' | 'resume_run' | 'dismiss_error' | 'open_ops';

export type CommanderAction = {
  id: string;
  kind: CommanderActionKind;
  label: string;
  runId?: string;
};

export type CommanderPrompt = {
  id: string;
  label: string;
  prompt: string;
};

export type CommanderTurnDraft = {
  title: string;
  body: string;
  tone: 'info' | 'warn' | 'success';
  actions: CommanderAction[];
};

type ResolveCommanderContextArgs = {
  focusData?: any;
  harnessRuns?: any[];
  sessionError?: string;
  preferredRunId?: string;
};

const normalizeText = (value: unknown) => String(value || '').trim();

const normalizeRunStatus = (value: unknown) => normalizeText(value).toLowerCase();

const buildAction = (
  kind: CommanderActionKind,
  label: string,
  runId = ''
): CommanderAction => ({
  id: `${kind}:${runId || 'none'}`,
  kind,
  label,
  runId: normalizeText(runId),
});

const resolveRunTitle = (run: any) =>
  normalizeText(run?.goal?.title) ||
  normalizeText(run?.goal?.type) ||
  normalizeText(run?.runner?.steps?.[0]?.title) ||
  'Harness Run';

const resolveStatusLabel = (status: unknown) => {
  const normalized = normalizeRunStatus(status);
  if (!normalized) {
    return 'IDLE';
  }
  return normalized.toUpperCase();
};

const findLatestFailedEntry = (run: any) => {
  const timeline = Array.isArray(run?.timeline) ? run.timeline : [];
  for (let index = timeline.length - 1; index >= 0; index -= 1) {
    const entry = timeline[index];
    const entryStatus = normalizeRunStatus(entry?.status || entry?.phase);
    if (entryStatus === 'failed') {
      return entry;
    }
  }
  return null;
};

const resolveLatestFailureMessage = (run: any, sessionError = '') => {
  const explicitSessionError = normalizeText(sessionError);
  if (explicitSessionError) {
    return explicitSessionError;
  }
  const explicitFailure = normalizeText(run?.failures?.[0]?.message);
  if (explicitFailure) {
    return explicitFailure;
  }
  const failedEntry = findLatestFailedEntry(run);
  const failedEntryMessage =
    normalizeText(failedEntry?.detail?.message) ||
    normalizeText(failedEntry?.detail?.failures?.[0]?.message);
  return failedEntryMessage;
};

const resolveLatestEvidenceLine = (run: any) => {
  const timeline = Array.isArray(run?.timeline) ? run.timeline : [];
  const latest = timeline[timeline.length - 1] || null;
  if (!latest) {
    return '';
  }
  const title = normalizeText(latest?.title || latest?.type);
  const phase = normalizeText(latest?.phase || latest?.status);
  if (!title && !phase) {
    return '';
  }
  if (title && phase) {
    return `${title} (${phase.toUpperCase()})`;
  }
  return title || phase.toUpperCase();
};

const buildContextKey = ({
  focusData,
  relevantRun,
  sessionError,
}: {
  focusData?: any;
  relevantRun?: any;
  sessionError?: string;
}) =>
  [
    normalizeText(focusData?.cell?.id),
    normalizeText(focusData?.session?.id),
    normalizeText(relevantRun?.runId),
    normalizeText(relevantRun?.status),
    normalizeText(relevantRun?.currentStep?.title || relevantRun?.currentStep?.id),
    normalizeText(resolveLatestFailureMessage(relevantRun, sessionError)),
  ].join('::');

function resolveFocusedSessionRun(runList: any[], focusData: any) {
  const focusCellId = normalizeText(focusData?.cell?.id);
  const focusSessionId = normalizeText(focusData?.session?.id);
  if (!focusCellId || !focusSessionId) {
    return null;
  }
  const matchingRuns = runList.filter((run) => {
    const attentionRefs = run?.attentionRefs || run?.contextRefs || {};
    const runCellId = normalizeText(attentionRefs?.cellId);
    const runSessionId = normalizeText(attentionRefs?.sourceSessionId || attentionRefs?.sessionId);
    return runCellId === focusCellId && runSessionId === focusSessionId;
  });
  return resolveActiveHarnessRun(matchingRuns) || matchingRuns[0] || null;
}

function preferredRunMatchesFocus(preferredRun: any, focusData: any) {
  if (!preferredRun) {
    return false;
  }
  const focusCellId = normalizeText(focusData?.cell?.id);
  const focusSessionId = normalizeText(focusData?.session?.id);
  if (!focusCellId && !focusSessionId) {
    return true;
  }
  const attentionRefs = preferredRun?.attentionRefs || preferredRun?.contextRefs || {};
  const runCellId = normalizeText(attentionRefs?.cellId);
  const runSessionId = normalizeText(attentionRefs?.sourceSessionId || attentionRefs?.sessionId);
  if (focusCellId && runCellId && runCellId !== focusCellId) {
    return false;
  }
  if (focusSessionId && runSessionId && runSessionId !== focusSessionId) {
    return false;
  }
  return true;
}

export function resolveRelevantHarnessRun({
  focusData = null,
  harnessRuns = [],
  preferredRunId = '',
}: {
  focusData?: any;
  harnessRuns?: any[];
  preferredRunId?: string;
}) {
  const runList = Array.isArray(harnessRuns) ? harnessRuns : [];
  const normalizedPreferredRunId = normalizeText(preferredRunId);
  const preferredRun = normalizedPreferredRunId
    ? runList.find((run) => normalizeText(run?.runId) === normalizedPreferredRunId) || null
    : null;
  return (
    (preferredRunMatchesFocus(preferredRun, focusData) ? preferredRun : null) ||
    resolveFocusedSessionRun(runList, focusData) ||
    resolvePrimaryHarnessRun(runList) ||
    runList[0] ||
    null
  );
}

export function resolveCommanderContext({
  focusData = null,
  harnessRuns = [],
  sessionError = '',
  preferredRunId = '',
}: ResolveCommanderContextArgs) {
  const runList = Array.isArray(harnessRuns) ? harnessRuns : [];
  const activeRun = resolveActiveHarnessRun(runList);
  const latestRun = runList[0] || null;
  const relevantRun =
    resolveRelevantHarnessRun({
      focusData,
      harnessRuns: runList,
      preferredRunId,
    }) ||
    latestRun ||
    null;
  const latestFailedEntry = findLatestFailedEntry(relevantRun);
  const latestFailureMessage = resolveLatestFailureMessage(relevantRun, sessionError);
  const latestEvidenceLine = resolveLatestEvidenceLine(relevantRun);
  const sessionName =
    normalizeText(focusData?.session?.name) || normalizeText(focusData?.session?.id) || 'No session focus';
  const cellName = normalizeText(focusData?.cell?.name) || normalizeText(focusData?.cell?.id);
  const runStatus = normalizeRunStatus(relevantRun?.status);
  const hasActiveRun = Boolean(activeRun);
  const hasResumableRun = Boolean(
    relevantRun?.runId && isHarnessRunResumableStatus(runStatus)
  );

  return {
    focusData,
    activeRun,
    latestRun,
    relevantRun,
    latestFailedEntry,
    latestFailureMessage,
    latestEvidenceLine,
    sessionError: normalizeText(sessionError),
    sessionName,
    cellName,
    runTitle: resolveRunTitle(relevantRun),
    runStatus,
    runStatusLabel: resolveStatusLabel(runStatus),
    currentStepTitle:
      normalizeText(relevantRun?.currentStep?.title) || normalizeText(relevantRun?.currentStep?.id),
    hasActiveRun,
    hasResumableRun,
    contextKey: buildContextKey({
      focusData,
      relevantRun,
      sessionError,
    }),
  };
}

export function resolveCommanderIntent(prompt: string): CommanderIntent {
  const normalized = normalizeText(prompt).toLowerCase();
  if (!normalized) {
    return 'overview';
  }
  if (/(why|fail|failure|error|wrong|broken|失败|报错|错误|问题)/i.test(normalized)) {
    return 'failure';
  }
  if (/(what.*doing|what.*status|current status|state|status|doing now|进度|状态|在做|现在)/i.test(normalized)) {
    return 'status';
  }
  if (/(next|recommend|suggest|should i|what now|怎么办|下一步|建议|接下来)/i.test(normalized)) {
    return 'next';
  }
  if (/(cancel|stop|halt|terminate|取消|停止|终止)/i.test(normalized)) {
    return 'cancel';
  }
  if (/(retry|resume|rerun|try again|重试|恢复|再来)/i.test(normalized)) {
    return 'resume';
  }
  if (/(inspect|details|evidence|timeline|logs|细节|证据|日志|展开)/i.test(normalized)) {
    return 'inspect';
  }
  return 'overview';
}

const buildDefaultActions = (context: ReturnType<typeof resolveCommanderContext>) => {
  const actions: CommanderAction[] = [];
  if (context.hasActiveRun && context.activeRun?.runId) {
    actions.push(buildAction('cancel_run', 'Cancel Current Run', context.activeRun.runId));
  } else if (context.hasResumableRun && context.relevantRun?.runId) {
    actions.push(buildAction('resume_run', 'Retry This Run', context.relevantRun.runId));
  }
  if (context.sessionError) {
    actions.push(buildAction('dismiss_error', 'Dismiss Session Error'));
  }
  return actions;
};

const buildNextActionText = (context: ReturnType<typeof resolveCommanderContext>) => {
  if (context.sessionError) {
    return 'Clear or inspect the visible session error first, then decide whether the current run should be resumed.';
  }
  if (context.hasActiveRun) {
    return 'Stay on the current run unless it is clearly stuck. Use Cancel only if the run is blocked or targeting the wrong source session.';
  }
  if (context.hasResumableRun) {
    return 'Retry the latest failed run after fixing the source condition that caused the failure.';
  }
  if (context.relevantRun && context.runStatus === 'succeeded') {
    return 'The latest run already succeeded. Shift attention to the resulting child session or keep using Ops for evidence review.';
  }
  return 'There is no active Harness run in scope. Stay with the focused session and start a new operation only when you know the exact objective.';
};

export function buildCommanderWelcomeTurn(
  context: ReturnType<typeof resolveCommanderContext>,
  mode: 'initial' | 'updated' = 'initial'
): CommanderTurnDraft {
  const lines = [
    `Focused session: ${context.sessionName}${context.cellName ? ` in ${context.cellName}` : ''}.`,
  ];
  if (context.relevantRun?.runId) {
    lines.push(`Observed run: ${context.runTitle} (${context.runStatusLabel}).`);
  } else {
    lines.push('No active Harness run is currently attached to this rail.');
  }
  if (context.latestFailureMessage) {
    lines.push(`Current issue: ${context.latestFailureMessage}`);
  } else if (context.latestEvidenceLine) {
    lines.push(`Latest evidence: ${context.latestEvidenceLine}.`);
  }
  lines.push(
    mode === 'initial'
      ? 'Ask for status, failure analysis, or the next recommended action. I will stay bound to the current session and Harness evidence.'
      : 'The operational context changed. I have rebound this briefing to the newest session/run evidence.'
  );
  return {
    title: mode === 'initial' ? 'Commander Brief Ready' : 'Context Rebound',
    body: lines.join('\n'),
    tone: context.latestFailureMessage ? 'warn' : 'info',
    actions: buildDefaultActions(context),
  };
}

export function buildCommanderQuickPrompts(
  context: ReturnType<typeof resolveCommanderContext>
): CommanderPrompt[] {
  const prompts: CommanderPrompt[] = [];
  if (context.relevantRun?.runId || context.sessionError) {
    prompts.push({
      id: 'status',
      label: 'Status',
      prompt: 'What is the current run doing?',
    });
  }
  if (context.latestFailureMessage || context.hasResumableRun) {
    prompts.push({
      id: 'failure',
      label: 'Why Failed',
      prompt: 'Why did this fail?',
    });
  }
  prompts.push({
    id: 'next',
    label: 'Next Step',
    prompt: 'What should I do next?',
  });
  if (context.relevantRun?.runId || context.sessionError) {
    prompts.push({
      id: 'inspect',
      label: 'Evidence',
      prompt: 'Show me the evidence path.',
    });
  }
  if (context.hasActiveRun) {
    prompts.push({
      id: 'cancel',
      label: 'Cancel?',
      prompt: 'Can I cancel this run safely?',
    });
  } else if (context.hasResumableRun) {
    prompts.push({
      id: 'retry',
      label: 'Retry?',
      prompt: 'Can I retry this run now?',
    });
  }
  return prompts;
}

export function buildCommanderAssistantTurn(
  prompt: string,
  context: ReturnType<typeof resolveCommanderContext>
): CommanderTurnDraft {
  const intent = resolveCommanderIntent(prompt);
  const defaultActions = buildDefaultActions(context);

  if (intent === 'status') {
    const lines = [
      `Focused session: ${context.sessionName}${context.cellName ? ` in ${context.cellName}` : ''}.`,
    ];
    if (context.relevantRun?.runId) {
      lines.push(`Run: ${context.runTitle}.`);
      lines.push(
        `State: ${context.runStatusLabel}${context.currentStepTitle ? ` at ${context.currentStepTitle}` : ''}.`
      );
      if (context.latestEvidenceLine) {
        lines.push(`Latest evidence: ${context.latestEvidenceLine}.`);
      }
    } else {
      lines.push('There is no active Harness run attached to this session right now.');
    }
    if (context.sessionError) {
      lines.push(`Visible session issue: ${context.sessionError}`);
    }
    lines.push(`Recommendation: ${buildNextActionText(context)}`);
    return {
      title: 'Current Operational State',
      body: lines.join('\n'),
      tone: context.latestFailureMessage ? 'warn' : 'info',
      actions: defaultActions,
    };
  }

  if (intent === 'failure') {
    const lines = [];
    if (context.latestFailureMessage) {
      lines.push(`Blocking issue: ${context.latestFailureMessage}`);
    } else {
      lines.push('There is no recorded failure in the current session/run scope.');
    }
    if (context.latestFailedEntry?.title) {
      lines.push(`Failure surfaced at: ${normalizeText(context.latestFailedEntry.title)}.`);
    } else if (context.latestEvidenceLine) {
      lines.push(`Latest evidence: ${context.latestEvidenceLine}.`);
    }
    lines.push(`Recommendation: ${buildNextActionText(context)}`);
    return {
      title: 'Failure Analysis',
      body: lines.join('\n'),
      tone: context.latestFailureMessage ? 'warn' : 'info',
      actions: defaultActions,
    };
  }

  if (intent === 'next') {
    return {
      title: 'Recommended Next Action',
      body: [
        `Focused session: ${context.sessionName}${context.cellName ? ` in ${context.cellName}` : ''}.`,
        `Recommendation: ${buildNextActionText(context)}`,
      ].join('\n'),
      tone: context.hasResumableRun ? 'success' : context.latestFailureMessage ? 'warn' : 'info',
      actions: defaultActions,
    };
  }

  if (intent === 'inspect') {
    return {
      title: 'Evidence Path',
      body: [
        'Use Ops when you want the raw timeline, copyable run details, and the exact failed or completed entries.',
        context.latestEvidenceLine ? `Latest evidence in scope: ${context.latestEvidenceLine}.` : '',
      ]
        .filter(Boolean)
        .join('\n'),
      tone: 'info',
      actions: [buildAction('open_ops', 'Open Ops'), ...defaultActions],
    };
  }

  if (intent === 'cancel') {
    if (context.hasActiveRun && context.activeRun?.runId) {
      return {
        title: 'Cancellation Available',
        body: [
          `The active run is ${context.runTitle} (${context.runStatusLabel}).`,
          'Cancelling will stop additional Harness scheduling but keep the existing timeline and evidence.',
          'Use the explicit action below if you want to stop it now.',
        ].join('\n'),
        tone: 'warn',
        actions: [buildAction('cancel_run', 'Cancel Current Run', context.activeRun.runId)],
      };
    }
    return {
      title: 'No Active Run To Cancel',
      body: 'There is no running or queued Harness run in the current session scope, so there is nothing to cancel right now.',
      tone: 'info',
      actions: defaultActions,
    };
  }

  if (intent === 'resume') {
    if (context.hasResumableRun && context.relevantRun?.runId) {
      return {
        title: 'Retry Available',
        body: [
          `The latest resumable run is ${context.runTitle} (${context.runStatusLabel}).`,
          'Retry will resume that Harness run from its stored lifecycle instead of improvising a new raw operation.',
          'Use the explicit action below after you are satisfied with the source conditions.',
        ].join('\n'),
        tone: 'success',
        actions: [buildAction('resume_run', 'Retry This Run', context.relevantRun.runId)],
      };
    }
    return {
      title: 'No Resumable Run In Scope',
      body: 'I do not see a failed or cancelled Harness run in the current session scope that can be retried right now.',
      tone: 'info',
      actions: defaultActions,
    };
  }

  return {
    title: 'Commander Overview',
    body: [
      `Focused session: ${context.sessionName}${context.cellName ? ` in ${context.cellName}` : ''}.`,
      context.relevantRun?.runId
        ? `Observed run: ${context.runTitle} (${context.runStatusLabel}).`
        : 'No active Harness run is attached right now.',
      context.latestFailureMessage ? `Current issue: ${context.latestFailureMessage}` : '',
      `Recommendation: ${buildNextActionText(context)}`,
    ]
      .filter(Boolean)
      .join('\n'),
    tone: context.latestFailureMessage ? 'warn' : 'info',
    actions: defaultActions,
  };
}
