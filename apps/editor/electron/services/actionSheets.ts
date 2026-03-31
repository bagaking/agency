// @ts-nocheck
/**
 * Thin facade over `@agency/agency-data` Action Sheet repositories.
 *
 * We preserve the existing storage contract:
 * - Action Sheets are stored under `<repoRoot>/.agency/action-sheets`
 * - Shell checks run with `cwd=<repoRoot>` so relative plan/check paths work.
 */

const { getRepoRoot } = require('./git');
const agencyData = require('@agency/agency-data');

function normalizeText(value) {
  return String(value || '').trim();
}

async function resolveActionSheetPaths({ worktreePath = '', rootPath = '', projectRoot = '' } = {}) {
  const scopeRoot = normalizeText(projectRoot || rootPath || worktreePath);
  if (!scopeRoot) {
    return { repoRootPath: '', worktreePath: '' };
  }
  try {
    const repoRootPath = await getRepoRoot(scopeRoot);
    return {
      repoRootPath,
      worktreePath: normalizeText(worktreePath) || repoRootPath,
    };
  } catch (error) {
    const normalized = normalizeText(scopeRoot);
    return {
      repoRootPath: normalized,
      worktreePath: normalizeText(worktreePath) || normalized,
    };
  }
}

async function listActionSheets({ worktreePath = '', rootPath = '', projectRoot = '', includeArchived = false } = {}) {
  const { repoRootPath, worktreePath: resolvedWorktreePath } = await resolveActionSheetPaths({
    worktreePath,
    rootPath,
    projectRoot,
  });
  if (!repoRootPath) {
    throw new Error('projectRoot, rootPath, or worktreePath is required.');
  }
  return agencyData.listActionSheets({
    worktreePath: resolvedWorktreePath || repoRootPath,
    repoRootPath,
    includeArchived,
  });
}

async function readActionSheet({ worktreePath = '', rootPath = '', projectRoot = '', id } = {}) {
  if (!id) {
    throw new Error('actionSheet id is required.');
  }
  const { repoRootPath, worktreePath: resolvedWorktreePath } = await resolveActionSheetPaths({
    worktreePath,
    rootPath,
    projectRoot,
  });
  if (!repoRootPath) {
    throw new Error('projectRoot, rootPath, or worktreePath is required.');
  }
  return agencyData.readActionSheet({
    worktreePath: resolvedWorktreePath || repoRootPath,
    repoRootPath,
    id,
  });
}

async function createActionSheet({ worktreePath = '', rootPath = '', projectRoot = '', payload = {} } = {}) {
  const { repoRootPath, worktreePath: resolvedWorktreePath } = await resolveActionSheetPaths({
    worktreePath,
    rootPath,
    projectRoot,
  });
  if (!repoRootPath) {
    throw new Error('projectRoot, rootPath, or worktreePath is required.');
  }
  return agencyData.createActionSheet({
    worktreePath: resolvedWorktreePath || repoRootPath,
    repoRootPath,
    payload,
  });
}

async function updateActionSheetStatus({ worktreePath = '', rootPath = '', projectRoot = '', id, patch = {} } = {}) {
  if (!id) {
    throw new Error('actionSheet id is required.');
  }
  const { repoRootPath, worktreePath: resolvedWorktreePath } = await resolveActionSheetPaths({
    worktreePath,
    rootPath,
    projectRoot,
  });
  if (!repoRootPath) {
    throw new Error('projectRoot, rootPath, or worktreePath is required.');
  }
  return agencyData.updateActionSheetStatus({
    worktreePath: resolvedWorktreePath || repoRootPath,
    repoRootPath,
    id,
    patch,
  });
}

