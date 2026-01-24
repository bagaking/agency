const { app, BrowserWindow, globalShortcut } = require('electron');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { logRuntime } = require('./runtimeLog');

const fsp = fs.promises;

const APP_SHORTCUT_CATALOG = [
  {
    id: 'capture.screenshot',
    defaultEnabled: true,
    defaultShortcut: 'CmdOrCtrl+Shift+5',
  },
  {
    id: 'memo.voice',
    defaultEnabled: false,
    defaultShortcut: '',
  },
  {
    id: 'view.agents',
    defaultEnabled: true,
    defaultShortcut: 'CmdOrCtrl+Shift+A',
  },
  {
    id: 'view.explorer',
    defaultEnabled: true,
    defaultShortcut: 'CmdOrCtrl+Shift+E',
  },
];

const PROJECT_FILENAMES = ['app-shortcuts.yaml', 'app-shortcuts.yml'];
const AGENT_PREFIX = 'app-shortcuts-';
const AGENT_EXT = '.yaml';

const registeredAccelerators = new Map();

const buildCatalogMap = () => {
  const map = new Map();
  APP_SHORTCUT_CATALOG.forEach((action) => {
    if (action?.id) {
      map.set(action.id, action);
    }
  });
  return map;
};

const normalizeAction = (action, catalogEntry) => {
  const id = String(action?.id || catalogEntry?.id || '').trim();
  if (!id) {
    return null;
  }
  return {
    id,
    enabled: Boolean(action?.enabled ?? catalogEntry?.defaultEnabled),
    shortcut: String(action?.shortcut ?? catalogEntry?.defaultShortcut ?? ''),
  };
};

const buildDefaultActions = () =>
  APP_SHORTCUT_CATALOG.map((entry) =>
    normalizeAction({ id: entry.id }, entry)
  ).filter(Boolean);

const mergeActions = (baseActions, overrides = []) => {
  const map = new Map();
  (baseActions || []).forEach((action) => {
    if (action?.id) {
      map.set(action.id, { ...action });
    }
  });
  (overrides || []).forEach((action) => {
    if (!action?.id) {
      return;
    }
    const existing = map.get(action.id) || { id: action.id };
    map.set(action.id, { ...existing, ...action });
  });
  return Array.from(map.values());
};

const normalizeScopedActions = (actions = []) => {
  const catalog = buildCatalogMap();
  return (actions || [])
    .map((action) => normalizeAction(action, catalog.get(action?.id)))
    .filter((action) => action && catalog.has(action.id));
};

const normalizeGlobalActions = (actions = []) => {
  const catalog = buildCatalogMap();
  const base = buildDefaultActions();
  const normalizedOverrides = normalizeScopedActions(actions);
  const merged = mergeActions(base, normalizedOverrides);
  return merged.map((action) => normalizeAction(action, catalog.get(action?.id))).filter(Boolean);
};

function getGlobalAppShortcutsPath() {
  return path.join(app.getPath('userData'), 'app-shortcuts.json');
}

function getProjectAppShortcutsPath(worktreePath) {
  if (!worktreePath) {
    return null;
  }
  const agencyDir = path.join(worktreePath, '.agency');
  for (const name of PROJECT_FILENAMES) {
    const candidate = path.join(agencyDir, name);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return path.join(agencyDir, PROJECT_FILENAMES[0]);
}

function getAgentAppShortcutsPath(worktreePath) {
  if (!worktreePath) {
    return null;
  }
  const worktreeName = path.basename(worktreePath);
  const agencyDir = path.join(worktreePath, '.agency');
  return path.join(agencyDir, `${AGENT_PREFIX}${worktreeName}${AGENT_EXT}`);
}

async function readGlobalAppShortcuts() {
  const filePath = getGlobalAppShortcutsPath();
  if (!fs.existsSync(filePath)) {
    return buildDefaultActions();
  }
  const raw = await fsp.readFile(filePath, 'utf-8');
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return buildDefaultActions();
    }
    return normalizeGlobalActions(parsed);
  } catch (_error) {
    return buildDefaultActions();
  }
}

