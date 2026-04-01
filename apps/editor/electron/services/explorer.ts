// @ts-nocheck
const { shell } = require('electron');
const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const { getRepoRoot } = require('./git');
const { resolveProjectRoot } = require('./projectRoot');
const { listCells } = require('./cells');
const {
  inspectExistingPath,
  normalizeRelPath,
  resolveExistingPathWithinRoot,
  resolveMutationTargetWithinRoot,
  resolveSafePath,
} = require('./shared/pathSafety');

const execFileAsync = promisify(execFile);
const fsp = fs.promises;

const STATUS_PRIORITY = [
  'conflict',
  'deleted',
  'added',
  'modified',
  'renamed',
  'copied',
  'untracked',
  'ignored',
];

const STATUS_LABELS = {
  conflict: 'Conflict',
  deleted: 'Deleted',
  added: 'Added',
  modified: 'Modified',
  renamed: 'Renamed',
  copied: 'Copied',
  untracked: 'Untracked',
  ignored: 'Ignored',
};

const ENTRY_TYPES = {
  file: 'file',
  dir: 'dir',
};

const DEFAULT_EXCLUDES = new Set(['.git']);
const MAX_PREVIEW_BYTES = 200 * 1024;
const CONTENT_SEARCH_MAX_FILE_BYTES = Math.max(
  32 * 1024,
  Number(process.env.AGENCY_EXPLORER_CONTENT_SEARCH_MAX_FILE_BYTES || 1024 * 1024)
);
const CONTENT_SEARCH_CONCURRENCY = Math.max(
  1,
  Number(process.env.AGENCY_EXPLORER_CONTENT_SEARCH_CONCURRENCY || 12)
);
const CONTENT_SEARCH_MAX_MATCHES_PER_FILE = Math.max(
  1,
  Number(process.env.AGENCY_EXPLORER_CONTENT_SEARCH_MAX_MATCHES_PER_FILE || 24)
);
const CONTENT_SEARCH_SNIPPET_MAX_CHARS = 220;
const STATUS_CACHE_TTL_MS = Number(process.env.AGENCY_EXPLORER_STATUS_TTL_MS || 800);
const STATUS_WORKTREE_CONCURRENCY = Math.max(1, Number(process.env.AGENCY_EXPLORER_STATUS_CONCURRENCY || 4));
const GIT_COMMAND_TIMEOUT_MS = Math.max(500, Number(process.env.AGENCY_EXPLORER_GIT_TIMEOUT_MS || 9000));
const GIT_MAX_BUFFER_BYTES = Math.max(1024 * 1024, Number(process.env.AGENCY_EXPLORER_GIT_MAX_BUFFER_BYTES || 16 * 1024 * 1024));
const statusCache = {
  value: null,
  timestamp: 0,
  promise: null,
  rootPath: '',
};

async function resolveExplorerRoot(rootPath) {
  if (!rootPath) {
    const repoRoot = await resolveProjectRoot();
    if (!repoRoot) {
      return { repoRoot: '', rootPath: '' };
    }
    return { repoRoot, rootPath: repoRoot };
  }
  try {
    const repoRoot = await getRepoRoot(rootPath);
    return { repoRoot, rootPath };
  } catch (error) {
    const repoRoot = await resolveProjectRoot();
    if (!repoRoot) {
      return { repoRoot: '', rootPath: '' };
    }
    return { repoRoot, rootPath: repoRoot };
  }
}

function ensureResolvedRoot(resolved) {
  if (!resolved?.rootPath) {
    throw new Error('Project root is not configured.');
  }
}

function sortEntries(a, b) {
  if (a.type !== b.type) {
    return a.type === ENTRY_TYPES.dir ? -1 : 1;
  }
  return a.name.localeCompare(b.name);
}

async function describeExplorerEntry(
  rootPath,
  relativePath,
  { dirent = null, ancestorRealPaths = null } = {}
) {
  const normalizedPath = normalizeRelPath(relativePath);
  const absolutePath = resolveSafePath(rootPath, normalizedPath);
  const name = dirent?.name || path.basename(normalizedPath) || normalizedPath;

  if (dirent && !dirent.isSymbolicLink()) {
    return {
      path: normalizedPath,
      name,
      type: dirent.isDirectory() ? ENTRY_TYPES.dir : ENTRY_TYPES.file,
      isSymbolicLink: false,
    };
  }

  const inspection = await inspectExistingPath(rootPath, normalizedPath);
  const type = inspection.stat?.isDirectory?.() ? ENTRY_TYPES.dir : ENTRY_TYPES.file;
  let symlinkBoundaryState = inspection.resolutionError
    ? 'broken'
    : inspection.insideRoot
      ? 'inside-root'
      : 'outside-root';
  if (symlinkBoundaryState === 'inside-root' && type === ENTRY_TYPES.dir && ancestorRealPaths?.has(inspection.realPath)) {
    symlinkBoundaryState = 'cycle';
  }

  if (!inspection.isSymbolicLink) {
    return {
      path: normalizedPath,
      name,
      type,
      isSymbolicLink: false,
    };
  }

  return {
    path: normalizedPath,
    name,
    type,
    isSymbolicLink: true,
    symlinkBoundaryState,
    isTraversalRestricted:
      type === ENTRY_TYPES.dir &&
      (symlinkBoundaryState === 'outside-root' || symlinkBoundaryState === 'cycle' || symlinkBoundaryState === 'broken'),
  };
}

