const fs = require('fs');
const path = require('path');

const { isVoiceCachePath } = require('./voiceCache');
const { normalizeRelPath } = require('./shared/pathSafety');

const fsp = fs.promises;

const AGENCY_DIR = '.agency';
const HIL_DIR = 'hil';
const ASSETS_DIR = 'assets';


function getWorktreeName(worktreePath) {
  return path.basename(worktreePath);
}
function formatTimestamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('');
}

function extensionForMime(mime) {
  if (!mime) {
    return 'wav';
  }
  if (mime.includes('webm')) {
    return 'webm';
  }
  if (mime.includes('mpeg') || mime.includes('mp3')) {
    return 'mp3';
  }
  if (mime.includes('aac') || mime.includes('m4a')) {
    return 'm4a';
  }
  return 'wav';
}

function buildVoiceName(mime) {
  return `Voice-${formatTimestamp(new Date())}.${extensionForMime(mime)}`;
}

function parseDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') {
    throw new Error('audio data is missing.');
  }
  const match = /^data:(.+?);base64,(.+)$/.exec(dataUrl);
  if (!match) {
    throw new Error('Invalid audio data URL.');
  }
  const mime = match[1];
  const buffer = Buffer.from(match[2], 'base64');
  return { mime, buffer };
}

async function moveOrCopyFile(sourcePath, targetPath) {
  try {
    await fsp.rename(sourcePath, targetPath);
  } catch (error) {
    await fsp.copyFile(sourcePath, targetPath);
    await fsp.unlink(sourcePath);
  }
}

async function saveVoiceAsset(params: any = {}) {
  const { worktreePath, sourcePath, dataUrl, durationMs, mime } = params || {};
  if (!worktreePath) {
    throw new Error('worktreePath is required.');
  }
  let payload = null;
  let buffer = null;
  let resolvedMime = mime || '';
  if (dataUrl) {
    payload = parseDataUrl(dataUrl);
    buffer = payload.buffer;
    resolvedMime = resolvedMime || payload.mime;
  }
  if (!buffer && sourcePath) {
    if (!isVoiceCachePath(sourcePath)) {
      throw new Error('Voice asset path is not allowed.');
    }
    await fsp.access(sourcePath, fs.constants.R_OK);
  }
  if (!buffer && !sourcePath) {
    throw new Error('voice asset source is required.');
  }
  const worktreeName = getWorktreeName(worktreePath);
  const targetDir = path.join(worktreePath, AGENCY_DIR, HIL_DIR, ASSETS_DIR, worktreeName);
  await fsp.mkdir(targetDir, { recursive: true });
  const filename = buildVoiceName(resolvedMime);
  const absolutePath = path.join(targetDir, filename);
  if (buffer) {
    await fsp.writeFile(absolutePath, buffer);
  } else {
    await moveOrCopyFile(sourcePath, absolutePath);
  }
  return {
    path: normalizeRelPath(path.relative(worktreePath, absolutePath)),
    mime: resolvedMime || 'audio/wav',
    durationMs: Number.isFinite(durationMs) ? durationMs : null,
  };
}

async function discardVoiceAsset(params: any = {}) {
  const { sourcePath } = params || {};
  if (!sourcePath) {
    return { ok: false, reason: 'missing-path' };
  }
  if (!isVoiceCachePath(sourcePath)) {
    return { ok: false, reason: 'path-not-allowed' };
  }
  try {
    await fsp.unlink(sourcePath);
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error?.message || 'delete-failed' };
  }
}

export {
  saveVoiceAsset,
  discardVoiceAsset,
};
