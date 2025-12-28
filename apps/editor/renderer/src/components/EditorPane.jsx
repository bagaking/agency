import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  TerminalSquare,
  AlertTriangle,
  MonitorPlay,
  ChevronRight,
  CheckCircle2,
  Circle,
  Play,
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
import TerminalPane from './TerminalPane.jsx';
import { RiveAnimation } from './RiveAnimation.jsx';
import { GateList } from './GateList.jsx';

export function EditorPane({
  cell,
  terminalMode,
  terminalOpen,
  sessionId,
  sessions,
  sessionLoading,
  sessionError,
  quickActions,
  tmuxStatus,
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
  onRunCommand,
  pendingCommand,
  onCommandSent,
  onSessionActivity,
  onSessionAttached,
}) {
  const [closedMenu, setClosedMenu] = useState(null);
  const [showGates, setShowGates] = useState(false);
  const closedMenuRef = useRef(null);
  const closedMenuButtonRef = useRef(null);
  const contextMenuRef = useRef(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [idleNow, setIdleNow] = useState(Date.now());
  
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
    if (!isVisible) {
      return undefined;
    }
    setIdleNow(Date.now());
    const interval = setInterval(() => setIdleNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isVisible]);

  if (!cell) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-background text-muted-foreground">
        <div className="h-32 w-32 mb-4 opacity-50">
             <RiveAnimation 
                src="/assets/animations/empty-state.riv"
                animations="Timeline 1"
                className="w-full h-full"
                fallback={<MonitorPlay size={64} className="w-full h-full p-4 opacity-20" />}
             />
        </div>
        <p>Select an agent to view details</p>
      </div>
    );
  }

  const gates = cell.gates || [];
  const failedGatesCount = gates.filter((gate) => !gate.passed).length;
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
                        const blockTransition = requiresGates && failedGatesCount > 0 && step !== cell.state;
                        
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
                    <span>Gates {failedGatesCount > 0 ? `(${failedGatesCount} failing)` : '(All OK)'}</span>
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
                        Compliance Checklist
                    </h3>
                </div>
                <GateList gates={cell.gates} />
                <p className="mt-3 text-[10px] text-muted-foreground italic bg-muted/20 p-2 rounded border border-border/50">
                    * Agents must satisfy all gates before transitioning to Active or Archived states.
                </p>
            </div>
        )}

        {/* Integrated Terminal Area */}
        <div className="flex-1 flex flex-col min-h-0 bg-black/20">
             {/* Toolbar / Tab Bar */}
             <div className="flex h-9 shrink-0 items-center justify-between border-b border-border/60 bg-muted/10 px-2 gap-4">
                <div className="flex items-center gap-1 flex-1 overflow-x-auto overflow-y-visible no-scrollbar">
                    {openSessions.map((session) => {
                        const isActive = session.id === sessionId;
                        const statusColor = session.status === 'active' ? 'bg-emerald-400' : 'bg-amber-400';
                        
                        return (
                            <div
                                key={session.id}
                                onClick={() => onSelectSession?.(session.id)}
                                onContextMenu={(event) => {
                                    event.preventDefault();
                                    setContextMenu({
                                        sessionId: session.id,
                                        x: event.clientX,
                                        y: event.clientY,
                                    });
                                }}
                                className={`group flex items-center gap-2 px-3 py-1 text-[11px] rounded-t-md border-x border-t transition-all cursor-pointer h-full animate-tab-in ${
                                    isActive
                                        ? 'bg-black/40 border-border/80 text-foreground active-tab-glow'
                                        : 'bg-transparent border-transparent text-muted-foreground hover:bg-muted/20'
                                }`}
                            >
                                <div className={`h-1.5 w-1.5 rounded-full ${statusColor} ${isActive ? 'ring-2 ring-emerald-400/20' : ''}`} />
                                <span className="max-w-[120px] truncate font-medium">
                                    {session.name || session.id}
                                </span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const nextName = window.prompt('Rename session', session.name || session.id);
                                        if (nextName && nextName.trim()) {
                                            onRenameSession?.(session.id, nextName.trim());
                                        }
                                    }}
                                    className="opacity-0 group-hover:opacity-100 hover:text-primary transition-all p-0.5 rounded-sm hover:bg-primary/10"
                                    title="Rename Session"
                                >
                                    <Pencil size={10} />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onCloseSession?.(session.id); }}
                                    className={`opacity-0 group-hover:opacity-100 hover:text-rose-400 transition-all p-0.5 rounded-sm hover:bg-rose-500/10`}
                                    title="Terminate Session"
                                >
                                    <X size={10} />
                                </button>
                            </div>
                        );
                    })}
                    <button
                        onClick={() => onCreateSession?.()}
                        className="p-1.5 text-muted-foreground hover:text-primary transition-all hover:scale-110 active:scale-95"
                        title="New Session"
                    >
                        <Plus size={14} />
                    </button>
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
                                className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
                            >
                                <MoreHorizontal size={14} />
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0 px-2">
                    <div className="flex items-center gap-1 border-r border-border/50 pr-2 mr-1 text-[10px] text-muted-foreground">
                        <Clock size={10} />
                        <span className="tabular-nums">Idle {idleLabel}</span>
                    </div>
                    <div className="flex items-center gap-1 border-r border-border/50 pr-2 mr-1">
                        {quickActions && quickActions.slice(0, 3).map((action) => (
                            <button
                                key={action.id}
                                onClick={() => onRunCommand?.({ command: action.startCommand || '', kind: 'start', label: action.label || action.id })}
                                className="px-2 py-0.5 rounded border border-border/40 bg-muted/20 text-[10px] text-muted-foreground hover:border-primary/50 hover:text-primary transition-all whitespace-nowrap active:scale-95"
                            >
                                {action.label || action.id}
                            </button>
                        ))}
                    </div>
                    <button 
                        onClick={onOpenTerminal}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-primary text-[10px] font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm shadow-primary/20 active:scale-95"
                    >
                        <Play size={10} fill="currentColor" />
                        SHELL
                    </button>
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
                    <button onClick={onRefreshSessions} className="p-1.5 text-muted-foreground hover:text-foreground transition-all active:rotate-180 duration-500">
                        <RefreshCw size={12} className={sessionLoading ? 'animate-spin' : ''} />
                    </button>
                </div>
             </div>

             {closedMenu ? (
                <div
                    ref={closedMenuRef}
                    className="fixed z-[60] w-48 rounded-md border border-border bg-popover py-1 shadow-xl text-[11px]"
                    style={{ top: closedMenu.y, left: closedMenu.x }}
                >
                    {detachedSessions.length > 0 && (
                        <>
                            <div className="px-2 py-1 text-[10px] uppercase font-bold text-muted-foreground">Detached Sessions</div>
                            {detachedSessions.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => {
                                        setClosedMenu(null);
                                        onSelectSession?.(s.id);
                                        onOpenTerminal?.();
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-muted text-muted-foreground hover:text-foreground truncate transition-colors"
                                >
                                    {s.name || s.id}
                                </button>
                            ))}
                        </>
                    )}
                    {closedSessions.length > 0 && (
                        <>
                            <div className="px-2 py-1 text-[10px] uppercase font-bold text-muted-foreground">Closed Sessions</div>
                            {closedSessions.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => {
                                        setClosedMenu(null);
                                        onCreateSession?.({ name: s.name || s.id });
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-muted text-muted-foreground hover:text-foreground truncate transition-colors"
                                >
                                    {s.name || s.id}
                                </button>
                            ))}
                        </>
                    )}
                </div>
             ) : null}

             {contextMenu && contextTarget ? (
                <div
                    ref={contextMenuRef}
                    className="fixed z-[60] w-44 rounded-md border border-border bg-popover py-1 shadow-xl text-[11px]"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                >
                    <button
                        onClick={() => {
                            setContextMenu(null);
                            onDetachSession?.(contextTarget.id);
                        }}
                        className="w-full text-left px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                        Detach Session
                    </button>
                    <button
                        onClick={() => {
                            setContextMenu(null);
                            const nextName = window.prompt('Rename session', contextTarget.name || contextTarget.id);
                            if (nextName && nextName.trim()) {
                                onRenameSession?.(contextTarget.id, nextName.trim());
                            }
                        }}
                        className="w-full text-left px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                        Rename Session
                    </button>
                </div>
             ) : null}

             <div className="flex-1 overflow-hidden relative bg-black/20">
                {terminalOpen && sessionId ? (
                    <>
                        <TerminalPane
                          key={`${cell.id}:${sessionId || 'none'}`}
                          cell={cell}
                          sessionId={sessionId}
                          mode={terminalMode}
                          pendingCommand={pendingCommand}
                          onCommandSent={onCommandSent}
                          onActivity={onSessionActivity}
                          fontSize={terminalFontSize}
                          onSessionAttached={onSessionAttached}
                          isVisible={isVisible}
                        />
                        {sessionLoading ? (
                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
                                 <div className="h-24 w-24 opacity-60">
                                    <RiveAnimation 
                                        src="/assets/animations/loading.riv"
                                        animations="Idle"
                                        className="w-full h-full"
                                        fallback={<RefreshCw size={32} className="animate-spin text-primary/40" />}
                                    />
                                 </div>
                                 <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-primary/60">Establishing Connection</p>
                            </div>
                        ) : null}
                    </>
                ) : (
                    <div className="flex h-full flex-col items-center justify-center text-muted-foreground bg-black/40 backdrop-blur-sm">
                        <div className="mb-4 opacity-20 hover:opacity-40 transition-opacity duration-700">
                            <RiveAnimation 
                                src="/assets/animations/terminal-idle.riv"
                                animations="Idle"
                                className="w-16 h-16"
                                fallback={<TerminalSquare size={48} />}
                            />
                        </div>
                        <p className="text-xs font-medium tracking-wide">No active terminal session</p>
                        <button onClick={onOpenTerminal} className="mt-3 text-[10px] font-bold text-primary px-5 py-2 border border-primary/30 rounded-full hover:bg-primary/10 transition-all active:scale-95 hover:border-primary">
                            SPAWN AGENT SHELL
                        </button>
                    </div>
                )}
             </div>
             
             {sessionError && (
                <div className="absolute bottom-4 right-4 max-w-xs rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[10px] text-rose-300 backdrop-blur-md shadow-lg flex items-start gap-2">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <span>{sessionError}</span>
                </div>
             )}
        </div>
    </main>
  );
}