async function archiveActionSheet({ worktreePath = '', rootPath = '', projectRoot = '', id } = {}) {
  if (!id) {
    throw new Error('actionSheet id is required.');
  }
  const { repoRootPath, worktreePath: resolvedWorktreePath } = await resolveActionSheetPaths({
    worktreePath,
    rootPath,
    projectRoot,
  });
  if (!repoRootPath) {
    throw new Error('projectRoot, rootPath, or worktreePath is required.');
  }
  return agencyData.archiveActionSheet({
    worktreePath: resolvedWorktreePath || repoRootPath,
    repoRootPath,
    id,
  });
}

async function deleteActionSheet({ worktreePath = '', rootPath = '', projectRoot = '', id } = {}) {
  if (!id) {
    throw new Error('actionSheet id is required.');
  }
  const { repoRootPath, worktreePath: resolvedWorktreePath } = await resolveActionSheetPaths({
    worktreePath,
    rootPath,
    projectRoot,
  });
  if (!repoRootPath) {
    throw new Error('projectRoot, rootPath, or worktreePath is required.');
  }
  return agencyData.deleteActionSheet({
    worktreePath: resolvedWorktreePath || repoRootPath,
    repoRootPath,
    id,
  });
}

async function updateActionSheetPlan({ worktreePath = '', rootPath = '', projectRoot = '', id, plan } = {}) {
  if (!id) {
    throw new Error('actionSheet id is required.');
  }
  const { repoRootPath, worktreePath: resolvedWorktreePath } = await resolveActionSheetPaths({
    worktreePath,
    rootPath,
    projectRoot,
  });
  if (!repoRootPath) {
    throw new Error('projectRoot, rootPath, or worktreePath is required.');
  }
  return agencyData.updateActionSheetPlan({
    worktreePath: resolvedWorktreePath || repoRootPath,
    repoRootPath,
    id,
    plan,
  });
}

async function updateActionSheetPrompt({ worktreePath = '', rootPath = '', projectRoot = '', id, prompt } = {}) {
  if (!id) {
    throw new Error('actionSheet id is required.');
  }
  const { repoRootPath, worktreePath: resolvedWorktreePath } = await resolveActionSheetPaths({
    worktreePath,
    rootPath,
    projectRoot,
  });
  if (!repoRootPath) {
    throw new Error('projectRoot, rootPath, or worktreePath is required.');
  }
  return agencyData.updateActionSheetPrompt({
    worktreePath: resolvedWorktreePath || repoRootPath,
    repoRootPath,
    id,
    prompt,
  });
}

async function updateActionSheetChecks({ worktreePath = '', rootPath = '', projectRoot = '', id, checks } = {}) {
  if (!id) {
    throw new Error('actionSheet id is required.');
  }
  const { repoRootPath, worktreePath: resolvedWorktreePath } = await resolveActionSheetPaths({
    worktreePath,
    rootPath,
    projectRoot,
  });
  if (!repoRootPath) {
    throw new Error('projectRoot, rootPath, or worktreePath is required.');
  }
  return agencyData.updateActionSheetChecks({
    worktreePath: resolvedWorktreePath || repoRootPath,
    repoRootPath,
    id,
    checks,
  });
}

async function runActionSheetChecks({ worktreePath = '', rootPath = '', projectRoot = '', id } = {}) {
  if (!id) {
    throw new Error('actionSheet id is required.');
  }
  const { repoRootPath, worktreePath: resolvedWorktreePath } = await resolveActionSheetPaths({
    worktreePath,
    rootPath,
    projectRoot,
  });
  if (!repoRootPath) {
    throw new Error('projectRoot, rootPath, or worktreePath is required.');
  }
  return agencyData.runActionSheetChecks({
    worktreePath: resolvedWorktreePath || repoRootPath,
    repoRootPath,
    id,
  });
}

export {
  listActionSheets,
  readActionSheet,
  createActionSheet,
  updateActionSheetStatus,
  archiveActionSheet,
  deleteActionSheet,
  updateActionSheetPlan,
  updateActionSheetPrompt,
  updateActionSheetChecks,
  runActionSheetChecks,
};
