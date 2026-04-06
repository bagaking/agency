import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, FolderTree, GitBranch, Info } from 'lucide-react';

import { Tooltip } from '../ui/Tooltip';
import { focusRing } from '../ui/focusRing';
import {
  isAgencyMethodAvailable,
  listBranches,
  listWorktrees,
} from '../../services/agencyBridge';

const branchStrategies = [
  { value: 'feat', label: 'feat', hint: 'New feature work' },
  { value: 'refactor', label: 'refactor', hint: 'Code structure improvements' },
  { value: 'fix', label: 'fix', hint: 'Bug fix flow' },
  { value: 'lint', label: 'lint', hint: 'Lint and hygiene updates' },
  { value: 'chore', label: 'chore', hint: 'Maintenance tasks' },
  { value: 'doc', label: 'doc', hint: 'Documentation updates' },
];

const creationModes = [
  {
    value: 'create',
    label: 'Create Branch Worktree',
    hint: 'Agency creates a new branch and worktree for a new tracked Cell.',
  },
  {
    value: 'worktree',
    label: 'Track Existing Worktree',
    hint: 'Adopt a live worktree as a tracked Cell without changing branch identity.',
  },
  {
    value: 'branch',
    label: 'Bind Existing Branch',
    hint: 'Track an existing branch as a Cell first; worktree attachment creation stays explicit.',
  },
] as const;

type CreationMode = (typeof creationModes)[number]['value'];

const pathBaseName = (value: string) => value.split('/').filter(Boolean).pop() || value;

const toBranchSlug = (value: string) => {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'cell';
};

const deriveCellNameFromBranch = (value: string) => {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return '';
  }
  const segments = normalized.split('/').filter(Boolean);
  return segments[segments.length - 1] || normalized;
};

