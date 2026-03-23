// @ts-nocheck
const os = require('os');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const yaml = require('js-yaml');

const fsp = fs.promises;

const BASELINE_PROFILE_ID = 'shell';
const DEFAULT_PROFILE_FORK = {
  enabled: false,
  driver: '',
  launchTemplate: '',
  sourceIdleMs: 1500,
  forkAckTimeoutMs: 15000,
  childReadyTimeoutMs: 20000,
};

const DEFAULT_PROFILES = [
  {
    id: BASELINE_PROFILE_ID,
    label: 'Shell',
    startCommand: '',
    resumeCommand: '',
    locked: true,
    kind: 'shell',
    fork: DEFAULT_PROFILE_FORK,
    shortcuts: {
      bindings: [],
    },
  },
  {
    id: 'codex',
    label: 'codex',
    startCommand: 'codex',
    resumeCommand: '',
    kind: 'cli',
    fork: {
      enabled: true,
      driver: 'codex',
      launchTemplate: 'codex --thread {thread_id}',
      sourceIdleMs: 1500,
      forkAckTimeoutMs: 15000,
      childReadyTimeoutMs: 20000,
    },
    shortcuts: {
      bindings: [],
    },
  },
  {
    id: 'gemini',
    label: 'gemini',
    startCommand: 'gemini',
    resumeCommand: '',
    kind: 'cli',
    fork: DEFAULT_PROFILE_FORK,
    shortcuts: {
      bindings: [],
    },
  },
  {
    id: 'claude',
    label: 'claude',
    startCommand: 'claude',
    resumeCommand: '',
    kind: 'cli',
    fork: DEFAULT_PROFILE_FORK,
    shortcuts: {
      bindings: [],
    },
  },
];

const DEFAULT_SETTINGS = {
  profiles: DEFAULT_PROFILES,
};

const EMPTY_SETTINGS = {
  profiles: [],
};

const PROJECT_FILENAME = 'terminus-settings.yaml';
const AGENT_PREFIX = 'terminus-settings-';
const AGENT_EXT = '.yaml';

