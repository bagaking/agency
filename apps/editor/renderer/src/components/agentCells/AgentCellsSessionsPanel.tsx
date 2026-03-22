import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus,
  GitBranch,
  Circle,
  ArrowUpLeft,
  SquareTerminal,
  FolderOpen,
  MoreHorizontal,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

import { RecentProjectsList } from '../RecentProjectsList';
import { SessionContextMenu, SessionCreateMenu, SessionOverflowMenu } from '../SessionMenus';
import { AgentAvatarBadge } from '../ui/AgentAvatarBadge';
import { AvatarPickerMenu } from '../ui/AvatarPickerMenu';
import { formatIdleShort } from '../../utils/timeFormat';
import { resolveSessionAvatarId } from '../../utils/agentAvatar';
import {
  projectAgentCellSessionTree,
  SESSION_TREE_INDENT_PX,
  type AgentCellSessionTreeProjection,
  type AgentCellSessionTreeRow,
} from '../../utils/agentCellSessionTree';

const cellStateColors: Record<string, string> = {
  draft: 'text-muted-foreground',
  active: 'text-emerald-400',
  paused: 'text-amber-400',
  archived: 'text-slate-500',
};

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
  onConfigureProfile?: (profile: any) => void;
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
  onConfigureProfile,
}: AgentCellsSessionsPanelProps) {
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
    (cells || []).forEach((cell: any) => {
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
  }, [activeSessionByCellId, cells, pendingActiveSessionByCellId, resolveCellSessions]);

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

        {cells.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-muted-foreground">No active cells</div>
        ) : (
          <div className="space-y-2" data-testid="cell-list">
            {cells.map((cell: any) => {
              const projection = projectionsByCellId[cell.id] || EMPTY_TREE;
              const visibleRows = visibleRowsByCellId[cell.id] || [];
              const activeSessionId =
                pendingActiveSessionByCellId[cell.id] || activeSessionByCellId?.[cell.id] || null;
              const isSelectedCell = selectedId === cell.id;
              const isCollapsed = collapsedCells.has(cell.id);
              const hasOverflow =
                projection.overflowDetachedSessions.length > 0 ||
                projection.overflowClosedSessions.length > 0;
              const showRootDropZone = draggingSession?.cellId === cell.id && Boolean(onMoveSessionNode);

              return (
                <div key={cell.id} className="rounded-md">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelect?.(cell.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onSelect?.(cell.id);
                      }
                    }}
                    data-testid={`cell-item-${cell.id}`}
                    className={`group flex w-full items-center gap-2 rounded px-2 py-1 text-sm transition-colors ${
                      isSelectedCell
                        ? 'bg-primary/10 text-foreground'
                        : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleCellCollapse(cell.id);
                      }}
                      className="rounded p-0.5 text-muted-foreground/60 hover:text-foreground hover:bg-muted/30"
                      title={isCollapsed ? 'Expand sessions' : 'Collapse sessions'}
                    >
                      {isCollapsed ? (
                        <ChevronRight size={12} strokeWidth={1.5} />
                      ) : (
                        <ChevronDown size={12} strokeWidth={1.5} />
                      )}
                    </button>
                    {cell.isVirtual ? (
                      <SquareTerminal size={14} strokeWidth={1.5} className="opacity-70" />
                    ) : (
                      <GitBranch size={14} strokeWidth={1.5} className="opacity-70" />
                    )}
                    <span className="truncate">{cell.name}</span>
                    <div
                      className={`ml-auto flex items-center gap-1 transition-opacity ${
                        isSelectedCell ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {!cell.isVirtual ? (
                        <button
                          type="button"
                          className="rounded p-1 text-muted-foreground/60 hover:text-foreground hover:bg-muted/30"
                          onClick={(event) => {
                            event.stopPropagation();
                            onOpenExplorer?.(cell.id);
                          }}
                          title="Open in Explorer"
                        >
                          <FolderOpen size={12} strokeWidth={1.5} />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={(event) => {
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
                        className="rounded p-1 text-muted-foreground/60 hover:text-foreground hover:bg-muted/30"
                        title="New Session"
                      >
                        <Plus size={12} strokeWidth={1.5} />
                      </button>
                      {hasOverflow ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            const rect = event.currentTarget.getBoundingClientRect();
                            setClosedMenu({
                              cellId: cell.id,
                              x: rect.left,
                              y: rect.bottom + 6,
                            });
                          }}
                          className="rounded p-1 text-muted-foreground/60 hover:text-foreground hover:bg-muted/30"
                          title="Detached/closed sessions"
                        >
                          <MoreHorizontal size={12} strokeWidth={1.5} />
                        </button>
                      ) : null}
                      {!cell.isVirtual ? (
                        <Circle
                          size={8}
                          className={cellStateColors[cell.state] || cellStateColors.draft}
                          fill="currentColor"
                        />
                      ) : null}
                    </div>
                  </div>

                  {!isCollapsed ? (
                    <div className="mt-1 space-y-0.5 pl-3">
                      {visibleRows.map((row) => {
                        const session = row.session;
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
                              data-session-tab-id={session.id}
                              data-cell-id={cell.id}
                              className={`group relative flex w-full min-w-0 items-center gap-2.5 rounded-lg py-1.5 pr-2 text-left text-[11px] transition-all duration-200 select-none ${
                                isSelectedSession
                                  ? 'bg-primary/10 text-foreground ring-1 ring-primary/20 shadow-sm'
                                  : 'bg-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground'
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
                                <div className="absolute left-[7px] top-1/2 h-2 w-2 -translate-y-1/2 rounded-full border border-border/30 bg-background/40" />
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
                                  </div>
                                )}

                                {!isEditing ? (
                                  <div className="flex items-center gap-1.5 opacity-60 transition-opacity group-hover:opacity-90">
                                    <span
                                      className={`h-1 w-1 rounded-full ${
                                        session.status === 'detached'
                                          ? 'bg-amber-400/50'
                                          : session.status === 'stale'
                                            ? 'bg-rose-400/50'
                                            : isCellActiveSession
                                              ? 'bg-emerald-400/50'
                                              : 'bg-slate-400/30'
                                      }`}
                                    />
                                    <span className="truncate text-[9px] font-medium tabular-nums tracking-wide">
                                      {idleLabel === '—' ? 'Active' : idleLabel}
                                    </span>
                                  </div>
                                ) : null}
                              </div>

                              {!isEditing ? (
                                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 transition-all duration-200 group-hover:opacity-100">
                                  <button
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      onCloseSession?.(session.id, cell.id);
                                    }}
                                    className="flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground/40 hover:bg-destructive/10 hover:text-destructive transition-colors"
                                    title="Terminate Session"
                                  >
                                    <X size={10} strokeWidth={2.5} />
                                  </button>
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
        canContinueOnMobile={Boolean(
          contextMenuSession &&
            contextMenuSession.status !== 'closed' &&
            contextMenuSession.status !== 'stale'
        )}
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
              worktreePath: cell.worktreePath,
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
