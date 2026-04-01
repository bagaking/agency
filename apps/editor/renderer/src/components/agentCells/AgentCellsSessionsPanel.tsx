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
import { DetachedCellCleanupCard } from './DetachedCellCleanupCard';
import { ArchivedCellCard } from './ArchivedCellCard';
import {
  CellStateBadge,
  isArchivedCell,
  isDetachedCellCleanupCandidate,
  resolveCellAttachmentMeta,
} from './cellPresentation';

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
  onSelect?: (cellId: string) => void;
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
  onArchiveCell?: (cell: any) => void;
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
  tone,
  action,
}: {
  label: string;
  count: number;
  tone: 'cleanup' | 'archived';
  action?: React.ReactNode;
}) {
  const toneClass =
    tone === 'cleanup'
      ? 'text-amber-100/72'
      : 'text-slate-200/72';
  const countClass =
    tone === 'cleanup'
      ? 'border-amber-300/16 bg-amber-500/[0.08] text-amber-100/72'
      : 'border-white/8 bg-white/[0.03] text-slate-200/70';

  return (
    <div className="flex items-center justify-between gap-2 px-1">
      <div className="flex min-w-0 items-center gap-2">
        <span className={`truncate text-[10px] font-semibold uppercase tracking-[0.18em] ${toneClass}`}>
          {label}
        </span>
        <span
          className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${countClass}`}
        >
          {count}
        </span>
      </div>
      {action}
    </div>
  );
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
  onSelect,
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
  const [showArchivedCells, setShowArchivedCells] = useState(false);

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

  const { activeCells, cleanupCells, archivedCells } = useMemo(() => {
    const primary: any[] = [];
    const cleanup: any[] = [];
    const archived: any[] = [];
    (cells || []).forEach((cell: any) => {
      if (isDetachedCellCleanupCandidate(cell)) {
        cleanup.push(cell);
      } else if (isArchivedCell(cell)) {
        archived.push(cell);
      } else {
        primary.push(cell);
      }
    });
    return {
      activeCells: primary,
      cleanupCells: cleanup,
      archivedCells: archived,
    };
  }, [cells]);

  useEffect(() => {
    if (!selectedId) {
      return;
    }
    const selectedArchived = archivedCells.some((cell: any) => cell?.id === selectedId);
    if (selectedArchived) {
      setShowArchivedCells(true);
    }
  }, [archivedCells, selectedId]);

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
    activeCells.forEach((cell: any) => {
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
  }, [activeCells, activeSessionByCellId, pendingActiveSessionByCellId, resolveCellSessions]);

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

        {activeCells.length === 0 && cleanupCells.length === 0 && archivedCells.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-muted-foreground">No active cells</div>
        ) : (
          <div className="space-y-4">
            {activeCells.length > 0 ? (
              <div className="space-y-3" data-testid="cell-list" role="tree" aria-label="Agent Cells">
                {activeCells.map((cell: any) => {
              const attachmentMeta = resolveCellAttachmentMeta(cell);
              const isWindowHome = isWindowHomeCell(cell);
              const hasAttachment = !isWindowHome && attachmentMeta.attachmentState === 'attached';
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
                      className={`overflow-hidden rounded-xl border transition-colors ${
                        isSelectedCell
                          ? 'border-primary/25 bg-primary/[0.045] shadow-[0_8px_24px_-18px_rgba(59,130,246,0.55)]'
                          : `border-border/40 bg-background/20 ${resolveAttentionCardClass(cellAttention?.strongest)}`
                      }`}
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
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${
                        cell.isVirtual
                          ? 'border-primary/20 bg-primary/10 text-primary/85'
                          : 'border-white/[0.08] bg-white/[0.04] text-foreground/75'
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
                          <span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.16em] text-primary/80">
                            Local
                          </span>
                        ) : (
                          <CellStateBadge state={cell.state} />
                        )}
                        {!cell.isVirtual && attachmentMeta.attachmentState !== 'attached' ? (
                          <span
                            className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.16em] ${attachmentMeta.tone}`}
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
                      <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[9px] text-muted-foreground/72">
                        {cell.isVirtual ? (
                          <SquareTerminal size={10} strokeWidth={1.7} className="shrink-0" />
                        ) : (
                          <GitBranch size={10} strokeWidth={1.7} className="shrink-0" />
                        )}
                        <span className="truncate">
                          {cell.isVirtual
                            ? cell.worktreePath || 'Local shell'
                            : attachmentMeta.attachmentState === 'attached'
                              ? cell.branch || attachmentMeta.pathLabel || 'Attached worktree'
                              : attachmentMeta.pathLabel || `${attachmentMeta.label} worktree`}
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
                          disabled={!hasAttachment}
                          className="h-7 w-7 rounded-md text-primary transition-colors hover:bg-primary/12 hover:text-primary disabled:text-muted-foreground/40 disabled:hover:bg-transparent"
                          title={
                            hasAttachment
                              ? 'Create a session inside the attached worktree.'
                              : 'Attach a worktree before creating sessions.'
                          }
                          onClick={(event) => {
                            if (!hasAttachment) {
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
            ) : null}

            {cleanupCells.length > 0 ? (
              <section
                className="space-y-1.5"
                data-testid="cleanup-cell-list"
                aria-label="Cells waiting for cleanup"
              >
                <LifecycleSectionHeader label="Needs Cleanup" count={cleanupCells.length} tone="cleanup" />
                {cleanupCells.map((cell: any) => {
                  const cellAttention = attention.byCellId[cell.id];
                  return (
                    <DetachedCellCleanupCard
                      key={cell.id}
                      cell={cell}
                      sessions={resolveCellSessions(String(cell.id))}
                      selected={selectedId === cell.id}
                      attentionItem={cellAttention?.strongest || null}
                      attentionCount={cellAttention?.count || 0}
                      onSelect={onSelect}
                      onArchive={onArchiveCell}
                    />
                  );
                })}
              </section>
            ) : null}

            {archivedCells.length > 0 ? (
              <section
                className="space-y-1.5"
                data-testid="archived-cell-shell"
                aria-label="Archived cells"
              >
                <LifecycleSectionHeader
                  label="Archived"
                  count={archivedCells.length}
                  tone="archived"
                  action={
                    <button
                      type="button"
                      onClick={() => setShowArchivedCells((value) => !value)}
                      className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
                      aria-label="Archived cells"
                    >
                      {showArchivedCells ? (
                        <ChevronDown size={12} strokeWidth={1.7} />
                      ) : (
                        <ChevronRight size={12} strokeWidth={1.7} />
                      )}
                      <span>{showArchivedCells ? 'Hide Archived' : 'View Archived'}</span>
                    </button>
                  }
                />

                {showArchivedCells ? (
                  <div
                    className="space-y-1.5"
                    data-testid="archived-cell-list"
                    aria-label="Archived cells"
                  >
                    {archivedCells.map((cell: any) => {
                      const cellAttention = attention.byCellId[cell.id];
                      return (
                        <ArchivedCellCard
                          key={cell.id}
                          cell={cell}
                          sessions={resolveCellSessions(String(cell.id))}
                          selected={selectedId === cell.id}
                          attentionItem={cellAttention?.strongest || null}
                          attentionCount={cellAttention?.count || 0}
                          onSelect={onSelect}
                        />
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
