const { app } = require('electron');
const fs = require('fs');
const path = require('path');

const { resolveProjectRoot } = require('./projectRoot');

const fsp = fs.promises;
const MAX_RUNS = 20;
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;
const RUN_FILE_RE = /^runtime-(\d{8}-\d{6})(?:-chunk(\d+))?\.log$/;

const state = {
  initialized: false,
  runId: null,
  logDir: null,
  historyDir: null,
  stream: null,
  fileIndex: 0,
  bytesWritten: 0,
  maxBytes: DEFAULT_MAX_BYTES,
};

function pad2(value) {
  return String(value).padStart(2, '0');
}

function formatRunId(date = new Date()) {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const hours = pad2(date.getHours());
  const minutes = pad2(date.getMinutes());
  const seconds = pad2(date.getSeconds());
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

function formatTimestamp(date = new Date()) {
  return date.toISOString();
}

function resolveMaxBytes() {
  const raw = process.env.AGENCY_RUNTIME_LOG_MAX_BYTES;
  if (!raw) {
    return DEFAULT_MAX_BYTES;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_BYTES;
}

function buildFileName(runId, fileIndex) {
  if (!fileIndex) {
    return `runtime-${runId}.log`;
  }
  return `runtime-${runId}-chunk${fileIndex}.log`;
}

function buildFilePath(runId, fileIndex) {
  return path.join(state.logDir, buildFileName(runId, fileIndex));
}

function safeStringify(value) {
  try {
    return JSON.stringify(value);
  } catch (error) {
    return JSON.stringify({ error: 'unserializable meta' });
  }
}

async function getRepoRootSafe() {
  try {
    const resolved = await resolveProjectRoot();
    if (resolved) {
      return resolved;
    }
  } catch (error) {
    // fall through to userData
  }
  return app.getPath('userData');
}

async function rotateOldRuns() {
  const entries = await fsp.readdir(state.logDir, { withFileTypes: true });
  const runs = new Map();
  entries.forEach((entry) => {
    if (!entry.isFile()) {
      return;
    }
    const match = entry.name.match(RUN_FILE_RE);
    if (!match) {
      return;
    }
    const runId = match[1];
    const files = runs.get(runId) || [];
    files.push(entry.name);
    runs.set(runId, files);
  });

  const runIds = Array.from(runs.keys()).sort().reverse();
  const keep = new Set(runIds.slice(0, MAX_RUNS));
  if (state.runId && !keep.has(state.runId)) {
    keep.add(state.runId);
    if (keep.size > MAX_RUNS) {
      for (let index = runIds.length - 1; index >= 0; index -= 1) {
        const candidate = runIds[index];
        if (candidate && candidate !== state.runId && keep.has(candidate)) {
          keep.delete(candidate);
          break;
        }
      }
    }
  }
  const toArchive = runIds.filter((runId) => !keep.has(runId));

  for (const runId of toArchive) {
    const files = runs.get(runId) || [];
    for (const fileName of files) {
      const source = path.join(state.logDir, fileName);
      let target = path.join(state.historyDir, fileName);
      if (fs.existsSync(target)) {
        const stamp = Date.now();
        const ext = path.extname(fileName);
        const base = path.basename(fileName, ext);
        target = path.join(state.historyDir, `${base}-${stamp}${ext}`);
      }
      await fsp.rename(source, target);
    }
  }
}

async function openStream() {
  const filePath = buildFilePath(state.runId, state.fileIndex);
  state.stream = fs.createWriteStream(filePath, { flags: 'a' });
  try {
    const stats = await fsp.stat(filePath);
    state.bytesWritten = stats.size;
  } catch (error) {
    state.bytesWritten = 0;
  }
}

async function rotateChunk() {
  if (state.stream) {
    state.stream.end();
  }
  state.fileIndex += 1;
  state.bytesWritten = 0;
  await openStream();
}

async function initRuntimeLogger({ repoRoot } = {}) {
  if (state.initialized) {
    return state;
  }
  try {
    const root = repoRoot || (await getRepoRootSafe());
    state.logDir = path.join(root, 'logs', 'runtime');
    state.historyDir = path.join(state.logDir, 'history');
    state.maxBytes = resolveMaxBytes();

    await fsp.mkdir(state.logDir, { recursive: true });
    await fsp.mkdir(state.historyDir, { recursive: true });

    state.runId = formatRunId();
    state.fileIndex = 0;
    await openStream();
    await rotateOldRuns();
    state.initialized = true;

    await logRuntime('info', 'runtime log started', {
      runId: state.runId,
      pid: process.pid,
      logDir: state.logDir,
    });
  } catch (error) {
    console.warn('runtime log init failed', error);
    state.initialized = false;
  }

  return state;
}

async function logRuntime(level, message, meta = {}) {
  if (!state.initialized || !state.stream) {
    return;
  }
  try {
    const line = `[${formatTimestamp()}] [${level}] ${message}${
      meta && Object.keys(meta).length ? ` ${safeStringify(meta)}` : ''
    }\n`;
    const bytes = Buffer.byteLength(line);
    if (state.bytesWritten + bytes > state.maxBytes) {
      await rotateChunk();
    }
    state.bytesWritten += bytes;
    state.stream.write(line);
  } catch (error) {
    // Logging must never crash the main process.
    console.warn('runtime log write failed', error);
  }
}

async function closeRuntimeLogger() {
  if (state.stream) {
    state.stream.end();
  }
  state.stream = null;
  state.initialized = false;
}

function getRuntimeLogInfo() {
  if (!state.initialized) {
    return null;
  }
  return {
    runId: state.runId,
    logDir: state.logDir,
    fileIndex: state.fileIndex,
  };
}

module.exports = {
  initRuntimeLogger,
  logRuntime,
  closeRuntimeLogger,
  getRuntimeLogInfo,
};