async function buildDirectoryTraversalContext(rootPath, relativePath = '') {
  const normalizedPath = normalizeRelPath(relativePath);
  const segments = normalizedPath ? normalizedPath.split('/').filter(Boolean) : [];
  const rootInspection = await resolveExistingPathWithinRoot(rootPath, '');
  const ancestorRealPaths = new Set([rootInspection.realPath]);
  let currentInspection = rootInspection;
  let currentRelativePath = '';

  for (const segment of segments) {
    currentRelativePath = currentRelativePath ? `${currentRelativePath}/${segment}` : segment;
    currentInspection = await resolveExistingPathWithinRoot(rootPath, currentRelativePath);
    if (ancestorRealPaths.has(currentInspection.realPath)) {
      throw new Error('Path contains a symbolic-link cycle.');
    }
    ancestorRealPaths.add(currentInspection.realPath);
  }

  return {
    inspection: currentInspection,
    ancestorRealPaths,
  };
}

async function listDirectory({ rootPath, relativePath = '', showHidden = true }) {
  const resolved = await resolveExplorerRoot(rootPath);
  if (!resolved.rootPath) {
    return { path: normalizeRelPath(relativePath), entries: [] };
  }
  const directoryContext = await buildDirectoryTraversalContext(resolved.rootPath, relativePath);
  if (!directoryContext.inspection.stat?.isDirectory?.()) {
    throw new Error('Target path is not a directory.');
  }
  const targetPath = directoryContext.inspection.absolutePath;
  const entries = await fsp.readdir(targetPath, { withFileTypes: true });
  const visibleEntries = entries.filter((entry) => {
    if (DEFAULT_EXCLUDES.has(entry.name)) {
      return false;
    }
    if (!showHidden && entry.name.startsWith('.')) {
      return false;
    }
    return true;
  });
  const items = await Promise.all(
    visibleEntries.map((entry) =>
      describeExplorerEntry(resolved.rootPath, path.join(relativePath, entry.name), {
        dirent: entry,
        ancestorRealPaths: directoryContext.ancestorRealPaths,
      })
    )
  );
  items.sort(sortEntries);
  return { path: normalizeRelPath(relativePath), entries: items };
}

async function runGitRaw(args, cwd) {
  try {
    const result = await execFileAsync('git', args, {
      cwd,
      timeout: GIT_COMMAND_TIMEOUT_MS,
      maxBuffer: GIT_MAX_BUFFER_BYTES,
    });
    return result.stdout || '';
  } catch (error) {
    return '';
  }
}

function statusKindFromCode(code) {
  if (!code) {
    return 'modified';
  }
  if (code === '??') {
    return 'untracked';
  }
  if (code === '!!') {
    return 'ignored';
  }
  if (code.includes('U')) {
    return 'conflict';
  }
  if (code.includes('D')) {
    return 'deleted';
  }
  if (code.includes('A')) {
    return 'added';
  }
  if (code.includes('R')) {
    return 'renamed';
  }
  if (code.includes('C')) {
    return 'copied';
  }
  if (code.includes('M')) {
    return 'modified';
  }
  return 'modified';
}

function parsePorcelainZ(output) {
  if (!output) {
    return [];
  }
  const tokens = output.split('\0');
  const entries = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (!token) {
      continue;
    }
    const status = token.slice(0, 2);
    const pathPart = token.slice(3);
    let filePath = pathPart;
    if (status.includes('R') || status.includes('C')) {
      const nextPath = tokens[i + 1];
      if (nextPath) {
        filePath = nextPath;
        i += 1;
      }
    }
    if (!filePath) {
      continue;
    }
    entries.push({
      path: normalizeRelPath(filePath),
      status,
      kind: statusKindFromCode(status),
    });
  }
  return entries;
}

function parseNumstatZ(output) {
  if (!output) {
    return [];
  }
  const tokens = output.split('\0');
  const entries = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (!token) {
      continue;
    }
    const parts = token.split('\t');
    if (parts.length < 3) {
      continue;
    }
    const [rawAdded, rawDeleted, pathPart] = parts;
    let filePath = pathPart;
    if (tokens[i + 1] && !tokens[i + 1].includes('\t')) {
      filePath = tokens[i + 1];
      i += 1;
    }
    const added = rawAdded === '-' ? 0 : Number(rawAdded || 0);
    const deleted = rawDeleted === '-' ? 0 : Number(rawDeleted || 0);
    if (!filePath) {
      continue;
    }
    entries.push({
      path: normalizeRelPath(filePath),
      added,
      deleted,
    });
  }
  return entries;
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildContentSearchPattern({
  query,
  caseSensitive = false,
  wholeWord = false,
  useRegex = false,
} = {}) {
  const rawQuery = String(query || '').trim();
  if (!rawQuery) {
    throw new Error('query is required.');
  }
  const source = useRegex ? rawQuery : escapeRegex(rawQuery);
  const pattern = wholeWord ? `\\b(?:${source})\\b` : source;
  return new RegExp(pattern, caseSensitive ? 'g' : 'gi');
}

async function listRepoFiles(rootPath) {
  const tracked = await runGitRaw(['ls-files', '-z'], rootPath);
  const untracked = await runGitRaw(
    ['ls-files', '--others', '--exclude-standard', '-z'],
    rootPath
  );
  return Array.from(
    new Set(`${tracked}\0${untracked}`.split('\0').map(normalizeRelPath).filter(Boolean))
  );
}

function normalizeContentSearchScope(scope) {
  const source = scope && typeof scope === 'object' ? scope : {};
  const kind =
    source.kind === 'folder' || source.kind === 'selection' ? source.kind : 'project';
  const pathValue = normalizeRelPath(source.path || '');
  const paths = Array.from(
    new Set(
      (Array.isArray(source.paths) ? source.paths : [])
        .map((entry) => normalizeRelPath(entry || ''))
        .filter(Boolean)
    )
  );
  return {
    kind,
    path: pathValue,
    paths,
  };
}

function assertValidContentSearchScope(scope) {
  if (!scope || scope.kind === 'project') {
    return scope || { kind: 'project', path: '', paths: [] };
  }
  if (scope.kind === 'folder' && !scope.path) {
    throw new Error('Folder content scope requires a directory context.');
  }
  if (scope.kind === 'selection' && !scope.paths.length) {
    throw new Error('Selection content scope requires at least one target path.');
  }
  return scope;
}

