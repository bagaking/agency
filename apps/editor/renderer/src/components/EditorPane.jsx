import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  MonitorPlay,
  ChevronRight,
  CheckCircle2,
  Plus,
  RefreshCw,
  X,
  RotateCcw,
  MoreHorizontal,
  Layout,
  ChevronDown,
  ChevronUp,
  ZoomIn,
  ZoomOut,
  Clock,
  Pencil,
} from 'lucide-react';
import { RiveAnimation } from './RiveAnimation.jsx';
import { GateList } from './GateList.jsx';
import { TerminalArea } from './TerminalArea.jsx';
import { SessionContextMenu, SessionCreateMenu, SessionOverflowMenu } from './SessionMenus.jsx';
import { AgentAvatar } from './ui/AgentAvatar.jsx';
import { AVATAR_IDS, resolveAvatarId } from '../utils/agentAvatar.js';

export function EditorPane({
  cell,
  projectReady,
  projectError,
  terminalMode,
  terminalOpen,
  sessionId,
  sessions,
  sessionLoading,
  sessionError,
  terminusProfiles,
  terminusBindings,
  tmuxStatus,
  gateResultsByStage,
  gatesCheckingByStage,
  gateDisplayStage,
  idleSince,
  terminalFontSize,
  isVisible,
  onCreateSession,
  onRefreshSessions,
  onSelectSession,
  onCloseSession,
  onDetachSession,
  onRenameSession,
  onStateChange,
  onOpenTerminal,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onDispatchCommand,
  pendingCommand,
  onCommandSent,
  onSessionActivity,
  onSessionAttached,
  onSelectProject,
  onUpdateCellAvatar,
}) {
  const [closedMenu, setClosedMenu] = useState(null);
  const [showGates, setShowGates] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editingSessionName, setEditingSessionName] = useState('');
  const closedMenuRef = useRef(null);
  const closedMenuButtonRef = useRef(null);
  const contextMenuRef = useRef(null);
  const createMenuRef = useRef(null);
  const createMenuButtonRef = useRef(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [createMenu, setCreateMenu] = useState(null);
  const [idleNow, setIdleNow] = useState(Date.now());
  const [avatarMenu, setAvatarMenu] = useState(null);
  const avatarButtonRef = useRef(null);
  const avatarMenuRef = useRef(null);
  
  const openSessions = useMemo(
    () =>
      (sessions || []).filter((session) => {
        if (session.status === 'closed') {
          return false;
        }
        if (session.status === 'detached') {
          return session.id === sessionId;
        }
        return true;
      }),
    [sessions, sessionId]
  );
  const detachedSessions = useMemo(
    () => (sessions || []).filter((session) => session.status === 'detached'),
    [sessions]
  );
  const closedSessions = useMemo(
    () => (sessions || []).filter((session) => session.status === 'closed'),
    [sessions]
  );
  const avatarId = resolveAvatarId(cell);

  useEffect(() => {
    if (!avatarMenu) {
      return undefined;
    }
    const handlePointer = (event) => {
      if (avatarMenuRef.current?.contains(event.target)) {
        return;
      }
      if (avatarButtonRef.current?.contains(event.target)) {
        return;
      }
      setAvatarMenu(null);
    };
    window.addEventListener('mousedown', handlePointer);
    return () => window.removeEventListener('mousedown', handlePointer);
  }, [avatarMenu]);

  useEffect(() => {
    if (!closedMenu) {
      return undefined;
    }
    const handleClick = (event) => {
      if (!closedMenuRef.current || closedMenuRef.current.contains(event.target)) {
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
      if (!contextMenuRef.current || contextMenuRef.current.contains(event.target)) {
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
      if (createMenuButtonRef.current?.contains(event.target)) {
        return;
      }
      setCreateMenu(null);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [createMenu]);

  const beginRenameSession = (session) => {
    if (!session) {
      return;
    }
    setEditingSessionId(session.id);
    setEditingSessionName(session.name || session.id);
  };

  const cancelRenameSession = () => {
    setEditingSessionId(null);
    setEditingSessionName('');
  };

  const commitRenameSession = () => {
    if (!editingSessionId) {
      return;
    }
    const nextName = editingSessionName.trim();
    if (nextName) {
      onRenameSession?.(editingSessionId, nextName);
    }
    cancelRenameSession();
  };

  useEffect(() => {
    if (!isVisible) {
      return undefined;
    }
    setIdleNow(Date.now());
    const interval = setInterval(() => setIdleNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isVisible]);

  const assetBase = import.meta.env.BASE_URL || '/';

  if (!cell) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-background text-muted-foreground">
        <div className="h-32 w-32 mb-4 opacity-50">
          <RiveAnimation
            src={`${assetBase}assets/animations/empty-state.riv`}
            className="w-full h-full"
            fallback={<MonitorPlay size={64} className="w-full h-full p-4 opacity-20" />}
          />
        </div>
        <p className="text-sm">
          {projectReady ? 'Select an agent to view details' : 'Select a project to begin'}
        </p>
        {!projectReady ? (
          <>
            {projectError ? <p className="mt-2 text-xs text-rose-300">{projectError}</p> : null}
            <button
              type="button"
              onClick={onSelectProject}
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary/40 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-primary transition-colors hover:bg-primary/10"
            >
              Select Project
            </button>
          </>
        ) : null}
      </div>
    );
  }

  if (cell.isVirtual) {
    return (
      <main className="flex h-full flex-1 flex-col bg-background overflow-hidden">
        <header className="flex h-10 shrink-0 items-center justify-between border-b border-border bg-background px-4">
          <div className="flex items-center gap-2 text-xs text-foreground">
            <span className="text-primary font-bold tracking-tight">AGENCY</span>
            <ChevronRight size={12} className="text-muted-foreground/50" />
            <span className="font-semibold">{cell.name}</span>
          </div>
          <button
            type="button"
            onClick={onSelectProject}
            className="text-[10px] font-semibold uppercase tracking-widest text-primary hover:text-primary/80"
          >
            Select Project
          </button>
        </header>
        <div className="flex-1 overflow-hidden">
          <TerminalArea
            cell={cell}
            sessions={sessions}
            activeSessionId={sessionId}
            terminalOpen={terminalOpen}
            terminalMode={terminalMode}
            pendingCommand={pendingCommand}
            onCommandSent={onCommandSent}
            onSessionActivity={onSessionActivity}
            terminalFontSize={terminalFontSize}
            onSessionAttached={onSessionAttached}
            isVisible={isVisible}
            sessionLoading={sessionLoading}
            sessionError={sessionError}
            onOpenTerminal={onOpenTerminal}
            shortcutBindings={terminusBindings}
          />
        </div>
      </main>
    );
  }

  const activeStage = gateDisplayStage || 'active';
  const gates = gateResultsByStage?.[activeStage] || cell.gates || [];
  const hasGateStatus = gates.length > 0;
  const failedGatesCount = gates.filter((gate) => !gate.passed).length;
  const isGateChecking = Boolean(gatesCheckingByStage?.[activeStage]);
  const idleMs = idleSince ? Math.max(0, idleNow - idleSince) : 0;
  const idleSeconds = Math.floor(idleMs / 1000);
  const idleHours = Math.floor(idleSeconds / 3600);
  const idleMinutes = Math.floor((idleSeconds % 3600) / 60);
  const idleRemaining = idleSeconds % 60;
  const idleLabel = idleHours
    ? `${idleHours}:${String(idleMinutes).padStart(2, '0')}:${String(idleRemaining).padStart(2, '0')}`
    : `${String(idleMinutes).padStart(2, '0')}:${String(idleRemaining).padStart(2, '0')}`;
  const contextTarget =
    contextMenu && sessions?.find((session) => session.id === contextMenu.sessionId);

  return (
    <main className="flex h-full flex-1 flex-col bg-background overflow-hidden">
        {/* Header */}
        <header className="flex h-10 shrink-0 items-center justify-between border-b border-border bg-background px-4">
            <div className="flex items-center gap-2 text-xs text-foreground">
                    <button
                        type="button"
                        ref={avatarButtonRef}
                        onClick={() => {
                          if (!onUpdateCellAvatar) {
                            return;
                          }
                          const rect = avatarButtonRef.current?.getBoundingClientRect();
                          if (!rect) {
                            return;
                          }
                          setAvatarMenu((current) =>
                            current ? null : { x: rect.left, y: rect.bottom + 6 }
                          );
                        }}
                        className={`flex h-7 w-7 items-center justify-center rounded-full border cursor-pointer ${
                          onUpdateCellAvatar
                            ? 'border-border/60 bg-muted/30 hover:border-primary/50 hover:bg-muted/40'
                            : 'border-border/30 bg-muted/10'
                        }`}
                        title={onUpdateCellAvatar ? 'Edit avatar' : 'Avatar'}
                    >
                    <AgentAvatar avatarId={avatarId} size={18} />
                </button>
                <span className="text-primary font-bold tracking-tight">AGENCY</span>
                <ChevronRight size={12} className="text-muted-foreground/50" />
                <span className="font-semibold">{cell.name}</span>
                <span className="text-muted-foreground/30 mx-1">/</span>
                <span className="font-mono text-[10px] text-muted-foreground opacity-70">{cell.branch}</span>
            </div>
            
            <div className="flex items-center gap-3">
                {/* Compact Lifecycle Stepper */}
                <div className="flex items-center gap-1.5 bg-muted/30 px-2 py-1 rounded-md border border-border/50">
                    {['draft', 'active', 'archived'].map((step, index, arr) => {
                        const isActive = cell.state === step || (step === 'active' && cell.state === 'paused');
                        const isPast = arr.indexOf(cell.state) > index || (cell.state === 'paused' && step === 'active');
                        const requiresGates = step === 'active' || step === 'archived';
                        const stepGates = gateResultsByStage?.[step] || [];
                        const stepFailures = stepGates.filter((gate) => !gate.passed).length;
                        const hasGateResults = stepGates.length > 0;
                        const blockTransition =
                          requiresGates && hasGateResults && stepFailures > 0 && step !== cell.state;
                        
                        let dotColor = 'bg-muted-foreground/30';
                        if (cell.state === step) {
                            dotColor = step === 'active' ? 'bg-emerald-400' : step === 'paused' ? 'bg-amber-400' : 'bg-primary';
                        } else if (isPast) {
                            dotColor = 'bg-primary/40';
                        }

                        return (
                            <button 
                                key={step} 
                                onClick={() => {
                                    if (blockTransition) {
                                        return;
                                    }
                                    onStateChange(step);
                                }}
                                disabled={blockTransition}
                                className={`flex items-center gap-1 group transition-all disabled:opacity-40 disabled:cursor-not-allowed`}
                                title={
                                    blockTransition
                                        ? `Resolve gates before switching to ${step}`
                                        : `Switch to ${step}`
                                }
                            >
                                <div className={`h-1.5 w-1.5 rounded-full ${dotColor} ${isActive ? 'ring-2 ring-primary/20 ring-offset-1 ring-offset-background' : ''}`} />
                                <span className={`text-[10px] capitalize transition-colors ${isActive ? 'text-foreground font-medium' : 'text-muted-foreground/60 group-hover:text-muted-foreground'}`}>
                                    {step === 'active' && cell.state === 'paused' ? 'paused' : step}
                                </span>
                                {index < arr.length - 1 && <div className="h-2 w-[1px] bg-border mx-1" />}
                            </button>
                        );
                    })}
                </div>

                <button 
                    onClick={() => setShowGates(!showGates)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                        failedGatesCount > 0 
                            ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20' 
                            : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                    }`}
                >
                    <Layout size={12} />
                    <span>
                      {isGateChecking
                        ? `Gates (${activeStage}: checking)`
                        : !hasGateStatus
                          ? `Gates (${activeStage}: not checked)`
                          : failedGatesCount > 0
                            ? `Gates (${activeStage}: ${failedGatesCount} failing)`
                            : `Gates (${activeStage}: all ok)`}
                    </span>
                    {showGates ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                </button>
            </div>
        </header>

        {/* Collapsible Lifecycle Gates */}
        {showGates && (
            <div className="shrink-0 border-b border-border bg-card/30 px-6 py-4 animate-slide-down">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <CheckCircle2 size={12} />
                        Compliance Checklist ({activeStage})
                    </h3>
                </div>
                <GateList gates={gates} />
                <p className="mt-3 text-[10px] text-muted-foreground italic bg-muted/20 p-2 rounded border border-border/50">
                    * Agents must satisfy all gates before transitioning to Active or Archived states.
                </p>
            </div>
        )}

        {/* Integrated Terminal Area */}
        <div className="flex-1 flex flex-col min-h-0 bg-black/20">
             {/* Toolbar */}
             <div className="flex shrink-0 flex-col border-b border-border/60 bg-muted/10">
                <div className="flex items-center justify-end gap-1.5 px-2 py-2">
                    <div className="flex items-center gap-1 border-r border-border/50 pr-2 mr-1 text-[10px] text-muted-foreground">
                        <Clock size={10} />
                        <span className="tabular-nums">Idle {idleLabel}</span>
                    </div>
                    <div className="flex items-center gap-1 border-l border-border/50 pl-2 ml-1">
                        <button
                            onClick={onZoomOut}
                            className="p-1.5 text-muted-foreground hover:text-foreground transition-all"
                            title="Zoom out"
                        >
                            <ZoomOut size={12} />
                        </button>
                        <span className="text-[10px] text-muted-foreground tabular-nums min-w-[20px] text-center">
                            {terminalFontSize}
                        </span>
                        <button
                            onClick={onZoomIn}
                            className="p-1.5 text-muted-foreground hover:text-foreground transition-all"
                            title="Zoom in"
                        >
                            <ZoomIn size={12} />
                        </button>
                        <button
                            onClick={onZoomReset}
                            className="p-1.5 text-muted-foreground hover:text-foreground transition-all"
                            title="Reset zoom"
                        >
                            <RotateCcw size={12} />
                        </button>
                    </div>
                    <button
                        onClick={onRefreshSessions}
                        className="p-1.5 text-muted-foreground hover:text-foreground transition-all active:rotate-180 duration-500"
                        data-testid="refresh-sessions"
                        title="Refresh sessions"
                    >
                        <RefreshCw size={12} className={sessionLoading ? 'animate-spin' : ''} />
                    </button>
                </div>
             </div>

             <div className="flex min-h-0 flex-1">
                <div className="flex w-44 shrink-0 flex-col border-r border-border/60 bg-black/30">
                    <div className="flex items-center justify-between gap-2 px-2 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      <span>Sessions</span>
                    <div className="flex items-center gap-1">
                        {(detachedSessions.length > 0 || closedSessions.length > 0) && (
                          <div className="relative">
                            <button
                                ref={closedMenuButtonRef}
                                onClick={() => {
                                    if (closedMenuButtonRef.current) {
                                        const rect = closedMenuButtonRef.current.getBoundingClientRect();
                                        setClosedMenu({
                                            x: rect.left,
                                            y: rect.bottom + 6,
                                        });
                                    } else {
                                        setClosedMenu((current) => (current ? null : { x: 0, y: 0 }));
                                    }
                                }}
                                className="p-1 text-muted-foreground hover:text-primary transition-colors"
                                title="Detached/closed sessions"
                            >
                                <MoreHorizontal size={12} />
                            </button>
                          </div>
                        )}
                        <button
                            ref={createMenuButtonRef}
                            onClick={() => {
                              const rect = createMenuButtonRef.current?.getBoundingClientRect();
                              if (!rect) {
                                return;
                              }
                              setCreateMenu((current) =>
                                current ? null : { x: rect.left, y: rect.bottom + 6 }
                              );
                            }}
                            className="p-1 text-muted-foreground hover:text-primary transition-all hover:scale-110 active:scale-95"
                            title="New Session"
                        >
                            <Plus size={12} />
                        </button>
                      </div>
                    </div>
                    <div
                      className={`grid flex-1 auto-rows-min gap-1 px-2 pb-2 overflow-y-auto no-scrollbar ${
                        openSessions.length > 8 ? 'grid-cols-2' : 'grid-cols-1'
                      }`}
                    >
                      {openSessions.map((session) => {
                        const isActive = session.id === sessionId;
                        const isEditing = editingSessionId === session.id;
                        const statusColor = session.status === 'active' ? 'bg-emerald-400' : 'bg-amber-400';

                        return (
                          <button
                            key={session.id}
                            type="button"
                            onClick={() => {
                              onSelectSession?.(session.id);
                              onOpenTerminal?.();
                            }}
                            onContextMenu={(event) => {
                                event.preventDefault();
                                setContextMenu({
                                    sessionId: session.id,
                                    x: event.clientX,
                                    y: event.clientY,
                                });
                            }}
                            className={`group flex min-w-0 items-center gap-2 rounded-md px-2 py-1 text-[11px] transition-all ${
                                isActive
                                    ? 'bg-black/50 text-foreground ring-1 ring-primary/40'
                                    : 'bg-transparent text-muted-foreground hover:bg-muted/20 hover:text-foreground'
                            }`}
                            data-testid={`session-tab-${session.id}`}
                            data-active={isActive ? 'true' : 'false'}
                            title={session.name || session.id}
                          >
                            <AgentAvatar
                              avatarId={resolveAvatarId({
                                avatar: session.avatar || avatarId,
                                id: session.id,
                                name: session.name,
                              })}
                              size={14}
                            />
                            <div className={`h-1.5 w-1.5 rounded-full ${statusColor} ${isActive ? 'ring-2 ring-emerald-400/20' : ''}`} />
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
                                  className="min-w-0 flex-1 rounded border border-border/40 bg-background/70 px-1 py-0.5 text-[11px] font-medium text-foreground focus:border-primary focus:outline-none"
                                  autoFocus
                              />
                            ) : (
                              <span className="min-w-0 flex-1 truncate font-medium">
                                  {session.name || session.id}
                              </span>
                            )}
                            {!isEditing && (
                              <button
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      beginRenameSession(session);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 hover:text-primary transition-all p-0.5 rounded-sm hover:bg-primary/10"
                                  title="Rename Session"
                              >
                                  <Pencil size={10} />
                              </button>
                            )}
                            <button
                                onClick={(e) => { e.stopPropagation(); onCloseSession?.(session.id); }}
                                className="opacity-0 group-hover:opacity-100 hover:text-rose-400 transition-all p-0.5 rounded-sm hover:bg-rose-500/10"
                                title="Terminate Session"
                            >
                                <X size={10} />
                            </button>
                          </button>
                        );
                      })}
                    </div>
                </div>
                <div className="flex min-w-0 flex-1">
                  <TerminalArea
                    cell={cell}
                    sessions={openSessions}
                    activeSessionId={sessionId}
                    terminalOpen={terminalOpen}
                    terminalMode={terminalMode}
                    pendingCommand={pendingCommand}
                    onCommandSent={onCommandSent}
                    onSessionActivity={onSessionActivity}
                    terminalFontSize={terminalFontSize}
                    onSessionAttached={onSessionAttached}
                    isVisible={isVisible}
                    sessionLoading={sessionLoading}
                    sessionError={sessionError}
                    onOpenTerminal={onOpenTerminal}
                    shortcutBindings={terminusBindings}
                  />
                </div>
             </div>

             <SessionOverflowMenu
                isOpen={Boolean(closedMenu)}
                position={closedMenu}
                containerRef={closedMenuRef}
                detachedSessions={detachedSessions}
                closedSessions={closedSessions}
                onSelectDetached={(session) => {
                  setClosedMenu(null);
                  onSelectSession?.(session.id);
                  onOpenTerminal?.();
                }}
                onRestoreClosed={(session) => {
                  setClosedMenu(null);
                  onCreateSession?.({ name: session.name || session.id });
                }}
             />

             <SessionContextMenu
                isOpen={Boolean(contextMenu && contextTarget)}
                position={contextMenu}
                containerRef={contextMenuRef}
                onDetach={() => {
                  setContextMenu(null);
                  onDetachSession?.(contextTarget.id);
                }}
                onRename={() => {
                  setContextMenu(null);
                  beginRenameSession(contextTarget);
                }}
             />

             <SessionCreateMenu
                isOpen={Boolean(createMenu)}
                position={createMenu || { x: 0, y: 0 }}
                containerRef={createMenuRef}
                profiles={terminusProfiles || []}
                onCreateBase={async () => {
                  setCreateMenu(null);
                  await onCreateSession?.();
                }}
                onCreateProfile={(profile) => {
                  setCreateMenu(null);
                  if (!profile?.startCommand) {
                    return;
                  }
                  onDispatchCommand?.({
                    command: profile.startCommand,
                    kind: 'start',
                    label: profile.label || profile.id,
                    profileId: profile.id,
                    appendEnter: true,
                  });
                }}
             />

             {avatarMenu ? (
                <div
                  ref={avatarMenuRef}
                  className="fixed z-[120] rounded-xl border border-white/10 bg-[#1a1d23]/95 p-2 text-[11px] shadow-[0_25px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
                  style={{ top: avatarMenu.y, left: avatarMenu.x }}
                >
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Avatar
                  </div>
                  <div className="mt-1 grid grid-cols-4 gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setAvatarMenu(null);
                        onUpdateCellAvatar?.(null);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-border/50 text-[10px] text-muted-foreground hover:border-primary/50 hover:text-primary"
                    >
                      Auto
                    </button>
                    {AVATAR_IDS.map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          setAvatarMenu(null);
                          onUpdateCellAvatar?.(id);
                        }}
                        className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
                          avatarId === id
                            ? 'border-primary/70 bg-primary/10'
                            : 'border-border/50 hover:border-primary/50'
                        }`}
                      >
                        <AgentAvatar avatarId={id} size={18} />
                      </button>
                    ))}
                  </div>
                </div>
             ) : null}

        </div>
    </main>
  );
}
