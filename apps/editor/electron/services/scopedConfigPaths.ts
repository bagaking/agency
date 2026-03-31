const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const { resolveProjectRoot } = require('./projectRoot');

const PROJECT_AGENCY_DIR = '.agency';
const CELL_STORE_DIR = 'cells';

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeCellId(value) {
  return normalizeText(value).replace(/[^a-zA-Z0-9-_]/g, '-');
}

function getRepoAgencyDir(repoRoot) {
  const normalizedRepoRoot = normalizeText(repoRoot);
  if (!normalizedRepoRoot) {
    return '';
  }
  return path.join(normalizedRepoRoot, PROJECT_AGENCY_DIR);
}

function getCellStoreDir(repoRoot, cellId) {
  const normalizedCellId = normalizeCellId(cellId);
  if (!normalizedCellId) {
    return '';
  }
  const agencyDir = getRepoAgencyDir(repoRoot);
  if (!agencyDir) {
    return '';
  }
  return path.join(agencyDir, CELL_STORE_DIR, normalizedCellId);
}

async function resolveScopedRepoRoot({ rootPath = '', worktreePath = '' } = {}) {
  return resolveProjectRoot({ rootPath: rootPath || worktreePath });
}

async function resolveCellIdForWorktree(repoRoot, worktreePath) {
  const normalizedRepoRoot = normalizeText(repoRoot);
  const normalizedWorktreePath = normalizeText(worktreePath);
  if (!normalizedRepoRoot || !normalizedWorktreePath) {
    return '';
  }
  const cellsRoot = path.join(getRepoAgencyDir(normalizedRepoRoot), CELL_STORE_DIR);
  if (!fs.existsSync(cellsRoot)) {
    return '';
  }
  const entries = await fs.promises.readdir(cellsRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const recordPath = path.join(cellsRoot, entry.name, 'cell.yaml');
    if (!fs.existsSync(recordPath)) {
      continue;
    }
    try {
      const raw = await fs.promises.readFile(recordPath, 'utf-8');
      const parsed = yaml.load(raw) || {};
      const recordedWorktreePath = normalizeText(parsed?.worktreePath || parsed?.lastKnownWorktreePath);
      if (recordedWorktreePath && path.resolve(recordedWorktreePath) === path.resolve(normalizedWorktreePath)) {
        return normalizeCellId(parsed?.id || entry.name);
      }
    } catch (_error) {
      // Ignore malformed records during path resolution.
    }
  }
  return '';
}

async function resolveProjectConfigPath({
  rootPath = '',
  worktreePath = '',
  filenames = [],
} = {}) {
  const repoRoot = await resolveScopedRepoRoot({ rootPath, worktreePath });
  if (!repoRoot) {
    return { repoRoot: '', agencyDir: '', filePath: '' };
  }
  const agencyDir = getRepoAgencyDir(repoRoot);
  const orderedFilenames = Array.isArray(filenames)
    ? filenames.map((entry) => normalizeText(entry)).filter(Boolean)
    : [];
  for (const filename of orderedFilenames) {
    const candidate = path.join(agencyDir, filename);
    if (fs.existsSync(candidate)) {
      return {
        repoRoot,
        agencyDir,
        filePath: candidate,
      };
    }
  }
  return {
    repoRoot,
    agencyDir,
    filePath: orderedFilenames[0] ? path.join(agencyDir, orderedFilenames[0]) : '',
  };
}

async function resolveAgentConfigPath({
  rootPath = '',
  worktreePath = '',
  cellId = '',
  filename = '',
} = {}) {
  const repoRoot = await resolveScopedRepoRoot({ rootPath, worktreePath });
  const normalizedCellId =
    normalizeCellId(cellId) || (repoRoot && worktreePath ? await resolveCellIdForWorktree(repoRoot, worktreePath) : '');
  const normalizedFilename = normalizeText(filename);
  if (!repoRoot || !normalizedCellId || !normalizedFilename) {
    return {
      repoRoot,
      cellDir: '',
      filePath: '',
    };
  }
  const cellDir = getCellStoreDir(repoRoot, normalizedCellId);
  return {
    repoRoot,
    cellDir,
    filePath: path.join(cellDir, normalizedFilename),
  };
}

function resolveLegacyAgentConfigPath(worktreePath, prefix, ext = '.yaml') {
  const normalizedWorktreePath = normalizeText(worktreePath);
  const normalizedPrefix = normalizeText(prefix);
  if (!normalizedWorktreePath || !normalizedPrefix) {
    return '';
  }
  const worktreeName = path.basename(normalizedWorktreePath);
  return path.join(
    normalizedWorktreePath,
    PROJECT_AGENCY_DIR,
    `${normalizedPrefix}${worktreeName}${normalizeText(ext) || '.yaml'}`
  );
}

module.exports = {
  CELL_STORE_DIR,
  PROJECT_AGENCY_DIR,
  normalizeCellId,
  getRepoAgencyDir,
  getCellStoreDir,
  resolveScopedRepoRoot,
  resolveCellIdForWorktree,
  resolveProjectConfigPath,
  resolveAgentConfigPath,
  resolveLegacyAgentConfigPath,
};

export {};
