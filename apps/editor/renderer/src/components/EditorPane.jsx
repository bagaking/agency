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
  onCreateSession,
  onRefreshSessions,
  onSelectSession,
  onCloseSession,
  onStateChange,
  onOpenTerminal,
  onRunCommand,
  pendingCommand,
  onCommandSent,
}) {
  const tmuxAvailable = tmuxStatus?.available !== false;
  const [closedMenuOpen, setClosedMenuOpen] = useState(false);
  const closedMenuRef = useRef(null);
  const openSessions = useMemo(
    () => (sessions || []).filter((session) => session.status !== 'closed'),
    [sessions]
  );
  const closedSessions = useMemo(
    () => (sessions || []).filter((session) => session.status === 'closed'),
    [sessions]
  );

  useEffect(() => {
    if (!closedMenuOpen) {
      return undefined;
    }
    const handleClick = (event) => {
      if (!closedMenuRef.current || closedMenuRef.current.contains(event.target)) {
        return;
      }
      setClosedMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [closedMenuOpen]);

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

  return (
    <main className="flex h-full flex-1 flex-col bg-background overflow-hidden">
        {/* Header */}
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-background px-4">
            <div className="flex items-center gap-2 text-sm text-foreground">
                <span className="text-primary font-bold">AGENCY</span>
                <ChevronRight size={14} className="text-muted-foreground" />
                <span className="font-medium">{cell.name}</span>
                <span className="mx-2 text-muted-foreground/30">|</span>
                <span className="font-mono text-xs text-muted-foreground" title={cell.worktreePath}>{cell.branch}</span>
            </div>
            <div className="flex items-center gap-2">
                 {cell.validation?.warnings?.length > 0 && (
                    <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs text-amber-500" title={cell.validation.warnings.join('\n')}>
                        <AlertTriangle size={12} />
                        <span>Validation Warning</span>
                    </div>
                )}
            </div>
        </header>

        {/* Lifecycle Stepper (Compact) */}
        <div className="shrink-0 border-b border-border bg-card/30 px-6 py-3">
             <div className="flex items-center justify-center gap-4">
                {['draft', 'active', 'archived'].map((step, index, arr) => {
                    const isActive = cell.state === step || (step === 'active' && cell.state === 'paused');
                    const isPast = arr.indexOf(cell.state) > index || (cell.state === 'paused' && step === 'active');
                    // Simple logic: draft < active/paused < archived
                    // If current is 'paused', it counts as 'active' step for visual (or we add paused)
                    // Let's keep it simple: Draft -> Active -> Archived
                    
                    let stateColor = 'text-muted-foreground';
                    let icon = <Circle size={16} />;
                    
                    if (cell.state === step) {
                        stateColor = step === 'active' ? 'text-emerald-400' : step === 'paused' ? 'text-amber-400' : 'text-primary';
                        icon = <CheckCircle2 size={16} className={stateColor} />;
                    } else if (isPast) { // crude approximation
                        stateColor = 'text-primary/60';
                         icon = <CheckCircle2 size={16} className={stateColor} />;
                    }

                    return (
                        <div key={step} className="flex items-center gap-2 cursor-pointer" onClick={() => onStateChange(step)}>
                            <div className={`flex items-center gap-2 ${cell.state === step ? 'font-bold ' + stateColor : 'text-muted-foreground'}`}>
                                {icon}
                                <span className="capitalize text-xs">{step === 'active' && cell.state === 'paused' ? 'Paused' : step}</span>
                            </div>
                            {index < arr.length - 1 && (
                                <div className="h-px w-12 bg-border" />
                            )}
                        </div>
                    );
                })}
             </div>
        </div>

        {/* Lifecycle Gates */}
        <div className="shrink-0 border-b border-border bg-card/20 px-6 py-3">
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Lifecycle Gates
                </h3>
                <span className="text-[10px] uppercase text-muted-foreground">v0.2 temporary</span>
            </div>
            <div className="mt-3">
                <GateList gates={cell.gates} />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
                Active/Archived transitions require all gates to pass.
            </p>
        </div>

        {/* Sessions */}
        <div className="shrink-0 border-b border-border bg-card/10 px-6 py-3">
            <div className="flex items-center justify-between gap-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Sessions
                </h3>
                <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onRefreshSessions}
                      disabled={!tmuxAvailable}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RefreshCw size={12} />
                      Refresh
                    </button>
                    <button
                      type="button"
                      onClick={() => onCreateSession?.()}
                      disabled={!tmuxAvailable}
                      className="flex items-center gap-1 rounded-sm border border-border px-2 py-1 text-xs text-muted-foreground hover:border-primary/60 hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus size={12} />
                      New
                    </button>
                    {closedSessions.length ? (
                      <div className="relative" ref={closedMenuRef}>
                        <button
                          type="button"
                          onClick={() => setClosedMenuOpen((current) => !current)}
                          className="flex items-center justify-center rounded-sm border border-border px-2 py-1 text-xs text-muted-foreground hover:border-primary/60 hover:text-primary"
                          title="Closed sessions"
                        >
                          <MoreHorizontal size={14} />
                        </button>
                        {closedMenuOpen ? (
                          <div className="absolute right-0 mt-2 w-52 rounded-md border border-border bg-popover py-1 text-xs text-foreground shadow-lg">
                            <div className="px-3 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                              Closed
                            </div>
                            {closedSessions.map((session) => (
                              <button
                                key={session.id}
                                type="button"
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                                onClick={() => {
                                  setClosedMenuOpen(false);
                                  onCreateSession?.({ name: session.name || session.id });
                                }}
                              >
                                <Circle size={8} className="text-muted-foreground" fill="currentColor" />
                                <span className="flex-1 truncate">{session.name || session.id}</span>
                                <span className="text-[10px] uppercase tracking-wide">Reopen</span>
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                </div>
            </div>
            {!tmuxAvailable ? (
              <div className="mt-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-200">
                tmux is required. Install with: <span className="font-mono">brew install tmux</span>
              </div>
            ) : null}
            {sessionError ? (
              <div className="mt-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-200">
                {sessionError}
              </div>
            ) : null}
            {sessionLoading ? (
              <div className="mt-2 text-xs text-muted-foreground">Loading sessions...</div>
            ) : (
              <div className="mt-3">
                {openSessions.length ? (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {openSessions.map((session) => {
                      const isActive = session.id === sessionId;
                      const statusColor =
                        session.status === 'active'
                          ? 'text-emerald-400'
                          : session.status === 'stale'
                            ? 'text-amber-400'
                            : 'text-muted-foreground';
                      const handleSelect = () => onSelectSession?.(session.id);
                      return (
                        <div
                          key={session.id}
                          role="button"
                          tabIndex={0}
                          onClick={handleSelect}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              handleSelect();
                            }
                          }}
                          className={`group flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors cursor-pointer ${
                            isActive
                              ? 'border-primary/40 bg-primary/10 text-foreground'
                              : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                          }`}
                        >
                          <Circle size={8} className={statusColor} fill="currentColor" />
                          <span className="max-w-[140px] truncate">
                            {session.name || session.id}
                          </span>
                          {session.status === 'stale' ? (
                            <span className="text-[10px] uppercase tracking-wide text-amber-200">
                              stale
                            </span>
                          ) : null}
                          <span className="ml-1 flex items-center">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                onCloseSession?.(session.id);
                              }}
                              className={`text-muted-foreground transition-opacity hover:text-foreground ${
                                isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                              }`}
                              title="Close session"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">No sessions yet.</div>
                )}
              </div>
            )}
        </div>

        {/* Main Content: Terminal */}
        <div className="flex-1 flex flex-col min-h-0 p-4">
             <div className="flex items-center justify-between mb-2 shrink-0">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <TerminalSquare size={14} />
                    Terminal Session
                </h2>
                <div className="flex gap-2">
                     <button 
                        onClick={onOpenTerminal}
                        className="text-xs flex items-center gap-1.5 rounded-sm bg-primary/10 px-2 py-1 text-primary hover:bg-primary/20 transition-colors"
                    >
                        <Play size={10} />
                        Open Shell
                     </button>
                     <div className="hidden items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground md:flex">
                        Quick
                     </div>
                     <div className="flex items-center gap-1">
                        {quickActions && quickActions.length ? (
                          quickActions.map((action) => (
                            <div key={action.id} className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  onRunCommand?.({
                                    command: action.startCommand || '',
                                    kind: 'start',
                                    label: action.label || action.id,
                                  })
                                }
                                className="rounded-sm border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:border-primary/60 hover:text-primary transition-colors"
                                disabled={!action.startCommand}
                                title={action.startCommand || 'Start command not set'}
                              >
                                {action.label || action.id}
                              </button>
                              {action.resumeCommand ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onRunCommand?.({
                                      command: action.resumeCommand,
                                      kind: 'resume',
                                      label: action.label || action.id,
                                    })
                                  }
                                  className="rounded-sm border border-border px-1.5 py-1 text-[11px] text-muted-foreground hover:border-primary/60 hover:text-primary transition-colors"
                                  title="Resume"
                                >
                                  <RotateCcw size={12} />
                                </button>
                              ) : null}
                            </div>
                          ))
                        ) : (
                          <span className="text-[11px] text-muted-foreground">No quick actions</span>
                        )}
                     </div>
                </div>
             </div>
             <div className="flex-1 rounded-lg border border-border bg-black/95 overflow-hidden shadow-inner relative">
                {terminalOpen && sessionId ? (
                    <TerminalPane
                      key={`${cell.id}:${sessionId || 'none'}`}
                      cell={cell}
                      sessionId={sessionId}
                      mode={terminalMode}
                      pendingCommand={pendingCommand}
                      onCommandSent={onCommandSent}
                    />
                ) : (
                        <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                        <p className="text-sm">{terminalOpen ? 'Select a session to connect' : 'Terminal Idle'}</p>
                        <button onClick={onOpenTerminal} className="mt-2 text-xs underline hover:text-primary">Connect</button>
                    </div>
                )}
             </div>
        </div>
    </main>
  );
}
