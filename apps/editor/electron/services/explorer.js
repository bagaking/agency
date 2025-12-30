const { shell } = require('electron');
const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const { getRepoRoot } = require('./git');
const { listCells } = require('./cells');

const execFileAsync = promisify(execFile);
const fsp = fs.promises;

const STATUS_PRIORITY = [
  'conflict',
  'deleted',
  'added',
  'modified',
  'renamed',
  'copied',
  'untracked',
  'ignored',
];

const STATUS_LABELS = {
  conflict: 'Conflict',
  deleted: 'Deleted',
  added: 'Added',
  modified: 'Modified',
  renamed: 'Renamed',
  copied: 'Copied',
  untracked: 'Untracked',
  ignored: 'Ignored',
};

const ENTRY_TYPES = {
  file: 'file',
  dir: 'dir',
};

const DEFAULT_EXCLUDES = new Set(['.git']);
const MAX_PREVIEW_BYTES = 200 * 1024;

function normalizeRelPath(value) {
  if (!value) {
    return '';
  }
  return value.replace(/\\/g, '/').replace(/^\.?\//, '').replace(/\/+$/, '');
}

function resolveSafePath(rootPath, relativePath) {
  const normalized = normalizeRelPath(relativePath);
  const absolute = path.resolve(rootPath, normalized);
  const rel = path.relative(rootPath, absolute);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error('Path escapes repository root.');
  }
  return absolute;
}

async function resolveExplorerRoot(rootPath) {
  if (!rootPath) {
    const repoRoot = await getRepoRoot();
    return { repoRoot, rootPath: repoRoot };
  }
  try {
    const repoRoot = await getRepoRoot(rootPath);
    return { repoRoot, rootPath };
  } catch (error) {
    const repoRoot = await getRepoRoot();
    return { repoRoot, rootPath: repoRoot };
  }
}

function sortEntries(a, b) {
  if (a.type !== b.type) {
    return a.type === ENTRY_TYPES.dir ? -1 : 1;
  }
  return a.name.localeCompare(b.name);
}

async function listDirectory({ rootPath, relativePath = '', showHidden = true }) {
  const resolved = await resolveExplorerRoot(rootPath);
  const targetPath = resolveSafePath(resolved.rootPath, relativePath);
  const stats = await fsp.stat(targetPath);
  if (!stats.isDirectory()) {
    throw new Error('Target path is not a directory.');
  }
  const entries = await fsp.readdir(targetPath, { withFileTypes: true });
  const items = entries
    .filter((entry) => {
      if (DEFAULT_EXCLUDES.has(entry.name)) {
        return false;
      }
      if (!showHidden && entry.name.startsWith('.')) {
        return false;
      }
      return true;
    })
    .map((entry) => {
      const entryPath = normalizeRelPath(path.join(relativePath, entry.name));
      return {
        path: entryPath,
        name: entry.name,
        type: entry.isDirectory() ? ENTRY_TYPES.dir : ENTRY_TYPES.file,
      };
    })
    .sort(sortEntries);
  return { path: normalizeRelPath(relativePath), entries: items };
}

async function runGitRaw(args, cwd) {
  const result = await execFileAsync('git', args, { cwd });
  return result.stdout || '';
}

function statusKindFromCode(code) {
  if (!code) {
    return 'modified';
  }
  if (code === '??') {
    return 'untracked';
  }
  if (code === '!!') {
    return 'ignored';
  }
  if (code.includes('U')) {
    return 'conflict';
  }
  if (code.includes('D')) {
    return 'deleted';
  }
  if (code.includes('A')) {
    return 'added';
  }
  if (code.includes('R')) {
    return 'renamed';
  }
  if (code.includes('C')) {
    return 'copied';
  }
  if (code.includes('M')) {
    return 'modified';
  }
  return 'modified';
}

