const fs = require('fs');
const os = require('os');
const path = require('path');
const yaml = require('js-yaml');

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

function getProjectSettingsPath(worktreePath) {
  if (!worktreePath) {
    return null;
  }
  return path.join(worktreePath, '.agency', PROJECT_FILENAME);
}

function getAgentSettingsPath(worktreePath) {
  if (!worktreePath) {
    return null;
  }
  const worktreeName = path.basename(worktreePath);
  return path.join(worktreePath, '.agency', `${AGENT_PREFIX}${worktreeName}${AGENT_EXT}`);
}

async function writeGlobalSettings(settings) {
  const filePath = getGlobalSettingsPath();
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  const normalized = normalizeSettings(settings || DEFAULT_SETTINGS, { includeDefaults: true });
  await fsp.writeFile(filePath, JSON.stringify(normalized, null, 2), 'utf-8');
  return normalized;
}

async function writeProjectSettings(worktreePath, settings) {
  if (!worktreePath) {
    throw new Error('worktreePath is required for project session naming settings.');
  }
  const filePath = getProjectSettingsPath(worktreePath);
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  const normalized = normalizeSettings(settings || EMPTY_SETTINGS);
  const content = yaml.dump(normalized, { lineWidth: 120 });
  await fsp.writeFile(filePath, content, 'utf-8');
  return normalized;
}

async function writeAgentSettings(worktreePath, settings) {
  if (!worktreePath) {
    throw new Error('worktreePath is required for agent session naming settings.');
  }
  const filePath = getAgentSettingsPath(worktreePath);
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

async function readProjectSettings(worktreePath) {
  if (!worktreePath) {
    return EMPTY_SETTINGS;
  }
  const filePath = getProjectSettingsPath(worktreePath);
  if (!filePath || !fs.existsSync(filePath)) {
    return EMPTY_SETTINGS;
  }
  const raw = await fsp.readFile(filePath, 'utf-8');
  try {
    const parsed = yaml.load(raw);
    return normalizeSettings(parsed || {});
  } catch (_error) {
    return EMPTY_SETTINGS;
  }
}

async function readAgentSettings(worktreePath) {
  if (!worktreePath) {
    return EMPTY_SETTINGS;
  }
  const filePath = getAgentSettingsPath(worktreePath);
  if (!filePath || !fs.existsSync(filePath)) {
    return EMPTY_SETTINGS;
  }
  const raw = await fsp.readFile(filePath, 'utf-8');
  try {
    const parsed = yaml.load(raw);
    return normalizeSettings(parsed || {});
  } catch (_error) {
    return EMPTY_SETTINGS;
  }
}

async function getSessionNamingSettings(params: any = {}) {
  const { scope = 'resolved', worktreePath } = params || {};
  if (scope === 'project') {
    return readProjectSettings(worktreePath);
  }
  if (scope === 'agent') {
    return readAgentSettings(worktreePath);
  }
  if (scope === 'global') {
    return readGlobalSettings();
  }
  const [globalSettings, projectSettings, agentSettings] = await Promise.all([
    readGlobalSettings(),
    readProjectSettings(worktreePath),
    readAgentSettings(worktreePath),
  ]);
  return resolveSessionNaming({
    globalSettings,
    projectSettings,
    agentSettings,
  });
}

async function setSessionNamingSettings(params: any = {}) {
  const { scope = 'global', worktreePath, settings } = params || {};
  if (scope === 'project') {
    return writeProjectSettings(worktreePath, settings);
  }
  if (scope === 'agent') {
    return writeAgentSettings(worktreePath, settings);
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
