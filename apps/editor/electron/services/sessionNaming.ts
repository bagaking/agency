const fs = require('fs');
const os = require('os');
const path = require('path');
const yaml = require('js-yaml');
const {
  resolveProjectConfigPath,
  resolveAgentConfigPath,
  resolveLegacyAgentConfigPath,
} = require('./scopedConfigPaths');

const {
  DEFAULT_RULE,
  DEFAULT_NAME_LISTS,
  DEFAULT_SETTINGS,
  EMPTY_SETTINGS,
  normalizeSettings,
  resolveSessionNaming,
  normalizeSelectionPosition,
  formatSessionName,
} = require('../../shared/sessionNamingCore');

const fsp = fs.promises;

const PROJECT_FILENAME = 'session-naming.yaml';
const AGENT_PREFIX = 'session-naming-';
const AGENT_EXT = '.yaml';

function normalizeScopeRoot({ rootPath = '', projectRoot = '' } = {}) {
  return String(projectRoot || rootPath || '').trim();
}

function getElectronApp() {
  try {
    const electron = require('electron');
    if (
      electron &&
      typeof electron === 'object' &&
      electron.app &&
      typeof electron.app.getPath === 'function'
    ) {
      return electron.app;
    }
  } catch (_error) {
    // Ignore and fall back to a deterministic Node path.
  }
  return null;
}

function getFallbackUserDataPath() {
  const explicit = String(process.env.AGENCY_USER_DATA_PATH || '').trim();
  if (explicit) {
    return explicit;
  }
  const homePath = os.homedir() || process.cwd();
  if (process.platform === 'darwin') {
    return path.join(homePath, 'Library', 'Application Support', 'Agency');
  }
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || path.join(homePath, 'AppData', 'Roaming'), 'Agency');
  }
  return path.join(process.env.XDG_CONFIG_HOME || path.join(homePath, '.config'), 'Agency');
}

function getGlobalSettingsPath() {
  const electronApp = getElectronApp();
  const userDataPath = electronApp ? electronApp.getPath('userData') : getFallbackUserDataPath();
  return path.join(userDataPath, 'session-naming.json');
}

async function resolveProjectSettingsPath({
  rootPath = '',
  projectRoot = '',
  worktreePath = '',
}: any = {}) {
  const normalizedRoot = normalizeScopeRoot({ rootPath, projectRoot });
  const resolved = await resolveProjectConfigPath({
    rootPath: normalizedRoot,
    worktreePath,
    filenames: [PROJECT_FILENAME],
  });
  return {
    filePath: resolved.filePath,
    legacyPath: worktreePath ? path.join(worktreePath, '.agency', PROJECT_FILENAME) : '',
  };
}

async function resolveAgentSettingsPath({
  rootPath = '',
  projectRoot = '',
  worktreePath = '',
  cellId = '',
}: any = {}) {
  const normalizedRoot = normalizeScopeRoot({ rootPath, projectRoot });
  const resolved = await resolveAgentConfigPath({
    rootPath: normalizedRoot,
    worktreePath,
    cellId,
    filename: PROJECT_FILENAME,
  });
  return {
    filePath: resolved.filePath,
    legacyPath: resolveLegacyAgentConfigPath(worktreePath, AGENT_PREFIX, AGENT_EXT),
  };
}

async function writeGlobalSettings(settings) {
  const filePath = getGlobalSettingsPath();
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  const normalized = normalizeSettings(settings || DEFAULT_SETTINGS, { includeDefaults: true });
  await fsp.writeFile(filePath, JSON.stringify(normalized, null, 2), 'utf-8');
  return normalized;
}

async function writeProjectSettings({
  rootPath = '',
  projectRoot = '',
  worktreePath = '',
  settings,
}: any = {}) {
  const { filePath } = await resolveProjectSettingsPath({
    rootPath,
    projectRoot,
    worktreePath,
  });
  if (!filePath) {
    throw new Error('Project root is required for project session naming settings.');
  }
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  const normalized = normalizeSettings(settings || EMPTY_SETTINGS);
  const content = yaml.dump(normalized, { lineWidth: 120 });
  await fsp.writeFile(filePath, content, 'utf-8');
  return normalized;
}

