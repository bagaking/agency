// @ts-nocheck
const os = require('os');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const yaml = require('js-yaml');
const {
  resolveProjectConfigPath,
  resolveAgentConfigPath,
  resolveLegacyAgentConfigPath,
} = require('./scopedConfigPaths');

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

function normalizeScopeRoot({ rootPath = '', projectRoot = '' } = {}) {
  return String(projectRoot || rootPath || '').trim();
}

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

async function resolveProjectSettingsPath({
  rootPath = '',
  projectRoot = '',
  worktreePath = '',
} = {}) {
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
} = {}) {
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
  } catch (error) {
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

async function writeProjectSettings({
  rootPath = '',
  projectRoot = '',
  worktreePath = '',
  settings,
} = {}) {
  const { filePath } = await resolveProjectSettingsPath({
    rootPath,
    projectRoot,
    worktreePath,
  });
  if (!filePath) {
    throw new Error('Project root is required for project terminus settings.');
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
} = {}) {
  const { filePath } = await resolveAgentSettingsPath({
    rootPath,
    projectRoot,
    worktreePath,
    cellId,
  });
  if (!filePath) {
    throw new Error('Project root and cell id are required for agent terminus settings.');
  }
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  const normalized = normalizeSettings(settings || EMPTY_SETTINGS);
  const content = yaml.dump(normalized, { lineWidth: 120 });
  await fsp.writeFile(filePath, content, 'utf-8');
  return normalized;
}

async function getTerminusSettings(params: any = {}) {
  const {
    scope = 'resolved',
    worktreePath,
    rootPath = '',
    projectRoot = '',
    cellId,
  } = params;
  if (scope === 'global') {
    return readGlobalSettings();
  }
  if (scope === 'project') {
    return readProjectSettings({ rootPath, projectRoot, worktreePath });
  }
  if (scope === 'agent') {
    return readAgentSettings({ rootPath, projectRoot, worktreePath, cellId });
  }
  const [globalSettings, projectSettings, agentSettings] = await Promise.all([
    readGlobalSettings(),
    readProjectSettings({ rootPath, projectRoot, worktreePath }),
    readAgentSettings({ rootPath, projectRoot, worktreePath, cellId }),
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

async function getResolvedTerminusSettings({ worktreePath, rootPath, cellId } = {}) {
  const [globalSettings, projectSettings, agentSettings] = await Promise.all([
    readGlobalSettings(),
    readProjectSettings({ rootPath, worktreePath }),
    readAgentSettings({ rootPath, worktreePath, cellId }),
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

async function setTerminusSettings(params: any = {}) {
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

export {
  BASELINE_PROFILE_ID,
  DEFAULT_PROFILE_FORK,
  DEFAULT_SETTINGS,
  EMPTY_SETTINGS,
  getTerminusSettings,
  getResolvedTerminusSettings,
  setTerminusSettings,
};
