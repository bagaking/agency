import path from 'node:path';

export const AGENCY_DIR = '.agency';

export type WorktreeStorageContext = {
  worktreePath?: string;
  projectRootPath?: string;
  cellId?: string;
};

export type OwnerStorageKind = 'project' | 'cell';

export type OwnerStorageResolution = {
  ownerKind: OwnerStorageKind;
  mode: 'canonical' | 'legacy' | 'invalid';
  worktreePath: string;
  projectRootPath: string;
  cellId: string;
  storageRootPath: string;
  worktreeName: string;
  ownerRoot: string;
};

export function normalizeStorageContext(context: WorktreeStorageContext = {}): WorktreeStorageContext {
  return {
    worktreePath: String(context.worktreePath || '').trim(),
    projectRootPath: String(context.projectRootPath || '').trim(),
    cellId: sanitizeStorageSegment(context.cellId, ''),
  };
}

export function resolveStorageRootPath(context: WorktreeStorageContext): string {
  const normalized = normalizeStorageContext(context);
  const candidate = normalized.projectRootPath || normalized.worktreePath;
  if (!candidate) {
    return '';
  }
  return path.resolve(candidate);
}

export function resolveWorktreeName(context: WorktreeStorageContext, storageRootPath: string): string {
  const normalized = normalizeStorageContext(context);
  if (normalized.worktreePath) {
    return path.basename(normalized.worktreePath);
  }
  if (storageRootPath) {
    return path.basename(storageRootPath) || 'repo';
  }
  return 'repo';
}

export function getStoragePaths(
  context: WorktreeStorageContext
): { storageRootPath: string; worktreeName: string } {
  const storageRootPath = resolveStorageRootPath(context);
  if (!storageRootPath) {
    throw new Error('worktreePath or projectRootPath is required.');
  }
  const worktreeName = resolveWorktreeName(context, storageRootPath);
  return { storageRootPath, worktreeName };
}

export function getRepoAgencyDir(projectRootPath: string): string {
  const normalized = String(projectRootPath || '').trim();
  return normalized ? path.join(path.resolve(normalized), AGENCY_DIR) : '';
}

export function getCellOwnerRoot(projectRootPath: string, cellId: string): string {
  const repoAgencyDir = getRepoAgencyDir(projectRootPath);
  const normalizedCellId = sanitizeStorageSegment(cellId, '');
  if (!repoAgencyDir || !normalizedCellId) {
    return '';
  }
  return path.join(repoAgencyDir, 'cells', normalizedCellId);
}

export function resolveOwnerStorage(
  context: WorktreeStorageContext,
  ownerKind: OwnerStorageKind
): OwnerStorageResolution {
  const normalized = normalizeStorageContext(context);
  if (ownerKind === 'project') {
    if (normalized.projectRootPath) {
      const { storageRootPath, worktreeName } = getStoragePaths({
        projectRootPath: normalized.projectRootPath,
        worktreePath: normalized.worktreePath,
      });
      return {
        ownerKind,
        mode: 'canonical',
        worktreePath: normalized.worktreePath || '',
        projectRootPath: normalized.projectRootPath,
        cellId: '',
        storageRootPath,
        worktreeName,
        ownerRoot: getRepoAgencyDir(normalized.projectRootPath),
      };
    }
    if (normalized.worktreePath) {
      const { storageRootPath, worktreeName } = getStoragePaths({
        worktreePath: normalized.worktreePath,
      });
      return {
        ownerKind,
        mode: 'legacy',
        worktreePath: normalized.worktreePath,
        projectRootPath: '',
        cellId: '',
        storageRootPath,
        worktreeName,
        ownerRoot: path.join(storageRootPath, AGENCY_DIR),
      };
    }
  }

  if (ownerKind === 'cell') {
    if (normalized.projectRootPath && normalized.cellId) {
      const { storageRootPath, worktreeName } = getStoragePaths({
        projectRootPath: normalized.projectRootPath,
        worktreePath: normalized.worktreePath,
      });
      return {
        ownerKind,
        mode: 'canonical',
        worktreePath: normalized.worktreePath || '',
        projectRootPath: normalized.projectRootPath,
        cellId: normalized.cellId,
        storageRootPath,
        worktreeName,
        ownerRoot: getCellOwnerRoot(normalized.projectRootPath, normalized.cellId),
      };
    }
    if (normalized.worktreePath) {
      const { storageRootPath, worktreeName } = getStoragePaths({
        worktreePath: normalized.worktreePath,
      });
      return {
        ownerKind,
        mode: 'legacy',
        worktreePath: normalized.worktreePath,
        projectRootPath: '',
        cellId: '',
        storageRootPath,
        worktreeName,
        ownerRoot: path.join(storageRootPath, AGENCY_DIR),
      };
    }
  }

  return {
    ownerKind,
    mode: 'invalid',
    worktreePath: '',
    projectRootPath: '',
    cellId: '',
    storageRootPath: '',
    worktreeName: '',
    ownerRoot: '',
  };
}

export function requireOwnerStorage(
  context: WorktreeStorageContext,
  ownerKind: OwnerStorageKind,
  requirement?: string
): OwnerStorageResolution {
  const resolved = resolveOwnerStorage(context, ownerKind);
  if (resolved.mode === 'invalid' || !resolved.ownerRoot) {
    throw new Error(
      requirement ||
        (ownerKind === 'cell'
          ? 'worktreePath or projectRootPath + cellId is required.'
          : 'worktreePath or projectRootPath is required.')
    );
  }
  return resolved;
}

export function sanitizeStorageSegment(value: unknown, fallback = 'unknown'): string {
  const normalized = String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || fallback;
}
