const { capturePane, getPaneSize, getLastPaneActivity, sendKeys } = require('./tmux');
const { getSessionSize } = require('./terminal');
const { resolveSessionForPreview } = require('./sessions');
const { withPreviewAttach } = require('./sessionAttachManager');
const { readSessionMap } = require('./sessionMap');
const { readPreviewCache, writePreviewCache } = require('./sessionPreviewCache');

const inflightRefresh = new Map();
const startCommandSent = new Set();

const clampFrames = (value, fallback = 3) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(5, Math.max(1, Math.floor(parsed)));
};

const buildKey = ({ worktreePath, sessionId }) => `${worktreePath}:${sessionId}`;

const refreshPreviewFrame = async ({
  cellId,
  worktreePath,
  sessionId,
  lines,
  maxFrames,
  startCommand,
}) => {
  const session = await resolveSessionForPreview({ worktreePath, sessionId });
  const capture = await withPreviewAttach({ cellId, sessionId, worktreePath }, async () => {
    const size = await getPaneSize(session.tmuxSession);
    const liveSize = getSessionSize(session.tmuxSession);
    const resolvedCols = liveSize?.cols ?? size?.cols ?? null;
    const resolvedRows = liveSize?.rows ?? size?.rows ?? null;
    let output = '';
    const attempts = [120, 220, 320];
    for (let i = 0; i < attempts.length; i += 1) {
      output = await capturePane(session.tmuxSession, { lines, joinWrapped: true });
      if (String(output).trim().length > 0) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, attempts[i]));
    }
    const shouldKickoff =
      !String(output || '').trim() &&
      String(startCommand || '').trim() &&
      !startCommandSent.has(`${worktreePath}:${sessionId}`);
    if (shouldKickoff) {
      startCommandSent.add(`${worktreePath}:${sessionId}`);
      await sendKeys(session.tmuxSession, startCommand, { enter: true });
      await new Promise((resolve) => setTimeout(resolve, 200));
      output = await capturePane(session.tmuxSession, { lines, joinWrapped: true });
    }
    return {
      data: output,
      cols: resolvedCols,
      rows: resolvedRows,
      capturedAt: new Date().toISOString(),
    };
  });
  const cached = await writePreviewCache({
    worktreePath,
    sessionId,
    frame: capture,
    maxFrames,
  });
  return {
    sessionId: session.id,
    tmuxSession: session.tmuxSession,
    data: cached?.latest?.data || capture?.data || '',
    cols: cached?.latest?.cols ?? capture?.cols ?? null,
    rows: cached?.latest?.rows ?? capture?.rows ?? null,
    cachePath: cached?.path || null,
  };
};

async function captureSessionPreview({
  cellId,
  worktreePath,
  sessionId,
  lines,
  startCommand,
  cacheOnly = false,
}) {
  if (!cellId || !worktreePath || !sessionId) {
    throw new Error('cellId, worktreePath and sessionId are required.');
  }
  if (cacheOnly) {
    const cached = await readPreviewCache({ worktreePath, sessionId });
    if (!cached?.latest) {
      return {
        sessionId,
        tmuxSession: null,
        data: '',
        cols: null,
        rows: null,
        cachePath: cached?.path || null,
        lastActivity: null,
        unchanged: true,
        cacheMiss: true,
      };
    }
    return {
      sessionId,
      tmuxSession: null,
      data: cached.latest.data,
      cols: cached.latest.cols ?? null,
      rows: cached.latest.rows ?? null,
      cachePath: cached.path || null,
      lastActivity: null,
      unchanged: true,
      cacheOnly: true,
    };
  }
  const cached = await readPreviewCache({ worktreePath, sessionId });
  if (cached?.latest) {
    const key = buildKey({ worktreePath, sessionId });
    if (!inflightRefresh.has(key)) {
      const refresh = (async () => {
        try {
          const session = await resolveSessionForPreview({ worktreePath, sessionId });
          const lastActivity = await getLastPaneActivity(session.tmuxSession);
          const activityMs = Date.parse(lastActivity || '');
          const capturedMs = Date.parse(cached.latest.capturedAt || '');
          const hasFreshActivity =
            Number.isFinite(activityMs) && Number.isFinite(capturedMs) && activityMs > capturedMs;
          if (!hasFreshActivity) {
            return;
          }
          const config = await readSessionMap({ rootPath: worktreePath });
          const maxFrames = clampFrames(config?.previewCacheFrames, 3);
          await refreshPreviewFrame({
            cellId,
            worktreePath,
            sessionId,
            lines,
            maxFrames,
            startCommand,
          });
        } finally {
          inflightRefresh.delete(key);
        }
      })();
      inflightRefresh.set(key, refresh);
    }
    return {
      sessionId,
      tmuxSession: null,
      data: cached.latest.data,
      cols: cached.latest.cols ?? null,
      rows: cached.latest.rows ?? null,
      cachePath: cached.path || null,
      lastActivity: null,
      unchanged: true,
    };
  }
  const session = await resolveSessionForPreview({ worktreePath, sessionId });
  const config = await readSessionMap({ rootPath: worktreePath });
  const maxFrames = clampFrames(config?.previewCacheFrames, 3);
  return refreshPreviewFrame({
    cellId,
    worktreePath,
    sessionId,
    lines,
    maxFrames,
    startCommand,
  });
}

async function captureSessionSnapshot({ cellId, worktreePath, sessionId, lines, startCommand }) {
  if (!cellId || !worktreePath || !sessionId) {
    throw new Error('cellId, worktreePath and sessionId are required.');
  }
  const config = await readSessionMap({ rootPath: worktreePath });
  const maxFrames = clampFrames(config?.previewCacheFrames, 3);
  return refreshPreviewFrame({
    cellId,
    worktreePath,
    sessionId,
    lines,
    maxFrames,
    startCommand,
  });
}

export {
  captureSessionPreview,
  captureSessionSnapshot,
};
