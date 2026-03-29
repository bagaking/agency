export type PendingHarnessRunRecord = {
  clientRequestId?: string;
  runId?: string;
  cellId?: string;
  sourceSessionId?: string;
};

export type TrackedHarnessTerminalOutcome = {
  status: string;
  createdSession: any | null;
  createdSessionId: string;
  partialSuccess: boolean;
  failureMessage: string;
};

function normalizeText(value: unknown): string {
  return String(value || '').trim();
}

export function isTrackedHarnessEventRelevant({
  event,
  knownRunsById = {},
  pendingRuns = {},
}: {
  event?: any;
  knownRunsById?: Record<string, any>;
  pendingRuns?: Record<string, PendingHarnessRunRecord>;
}): boolean {
  const runId = normalizeText(event?.runId);
  const clientRequestId = normalizeText(event?.clientRequestId);
  if (!runId) {
    return false;
  }
  if (knownRunsById[runId]) {
    return true;
  }
  return Object.values(pendingRuns || {}).some((pending) => {
    return (
      normalizeText(pending?.runId) === runId ||
      (clientRequestId &&
        normalizeText(pending?.clientRequestId) === clientRequestId)
    );
  });
}

export function resolveCreatedSessionFromHarnessRun(run: any): any | null {
  const artifactSession = run?.artifacts?.find?.(
    (artifact: any) => artifact?.kind === 'session'
  );
  return (
    run?.result?.agent?.session ||
    run?.progress?.outputsByStepId?.['create-agent']?.session ||
    (artifactSession
      ? {
          id: artifactSession.sessionId || artifactSession.id || '',
          profileId: artifactSession.profileId || '',
          nodeKind: artifactSession.nodeKind || '',
        }
      : null) ||
    run?.capabilityCalls
      ?.filter?.((call: any) => String(call?.request?.intent || '').trim().toLowerCase() !== 'inspect')
      ?.find?.((call: any) => call?.summary?.data?.session)?.summary?.data?.session ||
    null
  );
}

export function resolveTrackedHarnessTerminalOutcome(run: any): TrackedHarnessTerminalOutcome {
  const status = normalizeText(run?.status).toLowerCase();
  const createdSession = resolveCreatedSessionFromHarnessRun(run);
  const createdSessionId = normalizeText(
    createdSession?.id || createdSession?.sessionId
  );
  const rawFailureMessage =
    normalizeText(run?.failures?.[0]?.message) ||
    (status === 'cancelled'
      ? 'Harness run was cancelled.'
      : status === 'failed'
        ? 'Harness run failed.'
        : '');
  const partialSuccess =
    Boolean(createdSessionId) && status !== 'succeeded';

  return {
    status,
    createdSession,
    createdSessionId,
    partialSuccess,
    failureMessage: partialSuccess
      ? `Child session created, readiness not confirmed. ${rawFailureMessage}`.trim()
      : rawFailureMessage,
  };
}
