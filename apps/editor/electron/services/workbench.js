const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const { getRepoRoot } = require('./git');
const { resolveProjectRoot } = require('./projectRoot');

const execFileAsync = promisify(execFile);
const fsp = fs.promises;

const MAX_TEXT_BYTES = Number(process.env.AGENCY_WORKBENCH_MAX_BYTES || 1024 * 1024);
const MAX_BLAME_BYTES = Number(process.env.AGENCY_WORKBENCH_BLAME_MAX_BYTES || 512 * 1024);
const MAX_DIFF_BYTES = Number(process.env.AGENCY_WORKBENCH_DIFF_MAX_BYTES || 512 * 1024);
const BINARY_CHECK_BYTES = 8000;
const ROOT_CACHE = new Map();

function normalizeRelPath(value) {
  if (!value) {
    return '';
  }
  return value.replace(/\\/g, '/').replace(/^\.?\//, '').replace(/\/+$/, '');
}

function resolveSafePath(rootPath, relativePath) {
  if (!rootPath) {
    throw new Error('Project root is not configured.');
  }
  const normalized = normalizeRelPath(relativePath);
  const absolute = path.resolve(rootPath, normalized);
  const rel = path.relative(rootPath, absolute);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error('Path escapes repository root.');
  }
  return absolute;
}

async function resolveWorkbenchRoot(rootPath) {
  const cacheKey = rootPath || '__default__';
  if (ROOT_CACHE.has(cacheKey)) {
    return ROOT_CACHE.get(cacheKey);
  }
  if (!rootPath) {
    const repoRoot = await resolveProjectRoot();
    if (!repoRoot) {
      const resolved = { repoRoot: '', rootPath: '' };
      ROOT_CACHE.set(cacheKey, resolved);
      return resolved;
    }
    const resolved = { repoRoot, rootPath: repoRoot };
    ROOT_CACHE.set(cacheKey, resolved);
    return resolved;
  }
  try {
    const repoRoot = await getRepoRoot(rootPath);
    const resolved = { repoRoot, rootPath };
    ROOT_CACHE.set(cacheKey, resolved);
    return resolved;
  } catch (error) {
    const repoRoot = await resolveProjectRoot();
    if (!repoRoot) {
      const resolved = { repoRoot: '', rootPath: '' };
      ROOT_CACHE.set(cacheKey, resolved);
      return resolved;
    }
    const resolved = { repoRoot, rootPath: repoRoot };
    ROOT_CACHE.set(cacheKey, resolved);
    return resolved;
  }
}

async function runGit(args, cwd) {
  try {
    const result = await execFileAsync('git', args, { cwd });
    return result.stdout || '';
  } catch (error) {
    return error?.stdout || '';
  }
}

function isBinaryBuffer(buffer) {
  return buffer.includes(0);
}

function ensureWorkbenchRoot(resolved) {
  if (!resolved?.rootPath) {
    throw new Error('Project root is not configured.');
  }
}

async function statEntry({ rootPath, targetPath }) {
  if (!targetPath) {
    throw new Error('targetPath is required.');
  }
  const resolved = await resolveWorkbenchRoot(rootPath);
  ensureWorkbenchRoot(resolved);
  const absolute = resolveSafePath(resolved.rootPath, targetPath);
  const stats = await fsp.stat(absolute);
  return {
    path: normalizeRelPath(targetPath),
    absolutePath: absolute,
    size: stats.size || 0,
    mtimeMs: stats.mtimeMs || 0,
    isFile: stats.isFile(),
    isDirectory: stats.isDirectory(),
  };
}

async function readTextFile({ rootPath, targetPath }) {
  const entry = await statEntry({ rootPath, targetPath });
  if (!entry.isFile) {
    throw new Error('Target is not a file.');
  }
  const size = entry.size || 0;
  const length = Math.min(size, MAX_TEXT_BYTES);
  const handle = await fsp.open(entry.absolutePath, 'r');
  const buffer = Buffer.alloc(length);
  await handle.read(buffer, 0, length, 0);
  await handle.close();
  const binary = isBinaryBuffer(buffer.slice(0, Math.min(length, BINARY_CHECK_BYTES)));
  return {
    path: entry.path,
    size,
    mtimeMs: entry.mtimeMs,
    truncated: size > MAX_TEXT_BYTES,
    binary,
    content: binary ? '' : buffer.toString('utf-8'),
  };
}

async function writeTextFile({ rootPath, targetPath, content }) {
  const resolved = await resolveWorkbenchRoot(rootPath);
  ensureWorkbenchRoot(resolved);
  const absolute = resolveSafePath(resolved.rootPath, targetPath);
  await fsp.mkdir(path.dirname(absolute), { recursive: true });
  await fsp.writeFile(absolute, content ?? '', 'utf-8');
  const stats = await fsp.stat(absolute);
  return {
    path: normalizeRelPath(targetPath),
    size: stats.size || 0,
    mtimeMs: stats.mtimeMs || 0,
  };
}

