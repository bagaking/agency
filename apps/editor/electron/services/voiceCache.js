const { app } = require('electron');
const fs = require('fs');
const path = require('path');

const fsp = fs.promises;
const CACHE_DIR_NAME = 'voice-cache';

function getVoiceCacheDir() {
  return path.join(app.getPath('userData'), CACHE_DIR_NAME);
}

async function ensureVoiceCacheDir() {
  const dir = getVoiceCacheDir();
  await fsp.mkdir(dir, { recursive: true });
  return dir;
}

function isVoiceCachePath(filePath) {
  if (!filePath) {
    return false;
  }
  const cacheDir = getVoiceCacheDir();
  const resolvedCache = path.resolve(cacheDir);
  const resolvedPath = path.resolve(filePath);
  return resolvedPath === resolvedCache || resolvedPath.startsWith(`${resolvedCache}${path.sep}`);
}

module.exports = {
  getVoiceCacheDir,
  ensureVoiceCacheDir,
  isVoiceCachePath,
};
