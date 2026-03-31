const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

async function runGit(args, options = {}) {
  const result = await execFileAsync('git', args, options);
  return result.stdout.trim();
}

async function getRepoRoot(cwd = process.cwd()) {
  return runGit(['rev-parse', '--show-toplevel'], { cwd });
}

async function listWorktrees(repoRoot) {
  const output = await runGit(['worktree', 'list', '--porcelain'], { cwd: repoRoot });
  if (!output) {
    return [];
  }
  const blocks = output.split('\n\n').map((block) => block.trim()).filter(Boolean);
  return blocks.map((block) => {
    const entry: Record<string, string> = {};
    block.split('\n').forEach((line) => {
      if (line.startsWith('worktree ')) {
        entry.path = line.replace('worktree ', '').trim();
      } else if (line.startsWith('branch ')) {
        entry.branch = line.replace('branch ', '').trim();
      } else if (line.startsWith('head ')) {
        entry.head = line.replace('head ', '').trim();
      }
    });
    if (entry.branch && entry.branch.startsWith('refs/heads/')) {
      entry.branch = entry.branch.replace('refs/heads/', '');
    }
    return entry;
  });
}

async function listBranches(repoRoot) {
  const [output, worktrees, defaultBranch] = await Promise.all([
    runGit(['for-each-ref', '--format=%(refname:short)', 'refs/heads'], { cwd: repoRoot }),
    listWorktrees(repoRoot),
    resolveBaseBranch(repoRoot),
  ]);
  const attachedWorktreePathByBranch = new Map(
    worktrees
      .filter((entry) => entry.branch)
      .map((entry) => [entry.branch, entry.path])
  );
  const currentBranch = await runGit(['branch', '--show-current'], { cwd: repoRoot }).catch(() => '');
  const branches = output
    .split('\n')
    .map((value) => value.trim())
    .filter(Boolean)
    .map((name) => ({
      name,
      current: name === currentBranch,
      isDefault: name === defaultBranch,
      attachedWorktreePath: attachedWorktreePathByBranch.get(name) || '',
    }));

  return branches.sort((left, right) => {
    if (left.isDefault !== right.isDefault) {
      return left.isDefault ? -1 : 1;
    }
    if (left.current !== right.current) {
      return left.current ? -1 : 1;
    }
    return left.name.localeCompare(right.name);
  });
}

async function branchExists(repoRoot, branch) {
  try {
    await runGit(['show-ref', '--verify', `refs/heads/${branch}`], { cwd: repoRoot });
    return true;
  } catch (error) {
    return false;
  }
}

async function resolveBaseBranch(repoRoot) {
  try {
    const ref = await runGit(['symbolic-ref', 'refs/remotes/origin/HEAD'], { cwd: repoRoot });
    const parts = ref.split('/');
    return parts[parts.length - 1];
  } catch (error) {
    for (const candidate of ['main', 'master']) {
      if (await branchExists(repoRoot, candidate)) {
        return candidate;
      }
    }
    return 'main';
  }
}

async function createWorktree(repoRoot, worktreePath, branch, baseBranch) {
  const exists = await branchExists(repoRoot, branch);
  if (exists) {
    return runGit(['worktree', 'add', worktreePath, branch], { cwd: repoRoot });
  }
  return runGit(['worktree', 'add', '-b', branch, worktreePath, baseBranch], { cwd: repoRoot });
}

export {
  runGit,
  getRepoRoot,
  listWorktrees,
  listBranches,
  resolveBaseBranch,
  createWorktree,
  branchExists,
};