async function resolveFileUrl({ rootPath, targetPath }) {
  const entry = await statEntry({ rootPath, targetPath });
  // Using custom protocol to bypass webSecurity restrictions
  return {
    path: entry.path,
    url: `agency-asset://${entry.absolutePath}`,
  };
}

function parseDiffHunks(output) {
  if (!output) {
    return [];
  }
  const hunks = [];
  const lines = output.split('\n');
  lines.forEach((line) => {
    if (!line.startsWith('@@')) {
      return;
    }
    const match = /@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (!match) {
      return;
    }
    const oldStart = Number(match[1] || 0);
    const oldCount = Number(match[2] || 1);
    const newStart = Number(match[3] || 0);
    const newCount = Number(match[4] || 1);
    let type = 'modify';
    if (oldCount === 0 && newCount > 0) {
      type = 'add';
    } else if (newCount === 0 && oldCount > 0) {
      type = 'delete';
    }
    const startLine = newStart || oldStart;
    const endLine = newCount > 0 ? startLine + newCount - 1 : startLine;
    hunks.push({
      type,
      startLine,
      endLine,
      oldCount,
      newCount,
    });
  });
  return hunks;
}

async function getDiff({ rootPath, targetPath }) {
  if (!targetPath) {
    throw new Error('targetPath is required.');
  }
  const resolved = await resolveWorkbenchRoot(rootPath);
  ensureWorkbenchRoot(resolved);
  const relativePath = normalizeRelPath(targetPath);
  const output = await runGit(
    ['diff', '--unified=0', '--no-color', 'HEAD', '--', relativePath],
    resolved.rootPath
  );
  if (output.length > MAX_DIFF_BYTES) {
    return { truncated: true, hunks: [] };
  }
  const hunks = parseDiffHunks(output);
  return {
    truncated: false,
    hunks,
  };
}

function parseBlame(output) {
  if (!output) {
    return [];
  }
  const lines = output.split('\n');
  const result = [];
  let current = null;
  lines.forEach((line) => {
    if (!line) {
      return;
    }
    if (line.startsWith('\t')) {
      if (current) {
        result.push({
          ...current,
          line: result.length + 1,
          content: line.slice(1),
        });
      }
      return;
    }
    if (/^[0-9a-f]{8,40} /.test(line)) {
      const [commit] = line.split(' ');
      current = {
        commit,
        author: 'Unknown',
        authorTime: null,
        summary: '',
      };
      return;
    }
    if (!current) {
      return;
    }
    if (line.startsWith('author ')) {
      current.author = line.replace('author ', '');
    } else if (line.startsWith('author-time ')) {
      const raw = Number(line.replace('author-time ', ''));
      current.authorTime = Number.isNaN(raw) ? null : raw * 1000;
    } else if (line.startsWith('summary ')) {
      current.summary = line.replace('summary ', '');
    }
  });
  return result;
}

async function getBlame({ rootPath, targetPath }) {
  if (!targetPath) {
    throw new Error('targetPath is required.');
  }
  const resolved = await resolveWorkbenchRoot(rootPath);
  ensureWorkbenchRoot(resolved);
  const relativePath = normalizeRelPath(targetPath);
  const absolute = resolveSafePath(resolved.rootPath, relativePath);
  const stats = await fsp.stat(absolute);
  if (stats.size > MAX_BLAME_BYTES) {
    return { truncated: true, lines: [] };
  }
  const output = await runGit(['blame', '--line-porcelain', '--', relativePath], resolved.rootPath);
  if (!output) {
    return { truncated: false, lines: [] };
  }
  const lines = parseBlame(output);
  return { truncated: false, lines };
}

async function getFileSnippet({ rootPath, targetPath, line, context = 3 }) {
  const entry = await statEntry({ rootPath, targetPath });
  const raw = await fsp.readFile(entry.absolutePath, 'utf-8');
  const allLines = raw.split('\n');
  const targetLine = Math.max(1, Math.min(allLines.length, line));
  
  const start = Math.max(0, targetLine - 1 - context);
  const end = Math.min(allLines.length, targetLine + context);
  
  const snippet = allLines.slice(start, end).map((content, index) => ({
    line: start + index + 1,
    content,
    isTarget: start + index + 1 === targetLine
  }));

  return {
    path: entry.path,
    line: targetLine,
    snippet
  };
}

module.exports = {
  statEntry,
  readTextFile,
  writeTextFile,
  resolveFileUrl,
  getDiff,
  getBlame,
  getFileSnippet,
};
