export type PendingHarnessRunRecord = {
  clientRequestId?: string;
  runId?: string;
  cellId?: string;
  sourceSessionId?: string;
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
  return (
    run?.result?.agent?.session ||
    run?.progress?.outputsByStepId?.['create-agent']?.session ||
    run?.capabilityCalls?.find?.((call: any) => call?.summary?.data?.session)?.summary?.data
      ?.session ||
    run?.artifacts?.find?.((artifact: any) => artifact?.kind === 'session') ||
    null
  );
}
