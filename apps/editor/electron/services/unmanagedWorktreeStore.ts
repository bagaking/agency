// @ts-nocheck
const fs = require('fs');
const os = require('os');
const path = require('path');

const fsp = fs.promises;

const STORE_VERSION = 1;
const STORE_FILE = 'unmanaged-worktrees.json';

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizePathValue(value) {
  const normalized = normalizeText(value);
  return normalized ? path.resolve(normalized) : '';
}

function normalizePathList(values) {
  const seen = new Set();
  const normalized = [];
  for (const value of Array.isArray(values) ? values : []) {
    const entry = normalizePathValue(value);
    if (!entry || seen.has(entry)) {
      continue;
    }
    seen.add(entry);
    normalized.push(entry);
  }
  return normalized;
}

function getStorePath() {
  const explicitDir = normalizeText(process.env.AGENCY_UNMANAGED_WORKTREE_STORE_DIR);
  const baseDir = explicitDir || path.join(os.homedir(), '.agency-editor');
  return path.join(baseDir, STORE_FILE);
}

function normalizeRepoKey(repoRoot) {
  return normalizePathValue(repoRoot);
}

function normalizeStore(raw = {}) {
  const repositories = {};
  const source = raw && typeof raw === 'object' ? raw : {};
  const repoEntries =
    source.repositories && typeof source.repositories === 'object'
      ? source.repositories
      : {};
  for (const [repoRoot, value] of Object.entries(repoEntries)) {
    const repoKey = normalizeRepoKey(repoRoot);
    if (!repoKey) {
      continue;
    }
    const ignoredWorktreePaths = normalizePathList(value?.ignoredWorktreePaths);
    if (!ignoredWorktreePaths.length) {
      continue;
    }
    repositories[repoKey] = {
      ignoredWorktreePaths,
    };
  }
  return {
    version: STORE_VERSION,
    repositories,
  };
}

async function readStore() {
  const storePath = getStorePath();
  if (!fs.existsSync(storePath)) {
    return normalizeStore({});
  }
  try {
    const raw = await fsp.readFile(storePath, 'utf8');
    return normalizeStore(JSON.parse(raw));
  } catch {
    return normalizeStore({});
  }
}

async function writeStore(store) {
  const storePath = getStorePath();
  const dirPath = path.dirname(storePath);
  await fsp.mkdir(dirPath, { recursive: true });
  const normalized = normalizeStore(store);
  const tempPath = `${storePath}.tmp-${process.pid}-${Date.now()}`;
  await fsp.writeFile(tempPath, JSON.stringify(normalized, null, 2), 'utf8');
  await fsp.rename(tempPath, storePath);
  return normalized;
}

function readRepoIgnoredPaths(store, repoRoot) {
  const repoKey = normalizeRepoKey(repoRoot);
  if (!repoKey) {
    return [];
  }
  return normalizePathList(store?.repositories?.[repoKey]?.ignoredWorktreePaths);
}

function writeRepoIgnoredPaths(store, repoRoot, ignoredPaths) {
  const repoKey = normalizeRepoKey(repoRoot);
  if (!repoKey) {
    return store;
  }
  const normalizedPaths = normalizePathList(ignoredPaths);
  const nextStore = normalizeStore(store);
  if (!normalizedPaths.length) {
    delete nextStore.repositories[repoKey];
    return nextStore;
  }
  nextStore.repositories[repoKey] = {
    ignoredWorktreePaths: normalizedPaths,
  };
  return nextStore;
}

async function listIgnoredWorktreePaths(repoRoot) {
  const store = await readStore();
  return readRepoIgnoredPaths(store, repoRoot);
}

async function setWorktreeIgnored({ repoRoot, worktreePath, ignored = true }) {
  const repoKey = normalizeRepoKey(repoRoot);
  const normalizedPath = normalizePathValue(worktreePath);
  if (!repoKey || !normalizedPath) {
    return [];
  }
  const store = await readStore();
  const current = new Set(readRepoIgnoredPaths(store, repoKey));
  if (ignored) {
    current.add(normalizedPath);
  } else {
    current.delete(normalizedPath);
  }
  const nextStore = writeRepoIgnoredPaths(store, repoKey, Array.from(current));
  await writeStore(nextStore);
  return readRepoIgnoredPaths(nextStore, repoKey);
}

async function clearIgnoredWorktrees(repoRoot) {
  const repoKey = normalizeRepoKey(repoRoot);
  if (!repoKey) {
    return [];
  }
  const store = await readStore();
  const nextStore = writeRepoIgnoredPaths(store, repoKey, []);
  await writeStore(nextStore);
  return [];
}

async function pruneIgnoredWorktrees({ repoRoot, liveWorktreePaths = [], trackedWorktreePaths = [] }) {
  const repoKey = normalizeRepoKey(repoRoot);
  if (!repoKey) {
    return [];
  }
  const liveSet = new Set(normalizePathList(liveWorktreePaths));
  const trackedSet = new Set(normalizePathList(trackedWorktreePaths));
  const store = await readStore();
  const currentIgnored = readRepoIgnoredPaths(store, repoKey);
  const nextIgnored = currentIgnored.filter(
    (entry) => liveSet.has(entry) && !trackedSet.has(entry)
  );
  if (nextIgnored.length === currentIgnored.length) {
    return nextIgnored;
  }
  const nextStore = writeRepoIgnoredPaths(store, repoKey, nextIgnored);
  try {
    await writeStore(nextStore);
  } catch (_error) {
    return nextIgnored;
  }
  return nextIgnored;
}

module.exports = {
  listIgnoredWorktreePaths,
  setWorktreeIgnored,
  clearIgnoredWorktrees,
  pruneIgnoredWorktrees,
};

export {};
