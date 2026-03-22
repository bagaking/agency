const { app, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const { getRepoRoot } = require('./git');
const {
  readAppUiState,
  readWindowUiState,
  updateAppUiState,
  updateWindowUiState,
} = require('./uiState');

const ENV_PROJECT_ROOT = 'AGENCY_PROJECT_ROOT';
const ENV_TEST_PROJECT_ROOT = 'AGENCY_TEST_PROJECT_ROOT';
const RECENT_PROJECTS_LIMIT = 8;
const windowProjectRoots = new Map();

function normalizeRoot(value) {
  return String(value || '').trim();
}

function normalizeWindowStateId(value) {
  return String(value || '').trim();
}

function normalizeRecentEntry(entry) {
  if (!entry || !entry.path) {
    return null;
  }
  const value = normalizeRoot(entry.path);
  if (!value) {
    return null;
  }
  const name = String(entry.name || path.basename(value) || value).trim();
  const lastOpenedAt = entry.lastOpenedAt || new Date().toISOString();
  return {
    path: value,
    name,
    lastOpenedAt,
  };
}

async function readRecentProjects() {
  const state = await readAppUiState();
  const raw = Array.isArray(state?.recentProjects) ? state.recentProjects : [];
  const normalized = raw.map(normalizeRecentEntry).filter(Boolean);
  const seen = new Set();
  return normalized.filter((entry) => {
    if (seen.has(entry.path)) {
      return false;
    }
    seen.add(entry.path);
    return true;
  });
}

async function getRecentProjects() {
  const entries = await readRecentProjects();
  return entries.map((entry) => ({
    ...entry,
    exists: fs.existsSync(entry.path),
  }));
}

async function rememberRecentProject(repoRoot) {
  const normalized = normalizeRoot(repoRoot);
  if (!normalized) {
    return getRecentProjects();
  }
  const current = await readRecentProjects();
  const nextEntry = {
    path: normalized,
    name: path.basename(normalized) || normalized,
    lastOpenedAt: new Date().toISOString(),
  };
  const merged = [
    nextEntry,
    ...current.filter((entry) => entry.path !== normalized),
  ];
  const limited = merged.slice(0, RECENT_PROJECTS_LIMIT);
  await updateAppUiState({ recentProjects: limited });
  return getRecentProjects();
}

function getEnvProjectRoot() {
  if (process.env.AGENCY_TEST_MODE === '1') {
    if (Object.prototype.hasOwnProperty.call(process.env, ENV_TEST_PROJECT_ROOT)) {
      return {
        value: normalizeRoot(process.env[ENV_TEST_PROJECT_ROOT]),
        explicit: true,
      };
    }
    return { value: '', explicit: false };
  }
  if (Object.prototype.hasOwnProperty.call(process.env, ENV_PROJECT_ROOT)) {
    return {
      value: normalizeRoot(process.env[ENV_PROJECT_ROOT]),
      explicit: true,
    };
  }
  return { value: '', explicit: false };
}

async function getStoredProjectRoot(windowStateId) {
  const normalizedWindowStateId = normalizeWindowStateId(windowStateId);
  if (!normalizedWindowStateId) {
    return '';
  }
  const state = await readWindowUiState(normalizedWindowStateId);
  return normalizeRoot(state?.projectRoot);
}

function getWindowProjectRoot(windowId) {
  if (!windowId) {
    return '';
  }
  return normalizeRoot(windowProjectRoots.get(windowId) || '');
}

function setWindowProjectRoot(windowId, projectRoot) {
  if (!windowId) {
    return;
  }
  const normalized = normalizeRoot(projectRoot);
  if (!normalized) {
    windowProjectRoots.delete(windowId);
    return;
  }
  windowProjectRoots.set(windowId, normalized);
}

function clearWindowProjectRoot(windowId) {
  if (!windowId) {
    return;
  }
  windowProjectRoots.delete(windowId);
}

async function resolveProjectRoot(params: any = {}) {
  const { rootPath, windowStateId } = params || {};
  const envRoot = getEnvProjectRoot();
  if (envRoot.explicit && !envRoot.value) {
    return '';
  }
  const storedRoot = await getStoredProjectRoot(windowStateId);
  const candidate = normalizeRoot(rootPath) || envRoot.value || storedRoot;
  if (!candidate) {
    return '';
  }
  if (!fs.existsSync(candidate)) {
    return '';
  }
  try {
    return await getRepoRoot(candidate);
  } catch (_error) {
    return '';
  }
}

async function persistWindowProjectRoot({ windowId, windowStateId, projectRoot }) {
  const normalizedWindowStateId = normalizeWindowStateId(windowStateId);
  if (windowId) {
    setWindowProjectRoot(windowId, projectRoot);
  }
  if (normalizedWindowStateId) {
    await updateWindowUiState(normalizedWindowStateId, { projectRoot });
  }
}

async function setProjectRoot(projectRoot, params: any = {}) {
  const { windowId, windowStateId } = params || {};
  const normalized = normalizeRoot(projectRoot);
  if (!normalized) {
    await persistWindowProjectRoot({
      windowId,
      windowStateId,
      projectRoot: '',
    });
    return {
      projectRoot: '',
      recentProjects: await getRecentProjects(),
    };
  }
  const repoRoot = await getRepoRoot(normalized);
  const recentProjects = await rememberRecentProject(repoRoot);
  await persistWindowProjectRoot({
    windowId,
    windowStateId,
    projectRoot: repoRoot,
  });
  return {
    projectRoot: repoRoot,
    repoRoot,
    recentProjects,
  };
}

async function clearProjectRoot(params: any = {}) {
  const { windowId, windowStateId } = params || {};
  await persistWindowProjectRoot({
    windowId,
    windowStateId,
    projectRoot: '',
  });
  return {
    projectRoot: '',
    recentProjects: await getRecentProjects(),
  };
}

async function selectProjectRoot(params: any = {}) {
  const { ownerWindow, windowStateId } = params || {};
  const ownerWindowId = ownerWindow?.id;
  if (process.env.AGENCY_TEST_MODE === '1') {
    if (Object.prototype.hasOwnProperty.call(process.env, ENV_TEST_PROJECT_ROOT)) {
      const candidate = normalizeRoot(process.env[ENV_TEST_PROJECT_ROOT]);
      if (!candidate) {
        return { canceled: true };
      }
      return setProjectRoot(candidate, {
        windowId: ownerWindowId,
        windowStateId,
      });
    }
  }
  const options = {
    properties: ['openDirectory'],
  };
  const result = ownerWindow
    ? await dialog.showOpenDialog(ownerWindow, options)
    : await dialog.showOpenDialog(options);
  if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
    return { canceled: true };
  }
  return setProjectRoot(result.filePaths[0], {
    windowId: ownerWindowId,
    windowStateId,
  });
}

