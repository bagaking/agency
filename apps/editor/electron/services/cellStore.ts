const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const {
  getCellStoreDir,
  normalizeCellId,
  resolveScopedRepoRoot,
} = require('./scopedConfigPaths');

const fsp = fs.promises;

const CELL_RECORD_FILENAME = 'cell.yaml';
const CELL_SESSIONS_FILENAME = 'sessions.yaml';
const CELL_RECORD_VERSION = 2;
const CELL_ATTACHMENT_STATES = Object.freeze({
  attached: 'attached',
  project_root: 'project_root',
  detached: 'detached',
  missing: 'missing',
});
const CELL_RUNTIME_ROOT_PREFERENCES = Object.freeze({
  worktree: 'worktree',
  project_root: 'project_root',
});

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeTimestamp(value) {
  const normalized = normalizeText(value);
  return normalized || null;
}

function normalizeAttachmentState(value) {
  if (value === CELL_ATTACHMENT_STATES.project_root || value === 'branch_only') {
    return CELL_ATTACHMENT_STATES.project_root;
  }
  if (value === CELL_ATTACHMENT_STATES.detached) {
    return CELL_ATTACHMENT_STATES.detached;
  }
  if (value === CELL_ATTACHMENT_STATES.missing) {
    return CELL_ATTACHMENT_STATES.missing;
  }
  return CELL_ATTACHMENT_STATES.attached;
}

function normalizeRuntimeRootPreference(value) {
  if (value === CELL_RUNTIME_ROOT_PREFERENCES.project_root || value === 'branch_only') {
    return CELL_RUNTIME_ROOT_PREFERENCES.project_root;
  }
  return CELL_RUNTIME_ROOT_PREFERENCES.worktree;
}

function normalizeLifecycleState(value) {
  return normalizeText(value);
}

function normalizePathValue(value) {
  const normalized = normalizeText(value);
  return normalized ? path.resolve(normalized) : '';
}

function normalizeCellRecord(raw: any = {}, fallback: any = {}) {
  const id = normalizeCellId(raw.id || fallback.id || raw.name || fallback.name || '');
  if (!id) {
    throw new Error('Cell record id is required.');
  }
  const branch = normalizeText(raw.branch || fallback.branch || '');
  const worktreePath = normalizePathValue(raw.worktreePath || fallback.worktreePath);
  const lastKnownWorktreePath = normalizePathValue(
    raw.lastKnownWorktreePath ||
      fallback.lastKnownWorktreePath ||
      worktreePath ||
      fallback.worktreePath
  );
  const explicitAttachmentState = normalizeText(raw.attachmentState || fallback.attachmentState);
  const explicitRuntimeRootPreference = normalizeText(
    raw.preferredRuntimeRoot || fallback.preferredRuntimeRoot
  );
  return {
    version: CELL_RECORD_VERSION,
    id,
    name: normalizeText(raw.name || fallback.name || id) || id,
    branch,
    state: normalizeLifecycleState(raw.state || fallback.state),
    attachmentState: explicitAttachmentState
      ? normalizeAttachmentState(explicitAttachmentState)
      : worktreePath
        ? CELL_ATTACHMENT_STATES.attached
        : !lastKnownWorktreePath
          ? CELL_ATTACHMENT_STATES.project_root
        : lastKnownWorktreePath
          ? CELL_ATTACHMENT_STATES.detached
          : CELL_ATTACHMENT_STATES.detached,
    preferredRuntimeRoot: explicitRuntimeRootPreference
      ? normalizeRuntimeRootPreference(explicitRuntimeRootPreference)
      : explicitAttachmentState
        ? normalizeAttachmentState(explicitAttachmentState) === CELL_ATTACHMENT_STATES.project_root
          ? CELL_RUNTIME_ROOT_PREFERENCES.project_root
          : CELL_RUNTIME_ROOT_PREFERENCES.worktree
        : !lastKnownWorktreePath && !worktreePath
          ? CELL_RUNTIME_ROOT_PREFERENCES.project_root
          : CELL_RUNTIME_ROOT_PREFERENCES.worktree,
    worktreePath,
    lastKnownWorktreePath,
    createdAt:
      normalizeTimestamp(raw.createdAt) ||
      normalizeTimestamp(fallback.createdAt) ||
      new Date().toISOString(),
    updatedAt:
      normalizeTimestamp(raw.updatedAt) ||
      normalizeTimestamp(fallback.updatedAt) ||
      new Date().toISOString(),
    avatar: normalizeText(raw.avatar || fallback.avatar || ''),
  };
}

