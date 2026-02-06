import { getSessionMapPreview } from './agencyBridge.js';
import { PREVIEW_LINES } from '../components/sessionMap/sessionMapConstants.js';

const memoryCache = new Map();
const inflight = new Map();

const buildKey = ({ worktreePath, cellId, sessionId }) => {
  const session = String(sessionId || '').trim();
  if (!session) {
    return '';
  }
  const base = String(worktreePath || cellId || '').trim();
  return base ? `${base}:${session}` : session;
};

const normalizePreview = (preview) => {
  if (!preview || typeof preview !== 'object') {
    return null;
  }
  const data = String(preview.data || '');
  if (!data) {
    return null;
  }
  return {
    data,
    cols: Number.isFinite(preview.cols) ? preview.cols : null,
    rows: Number.isFinite(preview.rows) ? preview.rows : null,
    cachePath: preview.cachePath || null,
    capturedAt: preview.capturedAt || null,
    updatedAt: Date.now(),
  };
};

export const getCachedSessionMapPreview = ({ worktreePath, cellId, sessionId }) => {
  const key = buildKey({ worktreePath, cellId, sessionId });
  if (!key) {
    return null;
  }
  return memoryCache.get(key) || null;
};

export const setCachedSessionMapPreview = ({ worktreePath, cellId, sessionId, preview }) => {
  const key = buildKey({ worktreePath, cellId, sessionId });
  if (!key) {
    return null;
  }
  const normalized = normalizePreview(preview);
  if (!normalized) {
    return null;
  }
  memoryCache.set(key, normalized);
  return normalized;
};

export const primeSessionMapPreview = async ({
  worktreePath,
  cellId,
  sessionId,
  lines = PREVIEW_LINES,
  startCommand = '',
  cacheOnly = false,
} = {}) => {
  const key = buildKey({ worktreePath, cellId, sessionId });
  if (!key) {
    return null;
  }
  if (inflight.has(key)) {
    return inflight.get(key);
  }
  const task = (async () => {
    const result = await getSessionMapPreview({
      worktreePath,
      cellId,
      sessionId,
      lines,
      startCommand,
      cacheOnly,
    });
    if (result?.data) {
      setCachedSessionMapPreview({ worktreePath, cellId, sessionId, preview: result });
    }
    return result || null;
  })();
  inflight.set(key, task);
  try {
    return await task;
  } finally {
    inflight.delete(key);
  }
};

const chunked = (items, size) => {
  const batches = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
};

export const warmSessionMapPreviewCache = ({
  sessions = [],
  lines = PREVIEW_LINES,
  concurrency = 3,
} = {}) => {
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return;
  }
  const tasks = sessions.filter((item) => {
    if (!item?.sessionId) {
      return false;
    }
    if (!item?.worktreePath && !item?.cellId) {
      return false;
    }
    const cached = getCachedSessionMapPreview(item);
    return !cached;
  });
  if (!tasks.length) {
    return;
  }
  const batches = chunked(tasks, Math.max(1, concurrency));
  batches.reduce(
    (promise, batch) =>
      promise.then(() =>
        Promise.all(
          batch.map((item) =>
            primeSessionMapPreview({
              worktreePath: item.worktreePath,
              cellId: item.cellId,
              sessionId: item.sessionId,
              lines,
              startCommand: '',
              cacheOnly: true,
            }).catch(() => null)
          )
        )
      ),
    Promise.resolve()
  );
};

export const __testSessionMapPreviewCache = {
  buildKey,
  normalizePreview,
  memoryCache,
};
