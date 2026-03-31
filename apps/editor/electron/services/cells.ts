// @ts-nocheck
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const {
  getRepoRoot,
  listWorktrees,
  resolveBaseBranch,
  createWorktree,
  branchExists,
} = require('./git');
const { resolveProjectRoot } = require('./projectRoot');
const { readConfig: readWorktreeLinksConfig, applyAllLinks } = require('./worktreeLinks');
const { checkGates } = require('./gates');
const {
  CELL_ATTACHMENT_STATES,
  getCellRecordPath,
  readCellRecord,
  writeCellRecord,
  listCellRecords,
  deleteCellRecord,
  normalizeCellRecord,
} = require('./cellStore');

const fsp = fs.promises;

const LIFECYCLE_DIR = '.agency';
const LIFECYCLE_PREFIX = 'cell-';
const LIFECYCLE_EXTS = ['.yaml', '.yml', '.md'];
let AGENT_AVATAR_POOL = [];
try {
  const avatarBatch = require('@bagakit/open-agent-avatars/20260202/index.cjs');
  AGENT_AVATAR_POOL = Object.keys(avatarBatch || {});
} catch (_error) {
  AGENT_AVATAR_POOL = [];
}

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizePathValue(value) {
  const normalized = normalizeText(value);
  return normalized ? path.resolve(normalized) : '';
}

function samePath(left, right) {
  const normalizedLeft = normalizePathValue(left);
  const normalizedRight = normalizePathValue(right);
  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
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
  } catch (_error) {
    content = '';
  }
  if (!content.split('\n').some((line) => line.trim() === entry)) {
    const next = content.endsWith('\n') || content.length === 0 ? content : `${content}\n`;
    await fsp.writeFile(gitignorePath, `${next}${entry}\n`, 'utf-8');
  }
}

function buildLegacyLifecycleFilePath(worktreePath, worktreeName) {
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
  return String(input || '')
    .trim()
    .replace(/[^a-zA-Z0-9-_]/g, '-');
}

function hashString(input) {
  const text = String(input || '');
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) | 0;
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

function buildCellComparisonKey(record) {
  if (!record) {
    return '';
  }
  return JSON.stringify({
    id: normalizeText(record.id),
    name: normalizeText(record.name),
    branch: normalizeText(record.branch),
    state: normalizeText(record.state),
    attachmentState: normalizeText(record.attachmentState),
    worktreePath: normalizePathValue(record.worktreePath),
    lastKnownWorktreePath: normalizePathValue(record.lastKnownWorktreePath),
    avatar: normalizeText(record.avatar),
  });
}

function validationWarnings(repoRoot, cell) {
  const warnings = [];
  if (cell.attachmentState === CELL_ATTACHMENT_STATES.detached) {
    warnings.push('Cell worktree attachment is detached.');
  }
  if (cell.attachmentState === CELL_ATTACHMENT_STATES.missing) {
    warnings.push('Cell worktree attachment is missing.');
  }
  if (!normalizeText(cell.branch)) {
    warnings.push('Cell branch metadata is missing.');
  }
  if (!fs.existsSync(path.join(repoRoot, 'openspec'))) {
    warnings.push('OpenSpec directory not found (temporary validation).');
  }
  return warnings;
}

function buildHydratedCell(repoRoot, record, attachedWorktree = null) {
  const attachedWorktreePath = normalizePathValue(attachedWorktree?.path);
  const lastKnownWorktreePath = normalizePathValue(
    attachedWorktreePath || record.lastKnownWorktreePath || record.worktreePath
  );
  const attachmentState = attachedWorktreePath
    ? CELL_ATTACHMENT_STATES.attached
    : normalizeText(record.attachmentState) === CELL_ATTACHMENT_STATES.missing
      ? CELL_ATTACHMENT_STATES.missing
      : lastKnownWorktreePath && fs.existsSync(lastKnownWorktreePath)
        ? CELL_ATTACHMENT_STATES.detached
        : CELL_ATTACHMENT_STATES.missing;
  const lifecycleState = normalizeText(record.state) || 'draft';
  return {
    id: record.id,
    name: record.name,
    projectRoot: repoRoot,
    branch: normalizeText(attachedWorktree?.branch || record.branch || ''),
    worktreePath: lastKnownWorktreePath,
    attachedWorktreePath,
    attachmentState,
    state: lifecycleState,
    lifecycleState,
    createdAt: record.createdAt || null,
    updatedAt: record.updatedAt || null,
    avatar: record.avatar || resolveAvatarSymbol(record.id || record.name),
    lifecycleFile: getCellRecordPath(repoRoot, record.id),
    gates: [],
    validation: {
      temporary: true,
      warnings: validationWarnings(repoRoot, {
        ...record,
        attachmentState,
        branch: attachedWorktree?.branch || record.branch,
      }),
    },
  };
}

