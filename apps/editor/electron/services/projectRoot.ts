const { app, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const { getRepoRoot } = require('./git');
const { readUiState, updateUiState } = require('./uiState');

const ENV_PROJECT_ROOT = 'AGENCY_PROJECT_ROOT';
const ENV_TEST_PROJECT_ROOT = 'AGENCY_TEST_PROJECT_ROOT';
const RECENT_PROJECTS_LIMIT = 8;
const windowProjectRoots = new Map();

function normalizeRoot(value) {
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
  const state = await readUiState();
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
  await updateUiState({ recentProjects: limited });
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

async function getStoredProjectRoot() {
  const state = await readUiState();
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
  const { rootPath } = params || {};
  const envRoot = getEnvProjectRoot();
  if (envRoot.explicit && !envRoot.value) {
    return '';
  }
  const candidate = normalizeRoot(rootPath) || envRoot.value || (await getStoredProjectRoot());
  if (!candidate) {
    return '';
  }
  if (!fs.existsSync(candidate)) {
    return '';
  }
  try {
    return await getRepoRoot(candidate);
  } catch (error) {
    return '';
  }
}

async function setProjectRoot(projectRoot) {
  const normalized = normalizeRoot(projectRoot);
  if (!normalized) {
    await updateUiState({ projectRoot: '' });
    return {
      projectRoot: '',
      recentProjects: await getRecentProjects(),
    };
  }
  const repoRoot = await getRepoRoot(normalized);
  const recentProjects = await rememberRecentProject(repoRoot);
  await updateUiState({ projectRoot: repoRoot });
  return {
    projectRoot: repoRoot,
    repoRoot,
    recentProjects,
  };
}

async function clearProjectRoot() {
  await updateUiState({ projectRoot: '' });
  return {
    projectRoot: '',
    recentProjects: await getRecentProjects(),
  };
}

async function selectProjectRoot(params: any = {}) {
  const { ownerWindow } = params || {};
  if (process.env.AGENCY_TEST_MODE === '1') {
    if (Object.prototype.hasOwnProperty.call(process.env, ENV_TEST_PROJECT_ROOT)) {
      const candidate = normalizeRoot(process.env[ENV_TEST_PROJECT_ROOT]);
      if (!candidate) {
        return { canceled: true };
      }
      const repoRoot = await getRepoRoot(candidate);
      const recentProjects = await rememberRecentProject(repoRoot);
      await updateUiState({ projectRoot: repoRoot });
      return { projectRoot: repoRoot, repoRoot, recentProjects };
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
  const selected = result.filePaths[0];
  const repoRoot = await getRepoRoot(selected);
  const recentProjects = await rememberRecentProject(repoRoot);
  await updateUiState({ projectRoot: repoRoot });
  return { projectRoot: repoRoot, repoRoot, recentProjects };
}

function getAppPaths() {
  return {
    userDataPath: app.getPath('userData'),
    homePath: app.getPath('home'),
  };
}

async function getProjectContext(params: any = {}) {
  const { windowId, allowStoredRoot = true } = params || {};
  const windowRoot = getWindowProjectRoot(windowId);
  let resolvedRoot = windowRoot ? await resolveProjectRoot({ rootPath: windowRoot }) : '';
  if (!resolvedRoot && windowRoot) {
    clearWindowProjectRoot(windowId);
  }
  const storedRoot = allowStoredRoot ? await getStoredProjectRoot() : '';
  if (!resolvedRoot && storedRoot) {
    resolvedRoot = await resolveProjectRoot({ rootPath: storedRoot });
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
