const path = require('path');

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

module.exports = {
  normalizeRelPath,
  resolveSafePath,
};
