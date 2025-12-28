const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { runGit } = require('./git');

const CONFIG_DIR = '.agency';
const CONFIG_FILE = 'worktree-links.yaml';

function getConfigPath(repoRoot) {
  return path.join(repoRoot, CONFIG_DIR, CONFIG_FILE);
}

function normalizeId(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isAbsolutePath(value) {
  return Boolean(value) && path.isAbsolute(value);
}

function resolvePath(base, value) {
  if (!value) {
    return '';
  }
  return isAbsolutePath(value) ? value : path.join(base, value);
}

function normalizeLinks(links) {
  const used = new Set();
  return (Array.isArray(links) ? links : []).map((link, index) => {
    const raw = link || {};
    const base =
      normalizeId(raw.id) ||
      normalizeId(raw.label) ||
      normalizeId(path.basename(raw.source || '')) ||
      `link-${index + 1}`;
    let id = base;
    let counter = 1;
    while (used.has(id) || !id) {
      id = `${base || 'link'}-${counter}`;
      counter += 1;
    }
    used.add(id);
    return {
      id,
      label: String(raw.label || '').trim(),
      source: String(raw.source || '').trim(),
      target: String(raw.target || '').trim(),
    };
  });
}

async function listTrackedTopLevelDirs(repoRoot) {
  try {
    const output = await runGit(['ls-tree', '-d', '--name-only', 'HEAD'], { cwd: repoRoot });
    if (!output) {
      return new Set();
    }
    return new Set(
      output
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
    );
  } catch (error) {
    return new Set();
  }
}

async function readConfig(repoRoot) {
  const configPath = getConfigPath(repoRoot);
  if (!fs.existsSync(configPath)) {
    return {
      version: 1,
      autoLinkOnCreate: false,
      links: [],
    };
  }
  const raw = await fs.promises.readFile(configPath, 'utf-8');
  const parsed = yaml.load(raw) || {};
  return {
    version: parsed.version || 1,
    autoLinkOnCreate: Boolean(parsed.autoLinkOnCreate),
    links: normalizeLinks(parsed.links),
  };
}

async function writeConfig(repoRoot, config) {
  const configPath = getConfigPath(repoRoot);
  await fs.promises.mkdir(path.dirname(configPath), { recursive: true });
  const next = {
    version: 1,
    autoLinkOnCreate: Boolean(config?.autoLinkOnCreate),
    links: normalizeLinks(config?.links),
  };
  const content = yaml.dump(next, { lineWidth: 120 });
  await fs.promises.writeFile(configPath, content, 'utf-8');
  return next;
}

async function listCandidateDirectories(repoRoot) {
  const fetchList = async (args) => {
    try {
      return await runGit(args, { cwd: repoRoot });
    } catch (error) {
      return '';
    }
  };
  const [untracked, ignored] = await Promise.all([
    fetchList(['ls-files', '-o', '--exclude-standard', '--directory']),
    fetchList(['ls-files', '-o', '-i', '--exclude-standard', '--directory']),
  ]);
  const combined = [untracked, ignored].filter(Boolean).join('\n');
  if (!combined) {
    return [];
  }
  const trackedRoots = await listTrackedTopLevelDirs(repoRoot);
  const candidates = new Set();
  combined
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((entry) => {
      const normalized = entry.replace(/\/$/, '');
      if (!normalized) {
        return;
      }
      const root = normalized.split('/')[0];
      if (!root) {
        return;
      }
      if (trackedRoots.has(root)) {
        return;
      }
      const candidatePath = path.join(repoRoot, root);
      try {
        if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isDirectory()) {
          candidates.add(root);
        }
      } catch (error) {
        // Ignore fs errors for stale paths.
      }
    });
  return Array.from(candidates).sort();
}