function resolveMatchingRecordForWorktree(records, legacy, worktreePath) {
  const legacyId = normalizeName(legacy?.id || legacy?.name || '');
  if (legacyId) {
    const byLegacyId = records.find((record) => normalizeText(record.id) === legacyId);
    if (byLegacyId) {
      return byLegacyId;
    }
  }
  return (
    records.find(
      (record) =>
        samePath(record.worktreePath, worktreePath) || samePath(record.lastKnownWorktreePath, worktreePath)
    ) || null
  );
}

function buildAttachedRecord({ existing, legacy, worktree, now }) {
  const worktreePath = normalizePathValue(worktree?.path);
  const resolvedName =
    normalizeText(legacy?.name || existing?.name || legacy?.id || path.basename(worktreePath)) ||
    path.basename(worktreePath) ||
    normalizeText(worktree?.branch) ||
    'cell';
  return normalizeCellRecord(
    {
      ...(existing || {}),
      id: existing?.id || legacy?.id || normalizeName(resolvedName),
      name: resolvedName,
      branch: normalizeText(worktree?.branch || legacy?.branch || existing?.branch || ''),
      state: normalizeText(legacy?.state || existing?.state || existing?.lifecycleState || 'draft'),
      attachmentState: CELL_ATTACHMENT_STATES.attached,
      worktreePath,
      lastKnownWorktreePath: worktreePath,
      avatar: normalizeText(legacy?.avatar || existing?.avatar || ''),
      createdAt: legacy?.createdAt || existing?.createdAt || now,
      updatedAt: now,
    },
    existing || legacy || {}
  );
}

function buildUnattachedRecord(record, now) {
  const lastKnownWorktreePath = normalizePathValue(record.lastKnownWorktreePath || record.worktreePath);
  return normalizeCellRecord(
    {
      ...record,
      attachmentState:
        lastKnownWorktreePath && fs.existsSync(lastKnownWorktreePath)
          ? CELL_ATTACHMENT_STATES.detached
          : CELL_ATTACHMENT_STATES.missing,
      worktreePath: '',
      lastKnownWorktreePath,
      updatedAt: now,
    },
    record
  );
}

async function readLegacyLifecycleForWorktree(worktreePath) {
  const lifecyclePath = await findLifecycleFile(worktreePath);
  if (!lifecyclePath) {
    return { lifecyclePath: '', lifecycle: {} };
  }
  try {
    return {
      lifecyclePath,
      lifecycle: await readLifecycleFile(lifecyclePath),
    };
  } catch (_error) {
    return {
      lifecyclePath,
      lifecycle: {},
    };
  }
}

async function reconcileCells(repoRoot) {
  const now = new Date().toISOString();
  const worktrees = await listWorktrees(repoRoot);
  const storedRecords = await listCellRecords(repoRoot);
  const records = [...storedRecords];
  const recordsById = new Map(storedRecords.map((record) => [record.id, record]));
  const attachedWorktreesByCellId = new Map();
  const orderedIds = [];

  for (const worktree of worktrees) {
    if (!normalizeText(worktree?.path)) {
      continue;
    }
    const { lifecycle } = await readLegacyLifecycleForWorktree(worktree.path);
    const existing = resolveMatchingRecordForWorktree(records, lifecycle, worktree.path);
    const nextRecord = buildAttachedRecord({
      existing,
      legacy: lifecycle,
      worktree,
      now,
    });
    const previous = existing || recordsById.get(nextRecord.id) || null;
    if (buildCellComparisonKey(previous) !== buildCellComparisonKey(nextRecord)) {
      await writeCellRecord(repoRoot, nextRecord);
    }
    recordsById.set(nextRecord.id, nextRecord);
    attachedWorktreesByCellId.set(nextRecord.id, worktree);
    if (!records.some((record) => record.id === nextRecord.id)) {
      records.push(nextRecord);
    }
    if (!orderedIds.includes(nextRecord.id)) {
      orderedIds.push(nextRecord.id);
    }
  }

  for (const [cellId, record] of recordsById.entries()) {
    if (attachedWorktreesByCellId.has(cellId)) {
      continue;
    }
    const nextRecord = buildUnattachedRecord(record, now);
    if (buildCellComparisonKey(record) !== buildCellComparisonKey(nextRecord)) {
      await writeCellRecord(repoRoot, nextRecord);
      recordsById.set(cellId, nextRecord);
    }
  }

  const remainingIds = Array.from(recordsById.keys())
    .filter((cellId) => !orderedIds.includes(cellId))
    .sort((left, right) => left.localeCompare(right));

  return [...orderedIds, ...remainingIds].map((cellId) =>
    buildHydratedCell(repoRoot, recordsById.get(cellId), attachedWorktreesByCellId.get(cellId))
  );
}

