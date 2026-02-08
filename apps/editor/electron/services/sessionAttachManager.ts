// @ts-nocheck
const { resolveSessionForAttach } = require('./sessions');
const { startSession, disposeSession } = require('./terminal');
const { getLastPaneActivity } = require('./tmux');
const { readSessionMap } = require('./sessionMap');
const { logRuntime } = require('./runtimeLog');

const GC_INTERVAL_MS = 60 * 1000;
const PREVIEW_HOLD_MS = 15 * 1000;

const attachState = new Map();
let gcTimer = null;
let notifyDetached = null;

const buildKey = (cellId, sessionId) => `${cellId}:${sessionId}`;

const normalizeBool = (value, fallback = false) =>
  typeof value === 'boolean' ? value : fallback;

const normalizeNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const resolveAttachConfig = async (worktreePath) => {
  const mapConfig = await readSessionMap({ rootPath: worktreePath });
  return {
    attachGcEnabled: normalizeBool(mapConfig?.attachGcEnabled, true),
    attachGcIdleMinutes: Math.max(1, normalizeNumber(mapConfig?.attachGcIdleMinutes, 30)),
    attachGcGraceSeconds: Math.max(10, normalizeNumber(mapConfig?.attachGcGraceSeconds, 60)),
  };
};

const ensureRecord = ({ cellId, sessionId, worktreePath }) => {
  const key = buildKey(cellId, sessionId);
  const existing = attachState.get(key);
  if (existing) {
    return existing;
  }
  const record = {
    key,
    cellId,
    sessionId,
    worktreePath,
    tmuxSession: null,
    attached: false,
    attachedByPreview: false,
    attaching: null,
    interactive: false,
    previewCount: 0,
    previewHoldUntil: 0,
    previewDetachTimer: null,
    lastAttachAt: null,
    lastDetachAt: null,
    lastPreviewAt: null,
  };
  attachState.set(key, record);
  return record;
};

const resolveAttach = async ({ cellId, sessionId, worktreePath, mode, resolvedSession }) => {
  const record = ensureRecord({ cellId, sessionId, worktreePath });
  if (record.attached) {
    return record;
  }
  if (record.attaching) {
    await record.attaching;
    return record;
  }
  record.attaching = (async () => {
    const session = resolvedSession || (await resolveSessionForAttach({ worktreePath, sessionId }));
    record.tmuxSession = session.tmuxSession;
    const terminalSession = startSession({
      cellId,
      sessionId,
      tmuxSession: session.tmuxSession,
      cwd: worktreePath,
      mode: mode || 'shell',
    });
    record.terminalSession = terminalSession;
    record.attached = true;
    record.lastAttachAt = new Date().toISOString();
    return record;
  })()
    .catch((error) => {
      record.attaching = null;
      throw error;
    })
    .then((result) => {
      record.attaching = null;
      return result;
    });
  return record.attaching;
};

const markDetached = ({ record }) => {
  record.attached = false;
  record.attachedByPreview = false;
  record.lastDetachAt = new Date().toISOString();
};

const detachRecord = ({ record, reason }) => {
  if (!record.attached || !record.tmuxSession) {
    return;
  }
  if (record.previewDetachTimer) {
    clearTimeout(record.previewDetachTimer);
    record.previewDetachTimer = null;
  }
  disposeSession(record.cellId, record.sessionId);
  markDetached({ record });
  logRuntime('info', 'session detached', {
    cellId: record.cellId,
    sessionId: record.sessionId,
    reason,
  });
  notifyDetached?.({ cellId: record.cellId, sessionId: record.sessionId });
};

const ensureGcTimer = () => {
  if (gcTimer) {
    return;
  }
  gcTimer = setInterval(() => {
    runAttachGc().catch((error) => {
      logRuntime('error', 'session attach GC failed', { error: error?.message || String(error) });
    });
  }, GC_INTERVAL_MS);
};

const shouldSkipIdleForAttach = ({ lastAttachAt, lastActivityAt, graceMs }) => {
  if (!lastAttachAt || !lastActivityAt) {
    return false;
  }
  const attachTs = Date.parse(lastAttachAt);
  const activityTs = Date.parse(lastActivityAt);
  if (!Number.isFinite(attachTs) || !Number.isFinite(activityTs)) {
    return false;
  }
  return Math.abs(activityTs - attachTs) <= graceMs;
};

