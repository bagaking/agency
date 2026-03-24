import {
  cancelMainAgentHarnessRun as invokeCancelMainAgentHarnessRun,
  inspectMainAgentHarnessRun as invokeInspectMainAgentHarnessRun,
  listMainAgentHarnessRuns as invokeListMainAgentHarnessRuns,
  onMainAgentHarnessProgress as subscribeMainAgentHarnessProgress,
  resumeMainAgentHarnessRun as invokeResumeMainAgentHarnessRun,
  startMainAgentHarnessRun as invokeStartMainAgentHarnessRun,
} from './agencyBridge';

type MainAgentHarnessRunPayload = Record<string, any>;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const unwrapHarnessResponse = (response: any, fallbackAction: string) => {
  if (!response) {
    throw new Error('Main Agent Harness is unavailable.');
  }
  if (response.success === false) {
    const message =
      response?.failures?.[0]?.message ||
      `Main Agent Harness action failed: ${fallbackAction}.`;
    throw new Error(message);
  }
  return response?.data ?? null;
};

export const startMainAgentHarnessRun = async (payload: MainAgentHarnessRunPayload) => {
  const response = await invokeStartMainAgentHarnessRun(payload);
  return unwrapHarnessResponse(response, 'start');
};

export const inspectMainAgentHarnessRun = async (payload: { runId: string }) => {
  const response = await invokeInspectMainAgentHarnessRun(payload);
  return unwrapHarnessResponse(response, 'inspect');
};

export const cancelMainAgentHarnessRun = async (payload: { runId: string; reason?: string }) => {
  const response = await invokeCancelMainAgentHarnessRun(payload);
  return unwrapHarnessResponse(response, 'cancel');
};

export const resumeMainAgentHarnessRun = async (payload: { runId: string }) => {
  const response = await invokeResumeMainAgentHarnessRun(payload);
  return unwrapHarnessResponse(response, 'resume');
};

export const listMainAgentHarnessRuns = async (payload: { limit?: number } = {}) => {
  const response = await invokeListMainAgentHarnessRuns(payload);
  const data = unwrapHarnessResponse(response, 'list');
  return Array.isArray(data) ? data : [];
};

export const onMainAgentHarnessProgress = (handler: any) =>
  subscribeMainAgentHarnessProgress?.(handler);

export const waitForMainAgentHarnessRun = async ({
  runId,
  intervalMs = 200,
  timeoutMs = 30_000,
}: {
  runId: string;
  intervalMs?: number;
  timeoutMs?: number;
}) => {
  const startedAt = Date.now();
  for (;;) {
    const run = await inspectMainAgentHarnessRun({ runId });
    const status = String(run?.status || '').trim().toLowerCase();
    if (status === 'succeeded') {
      return run;
    }
    if (status === 'failed') {
      const failure = run?.failures?.[0];
      throw new Error(failure?.message || 'Harness run failed.');
    }
    if (status === 'cancelled') {
      throw new Error('Harness run was cancelled.');
    }
    if (Date.now() - startedAt >= timeoutMs) {
      throw new Error(`Timed out waiting for Harness run: ${runId}.`);
    }
    await sleep(intervalMs);
  }
};