function pathMatchesContentScope(filePath, scope) {
  if (!filePath) {
    return false;
  }
  if (!scope || scope.kind === 'project') {
    return true;
  }
  if (scope.kind === 'folder') {
    return filePath === scope.path || filePath.startsWith(`${scope.path}/`);
  }
  if (scope.kind === 'selection') {
    if (!scope.paths.length) {
      return false;
    }
    return scope.paths.some(
      (entryPath) => filePath === entryPath || filePath.startsWith(`${entryPath}/`)
    );
  }
  return true;
}

function clampSnippet(value) {
  const line = String(value || '').replace(/\t/g, '  ');
  if (line.length <= CONTENT_SEARCH_SNIPPET_MAX_CHARS) {
    return line;
  }
  return `${line.slice(0, CONTENT_SEARCH_SNIPPET_MAX_CHARS - 3)}...`;
}

async function inspectContentSearchCandidate(rootPath, relativePath, pattern) {
  let inspection;
  try {
    inspection = await resolveExistingPathWithinRoot(rootPath, relativePath);
  } catch (error) {
    return {
      kind: 'restricted',
      path: relativePath,
      reason: error?.message || 'restricted-path',
    };
  }
  const stats = inspection.stat;
  if (!stats.isFile()) {
    return { kind: 'skip' };
  }
  if (stats.size > CONTENT_SEARCH_MAX_FILE_BYTES) {
    return { kind: 'large', path: relativePath, size: stats.size };
  }
  const buffer = await fsp.readFile(inspection.absolutePath);
  const sample = buffer.subarray(0, Math.min(buffer.length, 1024));
  if (sample.includes(0)) {
    return { kind: 'binary', path: relativePath, size: stats.size };
  }
  const content = buffer.toString('utf8');
  const lines = content.split(/\r?\n/);
  const matches = [];
  let matchCount = 0;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    pattern.lastIndex = 0;
    let lineMatch = pattern.exec(line);
    while (lineMatch) {
      matchCount += 1;
      if (matches.length < CONTENT_SEARCH_MAX_MATCHES_PER_FILE) {
        matches.push({
          line: index + 1,
          column: (lineMatch.index || 0) + 1,
          endColumn: (lineMatch.index || 0) + String(lineMatch[0] || '').length + 1,
          text: String(lineMatch[0] || ''),
          snippet: clampSnippet(line),
        });
      }
      if (!pattern.global) {
        break;
      }
      lineMatch = pattern.exec(line);
    }
  }
  if (!matchCount) {
    return { kind: 'none' };
  }
  return {
    kind: 'result',
    result: {
      path: relativePath,
      matchCount,
      matches,
    },
  };
}

async function searchContent({
  rootPath,
  query,
  scope,
  caseSensitive = false,
  wholeWord = false,
  useRegex = false,
  limit = 200,
} = {}) {
  const trimmedQuery = String(query || '').trim();
  if (!trimmedQuery) {
    return {
      query: '',
      scope: normalizeContentSearchScope(scope),
      results: [],
      truncated: false,
      scannedFiles: 0,
      skippedBinaryCount: 0,
      skippedLargeCount: 0,
      skippedRestrictedCount: 0,
    };
  }
  const resolved = await resolveExplorerRoot(rootPath);
  if (!resolved.rootPath) {
    return {
      query: trimmedQuery,
      scope: normalizeContentSearchScope(scope),
      results: [],
      truncated: false,
      scannedFiles: 0,
      skippedBinaryCount: 0,
      skippedLargeCount: 0,
      skippedRestrictedCount: 0,
    };
  }
  const normalizedScope = assertValidContentSearchScope(normalizeContentSearchScope(scope));
  const pattern = buildContentSearchPattern({
    query: trimmedQuery,
    caseSensitive,
    wholeWord,
    useRegex,
  });
  const files = (await listRepoFiles(resolved.rootPath)).filter((filePath) =>
    pathMatchesContentScope(filePath, normalizedScope)
  );
  const inspections = await mapWithConcurrency(files, CONTENT_SEARCH_CONCURRENCY, async (filePath) =>
    inspectContentSearchCandidate(resolved.rootPath, filePath, pattern)
  );

  const results = [];
  let totalResultFiles = 0;
  let totalResultMatches = 0;
  let skippedBinaryCount = 0;
  let skippedLargeCount = 0;
  let skippedRestrictedCount = 0;
  let truncated = false;
  for (const inspection of inspections) {
    if (inspection?.kind === 'binary') {
      skippedBinaryCount += 1;
      continue;
    }
    if (inspection?.kind === 'large') {
      skippedLargeCount += 1;
      continue;
    }
    if (inspection?.kind === 'restricted') {
      skippedRestrictedCount += 1;
      continue;
    }
    if (inspection?.kind !== 'result') {
      continue;
    }
    totalResultFiles += 1;
    totalResultMatches += Number(inspection.result?.matchCount || 0);
    if (results.length < limit) {
      results.push(inspection.result);
    } else {
      truncated = true;
    }
  }

  return {
    query: trimmedQuery,
    scope: normalizedScope,
    results,
    truncated,
    totalResultFiles,
    totalResultMatches,
    scannedFiles: files.length,
    skippedBinaryCount,
    skippedLargeCount,
    skippedRestrictedCount,
  };
}

