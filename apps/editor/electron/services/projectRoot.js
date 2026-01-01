const { app, dialog } = require('electron');
const fs = require('fs');
const { getRepoRoot } = require('./git');
const { readUiState, updateUiState } = require('./uiState');

const ENV_PROJECT_ROOT = 'AGENCY_PROJECT_ROOT';
const ENV_TEST_PROJECT_ROOT = 'AGENCY_TEST_PROJECT_ROOT';

function normalizeRoot(value) {
  return String(value || '').trim();
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

async function resolveProjectRoot({ rootPath } = {}) {
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
    return '';
  }
  const repoRoot = await getRepoRoot(normalized);
  await updateUiState({ projectRoot: repoRoot });
  return repoRoot;
}

async function clearProjectRoot() {
  await updateUiState({ projectRoot: '' });
  return '';
}

async function selectProjectRoot() {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });
  if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
    return { canceled: true };
  }
  const selected = result.filePaths[0];
  const repoRoot = await getRepoRoot(selected);
  await updateUiState({ projectRoot: repoRoot });
  return { projectRoot: repoRoot, repoRoot };
}

function getAppPaths() {
  return {
    userDataPath: app.getPath('userData'),
    homePath: app.getPath('home'),
  };
}

async function getProjectContext() {
  const storedRoot = await getStoredProjectRoot();
  const resolvedRoot = storedRoot ? await resolveProjectRoot({ rootPath: storedRoot }) : '';
  const valid = Boolean(resolvedRoot);
  return {
    projectRoot: resolvedRoot,
    storedRoot,
    valid,
    ...getAppPaths(),
  };
}

module.exports = {
  resolveProjectRoot,
  setProjectRoot,
  clearProjectRoot,
  selectProjectRoot,
  getProjectContext,
  getAppPaths,
};
