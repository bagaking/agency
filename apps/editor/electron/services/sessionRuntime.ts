// @ts-nocheck
const crypto = require('crypto');
const path = require('path');

const { createNewSession, resolveSessionForPreview } = require('./sessions');
const { getResolvedTerminusSettings } = require('./terminusSettings');
const { detectTerminalRuntime } = require('./terminalRuntimeDetection');
const { capturePane, getLastPaneActivity, inspectPane, sendKeys, sendText } = require('./tmux');
const { logRuntime } = require('./runtimeLog');

const SUPPORTED_INTENTS = new Set([
  'inspect',
  'dispatch_input',
  'wait_condition',
  'create_child',
  'smart_fork',
]);

const DEFAULT_CAPTURE_LINES = 160;
const DEFAULT_WAIT_INTERVAL_MS = 250;
const DEFAULT_WAIT_TIMEOUT_MS = 10_000;
const DEFAULT_QUIET_WINDOW_MS = 1_500;
const DEFAULT_CODEX_FORK_CONFIG = {
  enabled: false,
  driver: '',
  launchTemplate: 'codex --thread {thread_id}',
  sourceIdleMs: 1500,
  forkAckTimeoutMs: 15_000,
  childReadyTimeoutMs: 20_000,
};

function createOperationId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `session-runtime-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(ms) || 0)));
}

function normalizeIntent(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeNumber(value, fallback, min = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(min, Math.floor(parsed));
}

function normalizeCallerContext(payload = {}) {
  return {
    sourceSurface: String(payload?.sourceSurface || '').trim() || 'unknown',
    callerType: String(payload?.callerType || 'user').trim().toLowerCase() || 'user',
    callerId: String(payload?.callerId || '').trim(),
    traceId: String(payload?.traceId || '').trim(),
  };
}

function buildSuccess(intent, data = null, warnings = []) {
  return {
    success: true,
    intent,
    warnings: Array.isArray(warnings) ? warnings : [],
    failures: [],
    data,
  };
}

function buildFailure(intent, code, message, data = null) {
  return {
    success: false,
    intent,
    warnings: [],
    failures: [
      {
        code: String(code || 'FATAL'),
        message: String(message || 'Unknown session runtime error.'),
      },
    ],
    data,
  };
}

function basenameCommand(command) {
  const value = String(command || '').trim();
  if (!value) {
    return '';
  }
  return path.basename(value).toLowerCase();
}

function buildStep(id, status, detail = {}) {
  return {
    id,
    status,
    at: nowIso(),
    detail,
  };
}

function normalizeForkConfig(value = {}) {
  const launchTemplate = String(
    value?.launchTemplate || DEFAULT_CODEX_FORK_CONFIG.launchTemplate
  ).trim();
  return {
    enabled: Boolean(value?.enabled),
    driver: String(value?.driver || '').trim().toLowerCase(),
    launchTemplate: launchTemplate || DEFAULT_CODEX_FORK_CONFIG.launchTemplate,
    sourceIdleMs: normalizeNumber(
      value?.sourceIdleMs,
      DEFAULT_CODEX_FORK_CONFIG.sourceIdleMs,
      0
    ),
    forkAckTimeoutMs: normalizeNumber(
      value?.forkAckTimeoutMs,
      DEFAULT_CODEX_FORK_CONFIG.forkAckTimeoutMs,
      0
    ),
    childReadyTimeoutMs: normalizeNumber(
      value?.childReadyTimeoutMs,
      DEFAULT_CODEX_FORK_CONFIG.childReadyTimeoutMs,
      0
    ),
  };
}

function extractCodexForkMetadata(output = '') {
  const text = String(output || '');
  const metadata = {
    acknowledged: /thread forked from/i.test(text),
    threadId: '',
    threadName: '',
  };

  const threadIdPatterns = [
    /\bthread[_ -]?id\b\s*[:=]\s*["']?([a-z0-9._:-]+)["']?/i,
    /\bthread\b\s*[:=]\s*["']?([a-z0-9._:-]+)["']?/i,
    /--thread\s+([a-z0-9._:-]+)/i,
  ];
  for (const pattern of threadIdPatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      metadata.threadId = match[1];
      break;
    }
  }

  const threadNameMatch =
    text.match(/Thread forked from\s+(.+?)(?:\r?\n|$)/i) ||
    text.match(/Forked from thread\s+(.+?)(?:\r?\n|$)/i);
  if (threadNameMatch?.[1]) {
    metadata.threadName = String(threadNameMatch[1] || '').trim();
  }

  metadata.variables = {
    thread_id: metadata.threadId,
    thread_name: metadata.threadName,
  };
  return metadata;
}

function renderTemplate(template = '', variables = {}) {
  const text = String(template || '').trim();
  const missing = [];
  const rendered = text.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, key) => {
    const value = String(variables?.[key] || '').trim();
    if (!value) {
      missing.push(key);
      return '';
    }
    return value;
  });
  return {
    text: rendered.trim(),
    missing,
  };
}

async function defaultInspectSessionPane(payload = {}) {
  const { worktreePath, sessionId } = payload || {};
  const lines = normalizeNumber(payload?.lines, DEFAULT_CAPTURE_LINES, 20);
  const session = await resolveSessionForPreview({ worktreePath, sessionId });
  const [pane, output, lastActivityAt] = await Promise.all([
    inspectPane(session.tmuxSession),
    capturePane(session.tmuxSession, { lines, joinWrapped: true }),
    getLastPaneActivity(session.tmuxSession),
  ]);
  return {
    session,
    pane,
    output: String(output || ''),
    lastActivityAt: lastActivityAt || null,
  };
}

async function defaultDetectTerminalRuntime(payload = {}) {
  const inspection = payload?.inspection || (await defaultInspectSessionPane(payload));
  const runtime = await detectTerminalRuntime({
    pane: inspection?.pane,
    output: inspection?.output,
    profileId: inspection?.session?.profileId || payload?.profileId || '',
  });
  return {
    inspection,
    runtime,
  };
}

async function defaultDispatchSessionInput(payload = {}) {
  const { worktreePath, sessionId } = payload || {};
  const text = String(payload?.text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const confirm = payload?.confirm && typeof payload.confirm === 'object' ? payload.confirm : {};
  const settleMs = normalizeNumber(confirm?.settleMs, 48, 0);
  const mode = String(confirm?.mode || 'none').trim().toLowerCase();
  const keyList =
    mode === 'enter'
      ? ['Enter']
      : mode === 'double-enter'
        ? ['Enter', 'Enter']
        : mode === 'keys'
          ? (Array.isArray(confirm?.keys) ? confirm.keys : [confirm?.keys])
              .map((key) => String(key || '').trim())
              .filter(Boolean)
          : [];
  const session = await resolveSessionForPreview({ worktreePath, sessionId });
  if (text) {
    await sendText(session.tmuxSession, text);
  }
  if (keyList.length > 0) {
    if (text && settleMs > 0) {
      await sleep(settleMs);
    }
    await sendKeys(session.tmuxSession, keyList);
  }
  return {
    session,
    dispatched: {
      text,
      confirm: {
        mode,
        keys: keyList,
        settleMs,
      },
    },
  };
}

async function defaultCreateChildSession(payload = {}) {
  const {
    worktreePath,
    cellId,
    sourceSession,
    profileId,
    nodeKind,
    sourceSessionId,
    cellName,
    cellBranch,
  } = payload || {};
  if (!worktreePath || !cellId || !sourceSession?.id) {
    throw new Error('worktreePath, cellId, and sourceSession are required to create a child session.');
  }
  return createNewSession({
    cellId,
    worktreePath,
    profileId: profileId || sourceSession.profileId || 'shell',
    cellName: cellName || sourceSession.cellName,
    cellBranch: cellBranch || sourceSession.cellBranch,
    parentSessionId: sourceSession.id,
    nodeKind: nodeKind || 'fork',
    sourceSessionId: sourceSessionId || sourceSession.id,
  });
}

function createRuntimeDeps(overrides = {}) {
  return {
    inspectSessionPane: defaultInspectSessionPane,
    detectTerminalRuntime: defaultDetectTerminalRuntime,
    dispatchSessionInput: defaultDispatchSessionInput,
    createChildSession: defaultCreateChildSession,
    getResolvedTerminusSettings,
    sleep,
    logRuntime,
    ...overrides,
  };
}

async function waitForSessionCondition(payload = {}, overrides = {}) {
  const deps = createRuntimeDeps(overrides);
  const condition = payload?.condition && typeof payload.condition === 'object' ? payload.condition : {};
  const type = String(condition?.type || '').trim().toLowerCase();
  const timeoutMs = normalizeNumber(condition?.timeoutMs, DEFAULT_WAIT_TIMEOUT_MS, 50);
  const intervalMs = normalizeNumber(condition?.intervalMs, DEFAULT_WAIT_INTERVAL_MS, 10);
  const startAt = Date.now();
  const deadline = startAt + timeoutMs;
  const lines = normalizeNumber(condition?.lines, DEFAULT_CAPTURE_LINES, 20);
  let previousOutput = null;
  let stableSince = Date.now();
  let lastSnapshot = null;

  for (;;) {
    const snapshot = await deps.inspectSessionPane({
      worktreePath: payload?.worktreePath,
      sessionId: payload?.sessionId,
      lines,
    });
    lastSnapshot = snapshot;
    const currentCommand = basenameCommand(snapshot?.pane?.currentCommand);
    const output = String(snapshot?.output || '');

    if (type === 'pattern') {
      const expr = String(condition?.pattern || '').trim();
      const flags = String(condition?.flags || 'i').trim() || 'i';
      if (!expr) {
        throw new Error('wait_condition pattern is required.');
      }
      const regex = new RegExp(expr, flags);
      const match = output.match(regex);
      if (match) {
        return {
          matched: true,
          type,
          elapsedMs: Date.now() - startAt,
          match: match[0],
          groups: match.slice(1),
          snapshot,
        };
      }
    } else if (type === 'quiet') {
      const quietMs = normalizeNumber(condition?.quietMs, DEFAULT_QUIET_WINDOW_MS, 0);
      if (quietMs === 0) {
        return {
          matched: true,
          type,
          elapsedMs: Date.now() - startAt,
          snapshot,
        };
      }
      if (previousOutput === output) {
        if (Date.now() - stableSince >= quietMs) {
          return {
            matched: true,
            type,
            elapsedMs: Date.now() - startAt,
            snapshot,
          };
        }
      } else {
        previousOutput = output;
        stableSince = Date.now();
      }
    } else if (type === 'command') {
      const expected = Array.isArray(condition?.command)
        ? condition.command
        : [condition?.command];
      const normalized = expected
        .map((item) => basenameCommand(item))
        .filter(Boolean);
      if (!normalized.length) {
        throw new Error('wait_condition command is required.');
      }
      if (normalized.includes(currentCommand)) {
        return {
          matched: true,
          type,
          elapsedMs: Date.now() - startAt,
          snapshot,
        };
      }
    } else if (type === 'runtime_tool') {
      const expectedTool = basenameCommand(condition?.tool);
      if (!expectedTool) {
        throw new Error('wait_condition runtime_tool requires tool.');
      }
      const detected = await deps.detectTerminalRuntime({
        inspection: snapshot,
        worktreePath: payload?.worktreePath,
        sessionId: payload?.sessionId,
      });
      const runtime = detected?.runtime || detected;
      if (basenameCommand(runtime?.tool) === expectedTool) {
        return {
          matched: true,
          type,
          elapsedMs: Date.now() - startAt,
          snapshot,
          runtime,
        };
      }
    } else {
      throw new Error(`Unsupported wait_condition type: ${condition?.type || 'unknown'}`);
    }

    if (Date.now() >= deadline) {
      break;
    }
    await deps.sleep(intervalMs);
  }

  throw new Error(`Timed out waiting for session condition: ${type || 'unknown'}.`);
}

async function resolveForkProfile({ worktreePath, profileId, runtimeTool }, overrides = {}) {
  const deps = createRuntimeDeps(overrides);
  const settings = await deps.getResolvedTerminusSettings({ worktreePath });
  const profiles = Array.isArray(settings?.profiles) ? settings.profiles : [];
  const normalizedProfileId = String(profileId || '').trim();
  const normalizedRuntimeTool = basenameCommand(runtimeTool);
  const preferred = normalizedProfileId
    ? profiles.find((profile) => String(profile?.id || '').trim() === normalizedProfileId)
    : null;
  if (preferred?.fork?.enabled) {
    return preferred;
  }
  const runtimeMatch = normalizedRuntimeTool
    ? profiles.find((profile) => basenameCommand(profile?.id) === normalizedRuntimeTool)
    : null;
  return runtimeMatch || preferred || null;
}

async function runCodexSmartFork(payload = {}, overrides = {}) {
  const deps = createRuntimeDeps(overrides);
  const sourceInspection = payload?.sourceInspection || (await deps.inspectSessionPane({
    worktreePath: payload?.worktreePath,
    sessionId: payload?.sessionId,
    lines: DEFAULT_CAPTURE_LINES,
  }));
  const sourceSnapshot = sourceInspection;
  const runtimePayload = await deps.detectTerminalRuntime({
    inspection: sourceSnapshot,
    worktreePath: payload?.worktreePath,
    sessionId: payload?.sessionId,
  });
  const sourceRuntime = runtimePayload?.runtime || runtimePayload;
  const config = normalizeForkConfig(payload?.forkConfig);
  const steps = [buildStep('inspect-source', 'completed', {
    currentCommand: sourceSnapshot?.pane?.currentCommand || '',
    runtimeTool: sourceRuntime?.tool || '',
  })];

  if (basenameCommand(sourceRuntime?.tool) !== 'codex') {
    throw Object.assign(new Error('Source session is not running the Codex TUI.'), {
      code: 'SOURCE_NOT_CODEX',
      steps,
    });
  }

  if (config.sourceIdleMs > 0) {
    await waitForSessionCondition({
      worktreePath: payload?.worktreePath,
      sessionId: payload?.sessionId,
      condition: {
        type: 'quiet',
        quietMs: config.sourceIdleMs,
        timeoutMs: Math.max(config.sourceIdleMs * 2, 5_000),
        intervalMs: 200,
        lines: DEFAULT_CAPTURE_LINES,
      },
    }, deps);
    steps.push(buildStep('wait-source-idle', 'completed', { quietMs: config.sourceIdleMs }));
  } else {
    steps.push(buildStep('wait-source-idle', 'skipped', { quietMs: 0 }));
  }

  await deps.dispatchSessionInput({
    worktreePath: payload?.worktreePath,
    sessionId: payload?.sessionId,
    text: '/fork',
    confirm: {
      mode: 'enter',
      settleMs: 64,
    },
  });
  steps.push(buildStep('dispatch-source-fork', 'completed'));

  const ack = await waitForSessionCondition({
    worktreePath: payload?.worktreePath,
    sessionId: payload?.sessionId,
    condition: {
      type: 'pattern',
      pattern: 'Thread forked from',
      flags: 'i',
      timeoutMs: config.forkAckTimeoutMs,
      intervalMs: 250,
      lines: DEFAULT_CAPTURE_LINES,
    },
  }, deps);
  steps.push(buildStep('wait-fork-ack', 'completed', { match: ack?.match || '' }));

  const metadata = extractCodexForkMetadata(ack?.snapshot?.output || '');
  const rendered = renderTemplate(config.launchTemplate, metadata.variables);
  if (rendered.missing.includes('thread_id')) {
    throw Object.assign(new Error('Codex fork acknowledgement did not expose thread_id.'), {
      code: 'THREAD_ID_MISSING',
      steps,
      metadata,
    });
  }

  const childSession = await deps.createChildSession({
    worktreePath: payload?.worktreePath,
    cellId: payload?.cellId,
    sourceSession: sourceSnapshot.session,
    profileId:
      payload?.profileId ||
      payload?.resolvedProfileId ||
      sourceSnapshot.session?.profileId ||
      'codex',
    cellName: payload?.cellName,
    cellBranch: payload?.cellBranch,
    nodeKind: 'fork',
    sourceSessionId: sourceSnapshot.session?.id,
  });
  steps.push(buildStep('create-child-session', 'completed', { sessionId: childSession?.id || '' }));

  await deps.dispatchSessionInput({
    worktreePath: payload?.worktreePath,
    sessionId: childSession.id,
    text: rendered.text,
    confirm: {
      mode: 'enter',
      settleMs: 64,
    },
  });
  steps.push(buildStep('dispatch-child-launch', 'completed', { command: rendered.text }));

  const childReady = await waitForSessionCondition({
    worktreePath: payload?.worktreePath,
    sessionId: childSession.id,
    condition: {
      type: 'runtime_tool',
      tool: 'codex',
      timeoutMs: config.childReadyTimeoutMs,
      intervalMs: 250,
      lines: DEFAULT_CAPTURE_LINES,
    },
  }, deps);
  steps.push(buildStep('wait-child-ready', 'completed', {
    currentCommand: childReady?.snapshot?.pane?.currentCommand || '',
    runtimeTool: childReady?.runtime?.tool || '',
  }));

  return {
    mode: 'smart_fork',
    session: childSession,
    sourceSession: sourceSnapshot.session,
    sourceRuntime,
    steps,
    metadata,
    launch: {
      command: rendered.text,
      template: config.launchTemplate,
      variables: metadata.variables,
    },
  };
}

async function createPlainForkChild(payload = {}, overrides = {}) {
  const deps = createRuntimeDeps(overrides);
  const sourceSnapshot = await deps.inspectSessionPane({
    worktreePath: payload?.worktreePath,
    sessionId: payload?.sessionId,
    lines: DEFAULT_CAPTURE_LINES,
  });
  const childSession = await deps.createChildSession({
    worktreePath: payload?.worktreePath,
    cellId: payload?.cellId,
    sourceSession: sourceSnapshot.session,
    profileId: sourceSnapshot.session?.profileId || 'shell',
    cellName: payload?.cellName,
    cellBranch: payload?.cellBranch,
    nodeKind: 'fork',
    sourceSessionId: sourceSnapshot.session?.id,
  });
  return {
    mode: 'plain_fork',
    session: childSession,
    sourceSession: sourceSnapshot.session,
    steps: [buildStep('create-child-session', 'completed', { sessionId: childSession?.id || '' })],
  };
}

async function performSessionRuntimeIntent(payload = {}, overrides = {}) {
  const deps = createRuntimeDeps(overrides);
  const intent = normalizeIntent(payload?.intent);
  if (!SUPPORTED_INTENTS.has(intent)) {
    return buildFailure(intent || 'unknown', 'USER_ERROR', `Unsupported session runtime intent: ${payload?.intent || 'unknown'}.`);
  }

  const caller = normalizeCallerContext(payload);
  const operationId = createOperationId();

  try {
    if (intent === 'inspect') {
      const inspection = await deps.inspectSessionPane(payload);
      const detected = await deps.detectTerminalRuntime({
        inspection,
        worktreePath: payload?.worktreePath,
        sessionId: payload?.sessionId,
      });
      return buildSuccess(intent, {
        operationId,
        caller,
        ...inspection,
        runtime: detected?.runtime || detected,
      });
    }

    if (intent === 'dispatch_input') {
      const data = await deps.dispatchSessionInput(payload);
      return buildSuccess(intent, { operationId, caller, ...data });
    }

    if (intent === 'wait_condition') {
      const data = await waitForSessionCondition(payload, deps);
      return buildSuccess(intent, { operationId, caller, ...data });
    }

    if (intent === 'create_child') {
      const sourceSnapshot = await deps.inspectSessionPane(payload);
      const session = await deps.createChildSession({
        worktreePath: payload?.worktreePath,
        cellId: payload?.cellId,
        sourceSession: sourceSnapshot.session,
        profileId: payload?.profileId || sourceSnapshot.session?.profileId || 'shell',
        cellName: payload?.cellName,
        cellBranch: payload?.cellBranch,
        nodeKind: payload?.nodeKind || 'fork',
        sourceSessionId: payload?.sourceSessionId || sourceSnapshot.session?.id,
      });
      return buildSuccess(intent, {
        operationId,
        caller,
        session,
        sourceSession: sourceSnapshot.session,
      });
    }

    if (intent === 'smart_fork') {
      const sourceSnapshot = await deps.inspectSessionPane(payload);
      const detected = await deps.detectTerminalRuntime({
        inspection: sourceSnapshot,
        worktreePath: payload?.worktreePath,
        sessionId: payload?.sessionId,
      });
      const sourceRuntime = detected?.runtime || detected;
      const resolvedProfile = await resolveForkProfile({
        worktreePath: payload?.worktreePath,
        profileId: sourceSnapshot?.session?.profileId,
        runtimeTool: sourceRuntime?.tool,
      }, deps);
      const forkConfig = normalizeForkConfig(
        payload?.forkConfig || resolvedProfile?.fork || DEFAULT_CODEX_FORK_CONFIG
      );
      const result =
        forkConfig.enabled && forkConfig.driver === 'codex'
          ? await runCodexSmartFork({
              ...payload,
              profileId: payload?.profileId || resolvedProfile?.id || sourceSnapshot?.session?.profileId || '',
              resolvedProfileId: resolvedProfile?.id || '',
              forkConfig,
              sourceInspection: sourceSnapshot,
            }, deps)
          : await createPlainForkChild(payload, deps);
      return buildSuccess(intent, {
        operationId,
        caller,
        profileId: sourceSnapshot?.session?.profileId || '',
        sourceRuntime,
        profileFork: forkConfig,
        ...result,
      });
    }

    return buildFailure(intent, 'USER_ERROR', `Unsupported session runtime intent: ${intent}.`);
  } catch (error) {
    try {
      await deps.logRuntime('warn', 'session runtime intent failed', {
        intent,
        operationId,
        sourceSurface: caller.sourceSurface,
        callerType: caller.callerType,
        callerId: caller.callerId,
        traceId: caller.traceId,
        error: error?.message || String(error),
        code: error?.code || 'FATAL',
      });
    } catch (_loggingError) {
      // ignore logging failures
    }
    return buildFailure(intent, error?.code || 'FATAL', error?.message || String(error), {
      operationId,
      caller,
      steps: Array.isArray(error?.steps) ? error.steps : [],
      metadata: error?.metadata || null,
    });
  }
}

export {
  DEFAULT_CODEX_FORK_CONFIG,
  normalizeForkConfig,
  extractCodexForkMetadata,
  renderTemplate,
  waitForSessionCondition,
  performSessionRuntimeIntent,
  defaultDispatchSessionInput as dispatchSessionRuntimeInput,
  defaultDetectTerminalRuntime as detectSessionRuntime,
};