function normalizeConfirmedContentMatches(confirmedMatches) {
  const source = Array.isArray(confirmedMatches) ? confirmedMatches : [];
  const normalized = [];
  source.forEach((entry) => {
    if (!entry || typeof entry !== 'object') {
      return;
    }
    const normalizedPath = normalizeRelPath(entry.path || '');
    const line = Number(entry.line);
    const column = Number(entry.column);
    const endColumn = Number(entry.endColumn);
    const text = typeof entry.text === 'string' ? entry.text : String(entry.text || '');
    if (!normalizedPath) {
      return;
    }
    if (!Number.isInteger(line) || line < 1) {
      return;
    }
    if (!Number.isInteger(column) || column < 1) {
      return;
    }
    if (!Number.isInteger(endColumn) || endColumn < column) {
      return;
    }
    normalized.push({
      path: normalizedPath,
      line,
      column,
      endColumn,
      text,
    });
  });
  const deduped = new Map();
  normalized.forEach((entry) => {
    const key = JSON.stringify([entry.path, entry.line, entry.column, entry.endColumn, entry.text]);
    if (!deduped.has(key)) {
      deduped.set(key, entry);
    }
  });
  return Array.from(deduped.values());
}

function buildContentLineBounds(content) {
  const source = String(content || '');
  const lines = [];
  let offset = 0;
  while (offset <= source.length) {
    const newlineIndex = source.indexOf('\n', offset);
    const lineEnd = newlineIndex === -1 ? source.length : newlineIndex;
    const normalizedEnd =
      lineEnd > offset && source[lineEnd - 1] === '\r' ? lineEnd - 1 : lineEnd;
    lines.push({ start: offset, end: normalizedEnd });
    if (newlineIndex === -1) {
      break;
    }
    offset = newlineIndex + 1;
  }
  return lines;
}

function planContentMatchReplacements(content, confirmedMatches, pattern) {
  const lines = buildContentLineBounds(content);
  const candidates = [];
  const skipped = [];

  confirmedMatches.forEach((match) => {
    const lineInfo = lines[match.line - 1];
    if (!lineInfo) {
      skipped.push({
        path: match.path,
        line: match.line,
        column: match.column,
        endColumn: match.endColumn,
        reason: 'line-out-of-range',
      });
      return;
    }
    const startOffset = lineInfo.start + (match.column - 1);
    const endOffset = lineInfo.start + (match.endColumn - 1);
    if (startOffset < lineInfo.start || endOffset < startOffset || endOffset > lineInfo.end) {
      skipped.push({
        path: match.path,
        line: match.line,
        column: match.column,
        endColumn: match.endColumn,
        reason: 'column-out-of-range',
      });
      return;
    }
    const actual = content.slice(startOffset, endOffset);
    if (actual !== match.text) {
      skipped.push({
        path: match.path,
        line: match.line,
        column: match.column,
        endColumn: match.endColumn,
        reason: 'stale-match',
      });
      return;
    }
    if (pattern) {
      pattern.lastIndex = 0;
      if (!pattern.test(actual)) {
        skipped.push({
          path: match.path,
          line: match.line,
          column: match.column,
          endColumn: match.endColumn,
          reason: 'query-mismatch',
        });
        return;
      }
    }
    candidates.push({
      ...match,
      startOffset,
      endOffset,
    });
  });

  candidates.sort((left, right) => {
    if (left.startOffset !== right.startOffset) {
      return left.startOffset - right.startOffset;
    }
    return left.endOffset - right.endOffset;
  });

  const applied = [];
  let previousEnd = -1;
  candidates.forEach((entry) => {
    if (entry.startOffset < previousEnd) {
      skipped.push({
        path: entry.path,
        line: entry.line,
        column: entry.column,
        endColumn: entry.endColumn,
        reason: 'overlap',
      });
      return;
    }
    applied.push(entry);
    previousEnd = entry.endOffset;
  });

  return {
    applied,
    skipped,
  };
}

