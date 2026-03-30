const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const { resolveProjectRoot } = require('./projectRoot');

const fsp = fs.promises;

const DEFAULT_EXPLORER_PROJECT_POLICY = Object.freeze({
  filters: {},
  workingSet: {
    defaultView: 'tree',
    presets: [],
  },
  search: {
    defaultMode: 'path',
    content: {
      defaultScope: 'project',
      caseSensitive: false,
      wholeWord: false,
      useRegex: false,
    },
  },
  actions: {
    hiddenCommands: [],
  },
  research: {
    enabled: true,
    allowMemoCapture: true,
    allowMarkdownSave: true,
  },
});

const CONFIG_FILENAMES = ['explorer.yaml', 'explorer.yml'];

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set();
  return value
    .map((entry) => String(entry || '').trim())
    .filter((entry) => {
      if (!entry || seen.has(entry)) {
        return false;
      }
      seen.add(entry);
      return true;
    });
}

function normalizeFilterDefaults(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  const normalized = {};
  Object.entries(value).forEach(([key, entryValue]) => {
    const normalizedKey = String(key || '').trim();
    if (!normalizedKey) {
      return;
    }
    if (typeof entryValue === 'boolean') {
      normalized[normalizedKey] = entryValue;
      return;
    }
    if (Array.isArray(entryValue)) {
      normalized[normalizedKey] = normalizeStringArray(entryValue);
    }
  });
  return normalized;
}

function normalizeWorkingSetPolicy(value) {
  const workingSet =
    value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    defaultView:
      typeof workingSet.defaultView === 'string' && workingSet.defaultView.trim()
        ? workingSet.defaultView.trim()
        : DEFAULT_EXPLORER_PROJECT_POLICY.workingSet.defaultView,
    presets: normalizeStringArray(workingSet.presets),
  };
}

function normalizeSearchPolicy(value) {
  const search = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const content = search.content && typeof search.content === 'object' ? search.content : {};
  return {
    defaultMode:
      search.defaultMode === 'content'
        ? 'content'
        : DEFAULT_EXPLORER_PROJECT_POLICY.search.defaultMode,
    content: {
      defaultScope:
        typeof content.defaultScope === 'string' && content.defaultScope.trim()
          ? content.defaultScope.trim()
          : DEFAULT_EXPLORER_PROJECT_POLICY.search.content.defaultScope,
      caseSensitive:
        typeof content.caseSensitive === 'boolean'
          ? content.caseSensitive
          : DEFAULT_EXPLORER_PROJECT_POLICY.search.content.caseSensitive,
      wholeWord:
        typeof content.wholeWord === 'boolean'
          ? content.wholeWord
          : DEFAULT_EXPLORER_PROJECT_POLICY.search.content.wholeWord,
      useRegex:
        typeof content.useRegex === 'boolean'
          ? content.useRegex
          : DEFAULT_EXPLORER_PROJECT_POLICY.search.content.useRegex,
    },
  };
}

function normalizeActionPolicy(value) {
  const actions = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    hiddenCommands: normalizeStringArray(actions.hiddenCommands),
  };
}

function normalizeResearchPolicy(value) {
  const research = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    enabled:
      typeof research.enabled === 'boolean'
        ? research.enabled
        : DEFAULT_EXPLORER_PROJECT_POLICY.research.enabled,
    allowMemoCapture:
      typeof research.allowMemoCapture === 'boolean'
        ? research.allowMemoCapture
        : DEFAULT_EXPLORER_PROJECT_POLICY.research.allowMemoCapture,
    allowMarkdownSave:
      typeof research.allowMarkdownSave === 'boolean'
        ? research.allowMarkdownSave
        : DEFAULT_EXPLORER_PROJECT_POLICY.research.allowMarkdownSave,
  };
}

function normalizeExplorerProjectPolicy(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};

  return {
    filters: normalizeFilterDefaults(source.filters),
    workingSet: normalizeWorkingSetPolicy(source.workingSet),
    search: normalizeSearchPolicy(source.search),
    actions: normalizeActionPolicy(source.actions),
    research: normalizeResearchPolicy(source.research),
  };
}

async function findExplorerPolicyPath(projectRoot) {
  if (!projectRoot) {
    return '';
  }
  for (const filename of CONFIG_FILENAMES) {
    const candidate = path.join(projectRoot, '.agency', filename);
    try {
      await fsp.access(candidate, fs.constants.F_OK);
      return candidate;
    } catch (_error) {
      // Continue to the next candidate.
    }
  }
  return '';
}

async function readExplorerProjectPolicy({ rootPath }: any = {}) {
  const projectRoot = await resolveProjectRoot({ rootPath });
  if (!projectRoot) {
    return {
      projectRoot: '',
      sourcePath: '',
      policy: { ...DEFAULT_EXPLORER_PROJECT_POLICY },
      warnings: [],
    };
  }

  const sourcePath = await findExplorerPolicyPath(projectRoot);
  if (!sourcePath) {
    return {
      projectRoot,
      sourcePath: '',
      policy: { ...DEFAULT_EXPLORER_PROJECT_POLICY },
      warnings: [],
    };
  }

  const raw = await fsp.readFile(sourcePath, 'utf8');
  const parsed = yaml.load(raw) || {};
  return {
    projectRoot,
    sourcePath,
    policy: normalizeExplorerProjectPolicy(parsed),
    warnings: [],
  };
}

module.exports = {
  DEFAULT_EXPLORER_PROJECT_POLICY,
  normalizeExplorerProjectPolicy,
  readExplorerProjectPolicy,
};

export {};
