import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, FolderTree, GitBranch, Info } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import { focusRing } from '../ui/focusRing';

const branchStrategies = [
  { value: 'feat', label: 'feat', hint: 'New feature work' },
  { value: 'refactor', label: 'refactor', hint: 'Code structure improvements' },
  { value: 'fix', label: 'fix', hint: 'Bug fix flow' },
  { value: 'lint', label: 'lint', hint: 'Lint and hygiene updates' },
  { value: 'chore', label: 'chore', hint: 'Maintenance tasks' },
  { value: 'doc', label: 'doc', hint: 'Documentation updates' },
];

const pathBaseName = (value: string) => value.split('/').filter(Boolean).pop() || value;

const toBranchSlug = (value: string) => {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'cell';
};

function HintIcon({ label }: any) {
  const focusRingClass = focusRing.default;
  return (
    <Tooltip label={label}>
      <button
        type="button"
        className={`inline-flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground/55 transition-colors hover:text-foreground/85 ${focusRingClass}`}
        aria-label={label}
      >
        <Info size={12} aria-hidden="true" />
      </button>
    </Tooltip>
  );
}

export function CreateCellModal({ onClose, onCreate }: any) {
  const [name, setName] = useState('');
  const [reuseExisting, setReuseExisting] = useState(false);
  const [worktrees, setWorktrees] = useState<any[]>([]);
  const [selectedWorktree, setSelectedWorktree] = useState('');
  const [branchPrefix, setBranchPrefix] = useState(branchStrategies[0].value);
  const [startTurn, setStartTurn] = useState(true);

  const focusRingClass = focusRing.default;
  const selectedWorktreeInfo = useMemo(
    () => worktrees.find((item) => item.path === selectedWorktree),
    [selectedWorktree, worktrees]
  );

  const isBranchLocked = reuseExisting && Boolean(selectedWorktreeInfo?.branch);
  const generatedBranch = name ? `${branchPrefix}/${toBranchSlug(name)}` : '';
  const branchPreview = isBranchLocked ? selectedWorktreeInfo?.branch : generatedBranch;
  const selectedBranchStrategy =
    branchStrategies.find((item) => item.value === branchPrefix) || branchStrategies[0];
  const canSubmit = reuseExisting
    ? Boolean(selectedWorktree) && Boolean(branchPreview)
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

  const handleWorktreeSelect = (event: any) => {
    const nextPath = event.target.value;
    setSelectedWorktree(nextPath);
    const match = worktrees.find((item) => item.path === nextPath);
    if (match) {
      const branchParts = (match.branch || '').split('/');
      if (branchParts.length > 1 && branchStrategies.some((item) => item.value === branchParts[0])) {
        setBranchPrefix(branchParts[0]);
        setName(branchParts.slice(1).join('/'));
      } else {
        setName(pathBaseName(match.path));
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <label className="group flex items-center gap-2.5 text-[13px] font-medium text-foreground/85 cursor-pointer select-none">
          <input
            type="checkbox"
            className={`h-4 w-4 rounded border-border/60 bg-background text-primary ${focusRingClass}`}
            checked={reuseExisting}
            onChange={(event) => setReuseExisting(event.target.checked)}
          />
          <span>Link to existing git worktree</span>
        </label>
        <HintIcon label="Each Agent Cell runs in its own worktree so commits stay isolated and easy to review." />
      </div>

      {reuseExisting ? (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <label
              className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70"
              htmlFor="reuse-worktree"
            >
              Existing Worktree
            </label>
            {!worktrees.length ? (
              <HintIcon label="No reusable worktrees found yet. Create one cell first, then reuse it from this menu." />
            ) : null}
          </div>
          <div className="relative">
            <select
              id="reuse-worktree"
              className={`w-full appearance-none rounded-xl border border-border/40 bg-background/70 px-3 py-2.5 pr-9 text-sm text-foreground shadow-sm transition-colors hover:border-primary/40 ${focusRingClass} disabled:cursor-not-allowed disabled:opacity-60`}
              value={selectedWorktree}
              onChange={handleWorktreeSelect}
              disabled={!worktrees.length}
            >
              <option value="">
                {worktrees.length ? 'Choose directory...' : 'No reusable worktrees available'}
              </option>
              {worktrees.map((item) => (
                <option key={item.path} value={item.path}>
                  {item.branch || 'detached'} - {item.path}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70"
              aria-hidden="true"
            />
          </div>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <label
            className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70"
            htmlFor="cell-name"
          >
            Branch Strategy + Cell Name
          </label>
          <HintIcon
            label={`Branch prefix and cell name compose the branch title. ${selectedBranchStrategy.label}: ${selectedBranchStrategy.hint}.`}
          />
        </div>

        <div
          className={`group flex items-center rounded-xl border border-border/40 bg-background/70 transition-colors ${
            isBranchLocked ? 'opacity-80' : 'hover:border-primary/35 focus-within:border-primary/45'
          }`}
        >
          <div className="relative shrink-0">
            <select
              id="branch-prefix"
              className={`h-11 appearance-none bg-transparent pl-3 pr-8 text-sm font-semibold text-primary/90 ${focusRingClass} disabled:cursor-not-allowed disabled:opacity-60`}
              value={branchPrefix}
              onChange={(event) => setBranchPrefix(event.target.value)}
              disabled={isBranchLocked}
            >
              {branchStrategies.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={13}
              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/70"
              aria-hidden="true"
            />
          </div>

          <span className="h-6 w-px bg-border/40" aria-hidden="true" />
          <span className="px-2 text-sm font-mono text-muted-foreground/55">/</span>

          <input
            id="cell-name"
            className={`h-11 flex-1 bg-transparent pr-3 text-sm text-foreground placeholder:text-muted-foreground/35 ${focusRingClass} disabled:cursor-not-allowed disabled:opacity-60`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. explorer-dock-sync"
            disabled={isBranchLocked}
          />
        </div>

        <div className="flex items-center justify-between gap-2 text-[10px]">
          <div className="flex min-w-0 items-center gap-1.5 text-muted-foreground/75">
            <GitBranch size={11} className="shrink-0 text-primary/80" aria-hidden="true" />
            <span className="font-mono text-[11px] text-primary/90 truncate">{branchPreview || '...'}</span>
          </div>

          {reuseExisting && selectedWorktreeInfo?.path ? (
            <Tooltip label={selectedWorktreeInfo.path}>
              <div className="flex min-w-0 items-center gap-1.5 text-muted-foreground/65">
                <FolderTree size={11} className="shrink-0" aria-hidden="true" />
                <span className="max-w-[170px] truncate">{pathBaseName(selectedWorktreeInfo.path)}</span>
              </div>
            </Tooltip>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border/30 bg-background/50 px-3 py-2">
        <label className="group flex items-center gap-2.5 text-[12px] font-medium text-foreground/85 cursor-pointer select-none">
          <input
            type="checkbox"
            className={`h-4 w-4 rounded border-border/60 bg-background text-primary ${focusRingClass}`}
            checked={startTurn}
            onChange={(event) => setStartTurn(event.target.checked)}
          />
          <span>Start Turn with Gate Create sheet</span>
        </label>
        <HintIcon label="After cell creation, open a Gate Create Action Sheet to define checks before implementation." />
      </div>

      <div className="mt-1 flex items-center justify-end gap-2.5">
        <button
          type="button"
          className={`rounded-xl border border-border/30 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground hover:border-primary/40 ${focusRingClass}`}
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          type="button"
          className={`rounded-xl bg-primary px-5 py-2 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 ${focusRingClass}`}
          disabled={!canSubmit}
          onClick={() =>
            onCreate({
              name,
              branch: generatedBranch,
              reusePath: reuseExisting ? selectedWorktree : undefined,
              startTurnGateCreate: startTurn,
            })
          }
        >
          Create Cell
        </button>
      </div>
    </div>
  );
}
