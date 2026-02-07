import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus,
  GitBranch,
  Circle,
  SquareTerminal,
  Command,
  Link2,
  ShieldCheck,
  ArrowUpRight,
  FolderOpen,
  MoreHorizontal,
  Pencil,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { RecentProjectsList } from './RecentProjectsList';
import { SessionContextMenu, SessionCreateMenu, SessionOverflowMenu } from './SessionMenus';
import { AgentAvatarBadge } from './ui/AgentAvatarBadge';
import { AvatarPickerMenu } from './ui/AvatarPickerMenu';
import { formatIdleShort } from '../utils/timeFormat';
import { resolveSessionAvatarId } from '../utils/agentAvatar';


const statusColors = {
  draft: 'text-muted-foreground',
  active: 'text-emerald-400',
  paused: 'text-amber-400',
  archived: 'text-slate-500',
};

const buildSessionKey = (cellId, sessionId) => `${cellId}:${sessionId}`;

export function AgentCellsSidebar({
  cells,
  selectedId,
  onSelect,
  onCreate,
  onJump,
  onOpenExplorer,
  projectReady,
  projectError,
  onSelectProject,
  recentProjects,
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
  onConfigureProfile,
}: any) {
  const [idleNow, setIdleNow] = useState(Date.now());
  const [closedMenu, setClosedMenu] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [createMenu, setCreateMenu] = useState(null);
  const [editingSession, setEditingSession] = useState(null);
  const [editingSessionName, setEditingSessionName] = useState('');
  const [avatarMenu, setAvatarMenu] = useState(null);
  const [collapsedCells, setCollapsedCells] = useState(() => new Set());
  const closedMenuRef = useRef(null);
  const contextMenuRef = useRef(null);
  const createMenuRef = useRef(null);
  const avatarMenuRef = useRef(null);
  const cellsById = useMemo(
    () => new Map((cells || []).filter(Boolean).map((cell: any) => [cell.id, cell])),
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
    const handleClick = (event) => {
      if (closedMenuRef.current?.contains(event.target)) {
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
    const handleClick = (event) => {
      if (contextMenuRef.current?.contains(event.target)) {
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
    const handleClick = (event) => {
      if (createMenuRef.current?.contains(event.target)) {
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
    const handleClick = (event) => {
      if (avatarMenuRef.current?.contains(event.target)) {
        return;
      }
      if (event.target?.closest?.('[data-avatar-picker-anchor="true"]')) {
        return;
      }
      setAvatarMenu(null);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [avatarMenu]);

  useEffect(() => {
    if (!cellsById.size) {
      return;
    }
    setCollapsedCells((current) => {
      const next = new Set();
      current.forEach((id) => {
        if (cellsById.has(id)) {
          next.add(id);
        }
      });
      return next;
    });
  }, [cellsById]);

  const beginRenameSession = (cellId, session) => {
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

  const openAvatarMenu = (payload, rect) => {
    if (!rect) {
      return;
    }
    setAvatarMenu({ ...payload, x: rect.left, y: rect.bottom + 6 });
  };

  const toggleCellCollapse = (cellId) => {
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

  const resolveSessionActivity = (cellId, session) => {
    const key = buildSessionKey(cellId, session.id);
    const activity = sessionActivityByKey?.[key];
    if (Number.isFinite(activity)) {
      return activity;
    }
    const parsed = Date.parse(session?.lastActivityAt || '');
    return Number.isFinite(parsed) ? parsed : null;
  };

  const resolveCellSessions = (cellId) => sessionsByCellId?.[cellId] || [];

  const overflowSessions = useMemo(() => {
    if (!closedMenu?.cellId) {
      return { detached: [], closed: [] };
    }
    const list = resolveCellSessions(closedMenu.cellId);
    return {
      detached: list.filter((session) => session.status === 'detached'),
      closed: list.filter((session) => session.status === 'closed'),
    };
  }, [closedMenu?.cellId, sessionsByCellId]);

  const contextMenuSession = useMemo(() => {
    if (!contextMenu?.cellId || !contextMenu?.sessionId) {
      return null;
    }
    return resolveCellSessions(contextMenu.cellId).find(
      (session) => session.id === contextMenu.sessionId
    );
  }, [contextMenu?.cellId, contextMenu?.sessionId, sessionsByCellId]);

  const avatarMenuSessions = useMemo(() => {
    if (!avatarMenu?.cellId) {
      return [];
    }
    return resolveCellSessions(avatarMenu.cellId);
  }, [avatarMenu?.cellId, sessionsByCellId]);

  const avatarMenuSession = avatarMenu
    ? avatarMenuSessions.find((session) => session.id === avatarMenu.sessionId)
    : null;
  const avatarMenuCell = avatarMenu?.cellId ? cellsById.get(avatarMenu.cellId) : null;
  const avatarMenuActiveIds = useMemo(() => {
    if (!avatarMenu?.cellId) {
      return new Set();
    }
    const ids = new Set();
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

  return (
    <aside className="flex w-full flex-col text-sidebar-foreground" data-testid="sidebar">
      <div className="flex items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <span>Agent Cells</span>
        <button
          onClick={onCreate}
          className={`rounded p-1 ${projectReady ? 'hover:bg-muted/50 hover:text-foreground' : 'opacity-40 cursor-not-allowed'}`}
          title={projectReady ? 'New Cell' : 'Select a project to create Cells'}
          data-testid="open-create-cell"
          disabled={!projectReady}
        >
          <Plus size={16} strokeWidth={1.5} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        <div className="mb-2 px-2 text-xs font-medium text-muted-foreground">CONFIGURATION</div>
        <div className="grid grid-cols-2 gap-1">
          <NavItem
            icon={SquareTerminal}
            label="Terminus"
            onClick={() => onJump?.('actions')}
            disabled={!projectReady}
          />
          <NavItem
            icon={Command}
            label="App Shortcuts"
            onClick={() => onJump?.('app-shortcuts')}
            disabled={!projectReady}
          />
          <NavItem
            icon={ShieldCheck}
            label="Gates"
            onClick={() => onJump?.('gates')}
            disabled={!projectReady}
          />
          <NavItem
            icon={Link2}
            label="Softlinks"
            onClick={() => onJump?.('softlinks')}
            disabled={!projectReady}
          />
        </div>

        <div className="mb-2 mt-4 px-2 text-xs font-medium text-muted-foreground">Agent Cells</div>
        {!projectReady ? (
          <>
            <div className="mb-3 rounded-lg border border-dashed border-border px-3 py-3 text-[11px] text-muted-foreground">
              <div className="font-medium text-foreground">No project selected</div>
              <div className="mt-1">Choose a project directory to load Cells.</div>
              {projectError ? (
                <div className="mt-2 text-rose-300">{projectError}</div>
              ) : null}
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
          <div className="px-4 py-8 text-center text-xs text-muted-foreground">
            No active cells
          </div>
        ) : (
          <div className="space-y-2" data-testid="cell-list">
            {cells.map((cell) => {
              const cellSessions = resolveCellSessions(cell.id);
              const activeSessionId = activeSessionByCellId?.[cell.id] || null;
              const isCollapsed = collapsedCells.has(cell.id);
              const openSessions = cellSessions.filter((session) => {
                if (session.status === 'closed') {
                  return false;
                }
                if (session.status === 'detached') {
                  return session.id === activeSessionId;
                }
                return true;
              });
              const sortedSessions = openSessions;
              const hasOverflow = cellSessions.some(
                (session) => session.status === 'detached' || session.status === 'closed'
              );

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
                      selectedId === cell.id
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
                        selectedId === cell.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
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
                          className={statusColors[cell.state] || statusColors.draft}
                          fill="currentColor"
                        />
                      ) : null}
                    </div>
                  </div>

                  {!isCollapsed ? (
                    <div className="mt-1 space-y-0.5 pl-6">
                      {sortedSessions.map((session) => {
                      const isActive = session.id === activeSessionId;
                      const activityAt = resolveSessionActivity(cell.id, session);
                      const idleDuration = Number.isFinite(activityAt)
                        ? Math.max(0, idleNow - activityAt)
                        : null;
                      const idleLabel = idleDuration !== null ? formatIdleShort(idleDuration) : '—';
                      const isClosed = session.status === 'closed';
                      const isEditing =
                        editingSession?.cellId === cell.id &&
                        editingSession?.sessionId === session.id;
                      const statusPrefix =
                        session.status === 'detached'
                          ? 'Detached · '
                          : session.status === 'stale'
                            ? 'Stale · '
                            : '';

                      return (
                        <div
                          key={session.id}
                          className={`group relative flex w-full min-w-0 items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[11px] transition-all duration-200 select-none ${
                            isActive
                              ? 'bg-primary/10 text-foreground ring-1 ring-primary/20 shadow-sm'
                              : 'bg-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                          }`}
                          data-testid={`session-tab-${session.id}`}
                          data-active={isActive ? 'true' : 'false'}
                          onClick={() => onSelectSession?.(cell.id, session.id)}
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
                        >
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
                                onFocus={(e) => e.target.select()}
                              />
                            ) : (
                              <span className="truncate font-medium leading-none tracking-tight">
                                {session.name || session.id}
                              </span>
                            )}
                            
                            {!isEditing && (
                              <div className="flex items-center gap-1.5 opacity-60 transition-opacity group-hover:opacity-90">
                                <span className={`h-1 w-1 rounded-full ${
                                  session.status === 'detached' ? 'bg-amber-400/50' : 
                                  session.status === 'stale' ? 'bg-rose-400/50' : 
                                  isActive ? 'bg-emerald-400/50' : 'bg-slate-400/30'
                                }`} />
                                <span className="truncate text-[9px] font-medium tabular-nums tracking-wide">
                                  {idleLabel === '—' ? 'Active' : idleLabel}
                                </span>
                              </div>
                            )}
                          </div>

                          {!isEditing && (
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
                          )}
                        </div>
                      );
                      })}
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
        onSelectDetached={(session) => {
          if (closedMenu?.cellId) {
            onSelectSession?.(closedMenu.cellId, session.id);
          }
          setClosedMenu(null);
        }}
        onRestoreClosed={(session) => {
          if (closedMenu?.cellId) {
            const cell = cellsById.get(closedMenu.cellId) as any;
            if (cell) {
              onCreateSession?.(cell, { name: session.name || session.id });
            }
          }
          setClosedMenu(null);
        }}
      />

      <SessionContextMenu
        isOpen={Boolean(contextMenu && contextMenuSession)}
        position={contextMenu || { x: 0, y: 0 }}
        containerRef={contextMenuRef}
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
        onCreateProfile={(profile, action) => {
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
    </aside>
  );
}

function NavItem({ icon: Icon, label, onClick, disabled }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-[11px] transition-colors ${
        disabled
          ? 'cursor-not-allowed text-muted-foreground/50'
          : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
      }`}
    >
      <span className="flex items-center gap-1.5 truncate">
        <Icon size={14} strokeWidth={1.5} className="opacity-70" />
        <span className="truncate">{label}</span>
      </span>
      <ArrowUpRight size={12} strokeWidth={1.5} className={disabled ? 'opacity-30' : 'opacity-50'} />
    </button>
  );
}
