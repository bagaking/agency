const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const yaml = require('js-yaml');
const {
  resolveAgentScopeConfigPaths,
  resolveProjectScopeConfigPaths,
} = require('./shared/scopedConfigStorage');

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
const AGENT_FILENAME = 'quick-actions.yaml';

function getGlobalQuickActionsPath() {
  return path.join(app.getPath('userData'), 'quick-actions.json');
}

async function resolveProjectQuickActionsPaths(params = {}) {
  return resolveProjectScopeConfigPaths({
    projectRoot: params.projectRoot,
    worktreePath: params.worktreePath,
    filenames: PROJECT_FILENAMES,
  });
}

async function resolveAgentQuickActionsPaths(params = {}) {
  return resolveAgentScopeConfigPaths({
    projectRoot: params.projectRoot,
    worktreePath: params.worktreePath,
    cellId: params.cellId,
    filename: AGENT_FILENAME,
    legacyPrefix: AGENT_PREFIX,
    legacyExt: AGENT_EXT,
  });
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

async function readProjectQuickActions(params = {}) {
  const { readPath } = await resolveProjectQuickActionsPaths(params);
  if (!readPath || !fs.existsSync(readPath)) {
    return [];
  }
  const raw = await fsp.readFile(readPath, 'utf-8');
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

async function readAgentQuickActions(params = {}) {
  const { readPath } = await resolveAgentQuickActionsPaths(params);
  if (!readPath || !fs.existsSync(readPath)) {
    return [];
  }
  const raw = await fsp.readFile(readPath, 'utf-8');
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

async function writeProjectQuickActions(params = {}, actions) {
  const { canonicalPath, repoRoot } = await resolveProjectQuickActionsPaths(params);
  if (!canonicalPath || !repoRoot) {
    throw new Error('projectRoot is required for project quick actions.');
  }
  await fsp.mkdir(path.dirname(canonicalPath), { recursive: true });
  const normalized = Array.isArray(actions) ? actions.map(ensureId) : [];
  const content = yaml.dump(normalized, { lineWidth: 120 });
  await fsp.writeFile(canonicalPath, content, 'utf-8');
  return normalized;
}

async function writeAgentQuickActions(params = {}, actions) {
  const { canonicalPath, repoRoot } = await resolveAgentQuickActionsPaths(params);
  if (!canonicalPath || !repoRoot) {
    throw new Error('projectRoot and cellId are required for agent quick actions.');
  }
  await fsp.mkdir(path.dirname(canonicalPath), { recursive: true });
  const normalized = Array.isArray(actions) ? actions.map(ensureId) : [];
  const content = yaml.dump(normalized, { lineWidth: 120 });
  await fsp.writeFile(canonicalPath, content, 'utf-8');
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
  const { scope = 'resolved' } = params || {};
  if (scope === 'global') {
    return readGlobalQuickActions();
  }
  if (scope === 'project') {
    return readProjectQuickActions(params);
  }
  if (scope === 'agent') {
    return readAgentQuickActions(params);
  }
  const globalActions = await readGlobalQuickActions();
  const projectActions = await readProjectQuickActions(params);
  const agentActions = await readAgentQuickActions(params);
  return mergeQuickActions(globalActions, projectActions, agentActions);
}

async function setQuickActions(params: any = {}) {
  const { scope = 'global', actions } = params || {};
  if (scope === 'project') {
    return writeProjectQuickActions(params, actions);
  }
  if (scope === 'agent') {
    return writeAgentQuickActions(params, actions);
  }
  return writeGlobalQuickActions(actions);
}

export {
  getQuickActions,
  setQuickActions,
  mergeQuickActions,
};
