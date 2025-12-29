import React, { useEffect, useState } from 'react';

const branchPrefixes = ['feat', 'refactor', 'fix', 'lint', 'chore', 'doc'];
const pathBaseName = (value) => value.split('/').filter(Boolean).pop() || value;
const toBranchSlug = (value) => {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'cell';
};

export function CreateCellModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [reuseExisting, setReuseExisting] = useState(false);
  const [worktrees, setWorktrees] = useState([]);
  const [selectedWorktree, setSelectedWorktree] = useState('');
  const [branchPrefix, setBranchPrefix] = useState(branchPrefixes[0]);
  const selectedWorktreeInfo = worktrees.find((item) => item.path === selectedWorktree);
  const generatedBranch = name ? `${branchPrefix}/${toBranchSlug(name)}` : '';
  const canSubmit = reuseExisting
    ? Boolean(selectedWorktree) && (selectedWorktreeInfo?.branch || generatedBranch)
    : Boolean(generatedBranch);

  useEffect(() => {
    const loadWorktrees = async () => {
      if (!window.agency?.listWorktrees) {
        return;
      }
      try {
        const items = await window.agency.listWorktrees();
        setWorktrees(items);
      } catch (error) {
        console.error(error);
      }
    };
    loadWorktrees();
  }, []);

  const handleWorktreeSelect = (event) => {
    const nextPath = event.target.value;
    setSelectedWorktree(nextPath);
    const match = worktrees.find((item) => item.path === nextPath);
    if (match) {
      const branchParts = (match.branch || '').split('/');
      if (branchParts.length > 1 && branchPrefixes.includes(branchParts[0])) {
        setBranchPrefix(branchParts[0]);
        setName(branchParts.slice(1).join('/'));
      } else {
        setName(pathBaseName(match.path));
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      data-testid="create-cell-modal"
    >
      <div className="w-full max-w-lg rounded-lg border border-border bg-popover text-popover-foreground shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Create New Agent</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <div className="space-y-5">
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              className="rounded border-input bg-transparent text-primary focus:ring-1 focus:ring-primary"
              checked={reuseExisting}
              onChange={(event) => setReuseExisting(event.target.checked)}
            />
            Link to existing git worktree
          </label>

          {reuseExisting ? (
            <div>
              <label
                className="text-xs font-medium text-muted-foreground mb-1.5 block"
                htmlFor="reuse-worktree"
              >
                Select Worktree
              </label>
              <select
                id="reuse-worktree"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={selectedWorktree}
                onChange={handleWorktreeSelect}
              >
                <option value="">-- Choose directory --</option>
                {worktrees.map((item) => (
                  <option key={item.path} value={item.path}>
                    {item.branch || 'detached'} · {item.path}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div>
            <label
              className="text-xs font-medium text-muted-foreground mb-1.5 block"
              htmlFor="cell-name"
            >
              Agent Name
            </label>
            <input
              id="cell-name"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. docs-updater"
              disabled={reuseExisting && selectedWorktreeInfo?.branch}
            />
          </div>

          <div>
            <label
              className="text-xs font-medium text-muted-foreground mb-1.5 block"
              htmlFor="branch-prefix"
            >
              Branch Strategy
            </label>
            <div className="flex gap-2">
              <select
                id="branch-prefix"
                className="w-32 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={branchPrefix}
                onChange={(event) => setBranchPrefix(event.target.value)}
                disabled={reuseExisting && Boolean(selectedWorktreeInfo?.branch)}
              >
                {branchPrefixes.map((prefix) => (
                  <option key={prefix} value={prefix}>
                    {prefix}/
                  </option>
                ))}
              </select>
              <div className="flex-1 flex items-center px-3 text-sm text-muted-foreground border border-transparent">
                {toBranchSlug(name) || '<name>'}
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground font-mono bg-muted/30 p-1.5 rounded">
              git branch:{' '}
              {reuseExisting && selectedWorktreeInfo?.branch
                ? selectedWorktreeInfo.branch
                : generatedBranch || '...'}
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 mt-8">
            <button
              type="button"
              className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!canSubmit}
              onClick={() =>
                onCreate({
                  name,
                  branch: generatedBranch,
                  reusePath: reuseExisting ? selectedWorktree : undefined,
                })
              }
            >
              Create Agent
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
