const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const yaml = require('js-yaml');
const {
  getRepoRoot,
  listWorktrees,
  resolveBaseBranch,
  createWorktree,
  runGit,
} = require('./git');

const LIFECYCLE_DIR = '.agency';
const LIFECYCLE_PREFIX = 'cell-';
const LIFECYCLE_EXTS = ['.yaml', '.yml', '.md'];

async function listChangeDirs(changesDir) {
  if (!fs.existsSync(changesDir)) {
    return [];
  }
  const entries = await fsp.readdir(changesDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && entry.name !== 'archive')
    .map((entry) => path.join(changesDir, entry.name));
}

async function findSpecFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) {
    return results;
  }
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // eslint-disable-next-line no-await-in-loop
      results.push(...(await findSpecFiles(entryPath)));
    } else if (entry.isFile() && entry.name === 'spec.md') {
      results.push(entryPath);
    }
  }
  return results;
}

async function computeGates(worktreePath) {
  const gateResults = [];

  if (!worktreePath || !fs.existsSync(worktreePath)) {
    return [
      {
        id: 'spec-created',
        label: 'Spec created',
        passed: false,
        detail: 'Worktree path is missing.',
      },
      {
        id: 'checklist-complete',
        label: 'Checklist completed',
        passed: false,
        detail: 'Worktree path is missing.',
      },
      {
        id: 'merge-clean',
        label: 'No unresolved conflicts',
        passed: false,
        detail: 'Worktree path is missing.',
      },
    ];
  }

  const openspecDir = path.join(worktreePath, 'openspec');
  const changesDir = path.join(openspecDir, 'changes');
  const changeDirs = await listChangeDirs(changesDir);

  const specIssues = [];
  const checklistIssues = [];

  if (changeDirs.length === 0) {
    specIssues.push('No change proposal found in openspec/changes.');
    checklistIssues.push('No tasks.md found in openspec/changes.');
  }

  for (const changeDir of changeDirs) {
    const proposalPath = path.join(changeDir, 'proposal.md');
    const tasksPath = path.join(changeDir, 'tasks.md');
    const specsDir = path.join(changeDir, 'specs');

    if (!fs.existsSync(proposalPath)) {
      specIssues.push(`${path.basename(changeDir)} missing proposal.md`);
    }

    const specFiles = await findSpecFiles(specsDir);
    if (specFiles.length === 0) {
      specIssues.push(`${path.basename(changeDir)} missing spec deltas`);
    }

    if (!fs.existsSync(tasksPath)) {
      checklistIssues.push(`${path.basename(changeDir)} missing tasks.md`);
    } else {
      const tasksContent = await fsp.readFile(tasksPath, 'utf-8');
      if (tasksContent.match(/^\s*-\s*\[\s\]/m)) {
        checklistIssues.push(`${path.basename(changeDir)} has incomplete checklist`);
      }
    }
  }

  gateResults.push({
    id: 'spec-created',
    label: 'Spec created',
    passed: specIssues.length === 0,
    detail: specIssues.length ? specIssues.join(' ') : 'Spec proposal and deltas found.',
  });

  gateResults.push({
    id: 'checklist-complete',
    label: 'Checklist completed',
    passed: checklistIssues.length === 0,
    detail: checklistIssues.length ? checklistIssues.join(' ') : 'All checklists completed.',
  });

  try {
    const unmerged = await runGit(['ls-files', '-u'], { cwd: worktreePath });
    gateResults.push({
      id: 'merge-clean',
      label: 'No unresolved conflicts',
      passed: !unmerged,
      detail: unmerged ? 'Unresolved merge entries detected.' : 'No unresolved merge entries.',
    });
  } catch (error) {
    gateResults.push({
      id: 'merge-clean',
      label: 'No unresolved conflicts',
      passed: false,
      detail: 'Unable to check merge conflict status.',
    });
  }

  return gateResults;
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
  const gates = await computeGates(worktree.path);
  return {
    id: lifecycle.id || normalizeName(name),
    name,
    branch: worktree.branch || 'detached',
    worktreePath: worktree.path,
    state,
    lifecycleFile: lifecyclePath,
    gates,
    validation: {
      temporary: true,
      warnings: validationWarnings(repoRoot, worktree, lifecyclePath),
    },
  };
}

async function listCells() {
  const repoRoot = await getRepoRoot();
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

async function createCell({ name, branch, reusePath }) {
  const repoRoot = await getRepoRoot();
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
    });
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
  });

  return hydrateCell(repoRoot, {
    path: worktreePath,
    branch,
  });
}

async function updateCellState({ id, state, worktreePath }) {
  const repoRoot = await getRepoRoot();
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

  if (['active', 'archived'].includes(state)) {
    const gates = await computeGates(target.path);
    const failed = gates.filter((gate) => !gate.passed);
    if (failed.length) {
      const labels = failed.map((gate) => gate.label).join(', ');
      throw new Error(`Lifecycle gate blocked: ${labels}`);
    }
  }

  const lifecycle = await readLifecycleFile(lifecyclePath);
  lifecycle.state = state;
  lifecycle.updatedAt = new Date().toISOString();
  await writeLifecycleFile(lifecyclePath, lifecycle);
  return hydrateCell(repoRoot, target);
}

module.exports = {
  listCells,
  createCell,
  updateCellState,
  ensureWorktreeDir,
  buildLifecycleFilePath,
  normalizeName,
};
