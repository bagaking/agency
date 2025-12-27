const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const yaml = require('js-yaml');

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

function getGlobalQuickActionsPath() {
  return path.join(app.getPath('userData'), 'quick-actions.json');
}

function getProjectQuickActionsPath(worktreePath) {
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

function getAgentQuickActionsPath(worktreePath) {
  if (!worktreePath) {
    return null;
  }
  const worktreeName = path.basename(worktreePath);
  const agencyDir = path.join(worktreePath, '.agency');
  return path.join(agencyDir, `${AGENT_PREFIX}${worktreeName}${AGENT_EXT}`);
}

function ensureId(action) {
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

async function readProjectQuickActions(worktreePath) {
  if (!worktreePath) {
    return [];
  }
  const filePath = getProjectQuickActionsPath(worktreePath);
  if (!filePath || !fs.existsSync(filePath)) {
    return [];
  }
  const raw = await fsp.readFile(filePath, 'utf-8');
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

async function readAgentQuickActions(worktreePath) {
  if (!worktreePath) {
    return [];
  }
  const filePath = getAgentQuickActionsPath(worktreePath);
  if (!filePath || !fs.existsSync(filePath)) {
    return [];
  }
  const raw = await fsp.readFile(filePath, 'utf-8');
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

async function writeProjectQuickActions(worktreePath, actions) {
  if (!worktreePath) {
    throw new Error('worktreePath is required for project quick actions.');
  }
  const filePath = getProjectQuickActionsPath(worktreePath);
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  const normalized = Array.isArray(actions) ? actions.map(ensureId) : [];
  const content = yaml.dump(normalized, { lineWidth: 120 });
  await fsp.writeFile(filePath, content, 'utf-8');
  return normalized;
}

async function writeAgentQuickActions(worktreePath, actions) {
  if (!worktreePath) {
    throw new Error('worktreePath is required for agent quick actions.');
  }
  const filePath = getAgentQuickActionsPath(worktreePath);
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

async function getQuickActions({ scope = 'resolved', worktreePath } = {}) {
  if (scope === 'global') {
    return readGlobalQuickActions();
  }
  if (scope === 'project') {
    return readProjectQuickActions(worktreePath);
  }
  if (scope === 'agent') {
    return readAgentQuickActions(worktreePath);
  }
  const globalActions = await readGlobalQuickActions();
  const projectActions = await readProjectQuickActions(worktreePath);
  const agentActions = await readAgentQuickActions(worktreePath);
  return mergeQuickActions(globalActions, projectActions, agentActions);
}

async function setQuickActions({ scope = 'global', worktreePath, actions }) {
  if (scope === 'project') {
    return writeProjectQuickActions(worktreePath, actions);
  }
  if (scope === 'agent') {
    return writeAgentQuickActions(worktreePath, actions);
  }
  return writeGlobalQuickActions(actions);
}

module.exports = {
  getQuickActions,
  setQuickActions,
  mergeQuickActions,
};