async function readProjectAppShortcuts(worktreePath) {
  if (!worktreePath) {
    return [];
  }
  const filePath = getProjectAppShortcutsPath(worktreePath);
  if (!filePath || !fs.existsSync(filePath)) {
    return [];
  }
  const raw = await fsp.readFile(filePath, 'utf-8');
  try {
    const parsed = yaml.load(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return normalizeScopedActions(parsed);
  } catch (_error) {
    return [];
  }
}

async function readAgentAppShortcuts(worktreePath) {
  if (!worktreePath) {
    return [];
  }
  const filePath = getAgentAppShortcutsPath(worktreePath);
  if (!filePath || !fs.existsSync(filePath)) {
    return [];
  }
  const raw = await fsp.readFile(filePath, 'utf-8');
  try {
    const parsed = yaml.load(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return normalizeScopedActions(parsed);
  } catch (_error) {
    return [];
  }
}

async function writeGlobalAppShortcuts(actions) {
  const filePath = getGlobalAppShortcutsPath();
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  const normalized = normalizeGlobalActions(Array.isArray(actions) ? actions : []);
  await fsp.writeFile(filePath, JSON.stringify(normalized, null, 2), 'utf-8');
  return normalized;
}

async function writeProjectAppShortcuts(worktreePath, actions) {
  if (!worktreePath) {
    throw new Error('worktreePath is required for project app shortcuts.');
  }
  const filePath = getProjectAppShortcutsPath(worktreePath);
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  const normalized = normalizeScopedActions(Array.isArray(actions) ? actions : []);
  const content = yaml.dump(normalized, { lineWidth: 120 });
  await fsp.writeFile(filePath, content, 'utf-8');
  return normalized;
}

async function writeAgentAppShortcuts(worktreePath, actions) {
  if (!worktreePath) {
    throw new Error('worktreePath is required for agent app shortcuts.');
  }
  const filePath = getAgentAppShortcutsPath(worktreePath);
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  const normalized = normalizeScopedActions(Array.isArray(actions) ? actions : []);
  const content = yaml.dump(normalized, { lineWidth: 120 });
  await fsp.writeFile(filePath, content, 'utf-8');
  return normalized;
}

async function getAppShortcuts({ scope = 'resolved', worktreePath } = {}) {
  if (scope === 'global') {
    return readGlobalAppShortcuts();
  }
  if (scope === 'project') {
    return readProjectAppShortcuts(worktreePath);
  }
  if (scope === 'agent') {
    return readAgentAppShortcuts(worktreePath);
  }
  const globalActions = await readGlobalAppShortcuts();
  const projectActions = await readProjectAppShortcuts(worktreePath);
  const agentActions = await readAgentAppShortcuts(worktreePath);
  return mergeActions(globalActions, mergeActions(projectActions, agentActions));
}

async function setAppShortcuts({ scope = 'global', worktreePath, actions }) {
  if (scope === 'project') {
    return writeProjectAppShortcuts(worktreePath, actions);
  }
  if (scope === 'agent') {
    return writeAgentAppShortcuts(worktreePath, actions);
  }
  return writeGlobalAppShortcuts(actions);
}

function normalizeAccelerator(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return '';
  }
  return raw.replace(/CommandOrControl/gi, 'CmdOrCtrl');
}

function resolveTargetWindow() {
  const focused = BrowserWindow.getFocusedWindow();
  if (focused && !focused.isDestroyed()) {
    return focused;
  }
  const all = BrowserWindow.getAllWindows();
  return all.find((win) => win && !win.isDestroyed()) || null;
}

function dispatchAppShortcut(actionId) {
  const target = resolveTargetWindow();
  if (!target) {
    logRuntime('warn', 'app shortcut trigger dropped (no window)', { actionId });
    return;
  }
  target.webContents.send('app-shortcuts:trigger', { id: actionId });
}

function clearRegisteredShortcuts() {
  for (const accelerator of registeredAccelerators.values()) {
    if (globalShortcut.isRegistered(accelerator)) {
      globalShortcut.unregister(accelerator);
    }
  }
  registeredAccelerators.clear();
}

function applyAppShortcuts({ actions } = {}) {
  clearRegisteredShortcuts();
  const catalog = buildCatalogMap();
  const normalized = normalizeScopedActions(actions || []).filter(
    (action) => action.enabled && action.shortcut
  );
  const usedAccelerators = new Set();
  normalized.forEach((action) => {
    if (!catalog.has(action.id)) {
      return;
    }
    const accelerator = normalizeAccelerator(action.shortcut);
    if (!accelerator) {
      return;
    }
    if (usedAccelerators.has(accelerator)) {
      logRuntime('warn', 'app shortcut accelerator duplicate', { accelerator, actionId: action.id });
      return;
    }
    const registered = globalShortcut.register(accelerator, () => dispatchAppShortcut(action.id));
    if (registered) {
      registeredAccelerators.set(action.id, accelerator);
      usedAccelerators.add(accelerator);
    } else {
      logRuntime('warn', 'app shortcut register failed', { accelerator, actionId: action.id });
    }
  });
  return {
    ok: true,
    registered: Array.from(registeredAccelerators.entries()).map(([id, accelerator]) => ({
      id,
      accelerator,
    })),
  };
}

module.exports = {
  APP_SHORTCUT_CATALOG,
  getAppShortcuts,
  setAppShortcuts,
  applyAppShortcuts,
  clearRegisteredShortcuts,
};
