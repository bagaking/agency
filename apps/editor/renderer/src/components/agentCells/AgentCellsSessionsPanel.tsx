import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus,
  GitBranch,
  ArrowUpLeft,
  SquareTerminal,
  FolderOpen,
  MoreHorizontal,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

import { RecentProjectsList } from '../RecentProjectsList';
import { useCommanderSessionActions } from '../commander/useCommanderSessionActions';
import { SessionContextMenu, SessionCreateMenu, SessionOverflowMenu } from '../SessionMenus';
import { AttentionPill } from '../attention/AttentionPill';
import { AgentAvatarBadge } from '../ui/AgentAvatarBadge';
import { AvatarPickerMenu } from '../ui/AvatarPickerMenu';
import { IconButton } from '../ui/IconButton';
import { useAttentionLayer } from '../../attention/AttentionLayerContext';
import type { AttentionItem } from '../../attention/attentionModel';
import { formatIdleShort } from '../../utils/timeFormat';
import { resolveSessionAvatarId } from '../../utils/agentAvatar';
import { isWindowHomeCell } from '../../utils/windowHomeCell';
import {
  projectAgentCellSessionTree,
  SESSION_TREE_INDENT_PX,
  type AgentCellSessionTreeProjection,
  type AgentCellSessionTreeRow,
} from '../../utils/agentCellSessionTree';
import { buildAgentCellChildSessionOptions } from '../../utils/agentCellChildSession';
import { useCommanderStatus } from '../../hooks/useCommanderStatus';
import {
  clearIgnoredUnmanagedWorktrees as agencyClearIgnoredUnmanagedWorktrees,
  ignoreUnmanagedWorktree as agencyIgnoreUnmanagedWorktree,
  isAgencyMethodAvailable,
  listUnmanagedWorktrees as agencyListUnmanagedWorktrees,
} from '../../services/agencyBridge';
import { isArchivedCell, resolveCellAttachmentMeta, resolveCellBranchMeta } from './cellPresentation';
import {
  deriveCellNameFromWorktree,
  deriveUnmanagedWorktreeDisplay,
  normalizeWorktreePath,
  pathBaseName,
  type UnmanagedWorktree,
} from './unmanagedWorktreePresentation';

const EMPTY_TREE: AgentCellSessionTreeProjection = {
  rows: [],
  rowsById: {},
  childSessionIdsByParentId: {},
  rootSessionIds: [],
  overflowDetachedSessions: [],
  overflowClosedSessions: [],
};

const DRAG_EDGE_RATIO = 0.26;
const OUTDENT_DROP_ZONE_WIDTH = 52;
const buildSessionKey = (cellId: string, sessionId: string) => `${cellId}:${sessionId}`;
const buildTreeNodeKey = (cellId: string, sessionId: string) => `${cellId}:${sessionId}`;
const SECTION_BADGE_BASE =
  'inline-flex items-center rounded-md border px-1.5 py-[3px] text-[8px] font-semibold uppercase tracking-[0.14em]';
const SURFACE_PANEL_BASE =
  'overflow-hidden rounded-[18px] border shadow-[0_18px_42px_-34px_rgba(0,0,0,0.72),inset_0_1px_0_rgba(255,255,255,0.03)]';

type SessionDropTarget = {
  cellId: string;
  sessionId: string;
  parentSessionId: string | null;
  beforeSessionId: string | null;
  targetSessionId: string | null;
  intent: 'before' | 'after' | 'into' | 'outdent' | 'root';
};

type AgentCellsSessionsPanelProps = {
  cells?: any[];
  selectedId?: string | null;
  projectRoot?: string;
  onSelect?: (cellId: string) => void;
  onCreateCell?: (options?: any) => void;
  onOpenExplorer?: (cellId: string) => void;
  projectReady?: boolean;
  projectError?: string;
  onSelectProject?: () => void;
  recentProjects?: any[];
  onOpenRecentProject?: (rootPath: string) => void;
  sessionsByCellId?: Record<string, any[]>;
  activeSessionByCellId?: Record<string, string>;
  sessionActivityByKey?: Record<string, number>;
  terminusProfiles?: any[];
  onSelectSession?: (cellId: string, sessionId: string) => void;
  onCreateSession?: (cell: any, options?: any) => Promise<any>;
  onDispatchCommand?: (payload: any) => void;
  onCloseSession?: (sessionId: string, cellId: string) => void;
  onDetachSession?: (sessionId: string, cellId: string) => void;
  onRenameSession?: (sessionId: string, name: string, cellId: string) => void;
  onUpdateSessionAvatar?: (sessionId: string, avatarId: string, cellId: string) => void;
  onMoveSessionNode?: (
    sessionId: string,
    placement: { parentSessionId?: string | null; beforeSessionId?: string | null },
    cellId: string
  ) => Promise<any> | any;
  onContinueSessionOnMobile?: (
    sessionId: string,
    cellId: string,
    mode?: 'direct' | 'hub' | 'proxy'
  ) => Promise<void> | void;
  onTrackPendingHarnessRun?: (input: {
    clientRequestId: string;
    runId?: string;
    cellId: string;
    sourceSessionId?: string;
  }) => void;
  onClearTrackedHarnessRun?: (input: { clientRequestId?: string }) => void;
  onSettleTrackedHarnessRun?: (input: {
    clientRequestId?: string;
    runId?: string;
    cellId?: string;
    sourceSessionId?: string;
    runSnapshot?: any;
  }) => Promise<boolean>;
  onFocusSessionInUi?: (cellId: string, sessionId: string) => void;
  onConfigureProfile?: (profile: any) => void;
  onArchiveCell?: (cell?: any | null) => void;
  onCreateAttachmentCell?: (options?: any) => void;
};

function SessionKindBadge({ nodeKind }: { nodeKind?: string }) {
  const normalized = String(nodeKind || '').trim().toLowerCase();
  if (!normalized || normalized === 'root') {
    return null;
  }
  const label = normalized === 'sub_terminal' ? 'sub' : normalized === 'fork' ? 'fork' : normalized;
  return (
    <span className="rounded border border-primary/20 bg-primary/10 px-1 py-0.5 text-[8px] font-bold uppercase tracking-widest text-primary/80">
      {label}
    </span>
  );
}

function SessionStatusMeta({
  session,
  idleLabel,
  isCellActiveSession,
}: {
  session: any;
  idleLabel: string;
  isCellActiveSession: boolean;
}) {
  const status = String(session?.status || '').trim().toLowerCase();
  const toneClass =
    status === 'detached'
      ? 'bg-amber-400/60'
      : status === 'stale'
        ? 'bg-rose-400/70'
        : isCellActiveSession
          ? 'bg-emerald-400/70'
          : 'bg-slate-400/35';
  const statusLabel =
    status === 'detached'
      ? 'Detached'
      : status === 'stale'
        ? 'Stale'
        : isCellActiveSession
          ? 'Live'
          : 'Idle';

  return (
    <div className="flex items-center gap-1.5 opacity-70 transition-opacity group-hover:opacity-95">
      <span className={`h-1.5 w-1.5 rounded-full ${toneClass}`} />
      <span className="truncate text-[9px] font-medium tracking-wide">{statusLabel}</span>
      <span className="text-[8px] text-muted-foreground/60">•</span>
      <span className="truncate text-[9px] font-medium tabular-nums tracking-wide">{idleLabel === '—' ? 'now' : idleLabel}</span>
    </div>
  );
}

function resolveAttentionCardClass(item: AttentionItem | null | undefined): string {
  switch (item?.kind) {
    case 'failed':
      return 'border-rose-300/26 bg-rose-500/[0.06] hover:border-rose-300/34';
    case 'pending_confirmation':
      return 'border-amber-300/24 bg-amber-500/[0.055] hover:border-amber-300/32';
    case 'return_required':
      return 'border-cyan-300/24 bg-cyan-500/[0.05] hover:border-cyan-300/34';
    case 'running':
      return 'border-sky-300/22 bg-sky-500/[0.045] hover:border-sky-300/30';
    case 'unread':
      return 'border-white/[0.09] bg-white/[0.03] hover:border-white/[0.12]';
    default:
      return '';
  }
}

function resolveAttentionRowClass(item: AttentionItem | null | undefined): string {
  switch (item?.kind) {
    case 'failed':
      return 'border-rose-300/20 bg-rose-500/[0.055] hover:bg-rose-500/[0.08]';
    case 'pending_confirmation':
      return 'border-amber-300/18 bg-amber-500/[0.05] hover:bg-amber-500/[0.07]';
    case 'return_required':
      return 'border-cyan-300/18 bg-cyan-500/[0.045] hover:bg-cyan-500/[0.07]';
    case 'running':
      return 'border-sky-300/18 bg-sky-500/[0.04] hover:bg-sky-500/[0.06]';
    case 'unread':
      return 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.045]';
    default:
      return '';
  }
}