async function writeAgentSettings({
  rootPath = '',
  projectRoot = '',
  worktreePath = '',
  cellId = '',
  settings,
}: any = {}) {
  const { filePath } = await resolveAgentSettingsPath({
    rootPath,
    projectRoot,
    worktreePath,
    cellId,
  });
  if (!filePath) {
    throw new Error('Project root and cell id are required for agent session naming settings.');
  }
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  const normalized = normalizeSettings(settings || EMPTY_SETTINGS);
  const content = yaml.dump(normalized, { lineWidth: 120 });
  await fsp.writeFile(filePath, content, 'utf-8');
  return normalized;
}

async function readGlobalSettings() {
  const filePath = getGlobalSettingsPath();
  if (!fs.existsSync(filePath)) {
    return writeGlobalSettings(DEFAULT_SETTINGS);
  }
  const raw = await fsp.readFile(filePath, 'utf-8');
  try {
    const parsed = JSON.parse(raw);
    return normalizeSettings(parsed, { includeDefaults: true });
  } catch (_error) {
    return normalizeSettings(DEFAULT_SETTINGS, { includeDefaults: true });
  }
}

async function readProjectSettings({
  rootPath = '',
  projectRoot = '',
  worktreePath = '',
} = {}) {
  const { filePath, legacyPath } = await resolveProjectSettingsPath({
    rootPath,
    projectRoot,
    worktreePath,
  });
  const resolvedPath =
    filePath && fs.existsSync(filePath)
      ? filePath
      : legacyPath && fs.existsSync(legacyPath)
        ? legacyPath
        : '';
  if (!resolvedPath) {
    return EMPTY_SETTINGS;
  }
  const raw = await fsp.readFile(resolvedPath, 'utf-8');
  try {
    const parsed = yaml.load(raw);
    return normalizeSettings(parsed || {});
  } catch (_error) {
    return EMPTY_SETTINGS;
  }
}

async function readAgentSettings({
  rootPath = '',
  projectRoot = '',
  worktreePath = '',
  cellId = '',
} = {}) {
  const { filePath, legacyPath } = await resolveAgentSettingsPath({
    rootPath,
    projectRoot,
    worktreePath,
    cellId,
  });
  const resolvedPath =
    filePath && fs.existsSync(filePath)
      ? filePath
      : legacyPath && fs.existsSync(legacyPath)
        ? legacyPath
        : '';
  if (!resolvedPath) {
    return EMPTY_SETTINGS;
  }
  const raw = await fsp.readFile(resolvedPath, 'utf-8');
  try {
    const parsed = yaml.load(raw);
    return normalizeSettings(parsed || {});
  } catch (_error) {
    return EMPTY_SETTINGS;
  }
}

async function getSessionNamingSettings(params: any = {}) {
  const {
    scope = 'resolved',
    worktreePath,
    rootPath = '',
    projectRoot = '',
    cellId,
  } = params || {};
  if (scope === 'project') {
    return readProjectSettings({ rootPath, projectRoot, worktreePath });
  }
  if (scope === 'agent') {
    return readAgentSettings({ rootPath, projectRoot, worktreePath, cellId });
  }
  if (scope === 'global') {
    return readGlobalSettings();
  }
  const [globalSettings, projectSettings, agentSettings] = await Promise.all([
    readGlobalSettings(),
    readProjectSettings({ rootPath, projectRoot, worktreePath }),
    readAgentSettings({ rootPath, projectRoot, worktreePath, cellId }),
  ]);
  return resolveSessionNaming({
    globalSettings,
    projectSettings,
    agentSettings,
  });
}

async function setSessionNamingSettings(params: any = {}) {
  const {
    scope = 'global',
    worktreePath,
    rootPath = '',
    projectRoot = '',
    cellId,
    settings,
  } = params || {};
  if (scope === 'project') {
    return writeProjectSettings({ rootPath, projectRoot, worktreePath, settings });
  }
  if (scope === 'agent') {
    return writeAgentSettings({
      rootPath,
      projectRoot,
      worktreePath,
      cellId,
      settings,
    });
  }
  return writeGlobalSettings(settings);
}

function resolveUserName() {
  try {
    const info = os.userInfo();
    if (info?.username) {
      return info.username;
    }
  } catch (_error) {
    // Ignore.
  }
  return process.env.USER || process.env.USERNAME || '';
}

export {
  DEFAULT_RULE,
  DEFAULT_NAME_LISTS,
  DEFAULT_SETTINGS,
  EMPTY_SETTINGS,
  formatSessionName,
  normalizeSelectionPosition,
  resolveSessionNaming,
  getSessionNamingSettings,
  setSessionNamingSettings,
  resolveUserName,
};
