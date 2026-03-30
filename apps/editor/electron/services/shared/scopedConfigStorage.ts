import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const { getRepoRoot } = require('../git');

type ScopedConfigContext = {
  projectRoot?: string;
  worktreePath?: string;
  cellId?: string;
};

type ProjectScopePathOptions = ScopedConfigContext & {
  filenames: string[];
};

type AgentScopePathOptions = ScopedConfigContext & {
  filename: string;
  legacyPrefix: string;
  legacyExt?: string;
};

type ResolvedScopePaths = {
  repoRoot: string;
  canonicalPath: string;
  legacyPath: string;
  readPath: string;
};

const WORKTREE_AGENCY_DIR = '.agency';
const LIFECYCLE_PREFIX = 'cell-';
const LIFECYCLE_EXTENSIONS = new Set(['.yaml', '.yml', '.md']);

function normalizeText(value: unknown): string {
  return String(value || '').trim();
}

function sanitizePathSegment(value: unknown): string {
  return normalizeText(value).replace(/[^a-zA-Z0-9._-]+/g, '-');
}

function firstExistingPath(paths: string[]): string {
  return paths.find((candidate) => Boolean(candidate) && fs.existsSync(candidate)) || '';
}

async function resolveCellIdFromWorktree(worktreePath: string): Promise<string> {
  const normalizedWorktreePath = normalizeText(worktreePath);
  if (!normalizedWorktreePath) {
    return '';
  }

  const lifecycleDir = path.join(normalizedWorktreePath, WORKTREE_AGENCY_DIR);
  if (!fs.existsSync(lifecycleDir)) {
    return sanitizePathSegment(path.basename(normalizedWorktreePath));
  }

  try {
    const entries = await fs.promises.readdir(lifecycleDir);
    const lifecycleEntry = entries.find((entry) => {
      const ext = path.extname(entry);
      return entry.startsWith(LIFECYCLE_PREFIX) && LIFECYCLE_EXTENSIONS.has(ext);
    });
    if (!lifecycleEntry) {
      return sanitizePathSegment(path.basename(normalizedWorktreePath));
    }

    const lifecyclePath = path.join(lifecycleDir, lifecycleEntry);
    const raw = await fs.promises.readFile(lifecyclePath, 'utf-8');
    const ext = path.extname(lifecyclePath);
    const payload =
      ext === '.md'
        ? raw.match(/^---\n([\s\S]*?)\n---/)?.[1] || ''
        : raw;
    const parsed = (yaml.load(payload) || {}) as Record<string, unknown>;
    return sanitizePathSegment(parsed.id || parsed.name || path.basename(normalizedWorktreePath));
  } catch (_error) {
    return sanitizePathSegment(path.basename(normalizedWorktreePath));
  }
}

async function resolveRepoRootForScopedConfig({
  projectRoot,
  worktreePath,
}: ScopedConfigContext): Promise<string> {
  const normalizedProjectRoot = normalizeText(projectRoot);
  if (normalizedProjectRoot) {
    try {
      return await getRepoRoot(normalizedProjectRoot);
    } catch (_error) {
      if (fs.existsSync(normalizedProjectRoot)) {
        return normalizedProjectRoot;
      }
    }
  }

  const normalizedWorktreePath = normalizeText(worktreePath);
  if (!normalizedWorktreePath) {
    return '';
  }

  try {
    return await getRepoRoot(normalizedWorktreePath);
  } catch (_error) {
    return '';
  }
}

function buildRepoAgencyDir(repoRoot: string): string {
  return path.join(repoRoot, '.agency');
}

function buildRepoOwnedCellConfigPath(repoRoot: string, cellId: string, filename: string): string {
  return path.join(
    buildRepoAgencyDir(repoRoot),
    'cells',
    sanitizePathSegment(cellId),
    normalizeText(filename)
  );
}

async function resolveProjectScopeConfigPaths({
  projectRoot,
  worktreePath,
  filenames,
}: ProjectScopePathOptions): Promise<ResolvedScopePaths> {
  const normalizedFilenames = Array.isArray(filenames)
    ? filenames.map((entry) => normalizeText(entry)).filter(Boolean)
    : [];
  if (!normalizedFilenames.length) {
    return {
      repoRoot: '',
      canonicalPath: '',
      legacyPath: '',
      readPath: '',
    };
  }

  const repoRoot = await resolveRepoRootForScopedConfig({ projectRoot, worktreePath });
  const canonicalCandidates = repoRoot
    ? normalizedFilenames.map((filename) => path.join(buildRepoAgencyDir(repoRoot), filename))
    : [];
  const canonicalExistingPath = firstExistingPath(canonicalCandidates);
  const canonicalPath = canonicalExistingPath || canonicalCandidates[0] || '';

  const normalizedWorktreePath = normalizeText(worktreePath);
  const legacyCandidates = normalizedWorktreePath
    ? normalizedFilenames.map((filename) =>
        path.join(normalizedWorktreePath, '.agency', filename)
      )
    : [];
  const legacyPath = firstExistingPath(legacyCandidates);

  return {
    repoRoot,
    canonicalPath,
    legacyPath,
    readPath: canonicalExistingPath || legacyPath || canonicalPath,
  };
}

async function resolveAgentScopeConfigPaths({
  projectRoot,
  worktreePath,
  cellId,
  filename,
  legacyPrefix,
  legacyExt = '.yaml',
}: AgentScopePathOptions): Promise<ResolvedScopePaths> {
  const repoRoot = await resolveRepoRootForScopedConfig({ projectRoot, worktreePath });
  const normalizedCellId =
    sanitizePathSegment(cellId) || (await resolveCellIdFromWorktree(normalizeText(worktreePath)));
  const canonicalPath =
    repoRoot && normalizedCellId
      ? buildRepoOwnedCellConfigPath(repoRoot, normalizedCellId, filename)
      : '';
  const canonicalExistingPath =
    canonicalPath && fs.existsSync(canonicalPath) ? canonicalPath : '';

  const normalizedWorktreePath = normalizeText(worktreePath);
  const worktreeName = normalizedWorktreePath ? path.basename(normalizedWorktreePath) : '';
  const legacyPath =
    normalizedWorktreePath && worktreeName
      ? path.join(
          normalizedWorktreePath,
          '.agency',
          `${normalizeText(legacyPrefix)}${worktreeName}${normalizeText(legacyExt) || '.yaml'}`
        )
      : '';
  const legacyExistingPath = legacyPath && fs.existsSync(legacyPath) ? legacyPath : '';

  return {
    repoRoot,
    canonicalPath,
    legacyPath: legacyExistingPath || legacyPath,
    readPath: canonicalExistingPath || legacyExistingPath || canonicalPath,
  };
}

export {
  buildRepoOwnedCellConfigPath,
  resolveAgentScopeConfigPaths,
  resolveProjectScopeConfigPaths,
  resolveRepoRootForScopedConfig,
  sanitizePathSegment,
};