function parsePorcelainZ(output) {
  if (!output) {
    return [];
  }
  const tokens = output.split('\0');
  const entries = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (!token) {
      continue;
    }
    const status = token.slice(0, 2);
    const pathPart = token.slice(3);
    let filePath = pathPart;
    if (status.includes('R') || status.includes('C')) {
      const nextPath = tokens[i + 1];
      if (nextPath) {
        filePath = nextPath;
        i += 1;
      }
    }
    if (!filePath) {
      continue;
    }
    entries.push({
      path: normalizeRelPath(filePath),
      status,
      kind: statusKindFromCode(status),
    });
  }
  return entries;
}

function parseNumstatZ(output) {
  if (!output) {
    return [];
  }
  const tokens = output.split('\0');
  const entries = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (!token) {
      continue;
    }
    const parts = token.split('\t');
    if (parts.length < 3) {
      continue;
    }
    const [rawAdded, rawDeleted, pathPart] = parts;
    let filePath = pathPart;
    if (tokens[i + 1] && !tokens[i + 1].includes('\t')) {
      filePath = tokens[i + 1];
      i += 1;
    }
    const added = rawAdded === '-' ? 0 : Number(rawAdded || 0);
    const deleted = rawDeleted === '-' ? 0 : Number(rawDeleted || 0);
    if (!filePath) {
      continue;
    }
    entries.push({
      path: normalizeRelPath(filePath),
      added,
      deleted,
    });
  }
  return entries;
}

function mergeCount(map, entry) {
  const current = map.get(entry.path) || { added: 0, deleted: 0 };
  map.set(entry.path, {
    added: current.added + (entry.added || 0),
    deleted: current.deleted + (entry.deleted || 0),
  });
}

async function collectWorktreeStatus(worktreePath) {
  const statusOutput = await runGitRaw(['status', '--porcelain', '-z', '--ignored=matching'], worktreePath);
  const statusEntries = parsePorcelainZ(statusOutput);

  const diffOutput = await runGitRaw(['diff', '--numstat', '-z'], worktreePath);
  const cachedOutput = await runGitRaw(['diff', '--cached', '--numstat', '-z'], worktreePath);
  const diffEntries = [...parseNumstatZ(diffOutput), ...parseNumstatZ(cachedOutput)];
  const counts = new Map();
  diffEntries.forEach((entry) => mergeCount(counts, entry));

  const statusByPath = new Map();
  statusEntries.forEach((entry) => {
    statusByPath.set(entry.path, entry);
  });

  counts.forEach((value, filePath) => {
    if (!statusByPath.has(filePath)) {
      statusByPath.set(filePath, {
        path: filePath,
        status: 'M ',
        kind: 'modified',
      });
    }
  });

  return { statusByPath, countsByPath: counts };
}

function pickPrimaryStatus(statusCounts) {
  for (const status of STATUS_PRIORITY) {
    if (statusCounts[status]) {
      return status;
    }
  }
  return 'modified';
}

function ensureStatusCounts(entry) {
  return entry.statusCounts || {};
}

function bumpStatusCount(entry, status) {
  const counts = ensureStatusCounts(entry);
  counts[status] = (counts[status] || 0) + 1;
  entry.statusCounts = counts;
}

function applyFileEntry(map, filePath, cell, statusInfo, counts) {
  const entry = map.get(filePath) || {
    path: filePath,
    status: 'modified',
    statusCounts: {},
    added: 0,
    deleted: 0,
    cells: {},
  };
  const added = counts?.added || 0;
  const deleted = counts?.deleted || 0;
  const status = statusInfo?.kind || 'modified';
  entry.cells[cell.id] = {
    id: cell.id,
    name: cell.name,
    status,
    added,
    deleted,
  };
  entry.added += added;
  entry.deleted += deleted;
  bumpStatusCount(entry, status);
  entry.status = pickPrimaryStatus(entry.statusCounts);
  map.set(filePath, entry);
}