const resolveWorktreeStatusLabel = (worktree: any) => {
  if (!worktree) {
    return '';
  }
  const branch = String(worktree?.branch || '').trim();
  if (branch) {
    return branch;
  }
  const head = String(worktree?.head || '').trim();
  return head ? `Detached HEAD · ${head.slice(0, 7)}` : 'Detached HEAD';
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

function resolveBoundCellName({
  mode,
  typedName,
  selectedWorktreeInfo,
  selectedBranchInfo,
  bindTargetCellName,
}: {
  mode: CreationMode;
  typedName: string;
  selectedWorktreeInfo: any;
  selectedBranchInfo: any;
  bindTargetCellName?: string;
}) {
  const trimmed = String(typedName || '').trim();
  if (trimmed) {
    return trimmed;
  }
  const boundCellName = String(bindTargetCellName || '').trim();
  if (boundCellName) {
    return boundCellName;
  }
  if (mode === 'worktree') {
    return (
      deriveCellNameFromBranch(selectedWorktreeInfo?.branch || '') ||
      pathBaseName(selectedWorktreeInfo?.path || '')
    );
  }
  if (mode === 'branch') {
    return deriveCellNameFromBranch(selectedBranchInfo?.name || '');
  }
  return '';
}

function ModePicker({
  mode,
  onChange,
}: {
  mode: CreationMode;
  onChange: (value: CreationMode) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">
          Worktree Action
        </label>
        <HintIcon label="Create makes a new branch/worktree. Track reuses an existing worktree or branch." />
      </div>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
        {creationModes.map((item) => {
          const active = mode === item.value;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => onChange(item.value)}
              className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                active
                  ? 'border-primary/45 bg-primary/10 text-foreground'
                  : 'border-border/35 bg-background/40 text-muted-foreground hover:border-primary/30 hover:text-foreground'
              }`}
            >
              <div className="text-[11px] font-semibold">{item.label}</div>
              <div className="mt-1 text-[10px] leading-4 text-muted-foreground/75">{item.hint}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CreateCellModal({
  onClose,
  onCreate,
  projectRoot = '',
  initialMode = 'create',
  initialName = '',
  initialReusePath = '',
  initialExistingBranch = '',
  initialBindTargetCell = null,
}: any) {
  const [mode, setMode] = useState<CreationMode>(initialMode);
  const [name, setName] = useState(initialName);
  const [nameTouched, setNameTouched] = useState(false);
  const [worktrees, setWorktrees] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedWorktree, setSelectedWorktree] = useState(initialReusePath);
  const [selectedBranch, setSelectedBranch] = useState(initialExistingBranch);
  const [branchPrefix, setBranchPrefix] = useState(branchStrategies[0].value);
  const [baseBranch, setBaseBranch] = useState('');

  const focusRingClass = focusRing.default;
  const selectedWorktreeInfo = useMemo(
    () => worktrees.find((item) => item.path === selectedWorktree),
    [selectedWorktree, worktrees]
  );
  const selectedBranchInfo = useMemo(
    () => branches.find((item) => item.name === selectedBranch),
    [branches, selectedBranch]
  );
  const selectedBranchStrategy =
    branchStrategies.find((item) => item.value === branchPrefix) || branchStrategies[0];
  const bindTargetCellId = String(initialBindTargetCell?.id || '').trim();
  const bindTargetCellName = String(initialBindTargetCell?.name || '').trim();
  const bindTargetCellBranch = String(initialBindTargetCell?.branch || '').trim();
  const resolvedBoundName = resolveBoundCellName({
    mode,
    typedName: name,
    selectedWorktreeInfo,
    selectedBranchInfo,
    bindTargetCellName,
  });
  const generatedBranch = name ? `${branchPrefix}/${toBranchSlug(name)}` : '';
  const branchPreview =
    mode === 'create'
      ? generatedBranch
      : mode === 'worktree'
        ? resolveWorktreeStatusLabel(selectedWorktreeInfo)
        : String(selectedBranchInfo?.name || '').trim();
  const canSubmit =
    mode === 'create'
      ? Boolean(generatedBranch) && Boolean(baseBranch)
      : mode === 'worktree'
        ? Boolean(selectedWorktree) &&
          Boolean(resolvedBoundName) &&
          (bindTargetCellId ? true : Boolean(String(selectedWorktreeInfo?.branch || '').trim()))
        : Boolean(selectedBranch) && Boolean(resolvedBoundName);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    setSelectedWorktree(initialReusePath || '');
  }, [initialReusePath]);

  useEffect(() => {
    setSelectedBranch(initialExistingBranch || '');
  }, [initialExistingBranch]);

  useEffect(() => {
    if (nameTouched) {
      return;
    }
    if (bindTargetCellId && mode === 'worktree') {
      setName(bindTargetCellName || '');
      return;
    }
    if (initialName) {
      setName(initialName);
    }
  }, [bindTargetCellId, bindTargetCellName, initialName, mode, nameTouched]);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [worktreeItems, branchItems] = await Promise.all([
          isAgencyMethodAvailable('listWorktrees')
            ? listWorktrees({ rootPath: projectRoot })
            : Promise.resolve([]),
          isAgencyMethodAvailable('listBranches')
            ? listBranches({ rootPath: projectRoot })
            : Promise.resolve([]),
        ]);
        setWorktrees(Array.isArray(worktreeItems) ? worktreeItems : []);
        setBranches(Array.isArray(branchItems) ? branchItems : []);
      } catch (error) {
        console.error(error);
      }
    };
    loadOptions();
  }, [projectRoot]);

  useEffect(() => {
    if (!branches.length || baseBranch) {
      return;
    }
    const preferred =
      branches.find((item) => item.isDefault)?.name ||
      branches.find((item) => item.name === 'main')?.name ||
      branches.find((item) => item.current)?.name ||
      branches[0]?.name ||
      '';
    setBaseBranch(preferred);
  }, [baseBranch, branches]);

  const handleWorktreeSelect = (event: any) => {
    const nextPath = event.target.value;
    setSelectedWorktree(nextPath);
    const match = worktrees.find((item) => item.path === nextPath);
    if (match && !nameTouched) {
      setName(
        deriveCellNameFromBranch(match.branch || '') || pathBaseName(match.path)
      );
    }
  };

  const handleBranchSelect = (event: any) => {
    const nextBranch = event.target.value;
    setSelectedBranch(nextBranch);
    const match = branches.find((item) => item.name === nextBranch);
    if (match && !nameTouched) {
      setName(deriveCellNameFromBranch(match.name || ''));
    }
  };

  const bindingSummary =
    mode === 'branch'
      ? bindTargetCellId
        ? selectedBranchInfo?.attachedWorktreePath
          ? `This action will bind ${bindTargetCellName || bindTargetCellId} to the live workspace at ${pathBaseName(selectedBranchInfo.attachedWorktreePath)}.`
          : 'This action will create a new worktree attachment for the selected branch. The Cell already exists; only the attachment will be materialized.'
        : selectedBranchInfo?.attachedWorktreePath
        ? `Tracking will reuse the existing worktree at ${pathBaseName(selectedBranchInfo.attachedWorktreePath)}.`
        : 'Binding keeps this as a branch-only Cell. No worktree will be created until you explicitly create an attachment later.'
      : bindTargetCellId && selectedWorktreeInfo?.path && !String(selectedWorktreeInfo?.branch || '').trim()
        ? `Reattaching ${pathBaseName(selectedWorktreeInfo.path)} under ${bindTargetCellName || bindTargetCellId} while the live worktree is on detached HEAD. Agency will keep the existing Cell record and preserve its stored branch metadata until the worktree is attached to a branch again.`
      : selectedWorktreeInfo?.path
        ? `Tracking ${pathBaseName(selectedWorktreeInfo.path)} without renaming its branch.`
        : '';

  const submitLabel =
    bindTargetCellId && mode === 'worktree'
      ? 'Reattach Cell'
      : bindTargetCellId && mode === 'branch'
        ? 'Create Attachment'
      : mode === 'create'
        ? 'Create Cell'
        : mode === 'worktree'
          ? 'Track Worktree'
          : 'Bind Branch';
  const resolvedSubmitName =
    bindTargetCellId && mode === 'worktree'
      ? bindTargetCellName || resolvedBoundName
      : mode === 'create'
        ? name
        : resolvedBoundName;

  return (
    <div className="space-y-4">
      {bindTargetCellId ? (
        <div className="rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-[11px] text-foreground/85">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary/75">
            {mode === 'branch' ? 'Create Worktree Attachment' : 'Reattach Existing Cell'}
          </div>
          <div className="mt-1">
            {mode === 'branch' ? (
              <>
                Materialize a worktree attachment for <span className="font-semibold">{bindTargetCellName || bindTargetCellId}</span>.
              </>
            ) : (
              <>
                Track this worktree under <span className="font-semibold">{bindTargetCellName || bindTargetCellId}</span>.
              </>
            )}
          </div>
        </div>
      ) : null}

      <ModePicker mode={mode} onChange={setMode} />

      {mode === 'create' ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <label
              className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70"
              htmlFor="cell-name"
            >
              Branch Strategy + Cell Name
            </label>
            <HintIcon
              label={`Naming constraints apply only here because Agency is creating a new branch. ${selectedBranchStrategy.label}: ${selectedBranchStrategy.hint}.`}
            />
          </div>

          <div className="group flex items-center rounded-xl border border-border/40 bg-background/70 transition-colors hover:border-primary/35 focus-within:border-primary/45">
            <div className="relative shrink-0">
              <select
                id="branch-prefix"
                className={`h-11 appearance-none bg-transparent pl-3 pr-8 text-sm font-semibold text-primary/90 ${focusRingClass}`}
                value={branchPrefix}
                onChange={(event) => setBranchPrefix(event.target.value)}
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
              className={`h-11 flex-1 bg-transparent pr-3 text-sm text-foreground placeholder:text-muted-foreground/35 ${focusRingClass}`}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setNameTouched(true);
              }}
              placeholder="e.g. explorer-dock-sync"
            />
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_180px]">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/75">
              <GitBranch size={11} className="shrink-0 text-primary/80" aria-hidden="true" />
              <span className="font-mono text-[11px] text-primary/90 truncate">{branchPreview || '...'}</span>
            </div>
            <div className="space-y-1">
              <label
                className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70"
                htmlFor="base-branch"
              >
                Base Branch
              </label>
              <div className="relative">
                <select
                  id="base-branch"
                  className={`w-full appearance-none rounded-xl border border-border/40 bg-background/70 px-3 py-2.5 pr-9 text-sm text-foreground shadow-sm transition-colors hover:border-primary/40 ${focusRingClass}`}
                  value={baseBranch}
                  onChange={(event) => setBaseBranch(event.target.value)}
                >
                  <option value="">Choose base branch...</option>
                  {branches.map((item) => (
                    <option key={item.name} value={item.name}>
                      {item.isDefault ? '★ ' : ''}{item.current ? '● ' : ''}{item.name}
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
          </div>
        </div>
      ) : null}

      {mode === 'worktree' ? (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200 space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label
                className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70"
                htmlFor="reuse-worktree"
              >
                Existing Worktree
              </label>
              {!worktrees.length ? (
                <HintIcon label="No existing worktrees found yet. Create one first, then track it here." />
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
                  {worktrees.length ? 'Choose worktree...' : 'No existing worktrees available'}
                </option>
                {worktrees.map((item) => (
                  <option key={item.path} value={item.path}>
                    {resolveWorktreeStatusLabel(item)} - {item.path}
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
        </div>
      ) : null}

      {mode === 'branch' ? (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200 space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label
                className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70"
                htmlFor="existing-branch"
              >
                Existing Branch
              </label>
              {!branches.length ? (
                <HintIcon label="No local branches found. Create or fetch a branch first." />
              ) : null}
            </div>
            <div className="relative">
              <select
                id="existing-branch"
                className={`w-full appearance-none rounded-xl border border-border/40 bg-background/70 px-3 py-2.5 pr-9 text-sm text-foreground shadow-sm transition-colors hover:border-primary/40 ${focusRingClass} disabled:cursor-not-allowed disabled:opacity-60`}
                value={selectedBranch}
                onChange={handleBranchSelect}
                disabled={!branches.length}
              >
                <option value="">
                  {branches.length ? 'Choose branch...' : 'No reusable branches available'}
                </option>
                {branches.map((item) => (
                  <option key={item.name} value={item.name}>
                    {item.isDefault ? '★ ' : ''}{item.current ? '● ' : ''}{item.name}
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
        </div>
      ) : null}

      {mode !== 'create' && !bindTargetCellId ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <label
              className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70"
              htmlFor="cell-name"
            >
              Cell Name
            </label>
            <HintIcon
              label={
                mode === 'branch'
                  ? 'Branch binding keeps the existing branch intact. The Cell name is only the durable workspace label.'
                  : 'Binding keeps the existing branch/worktree intact. The Cell name is only the workspace label.'
              }
            />
          </div>
          <input
            id="cell-name"
            className={`w-full rounded-xl border border-border/40 bg-background/70 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/35 shadow-sm transition-colors hover:border-primary/35 focus:border-primary/45 ${focusRingClass}`}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setNameTouched(true);
            }}
            placeholder={resolvedBoundName || 'e.g. mainline-review'}
          />
          <div className="flex items-center justify-between gap-2 text-[10px]">
            <div className="flex min-w-0 items-center gap-1.5 text-muted-foreground/75">
              <GitBranch size={11} className="shrink-0 text-primary/80" aria-hidden="true" />
              <span className="font-mono text-[11px] text-primary/90 truncate">
                {branchPreview || (bindTargetCellId ? bindTargetCellBranch || '...' : '...')}
              </span>
            </div>
            {mode === 'worktree' && selectedWorktreeInfo?.path ? (
              <Tooltip label={selectedWorktreeInfo.path}>
                <div className="flex min-w-0 items-center gap-1.5 text-muted-foreground/65">
                  <FolderTree size={11} className="shrink-0" aria-hidden="true" />
                  <span className="max-w-[170px] truncate">{pathBaseName(selectedWorktreeInfo.path)}</span>
                </div>
              </Tooltip>
            ) : null}
          </div>
          {bindingSummary ? (
            <div className="rounded-xl border border-border/30 bg-background/50 px-3 py-2 text-[10px] leading-4 text-muted-foreground/80">
              {bindingSummary}
            </div>
          ) : null}
        </div>
      ) : null}

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
              name: resolvedSubmitName,
              branch: mode === 'create' ? generatedBranch : undefined,
              baseBranch: mode === 'create' ? baseBranch : undefined,
              existingBranch: mode === 'branch' ? selectedBranch : undefined,
              reusePath: mode === 'worktree' ? selectedWorktree : undefined,
              bindToCellId: bindTargetCellId || undefined,
            })
          }
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}