function getAppPaths() {
  return {
    userDataPath: app.getPath('userData'),
    homePath: app.getPath('home'),
  };
}

async function getProjectContext(params: any = {}) {
  const { windowId, windowStateId, allowStoredRoot = true } = params || {};
  const normalizedWindowStateId = normalizeWindowStateId(windowStateId);
  const windowRoot = getWindowProjectRoot(windowId);
  let resolvedRoot = windowRoot
    ? await resolveProjectRoot({ rootPath: windowRoot, windowStateId: normalizedWindowStateId })
    : '';
  if (!resolvedRoot && windowRoot) {
    clearWindowProjectRoot(windowId);
  }

  const storedRoot = allowStoredRoot
    ? await getStoredProjectRoot(normalizedWindowStateId)
    : '';
  if (!resolvedRoot && storedRoot) {
    resolvedRoot = await resolveProjectRoot({
      rootPath: storedRoot,
      windowStateId: normalizedWindowStateId,
    });
    if (windowId && resolvedRoot) {
      setWindowProjectRoot(windowId, resolvedRoot);
    }
  }

  if (!resolvedRoot && allowStoredRoot) {
    const envRoot = getEnvProjectRoot();
    const envCandidate = envRoot.explicit ? envRoot.value : '';
    resolvedRoot = envCandidate
      ? await resolveProjectRoot({
          rootPath: envCandidate,
          windowStateId: normalizedWindowStateId,
        })
      : '';
    if (windowId && resolvedRoot) {
      setWindowProjectRoot(windowId, resolvedRoot);
    }
  }

  const valid = Boolean(resolvedRoot);
  return {
    projectRoot: resolvedRoot,
    storedRoot: allowStoredRoot ? storedRoot : '',
    valid,
    recentProjects: await getRecentProjects(),
    windowStateId: normalizedWindowStateId,
    ...getAppPaths(),
  };
}

export {
  resolveProjectRoot,
  setProjectRoot,
  clearProjectRoot,
  selectProjectRoot,
  getProjectContext,
  getAppPaths,
  getRecentProjects,
  getWindowProjectRoot,
  setWindowProjectRoot,
  clearWindowProjectRoot,
};