const runAttachGc = async () => {
  const records = Array.from(attachState.values());
  if (!records.length) {
    return;
  }
  await Promise.all(
    records.map(async (record) => {
      if (!record.attached || record.interactive) {
        return;
      }
      const config = await resolveAttachConfig(record.worktreePath);
      if (!config.attachGcEnabled) {
        return;
      }
      const lastActivityAt = await getLastPaneActivity(record.tmuxSession);
      if (!lastActivityAt) {
        return;
      }
      const graceMs = config.attachGcGraceSeconds * 1000;
      if (shouldSkipIdleForAttach({
        lastAttachAt: record.lastAttachAt,
        lastActivityAt,
        graceMs,
      })) {
        return;
      }
      const idleMs = Date.now() - Date.parse(lastActivityAt);
      if (!Number.isFinite(idleMs)) {
        return;
      }
      const thresholdMs = config.attachGcIdleMinutes * 60 * 1000;
      if (idleMs < thresholdMs) {
        return;
      }
      detachRecord({ record, reason: 'idle-gc' });
    })
  );
};

const acquirePreview = async ({ cellId, sessionId, worktreePath, mode }) => {
  const record = ensureRecord({ cellId, sessionId, worktreePath });
  record.previewCount += 1;
  record.lastPreviewAt = new Date().toISOString();
  record.previewHoldUntil = Date.now() + PREVIEW_HOLD_MS;
  if (record.previewDetachTimer) {
    clearTimeout(record.previewDetachTimer);
    record.previewDetachTimer = null;
  }
  if (!record.attached) {
    record.attachedByPreview = true;
    await resolveAttach({ cellId, sessionId, worktreePath, mode });
  }
  ensureGcTimer();
  return record;
};

const schedulePreviewDetach = (record) => {
  if (record.previewDetachTimer) {
    clearTimeout(record.previewDetachTimer);
  }
  const delay = Math.max(0, record.previewHoldUntil - Date.now());
  record.previewDetachTimer = setTimeout(() => {
    record.previewDetachTimer = null;
    if (!record.interactive && record.previewCount === 0 && record.attachedByPreview) {
      detachRecord({ record, reason: 'preview-release' });
    }
  }, delay);
};

const releasePreview = ({ record }) => {
  if (!record) {
    return;
  }
  record.previewCount = Math.max(0, record.previewCount - 1);
  if (!record.interactive && record.previewCount === 0 && record.attachedByPreview) {
    schedulePreviewDetach(record);
  }
};

const withPreviewAttach = async ({ cellId, sessionId, worktreePath }, fn) => {
  const record = await acquirePreview({ cellId, sessionId, worktreePath, mode: 'shell' });
  try {
    return await fn(record);
  } finally {
    releasePreview({ record });
  }
};

const markInteractive = ({ cellId, sessionId, worktreePath, active }) => {
  if (!cellId || !sessionId) {
    return;
  }
  const record = ensureRecord({ cellId, sessionId, worktreePath });
  record.interactive = Boolean(active);
  ensureGcTimer();
};

const ensureInteractiveAttach = async ({ cellId, sessionId, worktreePath, mode, resolvedSession }) => {
  const record = await resolveAttach({
    cellId,
    sessionId,
    worktreePath,
    mode,
    resolvedSession,
  });
  record.attachedByPreview = false;
  if (record.previewDetachTimer) {
    clearTimeout(record.previewDetachTimer);
    record.previewDetachTimer = null;
  }
  ensureGcTimer();
  return record;
};

const noteTerminalDisposed = ({ cellId, sessionId }) => {
  const record = attachState.get(buildKey(cellId, sessionId));
  if (!record) {
    return;
  }
  markDetached({ record });
  record.interactive = false;
  record.previewCount = 0;
  record.previewHoldUntil = 0;
  if (record.previewDetachTimer) {
    clearTimeout(record.previewDetachTimer);
    record.previewDetachTimer = null;
  }
};

const setDetachNotifier = (handler) => {
  notifyDetached = typeof handler === 'function' ? handler : null;
};

export {
  ensureInteractiveAttach,
  withPreviewAttach,
  markInteractive,
  noteTerminalDisposed,
  setDetachNotifier,
};
