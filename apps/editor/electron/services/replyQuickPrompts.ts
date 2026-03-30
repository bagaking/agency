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

const PROJECT_FILENAMES = ['reply-quick-prompts.yaml', 'reply-quick-prompts.yml'];
const AGENT_PREFIX = 'reply-quick-prompts-';
const AGENT_EXT = '.yaml';
const AGENT_FILENAME = 'reply-quick-prompts.yaml';

const normalizePromptText = (value) =>
  String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();

const generatePromptId = () =>
  crypto.randomUUID ? crypto.randomUUID() : `reply-prompt-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const normalizePromptItem = (item) => {
  if (typeof item === 'string') {
    const text = normalizePromptText(item);
    if (!text) {
      return null;
    }
    return {
      id: generatePromptId(),
      title: '',
      text,
      enabled: true,
    };
  }
  if (!item || typeof item !== 'object') {
    return null;
  }
  const text = normalizePromptText(item.text);
  if (!text) {
    return null;
  }
  return {
    id: item.id || generatePromptId(),
    title: String(item.title || '').trim(),
    text,
    enabled: item.enabled !== false,
  };
};

const normalizePromptList = (value) =>
  (Array.isArray(value) ? value : [])
    .map(normalizePromptItem)
    .filter(Boolean);

function getGlobalReplyQuickPromptsPath() {
  return path.join(app.getPath('userData'), 'reply-quick-prompts.json');
}

async function resolveProjectReplyQuickPromptsPaths(params: any = {}) {
  return resolveProjectScopeConfigPaths({
    projectRoot: params.projectRoot,
    worktreePath: params.worktreePath,
    filenames: PROJECT_FILENAMES,
  });
}

async function resolveAgentReplyQuickPromptsPaths(params: any = {}) {
  return resolveAgentScopeConfigPaths({
    projectRoot: params.projectRoot,
    worktreePath: params.worktreePath,
    cellId: params.cellId,
    filename: AGENT_FILENAME,
    legacyPrefix: AGENT_PREFIX,
    legacyExt: AGENT_EXT,
  });
}

async function readGlobalReplyQuickPrompts() {
  const filePath = getGlobalReplyQuickPromptsPath();
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const raw = await fsp.readFile(filePath, 'utf-8');
  try {
    const parsed = JSON.parse(raw);
    return normalizePromptList(parsed);
  } catch (error) {
    return [];
  }
}

async function writeGlobalReplyQuickPrompts(prompts) {
  const filePath = getGlobalReplyQuickPromptsPath();
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  const normalized = normalizePromptList(prompts);
  await fsp.writeFile(filePath, JSON.stringify(normalized, null, 2), 'utf-8');
  return normalized;
}

async function readProjectReplyQuickPrompts(params: any = {}) {
  const { readPath } = await resolveProjectReplyQuickPromptsPaths(params);
  if (!readPath || !fs.existsSync(readPath)) {
    return [];
  }
  const raw = await fsp.readFile(readPath, 'utf-8');
  try {
    return normalizePromptList(yaml.load(raw));
  } catch (error) {
    return [];
  }
}

async function readAgentReplyQuickPrompts(params: any = {}) {
  const { readPath } = await resolveAgentReplyQuickPromptsPaths(params);
  if (!readPath || !fs.existsSync(readPath)) {
    return [];
  }
  const raw = await fsp.readFile(readPath, 'utf-8');
  try {
    return normalizePromptList(yaml.load(raw));
  } catch (error) {
    return [];
  }
}

async function writeProjectReplyQuickPrompts(params: any = {}, prompts) {
  const { canonicalPath, repoRoot } = await resolveProjectReplyQuickPromptsPaths(params);
  if (!canonicalPath || !repoRoot) {
    throw new Error('projectRoot is required for project reply quick prompts.');
  }
  await fsp.mkdir(path.dirname(canonicalPath), { recursive: true });
  const normalized = normalizePromptList(prompts);
  await fsp.writeFile(canonicalPath, yaml.dump(normalized, { lineWidth: 120 }), 'utf-8');
  return normalized;
}

async function writeAgentReplyQuickPrompts(params: any = {}, prompts) {
  const { canonicalPath, repoRoot } = await resolveAgentReplyQuickPromptsPaths(params);
  if (!canonicalPath || !repoRoot) {
    throw new Error('projectRoot and cellId are required for agent reply quick prompts.');
  }
  await fsp.mkdir(path.dirname(canonicalPath), { recursive: true });
  const normalized = normalizePromptList(prompts);
  await fsp.writeFile(canonicalPath, yaml.dump(normalized, { lineWidth: 120 }), 'utf-8');
  return normalized;
}

function resolveReplyQuickPrompts({
  globalPrompts = [],
  projectPrompts = [],
  agentPrompts = [],
} = {}) {
  const resolved = [];
  const indexByText = new Map();
  const scopes = [
    { scope: 'global', prompts: globalPrompts },
    { scope: 'project', prompts: projectPrompts },
    { scope: 'agent', prompts: agentPrompts },
  ];

  scopes.forEach(({ scope, prompts }) => {
    normalizePromptList(prompts).forEach((prompt) => {
      if (prompt.enabled === false) {
        return;
      }
      const key = normalizePromptText(prompt.text);
      if (!key) {
        return;
      }
      if (indexByText.has(key)) {
        const existing = resolved[indexByText.get(key)];
        if (!existing.sources.includes(scope)) {
          existing.sources.push(scope);
        }
        return;
      }
      indexByText.set(key, resolved.length);
      resolved.push({
        ...prompt,
        text: key,
        sources: [scope],
      });
    });
  });

  return resolved;
}

async function getReplyQuickPrompts(params: any = {}) {
  const { scope = 'resolved' } = params || {};
  if (scope === 'global') {
    return readGlobalReplyQuickPrompts();
  }
  if (scope === 'project') {
    return readProjectReplyQuickPrompts(params);
  }
  if (scope === 'agent') {
    return readAgentReplyQuickPrompts(params);
  }

  const [globalPrompts, projectPrompts, agentPrompts] = await Promise.all([
    readGlobalReplyQuickPrompts(),
    readProjectReplyQuickPrompts(params),
    readAgentReplyQuickPrompts(params),
  ]);
  return resolveReplyQuickPrompts({
    globalPrompts,
    projectPrompts,
    agentPrompts,
  });
}

async function setReplyQuickPrompts(params: any = {}) {
  const { scope = 'global', prompts } = params || {};
  if (scope === 'project') {
    return writeProjectReplyQuickPrompts(params, prompts);
  }
  if (scope === 'agent') {
    return writeAgentReplyQuickPrompts(params, prompts);
  }
  return writeGlobalReplyQuickPrompts(prompts);
}

export {
  getReplyQuickPrompts,
  normalizePromptText,
  resolveReplyQuickPrompts,
  setReplyQuickPrompts,
};
