export type UnmanagedWorktreeBindSuggestion = {
  kind: string;
  cellId?: string;
  cellName?: string;
  cellAttachmentState?: string;
  candidateCellIds?: string[];
} | null;

export type UnmanagedWorktree = {
  id: string;
  type?: string;
  path: string;
  branch: string;
  head?: string;
  hasBranch?: boolean;
  isDetachedHead?: boolean;
  ignored?: boolean;
  bindSuggestion?: UnmanagedWorktreeBindSuggestion;
};

export function normalizeWorktreePath(value: string): string {
  return String(value || '').trim().replace(/\\/g, '/');
}

export function pathBaseName(value: string): string {
  const normalized = normalizeWorktreePath(value);
  const segments = normalized.split('/').filter(Boolean);
  return segments[segments.length - 1] || normalized;
}

export function deriveCellNameFromWorktree(worktree: UnmanagedWorktree): string {
  const branch = String(worktree?.branch || '').trim();
  if (branch) {
    const parts = branch.split('/').filter(Boolean);
    if (parts.length > 0) {
      return parts[parts.length - 1] || branch;
    }
  }
  return pathBaseName(worktree?.path || '') || 'cell';
}

export function deriveUnmanagedWorktreeDisplay(worktree: UnmanagedWorktree) {
  const branchLabel = String(worktree.branch || '').trim();
  const baseName = pathBaseName(worktree.path);
  const canCreateCell = Boolean(worktree.hasBranch);
  const suggestedCellName = String(worktree.bindSuggestion?.cellName || '').trim();
  const hasSuggestedBind = Boolean(worktree.bindSuggestion?.cellId);
  const detachedHeadLabel = worktree.isDetachedHead
    ? `Detached HEAD${worktree.head ? ` · ${String(worktree.head).slice(0, 7)}` : ''}`
    : '';
  const suggestedAttachmentState = String(worktree.bindSuggestion?.cellAttachmentState || '').trim().toLowerCase();
  const bindVerb = suggestedAttachmentState === 'branch_only' ? 'Bind' : 'Reattach';
  const helperText = hasSuggestedBind
    ? `Agency found a deterministic match with ${suggestedCellName || 'an existing tracked Cell'}. ${bindVerb} it first to avoid duplicate workspace records.`
    : worktree.isDetachedHead
      ? 'Agency cannot track this worktree as a Cell until it is attached to a branch.'
      : '';
  return {
    title: baseName || deriveCellNameFromWorktree(worktree),
    branchLabel: branchLabel || 'No branch attached',
    canCreateCell,
    hasSuggestedBind,
    detachedHeadLabel,
    helperText,
    primaryAction: hasSuggestedBind ? 'bind' : canCreateCell ? 'create' : 'none',
    primaryLabel: hasSuggestedBind
      ? `${bindVerb} ${suggestedCellName || 'Cell'}`
      : canCreateCell
        ? 'Create Cell'
        : '',
    secondaryCreateLabel: hasSuggestedBind && canCreateCell ? 'Create New Cell' : '',
    availabilityLabel: !hasSuggestedBind && !canCreateCell ? 'Branch Required' : '',
  };
}
