const { app } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
const yaml = require('js-yaml');

const fsp = fs.promises;

const DEFAULT_RULE = 'Session {seq:absolute:02} · {time:HHmm}';
const DEFAULT_NAME_LISTS = {
  myth: ['Athena', 'Apollo', 'Artemis', 'Hera', 'Hermes', 'Poseidon', 'Zeus'],
  constellation: ['Orion', 'Lyra', 'Cygnus', 'Draco', 'Phoenix', 'Aquila', 'Vela'],
  animals: ['Fox', 'Wolf', 'Raven', 'Otter', 'Hawk', 'Lynx', 'Stag'],
};

const DEFAULT_SETTINGS = {
  rule: DEFAULT_RULE,
  nameLists: DEFAULT_NAME_LISTS,
};

const EMPTY_SETTINGS = {
  rule: '',
  nameLists: {},
};

const PROJECT_FILENAME = 'session-naming.yaml';
const AGENT_PREFIX = 'session-naming-';
const AGENT_EXT = '.yaml';

const normalizeList = (value) => {
  if (!Array.isArray(value)) {
    return null;
  }
  return value
    .map((item) => String(item || '').trim())
    .filter((item) => item.length > 0);
};

const normalizeNameLists = (lists = {}) => {
  const next = {};
  Object.entries(lists || {}).forEach(([key, value]) => {
    const name = String(key || '').trim();
    if (!name) {
      return;
    }
    const items = normalizeList(value);
    if (items) {
      next[name] = items;
    }
  });
  return next;
};

function normalizeSettings(settings = {}, { includeDefaults = false } = {}) {
  const rule = String(settings.rule || '').trim();
  const nameLists = normalizeNameLists(settings.nameLists);
  if (!includeDefaults) {
    return {
      rule,
      nameLists,
    };
  }
  return {
    rule: rule || DEFAULT_RULE,
    nameLists: { ...DEFAULT_NAME_LISTS, ...nameLists },
  };
}

function getGlobalSettingsPath() {
  return path.join(app.getPath('userData'), 'session-naming.json');
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

async function getSessionNamingSettings({ scope = 'resolved', worktreePath } = {}) {
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

async function setSessionNamingSettings({ scope = 'global', worktreePath, settings } = {}) {
  if (scope === 'project') {
    return writeProjectSettings(worktreePath, settings);
  }
  if (scope === 'agent') {
    return writeAgentSettings(worktreePath, settings);
  }
  return writeGlobalSettings(settings);
}

function resolveSessionNaming({ globalSettings, projectSettings, agentSettings }) {
  const global = normalizeSettings(globalSettings || DEFAULT_SETTINGS, { includeDefaults: true });
  const project = normalizeSettings(projectSettings || EMPTY_SETTINGS);
  const agent = normalizeSettings(agentSettings || EMPTY_SETTINGS);
  return {
    rule: agent.rule || project.rule || global.rule || DEFAULT_RULE,
    nameLists: {
      ...global.nameLists,
      ...project.nameLists,
      ...agent.nameLists,
    },
  };
}

const padNumber = (value, width) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return '';
  }
  const str = String(Math.floor(numeric));
  if (!width || !Number.isFinite(Number(width))) {
    return str;
  }
  return str.padStart(Number(width), '0');
};

const expandShorthandFormat = (format) => {
  const trimmed = String(format || '');
  if (!/^[yMdHhms]+$/.test(trimmed)) {
    return trimmed;
  }
  const map = {
    y: 'YYYY',
    M: 'MM',
    d: 'DD',
    D: 'DD',
    H: 'HH',
    h: 'HH',
    m: 'mm',
    s: 'ss',
  };
  return trimmed
    .split('')
    .map((char) => map[char] || char)
    .join('');
};

const formatDateTime = (date, format) => {
  const token = expandShorthandFormat(format);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  return token.replace(/YYYY|MM|DD|HH|mm|ss/g, (match) => {
    switch (match) {
      case 'YYYY':
        return padNumber(year, 4);
      case 'MM':
        return padNumber(month, 2);
      case 'DD':
        return padNumber(day, 2);
      case 'HH':
        return padNumber(hours, 2);
      case 'mm':
        return padNumber(minutes, 2);
      case 'ss':
        return padNumber(seconds, 2);
      default:
        return match;
    }
  });
};

const normalizeSelectionPosition = (position) => {
  if (!position) {
    return null;
  }
  if (
    Number.isFinite(position.startRow) &&
    Number.isFinite(position.endRow) &&
    Number.isFinite(position.startColumn) &&
    Number.isFinite(position.endColumn)
  ) {
    return position;
  }
  if (position.start && position.end) {
    const startColumn = position.start.x ?? position.start.column ?? position.startColumn;
    const startRow = position.start.y ?? position.start.row ?? position.startRow;
    const endColumn = position.end.x ?? position.end.column ?? position.endColumn;
    const endRow = position.end.y ?? position.end.row ?? position.endRow;
    if (
      Number.isFinite(startRow) &&
      Number.isFinite(endRow) &&
      Number.isFinite(startColumn) &&
      Number.isFinite(endColumn)
    ) {
      return { startRow, endRow, startColumn, endColumn };
    }
  }
  return null;
};

function formatSessionName({
  rule,
  sequences = {},
  nameLists = {},
  context = {},
  now = new Date(),
} = {}) {
  const template = String(rule || DEFAULT_RULE);
  if (!template) {
    return '';
  }
  const normalizedLists = nameLists || {};
  const resolveSequence = (scope) => {
    const key = scope || 'absolute';
    const value = sequences[key];
    if (Number.isFinite(value)) {
      return value;
    }
    if (Number.isFinite(sequences.absolute)) {
      return sequences.absolute;
    }
    return 1;
  };

  return template.replace(/\{([^}]+)\}/g, (match, body) => {
    const parts = String(body || '').split(':').map((part) => part.trim()).filter(Boolean);
    if (!parts.length) {
      return match;
    }
    const type = parts[0];
    if (type === 'time' || type === 'date') {
      const format = parts[1] || (type === 'time' ? 'HHmm' : 'YYYYMMDD');
      return formatDateTime(now, format);
    }
    if (type === 'seq') {
      const scope = parts[1] || 'absolute';
      const pad = parts[2];
      const value = resolveSequence(scope);
      return pad ? padNumber(value, pad) : padNumber(value);
    }
    if (type === 'name') {
      const listName = parts[1];
      const scope = parts[2] || 'absolute';
      if (!listName) {
        return '';
      }
      const list = normalizedLists[listName] || [];
      if (!list.length) {
        return '';
      }
      const value = resolveSequence(scope);
      const index = Math.max(0, (value - 1) % list.length);
      return list[index];
    }
    if (context[type] !== undefined && context[type] !== null) {
      return String(context[type]);
    }
    return match;
  });
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

module.exports = {
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