async function replaceContent({
  rootPath,
  query,
  replacement = '',
  scope,
  caseSensitive = false,
  wholeWord = false,
  useRegex = false,
  confirmedPaths = [],
  confirmedMatches = [],
} = {}) {
  const trimmedQuery = String(query || '').trim();
  if (!trimmedQuery) {
    throw new Error('query is required.');
  }
  const resolved = await resolveExplorerRoot(rootPath);
  ensureResolvedRoot(resolved);

  const normalizedScope = assertValidContentSearchScope(normalizeContentSearchScope(scope));
  const confirmedSet = new Set(
    (Array.isArray(confirmedPaths) ? confirmedPaths : [])
      .map((entry) => normalizeRelPath(entry || ''))
      .filter(Boolean)
  );
  const normalizedConfirmedMatches = normalizeConfirmedContentMatches(confirmedMatches);
  const hasMatchReview = normalizedConfirmedMatches.length > 0;
  if (!confirmedSet.size && !hasMatchReview) {
    throw new Error('Content replace requires explicit confirmed target paths or matches.');
  }
  const validatedPattern = buildContentSearchPattern({
    query: trimmedQuery,
    caseSensitive,
    wholeWord,
    useRegex,
  });

  const repoFiles = await listRepoFiles(resolved.rootPath);
  const repoFileSet = new Set(repoFiles);

  const appliedPaths = [];
  const failures = [];
  const skipped = [];
  let replacedFiles = 0;
  let replacedMatches = 0;

  if (hasMatchReview) {
    const fullFilePaths = new Set();
    Array.from(confirmedSet).forEach((confirmedPath) => {
      if (!pathMatchesContentScope(confirmedPath, normalizedScope)) {
        skipped.push({ path: confirmedPath, reason: 'out-of-scope' });
        return;
      }
      if (!repoFileSet.has(confirmedPath)) {
        skipped.push({ path: confirmedPath, reason: 'not-indexed' });
        return;
      }
      fullFilePaths.add(confirmedPath);
    });

    const groupedByPath = new Map();
    normalizedConfirmedMatches.forEach((match) => {
      if (!pathMatchesContentScope(match.path, normalizedScope)) {
        skipped.push({
          path: match.path,
          line: match.line,
          column: match.column,
          endColumn: match.endColumn,
          reason: 'out-of-scope',
        });
        return;
      }
      if (!repoFileSet.has(match.path)) {
        skipped.push({
          path: match.path,
          line: match.line,
          column: match.column,
          endColumn: match.endColumn,
          reason: 'not-indexed',
        });
        return;
      }
      if (fullFilePaths.has(match.path)) {
        return;
      }
      const bucket = groupedByPath.get(match.path) || [];
      bucket.push(match);
      groupedByPath.set(match.path, bucket);
    });

    for (const filePath of fullFilePaths) {
      try {
        const inspection = await resolveExistingPathWithinRoot(resolved.rootPath, filePath);
        const absolutePath = inspection.absolutePath;
        const stats = inspection.stat;
        if (!stats.isFile()) {
          skipped.push({ path: filePath, reason: 'not-file' });
          continue;
        }
        if (stats.size > CONTENT_SEARCH_MAX_FILE_BYTES) {
          skipped.push({ path: filePath, reason: 'too-large' });
          continue;
        }
        const buffer = await fsp.readFile(absolutePath);
        const sample = buffer.subarray(0, Math.min(buffer.length, 1024));
        if (sample.includes(0)) {
          skipped.push({ path: filePath, reason: 'binary' });
          continue;
        }
        const content = buffer.toString('utf8');
        validatedPattern.lastIndex = 0;
        let fileMatches = 0;
        const nextContent = content.replace(validatedPattern, () => {
          fileMatches += 1;
          return replacement;
        });
        if (!fileMatches || nextContent === content) {
          continue;
        }
        await fsp.writeFile(absolutePath, nextContent, 'utf8');
        appliedPaths.push(filePath);
        replacedFiles += 1;
        replacedMatches += fileMatches;
      } catch (error) {
        failures.push({
          path: filePath,
          error: error?.message || String(error),
        });
      }
    }

    for (const [filePath, fileMatches] of groupedByPath.entries()) {
      try {
        const inspection = await resolveExistingPathWithinRoot(resolved.rootPath, filePath);
        const absolutePath = inspection.absolutePath;
        const stats = inspection.stat;
        if (!stats.isFile()) {
          skipped.push({ path: filePath, reason: 'not-file' });
          continue;
        }
        if (stats.size > CONTENT_SEARCH_MAX_FILE_BYTES) {
          skipped.push({ path: filePath, reason: 'too-large' });
          continue;
        }
        const buffer = await fsp.readFile(absolutePath);
        const sample = buffer.subarray(0, Math.min(buffer.length, 1024));
        if (sample.includes(0)) {
          skipped.push({ path: filePath, reason: 'binary' });
          continue;
        }
        const content = buffer.toString('utf8');
        const plan = planContentMatchReplacements(content, fileMatches, validatedPattern);
        skipped.push(...plan.skipped);
        if (!plan.applied.length) {
          continue;
        }
        let nextContent = content;
        for (let index = plan.applied.length - 1; index >= 0; index -= 1) {
          const entry = plan.applied[index];
          nextContent =
            nextContent.slice(0, entry.startOffset) +
            replacement +
            nextContent.slice(entry.endOffset);
        }
        if (nextContent === content) {
          continue;
        }
        await fsp.writeFile(absolutePath, nextContent, 'utf8');
        appliedPaths.push(filePath);
        replacedFiles += 1;
        replacedMatches += plan.applied.length;
      } catch (error) {
        failures.push({
          path: filePath,
          error: error?.message || String(error),
        });
      }
    }
  } else {
    const pattern = validatedPattern;
    Array.from(confirmedSet).forEach((confirmedPath) => {
      if (!pathMatchesContentScope(confirmedPath, normalizedScope)) {
        skipped.push({ path: confirmedPath, reason: 'out-of-scope' });
        return;
      }
      if (!repoFileSet.has(confirmedPath)) {
        skipped.push({ path: confirmedPath, reason: 'not-indexed' });
      }
    });
    const files = repoFiles.filter(
      (filePath) => pathMatchesContentScope(filePath, normalizedScope) && confirmedSet.has(filePath)
    );
    for (const filePath of files) {
      try {
        const inspection = await resolveExistingPathWithinRoot(resolved.rootPath, filePath);
        const absolutePath = inspection.absolutePath;
        const stats = inspection.stat;
        if (!stats.isFile()) {
          skipped.push({ path: filePath, reason: 'not-file' });
          continue;
        }
        if (stats.size > CONTENT_SEARCH_MAX_FILE_BYTES) {
          skipped.push({ path: filePath, reason: 'too-large' });
          continue;
        }
        const buffer = await fsp.readFile(absolutePath);
        const sample = buffer.subarray(0, Math.min(buffer.length, 1024));
        if (sample.includes(0)) {
          skipped.push({ path: filePath, reason: 'binary' });
          continue;
        }
        const content = buffer.toString('utf8');
        pattern.lastIndex = 0;
        let fileMatches = 0;
        const nextContent = content.replace(pattern, () => {
          fileMatches += 1;
          return replacement;
        });
        if (!fileMatches || nextContent === content) {
          continue;
        }
        await fsp.writeFile(absolutePath, nextContent, 'utf8');
        appliedPaths.push(filePath);
        replacedFiles += 1;
        replacedMatches += fileMatches;
      } catch (error) {
        failures.push({
          path: filePath,
          error: error?.message || String(error),
        });
      }
    }
  }

  return {
    query: trimmedQuery,
    replacement,
    scope: normalizedScope,
    reviewMode: hasMatchReview ? (confirmedSet.size ? 'mixed' : 'match') : 'file',
    confirmedPaths: Array.from(confirmedSet),
    confirmedMatchCount: normalizedConfirmedMatches.length,
    replacedFiles,
    replacedMatches,
    appliedPaths,
    skipped,
    failures,
  };
}

function mergeCount(map, entry) {
  const current = map.get(entry.path) || { added: 0, deleted: 0 };
  map.set(entry.path, {
    added: current.added + (entry.added || 0),
    deleted: current.deleted + (entry.deleted || 0),
  });
}

