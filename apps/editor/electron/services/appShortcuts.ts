const { app, BrowserWindow, globalShortcut } = require('electron');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { logRuntime } = require('./runtimeLog');
const {
  resolveProjectConfigPath,
  resolveAgentConfigPath,
  resolveLegacyAgentConfigPath,
} = require('./scopedConfigPaths');

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

function normalizeScopeRoot({ rootPath = '', projectRoot = '' } = {}) {
  return String(projectRoot || rootPath || '').trim();
}

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

async function resolveProjectAppShortcutsPath({
  rootPath = '',
  projectRoot = '',
  worktreePath = '',
}: any = {}) {
  const normalizedRoot = normalizeScopeRoot({ rootPath, projectRoot });
  const resolved = await resolveProjectConfigPath({
    rootPath: normalizedRoot,
    worktreePath,
    filenames: PROJECT_FILENAMES,
  });
  return {
    filePath: resolved.filePath,
    legacyPath: worktreePath ? path.join(worktreePath, '.agency', PROJECT_FILENAMES[0]) : '',
  };
}

async function resolveAgentAppShortcutsPath({
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
    filename: PROJECT_FILENAMES[0],
  });
  return {
    filePath: resolved.filePath,
    legacyPath: resolveLegacyAgentConfigPath(worktreePath, AGENT_PREFIX, AGENT_EXT),
  };
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

async function readProjectAppShortcuts({
  rootPath = '',
  projectRoot = '',
  worktreePath = '',
} = {}) {
  const { filePath, legacyPath } = await resolveProjectAppShortcutsPath({
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
    return [];
  }
  const raw = await fsp.readFile(resolvedPath, 'utf-8');
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

async function readAgentAppShortcuts({
  rootPath = '',
  projectRoot = '',
  worktreePath = '',
  cellId = '',
} = {}) {
  const { filePath, legacyPath } = await resolveAgentAppShortcutsPath({
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
    return [];
  }
  const raw = await fsp.readFile(resolvedPath, 'utf-8');
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

async function writeProjectAppShortcuts({
  rootPath = '',
  projectRoot = '',
  worktreePath = '',
  actions,
}: any = {}) {
  const { filePath } = await resolveProjectAppShortcutsPath({
    rootPath,
    projectRoot,
    worktreePath,
  });
  if (!filePath) {
    throw new Error('Project root is required for project app shortcuts.');
  }
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  const normalized = normalizeScopedActions(Array.isArray(actions) ? actions : []);
  const content = yaml.dump(normalized, { lineWidth: 120 });
  await fsp.writeFile(filePath, content, 'utf-8');
  return normalized;
}

async function writeAgentAppShortcuts({
  rootPath = '',
  projectRoot = '',
  worktreePath = '',
  cellId = '',
  actions,
}: any = {}) {
  const { filePath } = await resolveAgentAppShortcutsPath({
    rootPath,
    projectRoot,
    worktreePath,
    cellId,
  });
  if (!filePath) {
    throw new Error('Project root and cell id are required for agent app shortcuts.');
  }
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  const normalized = normalizeScopedActions(Array.isArray(actions) ? actions : []);
  const content = yaml.dump(normalized, { lineWidth: 120 });
  await fsp.writeFile(filePath, content, 'utf-8');
  return normalized;
}

async function getAppShortcuts(params: any = {}) {
  const {
    scope = 'resolved',
    worktreePath,
    rootPath = '',
    projectRoot = '',
    cellId,
  } = params || {};
  if (scope === 'global') {
    return readGlobalAppShortcuts();
  }
  if (scope === 'project') {
    return readProjectAppShortcuts({ rootPath, projectRoot, worktreePath });
  }
  if (scope === 'agent') {
    return readAgentAppShortcuts({ rootPath, projectRoot, worktreePath, cellId });
  }
  const globalActions = await readGlobalAppShortcuts();
  const projectActions = await readProjectAppShortcuts({ rootPath, projectRoot, worktreePath });
  const agentActions = await readAgentAppShortcuts({
    rootPath,
    projectRoot,
    worktreePath,
    cellId,
  });
  return mergeActions(globalActions, mergeActions(projectActions, agentActions));
}

async function setAppShortcuts(params: any = {}) {
  const {
    scope = 'global',
    worktreePath,
    rootPath = '',
    projectRoot = '',
    cellId,
    actions,
  } = params || {};
  if (scope === 'project') {
    return writeProjectAppShortcuts({ rootPath, projectRoot, worktreePath, actions });
  }
  if (scope === 'agent') {
    return writeAgentAppShortcuts({
      rootPath,
      projectRoot,
      worktreePath,
      cellId,
      actions,
    });
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

function applyAppShortcuts(params: any = {}) {
  const { actions } = params || {};
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

export {
  APP_SHORTCUT_CATALOG,
  getAppShortcuts,
  setAppShortcuts,
  applyAppShortcuts,
  clearRegisteredShortcuts,
};
