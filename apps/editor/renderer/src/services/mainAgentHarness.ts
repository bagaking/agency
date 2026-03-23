import {
  cancelMainAgentHarnessRun as invokeCancelMainAgentHarnessRun,
  inspectMainAgentHarnessRun as invokeInspectMainAgentHarnessRun,
  listMainAgentHarnessRuns as invokeListMainAgentHarnessRuns,
  resumeMainAgentHarnessRun as invokeResumeMainAgentHarnessRun,
  startMainAgentHarnessRun as invokeStartMainAgentHarnessRun,
} from './agencyBridge';

type MainAgentHarnessRunPayload = Record<string, any>;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const startMainAgentHarnessRun = async (payload: MainAgentHarnessRunPayload) => {
  const response = await invokeStartMainAgentHarnessRun(payload);
  if (!response) {
    throw new Error('Main Agent Harness is unavailable.');
  }
  return response;
};

export const inspectMainAgentHarnessRun = async (payload: { runId: string }) => {
  const response = await invokeInspectMainAgentHarnessRun(payload);
  if (!response) {
    throw new Error('Main Agent Harness is unavailable.');
  }
  return response;
};

export const cancelMainAgentHarnessRun = async (payload: { runId: string; reason?: string }) => {
  const response = await invokeCancelMainAgentHarnessRun(payload);
  if (!response) {
    throw new Error('Main Agent Harness is unavailable.');
  }
  return response;
};

export const resumeMainAgentHarnessRun = async (payload: { runId: string }) => {
  const response = await invokeResumeMainAgentHarnessRun(payload);
  if (!response) {
    throw new Error('Main Agent Harness is unavailable.');
  }
  return response;
};

export const listMainAgentHarnessRuns = async (payload: { limit?: number } = {}) => {
  return (await invokeListMainAgentHarnessRuns(payload)) || [];
};

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