async function collectWorktreeStatus(worktreePath) {
  const [statusOutput, diffOutput, cachedOutput] = await Promise.all([
    runGitRaw(['status', '--porcelain', '-z', '--ignored=matching', '--untracked-files=all'], worktreePath),
    runGitRaw(['diff', '--numstat', '-z'], worktreePath),
    runGitRaw(['diff', '--cached', '--numstat', '-z'], worktreePath),
  ]);
  const statusEntries = parsePorcelainZ(statusOutput);
  const diffEntries = [...parseNumstatZ(diffOutput), ...parseNumstatZ(cachedOutput)];
  const counts = new Map();
  diffEntries.forEach((entry) => mergeCount(counts, entry));

  const statusByPath = new Map();
  statusEntries.forEach((entry) => {
    statusByPath.set(entry.path, entry);
  });

  counts.forEach((value, filePath) => {
    if (!statusByPath.has(filePath)) {
      statusByPath.set(filePath, {
        path: filePath,
        status: 'M ',
        kind: 'modified',
      });
    }
  });

  return { statusByPath, countsByPath: counts };
}

function pickPrimaryStatus(statusCounts) {
  for (const status of STATUS_PRIORITY) {
    if (statusCounts[status]) {
      return status;
    }
  }
  return 'modified';
}

function ensureStatusCounts(entry) {
  return entry.statusCounts || {};
}

function bumpStatusCount(entry, status) {
  const counts = ensureStatusCounts(entry);
  counts[status] = (counts[status] || 0) + 1;
  entry.statusCounts = counts;
}

function applyFileEntry(map, filePath, cell, statusInfo, counts) {
  const entry = map.get(filePath) || {
    path: filePath,
    status: 'modified',
    statusCounts: {},
    added: 0,
    deleted: 0,
    cells: {},
  };
  const added = counts?.added || 0;
  const deleted = counts?.deleted || 0;
  const status = statusInfo?.kind || 'modified';
  entry.cells[cell.id] = {
    id: cell.id,
    name: cell.name,
    status,
    added,
    deleted,
  };
  entry.added += added;
  entry.deleted += deleted;
  bumpStatusCount(entry, status);
  entry.status = pickPrimaryStatus(entry.statusCounts);
  map.set(filePath, entry);
}

function bumpFolder(folder, fileEntry) {
  folder.added += fileEntry.added || 0;
  folder.deleted += fileEntry.deleted || 0;
  Object.entries(fileEntry.statusCounts || {}).forEach(([status, count]) => {
    folder.statusCounts[status] = (folder.statusCounts[status] || 0) + count;
  });
  Object.values(fileEntry.cells || {}).forEach((cell) => {
    const current = folder.cells[cell.id] || {
      id: cell.id,
      name: cell.name,
      added: 0,
      deleted: 0,
      statusCounts: {},
    };
    current.added += cell.added || 0;
    current.deleted += cell.deleted || 0;
    current.statusCounts[cell.status] = (current.statusCounts[cell.status] || 0) + 1;
    folder.cells[cell.id] = current;
  });
  folder.status = pickPrimaryStatus(folder.statusCounts);
}

function buildFolderSummaries(fileMap) {
  const folderMap = new Map();
  const ensureFolder = (folderPath) => {
    if (!folderMap.has(folderPath)) {
      folderMap.set(folderPath, {
        path: folderPath,
        status: 'modified',
        statusCounts: {},
        added: 0,
        deleted: 0,
        cells: {},
      });
    }
    return folderMap.get(folderPath);
  };

  fileMap.forEach((entry, filePath) => {
    const parts = filePath.split('/').filter(Boolean);
    let currentPath = '';
    ensureFolder(currentPath);
    for (let i = 0; i < parts.length - 1; i += 1) {
      currentPath = normalizeRelPath(path.posix.join(currentPath, parts[i]));
      ensureFolder(currentPath);
    }
    const folderPaths = [];
    currentPath = '';
    folderPaths.push(currentPath);
    for (let i = 0; i < parts.length - 1; i += 1) {
      currentPath = normalizeRelPath(path.posix.join(currentPath, parts[i]));
      folderPaths.push(currentPath);
    }
    folderPaths.forEach((folderPath) => {
      const folder = ensureFolder(folderPath);
      bumpFolder(folder, entry);
    });
  });

  return folderMap;
}

async function mapWithConcurrency(items, limit, mapper) {
  const list = Array.isArray(items) ? items : [];
  if (!list.length) {
    return [];
  }
  const size = Math.max(1, Math.floor(limit || 1));
  const results = new Array(list.length);
  let cursor = 0;

  const worker = async () => {
    while (cursor < list.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(list[index], index);
    }
  };

  await Promise.all(Array.from({ length: Math.min(size, list.length) }, () => worker()));
  return results;
}