function bumpFolder(folder, fileEntry) {
  folder.added += fileEntry.added || 0;
  folder.deleted += fileEntry.deleted || 0;
  Object.entries(fileEntry.statusCounts || {}).forEach(([status, count]) => {
    folder.statusCounts[status] = (folder.statusCounts[status] || 0) + count;
  });
  Object.values(fileEntry.cells || {}).forEach((cell) => {
    const current = folder.cells[cell.id] || {
      id: cell.id,
      name: cell.name,
      added: 0,
      deleted: 0,
      statusCounts: {},
    };
    current.added += cell.added || 0;
    current.deleted += cell.deleted || 0;
    current.statusCounts[cell.status] = (current.statusCounts[cell.status] || 0) + 1;
    folder.cells[cell.id] = current;
  });
  folder.status = pickPrimaryStatus(folder.statusCounts);
}

function buildFolderSummaries(fileMap) {
  const folderMap = new Map();
  const ensureFolder = (folderPath) => {
    if (!folderMap.has(folderPath)) {
      folderMap.set(folderPath, {
        path: folderPath,
        status: 'modified',
        statusCounts: {},
        added: 0,
        deleted: 0,
        cells: {},
      });
    }
    return folderMap.get(folderPath);
  };

  fileMap.forEach((entry, filePath) => {
    const parts = filePath.split('/').filter(Boolean);
    let currentPath = '';
    ensureFolder(currentPath);
    for (let i = 0; i < parts.length - 1; i += 1) {
      currentPath = normalizeRelPath(path.posix.join(currentPath, parts[i]));
      ensureFolder(currentPath);
    }
    const folderPaths = [];
    currentPath = '';
    folderPaths.push(currentPath);
    for (let i = 0; i < parts.length - 1; i += 1) {
      currentPath = normalizeRelPath(path.posix.join(currentPath, parts[i]));
      folderPaths.push(currentPath);
    }
    folderPaths.forEach((folderPath) => {
      const folder = ensureFolder(folderPath);
      bumpFolder(folder, entry);
    });
  });

  return folderMap;
}

