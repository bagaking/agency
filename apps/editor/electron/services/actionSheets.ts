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

async function resolveRepoRootPath(worktreePath) {
  if (!worktreePath) {
    return '';
  }
  try {
    return await getRepoRoot(worktreePath);
  } catch (error) {
    return worktreePath;
  }
}

async function listActionSheets({ worktreePath, includeArchived = false } = {}) {
  if (!worktreePath) {
    throw new Error('worktreePath is required.');
  }
  const repoRootPath = await resolveRepoRootPath(worktreePath);
  return agencyData.listActionSheets({ worktreePath, repoRootPath, includeArchived });
}

async function readActionSheet({ worktreePath, id } = {}) {
  if (!worktreePath) {
    throw new Error('worktreePath is required.');
  }
  if (!id) {
    throw new Error('actionSheet id is required.');
  }
  const repoRootPath = await resolveRepoRootPath(worktreePath);
  return agencyData.readActionSheet({ worktreePath, repoRootPath, id });
}

async function createActionSheet({ worktreePath, payload = {} } = {}) {
  if (!worktreePath) {
    throw new Error('worktreePath is required.');
  }
  const repoRootPath = await resolveRepoRootPath(worktreePath);
  return agencyData.createActionSheet({ worktreePath, repoRootPath, payload });
}

async function updateActionSheetStatus({ worktreePath, id, patch = {} } = {}) {
  if (!worktreePath) {
    throw new Error('worktreePath is required.');
  }
  if (!id) {
    throw new Error('actionSheet id is required.');
  }
  const repoRootPath = await resolveRepoRootPath(worktreePath);
  return agencyData.updateActionSheetStatus({ worktreePath, repoRootPath, id, patch });
}

async function archiveActionSheet({ worktreePath, id } = {}) {
  if (!worktreePath) {
    throw new Error('worktreePath is required.');
  }
  if (!id) {
    throw new Error('actionSheet id is required.');
  }
  const repoRootPath = await resolveRepoRootPath(worktreePath);
  return agencyData.archiveActionSheet({ worktreePath, repoRootPath, id });
}

async function deleteActionSheet({ worktreePath, id } = {}) {
  if (!worktreePath) {
    throw new Error('worktreePath is required.');
  }
  if (!id) {
    throw new Error('actionSheet id is required.');
  }
  const repoRootPath = await resolveRepoRootPath(worktreePath);
  return agencyData.deleteActionSheet({ worktreePath, repoRootPath, id });
}

async function updateActionSheetPlan({ worktreePath, id, plan } = {}) {
  if (!worktreePath) {
    throw new Error('worktreePath is required.');
  }
  if (!id) {
    throw new Error('actionSheet id is required.');
  }
  const repoRootPath = await resolveRepoRootPath(worktreePath);
  return agencyData.updateActionSheetPlan({ worktreePath, repoRootPath, id, plan });
}

async function updateActionSheetPrompt({ worktreePath, id, prompt } = {}) {
  if (!worktreePath) {
    throw new Error('worktreePath is required.');
  }
  if (!id) {
    throw new Error('actionSheet id is required.');
  }
  const repoRootPath = await resolveRepoRootPath(worktreePath);
  return agencyData.updateActionSheetPrompt({ worktreePath, repoRootPath, id, prompt });
}

async function updateActionSheetChecks({ worktreePath, id, checks } = {}) {
  if (!worktreePath) {
    throw new Error('worktreePath is required.');
  }
  if (!id) {
    throw new Error('actionSheet id is required.');
  }
  const repoRootPath = await resolveRepoRootPath(worktreePath);
  return agencyData.updateActionSheetChecks({ worktreePath, repoRootPath, id, checks });
}

async function runActionSheetChecks({ worktreePath, id } = {}) {
  if (!worktreePath) {
    throw new Error('worktreePath is required.');
  }
  if (!id) {
    throw new Error('actionSheet id is required.');
  }
  const repoRootPath = await resolveRepoRootPath(worktreePath);
  return agencyData.runActionSheetChecks({ worktreePath, repoRootPath, id });
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

