const path = require('path');

const { isPathInsideRoot } = require('./shared/pathSafety');

// The agency-asset protocol may only serve files under roots that a trusted
// main-process owner registered (project roots, voice cache, capture dirs).
const allowedAssetRoots = new Set<string>();

function registerAssetRoot(dirPath: unknown): void {
  const normalized = String(dirPath || '').trim();
  if (!normalized || !path.isAbsolute(normalized)) {
    return;
  }
  allowedAssetRoots.add(path.resolve(normalized));
}

function isAllowedAssetPath(filePath: unknown): boolean {
  const normalized = String(filePath || '').trim();
  if (!normalized) {
    return false;
  }
  const resolved = path.resolve(normalized);
  for (const root of allowedAssetRoots) {
    if (resolved === root || isPathInsideRoot(root, resolved)) {
      return true;
    }
  }
  return false;
}

function resetAssetRootsForTests(): void {
  allowedAssetRoots.clear();
}

export { registerAssetRoot, isAllowedAssetPath, resetAssetRootsForTests };