function buildAttentionActionLabel({
  item,
  ownerLabel = '',
  count = 1,
}: {
  item: AttentionItem | null | undefined;
  ownerLabel?: string;
  count?: number;
}): string {
  if (!item) {
    return 'View attention';
  }
  const normalizedOwnerLabel = String(ownerLabel || '').trim();
  const normalizedCount = Number.isFinite(count) ? Math.max(1, Math.floor(count)) : 1;
  const countLabel = normalizedCount > 1 ? `${normalizedCount} items` : '1 item';
  const baseLabel =
    normalizedOwnerLabel && normalizedOwnerLabel !== item.label
      ? `${normalizedOwnerLabel} attention: ${item.label}`
      : item.label;
  return `${baseLabel}. ${countLabel}. ${item.detail}`;
}

function LifecycleSectionHeader({
  label,
  count,
  tone = 'default',
  description,
  action,
}: {
  label: string;
  count: number;
  tone?: 'default' | 'detached' | 'unmanaged' | 'legacy';
  description?: string;
  action?: React.ReactNode;
}) {
  const toneClassByTone = {
    default: 'text-foreground/76',
    detached: 'text-amber-100/76',
    unmanaged: 'text-sky-100/76',
    legacy: 'text-slate-200/72',
  } as const;
  const countClassByTone = {
    default: 'border-white/[0.06] bg-white/[0.025] text-foreground/70',
    detached: 'border-amber-300/14 bg-amber-500/[0.075] text-amber-100/74',
    unmanaged: 'border-sky-300/14 bg-sky-500/[0.075] text-sky-100/76',
    legacy: 'border-white/[0.05] bg-white/[0.02] text-slate-200/68',
  } as const;
  const toneClass = toneClassByTone[tone];
  const countClass = countClassByTone[tone];

  return (
    <div className="space-y-1 px-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`truncate text-[10px] font-semibold uppercase tracking-[0.18em] ${toneClass}`}>
            {label}
          </span>
          <span
            className={`${SECTION_BADGE_BASE} ${countClass}`}
          >
            {count}
          </span>
        </div>
        {action}
      </div>
      {description ? (
        <p className="text-[10px] leading-4 text-muted-foreground/66">{description}</p>
      ) : null}
    </div>
  );
}

function buildWorkspacePanelClass({
  selected,
  tone,
  attentionClass = '',
}: {
  selected: boolean;
  tone: 'tracked' | 'detached' | 'unmanaged';
  attentionClass?: string;
}) {
  const baseByTone = {
    tracked:
      'border-white/[0.045] bg-[linear-gradient(180deg,rgba(21,24,31,0.96),rgba(15,18,24,0.985))]',
    detached:
      'border-amber-300/14 bg-[linear-gradient(180deg,rgba(37,29,21,0.96),rgba(21,17,13,0.99))]',
    unmanaged:
      'border-sky-300/14 bg-[linear-gradient(180deg,rgba(19,28,37,0.96),rgba(12,18,25,0.99))]',
  } as const;
  const selectedByTone = {
    tracked: 'border-primary/22 bg-primary/[0.055] shadow-[0_20px_44px_-32px_rgba(59,130,246,0.38)]',
    detached: 'border-amber-300/24 bg-amber-500/[0.08] shadow-[0_20px_44px_-32px_rgba(245,158,11,0.32)]',
    unmanaged: 'border-sky-300/22 bg-sky-500/[0.075] shadow-[0_20px_44px_-32px_rgba(56,189,248,0.3)]',
  } as const;
  if (selected) {
    return `${SURFACE_PANEL_BASE} ${selectedByTone[tone]}`;
  }
  return `${SURFACE_PANEL_BASE} ${baseByTone[tone]} ${attentionClass}`.trim();
}

function SessionTreeGuides({
  depth,
  rowPaddingLeft,
}: {
  depth: number;
  rowPaddingLeft: number;
}) {
  if (depth <= 0) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: depth }).map((_, index) => (
        <div
          key={index}
          className="absolute bottom-0 top-0 w-px bg-white/[0.05]"
          style={{ left: `${18 + index * SESSION_TREE_INDENT_PX}px` }}
        />
      ))}
      <div
        className="absolute top-1/2 h-px -translate-y-1/2 bg-white/[0.08]"
        style={{
          left: `${Math.max(18, rowPaddingLeft - 10)}px`,
          width: '12px',
        }}
      />
    </div>
  );
}

function DropLine({ active }: { active: boolean }) {
  return (
    <div
      className={`pointer-events-none absolute left-2 right-2 h-[2px] rounded-full transition-opacity ${
        active ? 'opacity-100 bg-primary shadow-[0_0_0_1px_rgba(59,130,246,0.2)]' : 'opacity-0'
      }`}
    />
  );
}

function OutdentHint({
  visible,
  active,
  left,
}: {
  visible: boolean;
  active: boolean;
  left: number;
}) {
  if (!visible) {
    return null;
  }

  return (
    <div
      className={`pointer-events-none absolute top-1/2 z-10 flex h-5 -translate-y-1/2 items-center gap-1 rounded-md border px-1.5 text-[8px] font-bold uppercase tracking-widest transition-colors ${
        active
          ? 'border-primary/50 bg-primary/15 text-primary shadow-[0_0_0_1px_rgba(59,130,246,0.15)]'
          : 'border-border/40 bg-background/70 text-muted-foreground/55'
      }`}
      style={{ left: `${left}px` }}
    >
      <ArrowUpLeft size={10} strokeWidth={2} aria-hidden="true" />
      <span>Outdent</span>
    </div>
  );
}

