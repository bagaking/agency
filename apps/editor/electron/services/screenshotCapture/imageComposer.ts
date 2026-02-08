// @ts-nocheck
const { clipboard, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');
const { normalizeRelPath } = require('../shared/pathSafety');

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

function buildScreenshotName(date = new Date()) {
  return `Screenshot-${formatTimestamp(date)}.png`;
}

function parseDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') {
    throw new Error('capture data is missing.');
  }
  const match = /^data:(.+?);base64,(.+)$/.exec(dataUrl);
  if (!match) {
    throw new Error('Invalid image data URL.');
  }
  const mime = match[1];
  const buffer = Buffer.from(match[2], 'base64');
  return { mime, buffer };
}

async function saveCaptureAsset({ worktreePath, dataUrl } = {}) {
  if (!worktreePath) {
    throw new Error('worktreePath is required.');
  }
  const { mime, buffer } = parseDataUrl(dataUrl);
  const worktreeName = getWorktreeName(worktreePath);
  const targetDir = path.join(worktreePath, AGENCY_DIR, HIL_DIR, ASSETS_DIR, worktreeName);
  await fsp.mkdir(targetDir, { recursive: true });
  const filename = buildScreenshotName();
  const absolutePath = path.join(targetDir, filename);
  await fsp.writeFile(absolutePath, buffer);
  const image = nativeImage.createFromBuffer(buffer);
  const size = image.getSize();
  return {
    path: normalizeRelPath(path.relative(worktreePath, absolutePath)),
    mime,
    width: size.width,
    height: size.height,
  };
}

function copyCaptureToClipboard({ dataUrl } = {}) {
  const { buffer } = parseDataUrl(dataUrl);
  const image = nativeImage.createFromBuffer(buffer);
  clipboard.writeImage(image);
  return { ok: true };
}

export {
  saveCaptureAsset,
  copyCaptureToClipboard,
};