function getLinkStatus({ repoRoot, worktreePath, link }) {
  const sourcePath = resolvePath(repoRoot, link.source);
  const targetPath = resolvePath(worktreePath, link.target);
  if (!link.source || !link.target) {
    return {
      id: link.id,
      status: 'missing',
      sourcePath,
      targetPath,
    };
  }
  const sourceExists = sourcePath && fs.existsSync(sourcePath);
  const targetExists = targetPath && fs.existsSync(targetPath);

  if (!sourceExists) {
    return {
      id: link.id,
      status: 'source-missing',
      sourcePath,
      targetPath,
    };
  }

  if (!targetExists) {
    return {
      id: link.id,
      status: 'missing',
      sourcePath,
      targetPath,
    };
  }

  try {
    const stat = fs.lstatSync(targetPath);
    if (stat.isSymbolicLink()) {
      const linkTarget = fs.readlinkSync(targetPath);
      const resolvedTarget = path.resolve(path.dirname(targetPath), linkTarget);
      const resolvedSource = fs.realpathSync(sourcePath);
      if (resolvedTarget === resolvedSource) {
        return {
          id: link.id,
          status: 'linked',
          sourcePath,
          targetPath,
        };
      }
    }
  } catch (error) {
    return {
      id: link.id,
      status: 'conflict',
      sourcePath,
      targetPath,
    };
  }

  return {
    id: link.id,
    status: 'conflict',
    sourcePath,
    targetPath,
  };
}

function getLinkStatuses({ repoRoot, worktreePath, links }) {
  return (links || []).map((link) => getLinkStatus({ repoRoot, worktreePath, link }));
}

async function applyLink({ repoRoot, worktreePath, linkId }) {
  const config = await readConfig(repoRoot);
  const link = config.links.find((item) => item.id === linkId);
  if (!link) {
    throw new Error('Link not found.');
  }
  const sourcePath = resolvePath(repoRoot, link.source);
  const targetPath = resolvePath(worktreePath, link.target);
  if (!sourcePath || !fs.existsSync(sourcePath)) {
    throw new Error('Source path is missing.');
  }
  if (!targetPath) {
    throw new Error('Target path is missing.');
  }

  if (fs.existsSync(targetPath)) {
    const stat = fs.lstatSync(targetPath);
    if (stat.isSymbolicLink()) {
      const linkTarget = fs.readlinkSync(targetPath);
      const resolvedTarget = path.resolve(path.dirname(targetPath), linkTarget);
      const resolvedSource = fs.realpathSync(sourcePath);
      if (resolvedTarget === resolvedSource) {
        return { status: 'linked', skipped: true };
      }
    }
    throw new Error('Target already exists.');
  }

  await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
  const sourceStat = fs.statSync(sourcePath);
  const type = sourceStat.isDirectory() ? 'dir' : 'file';
  await fs.promises.symlink(sourcePath, targetPath, type);
  return { status: 'linked' };
}

async function applyAllLinks({ repoRoot, worktreePath, bestEffort = false }) {
  const config = await readConfig(repoRoot);
  const results = [];
  for (const link of config.links) {
    try {
      const result = await applyLink({ repoRoot, worktreePath, linkId: link.id });
      results.push({ id: link.id, ok: true, result });
    } catch (error) {
      results.push({ id: link.id, ok: false, error: error?.message || 'Failed to link.' });
      if (!bestEffort) {
        throw error;
      }
    }
  }
  return results;
}

async function readSummary({ repoRoot, worktreePath, worktreePaths = [] }) {
  const config = await readConfig(repoRoot);
  const candidates = await listCandidateDirectories(repoRoot);
  
  const allPaths = new Set(worktreePaths);
  if (worktreePath) allPaths.add(worktreePath);

  const statusesByPath = {};
  for (const p of allPaths) {
    statusesByPath[p] = getLinkStatuses({ repoRoot, worktreePath: p, links: config.links });
  }

  return {
    config,
    candidates,
    statuses: worktreePath ? statusesByPath[worktreePath] : [],
    statusesByPath,
    configPath: getConfigPath(repoRoot),
    repoRoot,
  };
}

module.exports = {
  getConfigPath,
  readConfig,
  writeConfig,
  readSummary,
  listCandidateDirectories,
  getLinkStatuses,
  applyLink,
  applyAllLinks,
};