export function AgentCellsSessionsPanel({
  cells = [],
  selectedId = null,
  projectRoot = '',
  onSelect,
  onCreateCell,
  onOpenExplorer,
  projectReady = false,
  projectError = '',
  onSelectProject,
  recentProjects = [],
  onOpenRecentProject,
  sessionsByCellId,
  activeSessionByCellId,
  sessionActivityByKey,
  terminusProfiles,
  onSelectSession,
  onCreateSession,
  onDispatchCommand,
  onCloseSession,
  onDetachSession,
  onRenameSession,
  onUpdateSessionAvatar,
  onMoveSessionNode,
  onContinueSessionOnMobile,
  onTrackPendingHarnessRun,
  onClearTrackedHarnessRun,
  onSettleTrackedHarnessRun,
  onFocusSessionInUi,
  onConfigureProfile,
  onArchiveCell,
  onCreateAttachmentCell,
}: AgentCellsSessionsPanelProps) {
  const attention = useAttentionLayer();
  const [idleNow, setIdleNow] = useState(Date.now());
  const [closedMenu, setClosedMenu] = useState<any>(null);
  const [contextMenu, setContextMenu] = useState<any>(null);
  const [createMenu, setCreateMenu] = useState<any>(null);
  const [editingSession, setEditingSession] = useState<any>(null);
  const [editingSessionName, setEditingSessionName] = useState('');
  const [avatarMenu, setAvatarMenu] = useState<any>(null);
  const [collapsedCells, setCollapsedCells] = useState<Set<string>>(() => new Set());
  const [collapsedSessionNodes, setCollapsedSessionNodes] = useState<Set<string>>(() => new Set());
  const [pendingActiveSessionByCellId, setPendingActiveSessionByCellId] = useState<Record<string, string>>({});
  const [draggingSession, setDraggingSession] = useState<{ cellId: string; sessionId: string } | null>(null);
  const [dropTarget, setDropTarget] = useState<SessionDropTarget | null>(null);
  const [showLegacyArchivedCells, setShowLegacyArchivedCells] = useState(false);
  const [unmanagedWorktrees, setUnmanagedWorktrees] = useState<UnmanagedWorktree[]>([]);
  const [ignoredWorktreeCount, setIgnoredWorktreeCount] = useState(0);

  const closedMenuRef = useRef<HTMLDivElement | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const createMenuRef = useRef<HTMLDivElement | null>(null);
  const avatarMenuRef = useRef<HTMLDivElement | null>(null);
  const selectionSuppressedRef = useRef(false);
  const selectionSuppressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cellsById = useMemo(
    () =>
      new Map<string, any>((cells || []).filter(Boolean).map((cell: any) => [String(cell.id), cell])),
    [cells]
  );

  const { trackedCells, detachedCells, legacyArchivedCells } = useMemo(() => {
    const tracked: any[] = [];
    const detached: any[] = [];
    const legacyArchived: any[] = [];
    (cells || []).forEach((cell: any) => {
      if (isArchivedCell(cell)) {
        legacyArchived.push(cell);
        return;
      }
      if (cell?.isVirtual) {
        tracked.push(cell);
        return;
      }
      const attachmentMeta = resolveCellAttachmentMeta(cell);
      if (['attached', 'project_root'].includes(attachmentMeta.attachmentState)) {
        tracked.push(cell);
      } else {
        detached.push(cell);
      }
    });
    return {
      trackedCells: tracked,
      detachedCells: detached,
      legacyArchivedCells: legacyArchived,
    };
  }, [cells]);

  useEffect(() => {
    if (!selectedId) {
      return;
    }
    const selectedArchived = legacyArchivedCells.some((cell: any) => cell?.id === selectedId);
    if (selectedArchived) {
      setShowLegacyArchivedCells(true);
    }
  }, [legacyArchivedCells, selectedId]);

  useEffect(() => {
    if (!projectReady || !projectRoot || !isAgencyMethodAvailable('listUnmanagedWorktrees')) {
      setUnmanagedWorktrees([]);
      setIgnoredWorktreeCount(0);
      return;
    }
    let disposed = false;
    const loadUnmanagedWorktrees = async () => {
      try {
        const worktrees = await agencyListUnmanagedWorktrees({
          rootPath: projectRoot,
          includeIgnored: true,
        });
        if (disposed) {
          return;
        }
        const normalizedItems = Array.isArray(worktrees) ? worktrees : [];
        setUnmanagedWorktrees(normalizedItems);
        setIgnoredWorktreeCount(
          normalizedItems.filter((item) => Boolean(item?.ignored)).length
        );
      } catch (error) {
        if (!disposed) {
          console.error(error);
          setUnmanagedWorktrees([]);
          setIgnoredWorktreeCount(0);
        }
      }
    };
    void loadUnmanagedWorktrees();
    return () => {
      disposed = true;
    };
  }, [cells, projectReady, projectRoot]);

  const visibleUnmanagedWorktrees = useMemo(
    () => unmanagedWorktrees.filter((worktree) => !worktree?.ignored),
    [unmanagedWorktrees]
  );

  useEffect(() => {
    const interval = setInterval(() => setIdleNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!closedMenu) {
      return undefined;
    }
    const handleClick = (event: MouseEvent) => {
      if (closedMenuRef.current?.contains(event.target as Node)) {
        return;
      }
      setClosedMenu(null);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [closedMenu]);

  useEffect(() => {
    if (!contextMenu) {
      return undefined;
    }
    const handleClick = (event: MouseEvent) => {
      if (contextMenuRef.current?.contains(event.target as Node)) {
        return;
      }
      setContextMenu(null);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [contextMenu]);

  useEffect(() => {
    if (!createMenu) {
      return undefined;
    }
    const handleClick = (event: MouseEvent) => {
      if (createMenuRef.current?.contains(event.target as Node)) {
        return;
      }
      setCreateMenu(null);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [createMenu]);

  useEffect(() => {
    if (!avatarMenu) {
      return undefined;
    }
    const handleClick = (event: MouseEvent) => {
      if (avatarMenuRef.current?.contains(event.target as Node)) {
        return;
      }
      if ((event.target as HTMLElement | null)?.closest?.('[data-avatar-picker-anchor="true"]')) {
        return;
      }
      setAvatarMenu(null);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [avatarMenu]);

  useEffect(() => {
    return () => {
      if (selectionSuppressTimerRef.current) {
        clearTimeout(selectionSuppressTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!cellsById.size) {
      return;
    }
    setCollapsedCells((current) => {
      const next = new Set<string>();
      current.forEach((id) => {
        if (cellsById.has(id)) {
          next.add(id);
        }
      });
      return next;
    });
  }, [cellsById]);

  useEffect(() => {
    setPendingActiveSessionByCellId((current) => {
      const next = { ...current };
      Object.keys(next).forEach((cellId) => {
        if (activeSessionByCellId?.[cellId] === next[cellId]) {
          delete next[cellId];
        }
      });
      return next;
    });
  }, [activeSessionByCellId]);

  const resolveCellSessions = useCallback((cellId: string): any[] => sessionsByCellId?.[cellId] || [], [
    sessionsByCellId,
  ]);

  const projectionsByCellId = useMemo(() => {
    const next: Record<string, AgentCellSessionTreeProjection> = {};
    trackedCells.forEach((cell: any) => {
      if (!cell?.id) {
        return;
      }
      const activeSessionId =
        pendingActiveSessionByCellId[cell.id] || activeSessionByCellId?.[cell.id] || null;
      next[cell.id] = projectAgentCellSessionTree({
        sessions: resolveCellSessions(String(cell.id)),
        activeSessionId,
      });
    });
    return next;
  }, [trackedCells, activeSessionByCellId, pendingActiveSessionByCellId, resolveCellSessions]);

  const visibleRowsByCellId = useMemo(() => {
    const next: Record<string, AgentCellSessionTreeRow[]> = {};
    Object.entries(projectionsByCellId).forEach(([cellId, projection]) => {
      next[cellId] = projection.rows.filter((row) =>
        row.ancestorSessionIds.every(
          (ancestorSessionId) => !collapsedSessionNodes.has(buildTreeNodeKey(cellId, ancestorSessionId))
        )
      );
    });
    return next;
  }, [collapsedSessionNodes, projectionsByCellId]);

  const beginRenameSession = (cellId: string, session: any) => {
    if (!cellId || !session) {
      return;
    }
    setEditingSession({ cellId, sessionId: session.id });
    setEditingSessionName(session.name || session.id);
  };

  const cancelRenameSession = () => {
    setEditingSession(null);
    setEditingSessionName('');
  };

  const commitRenameSession = () => {
    if (!editingSession) {
      return;
    }
    const nextName = editingSessionName.trim();
    if (nextName) {
      onRenameSession?.(editingSession.sessionId, nextName, editingSession.cellId);
    }
    cancelRenameSession();
  };

  const openAvatarMenu = (payload: any, rect: DOMRect) => {
    if (!rect) {
      return;
    }
    setAvatarMenu({ ...payload, x: rect.left, y: rect.bottom + 6 });
  };

  const toggleCellCollapse = (cellId: string) => {
    setCollapsedCells((current) => {
      const next = new Set(current);
      if (next.has(cellId)) {
        next.delete(cellId);
      } else {
        next.add(cellId);
      }
      return next;
    });
  };

  const toggleSessionNodeCollapse = (cellId: string, sessionId: string) => {
    const nodeKey = buildTreeNodeKey(cellId, sessionId);
    setCollapsedSessionNodes((current) => {
      const next = new Set(current);
      if (next.has(nodeKey)) {
        next.delete(nodeKey);
      } else {
        next.add(nodeKey);
      }
      return next;
    });
  };

  const resolveSessionActivity = useCallback(
    (cellId: string, session: any) => {
      const key = buildSessionKey(cellId, session?.id);
      const activity = sessionActivityByKey?.[key];
      if (Number.isFinite(activity)) {
        return activity as number;
      }
      const parsed = Date.parse(session?.lastActivityAt || '');
      return Number.isFinite(parsed) ? parsed : null;
    },
    [sessionActivityByKey]
  );

  const selectSessionTab = useCallback(
    (cellId: string, sessionId: string) => {
      if (!cellId || !sessionId) {
        return;
      }
      setPendingActiveSessionByCellId((current) => ({
        ...current,
        [cellId]: sessionId,
      }));
      onSelectSession?.(cellId, sessionId);
    },
    [onSelectSession]
  );

  const overflowSessions = useMemo(() => {
    if (!closedMenu?.cellId) {
      return { detached: [], closed: [] };
    }
    const projection = projectionsByCellId[closedMenu.cellId] || EMPTY_TREE;
    return {
      detached: projection.overflowDetachedSessions,
      closed: projection.overflowClosedSessions,
    };
  }, [closedMenu?.cellId, projectionsByCellId]);

  const contextMenuSession = useMemo(() => {
    if (!contextMenu?.cellId || !contextMenu?.sessionId) {
      return null;
    }
    return resolveCellSessions(contextMenu.cellId).find((session) => session.id === contextMenu.sessionId);
  }, [contextMenu?.cellId, contextMenu?.sessionId, resolveCellSessions]);
  const contextMenuCell = contextMenu?.cellId ? cellsById.get(contextMenu.cellId) : null;
  const {
    smartForkAvailable,
    smartNameAvailable,
  } = useCommanderStatus({
    worktreePath: contextMenuCell?.attachedWorktreePath || '',
    cellId: contextMenuCell?.id || '',
    cellName: contextMenuCell?.name || '',
    cellBranch: contextMenuCell?.branch || '',
    sessionId: contextMenuSession?.id || '',
    refreshKey: contextMenu ? buildSessionKey(contextMenu.cellId, contextMenu.sessionId) : '',
  });
  const commanderSessionActions = useCommanderSessionActions({
    renameSession: onRenameSession,
    focusSessionInUi: onFocusSessionInUi,
    trackPendingHarnessRun: onTrackPendingHarnessRun,
    clearTrackedHarnessRun: onClearTrackedHarnessRun,
    settleTrackedHarnessRun: onSettleTrackedHarnessRun,
  });

  const avatarMenuSessions = useMemo(() => {
    if (!avatarMenu?.cellId) {
      return [];
    }
    return resolveCellSessions(avatarMenu.cellId);
  }, [avatarMenu?.cellId, resolveCellSessions]);

  const avatarMenuSession = avatarMenu
    ? avatarMenuSessions.find((session) => session.id === avatarMenu.sessionId)
    : null;
  const avatarMenuCell = avatarMenu?.cellId ? cellsById.get(avatarMenu.cellId) : null;
  const avatarMenuActiveIds = useMemo(() => {
    if (!avatarMenu?.cellId) {
      return new Set<string>();
    }
    const ids = new Set<string>();
    avatarMenuSessions.forEach((session) => {
      if (!session || !['active', 'detached'].includes(session.status)) {
        return;
      }
      const resolved = resolveSessionAvatarId(session, avatarMenuCell);
      if (resolved) {
        ids.add(resolved);
      }
    });
    return ids;
  }, [avatarMenu?.cellId, avatarMenuCell, avatarMenuSessions]);

  const createChildSession = useCallback(
    async ({
      cellId,
      session,
      nodeKind,
    }: {
      cellId: string;
      session: any;
      nodeKind: 'sub_terminal' | 'fork';
    }) => {
      const cell = cellsById.get(cellId);
      if (!cell || !session) {
        return;
      }
      await onCreateSession?.(
        cell,
        buildAgentCellChildSessionOptions({
          parentSession: session,
          nodeKind,
        })
      );
    },
    [cellsById, onCreateSession]
  );

  const clearDragState = useCallback(() => {
    setDraggingSession(null);
    setDropTarget(null);
  }, []);

  const suppressSelectionTemporarily = useCallback((delayMs = 120) => {
    selectionSuppressedRef.current = true;
    if (selectionSuppressTimerRef.current) {
      clearTimeout(selectionSuppressTimerRef.current);
    }
    selectionSuppressTimerRef.current = setTimeout(() => {
      selectionSuppressedRef.current = false;
      selectionSuppressTimerRef.current = null;
    }, delayMs);
  }, []);

  const resolveSiblingIds = useCallback(
    (projection: AgentCellSessionTreeProjection, parentSessionId: string | null) =>
      parentSessionId ? projection.childSessionIdsByParentId[parentSessionId] || [] : projection.rootSessionIds,
    []
  );

  const buildRowDropTarget = useCallback(
    ({
      cellId,
      row,
      projection,
      clientY,
      clientX,
      rowRect,
    }: {
      cellId: string;
      row: AgentCellSessionTreeRow;
      projection: AgentCellSessionTreeProjection;
      clientY: number;
      clientX: number;
      rowRect: DOMRect;
    }): SessionDropTarget | null => {
      const source = draggingSession;
      if (!source || source.cellId !== cellId) {
        return null;
      }
      const sourceRow = projection.rowsById[source.sessionId];
      const rowIsSource = row.id === source.sessionId;
      const rowIsDescendantOfSource = row.ancestorSessionIds.includes(source.sessionId);
      const rowIsAncestorOfSource = Boolean(sourceRow?.ancestorSessionIds.includes(row.id));
      if (rowIsSource || rowIsDescendantOfSource) {
        return null;
      }

      const offsetY = clientY - rowRect.top;
      const topEdge = rowRect.height * DRAG_EDGE_RATIO;
      const bottomEdge = rowRect.height * (1 - DRAG_EDGE_RATIO);
      const usesProjectedParent = row.storedParentSessionId !== row.parentSessionId;
      const siblingIds = resolveSiblingIds(projection, row.parentSessionId);
      const targetIndex = siblingIds.indexOf(row.id);
      const rowPaddingLeft = 10 + row.depth * SESSION_TREE_INDENT_PX;
      const outdentEdge = rowRect.left + rowPaddingLeft + OUTDENT_DROP_ZONE_WIDTH;

      if (rowIsAncestorOfSource && !usesProjectedParent && clientX <= outdentEdge) {
        return {
          cellId,
          sessionId: source.sessionId,
          parentSessionId: row.parentSessionId,
          beforeSessionId: siblingIds[targetIndex + 1] || null,
          targetSessionId: row.id,
          intent: 'outdent',
        };
      }

      if (offsetY <= topEdge && !usesProjectedParent) {
        return {
          cellId,
          sessionId: source.sessionId,
          parentSessionId: row.parentSessionId,
          beforeSessionId: row.id,
          targetSessionId: row.id,
          intent: 'before',
        };
      }

      if (offsetY >= bottomEdge && !usesProjectedParent) {
        return {
          cellId,
          sessionId: source.sessionId,
          parentSessionId: row.parentSessionId,
          beforeSessionId: siblingIds[targetIndex + 1] || null,
          targetSessionId: row.id,
          intent: 'after',
        };
      }

      return {
        cellId,
        sessionId: source.sessionId,
        parentSessionId: row.id,
        beforeSessionId: null,
        targetSessionId: row.id,
        intent: 'into',
      };
    },
    [draggingSession, resolveSiblingIds]
  );

  const commitDropTarget = useCallback(
    async (target: SessionDropTarget | null) => {
      if (!target || !onMoveSessionNode) {
        clearDragState();
        return;
      }
      suppressSelectionTemporarily();
      await onMoveSessionNode(
        target.sessionId,
        {
          parentSessionId: target.parentSessionId,
          beforeSessionId: target.beforeSessionId,
        },
        target.cellId
      );
      clearDragState();
    },
    [clearDragState, onMoveSessionNode, suppressSelectionTemporarily]
  );

  const refreshUnmanagedWorktrees = useCallback(async () => {
    if (!projectReady || !projectRoot || !isAgencyMethodAvailable('listUnmanagedWorktrees')) {
      setUnmanagedWorktrees([]);
      setIgnoredWorktreeCount(0);
      return;
    }
    const worktrees = await agencyListUnmanagedWorktrees({
      rootPath: projectRoot,
      includeIgnored: true,
    });
    const normalizedItems = Array.isArray(worktrees) ? worktrees : [];
    setUnmanagedWorktrees(normalizedItems);
    setIgnoredWorktreeCount(normalizedItems.filter((item) => Boolean(item?.ignored)).length);
  }, [projectReady, projectRoot]);

  const handleIgnoreUnmanagedWorktree = useCallback(
    async (worktreePath: string) => {
      const normalizedPath = normalizeWorktreePath(worktreePath);
      if (!normalizedPath || !projectRoot) {
        return;
      }
      await agencyIgnoreUnmanagedWorktree({
        rootPath: projectRoot,
        worktreePath: normalizedPath,
        ignored: true,
      });
      await refreshUnmanagedWorktrees();
    },
    [projectRoot, refreshUnmanagedWorktrees]
  );

  const handleResetIgnoredUnmanagedWorktrees = useCallback(async () => {
    if (!projectRoot) {
      return;
    }
    await agencyClearIgnoredUnmanagedWorktrees({ rootPath: projectRoot });
    await refreshUnmanagedWorktrees();
  }, [projectRoot, refreshUnmanagedWorktrees]);

  const handleCreateCellFromWorktree = useCallback(
    (worktree: UnmanagedWorktree) => {
      const normalizedPath = normalizeWorktreePath(worktree.path);
      if (!normalizedPath) {
        return;
      }
      onCreateCell?.({
        mode: 'worktree',
        reusePath: normalizedPath,
        name: deriveCellNameFromWorktree(worktree),
      });
    },
    [onCreateCell]
  );

  const handleBindSuggestedCell = useCallback(
    (worktree: UnmanagedWorktree) => {
      const normalizedPath = normalizeWorktreePath(worktree.path);
      const suggestedCellId = String(worktree?.bindSuggestion?.cellId || '').trim();
      if (!normalizedPath || !suggestedCellId) {
        return;
      }
      const suggestedAttachmentState = String(
        worktree?.bindSuggestion?.cellAttachmentState || ''
      ).trim().toLowerCase();
      if (suggestedAttachmentState === 'project_root') {
        onCreateCell?.({
          mode: 'branch',
          existingBranch: worktree.branch,
          name: worktree?.bindSuggestion?.cellName || deriveCellNameFromWorktree(worktree),
          initialBindBranchTargetCell:
            cellsById.get(suggestedCellId) || {
              id: suggestedCellId,
              name: worktree?.bindSuggestion?.cellName || suggestedCellId,
              branch: worktree.branch,
            },
        });
        return;
      }
      onCreateCell?.({
        mode: 'worktree',
        reusePath: normalizedPath,
        initialBindTargetCell:
          cellsById.get(suggestedCellId) || {
            id: suggestedCellId,
            name: worktree?.bindSuggestion?.cellName || suggestedCellId,
          },
      });
    },
    [cellsById, onCreateCell]
  );

  const handleCreateAttachmentForCell = useCallback(
    (cell: any) => {
      if (!cell?.id) {
        return;
      }
      onCreateAttachmentCell?.({
        mode: 'branch',
        existingBranch: cell.branch || '',
        name: cell.name,
        initialBindTargetCell: cell,
      });
    },
    [onCreateAttachmentCell]
  );

  const handleBindBranchForCell = useCallback(
    (cell: any) => {
      if (!cell?.id) {
        return;
      }
      onCreateCell?.({
        mode: 'branch',
        existingBranch: cell.branch || '',
        name: cell.name,
        initialBindBranchTargetCell: cell,
      });
    },
    [onCreateCell]
  );

  return (
    <>
      <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
        {!projectReady ? (
          <>
            <div className="mb-3 rounded-lg border border-dashed border-border px-3 py-3 text-[11px] text-muted-foreground">
              <div className="font-medium text-foreground">No project selected</div>
              <div className="mt-1">Choose a project directory to load Cells.</div>
              {projectError ? <div className="mt-2 text-rose-300">{projectError}</div> : null}
              <button
                type="button"
                onClick={onSelectProject}
                className="mt-3 inline-flex items-center gap-2 rounded-full border border-primary/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary transition-colors hover:bg-primary/10"
              >
                Select Project
              </button>
            </div>
            <RecentProjectsList
              projects={recentProjects}
              onOpen={onOpenRecentProject}
              title="Recent Projects"
              emptyLabel="No recent projects yet"
            />
          </>
        ) : null}

        {trackedCells.length === 0 &&
        detachedCells.length === 0 &&
        legacyArchivedCells.length === 0 &&
        visibleUnmanagedWorktrees.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-muted-foreground">No tracked cells yet</div>
        ) : (
          <div className="space-y-4">
            {trackedCells.length > 0 ? (
              <section className="space-y-3">
                <LifecycleSectionHeader
                  label="Tracked Cells"
                  count={trackedCells.length}
                  description="Session-first Cells running either on a live worktree attachment or on the project root."
                />
                <div className="space-y-3" data-testid="cell-list" role="tree" aria-label="Tracked cells">
                  {trackedCells.map((cell: any) => {
                    const attachmentMeta = resolveCellAttachmentMeta(cell);
                    const branchMeta = resolveCellBranchMeta(cell);
                    const isWindowHome = isWindowHomeCell(cell);
                    const isProjectRootRuntime = attachmentMeta.attachmentState === 'project_root';
                    const hasRunnableRuntimeRoot =
                      !isWindowHome &&
                      ['attached', 'project_root'].includes(attachmentMeta.attachmentState);
                    const projection = projectionsByCellId[cell.id] || EMPTY_TREE;
                    const visibleRows = visibleRowsByCellId[cell.id] || [];
                    const activeSessionId =
                      pendingActiveSessionByCellId[cell.id] || activeSessionByCellId?.[cell.id] || null;
                    const cellAttention = attention.byCellId[cell.id];
                    const isSelectedCell = selectedId === cell.id;
                    const isCollapsed = collapsedCells.has(cell.id);
                    const hasOverflow =
                      projection.overflowDetachedSessions.length > 0 ||
                      projection.overflowClosedSessions.length > 0;
                    const showRootDropZone = draggingSession?.cellId === cell.id && Boolean(onMoveSessionNode);

                  return (
                    <div
                      key={cell.id}
                      className={`${buildWorkspacePanelClass({
                        selected: isSelectedCell,
                        tone: 'tracked',
                        attentionClass: resolveAttentionCardClass(cellAttention?.strongest),
                      })} transition-colors`}
                    >
                  <div
                    role="treeitem"
                    aria-level={1}
                    aria-expanded={!isCollapsed}
                    aria-selected={isSelectedCell}
                    tabIndex={0}
                    onClick={() => onSelect?.(cell.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onSelect?.(cell.id);
                        return;
                      }
                      if (event.key === 'ArrowLeft' && !isCollapsed) {
                        event.preventDefault();
                        toggleCellCollapse(cell.id);
                        return;
                      }
                      if (event.key === 'ArrowRight' && isCollapsed) {
                        event.preventDefault();
                        toggleCellCollapse(cell.id);
                      }
                    }}
                    data-testid={`cell-item-${cell.id}`}
                    className={`group flex w-full items-start gap-2.5 px-2.5 py-2 text-left transition-colors ${
                      isSelectedCell ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleCellCollapse(cell.id);
                      }}
                      className="mt-0.5 rounded p-0.5 text-muted-foreground/60 hover:bg-muted/30 hover:text-foreground"
                      title={isCollapsed ? 'Expand sessions' : 'Collapse sessions'}
                    >
                      {isCollapsed ? (
                        <ChevronRight size={12} strokeWidth={1.5} />
                      ) : (
                        <ChevronDown size={12} strokeWidth={1.5} />
                      )}
                    </button>
                    <div
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] border ${
                        cell.isVirtual
                          ? 'border-primary/18 bg-primary/[0.1] text-primary/82 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]'
                          : 'border-white/[0.05] bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))] text-foreground/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]'
                      }`}
                    >
                      {cell.isVirtual ? (
                        <SquareTerminal size={14} strokeWidth={1.6} />
                      ) : (
                        <GitBranch size={14} strokeWidth={1.6} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-[12px] font-semibold tracking-[0.01em]">
                          {cell.name}
                        </span>
                        {cell.isVirtual ? (
                          <span className={`${SECTION_BADGE_BASE} border-primary/18 bg-primary/[0.1] text-primary/78`}>
                            Local
                          </span>
                        ) : null}
                        {!cell.isVirtual && attachmentMeta.attachmentState !== 'attached' ? (
                          <span
                            className={`${SECTION_BADGE_BASE} ${attachmentMeta.tone}`}
                            title={attachmentMeta.pathLabel || attachmentMeta.label}
                          >
                            {attachmentMeta.label}
                          </span>
                        ) : null}
                        {cellAttention?.strongest ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              attention.jumpToAttention(cellAttention.strongest);
                            }}
                            className="shrink-0"
                            aria-label={buildAttentionActionLabel({
                              item: cellAttention.strongest,
                              ownerLabel: cell.name || cell.id,
                              count: cellAttention.count,
                            })}
                            title={cellAttention.strongest.detail}
                          >
                            <AttentionPill
                              item={cellAttention.strongest}
                              count={cellAttention.count}
                              className="px-1.5 py-[2px]"
                            />
                          </button>
                        ) : null}
                      </div>
                      <div
                        className={`mt-1 flex min-w-0 items-center gap-1.5 text-[9px] ${
                          branchMeta.isDetachedHead ? 'text-amber-100/78' : 'text-muted-foreground/72'
                        }`}
                      >
                        {cell.isVirtual ? (
                          <SquareTerminal size={10} strokeWidth={1.7} className="shrink-0" />
                        ) : (
                          <GitBranch size={10} strokeWidth={1.7} className="shrink-0" />
                        )}
                        <span className="truncate" title={branchMeta.title || undefined}>
                          {cell.isVirtual
                            ? cell.worktreePath || 'Local shell'
                            : attachmentMeta.attachmentState === 'attached'
                              ? branchMeta.label || attachmentMeta.pathLabel || 'Attached worktree'
                              : branchMeta.label
                                ? `Project root · ${branchMeta.label}`
                                : 'Project root runtime'}
                        </span>
                      </div>
                    </div>

                    <div className="ml-auto flex items-center gap-1 self-center opacity-100">
                      {!cell.isVirtual ? (
                        <IconButton
                          label="Open in Explorer"
                          focusRing="sidebar"
                          className="h-7 w-7 rounded-md text-muted-foreground/65 transition-colors hover:bg-white/[0.06] hover:text-foreground"
                          onClick={(event) => {
                            event.stopPropagation();
                            onOpenExplorer?.(cell.id);
                          }}
                        >
                          <FolderOpen size={13} strokeWidth={1.7} aria-hidden="true" />
                        </IconButton>
                      ) : null}
                      {!isWindowHome ? (
                        <IconButton
                          label="New Session"
                          focusRing="sidebar"
                          disabled={!hasRunnableRuntimeRoot}
                          className="h-7 w-7 rounded-md text-primary transition-colors hover:bg-primary/12 hover:text-primary disabled:text-muted-foreground/40 disabled:hover:bg-transparent"
                          title={
                            hasRunnableRuntimeRoot
                              ? isProjectRootRuntime
                                ? 'Create a session on the project root.'
                                : 'Create a session inside the attached worktree.'
                              : 'This Cell cannot start sessions until it has a valid runtime root.'
                          }
                          onClick={(event) => {
                            if (!hasRunnableRuntimeRoot) {
                              return;
                            }
                            event.stopPropagation();
                            const rect = event.currentTarget.getBoundingClientRect();
                            const spaceBelow = window.innerHeight - rect.bottom;
                            const openUpwards = spaceBelow < 320;
                            setCreateMenu({
                              cellId: cell.id,
                              x: rect.left,
                              y: openUpwards ? rect.top - 6 : rect.bottom + 6,
                              openUpwards,
                            });
                          }}
                        >
                          <Plus size={14} strokeWidth={1.8} aria-hidden="true" />
                        </IconButton>
                      ) : null}
                      {isProjectRootRuntime ? (
                        <IconButton
                          label="Bind Branch"
                          focusRing="sidebar"
                          className="h-7 w-7 rounded-md text-sky-100/78 transition-colors hover:bg-sky-500/12 hover:text-sky-50"
                          title={
                            cell?.branch
                              ? 'Update the branch metadata for this Cell without creating a worktree.'
                              : 'Bind this Cell to an existing branch without creating a worktree.'
                          }
                          onClick={(event) => {
                            event.stopPropagation();
                            handleBindBranchForCell(cell);
                          }}
                        >
                          <GitBranch size={13} strokeWidth={1.7} aria-hidden="true" />
                        </IconButton>
                      ) : null}
                      {isProjectRootRuntime ? (
                        <IconButton
                          label="Create Worktree Attachment"
                          focusRing="sidebar"
                          className="h-7 w-7 rounded-md text-sky-100/78 transition-colors hover:bg-sky-500/12 hover:text-sky-50"
                          title={
                            cell?.branch
                              ? 'Materialize a live worktree attachment for this Cell.'
                              : 'Choose a branch and materialize a live worktree attachment for this Cell.'
                          }
                          onClick={(event) => {
                            event.stopPropagation();
                            handleCreateAttachmentForCell(cell);
                          }}
                        >
                          <ArrowUpLeft size={13} strokeWidth={1.7} aria-hidden="true" />
                        </IconButton>
                      ) : null}
                      {hasOverflow ? (
                        <IconButton
                          label="Detached and closed sessions"
                          focusRing="sidebar"
                          className="h-7 w-7 rounded-md text-muted-foreground/65 transition-colors hover:bg-white/[0.06] hover:text-foreground"
                          onClick={(event) => {
                            event.stopPropagation();
                            const rect = event.currentTarget.getBoundingClientRect();
                            setClosedMenu({
                              cellId: cell.id,
                              x: rect.left,
                              y: rect.bottom + 6,
                            });
                          }}
                        >
                          <MoreHorizontal size={13} strokeWidth={1.7} aria-hidden="true" />
                        </IconButton>
                      ) : null}
                    </div>
                  </div>

                  {!isCollapsed ? (
                    <div className="space-y-1 border-t border-white/[0.06] px-2 pb-1.5 pt-1.5" role="group">
                      {visibleRows.map((row) => {
                        const session = row.session;
                        const sessionAttention =
                          attention.bySessionKey[buildSessionKey(cell.id, session.id)] || null;
                        const isCellActiveSession = session.id === activeSessionId;
                        const isSelectedSession = isSelectedCell && isCellActiveSession;
                        const activityAt = resolveSessionActivity(cell.id, session);
                        const idleDuration = Number.isFinite(activityAt)
                          ? Math.max(0, idleNow - Number(activityAt))
                          : null;
                        const idleLabel = idleDuration !== null ? formatIdleShort(idleDuration) : '—';
                        const isClosed = session.status === 'closed';
                        const isEditing =
                          editingSession?.cellId === cell.id && editingSession?.sessionId === session.id;
                        const nodeKey = buildTreeNodeKey(cell.id, row.id);
                        const isNodeCollapsed = collapsedSessionNodes.has(nodeKey);
                        const hasChildren = row.childSessionIds.length > 0;
                        const activeDropTarget =
                          dropTarget?.cellId === cell.id && dropTarget?.targetSessionId === row.id
                            ? dropTarget
                            : null;
                        const draggingRow =
                          draggingSession?.cellId === cell.id
                            ? projection.rowsById[draggingSession.sessionId] || null
                            : null;
                        const rowIsAncestorOfDragging = Boolean(
                          draggingRow?.ancestorSessionIds.includes(row.id)
                        );
                        const rowPaddingLeft = 10 + row.depth * SESSION_TREE_INDENT_PX;
                        const outdentHintLeft = Math.max(
                          6,
                          rowPaddingLeft - OUTDENT_DROP_ZONE_WIDTH + 10
                        );
                        const showBeforeLine = activeDropTarget?.intent === 'before';
                        const showAfterLine = activeDropTarget?.intent === 'after';
                        const showOutdentHint = rowIsAncestorOfDragging;
                        const showActiveOutdentHint =
                          activeDropTarget?.intent === 'outdent';

                        return (
                          <div key={row.id} className="relative">
                            <OutdentHint
                              visible={showOutdentHint}
                              active={showActiveOutdentHint}
                              left={outdentHintLeft}
                            />
                            <DropLine active={showBeforeLine} />
                            <div
                              className={`absolute left-2 right-2 bottom-0 translate-y-1/2 ${
                                showAfterLine ? 'opacity-100' : 'opacity-0'
                              }`}
                            >
                              <DropLine active={showAfterLine} />
                            </div>
                            <div
                              draggable={!isEditing}
                              role="treeitem"
                              aria-level={row.depth + 2}
                              aria-expanded={hasChildren ? !isNodeCollapsed : undefined}
                              aria-selected={isSelectedSession}
                              tabIndex={0}
                              data-session-tab-id={session.id}
                              data-cell-id={cell.id}
                              className={`group relative flex w-full min-w-0 items-center gap-2.5 rounded-xl border border-transparent py-1.5 pr-2 text-left text-[11px] transition-all duration-200 select-none ${
                                isSelectedSession
                                  ? 'border-primary/20 bg-primary/10 text-foreground shadow-[0_8px_18px_-16px_rgba(59,130,246,0.7)]'
                                  : `bg-transparent text-muted-foreground hover:text-foreground ${resolveAttentionRowClass(sessionAttention)}`
                              } ${
                                activeDropTarget?.intent === 'into'
                                  ? 'ring-1 ring-primary/30 bg-primary/5'
                                  : ''
                              } ${
                                draggingSession?.cellId === cell.id && draggingSession?.sessionId === session.id
                                  ? 'opacity-45'
                                  : ''
                              }`}
                              style={{ paddingLeft: `${rowPaddingLeft}px` }}
                              data-testid={`session-tab-${session.id}`}
                              data-active={isSelectedSession ? 'true' : 'false'}
                              data-cell-active={isCellActiveSession ? 'true' : 'false'}
                              onClick={() => {
                                if (selectionSuppressedRef.current) {
                                  return;
                                }
                                selectSessionTab(cell.id, session.id);
                              }}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  selectSessionTab(cell.id, session.id);
                                  return;
                                }
                                if (event.key === 'ArrowLeft' && hasChildren && !isNodeCollapsed) {
                                  event.preventDefault();
                                  toggleSessionNodeCollapse(cell.id, row.id);
                                  return;
                                }
                                if (event.key === 'ArrowRight' && hasChildren && isNodeCollapsed) {
                                  event.preventDefault();
                                  toggleSessionNodeCollapse(cell.id, row.id);
                                }
                              }}
                              onDoubleClick={(event) => {
                                event.stopPropagation();
                                beginRenameSession(cell.id, session);
                              }}
                              onContextMenu={(event) => {
                                event.preventDefault();
                                setContextMenu({
                                  cellId: cell.id,
                                  sessionId: session.id,
                                  x: event.clientX,
                                  y: event.clientY,
                                });
                              }}
                              onDragStart={(event) => {
                                event.dataTransfer.effectAllowed = 'move';
                                event.dataTransfer.setData('text/plain', session.id);
                                suppressSelectionTemporarily();
                                setDraggingSession({ cellId: cell.id, sessionId: session.id });
                                setDropTarget(null);
                              }}
                              onDragEnd={() => {
                                suppressSelectionTemporarily();
                                clearDragState();
                              }}
                              onDragOver={(event) => {
                                const nextTarget = buildRowDropTarget({
                                  cellId: cell.id,
                                  row,
                                  projection,
                                  clientY: event.clientY,
                                  clientX: event.clientX,
                                  rowRect: event.currentTarget.getBoundingClientRect(),
                                });
                                if (!nextTarget) {
                                  return;
                                }
                                event.preventDefault();
                                event.dataTransfer.dropEffect = 'move';
                                setDropTarget(nextTarget);
                              }}
                              onDrop={async (event) => {
                                event.preventDefault();
                                const nextTarget = buildRowDropTarget({
                                  cellId: cell.id,
                                  row,
                                  projection,
                                  clientY: event.clientY,
                                  clientX: event.clientX,
                                  rowRect: event.currentTarget.getBoundingClientRect(),
                                });
                                await commitDropTarget(nextTarget);
                              }}
                            >
                              <SessionTreeGuides depth={row.depth} rowPaddingLeft={rowPaddingLeft} />
                              {hasChildren ? (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    toggleSessionNodeCollapse(cell.id, row.id);
                                  }}
                                  className="absolute left-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground/60 hover:text-foreground hover:bg-muted/30"
                                  title={isNodeCollapsed ? 'Expand child sessions' : 'Collapse child sessions'}
                                >
                                  {isNodeCollapsed ? (
                                    <ChevronRight size={11} strokeWidth={1.7} />
                                  ) : (
                                    <ChevronDown size={11} strokeWidth={1.7} />
                                  )}
                                </button>
                              ) : (
                                <div className="absolute left-[7px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border border-white/[0.09] bg-background/70 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]" />
                              )}

                              <div className="relative flex shrink-0 items-center justify-center">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    if (!onUpdateSessionAvatar) return;
                                    const rect = event.currentTarget.getBoundingClientRect();
                                    openAvatarMenu({ cellId: cell.id, sessionId: session.id }, rect);
                                  }}
                                  className="relative flex h-5 w-5 items-center justify-center rounded-full transition-transform active:scale-95"
                                  title="Change avatar"
                                  data-avatar-picker-anchor="true"
                                >
                                  <AgentAvatarBadge
                                    avatarId={resolveSessionAvatarId(session, cell)}
                                    size={16}
                                    ringSize={20}
                                    idleMs={idleDuration}
                                    isClosed={isClosed}
                                    className="shadow-sm"
                                  />
                                </button>
                              </div>

                              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                {isEditing ? (
                                  <input
                                    value={editingSessionName}
                                    onChange={(event) => setEditingSessionName(event.target.value)}
                                    onClick={(event) => event.stopPropagation()}
                                    onBlur={() => commitRenameSession()}
                                    onKeyDown={(event) => {
                                      if (event.key === 'Enter') {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        commitRenameSession();
                                      }
                                      if (event.key === 'Escape') {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        cancelRenameSession();
                                      }
                                    }}
                                    className="w-full min-w-0 bg-transparent p-0 text-[11px] font-medium text-foreground outline-none placeholder:text-muted-foreground/30 focus:ring-0 selection:bg-primary/20"
                                    autoFocus
                                    onFocus={(event) => event.target.select()}
                                  />
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    <span className="truncate font-medium leading-none tracking-tight">
                                      {session.name || session.id}
                                    </span>
                                    <SessionKindBadge nodeKind={session.nodeKind} />
                                    {sessionAttention ? (
                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          attention.jumpToAttention(sessionAttention);
                                        }}
                                        className="shrink-0"
                                        aria-label={buildAttentionActionLabel({
                                          item: sessionAttention,
                                          ownerLabel: session.name || session.id,
                                        })}
                                        title={sessionAttention.detail}
                                      >
                                        <AttentionPill
                                          item={sessionAttention}
                                          className="px-1.5 py-[2px]"
                                        />
                                      </button>
                                    ) : null}
                                  </div>
                                )}

                                {!isEditing ? (
                                  <SessionStatusMeta
                                    session={session}
                                    idleLabel={idleLabel}
                                    isCellActiveSession={isCellActiveSession}
                                  />
                                ) : null}
                              </div>

                              {!isEditing ? (
                                <div
                                  className={`absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1 transition-all duration-200 ${
                                    isSelectedSession ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                  }`}
                                >
                                  <IconButton
                                    label="Terminate Session"
                                    focusRing="sidebar"
                                    className="h-6 w-6 rounded-md text-muted-foreground/45 transition-colors hover:bg-destructive/10 hover:text-destructive"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      onCloseSession?.(session.id, cell.id);
                                    }}
                                  >
                                    <X size={10} strokeWidth={2.5} aria-hidden="true" />
                                  </IconButton>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}

                      {showRootDropZone ? (
                        <div
                          className={`mt-1 rounded-md border border-dashed px-2 py-1 text-[9px] font-medium transition-colors ${
                            dropTarget?.cellId === cell.id && dropTarget?.intent === 'root'
                              ? 'border-primary/50 bg-primary/10 text-primary'
                              : 'border-border/50 text-muted-foreground/70'
                          }`}
                          onDragOver={(event) => {
                            if (!draggingSession || draggingSession.cellId !== cell.id) {
                              return;
                            }
                            event.preventDefault();
                            event.dataTransfer.dropEffect = 'move';
                            setDropTarget({
                              cellId: cell.id,
                              sessionId: draggingSession.sessionId,
                              parentSessionId: null,
                              beforeSessionId: null,
                              targetSessionId: null,
                              intent: 'root',
                            });
                          }}
                          onDrop={async (event) => {
                            event.preventDefault();
                            if (!draggingSession || draggingSession.cellId !== cell.id) {
                              clearDragState();
                              return;
                            }
                            await commitDropTarget({
                              cellId: cell.id,
                              sessionId: draggingSession.sessionId,
                              parentSessionId: null,
                              beforeSessionId: null,
                              targetSessionId: null,
                              intent: 'root',
                            });
                          }}
                        >
                          Drop here to move the session to the root level.
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                    </div>
                  );
                  })}
                </div>
              </section>
            ) : null}

            {detachedCells.length > 0 ? (
              <section
                className="space-y-2"
                data-testid="detached-cell-list"
                aria-label="Detached cells"
              >
                <LifecycleSectionHeader
                  label="Detached Cells"
                  count={detachedCells.length}
                  tone="detached"
                  description="Tracked Cells with missing or detached worktree attachments."
                />
                <div className="space-y-2">
                  {detachedCells.map((cell: any) => {
                    const attachmentMeta = resolveCellAttachmentMeta(cell);
                    const cellAttention = attention.byCellId[cell.id];
                    return (
                      <div
                        key={cell.id}
                        data-testid={`detached-cell-card-${cell.id}`}
                        className={`${buildWorkspacePanelClass({
                          selected: selectedId === cell.id,
                          tone: 'detached',
                          attentionClass: resolveAttentionCardClass(cellAttention?.strongest),
                        })} px-3 py-2.5 transition-colors`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] border border-amber-300/16 bg-amber-500/[0.09] text-amber-100/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
                            <GitBranch size={14} strokeWidth={1.6} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-center gap-2">
                              <button
                                type="button"
                                onClick={() => onSelect?.(cell.id)}
                                className="truncate text-left text-[12px] font-semibold text-foreground transition-colors hover:text-primary"
                              >
                                {cell.name}
                              </button>
                              <span
                                className={`${SECTION_BADGE_BASE} ${attachmentMeta.tone}`}
                              >
                                {attachmentMeta.label}
                              </span>
                              {cellAttention?.strongest ? (
                                <button
                                  type="button"
                                  onClick={() => attention.jumpToAttention(cellAttention.strongest)}
                                  className="shrink-0"
                                  aria-label={buildAttentionActionLabel({
                                    item: cellAttention.strongest,
                                    ownerLabel: cell.name || cell.id,
                                    count: cellAttention.count,
                                  })}
                                  title={cellAttention.strongest.detail}
                                >
                                  <AttentionPill
                                    item={cellAttention.strongest}
                                    count={cellAttention.count}
                                    className="px-1.5 py-[2px]"
                                  />
                                </button>
                              ) : null}
                            </div>
                            <div className="mt-1 text-[10px] text-muted-foreground/72">
                              {attachmentMeta.pathLabel || 'No attached worktree path recorded'}
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <span className="text-[10px] text-muted-foreground/70">
                                {resolveCellSessions(String(cell.id)).length || 0} session
                                {resolveCellSessions(String(cell.id)).length === 1 ? '' : 's'}
                              </span>
                              <div className="flex items-center gap-2">
                                {onArchiveCell ? (
                                  <button
                                    type="button"
                                    onClick={() => onArchiveCell(cell)}
                                    className="rounded-lg border border-amber-300/24 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-100 transition-colors hover:bg-amber-500/10"
                                  >
                                    Archive Cell
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() => onSelect?.(cell.id)}
                                  className="rounded-lg border border-border/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                                >
                                  View Details
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {visibleUnmanagedWorktrees.length > 0 ? (
              <section
                className="space-y-2"
                data-testid="unmanaged-worktree-list"
                aria-label="Unmanaged worktrees"
              >
                <LifecycleSectionHeader
                  label="Unmanaged Worktrees"
                  count={visibleUnmanagedWorktrees.length}
                  tone="unmanaged"
                  description="Live git worktrees that are not tracked by a Cell yet."
                  action={
                    ignoredWorktreeCount > 0 ? (
                      <button
                        type="button"
                        onClick={() => void handleResetIgnoredUnmanagedWorktrees()}
                        className="inline-flex items-center rounded-md border border-white/[0.05] bg-white/[0.02] px-2 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:border-white/[0.08] hover:text-foreground"
                      >
                        Reset ignored
                      </button>
                    ) : null
                  }
                />
                <div className="space-y-2">
                  {visibleUnmanagedWorktrees.map((worktree) => {
                    const display = deriveUnmanagedWorktreeDisplay(worktree);
                    return (
                      <div
                        key={worktree.path}
                        data-testid={`unmanaged-worktree-${pathBaseName(worktree.path)}`}
                        className={`${buildWorkspacePanelClass({
                          selected: false,
                          tone: 'unmanaged',
                        })} px-3 py-2.5`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] border border-sky-300/16 bg-sky-500/[0.09] text-sky-100/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
                            <GitBranch size={14} strokeWidth={1.6} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="truncate text-[12px] font-semibold text-foreground">
                                {display.title}
                              </div>
                              <span
                                className={`${SECTION_BADGE_BASE} ${
                                  display.detachedHeadLabel
                                    ? 'border-amber-300/16 bg-amber-500/[0.09] text-amber-100/82'
                                    : 'border-sky-300/16 bg-sky-500/[0.09] text-sky-100/82'
                                }`}
                              >
                                {display.detachedHeadLabel || display.branchLabel}
                              </span>
                            </div>
                            <div className="mt-1 truncate font-mono text-[10px] text-muted-foreground/72">
                              {worktree.path}
                            </div>
                            {display.helperText ? (
                              <div className="mt-1 text-[10px] leading-4 text-muted-foreground/72">
                                {display.helperText}
                              </div>
                            ) : null}
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {display.primaryAction === 'bind' ? (
                                <button
                                  type="button"
                                  onClick={() => handleBindSuggestedCell(worktree)}
                                  className="rounded-lg bg-sky-500/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-sky-50 transition-colors hover:bg-sky-500/30"
                                >
                                  {display.primaryLabel}
                                </button>
                              ) : null}
                              {display.primaryAction === 'create' ? (
                                <button
                                  type="button"
                                  onClick={() => void handleCreateCellFromWorktree(worktree)}
                                  className="rounded-lg bg-sky-500/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-sky-50 transition-colors hover:bg-sky-500/30"
                                >
                                  {display.primaryLabel}
                                </button>
                              ) : null}
                              {display.secondaryCreateLabel ? (
                                <button
                                  type="button"
                                  onClick={() => void handleCreateCellFromWorktree(worktree)}
                                  className="rounded-lg border border-sky-300/22 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-sky-100 transition-colors hover:bg-sky-500/12"
                                >
                                  {display.secondaryCreateLabel}
                                </button>
                              ) : null}
                              {display.availabilityLabel ? (
                                <span className="inline-flex items-center rounded-md border border-amber-300/16 bg-amber-500/[0.08] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-100/84">
                                  {display.availabilityLabel}
                                </span>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => void handleIgnoreUnmanagedWorktree(worktree.path)}
                                className="rounded-lg border border-border/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:border-primary/35 hover:text-foreground"
                              >
                                Ignore For Now
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {legacyArchivedCells.length > 0 ? (
              <section
                className="space-y-1.5"
                data-testid="legacy-archived-cell-shell"
                aria-label="Legacy archived cells"
              >
                <LifecycleSectionHeader
                  label="Legacy Archived"
                  count={legacyArchivedCells.length}
                  tone="legacy"
                  description="Compatibility surface for older archived records."
                  action={
                    <button
                      type="button"
                      onClick={() => setShowLegacyArchivedCells((value) => !value)}
                      className="inline-flex items-center gap-1 rounded-md border border-white/[0.05] bg-white/[0.02] px-2 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:border-white/[0.08] hover:text-foreground"
                      aria-label="Legacy archived cells"
                      aria-expanded={showLegacyArchivedCells}
                      aria-controls="legacy-archived-cell-list"
                    >
                      {showLegacyArchivedCells ? (
                        <ChevronDown size={12} strokeWidth={1.7} />
                      ) : (
                        <ChevronRight size={12} strokeWidth={1.7} />
                      )}
                      <span>{showLegacyArchivedCells ? 'Hide' : 'View'}</span>
                    </button>
                  }
                />

                {showLegacyArchivedCells ? (
                  <div
                    id="legacy-archived-cell-list"
                    className="space-y-2"
                    data-testid="legacy-archived-cell-list"
                    aria-label="Legacy archived cells"
                  >
                    {legacyArchivedCells.map((cell: any) => {
                      const attachmentMeta = resolveCellAttachmentMeta(cell);
                      return (
                        <div
                          key={cell.id}
                          data-testid={`legacy-archived-cell-${cell.id}`}
                          className={`rounded-xl border px-3 py-2.5 transition-colors ${
                            selectedId === cell.id
                              ? 'border-slate-300/24 bg-slate-500/[0.08]'
                              : 'border-border/35 bg-background/20'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="truncate text-[12px] font-semibold text-foreground">
                                {cell.name}
                              </div>
                              <div className="mt-1 truncate text-[10px] text-muted-foreground/70">
                                {attachmentMeta.pathLabel || 'No attached worktree path recorded'}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => onSelect?.(cell.id)}
                              className="rounded-lg border border-border/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                            >
                              View Details
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </section>
            ) : null}
          </div>
        )}
      </div>

      <SessionOverflowMenu
        isOpen={Boolean(closedMenu)}
        position={closedMenu || { x: 0, y: 0 }}
        containerRef={closedMenuRef}
        detachedSessions={overflowSessions.detached}
        closedSessions={overflowSessions.closed}
        cell={closedMenu?.cellId ? cellsById.get(closedMenu.cellId) : null}
        onSelectDetached={(session: any) => {
          if (closedMenu?.cellId) {
            selectSessionTab(closedMenu.cellId, session.id);
          }
          setClosedMenu(null);
        }}
        onRestoreClosed={(session: any) => {
          if (closedMenu?.cellId) {
            const cell = cellsById.get(closedMenu.cellId) as any;
            if (cell) {
              void onCreateSession?.(cell, {
                name: session.name || session.id,
                parentSessionId: session.parentSessionId || null,
                nodeKind: session.nodeKind || undefined,
                sourceSessionId: session.sourceSessionId || null,
              });
            }
          }
          setClosedMenu(null);
        }}
      />

      <SessionContextMenu
        isOpen={Boolean(contextMenu && contextMenuSession)}
        position={contextMenu || { x: 0, y: 0 }}
        containerRef={contextMenuRef}
        showSmartForkByCommander={smartForkAvailable}
        showSmartNameByCommander={smartNameAvailable}
        onSmartForkByCommander={() => {
          setContextMenu(null);
          if (contextMenuCell && contextMenuSession) {
            void commanderSessionActions.runSmartFork({
              cell: contextMenuCell as any,
              session: contextMenuSession as any,
              available: smartForkAvailable,
            });
          }
        }}
        onSmartNameByCommander={() => {
          setContextMenu(null);
          if (contextMenuCell && contextMenuSession) {
            void commanderSessionActions.runSmartName({
              cell: contextMenuCell as any,
              session: contextMenuSession as any,
              available: smartNameAvailable,
            });
          }
        }}
        canContinueOnMobile={Boolean(
          contextMenuSession &&
            contextMenuSession.status !== 'closed' &&
            contextMenuSession.status !== 'stale'
        )}
        onCreateSubTerminal={() => {
          if (contextMenu?.cellId && contextMenuSession) {
            void createChildSession({
              cellId: contextMenu.cellId,
              session: contextMenuSession,
              nodeKind: 'sub_terminal',
            });
          }
          setContextMenu(null);
        }}
        onDetach={() => {
          if (contextMenu?.cellId && contextMenu?.sessionId) {
            onDetachSession?.(contextMenu.sessionId, contextMenu.cellId);
          }
          setContextMenu(null);
        }}
        onRename={() => {
          if (contextMenu?.cellId && contextMenuSession) {
            beginRenameSession(contextMenu.cellId, contextMenuSession);
          }
          setContextMenu(null);
        }}
        onContinueOnMobileDirect={() => {
          if (contextMenu?.cellId && contextMenu?.sessionId) {
            void onContinueSessionOnMobile?.(contextMenu.sessionId, contextMenu.cellId, 'direct');
          }
          setContextMenu(null);
        }}
        onContinueOnMobileHub={() => {
          if (contextMenu?.cellId && contextMenu?.sessionId) {
            void onContinueSessionOnMobile?.(contextMenu.sessionId, contextMenu.cellId, 'hub');
          }
          setContextMenu(null);
        }}
        onContinueOnMobileProxy={() => {
          if (contextMenu?.cellId && contextMenu?.sessionId) {
            void onContinueSessionOnMobile?.(contextMenu.sessionId, contextMenu.cellId, 'proxy');
          }
          setContextMenu(null);
        }}
      />

      <SessionCreateMenu
        isOpen={Boolean(createMenu)}
        position={createMenu || { x: 0, y: 0 }}
        containerRef={createMenuRef}
        profiles={terminusProfiles || []}
        onConfigureProfile={onConfigureProfile}
        onCreateBase={async () => {
          if (createMenu?.cellId) {
            const cell = cellsById.get(createMenu.cellId) as any;
            if (cell) {
              await onCreateSession?.(cell);
            }
          }
          setCreateMenu(null);
        }}
        onCreateProfile={(profile: any, action: any) => {
          const command = String(action?.command || profile?.startCommand || '').trim();
          if (!command || !createMenu?.cellId) {
            setCreateMenu(null);
            return;
          }
          const cell = cellsById.get(createMenu.cellId) as any;
          if (cell) {
            const modeLabel = action?.mode === 'resume' ? ' (resume)' : '';
            onDispatchCommand?.({
              command,
              kind: 'start',
              label: `${profile.label || profile.id}${modeLabel}`,
              profileId: profile.id,
              appendEnter: true,
              cellId: cell.id,
              worktreePath: cell.attachedWorktreePath || '',
            });
          }
          setCreateMenu(null);
        }}
      />

      {avatarMenu ? (
        <AvatarPickerMenu
          isOpen={Boolean(avatarMenu)}
          position={avatarMenu}
          containerRef={avatarMenuRef}
          selectedId={resolveSessionAvatarId(avatarMenuSession, avatarMenuCell)}
          activeAvatarIds={avatarMenuActiveIds}
          title="Select Session Avatar"
          onSelect={(id) => {
            if (avatarMenu?.cellId && avatarMenu?.sessionId) {
              onUpdateSessionAvatar?.(avatarMenu.sessionId, id, avatarMenu.cellId);
            }
            setAvatarMenu(null);
          }}
        />
      ) : null}
    </>
  );
}
