const { clipboard } = require('electron');
const fs = require('fs');
const path = require('path');
const { fileURLToPath } = require('url');

const fsp = fs.promises;

function normalizeRelPath(value) {
  if (!value) {
    return '';
  }
  return value.replace(/\\/g, '/').replace(/^\.?\//, '').replace(/\/+$/, '');
}

function resolveSafePath(rootPath, relativePath) {
  const normalized = normalizeRelPath(relativePath);
  const absolute = path.resolve(rootPath, normalized);
  const rel = path.relative(rootPath, absolute);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error('Path escapes repository root.');
  }
  return absolute;
}

function formatTimestamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

function buildScreenshotName(date = new Date()) {
  return `Screenshot-${formatTimestamp(date)}.png`;
}

function parseUriList(raw) {
  if (!raw) {
    return [];
  }
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      if (line.startsWith('file://')) {
        try {
          return fileURLToPath(line);
        } catch (error) {
          return null;
        }
      }
      if (path.isAbsolute(line)) {
        return line;
      }
      return null;
    })
    .filter(Boolean);
}

function readWindowsFileList() {
  const formats = clipboard.availableFormats();
  if (!formats.includes('FileNameW') && !formats.includes('FileName')) {
    return [];
  }
  const buffer = formats.includes('FileNameW')
    ? clipboard.readBuffer('FileNameW')
    : clipboard.readBuffer('FileName');
  if (!buffer || !buffer.length) {
    return [];
  }
  const text = buffer.toString(formats.includes('FileNameW') ? 'utf16le' : 'utf8');
  return text
    .replace(/\0+$/, '')
    .split('\0')
    .map((entry) => entry.trim())
    .filter((entry) => entry && path.isAbsolute(entry));
}

function readClipboardFiles() {
  const formats = clipboard.availableFormats();
  const files = new Set(readWindowsFileList());
  const uriFormats = [
    'public.file-url',
    'public/uri-list',
    'text/uri-list',
    'public.url',
  ];
  uriFormats.forEach((format) => {
    if (!formats.includes(format)) {
      return;
    }
    const value = clipboard.read(format);
    parseUriList(value).forEach((entry) => files.add(entry));
  });
  return Array.from(files);
}

function readClipboardImage() {
  const image = clipboard.readImage();
  if (!image || image.isEmpty()) {
    return null;
  }
  return image.toPNG();
}

function readClipboardText() {
  return clipboard.readText();
}

function readClipboardHtml() {
  const raw = clipboard.readHTML();
  if (!raw) {
    return '';
  }
  const cleaned = raw.replace(/<meta[^>]*>/gi, '').trim();
  return cleaned;
}

async function ensureDirectory(targetDir) {
  await fsp.mkdir(targetDir, { recursive: true });
}

function withSuffix(name, index, isDir) {
  if (index <= 0) {
    return name;
  }
  if (isDir) {
    return `${name}-${index}`;
  }
  const ext = path.extname(name);
  const base = ext ? name.slice(0, -ext.length) : name;
  return `${base}-${index}${ext}`;
}

function resolveUniqueName(targetDir, name, isDir) {
  let attempt = 0;
  let candidate = withSuffix(name, attempt, isDir);
  let candidatePath = path.join(targetDir, candidate);
  while (fs.existsSync(candidatePath)) {
    attempt += 1;
    candidate = withSuffix(name, attempt, isDir);
    candidatePath = path.join(targetDir, candidate);
  }
  return { candidate, candidatePath };
}

