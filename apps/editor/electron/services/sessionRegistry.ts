const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const { listCellRecords } = require('./cellStore');
const { getCellStoreDir, resolveScopedRepoRoot } = require('./scopedConfigPaths');
const { normalizeSessionRegistry } = require('./sessionTopology');

const fsp = fs.promises;

const AGENCY_DIR = '.agency';
const SESSION_PREFIX = 'sessions-';
const SESSION_EXT = '.yaml';
const CELL_SESSION_FILENAME = 'sessions.yaml';

function normalizeText(value) {
  return String(value || '').trim();
}

function getWorktreeName(worktreePath) {
  return path.basename(worktreePath);
}

function getLegacySessionRegistryPath(worktreePath) {
  const worktreeName = getWorktreeName(worktreePath);
  return path.join(worktreePath, AGENCY_DIR, `${SESSION_PREFIX}${worktreeName}${SESSION_EXT}`);
}

function getCellSessionRegistryPath(repoRoot, cellId) {
  const cellDir = getCellStoreDir(repoRoot, cellId);
  if (!cellDir) {
    return '';
  }
  return path.join(cellDir, CELL_SESSION_FILENAME);
}

function normalizeRegistry(registry) {
  return normalizeSessionRegistry(registry || {}).registry;
}

async function readRegistryFile(filePath) {
  const raw = await fsp.readFile(filePath, 'utf-8');
  const parsed = (yaml.load(raw) || {}) || {};
  return normalizeRegistry({
    version: parsed.version || 1,
    sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
  });
}

async function writeRegistryFile(filePath, registry) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  const normalized = normalizeRegistry(registry);
  const content = yaml.dump(normalized, { lineWidth: 120 });
  const tempSuffix = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const tempPath = `${filePath}.tmp-${tempSuffix}`;
  await fsp.writeFile(tempPath, content, 'utf-8');
  await fsp.rename(tempPath, filePath);
  return normalized;
}

async function resolveCellIdFromWorktree(repoRoot, worktreePath) {
  const normalizedWorktreePath = normalizeText(worktreePath);
  if (!repoRoot || !normalizedWorktreePath) {
    return '';
  }
  const records = await listCellRecords(repoRoot);
  const match = records.find(
    (record) =>
      normalizeText(record.worktreePath) === normalizedWorktreePath ||
      normalizeText(record.lastKnownWorktreePath) === normalizedWorktreePath
  );
  return normalizeText(match?.id);
}

async function resolveRegistryContext(input: any = {}) {
  if (typeof input === 'string') {
    return {
      repoRoot: '',
      cellId: '',
      worktreePath: normalizeText(input),
      legacyOnly: true,
    };
  }
  const rootPath = normalizeText(input?.rootPath || input?.projectRoot);
  const worktreePath = normalizeText(input?.worktreePath);
  const repoRoot = await resolveScopedRepoRoot({ rootPath, worktreePath });
  const cellId =
    normalizeText(input?.cellId) || (repoRoot && worktreePath ? await resolveCellIdFromWorktree(repoRoot, worktreePath) : '');
  return {
    repoRoot,
    cellId,
    worktreePath,
    legacyOnly: false,
  };
}

function buildEmptyRegistry() {
  return normalizeRegistry({
    version: 1,
    sessions: [],
  });
}

async function readRegistry(input = {}) {
  const context = await resolveRegistryContext(input);
  if (context.legacyOnly) {
    const legacyPath = getLegacySessionRegistryPath(context.worktreePath);
    if (!fs.existsSync(legacyPath)) {
      return buildEmptyRegistry();
    }
    return readRegistryFile(legacyPath);
  }

  if (context.repoRoot && context.cellId) {
    const repoPath = getCellSessionRegistryPath(context.repoRoot, context.cellId);
    if (repoPath && fs.existsSync(repoPath)) {
      return readRegistryFile(repoPath);
    }
    if (context.worktreePath) {
      const legacyPath = getLegacySessionRegistryPath(context.worktreePath);
      if (fs.existsSync(legacyPath)) {
        const imported = await readRegistryFile(legacyPath);
        await writeRegistryFile(repoPath, imported);
        return imported;
      }
    }
    return buildEmptyRegistry();
  }

  if (context.worktreePath) {
    const legacyPath = getLegacySessionRegistryPath(context.worktreePath);
    if (!fs.existsSync(legacyPath)) {
      return buildEmptyRegistry();
    }
    return readRegistryFile(legacyPath);
  }

  return buildEmptyRegistry();
}

async function writeRegistry(input = {}, registry) {
  const context = await resolveRegistryContext(input);
  if (context.legacyOnly) {
    const legacyPath = getLegacySessionRegistryPath(context.worktreePath);
    return writeRegistryFile(legacyPath, registry);
  }
  if (context.repoRoot && context.cellId) {
    const repoPath = getCellSessionRegistryPath(context.repoRoot, context.cellId);
    return writeRegistryFile(repoPath, registry);
  }
  if (context.worktreePath) {
    const legacyPath = getLegacySessionRegistryPath(context.worktreePath);
    return writeRegistryFile(legacyPath, registry);
  }
  throw new Error('Unable to resolve session registry path.');
}

function upsertSession(registry, session) {
  const next = { ...registry };
  const sessions = Array.isArray(next.sessions) ? [...next.sessions] : [];
  const index = sessions.findIndex((item) => item.id === session.id);
  if (index >= 0) {
    sessions[index] = { ...sessions[index], ...session };
  } else {
    sessions.push(session);
  }
  next.sessions = sessions;
  return next;
}

function removeSession(registry, sessionId) {
  const next = { ...registry };
  next.sessions = (next.sessions || []).filter((item) => item.id !== sessionId);
  return next;
}

export {
  CELL_SESSION_FILENAME,
  getLegacySessionRegistryPath,
  getCellSessionRegistryPath,
  readRegistry,
  writeRegistry,
  upsertSession,
  removeSession,
};
