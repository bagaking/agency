// @ts-nocheck
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const yaml = require('js-yaml');
const {
  getRepoRoot,
  listWorktrees,
  resolveBaseBranch,
  createWorktree,
} = require('./git');
const { resolveProjectRoot } = require('./projectRoot');
const { readConfig: readWorktreeLinksConfig, applyAllLinks } = require('./worktreeLinks');
const { checkGates } = require('./gates');

const LIFECYCLE_DIR = '.agency';
const LIFECYCLE_PREFIX = 'cell-';
const LIFECYCLE_EXTS = ['.yaml', '.yml', '.md'];
let AGENT_AVATAR_POOL = [];
try {
  const avatarBatch = require('@bagakit/open-agent-avatars/20260202/index.cjs');
  AGENT_AVATAR_POOL = Object.keys(avatarBatch || {});
} catch (error) {
  AGENT_AVATAR_POOL = [];
}


async function ensureWorktreeDir(repoRoot) {
  const preferred = path.join(repoRoot, '.worktrees');
  const fallback = path.join(repoRoot, 'worktrees');
  if (fs.existsSync(preferred)) {
    return preferred;
  }
  if (fs.existsSync(fallback)) {
    return fallback;
  }
  await fsp.mkdir(preferred, { recursive: true });
  await ensureGitignore(repoRoot, '.worktrees');
  return preferred;
}

async function ensureGitignore(repoRoot, entry) {
  const gitignorePath = path.join(repoRoot, '.gitignore');
  let content = '';
  try {
    content = await fsp.readFile(gitignorePath, 'utf-8');
  } catch (error) {
    content = '';
  }
  if (!content.split('\n').some((line) => line.trim() === entry)) {
    const next = content.endsWith('\n') || content.length === 0 ? content : `${content}\n`;
    await fsp.writeFile(gitignorePath, `${next}${entry}\n`, 'utf-8');
  }
}

function buildLifecycleFilePath(worktreePath, worktreeName) {
  const fileName = `${LIFECYCLE_PREFIX}${worktreeName}.yaml`;
  return path.join(worktreePath, LIFECYCLE_DIR, fileName);
}

async function readLifecycleFile(filePath) {
  const raw = await fsp.readFile(filePath, 'utf-8');
  const ext = path.extname(filePath);
  if (ext === '.md') {
    const match = raw.match(/^---\n([\s\S]*?)\n---/);
    if (match) {
      return yaml.load(match[1]) || {};
    }
    return {};
  }
  return yaml.load(raw) || {};
}

async function writeLifecycleFile(filePath, data) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  const content = yaml.dump(data, { lineWidth: 120 });
  await fsp.writeFile(filePath, content, 'utf-8');
}

async function findLifecycleFile(worktreePath) {
  const dir = path.join(worktreePath, LIFECYCLE_DIR);
  if (!fs.existsSync(dir)) {
    return null;
  }
  const entries = await fsp.readdir(dir);
  const candidate = entries.find((entry) =>
    LIFECYCLE_EXTS.includes(path.extname(entry)) && entry.startsWith(LIFECYCLE_PREFIX)
  );
  return candidate ? path.join(dir, candidate) : null;
}

function normalizeName(input) {
  return input.replace(/[^a-zA-Z0-9-_]/g, '-');
}