async function materializeClipboard({
  rootPath,
  targetDir = '',
  includeText = false,
  relativeTo,
  defaultImageName,
} = {}) {
  if (!rootPath) {
    throw new Error('rootPath is required.');
  }
  const resolvedTarget = resolveSafePath(rootPath, targetDir);
  await ensureDirectory(resolvedTarget);
  const files = readClipboardFiles().filter((entry) => fs.existsSync(entry));
  if (files.length) {
    const created = [];
    for (const filePath of files) {
      const stats = await fsp.stat(filePath);
      const isDir = stats.isDirectory();
      const name = path.basename(filePath);
      const { candidate, candidatePath } = resolveUniqueName(resolvedTarget, name, isDir);
      await ensureDirectory(path.dirname(candidatePath));
      await fsp.cp(filePath, candidatePath, { recursive: true });
      created.push(candidatePath);
    }
    return {
      type: 'files',
      paths: created.map((entry) =>
        normalizeRelPath(path.relative(relativeTo || rootPath, entry))
      ),
    };
  }
  const imageBuffer = readClipboardImage();
  if (imageBuffer) {
    const name = defaultImageName || buildScreenshotName();
    const { candidatePath } = resolveUniqueName(resolvedTarget, name, false);
    await fsp.writeFile(candidatePath, imageBuffer);
    return {
      type: 'image',
      paths: [normalizeRelPath(path.relative(relativeTo || rootPath, candidatePath))],
    };
  }
  if (includeText) {
    const text = readClipboardText();
    return { type: text ? 'text' : 'empty', text: text || '' };
  }
  return { type: 'empty' };
}

function renderSection(title, body, useHeading) {
  if (!body) {
    return '';
  }
  if (!useHeading) {
    return body;
  }
  return `## ${title}\n\n${body}`;
}

function isImagePath(value) {
  const ext = path.extname(value || '').toLowerCase();
  return ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'].includes(ext);
}

async function materializeMarkdown({
  rootPath,
  targetDir = '',
  relativeTo,
} = {}) {
  if (!rootPath) {
    throw new Error('rootPath is required.');
  }
  const resolvedTarget = resolveSafePath(rootPath, targetDir);
  await ensureDirectory(resolvedTarget);
  const name = `Clipboard-${formatTimestamp()}.md`;
  const { candidatePath } = resolveUniqueName(resolvedTarget, name, false);
  const sections = [];
  const copiedFiles = [];
  const fileSources = readClipboardFiles().filter((entry) => fs.existsSync(entry));
  for (const filePath of fileSources) {
    const stats = await fsp.stat(filePath);
    const isDir = stats.isDirectory();
    const baseName = path.basename(filePath);
    const { candidatePath: fileTargetPath } = resolveUniqueName(resolvedTarget, baseName, isDir);
    await ensureDirectory(path.dirname(fileTargetPath));
    await fsp.cp(filePath, fileTargetPath, { recursive: true });
    copiedFiles.push(fileTargetPath);
  }

  if (copiedFiles.length) {
    const entries = copiedFiles.map((entry) => normalizeRelPath(path.relative(relativeTo || rootPath, entry)));
    const lines = entries.map((entry) => {
      if (isImagePath(entry)) {
        return `- ![](${entry})`;
      }
      return `- ${entry}`;
    });
    sections.push({ title: 'Clipboard Files', body: lines.join('\n') });
  }

  const imageBuffer = readClipboardImage();
  if (imageBuffer) {
    const imageName = buildScreenshotName();
    const { candidatePath: imagePath } = resolveUniqueName(resolvedTarget, imageName, false);
    await fsp.writeFile(imagePath, imageBuffer);
    const relativePath = normalizeRelPath(path.relative(relativeTo || rootPath, imagePath));
    sections.push({
      title: 'Clipboard Image',
      body: `![](${relativePath})`,
    });
  }

  const html = readClipboardHtml();
  if (html) {
    sections.push({
      title: 'Clipboard HTML',
      body: [
        '_Raw HTML captured from clipboard:_',
        '',
        '```html',
        html,
        '```',
      ].join('\n'),
    });
  }

  const text = readClipboardText();
  if (text) {
    sections.push({
      title: 'Clipboard Text',
      body: text,
    });
  }

  if (!sections.length) {
    sections.push({
      title: 'Clipboard',
      body: '_No clipboard content detected._',
    });
  }

  const useHeading = sections.length > 1;
  const content = sections
    .map((section) => renderSection(section.title, section.body, useHeading))
    .filter(Boolean)
    .join('\n\n');
  await fsp.writeFile(candidatePath, `${content}\n`, 'utf-8');
  return {
    type: 'markdown',
    path: normalizeRelPath(path.relative(relativeTo || rootPath, candidatePath)),
  };
}

module.exports = {
  materializeClipboard,
  buildScreenshotName,
  materializeMarkdown,
};