function getCellRecordPath(repoRoot, cellId) {
  const cellDir = getCellStoreDir(repoRoot, cellId);
  if (!cellDir) {
    return '';
  }
  return path.join(cellDir, CELL_RECORD_FILENAME);
}

function getCellSessionsPath(repoRoot, cellId) {
  const cellDir = getCellStoreDir(repoRoot, cellId);
  if (!cellDir) {
    return '';
  }
  return path.join(cellDir, CELL_SESSIONS_FILENAME);
}

async function readYamlFile(filePath, fallback = {}) {
  if (!filePath || !fs.existsSync(filePath)) {
    return fallback;
  }
  const raw = await fsp.readFile(filePath, 'utf-8');
  return yaml.load(raw) || fallback;
}

async function writeYamlFile(filePath, value) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  const content = yaml.dump(value, { lineWidth: 120 });
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  await fsp.writeFile(tempPath, content, 'utf-8');
  await fsp.rename(tempPath, filePath);
}

async function readCellRecord(repoRoot, cellId) {
  const recordPath = getCellRecordPath(repoRoot, cellId);
  if (!recordPath || !fs.existsSync(recordPath)) {
    return null;
  }
  const parsed = await readYamlFile(recordPath);
  return normalizeCellRecord(parsed, { id: cellId });
}

async function writeCellRecord(repoRoot, record) {
  const normalized = normalizeCellRecord(record);
  const recordPath = getCellRecordPath(repoRoot, normalized.id);
  await writeYamlFile(recordPath, normalized);
  return {
    ...normalized,
    lifecycleFile: recordPath,
  };
}

async function listCellRecords(repoRoot) {
  const cellStoreDir = getCellStoreDir(repoRoot, '__placeholder__').replace(
    /[\\/]__placeholder__$/,
    ''
  );
  if (!cellStoreDir || !fs.existsSync(cellStoreDir)) {
    return [];
  }
  const entries = await fsp.readdir(cellStoreDir, { withFileTypes: true });
  const records = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const record = await readCellRecord(repoRoot, entry.name);
    if (record) {
      records.push(record);
    }
  }
  return records;
}

async function deleteCellRecord(repoRoot, cellId) {
  const cellDir = getCellStoreDir(repoRoot, cellId);
  if (!cellDir) {
    return false;
  }
  await fsp.rm(cellDir, { recursive: true, force: true });
  return true;
}

async function resolveCellStoreContext(params = {}) {
  const repoRoot = await resolveScopedRepoRoot(params || {});
  return {
    repoRoot,
    cellStoreDir: getCellStoreDir(repoRoot, '__placeholder__').replace(/[\\/]__placeholder__$/, ''),
  };
}

module.exports = {
  CELL_ATTACHMENT_STATES,
  CELL_RUNTIME_ROOT_PREFERENCES,
  CELL_RECORD_FILENAME,
  CELL_SESSIONS_FILENAME,
  CELL_RECORD_VERSION,
  normalizeCellRecord,
  getCellRecordPath,
  getCellSessionsPath,
  readYamlFile,
  readCellRecord,
  writeYamlFile,
  writeCellRecord,
  listCellRecords,
  deleteCellRecord,
  resolveCellStoreContext,
};

export {};
