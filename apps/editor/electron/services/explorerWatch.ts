// @ts-nocheck
const fs = require('fs');
const path = require('path');
const { normalizeRelPath } = require('./shared/pathSafety');

const DEFAULT_EXCLUDES = new Set(['.git']);
const DEBOUNCE_MS = Number(process.env.AGENCY_EXPLORER_WATCH_DEBOUNCE_MS || 300);

let watcher = null;
let watcherRoot = '';
let pendingDirs = new Set();
let debounceHandle = null;

function shouldIgnore(relativePath) {
  if (!relativePath) {
    return false;
  }
  const normalized = normalizeRelPath(relativePath);
  if (!normalized) {
    return false;
  }
  const [head] = normalized.split('/');
  return DEFAULT_EXCLUDES.has(head);
}

function flushChanges(onChange) {
  if (!pendingDirs.size) {
    return;
  }
  const paths = Array.from(pendingDirs);
  pendingDirs = new Set();
  onChange({
    rootPath: watcherRoot,
    paths,
    timestamp: Date.now(),
  });
}

function scheduleFlush(onChange) {
  if (debounceHandle) {
    clearTimeout(debounceHandle);
  }
  debounceHandle = setTimeout(() => {
    debounceHandle = null;
    flushChanges(onChange);
  }, DEBOUNCE_MS);
}

function stopExplorerWatch() {
  if (debounceHandle) {
    clearTimeout(debounceHandle);
    debounceHandle = null;
  }
  pendingDirs = new Set();
  if (watcher) {
    watcher.close();
    watcher = null;
  }
  watcherRoot = '';
}

function startExplorerWatch(rootPath, onChange) {
  if (!rootPath) {
    stopExplorerWatch();
    return { watching: false };
  }
  if (watcher && watcherRoot === rootPath) {
    return { watching: true, rootPath };
  }
  stopExplorerWatch();
  watcherRoot = rootPath;
  try {
    watcher = fs.watch(rootPath, { recursive: true }, (_eventType, filename) => {
      const relative = normalizeRelPath(filename || '');
      if (shouldIgnore(relative)) {
        return;
      }
      const dir = relative ? normalizeRelPath(path.posix.dirname(relative)) : '';
      pendingDirs.add(dir === '.' ? '' : dir);
      scheduleFlush(onChange);
    });
    return { watching: true, rootPath };
  } catch (error) {
    stopExplorerWatch();
    throw error;
  }
}

export {
  startExplorerWatch,
  stopExplorerWatch,
};