const generateId = (prefix) => {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}`;
};

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
    // ignore
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
  return path.join(userDataPath, 'terminus-settings.json');
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

function normalizeFork(profile = {}) {
  const fork = profile?.fork && typeof profile.fork === 'object' ? profile.fork : {};
  const launchTemplate = String(
    fork.launchTemplate || DEFAULT_PROFILE_FORK.launchTemplate
  ).trim();
  const normalizeTimeout = (value, fallback) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }
    return Math.max(0, Math.floor(parsed));
  };
  return {
    enabled: Boolean(fork.enabled),
    driver: String(fork.driver || '').trim().toLowerCase(),
    launchTemplate,
    sourceIdleMs: normalizeTimeout(fork.sourceIdleMs, DEFAULT_PROFILE_FORK.sourceIdleMs),
    forkAckTimeoutMs: normalizeTimeout(
      fork.forkAckTimeoutMs,
      DEFAULT_PROFILE_FORK.forkAckTimeoutMs
    ),
    childReadyTimeoutMs: normalizeTimeout(
      fork.childReadyTimeoutMs,
      DEFAULT_PROFILE_FORK.childReadyTimeoutMs
    ),
  };
}

function normalizeProfile(profile = {}) {
  const id = profile.id || generateId('profile');
  const rawBindings = profile.shortcuts?.bindings;
  const bindings = Array.isArray(rawBindings) ? rawBindings.map(normalizeBinding) : [];
  return {
    id,
    label: String(profile.label || ''),
    startCommand: String(profile.startCommand || ''),
    resumeCommand: String(profile.resumeCommand || ''),
    locked: Boolean(profile.locked),
    kind: profile.kind ? String(profile.kind) : undefined,
    fork: normalizeFork(profile),
    shortcuts: {
      bindings,
    },
  };
}

function normalizeBinding(binding = {}) {
  const id = binding.id || generateId('binding');
  const action = binding.action || {};
  return {
    id,
    label: String(binding.label || ''),
    key: String(binding.key || ''),
    when: binding.when ? String(binding.when) : undefined,
    action: {
      type: String(action.type || 'sendText'),
      text: action.text !== undefined ? String(action.text) : undefined,
      keys: Array.isArray(action.keys) ? action.keys.map((key) => String(key)) : undefined,
    },
  };
}

function ensureBaselineProfile(profiles = []) {
  const normalized = profiles.map(normalizeProfile);
  const baselineIndex = normalized.findIndex((profile) => profile.id === BASELINE_PROFILE_ID);
  if (baselineIndex === -1) {
    return [normalizeProfile(DEFAULT_PROFILES[0]), ...normalized];
  }
  const baseline = {
    ...normalized[baselineIndex],
    locked: true,
    label: normalized[baselineIndex].label || DEFAULT_PROFILES[0].label,
    kind: normalized[baselineIndex].kind || DEFAULT_PROFILES[0].kind,
  };
  normalized[baselineIndex] = baseline;
  return normalized;
}

function normalizeSettings(settings = {}, { includeDefaults } = {}) {
  const rawProfiles = Array.isArray(settings.profiles) ? settings.profiles : [];
  const profiles = includeDefaults
    ? ensureBaselineProfile(rawProfiles.length ? rawProfiles : DEFAULT_PROFILES)
    : rawProfiles.map(normalizeProfile);
  return {
    profiles,
  };
}

async function readGlobalSettings() {
  const filePath = getGlobalSettingsPath();
  if (!fs.existsSync(filePath)) {
    return normalizeSettings(DEFAULT_SETTINGS, { includeDefaults: true });
  }
  const raw = await fsp.readFile(filePath, 'utf-8');
  try {
    const parsed = JSON.parse(raw);
    return normalizeSettings(parsed, { includeDefaults: true });
  } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
    return EMPTY_SETTINGS;
  }
}

async function writeGlobalSettings(settings) {
  const filePath = getGlobalSettingsPath();
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  const normalized = normalizeSettings(settings || DEFAULT_SETTINGS, { includeDefaults: true });
  const payload = {
    ...normalized,
    profiles: ensureBaselineProfile(normalized.profiles),
  };
  await fsp.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8');
  return payload;
}

async function writeProjectSettings(worktreePath, settings) {
  if (!worktreePath) {
    throw new Error('worktreePath is required for project terminus settings.');
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
    throw new Error('worktreePath is required for agent terminus settings.');
  }
  const filePath = getAgentSettingsPath(worktreePath);
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  const normalized = normalizeSettings(settings || EMPTY_SETTINGS);
  const content = yaml.dump(normalized, { lineWidth: 120 });
  await fsp.writeFile(filePath, content, 'utf-8');
  return normalized;
}

async function getTerminusSettings({ scope = 'resolved', worktreePath } = {}) {
  if (scope === 'global') {
    return readGlobalSettings();
  }
  if (scope === 'project') {
    return readProjectSettings(worktreePath);
  }
  if (scope === 'agent') {
    return readAgentSettings(worktreePath);
  }
  const [globalSettings, projectSettings, agentSettings] = await Promise.all([
    readGlobalSettings(),
    readProjectSettings(worktreePath),
    readAgentSettings(worktreePath),
  ]);
  return { global: globalSettings, project: projectSettings, agent: agentSettings };
}

function mergeById(...scopes) {
  const merged = [];
  const indexById = new Map();
  scopes.flat().forEach((item, index) => {
    if (!item) {
      return;
    }
    const id = item.id || `profile-${index}`;
    if (indexById.has(id)) {
      merged[indexById.get(id)] = normalizeProfile({
        ...merged[indexById.get(id)],
        ...item,
      });
      return;
    }
    indexById.set(id, merged.length);
    merged.push(normalizeProfile(item));
  });
  return merged;
}

async function getResolvedTerminusSettings({ worktreePath } = {}) {
  const [globalSettings, projectSettings, agentSettings] = await Promise.all([
    readGlobalSettings(),
    readProjectSettings(worktreePath),
    readAgentSettings(worktreePath),
  ]);
  return {
    profiles: ensureBaselineProfile(
      mergeById(
        globalSettings?.profiles || [],
        projectSettings?.profiles || [],
        agentSettings?.profiles || []
      )
    ),
  };
}

async function setTerminusSettings({ scope = 'global', worktreePath, settings }) {
  if (scope === 'project') {
    return writeProjectSettings(worktreePath, settings);
  }
  if (scope === 'agent') {
    return writeAgentSettings(worktreePath, settings);
  }
  return writeGlobalSettings(settings);
}

export {
  BASELINE_PROFILE_ID,
  DEFAULT_PROFILE_FORK,
  DEFAULT_SETTINGS,
  EMPTY_SETTINGS,
  getTerminusSettings,
  getResolvedTerminusSettings,
  setTerminusSettings,
};