async function getExplorerStatus({ rootPath } = {}) {
  if (rootPath !== statusCache.rootPath) {
    statusCache.value = null;
    statusCache.timestamp = 0;
    statusCache.promise = null;
    statusCache.rootPath = rootPath || '';
  }
  const now = Date.now();
  if (statusCache.value && now - statusCache.timestamp < STATUS_CACHE_TTL_MS) {
    return statusCache.value;
  }
  if (statusCache.promise) {
    return statusCache.promise;
  }
  statusCache.promise = (async () => {
    const repoRoot = await resolveProjectRoot({ rootPath });
    if (!repoRoot) {
      return {
        repoRoot: '',
        rootName: '',
        files: {},
        folders: {},
        cells: [],
        statusLabels: STATUS_LABELS,
      };
    }
    const cells = await listCells({ rootPath: repoRoot });
    const availableCells = Array.isArray(cells) ? cells : [];
    const worktreeCells = availableCells.filter((cell) => cell?.attachedWorktreePath);
    const fileMap = new Map();
    const statusResults = await mapWithConcurrency(
      worktreeCells,
      STATUS_WORKTREE_CONCURRENCY,
      async (cell) => ({
        cell,
        ...(await collectWorktreeStatus(cell.attachedWorktreePath)),
      })
    );

    statusResults.forEach(({ cell, statusByPath, countsByPath }) => {
      statusByPath.forEach((statusInfo, filePath) => {
        const counts = countsByPath.get(filePath);
        applyFileEntry(fileMap, filePath, cell, statusInfo, counts);
      });
    });

    const folderMap = buildFolderSummaries(fileMap);

    const files = {};
    fileMap.forEach((value, key) => {
      files[key] = value;
    });

    const folders = {};
    folderMap.forEach((value, key) => {
      folders[key] = value;
    });

    const result = {
      repoRoot,
      rootName: path.basename(repoRoot),
      files,
      folders,
      cells: availableCells.map((cell) => ({
        id: cell.id,
        name: cell.name,
        worktreePath: cell.worktreePath,
        attachedWorktreePath: cell.attachedWorktreePath,
        attachmentState: cell.attachmentState,
      })),
      statusLabels: STATUS_LABELS,
    };
    statusCache.value = result;
    statusCache.timestamp = Date.now();
    statusCache.promise = null;
    return result;
  })();
  try {
    return await statusCache.promise;
  } catch (error) {
    statusCache.promise = null;
    throw error;
  }
}

async function searchFiles({ rootPath, query, includeAll = false, limit = 1000 } = {}) {
  const rawQuery = String(query || '');
  const lowerQuery = rawQuery.toLowerCase();
  const trimmedQuery = lowerQuery.trim();

  if (!includeAll && !trimmedQuery) {
    return { matches: [], truncated: false };
  }

  const matchAll = includeAll && !trimmedQuery;
  const resolved = await resolveExplorerRoot(rootPath);
  if (!resolved.rootPath) {
    return { matches: [], truncated: false };
  }
  const tracked = await runGitRaw(['ls-files', '-z'], resolved.rootPath);
  const untracked = await runGitRaw(['ls-files', '--others', '--exclude-standard', '-z'], resolved.rootPath);
  const tokens = `${tracked}\0${untracked}`.split('\0').filter(Boolean);
  const matches = [];
  for (const token of tokens) {
    const normalized = normalizeRelPath(token);
    const normalizedLower = normalized.toLowerCase();
    if (matchAll || normalizedLower.includes(trimmedQuery)) {
      matches.push(await describeExplorerEntry(resolved.rootPath, normalized));
      if (matches.length >= limit) {
        return { matches, truncated: true };
      }
    }
  }
  return { matches, truncated: false };
}

async function createEntry({ rootPath, parentPath, name, type }) {
  if (!name) {
    throw new Error('Name is required.');
  }
  const resolved = await resolveExplorerRoot(rootPath);
  ensureResolvedRoot(resolved);
  const relativeParent = normalizeRelPath(parentPath);
  const targetRel = normalizeRelPath(path.join(relativeParent, name));
  const { absolutePath: targetPath } = await resolveMutationTargetWithinRoot(
    resolved.rootPath,
    targetRel
  );
  if (fs.existsSync(targetPath)) {
    throw new Error('Target already exists.');
  }
  await fsp.mkdir(path.dirname(targetPath), { recursive: true });
  if (type === ENTRY_TYPES.dir) {
    await fsp.mkdir(targetPath, { recursive: true });
  } else {
    await fsp.writeFile(targetPath, '', 'utf-8');
  }
  return { path: targetRel };
}

async function renameEntry({ rootPath, sourcePath, targetPath }) {
  const resolved = await resolveExplorerRoot(rootPath);
  ensureResolvedRoot(resolved);
  const fromPath = resolveSafePath(resolved.rootPath, sourcePath);
  const { absolutePath: toPath } = await resolveMutationTargetWithinRoot(
    resolved.rootPath,
    targetPath
  );
  if (!fs.existsSync(fromPath)) {
    throw new Error('Source does not exist.');
  }
  if (fs.existsSync(toPath)) {
    throw new Error('Target already exists.');
  }
  await fsp.mkdir(path.dirname(toPath), { recursive: true });
  await fsp.rename(fromPath, toPath);
  return { path: normalizeRelPath(targetPath) };
}

async function deleteEntry({ rootPath, targetPath }) {
  const resolved = await resolveExplorerRoot(rootPath);
  ensureResolvedRoot(resolved);
  const absolute = resolveSafePath(resolved.rootPath, targetPath);
  if (!fs.existsSync(absolute)) {
    return { path: normalizeRelPath(targetPath) };
  }
  await fsp.rm(absolute, { recursive: true, force: true });
  return { path: normalizeRelPath(targetPath) };
}

async function copyEntry({ rootPath, sourcePath, targetPath, resolveConflicts = false }) {
  const resolved = await resolveExplorerRoot(rootPath);
  ensureResolvedRoot(resolved);
  const fromPath = resolveSafePath(resolved.rootPath, sourcePath);
  if (!fs.existsSync(fromPath)) {
    throw new Error('Source does not exist.');
  }
  const sourceStats = await fsp.lstat(fromPath);
  const { absolutePath: requestedTargetPath } = await resolveMutationTargetWithinRoot(
    resolved.rootPath,
    targetPath
  );
  let destinationPath = requestedTargetPath;
  let conflictIndex = 0;

  if (resolveConflicts) {
    const resolvedTarget = await resolveConflictTargetPath(
      path.dirname(requestedTargetPath),
      path.basename(requestedTargetPath),
      { isDirectory: sourceStats.isDirectory() }
    );
    destinationPath = resolvedTarget.candidatePath;
    conflictIndex = resolvedTarget.conflictIndex;
  } else if (fs.existsSync(requestedTargetPath)) {
    throw new Error('Target already exists.');
  }
  if (sourceStats.isDirectory() && destinationPath.startsWith(`${fromPath}${path.sep}`)) {
    throw new Error('Cannot copy a folder into itself.');
  }
  await fsp.mkdir(path.dirname(destinationPath), { recursive: true });
  await fsp.cp(fromPath, destinationPath, { recursive: true });
  const normalizedPath = normalizeRelPath(path.relative(resolved.rootPath, destinationPath));
  return {
    path: normalizedPath,
    requestedPath: normalizeRelPath(targetPath),
    conflictIndex,
    conflictResolved: conflictIndex > 0,
  };
}


