const {
  performSessionRuntimeIntent,
} = require('./sessionRuntime') as {
  performSessionRuntimeIntent: (
    payload?: Record<string, any>,
    overrides?: Record<string, any>
  ) => Promise<Record<string, any>>;
};

function normalizeText(value: unknown): string {
  return String(value || '').trim();
}

function unwrapSessionRuntimeResult(
  result: Record<string, any> | null | undefined,
  fallbackIntent: string
) {
  if (!result) {
    throw new Error(`Session runtime intent failed: ${fallbackIntent}.`);
  }
  if (result.success === false) {
    const failure = result?.failures?.[0] || null;
    const error = new Error(
      failure?.message ||
        `Session runtime intent failed: ${fallbackIntent}.`
    ) as Error & {
      code?: string;
      data?: Record<string, any> | null;
    };
    error.code = failure?.code || 'FATAL';
    error.data = result?.data || null;
    throw error;
  }
  return result?.data || {};
}

function createCallerMetadata(payload: Record<string, any> = {}) {
  return {
    sourceSurface:
      normalizeText(payload?.sourceSurface) || 'commander',
    callerType: normalizeText(payload?.callerType) || 'host',
    callerId: normalizeText(payload?.callerId) || 'session-runtime-atom',
    traceId: normalizeText(payload?.traceId),
  };
}

async function inspectSessionRuntime(payload: Record<string, any> = {}) {
  const result = await performSessionRuntimeIntent({
    ...createCallerMetadata(payload),
    intent: 'inspect',
    worktreePath: payload?.worktreePath,
    sessionId: payload?.sessionId,
    lines: payload?.lines,
  });
  return unwrapSessionRuntimeResult(result, 'inspect');
}

async function createChildSessionRuntime(payload: Record<string, any> = {}) {
  const result = await performSessionRuntimeIntent({
    ...createCallerMetadata(payload),
    intent: 'create_child',
    worktreePath: payload?.worktreePath,
    cellId: payload?.cellId,
    cellName: payload?.cellName,
    cellBranch: payload?.cellBranch,
    sessionId: payload?.sessionId,
    sourceSessionId: payload?.sourceSessionId,
    profileId: payload?.profileId,
    nodeKind: payload?.nodeKind,
  });
  return unwrapSessionRuntimeResult(result, 'create_child');
}

async function dispatchSessionRuntimeInput(payload: Record<string, any> = {}) {
  const result = await performSessionRuntimeIntent({
    ...createCallerMetadata(payload),
    intent: 'dispatch_input',
    worktreePath: payload?.worktreePath,
    sessionId: payload?.sessionId,
    text: payload?.text,
    confirm: payload?.confirm,
  });
  return unwrapSessionRuntimeResult(result, 'dispatch_input');
}

async function runSmartForkSessionRuntime(payload: Record<string, any> = {}) {
  const result = await performSessionRuntimeIntent({
    ...createCallerMetadata(payload),
    intent: 'smart_fork',
    worktreePath: payload?.worktreePath,
    cellId: payload?.cellId,
    cellName: payload?.cellName,
    cellBranch: payload?.cellBranch,
    sessionId: payload?.sessionId,
    sourceSessionId: payload?.sourceSessionId,
    profileId: payload?.profileId,
    forkConfig: payload?.forkConfig,
  });
  return unwrapSessionRuntimeResult(result, 'smart_fork');
}

module.exports = {
  inspectSessionRuntime,
  createChildSessionRuntime,
  dispatchSessionRuntimeInput,
  runSmartForkSessionRuntime,
};

export {};
