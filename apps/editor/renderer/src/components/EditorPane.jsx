import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MonitorPlay,
  ChevronRight,
  CheckCircle2,
  RefreshCw,
  RotateCcw,
  Layout,
  ChevronDown,
  ChevronUp,
  ZoomIn,
  ZoomOut,
  Clock,
} from 'lucide-react';
import { RiveAnimation } from './RiveAnimation.jsx';
import { GateList } from './GateList.jsx';
import { TerminalArea } from './TerminalArea.jsx';
import { AgentAvatarBadge } from './ui/AgentAvatarBadge.jsx';
import { AvatarPickerMenu } from './ui/AvatarPickerMenu.jsx';
import { resolveAvatarId } from '../utils/agentAvatar.js';
import { formatIdleClock } from '../utils/timeFormat.js';

export function EditorPane({
  cell,
  projectReady,
  projectError,
  terminalMode,
  terminalOpen,
  sessionId,
  sessionTargets,
  sessions,
  sessionLoading,
  sessionError,
  terminusBindings,
  gateResultsByStage,
  gatesCheckingByStage,
  gateDisplayStage,
  idleSince,
  terminalFontSize,
  isVisible,
  onRefreshSessions,
  onStateChange,
  onOpenTerminal,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  pendingCommand,
  onCommandSent,
  onSessionActivity,
  onSessionAttached,
  onSendSessionText,
  onSelectProject,
  onUpdateCellAvatar,
  onOpenWorkbenchFile,
  onJumpToSession,
  onJumpToMemo,
  activityDiffThreshold,
  onSelectionContext,
  onReplySelection,
}) {
  const [showGates, setShowGates] = useState(false);
  const [idleNow, setIdleNow] = useState(Date.now());
  const [avatarMenu, setAvatarMenu] = useState(null);
  const avatarButtonRef = useRef(null);
  const avatarMenuRef = useRef(null);
  const avatarId = resolveAvatarId(cell);
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
  const activeSession = useMemo(
    () => openSessions.find((session) => session.id === sessionId) || null,
    [openSessions, sessionId]
  );
  const openAvatarMenu = (target, rect) => {
    if (!rect) {
      return;
    }
    setAvatarMenu({ ...target, x: rect.left, y: rect.bottom + 6 });
  };

  useEffect(() => {
    if (!avatarMenu) {
      return undefined;
    }
    const handlePointer = (event) => {
      if (avatarMenuRef.current?.contains(event.target)) {
        return;
      }
      if (event.target?.closest?.('[data-avatar-picker-anchor="true"]')) {
        return;
      }
      setAvatarMenu(null);
    };
    window.addEventListener('mousedown', handlePointer);
    return () => window.removeEventListener('mousedown', handlePointer);
  }, [avatarMenu]);

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
            sessionTargets={sessionTargets}
            terminalOpen={terminalOpen}
            terminalMode={terminalMode}
            pendingCommand={pendingCommand}
            onCommandSent={onCommandSent}
            onSessionActivity={onSessionActivity}
            terminalFontSize={terminalFontSize}
            onSessionAttached={onSessionAttached}
            onSendSessionText={onSendSessionText}
            onOpenWorkbenchFile={onOpenWorkbenchFile}
            onSelectionContext={onSelectionContext}
            onReplySelection={onReplySelection}
            activityDiffThreshold={activityDiffThreshold}
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
  const idleMs = idleSince ? Math.max(0, idleNow - idleSince) : null;
  const isClosed = ['archived', 'closed'].includes(cell.state);
  const idleLabel = formatIdleClock(idleMs);
  const avatarRingClass = onUpdateCellAvatar
    ? 'bg-muted/30 hover:bg-muted/40'
    : 'bg-muted/10';

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
                          openAvatarMenu({ type: 'cell' }, rect);
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-full cursor-pointer"
                        title={onUpdateCellAvatar ? 'Edit avatar' : 'Avatar'}
                        data-avatar-picker-anchor="true"
                    >
                    <AgentAvatarBadge
                      avatarId={cell}
                      size={18}
                      ringSize={28}
                      idleMs={idleMs}
                      isClosed={isClosed}
                      className={avatarRingClass}
                    />
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
                <div className="flex min-w-0 flex-1">
                  <TerminalArea
                    cell={cell}
                    sessions={openSessions}
                    activeSessionId={sessionId}
                    sessionTargets={sessionTargets}
                    terminalOpen={terminalOpen}
                    terminalMode={terminalMode}
                    pendingCommand={pendingCommand}
                    onCommandSent={onCommandSent}
                    onSessionActivity={onSessionActivity}
                    onSendSessionText={onSendSessionText}
                    onOpenWorkbenchFile={onOpenWorkbenchFile}
                    onSelectionContext={onSelectionContext}
                    onReplySelection={onReplySelection}
                    activityDiffThreshold={activityDiffThreshold}
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

             {avatarMenu ? (
                <AvatarPickerMenu
                  isOpen={Boolean(avatarMenu)}
                  position={avatarMenu}
                  containerRef={avatarMenuRef}
                  selectedId={avatarId}
                  title="Select Agent Avatar"
                  onSelect={(id) => {
                    onUpdateCellAvatar?.(id);
                    setAvatarMenu(null);
                  }}
                />
             ) : null}

        </div>
    </main>
  );
}