async function getExplorerStatus() {
  const repoRoot = await getRepoRoot();
  const cells = await listCells();
  const fileMap = new Map();

  for (const cell of cells) {
    if (!cell.worktreePath) {
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    const { statusByPath, countsByPath } = await collectWorktreeStatus(cell.worktreePath);
    statusByPath.forEach((statusInfo, filePath) => {
      const counts = countsByPath.get(filePath);
      applyFileEntry(fileMap, filePath, cell, statusInfo, counts);
    });
  }

  const folderMap = buildFolderSummaries(fileMap);

  const files = {};
  fileMap.forEach((value, key) => {
    files[key] = value;
  });

  const folders = {};
  folderMap.forEach((value, key) => {
    folders[key] = value;
  });

  return {
    repoRoot,
    rootName: path.basename(repoRoot),
    files,
    folders,
    cells: cells.map((cell) => ({
      id: cell.id,
      name: cell.name,
      worktreePath: cell.worktreePath,
    })),
    statusLabels: STATUS_LABELS,
  };
}

async function searchFiles({ rootPath, query, limit = 1000 }) {
  if (!query) {
    return { matches: [], truncated: false };
  }
  const resolved = await resolveExplorerRoot(rootPath);
  const lowerQuery = query.toLowerCase();
  const tracked = await runGitRaw(['ls-files', '-z'], resolved.rootPath);
  const untracked = await runGitRaw(['ls-files', '--others', '--exclude-standard', '-z'], resolved.rootPath);
  const tokens = `${tracked}\0${untracked}`.split('\0').filter(Boolean);
  const matches = [];
  for (const token of tokens) {
    const normalized = normalizeRelPath(token);
    if (normalized.toLowerCase().includes(lowerQuery)) {
      matches.push(normalized);
      if (matches.length >= limit) {
        return { matches, truncated: true };
      }
    }
  }
  return { matches, truncated: false };
}

async function createEntry({ rootPath, parentPath, name, type }) {
  if (!name) {
    throw new Error('Name is required.');
  }
  const resolved = await resolveExplorerRoot(rootPath);
  const relativeParent = normalizeRelPath(parentPath);
  const targetRel = normalizeRelPath(path.join(relativeParent, name));
  const targetPath = resolveSafePath(resolved.rootPath, targetRel);
  if (fs.existsSync(targetPath)) {
    throw new Error('Target already exists.');
  }
  await fsp.mkdir(path.dirname(targetPath), { recursive: true });
  if (type === ENTRY_TYPES.dir) {
    await fsp.mkdir(targetPath, { recursive: true });
  } else {
    await fsp.writeFile(targetPath, '', 'utf-8');
  }
  return { path: targetRel };
}

async function renameEntry({ rootPath, sourcePath, targetPath }) {
  const resolved = await resolveExplorerRoot(rootPath);
  const fromPath = resolveSafePath(resolved.rootPath, sourcePath);
  const toPath = resolveSafePath(resolved.rootPath, targetPath);
  if (!fs.existsSync(fromPath)) {
    throw new Error('Source does not exist.');
  }
  if (fs.existsSync(toPath)) {
    throw new Error('Target already exists.');
  }
  await fsp.mkdir(path.dirname(toPath), { recursive: true });
  await fsp.rename(fromPath, toPath);
  return { path: normalizeRelPath(targetPath) };
}

async function deleteEntry({ rootPath, targetPath }) {
  const resolved = await resolveExplorerRoot(rootPath);
  const absolute = resolveSafePath(resolved.rootPath, targetPath);
  if (!fs.existsSync(absolute)) {
    return { path: normalizeRelPath(targetPath) };
  }
  await fsp.rm(absolute, { recursive: true, force: true });
  return { path: normalizeRelPath(targetPath) };
}

async function copyEntry({ rootPath, sourcePath, targetPath }) {
  const resolved = await resolveExplorerRoot(rootPath);
  const fromPath = resolveSafePath(resolved.rootPath, sourcePath);
  const toPath = resolveSafePath(resolved.rootPath, targetPath);
  if (!fs.existsSync(fromPath)) {
    throw new Error('Source does not exist.');
  }
  if (fs.existsSync(toPath)) {
    throw new Error('Target already exists.');
  }
  await fsp.mkdir(path.dirname(toPath), { recursive: true });
  await fsp.cp(fromPath, toPath, { recursive: true });
  return { path: normalizeRelPath(targetPath) };
}

async function revealEntry({ rootPath, targetPath }) {
  const resolved = await resolveExplorerRoot(rootPath);
  const absolute = resolveSafePath(resolved.rootPath, targetPath);
  shell.showItemInFolder(absolute);
  return { path: normalizeRelPath(targetPath) };
}

async function readEntry({ rootPath, targetPath }) {
  if (!targetPath) {
    throw new Error('targetPath is required.');
  }
  const resolved = await resolveExplorerRoot(rootPath);
  const absolute = resolveSafePath(resolved.rootPath, targetPath);
  const stats = await fsp.stat(absolute);
  if (!stats.isFile()) {
    throw new Error('Target is not a file.');
  }
  const size = stats.size || 0;
  const length = Math.min(size, MAX_PREVIEW_BYTES);
  const handle = await fsp.open(absolute, 'r');
  const buffer = Buffer.alloc(length);
  await handle.read(buffer, 0, length, 0);
  await handle.close();
  const isBinary = buffer.includes(0);
  return {
    path: normalizeRelPath(targetPath),
    size,
    truncated: size > MAX_PREVIEW_BYTES,
    binary: isBinary,
    content: isBinary ? '' : buffer.toString('utf-8'),
  };
}

module.exports = {
  listDirectory,
  getExplorerStatus,
  searchFiles,
  createEntry,
  renameEntry,
  deleteEntry,
  copyEntry,
  revealEntry,
  readEntry,
  STATUS_LABELS,
};
