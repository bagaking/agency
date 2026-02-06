const fs = require('fs');
const path = require('path');

const CACHE_DIR = 'session-previews';
const CACHE_FILE = 'preview.json';

const normalizeFrame = (frame) => {
  if (!frame || typeof frame !== 'object') {
    return null;
  }
  const data = String(frame.data || '');
  if (!data) {
    return null;
  }
  const cols = Number.isFinite(frame.cols) ? frame.cols : null;
  const rows = Number.isFinite(frame.rows) ? frame.rows : null;
  const capturedAt = frame.capturedAt || new Date().toISOString();
  return { data, cols, rows, capturedAt };
};

const getCachePath = ({ worktreePath, sessionId }) => {
  if (!worktreePath || !sessionId) {
    return null;
  }
  return path.join(worktreePath, '.agency', CACHE_DIR, sessionId, CACHE_FILE);
};

const readPreviewCache = async ({ worktreePath, sessionId }) => {
  const cachePath = getCachePath({ worktreePath, sessionId });
  if (!cachePath || !fs.existsSync(cachePath)) {
    return null;
  }
  try {
    const raw = await fs.promises.readFile(cachePath, 'utf-8');
    const parsed = JSON.parse(raw || '{}');
    const frames = Array.isArray(parsed.frames) ? parsed.frames.map(normalizeFrame).filter(Boolean) : [];
    if (!frames.length) {
      return null;
    }
    const latest = frames[frames.length - 1];
    return { path: cachePath, frames, latest };
  } catch (_error) {
    return null;
  }
};

const writePreviewCache = async ({ worktreePath, sessionId, frame, maxFrames }) => {
  const cachePath = getCachePath({ worktreePath, sessionId });
  if (!cachePath) {
    return null;
  }
  const normalized = normalizeFrame(frame);
  if (!normalized) {
    return null;
  }
  const existing = await readPreviewCache({ worktreePath, sessionId });
  const frames = existing?.frames ? [...existing.frames] : [];
  frames.push(normalized);
  const max = Number.isFinite(maxFrames) ? Math.max(1, Math.floor(maxFrames)) : 3;
  const trimmed = frames.slice(-max);
  const payload = {
    version: 1,
    updatedAt: new Date().toISOString(),
    frames: trimmed,
  };
  await fs.promises.mkdir(path.dirname(cachePath), { recursive: true });
  await fs.promises.writeFile(cachePath, JSON.stringify(payload), 'utf-8');
  return { path: cachePath, frames: trimmed, latest: trimmed[trimmed.length - 1] };
};

module.exports = {
  readPreviewCache,
  writePreviewCache,
};
