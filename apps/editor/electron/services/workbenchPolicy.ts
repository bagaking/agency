const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const { resolveProjectRoot } = require('./projectRoot');
const {
  normalizeWorkbenchProjectLanguageRules,
} = require('../../shared/workbenchLanguageCore');

const fsp = fs.promises;

const DEFAULT_WORKBENCH_PROJECT_POLICY = Object.freeze({
  languages: {
    overrides: [],
  },
});

const CONFIG_FILENAMES = ['workbench.yaml', 'workbench.yml'];

function normalizeWorkbenchProjectPolicy(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const languages =
    source.languages && typeof source.languages === 'object' && !Array.isArray(source.languages)
      ? source.languages
      : {};
  return {
    languages: {
      overrides: normalizeWorkbenchProjectLanguageRules(languages.overrides),
    },
  };
}

async function findWorkbenchPolicyPath(projectRoot) {
  if (!projectRoot) {
    return '';
  }
  for (const filename of CONFIG_FILENAMES) {
    const candidate = path.join(projectRoot, '.agency', filename);
    try {
      await fsp.access(candidate, fs.constants.F_OK);
      return candidate;
    } catch (_error) {
      // Continue.
    }
  }
  return '';
}

async function readWorkbenchProjectPolicy({ rootPath }: any = {}) {
  const projectRoot = await resolveProjectRoot({ rootPath });
  if (!projectRoot) {
    return {
      projectRoot: '',
      sourcePath: '',
      policy: { ...DEFAULT_WORKBENCH_PROJECT_POLICY },
      warnings: [],
    };
  }

  const sourcePath = await findWorkbenchPolicyPath(projectRoot);
  if (!sourcePath) {
    return {
      projectRoot,
      sourcePath: '',
      policy: { ...DEFAULT_WORKBENCH_PROJECT_POLICY },
      warnings: [],
    };
  }

  const raw = await fsp.readFile(sourcePath, 'utf8');
  let parsed: any = {};
  try {
    parsed = yaml.load(raw) || {};
  } catch (error) {
    return {
      projectRoot,
      sourcePath,
      policy: { ...DEFAULT_WORKBENCH_PROJECT_POLICY },
      warnings: [
        `Failed to parse .agency/${path.basename(sourcePath)}: ${error?.message || String(error)}`,
      ],
    };
  }
  const rawOverrideCount = Array.isArray(parsed?.languages?.overrides)
    ? parsed.languages.overrides.length
    : 0;
  const policy = normalizeWorkbenchProjectPolicy(parsed);
  return {
    projectRoot,
    sourcePath,
    policy,
    warnings:
      rawOverrideCount > policy.languages.overrides.length
        ? ['Ignored invalid or unsupported workbench language rules.']
        : [],
  };
}

module.exports = {
  DEFAULT_WORKBENCH_PROJECT_POLICY,
  normalizeWorkbenchProjectPolicy,
  readWorkbenchProjectPolicy,
};

export {};
