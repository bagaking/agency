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

const PROJECT_FILENAMES = ['reply-quick-prompts.yaml', 'reply-quick-prompts.yml'];
const AGENT_PREFIX = 'reply-quick-prompts-';
const AGENT_EXT = '.yaml';

function normalizeScopeRoot({ rootPath = '', projectRoot = '' } = {}) {
  return String(projectRoot || rootPath || '').trim();
}

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

function getLegacyProjectReplyQuickPromptsPath(worktreePath) {
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

async function resolveProjectReplyQuickPromptsPath({
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
    legacyPath: getLegacyProjectReplyQuickPromptsPath(worktreePath),
  };
}

async function resolveAgentReplyQuickPromptsPath({
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

async function readProjectReplyQuickPrompts({
  rootPath = '',
  projectRoot = '',
  worktreePath = '',
} = {}) {
  const { filePath, legacyPath } = await resolveProjectReplyQuickPromptsPath({
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
    return normalizePromptList(yaml.load(raw));
  } catch (error) {
    return [];
  }
}

async function readAgentReplyQuickPrompts({
  rootPath = '',
  projectRoot = '',
  worktreePath = '',
  cellId = '',
} = {}) {
  const { filePath, legacyPath } = await resolveAgentReplyQuickPromptsPath({
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
    return normalizePromptList(yaml.load(raw));
  } catch (error) {
    return [];
  }
}

async function writeProjectReplyQuickPrompts({
  rootPath = '',
  projectRoot = '',
  worktreePath = '',
  prompts,
}: any = {}) {
  const { filePath } = await resolveProjectReplyQuickPromptsPath({
    rootPath,
    projectRoot,
    worktreePath,
  });
  if (!filePath) {
    throw new Error('Project root is required for project reply quick prompts.');
  }
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  const normalized = normalizePromptList(prompts);
  await fsp.writeFile(filePath, yaml.dump(normalized, { lineWidth: 120 }), 'utf-8');
  return normalized;
}

async function writeAgentReplyQuickPrompts({
  rootPath = '',
  projectRoot = '',
  worktreePath = '',
  cellId = '',
  prompts,
}: any = {}) {
  const { filePath } = await resolveAgentReplyQuickPromptsPath({
    rootPath,
    projectRoot,
    worktreePath,
    cellId,
  });
  if (!filePath) {
    throw new Error('Project root and cell id are required for agent reply quick prompts.');
  }
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  const normalized = normalizePromptList(prompts);
  await fsp.writeFile(filePath, yaml.dump(normalized, { lineWidth: 120 }), 'utf-8');
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
  const {
    scope = 'resolved',
    worktreePath,
    rootPath = '',
    projectRoot = '',
    cellId,
  } = params || {};
  if (scope === 'global') {
    return readGlobalReplyQuickPrompts();
  }
  if (scope === 'project') {
    return readProjectReplyQuickPrompts({ rootPath, projectRoot, worktreePath });
  }
  if (scope === 'agent') {
    return readAgentReplyQuickPrompts({
      rootPath,
      projectRoot,
      worktreePath,
      cellId,
    });
  }

  const [globalPrompts, projectPrompts, agentPrompts] = await Promise.all([
    readGlobalReplyQuickPrompts(),
    readProjectReplyQuickPrompts({ rootPath, projectRoot, worktreePath }),
    readAgentReplyQuickPrompts({
      rootPath,
      projectRoot,
      worktreePath,
      cellId,
    }),
  ]);
  return resolveReplyQuickPrompts({
    globalPrompts,
    projectPrompts,
    agentPrompts,
  });
}

async function setReplyQuickPrompts(params: any = {}) {
  const {
    scope = 'global',
    worktreePath,
    rootPath = '',
    projectRoot = '',
    cellId,
    prompts,
  } = params || {};
  if (scope === 'project') {
    return writeProjectReplyQuickPrompts({
      rootPath,
      projectRoot,
      worktreePath,
      prompts,
    });
  }
  if (scope === 'agent') {
    return writeAgentReplyQuickPrompts({
      rootPath,
      projectRoot,
      worktreePath,
      cellId,
      prompts,
    });
  }
  return writeGlobalReplyQuickPrompts(prompts);
}

export {
  getReplyQuickPrompts,
  normalizePromptText,
  resolveReplyQuickPrompts,
  setReplyQuickPrompts,
};
