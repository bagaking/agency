import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const { getRepoRoot, listWorktrees } = require('../git');
const {
  getCellStoreDir,
  normalizeCellId,
  resolveAgentConfigPath,
  resolveLegacyAgentConfigPath,
  resolveProjectConfigPath,
} = require('../scopedConfigPaths');

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

function firstExistingPath(paths: string[]): string {
  return paths.find((candidate) => Boolean(candidate) && fs.existsSync(candidate)) || '';
}

async function resolveLegacyProjectPath(repoRoot: string, worktreePath: string, filenames: string[]): Promise<string> {
  const normalizedWorktreePath = normalizeText(worktreePath);
  const directCandidates = normalizedWorktreePath
    ? filenames.map((filename) => path.join(normalizedWorktreePath, WORKTREE_AGENCY_DIR, filename))
    : [];
  const directPath = firstExistingPath(directCandidates);
  if (directPath) {
    return directPath;
  }
  if (!repoRoot) {
    return '';
  }

  try {
    const worktrees = await listWorktrees(repoRoot);
    const candidates = [];
    for (const worktree of worktrees) {
      const candidatePath = firstExistingPath(
        filenames.map((filename) => path.join(normalizeText(worktree?.path), WORKTREE_AGENCY_DIR, filename))
      );
      if (!candidatePath) {
        continue;
      }
      const stats = await fs.promises.stat(candidatePath).catch(() => null);
      candidates.push({
        path: candidatePath,
        mtimeMs: stats?.mtimeMs || 0,
      });
    }
    candidates.sort((left, right) => right.mtimeMs - left.mtimeMs);
    return candidates[0]?.path || '';
  } catch (_error) {
    return '';
  }
}

async function resolveCellIdFromWorktree(worktreePath: string): Promise<string> {
  const normalizedWorktreePath = normalizeText(worktreePath);
  if (!normalizedWorktreePath) {
    return '';
  }

  try {
    const repoRoot = await resolveRepoRootForScopedConfig({ worktreePath: normalizedWorktreePath });
    const resolved = await resolveAgentConfigPath({
      rootPath: repoRoot,
      worktreePath: normalizedWorktreePath,
      cellId: '',
      filename: 'cell.yaml',
    });
    const resolvedCellId = normalizeCellId(path.basename(resolved?.cellDir || ''));
    if (resolvedCellId) {
      return resolvedCellId;
    }
  } catch (_error) {
    // Fall back to the legacy lifecycle heuristic below.
  }

  const lifecycleDir = path.join(normalizedWorktreePath, WORKTREE_AGENCY_DIR);
  if (!fs.existsSync(lifecycleDir)) {
    return normalizeCellId(path.basename(normalizedWorktreePath));
  }

  try {
    const entries = await fs.promises.readdir(lifecycleDir);
    const lifecycleEntry = entries.find((entry) => {
      const ext = path.extname(entry);
      return entry.startsWith(LIFECYCLE_PREFIX) && LIFECYCLE_EXTENSIONS.has(ext);
    });
    if (!lifecycleEntry) {
      return normalizeCellId(path.basename(normalizedWorktreePath));
    }

    const lifecyclePath = path.join(lifecycleDir, lifecycleEntry);
    const raw = await fs.promises.readFile(lifecyclePath, 'utf-8');
    const ext = path.extname(lifecyclePath);
    const payload =
      ext === '.md'
        ? raw.match(/^---\n([\s\S]*?)\n---/)?.[1] || ''
        : raw;
    const parsed = (yaml.load(payload) || {}) as Record<string, unknown>;
    return normalizeCellId(parsed.id || parsed.name || path.basename(normalizedWorktreePath));
  } catch (_error) {
    return normalizeCellId(path.basename(normalizedWorktreePath));
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
  const cellDir = getCellStoreDir(repoRoot, cellId);
  if (!cellDir) {
    return '';
  }
  return path.join(cellDir, normalizeText(filename));
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
  const resolvedProjectConfig = await resolveProjectConfigPath({
    rootPath: repoRoot,
    worktreePath,
    filenames: normalizedFilenames,
  });
  const canonicalCandidates = repoRoot
    ? normalizedFilenames.map((filename) => path.join(buildRepoAgencyDir(repoRoot), filename))
    : [];
  const canonicalExistingPath = firstExistingPath(canonicalCandidates);
  const canonicalPath = canonicalExistingPath || resolvedProjectConfig.filePath || canonicalCandidates[0] || '';
  const legacyPath = await resolveLegacyProjectPath(repoRoot, normalizeText(worktreePath), normalizedFilenames);

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
  const normalizedCellId = normalizeCellId(cellId) || (await resolveCellIdFromWorktree(normalizeText(worktreePath)));
  const resolvedAgentConfig = await resolveAgentConfigPath({
    rootPath: repoRoot,
    worktreePath,
    cellId: normalizedCellId,
    filename,
  });
  const canonicalPath =
    resolvedAgentConfig.filePath || buildRepoOwnedCellConfigPath(repoRoot, normalizedCellId, filename);
  const canonicalExistingPath =
    canonicalPath && fs.existsSync(canonicalPath) ? canonicalPath : '';

  const normalizedWorktreePath = normalizeText(worktreePath);
  const legacyPath = resolveLegacyAgentConfigPath(normalizedWorktreePath, legacyPrefix, legacyExt);
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
};