async function listCells({ rootPath } = {}) {
  const repoRoot = await resolveProjectRoot({ rootPath });
  if (!repoRoot) {
    return [];
  }
  return reconcileCells(repoRoot);
}

async function resolveCellContext({ cellId, worktreePath, rootPath } = {}) {
  const repoRoot = await resolveProjectRoot({ rootPath: rootPath || worktreePath });
  if (!repoRoot) {
    return {
      repoRoot: '',
      cell: null,
      worktreePath: normalizePathValue(worktreePath),
      attachedWorktreePath: '',
    };
  }
  const cells = await listCells({ rootPath: repoRoot });
  const normalizedCellId = normalizeText(cellId);
  const normalizedWorktreePath = normalizePathValue(worktreePath);
  const cell =
    cells.find((candidate) => normalizeText(candidate.id) === normalizedCellId) ||
    cells.find(
      (candidate) =>
        samePath(candidate.worktreePath, normalizedWorktreePath) ||
        samePath(candidate.attachedWorktreePath, normalizedWorktreePath)
    ) ||
    null;
  return {
    repoRoot,
    cell,
    worktreePath: normalizePathValue(cell?.worktreePath || normalizedWorktreePath),
    attachedWorktreePath: normalizePathValue(cell?.attachedWorktreePath),
  };
}

function deriveCellNameFromBranch(branch) {
  const normalized = normalizeText(branch);
  if (!normalized) {
    return '';
  }
  const parts = normalized.split('/').filter(Boolean);
  return parts[parts.length - 1] || normalized;
}

async function bindExistingWorktreeCell({ repoRoot, target, explicitName = '', explicitBranch = '', now }) {
  const { lifecycle } = await readLegacyLifecycleForWorktree(target.path);
  const cells = await listCells({ rootPath: repoRoot });
  const existing =
    cells.find((cell) => samePath(cell.attachedWorktreePath, target.path) || samePath(cell.worktreePath, target.path)) ||
    null;
  const resolvedBranch = normalizeText(target.branch || explicitBranch || existing?.branch || lifecycle?.branch);
  if (!resolvedBranch) {
    throw new Error('Branch is required for existing worktrees.');
  }
  const resolvedName =
    normalizeText(
      explicitName ||
        existing?.name ||
        lifecycle?.name ||
        deriveCellNameFromBranch(resolvedBranch) ||
        path.basename(target.path)
    ) || path.basename(target.path);
  const nextRecord = normalizeCellRecord({
    id: existing?.id || lifecycle?.id || normalizeName(resolvedName),
    name: resolvedName,
    branch: resolvedBranch,
    state: lifecycle?.state || existing?.state || 'draft',
    attachmentState: CELL_ATTACHMENT_STATES.attached,
    worktreePath: target.path,
    lastKnownWorktreePath: target.path,
    avatar: lifecycle?.avatar || existing?.avatar || resolveAvatarSymbol(existing?.id || resolvedName),
    createdAt: existing?.createdAt || lifecycle?.createdAt || now,
    updatedAt: now,
  });
  await writeCellRecord(repoRoot, nextRecord);
  await maybeAutoLinkWorktree(repoRoot, target.path);
  const cellsAfterCreate = await listCells({ rootPath: repoRoot });
  return cellsAfterCreate.find((cell) => cell.id === nextRecord.id) || buildHydratedCell(repoRoot, nextRecord, target);
}

