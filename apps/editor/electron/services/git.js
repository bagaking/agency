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
    const entry = {};
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

module.exports = {
  runGit,
  getRepoRoot,
  listWorktrees,
  resolveBaseBranch,
  createWorktree,
  branchExists,
};