function hashString(input) {
  const text = String(input || '');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function resolveAvatarSymbol(seed) {
  if (!AGENT_AVATAR_POOL.length) {
    return '';
  }
  const index = hashString(seed) % AGENT_AVATAR_POOL.length;
  return AGENT_AVATAR_POOL[index];
}

function validationWarnings(repoRoot, worktree, lifecyclePath) {
  const warnings = [];
  if (!worktree.branch) {
    warnings.push('Worktree is detached or missing branch (temporary validation).');
  }
  if (!fs.existsSync(path.join(repoRoot, 'openspec'))) {
    warnings.push('OpenSpec directory not found (temporary validation).');
  } else {
    const changesDir = path.join(repoRoot, 'openspec', 'changes');
    const specsDir = path.join(repoRoot, 'openspec', 'specs');
    if (!fs.existsSync(changesDir) && !fs.existsSync(specsDir)) {
      warnings.push('No spec directories found (temporary validation).');
    }
  }
  if (!lifecyclePath) {
    warnings.push('Lifecycle file missing (temporary validation).');
  }
  return warnings;
}

async function hydrateCell(repoRoot, worktree) {
  const lifecyclePath = await findLifecycleFile(worktree.path);
  let lifecycle = {};
  if (lifecyclePath) {
    try {
      lifecycle = await readLifecycleFile(lifecyclePath);
    } catch (error) {
      lifecycle = {};
    }
  }
  const name = lifecycle.name || lifecycle.id || worktree.branch || path.basename(worktree.path);
  const state = lifecycle.state || 'draft';
  return {
    id: lifecycle.id || normalizeName(name),
    name,
    branch: worktree.branch || 'detached',
    worktreePath: worktree.path,
    state,
    createdAt: lifecycle.createdAt || null,
    avatar: lifecycle.avatar || resolveAvatarSymbol(lifecycle.id || name),
    lifecycleFile: lifecyclePath,
    gates: [],
    validation: {
      temporary: true,
      warnings: validationWarnings(repoRoot, worktree, lifecyclePath),
    },
  };
}

async function listCells({ rootPath } = {}) {
  const repoRoot = await resolveProjectRoot({ rootPath });
  if (!repoRoot) {
    return [];
  }
  const worktrees = await listWorktrees(repoRoot);
  const cells = [];
  for (const worktree of worktrees) {
    if (!worktree.path) {
      continue;
    }
    const cell = await hydrateCell(repoRoot, worktree);
    cells.push(cell);
  }
  return cells;
}

async function createCell({ name, branch, reusePath, rootPath }) {
  const repoRoot = await resolveProjectRoot({ rootPath });
  if (!repoRoot) {
    throw new Error('Project root is not configured.');
  }
  const now = new Date().toISOString();

  if (reusePath) {
    const worktrees = await listWorktrees(repoRoot);
    const target = worktrees.find((worktree) => path.resolve(worktree.path) === path.resolve(reusePath));
    if (!target) {
      throw new Error('Selected worktree not found.');
    }
    const resolvedName = name || path.basename(target.path);
    const worktreeName = path.basename(target.path);
    const safeName = normalizeName(resolvedName);
    const resolvedBranch = target.branch || branch;
    if (!resolvedBranch) {
      throw new Error('Branch is required for detached worktrees.');
    }
    const existingLifecycle = await findLifecycleFile(target.path);
    const lifecyclePath = existingLifecycle || buildLifecycleFilePath(target.path, worktreeName);
    let lifecycle = {};
    if (existingLifecycle) {
      try {
        lifecycle = await readLifecycleFile(existingLifecycle);
      } catch (error) {
        lifecycle = {};
      }
    }
    await writeLifecycleFile(lifecyclePath, {
      version: 1,
      id: lifecycle.id || safeName,
      name: resolvedName,
      branch: resolvedBranch,
      worktreePath: target.path,
      state: lifecycle.state || 'draft',
      createdAt: lifecycle.createdAt || now,
      updatedAt: now,
      avatar: lifecycle.avatar || resolveAvatarSymbol(lifecycle.id || safeName),
    });
    await maybeAutoLinkWorktree(repoRoot, target.path);
    return hydrateCell(repoRoot, {
      path: target.path,
      branch: resolvedBranch,
    });
  }

  if (!name || !branch) {
    throw new Error('Cell name and branch are required.');
  }
  const worktreeDir = await ensureWorktreeDir(repoRoot);
  const safeName = normalizeName(name);
  const worktreePath = path.join(worktreeDir, safeName);
  const worktreeName = path.basename(worktreePath);

  if (fs.existsSync(worktreePath)) {
    throw new Error(`Worktree already exists at ${worktreePath}`);
  }

  const baseBranch = await resolveBaseBranch(repoRoot);
  await createWorktree(repoRoot, worktreePath, branch, baseBranch);

  const lifecyclePath = buildLifecycleFilePath(worktreePath, worktreeName);
  await writeLifecycleFile(lifecyclePath, {
    version: 1,
    id: safeName,
    name,
    branch,
    worktreePath,
    state: 'draft',
    createdAt: now,
    updatedAt: now,
    avatar: resolveAvatarSymbol(safeName),
  });
  await maybeAutoLinkWorktree(repoRoot, worktreePath);

  return hydrateCell(repoRoot, {
    path: worktreePath,
    branch,
  });
}

async function maybeAutoLinkWorktree(repoRoot, worktreePath) {
  try {
    const config = await readWorktreeLinksConfig(repoRoot);
    if (!config.autoLinkOnCreate || !config.links.length) {
      return;
    }
    await applyAllLinks({ repoRoot, worktreePath, bestEffort: true });
  } catch (error) {
    // Avoid failing Cell creation if linking fails.
    console.warn('Auto-link worktree failed:', error?.message || error);
  }
}

async function updateCellState({ id, state, worktreePath }) {
  const repoRoot = worktreePath
    ? await getRepoRoot(worktreePath)
    : await resolveProjectRoot();
  if (!repoRoot) {
    throw new Error('Project root is not configured.');
  }
  const worktrees = await listWorktrees(repoRoot);
  const target = worktrees.find((worktree) => {
    if (worktreePath) {
      return path.resolve(worktree.path) === path.resolve(worktreePath);
    }
    return worktree.branch === id || worktree.path.includes(id);
  });
  if (!target) {
    throw new Error('Cell not found.');
  }
  const lifecyclePath = await findLifecycleFile(target.path);
  if (!lifecyclePath) {
    throw new Error('Lifecycle file missing.');
  }

  const lifecycle = await readLifecycleFile(lifecyclePath);

  if (['active', 'archived'].includes(state)) {
    const gates = await checkGates({
      worktreePath: target.path,
      stage: state,
      cellName: lifecycle.name || lifecycle.id,
    });
    const failed = gates.filter((gate) => !gate.passed);
    if (failed.length) {
      const labels = failed.map((gate) => gate.label).join(', ');
      throw new Error(`Lifecycle gate blocked: ${labels}`);
    }
  }

  lifecycle.state = state;
  lifecycle.updatedAt = new Date().toISOString();
  await writeLifecycleFile(lifecyclePath, lifecycle);
  return hydrateCell(repoRoot, target);
}

async function updateCellMeta({ id, worktreePath, avatar }) {
  const repoRoot = worktreePath
    ? await getRepoRoot(worktreePath)
    : await resolveProjectRoot();
  if (!repoRoot) {
    throw new Error('Project root is not configured.');
  }
  const worktrees = await listWorktrees(repoRoot);
  const target = worktrees.find((worktree) => {
    if (worktreePath) {
      return path.resolve(worktree.path) === path.resolve(worktreePath);
    }
    return worktree.branch === id || worktree.path.includes(id);
  });
  if (!target) {
    throw new Error('Cell not found.');
  }
  const lifecyclePath = await findLifecycleFile(target.path);
  const now = new Date().toISOString();
  const resolvedLifecyclePath = lifecyclePath || buildLifecycleFilePath(target.path, path.basename(target.path));
  let lifecycle = {};
  if (lifecyclePath) {
    lifecycle = await readLifecycleFile(lifecyclePath);
  } else {
    const fallbackName = id || target.branch || path.basename(target.path);
    lifecycle = {
      version: 1,
      id: normalizeName(fallbackName),
      name: fallbackName,
      branch: target.branch || 'detached',
      worktreePath: target.path,
      state: 'draft',
      createdAt: now,
    };
  }
  if (avatar === null || avatar === undefined || String(avatar).trim() === '') {
    delete lifecycle.avatar;
  } else {
    lifecycle.avatar = String(avatar).trim();
  }
  lifecycle.updatedAt = now;
  await writeLifecycleFile(resolvedLifecyclePath, lifecycle);
  return hydrateCell(repoRoot, target);
}

export {
  listCells,
  createCell,
  updateCellState,
  updateCellMeta,
  ensureWorktreeDir,
  buildLifecycleFilePath,
  normalizeName,
};