async function createCell({ name, branch, baseBranch, existingBranch, reusePath, rootPath }) {
  const repoRoot = await resolveProjectRoot({ rootPath });
  if (!repoRoot) {
    throw new Error('Project root is not configured.');
  }
  const now = new Date().toISOString();

  if (reusePath) {
    const worktrees = await listWorktrees(repoRoot);
    const target = worktrees.find((worktree) => samePath(worktree.path, reusePath));
    if (!target) {
      throw new Error('Selected worktree not found.');
    }
    return bindExistingWorktreeCell({
      repoRoot,
      target,
      explicitName: name,
      explicitBranch: branch,
      now,
    });
  }

  if (existingBranch) {
    const resolvedExistingBranch = normalizeText(existingBranch);
    if (!resolvedExistingBranch) {
      throw new Error('Existing branch is required.');
    }
    if (!(await branchExists(repoRoot, resolvedExistingBranch))) {
      throw new Error(`Selected branch not found: ${resolvedExistingBranch}`);
    }
    const worktrees = await listWorktrees(repoRoot);
    const attachedTarget = worktrees.find((worktree) => normalizeText(worktree.branch) === resolvedExistingBranch);
    if (attachedTarget) {
      return bindExistingWorktreeCell({
        repoRoot,
        target: attachedTarget,
        explicitName: name,
        explicitBranch: resolvedExistingBranch,
        now,
      });
    }

    const worktreeDir = await ensureWorktreeDir(repoRoot);
    const resolvedName = normalizeText(name || deriveCellNameFromBranch(resolvedExistingBranch) || resolvedExistingBranch);
    const safeName = normalizeName(resolvedName);
    const worktreePath = path.join(worktreeDir, safeName);
    if (fs.existsSync(worktreePath)) {
      throw new Error(`Worktree already exists at ${worktreePath}`);
    }

    await createWorktree(repoRoot, worktreePath, resolvedExistingBranch, resolvedExistingBranch);
    const nextRecord = normalizeCellRecord({
      id: safeName,
      name: resolvedName,
      branch: resolvedExistingBranch,
      state: 'draft',
      attachmentState: CELL_ATTACHMENT_STATES.attached,
      worktreePath,
      lastKnownWorktreePath: worktreePath,
      avatar: resolveAvatarSymbol(safeName),
      createdAt: now,
      updatedAt: now,
    });
    await writeCellRecord(repoRoot, nextRecord);
    await maybeAutoLinkWorktree(repoRoot, worktreePath);
    const cellsAfterCreate = await listCells({ rootPath: repoRoot });
    return cellsAfterCreate.find((cell) => cell.id === nextRecord.id) || buildHydratedCell(repoRoot, nextRecord, { path: worktreePath, branch: resolvedExistingBranch });
  }

  if (!name || !branch) {
    throw new Error('Cell name and branch are required.');
  }
  const worktreeDir = await ensureWorktreeDir(repoRoot);
  const safeName = normalizeName(name);
  const worktreePath = path.join(worktreeDir, safeName);

  if (fs.existsSync(worktreePath)) {
    throw new Error(`Worktree already exists at ${worktreePath}`);
  }

  const resolvedBaseBranch = normalizeText(baseBranch) || (await resolveBaseBranch(repoRoot));
  if (!(await branchExists(repoRoot, resolvedBaseBranch))) {
    throw new Error(`Base branch not found: ${resolvedBaseBranch}`);
  }
  await createWorktree(repoRoot, worktreePath, branch, resolvedBaseBranch);

  const nextRecord = normalizeCellRecord({
    id: safeName,
    name,
    branch,
    state: 'draft',
    attachmentState: CELL_ATTACHMENT_STATES.attached,
    worktreePath,
    lastKnownWorktreePath: worktreePath,
    avatar: resolveAvatarSymbol(safeName),
    createdAt: now,
    updatedAt: now,
  });
  await writeCellRecord(repoRoot, nextRecord);
  await maybeAutoLinkWorktree(repoRoot, worktreePath);

  const cellsAfterCreate = await listCells({ rootPath: repoRoot });
  return cellsAfterCreate.find((cell) => cell.id === nextRecord.id) || buildHydratedCell(repoRoot, nextRecord, { path: worktreePath, branch });
}

async function maybeAutoLinkWorktree(repoRoot, worktreePath) {
  try {
    const config = await readWorktreeLinksConfig(repoRoot);
    if (!config.autoLinkOnCreate || !config.links.length) {
      return;
    }
    await applyAllLinks({ repoRoot, worktreePath, bestEffort: true });
  } catch (error) {
    console.warn('Auto-link worktree failed:', error?.message || error);
  }
}