function splitConflictName(name, isDirectory) {
  if (isDirectory) {
    return { stem: name, ext: '' };
  }
  const ext = path.extname(name);
  if (!ext) {
    return { stem: name, ext: '' };
  }
  return {
    stem: name.slice(0, -ext.length) || name,
    ext,
  };
}

async function resolveConflictTargetPath(targetDirPath, entryName, { isDirectory = false } = {}) {
  const { stem, ext } = splitConflictName(entryName, isDirectory);
  let index = 0;
  while (index < 10_000) {
    const candidateName = index === 0 ? entryName : `${stem} (${index})${ext}`;
    const candidatePath = path.join(targetDirPath, candidateName);
    try {
      await fsp.access(candidatePath);
      index += 1;
      continue;
    } catch (error) {
      return {
        candidatePath,
        candidateName,
        conflictIndex: index,
      };
    }
  }
  throw new Error('Unable to resolve a conflict-safe target name.');
}

async function importEntries({ rootPath, targetDir = '', sourcePaths = [] }) {
  const resolved = await resolveExplorerRoot(rootPath);
  ensureResolvedRoot(resolved);
  const rootAbsolute = path.resolve(resolved.rootPath);
  const targetRelative = normalizeRelPath(targetDir);
  const targetInspection = await resolveExistingPathWithinRoot(rootAbsolute, targetRelative);
  const targetAbsolute = targetInspection.absolutePath;
  const targetStats = targetInspection.stat;
  if (!targetStats || !targetStats.isDirectory()) {
    throw new Error('Target directory does not exist.');
  }

  const normalizedSources = Array.from(
    new Set(
      (Array.isArray(sourcePaths) ? sourcePaths : [])
        .map((item) => String(item || '').trim())
        .filter(Boolean)
    )
  );
  if (!normalizedSources.length) {
    throw new Error('No source paths provided.');
  }

  const report = {
    targetDir: targetRelative,
    imported: [],
    importedPaths: [],
    skipped: [],
    failures: [],
    resolvedConflicts: [],
  };

  for (const sourceValue of normalizedSources) {
    const sourceAbsolute = path.resolve(sourceValue);
    try {
      const stats = await fsp.stat(sourceAbsolute);
      const sourceName = path.basename(sourceAbsolute);
      if (!sourceName) {
        report.skipped.push({ sourcePath: sourceAbsolute, reason: 'invalid-name' });
        continue;
      }

      const { candidatePath, candidateName, conflictIndex } = await resolveConflictTargetPath(
        targetAbsolute,
        sourceName,
        { isDirectory: stats.isDirectory() }
      );

      if (candidatePath === sourceAbsolute) {
        report.skipped.push({ sourcePath: sourceAbsolute, reason: 'same-path' });
        continue;
      }

      if (stats.isDirectory() && candidatePath.startsWith(`${sourceAbsolute}${path.sep}`)) {
        report.skipped.push({ sourcePath: sourceAbsolute, reason: 'target-inside-source' });
        continue;
      }

      await fsp.cp(sourceAbsolute, candidatePath, {
        recursive: true,
        force: false,
        errorOnExist: true,
      });

      const targetPath = normalizeRelPath(path.relative(rootAbsolute, candidatePath));
      report.imported.push({ sourcePath: sourceAbsolute, targetPath });
      report.importedPaths.push(targetPath);

      if (conflictIndex > 0) {
        report.resolvedConflicts.push({
          sourcePath: sourceAbsolute,
          originalName: sourceName,
          resolvedName: candidateName,
          targetPath,
        });
      }
    } catch (error) {
      report.failures.push({
        sourcePath: sourceAbsolute,
        error: error?.message || String(error),
      });
    }
  }

  return report;
}

async function revealEntry({ rootPath, targetPath }) {
  const resolved = await resolveExplorerRoot(rootPath);
  ensureResolvedRoot(resolved);
  const absolute = resolveSafePath(resolved.rootPath, targetPath);
  shell.showItemInFolder(absolute);
  return { path: normalizeRelPath(targetPath) };
}

async function readEntry({ rootPath, targetPath }) {
  if (!targetPath) {
    throw new Error('targetPath is required.');
  }
  const resolved = await resolveExplorerRoot(rootPath);
  ensureResolvedRoot(resolved);
  const inspection = await resolveExistingPathWithinRoot(resolved.rootPath, targetPath);
  const absolute = inspection.absolutePath;
  const stats = inspection.stat;
  if (!stats.isFile()) {
    throw new Error('Target is not a file.');
  }
  const size = stats.size || 0;
  const length = Math.min(size, MAX_PREVIEW_BYTES);
  const handle = await fsp.open(absolute, 'r');
  const buffer = Buffer.alloc(length);
  await handle.read(buffer, 0, length, 0);
  await handle.close();
  const isBinary = buffer.includes(0);
  return {
    path: normalizeRelPath(targetPath),
    size,
    truncated: size > MAX_PREVIEW_BYTES,
    binary: isBinary,
    content: isBinary ? '' : buffer.toString('utf-8'),
  };
}

export {
  listDirectory,
  getExplorerStatus,
  searchFiles,
  searchContent,
  replaceContent,
  createEntry,
  renameEntry,
  deleteEntry,
  copyEntry,
  importEntries,
  revealEntry,
  readEntry,
  STATUS_LABELS,
};
