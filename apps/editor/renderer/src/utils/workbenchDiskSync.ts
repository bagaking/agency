const MTIME_EPSILON_MS = 1;

const normalizeMtime = (value?: number | null) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const normalizePath = (value?: string | null) =>
  String(value || '')
    .replace(/\\/g, '/')
    .replace(/^\.?\//, '')
    .replace(/\/+/g, '/')
    .replace(/\/$/, '');

const isSameOrNested = (path: string, candidate: string) =>
  path === candidate || path.startsWith(`${candidate}/`);

export function hasDiskVersionAdvanced({
  knownMtimeMs,
  diskMtimeMs,
  epsilonMs = MTIME_EPSILON_MS,
}: {
  knownMtimeMs?: number | null;
  diskMtimeMs?: number | null;
  epsilonMs?: number;
}) {
  const known = normalizeMtime(knownMtimeMs);
  const disk = normalizeMtime(diskMtimeMs);
  if (!disk) {
    return false;
  }
  if (!known) {
    return true;
  }
  const drift = Number.isFinite(epsilonMs) && epsilonMs > 0 ? epsilonMs : 0;
  return disk > known + drift;
}

export function resolveExternalReloadStrategy({
  knownMtimeMs,
  diskMtimeMs,
  isDirty,
}: {
  knownMtimeMs?: number | null;
  diskMtimeMs?: number | null;
  isDirty?: boolean;
}) {
  const diskNewer = hasDiskVersionAdvanced({ knownMtimeMs, diskMtimeMs });
  return {
    diskNewer,
    shouldAutoReload: diskNewer && !isDirty,
    shouldMarkNeedsReload: diskNewer && Boolean(isDirty),
  };
}

export function isPathPossiblyChanged({
  targetPath,
  changedDirs,
}: {
  targetPath?: string | null;
  changedDirs?: string[] | null;
}) {
  const normalizedTarget = normalizePath(targetPath);
  if (!normalizedTarget) {
    return false;
  }
  const lastSlash = normalizedTarget.lastIndexOf('/');
  const targetDir = lastSlash > 0 ? normalizedTarget.slice(0, lastSlash) : '';

  if (!Array.isArray(changedDirs) || !changedDirs.length) {
    return true;
  }

  return changedDirs.some((entry) => {
    const normalizedDir = normalizePath(entry);
    if (!normalizedDir) {
      return true;
    }
    return (
      isSameOrNested(targetDir, normalizedDir) ||
      isSameOrNested(normalizedDir, targetDir)
    );
  });
}