async function updateCellState({ id, state, worktreePath, rootPath }) {
  const context = await resolveCellContext({
    cellId: id,
    worktreePath,
    rootPath,
  });
  if (!context.repoRoot) {
    throw new Error('Project root is not configured.');
  }
  if (!context.cell) {
    throw new Error('Cell not found.');
  }
  const record =
    (await readCellRecord(context.repoRoot, context.cell.id)) ||
    normalizeCellRecord({
      id: context.cell.id,
      name: context.cell.name,
      branch: context.cell.branch,
      state: context.cell.state,
      attachmentState: context.cell.attachmentState,
      worktreePath: context.attachedWorktreePath,
      lastKnownWorktreePath: context.worktreePath,
      avatar: context.cell.avatar,
    });

  const normalizedState = normalizeText(state);
  if (['active', 'archived'].includes(normalizedState) && context.attachedWorktreePath) {
    const gates = await checkGates({
      worktreePath: context.attachedWorktreePath,
      stage: normalizedState,
      cellName: record.name || record.id,
    });
    const failed = gates.filter((gate) => !gate.passed);
    if (failed.length) {
      const labels = failed.map((gate) => gate.label).join(', ');
      throw new Error(`Lifecycle gate blocked: ${labels}`);
    }
  }

  await writeCellRecord(context.repoRoot, {
    ...record,
    state: normalizedState || record.state,
    updatedAt: new Date().toISOString(),
  });
  const cells = await listCells({ rootPath: context.repoRoot });
  return cells.find((cell) => cell.id === context.cell.id) || context.cell;
}

async function updateCellMeta({ id, worktreePath, rootPath, avatar }) {
  const context = await resolveCellContext({
    cellId: id,
    worktreePath,
    rootPath,
  });
  if (!context.repoRoot) {
    throw new Error('Project root is not configured.');
  }
  if (!context.cell) {
    throw new Error('Cell not found.');
  }
  const record =
    (await readCellRecord(context.repoRoot, context.cell.id)) ||
    normalizeCellRecord({
      id: context.cell.id,
      name: context.cell.name,
      branch: context.cell.branch,
      state: context.cell.state,
      attachmentState: context.cell.attachmentState,
      worktreePath: context.attachedWorktreePath,
      lastKnownWorktreePath: context.worktreePath,
      avatar: context.cell.avatar,
    });
  const nextRecord = {
    ...record,
    updatedAt: new Date().toISOString(),
  };
  if (avatar === null || avatar === undefined || String(avatar).trim() === '') {
    delete nextRecord.avatar;
  } else {
    nextRecord.avatar = String(avatar).trim();
  }
  await writeCellRecord(context.repoRoot, nextRecord);
  const cells = await listCells({ rootPath: context.repoRoot });
  return cells.find((cell) => cell.id === context.cell.id) || context.cell;
}

async function clearCellAttachment({ id, worktreePath, rootPath }) {
  const context = await resolveCellContext({
    cellId: id,
    worktreePath,
    rootPath,
  });
  if (!context.repoRoot) {
    throw new Error('Project root is not configured.');
  }
  if (!context.cell) {
    throw new Error('Cell not found.');
  }
  const record = await readCellRecord(context.repoRoot, context.cell.id);
  if (!record) {
    throw new Error('Cell record not found.');
  }
  await writeCellRecord(context.repoRoot, {
    ...record,
    attachmentState:
      context.worktreePath && fs.existsSync(context.worktreePath)
        ? CELL_ATTACHMENT_STATES.detached
        : CELL_ATTACHMENT_STATES.missing,
    worktreePath: '',
    lastKnownWorktreePath: context.worktreePath || record.lastKnownWorktreePath,
    updatedAt: new Date().toISOString(),
  });
  const cells = await listCells({ rootPath: context.repoRoot });
  return cells.find((cell) => cell.id === context.cell.id) || context.cell;
}

async function deleteCell({ id, worktreePath, rootPath }) {
  const context = await resolveCellContext({
    cellId: id,
    worktreePath,
    rootPath,
  });
  if (!context.repoRoot) {
    throw new Error('Project root is not configured.');
  }
  if (!context.cell) {
    throw new Error('Cell not found.');
  }
  await deleteCellRecord(context.repoRoot, context.cell.id);
  return {
    ok: true,
    id: context.cell.id,
  };
}

module.exports = {
  listCells,
  createCell,
  updateCellState,
  updateCellMeta,
  clearCellAttachment,
  deleteCell,
  resolveCellContext,
  ensureWorktreeDir,
  buildLegacyLifecycleFilePath,
  normalizeName,
};

export {};
