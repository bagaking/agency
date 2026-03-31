import path from 'node:path';

export const AGENCY_DIR = '.agency';

export type WorktreeStorageContext = {
  worktreePath?: string;
  projectRootPath?: string;
};

export function normalizeStorageContext(context: WorktreeStorageContext = {}): WorktreeStorageContext {
  return {
    worktreePath: String(context.worktreePath || '').trim(),
    projectRootPath: String(context.projectRootPath || '').trim(),
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

export function sanitizeStorageSegment(value: unknown, fallback = 'unknown'): string {
  const normalized = String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || fallback;
}
