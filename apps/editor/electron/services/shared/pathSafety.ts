const fs = require('fs');
const path = require('path');
const fsp = fs.promises;

function normalizeRelPath(value) {
  if (!value) {
    return '';
  }
  return String(value).replace(/\\/g, '/').replace(/^\.?\//, '').replace(/\/+$/, '');
}

function resolveSafePath(rootPath, targetPath, { fallbackToCwd = false } = {}) {
  const basePath = rootPath ? path.resolve(rootPath) : fallbackToCwd ? process.cwd() : '';
  if (!basePath) {
    throw new Error('Root path is required.');
  }

  const normalized = normalizeRelPath(targetPath);
  const absolute = path.resolve(basePath, normalized);
  const relative = path.relative(basePath, absolute);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Path escapes repository root.');
  }
  return absolute;
}

function isPathInsideRoot(rootPath, candidatePath) {
  const relative = path.relative(rootPath, candidatePath);
  return !relative.startsWith('..') && !path.isAbsolute(relative);
}

async function resolveRootRealPath(rootPath, { fallbackToCwd = false } = {}) {
  const basePath = rootPath ? path.resolve(rootPath) : fallbackToCwd ? process.cwd() : '';
  if (!basePath) {
    throw new Error('Root path is required.');
  }
  return {
    basePath,
    realRootPath: await fsp.realpath(basePath),
  };
}

async function inspectExistingPath(rootPath, targetPath, { fallbackToCwd = false } = {}) {
  const { basePath, realRootPath } = await resolveRootRealPath(rootPath, { fallbackToCwd });
  const absolutePath = resolveSafePath(basePath, targetPath, { fallbackToCwd });
  const lstat = await fsp.lstat(absolutePath);
  const isSymbolicLink = lstat.isSymbolicLink();
  let resolutionError = null;
  const realPath = await fsp.realpath(absolutePath).catch((error) => {
    resolutionError = error;
    return absolutePath;
  });
  const stat = isSymbolicLink
    ? await fsp.stat(absolutePath).catch((error) => {
        resolutionError = resolutionError || error;
        return null;
      })
    : lstat;
  return {
    basePath,
    realRootPath,
    absolutePath,
    realPath,
    lstat,
    resolutionError,
    stat,
    isSymbolicLink,
    insideRoot: isPathInsideRoot(realRootPath, realPath),
  };
}

async function resolveExistingPathWithinRoot(rootPath, targetPath, options = {}) {
  const inspection = await inspectExistingPath(rootPath, targetPath, options);
  if (!inspection.insideRoot) {
    throw new Error('Path resolves outside repository root.');
  }
  if (!inspection.stat) {
    throw new Error('Broken symbolic-link target.');
  }
  return inspection;
}

async function findNearestExistingAncestor(absolutePath) {
  let current = path.resolve(absolutePath);
  while (true) {
    try {
      await fsp.lstat(current);
      return current;
    } catch (error) {
      const parent = path.dirname(current);
      if (parent === current) {
        throw error;
      }
      current = parent;
    }
  }
}

async function resolveMutationTargetWithinRoot(rootPath, targetPath, { fallbackToCwd = false } = {}) {
  const { basePath, realRootPath } = await resolveRootRealPath(rootPath, { fallbackToCwd });
  const absolutePath = resolveSafePath(basePath, targetPath, { fallbackToCwd });
  const anchorPath = await findNearestExistingAncestor(path.dirname(absolutePath));
  const anchorRealPath = await fsp.realpath(anchorPath);
  if (!isPathInsideRoot(realRootPath, anchorRealPath)) {
    throw new Error('Target parent resolves outside repository root.');
  }
  return {
    basePath,
    realRootPath,
    absolutePath,
    anchorPath,
    anchorRealPath,
  };
}

export {
  findNearestExistingAncestor,
  inspectExistingPath,
  normalizeRelPath,
  resolveExistingPathWithinRoot,
  resolveMutationTargetWithinRoot,
  resolveRootRealPath,
  resolveSafePath,
  isPathInsideRoot,
};
