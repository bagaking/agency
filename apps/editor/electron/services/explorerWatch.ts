const fs = require('fs');
const path = require('path');
const { normalizeRelPath } = require('./shared/pathSafety');

const DEFAULT_EXCLUDES = new Set([
  '.git',
  '.electron-build',
  '.next',
  '.turbo',
  '.vite',
  '.worktrees',
  'build',
  'coverage',
  'dist',
  'node_modules',
]);
const DEBOUNCE_MS = Number(process.env.AGENCY_EXPLORER_WATCH_DEBOUNCE_MS || 300);

const watcherStatesByRoot = new Map();

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

function flushChanges(state) {
  if (!state.pendingDirs.size) {
    return;
  }
  const paths = Array.from(state.pendingDirs);
  state.pendingDirs = new Set();
  state.onChange({
    rootPath: state.rootPath,
    paths,
    timestamp: Date.now(),
  });
}

function scheduleFlush(state) {
  if (state.debounceHandle) {
    clearTimeout(state.debounceHandle);
  }
  state.debounceHandle = setTimeout(() => {
    state.debounceHandle = null;
    flushChanges(state);
  }, DEBOUNCE_MS);
}

function closeWatcherState(state) {
  if (state.debounceHandle) {
    clearTimeout(state.debounceHandle);
    state.debounceHandle = null;
  }
  state.pendingDirs = new Set();
  if (state.watcher) {
    state.watcher.close();
    state.watcher = null;
  }
}

function stopExplorerWatch(rootPath = '') {
  const requestedRoot = rootPath || '';
  if (requestedRoot) {
    const state = watcherStatesByRoot.get(requestedRoot);
    if (state) {
      closeWatcherState(state);
      watcherStatesByRoot.delete(requestedRoot);
    }
    return;
  }
  watcherStatesByRoot.forEach((state) => closeWatcherState(state));
  watcherStatesByRoot.clear();
}

function startExplorerWatch(rootPath, onChange) {
  if (!rootPath) {
    stopExplorerWatch();
    return { watching: false };
  }
  if (watcherStatesByRoot.has(rootPath)) {
    return { watching: true, rootPath };
  }
  const state = {
    rootPath,
    watcher: null,
    pendingDirs: new Set(),
    debounceHandle: null,
    onChange,
  };
  try {
    state.watcher = fs.watch(rootPath, { recursive: true }, (_eventType, filename) => {
      const relative = normalizeRelPath(filename || '');
      if (shouldIgnore(relative)) {
        return;
      }
      const dir = relative ? normalizeRelPath(path.posix.dirname(relative)) : '';
      state.pendingDirs.add(dir === '.' ? '' : dir);
      scheduleFlush(state);
    });
    watcherStatesByRoot.set(rootPath, state);
    return { watching: true, rootPath };
  } catch (error) {
    closeWatcherState(state);
    throw error;
  }
}

export {
  startExplorerWatch,
  stopExplorerWatch,
};
