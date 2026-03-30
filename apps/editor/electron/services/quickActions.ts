const { app } = require('electron');
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

const DEFAULT_ACTIONS = [
  {
    id: 'codex',
    label: 'codex',
    startCommand: 'codex',
    resumeCommand: '',
  },
  {
    id: 'gemini',
    label: 'gemini',
    startCommand: 'gemini',
    resumeCommand: '',
  },
  {
    id: 'claude',
    label: 'claude',
    startCommand: 'claude',
    resumeCommand: '',
  },
];

const PROJECT_FILENAMES = ['quick-actions.yaml', 'quick-actions.yml'];
const AGENT_PREFIX = 'quick-actions-';
const AGENT_EXT = '.yaml';

function normalizeScopeRoot({ rootPath = '', projectRoot = '' } = {}) {
  return String(projectRoot || rootPath || '').trim();
}

function getGlobalQuickActionsPath() {
  return path.join(app.getPath('userData'), 'quick-actions.json');
}

function getLegacyProjectQuickActionsPath(worktreePath) {
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

function ensureId(action: any) {
  if (action.id) {
    return action;
  }
  const fallbackId = crypto.randomUUID ? crypto.randomUUID() : `action-${Date.now()}`;
  return { ...action, id: fallbackId };
}

async function readGlobalQuickActions() {
  const filePath = getGlobalQuickActionsPath();
  if (!fs.existsSync(filePath)) {
    return DEFAULT_ACTIONS;
  }
  const raw = await fsp.readFile(filePath, 'utf-8');
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return DEFAULT_ACTIONS;
    }
    return parsed.map(ensureId);
  } catch (error) {
    return DEFAULT_ACTIONS;
  }
}

async function writeGlobalQuickActions(actions) {
  const filePath = getGlobalQuickActionsPath();
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  const normalized = Array.isArray(actions) ? actions.map(ensureId) : DEFAULT_ACTIONS;
  await fsp.writeFile(filePath, JSON.stringify(normalized, null, 2), 'utf-8');
  return normalized;
}

async function resolveProjectQuickActionsPath({ rootPath = '', projectRoot = '', worktreePath }: any = {}) {
  const normalizedRoot = normalizeScopeRoot({ rootPath, projectRoot });
  const resolved = await resolveProjectConfigPath({
    rootPath: normalizedRoot,
    worktreePath,
    filenames: PROJECT_FILENAMES,
  });
  return {
    filePath: resolved.filePath,
    legacyPath: getLegacyProjectQuickActionsPath(worktreePath),
  };
}

async function resolveAgentQuickActionsPath({ rootPath = '', projectRoot = '', worktreePath, cellId }: any = {}) {
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

async function readProjectQuickActions(params: any = {}) {
  const { worktreePath, rootPath = '', projectRoot = '' } = params || {};
  const { filePath, legacyPath } = await resolveProjectQuickActionsPath({
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
    return parsed.map(ensureId);
  } catch (error) {
    return [];
  }
}

async function readAgentQuickActions(params: any = {}) {
  const {
    worktreePath,
    cellId,
    rootPath = '',
    projectRoot = '',
  } = params || {};
  const { filePath, legacyPath } = await resolveAgentQuickActionsPath({
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
    return parsed.map(ensureId);
  } catch (error) {
    return [];
  }
}

async function writeProjectQuickActions(params: any = {}) {
  const { worktreePath, actions, rootPath = '', projectRoot = '' } = params || {};
  const { filePath } = await resolveProjectQuickActionsPath({
    rootPath,
    projectRoot,
    worktreePath,
  });
  if (!filePath) {
    throw new Error('Project root is required for project quick actions.');
  }
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  const normalized = Array.isArray(actions) ? actions.map(ensureId) : [];
  const content = yaml.dump(normalized, { lineWidth: 120 });
  await fsp.writeFile(filePath, content, 'utf-8');
  return normalized;
}

async function writeAgentQuickActions(params: any = {}) {
  const {
    worktreePath,
    cellId,
    actions,
    rootPath = '',
    projectRoot = '',
  } = params || {};
  const { filePath } = await resolveAgentQuickActionsPath({
    rootPath,
    projectRoot,
    worktreePath,
    cellId,
  });
  if (!filePath) {
    throw new Error('Project root and cell id are required for agent quick actions.');
  }
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  const normalized = Array.isArray(actions) ? actions.map(ensureId) : [];
  const content = yaml.dump(normalized, { lineWidth: 120 });
  await fsp.writeFile(filePath, content, 'utf-8');
  return normalized;
}

function mergeQuickActions(...scopes) {
  const merged = [];
  const map = new Map();
  scopes.flat().forEach((action) => {
    if (!action) {
      return;
    }
    const normalized = ensureId(action);
    if (map.has(normalized.id)) {
      const index = merged.findIndex((item) => item.id === normalized.id);
      merged[index] = { ...merged[index], ...normalized };
    } else {
      map.set(normalized.id, normalized);
      merged.push(normalized);
    }
  });
  return merged;
}

async function getQuickActions(params: any = {}) {
  const {
    scope = 'resolved',
    worktreePath,
    rootPath = '',
    projectRoot = '',
    cellId,
  } = params || {};
  if (scope === 'global') {
    return readGlobalQuickActions();
  }
  if (scope === 'project') {
    return readProjectQuickActions({ rootPath, projectRoot, worktreePath });
  }
  if (scope === 'agent') {
    return readAgentQuickActions({ rootPath, projectRoot, worktreePath, cellId });
  }
  const globalActions = await readGlobalQuickActions();
  const projectActions = await readProjectQuickActions({ rootPath, projectRoot, worktreePath });
  const agentActions = await readAgentQuickActions({
    rootPath,
    projectRoot,
    worktreePath,
    cellId,
  });
  return mergeQuickActions(globalActions, projectActions, agentActions);
}

async function setQuickActions(params: any = {}) {
  const {
    scope = 'global',
    worktreePath,
    rootPath = '',
    projectRoot = '',
    cellId,
    actions,
  } = params || {};
  if (scope === 'project') {
    return writeProjectQuickActions({ rootPath, projectRoot, worktreePath, actions });
  }
  if (scope === 'agent') {
    return writeAgentQuickActions({
      rootPath,
      projectRoot,
      worktreePath,
      cellId,
      actions,
    });
  }
  return writeGlobalQuickActions(actions);
}

export {
  getQuickActions,
  setQuickActions,
  mergeQuickActions,
};
