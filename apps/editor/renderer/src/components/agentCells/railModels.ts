import type { AttentionItem } from '../../attention/attentionModel';
import type { CellAttachmentMeta, CellBranchMeta } from './cellPresentation';
import { deriveUnmanagedWorktreeDisplay, type UnmanagedWorktree } from './unmanagedWorktreePresentation';
import { resolveAgentCellsAttentionTone, type AgentCellsAttentionTone } from './surfaceTokens';

export type AgentCellsAttentionSummary = {
  item: AttentionItem | null;
  count: number;
  tone: AgentCellsAttentionTone;
};

export type AgentCellsCellRecord = {
  id: string;
  name: string;
  branch?: string;
  state?: string;
  worktreePath?: string;
  attachedWorktreePath?: string;
  projectRoot?: string;
  repoRoot?: string;
  attachmentState?: string;
  ownerKind?: string;
  isVirtual?: boolean;
};

export type AgentCellsSessionRecord = {
  id: string;
  name?: string;
  status?: string;
  parentSessionId?: string | null;
  nodeKind?: string;
  sourceSessionId?: string | null;
};

export type TrackedCellRailModel = {
  cell: AgentCellsCellRecord;
  attachmentMeta: CellAttachmentMeta;
  branchMeta: CellBranchMeta;
  attention: AgentCellsAttentionSummary | null;
  isSelected: boolean;
  isCollapsed: boolean;
  isWindowHome: boolean;
  isProjectRootRuntime: boolean;
  hasRunnableRuntimeRoot: boolean;
  hasOverflow: boolean;
  runtimeLabel: string;
  runtimeTitle: string;
  canOpenExplorer: boolean;
  canCreateSession: boolean;
  createSessionTitle: string;
  canBindBranch: boolean;
  bindBranchTitle: string;
  canCreateAttachment: boolean;
  createAttachmentTitle: string;
};

export type UnmanagedWorktreeRailModel = {
  worktree: UnmanagedWorktree;
  display: ReturnType<typeof deriveUnmanagedWorktreeDisplay>;
};

export function buildTrackedCellRailModel({
  cell,
  attachmentMeta,
  branchMeta,
  attentionItem = null,
  attentionCount = 0,
  selected = false,
  collapsed = false,
  hasOverflow = false,
  isWindowHome = false,
}: {
  cell: AgentCellsCellRecord;
  attachmentMeta: CellAttachmentMeta;
  branchMeta: CellBranchMeta;
  attentionItem?: AttentionItem | null;
  attentionCount?: number;
  selected?: boolean;
  collapsed?: boolean;
  hasOverflow?: boolean;
  isWindowHome?: boolean;
}): TrackedCellRailModel {
  const isProjectRootRuntime = attachmentMeta.attachmentState === 'project_root';
  const hasRunnableRuntimeRoot = !isWindowHome && ['attached', 'project_root'].includes(attachmentMeta.attachmentState);
  const runtimeLabel =
    attachmentMeta.attachmentState === 'attached'
      ? branchMeta.label || attachmentMeta.pathLabel || 'Attached worktree'
      : branchMeta.label
        ? `Project root · ${branchMeta.label}`
        : 'Project root runtime';

  return {
    cell,
    attachmentMeta,
    branchMeta,
    attention: attentionItem
      ? {
          item: attentionItem,
          count: attentionCount,
          tone: resolveAgentCellsAttentionTone(String(attentionItem?.kind || '')),
        }
      : null,
    isSelected: selected,
    isCollapsed: collapsed,
    isWindowHome,
    isProjectRootRuntime,
    hasRunnableRuntimeRoot,
    hasOverflow,
    runtimeLabel,
    runtimeTitle: branchMeta.title || attachmentMeta.pathLabel || runtimeLabel,
    canOpenExplorer: true,
    canCreateSession: hasRunnableRuntimeRoot,
    createSessionTitle: hasRunnableRuntimeRoot
      ? isProjectRootRuntime
        ? 'Create a session on the project root.'
        : 'Create a session inside the attached worktree.'
      : 'This Cell cannot start sessions until it has a valid runtime root.',
    canBindBranch: isProjectRootRuntime,
    bindBranchTitle: cell.branch
      ? 'Update the branch metadata for this Cell without creating a worktree.'
      : 'Bind this Cell to an existing branch without creating a worktree.',
    canCreateAttachment: isProjectRootRuntime,
    createAttachmentTitle: cell.branch
      ? 'Materialize a live worktree attachment for this Cell.'
      : 'Choose a branch and materialize a live worktree attachment for this Cell.',
  };
}

export function buildUnmanagedWorktreeRailModel({
  worktree,
  display,
}: {
  worktree: UnmanagedWorktree;
  display: UnmanagedWorktreeRailModel['display'];
}): UnmanagedWorktreeRailModel {
  return {
    worktree,
    display,
  };
}
