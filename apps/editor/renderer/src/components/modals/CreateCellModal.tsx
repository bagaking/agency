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

export function CreateCellModal({ onClose, onCreate }: any) {
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
    <div className="space-y-6">
      <label className="group flex items-center gap-3 text-[13px] font-medium text-foreground/80 cursor-pointer select-none">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-border/60 bg-white/5 text-primary focus:ring-1 focus:ring-primary/40 focus:ring-offset-0 transition-all"
          checked={reuseExisting}
          onChange={(event) => setReuseExisting(event.target.checked)}
        />
        Link to existing git worktree
      </label>

      {reuseExisting ? (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
          <label
            className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2 block"
            htmlFor="reuse-worktree"
          >
            Select Worktree
          </label>
          <div className="relative">
            <select
              id="reuse-worktree"
              className="w-full rounded-xl border border-border/40 bg-black/40 px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all appearance-none cursor-pointer hover:bg-black/60"
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
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label
            className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2 block"
            htmlFor="cell-name"
          >
            Agent Name
          </label>
          <input
            id="cell-name"
            className="w-full rounded-xl border border-border/40 bg-black/40 px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all placeholder:text-muted-foreground/30 hover:bg-black/60"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. docs-updater"
            disabled={reuseExisting && selectedWorktreeInfo?.branch}
          />
        </div>

        <div>
          <label
            className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2 block"
            htmlFor="branch-prefix"
          >
            Branch Strategy
          </label>
          <select
            id="branch-prefix"
            className="w-full rounded-xl border border-border/40 bg-black/40 px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all cursor-pointer hover:bg-black/60"
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
        </div>
      </div>

      <div className="rounded-xl border border-border/20 bg-black/40 p-4">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-2">
          Git Reference Preview
        </div>
        <div className="font-mono text-[13px] text-primary/80 truncate">
          {reuseExisting && selectedWorktreeInfo?.branch
            ? selectedWorktreeInfo.branch
            : generatedBranch || '...'}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 mt-4 pt-2">
        <button
          type="button"
          className="rounded-xl px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          type="button"
          className="rounded-xl bg-primary px-6 py-2.5 text-[11px] font-bold uppercase tracking-widest text-slate-950 hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_10px_20px_rgba(0,0,0,0.2)]"
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
  );
}