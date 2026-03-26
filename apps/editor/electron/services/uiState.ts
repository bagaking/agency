const { app } = require('electron');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const fsp = fs.promises;

const STATE_VERSION = 3;
const LEGACY_WINDOW_STATE_ID = 'legacy-default';
const WINDOW_STATE_KEYS = [
  'projectRoot',
  'selectedId',
  'activeSessionByCellId',
  'workbenchTabsByCellId',
  'workbenchActiveTabByCellId',
  'sidebarWidth',
  'sidebarCollapsed',
  'activeView',
  'hilDrawerOpen',
  'hilDrawerPanel',
  'hilDrawerPanelByView',
  'explorerFilterStateByRootKey',
  'windowBounds',
  'windowMaximized',
  'windowFullScreen',
];

let stateCache = null;
let stateLoaded = false;
let updateQueue = Promise.resolve();

function queueUpdate(task) {
  updateQueue = updateQueue.then(task, task);
  return updateQueue;
}

function getStatePath() {
  return path.join(app.getPath('userData'), 'editor-ui-state.json');
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeWindowStateIdList(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set();
  return value
    .map((entry) => String(entry || '').trim())
    .filter((entry) => {
      if (!entry || seen.has(entry)) {
        return false;
      }
      seen.add(entry);
      return true;
    });
}

function createEmptyState() {
  return {
    version: STATE_VERSION,
    appState: {},
    windowStates: {},
    lastActiveWindowStateId: '',
  };
}

function normalizeWindowState(raw) {
  if (!isPlainObject(raw)) {
    return {};
  }
  const next = {};
  WINDOW_STATE_KEYS.forEach((key) => {
    if (raw[key] !== undefined) {
      next[key] = raw[key];
    }
  });
  return next;
}

function extractLegacyWindowState(raw) {
  if (!isPlainObject(raw)) {
    return {};
  }
  return normalizeWindowState(raw);
}

function normalizeStoredState(raw) {
  const base = createEmptyState();
  if (!isPlainObject(raw)) {
    return base;
  }

  const hasScopedShape =
    raw.version === STATE_VERSION ||
    Object.prototype.hasOwnProperty.call(raw, 'appState') ||
    Object.prototype.hasOwnProperty.call(raw, 'windowStates');

  if (!hasScopedShape) {
    const legacyWindowState = extractLegacyWindowState(raw);
    const hasLegacyWindowState = Object.keys(legacyWindowState).length > 0;
    return {
      version: STATE_VERSION,
      appState: {
        ...(Array.isArray(raw.recentProjects) ? { recentProjects: raw.recentProjects } : {}),
        ...(hasLegacyWindowState ? { openWindowStateIds: [LEGACY_WINDOW_STATE_ID] } : {}),
      },
      windowStates: hasLegacyWindowState
        ? { [LEGACY_WINDOW_STATE_ID]: legacyWindowState }
        : {},
      lastActiveWindowStateId: hasLegacyWindowState ? LEGACY_WINDOW_STATE_ID : '',
    };
  }

  const appState = isPlainObject(raw.appState) ? { ...raw.appState } : {};
  if (!Array.isArray(appState.recentProjects)) {
    delete appState.recentProjects;
  }

  const rawWindowStates = isPlainObject(raw.windowStates) ? raw.windowStates : {};
  const windowStates = {};
  Object.entries(rawWindowStates).forEach(([windowStateId, snapshot]) => {
    const normalizedId = String(windowStateId || '').trim();
    if (!normalizedId) {
      return;
    }
    windowStates[normalizedId] = normalizeWindowState(snapshot);
  });

  const lastActiveWindowStateId = String(raw.lastActiveWindowStateId || '').trim();
  const normalizedOpenWindowStateIds = normalizeWindowStateIdList(appState.openWindowStateIds).filter(
    (windowStateId) => Boolean(windowStates[windowStateId])
  );
  if (normalizedOpenWindowStateIds.length > 0) {
    appState.openWindowStateIds = normalizedOpenWindowStateIds;
  } else if (lastActiveWindowStateId && windowStates[lastActiveWindowStateId]) {
    appState.openWindowStateIds = [lastActiveWindowStateId];
  } else {
    delete appState.openWindowStateIds;
  }

  return {
    version: STATE_VERSION,
    appState,
    windowStates,
    lastActiveWindowStateId:
      lastActiveWindowStateId && windowStates[lastActiveWindowStateId]
        ? lastActiveWindowStateId
        : '',
  };
}

async function readStoredState() {
  if (stateLoaded) {
    return stateCache || createEmptyState();
  }
  const statePath = getStatePath();
  if (!fs.existsSync(statePath)) {
    stateLoaded = true;
    stateCache = createEmptyState();
    return stateCache;
  }
  const raw = await fsp.readFile(statePath, 'utf-8');
  try {
    const parsed = JSON.parse(raw);
    stateCache = normalizeStoredState(parsed);
    stateLoaded = true;
    return stateCache;
  } catch (_error) {
    stateLoaded = true;
    stateCache = createEmptyState();
    return stateCache;
  }
}

async function writeStoredState(nextState) {
  const statePath = getStatePath();
  await fsp.mkdir(path.dirname(statePath), { recursive: true });
  const payload = JSON.stringify(nextState, null, 2);
  const tmpPath = `${statePath}.tmp`;
  await fsp.writeFile(tmpPath, payload, 'utf-8');
  try {
    await fsp.rename(tmpPath, statePath);
  } catch (_error) {
    await fsp.unlink(statePath).catch(() => undefined);
    await fsp.rename(tmpPath, statePath);
  }
  stateCache = nextState;
  stateLoaded = true;
  return nextState;
}

function normalizeWindowStateId(windowStateId) {
  return String(windowStateId || '').trim();
}

function createWindowStateId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `window-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

async function readUiState() {
  return readStoredState();
}

async function readAppUiState() {
  const state = await readStoredState();
  return { ...(state.appState || {}) };
}

async function updateAppUiState(partial) {
  return queueUpdate(async () => {
    const state = await readStoredState();
    const next = normalizeStoredState({
      ...state,
      appState: {
        ...(state.appState || {}),
        ...(isPlainObject(partial) ? partial : {}),
      },
    });
    return writeStoredState(next);
  });
}

async function readWindowUiState(windowStateId) {
  const normalizedId = normalizeWindowStateId(windowStateId);
  if (!normalizedId) {
    return {};
  }
  const state = await readStoredState();
  return {
    ...(state.windowStates?.[normalizedId] || {}),
  };
}

async function updateWindowUiState(windowStateId, partial) {
  const normalizedId = normalizeWindowStateId(windowStateId);
  if (!normalizedId) {
    return createEmptyState();
  }
  return queueUpdate(async () => {
    const state = await readStoredState();
    const current = state.windowStates?.[normalizedId] || {};
    const next = normalizeStoredState({
      ...state,
      windowStates: {
        ...(state.windowStates || {}),
        [normalizedId]: {
          ...current,
          ...(isPlainObject(partial) ? partial : {}),
        },
      },
    });
    return writeStoredState(next);
  });
}

async function markLastActiveWindowState(windowStateId) {
  const normalizedId = normalizeWindowStateId(windowStateId);
  if (!normalizedId) {
    return createEmptyState();
  }
  return queueUpdate(async () => {
    const state = await readStoredState();
    const next = normalizeStoredState({
      ...state,
      windowStates: {
        ...(state.windowStates || {}),
        [normalizedId]: {
          ...(state.windowStates?.[normalizedId] || {}),
        },
      },
      lastActiveWindowStateId: normalizedId,
    });
    return writeStoredState(next);
  });
}

async function getLastActiveWindowStateId() {
  const state = await readStoredState();
  return String(state.lastActiveWindowStateId || '').trim();
}

async function getOpenWindowStateIds() {
  const state = await readStoredState();
  return normalizeWindowStateIdList(state.appState?.openWindowStateIds).filter((windowStateId) =>
    Boolean(state.windowStates?.[windowStateId])
  );
}

async function setOpenWindowStateIds(windowStateIds) {
  return updateAppUiState({
    openWindowStateIds: normalizeWindowStateIdList(windowStateIds),
  });
}

async function updateUiState(partial) {
  return updateAppUiState(partial);
}

export {
  STATE_VERSION,
  LEGACY_WINDOW_STATE_ID,
  WINDOW_STATE_KEYS,
  createWindowStateId,
  getLastActiveWindowStateId,
  getOpenWindowStateIds,
  getStatePath,
  markLastActiveWindowState,
  normalizeStoredState,
  readAppUiState,
  readUiState,
  readWindowUiState,
  setOpenWindowStateIds,
  updateAppUiState,
  updateUiState,
  updateWindowUiState,
};
