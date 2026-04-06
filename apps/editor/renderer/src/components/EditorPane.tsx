import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MonitorPlay,
  ChevronRight,
  RefreshCw,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Clock3,
  Trash2,
  Unplug,
  PencilLine,
  Check,
  X,
} from 'lucide-react';
import { RiveAnimation } from './RiveAnimation';
import { TerminalArea } from './TerminalArea';
import { AgentAvatarBadge } from './ui/AgentAvatarBadge';
import { AvatarPickerMenu } from './ui/AvatarPickerMenu';
import { resolveAvatarId } from '../utils/agentAvatar';
import { formatIdleClock } from '../utils/timeFormat';
import { projectAgentCellSessionTree } from '../utils/agentCellSessionTree';
import { resolveCellBranchMeta } from './agentCells/cellPresentation';

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
  onCreateSession,
  terminusBindings,
  gateResultsByStage,
  gatesCheckingByStage,
  gateDisplayStage,
  idleSince,
  terminalFontSize,
  isVisible,
  onRefreshSessions,
  onStateChange,
  onTurnGateCreate,
  onTurnGateExecute,
  onOpenTerminal,
  onArchiveCell,
  onClearCellAttachment,
  onDeleteCell,
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
  onRenameSession,
  onOpenWorkbenchFile,
  onJumpToSession,
  activityDiffThreshold,
  onSelectionContext,
  onReplySelection,
}: any) {
  const [idleNow, setIdleNow] = useState(Date.now());
  const [avatarMenu, setAvatarMenu] = useState(null);
  const [isRenamingSession, setIsRenamingSession] = useState(false);
  const [draftSessionName, setDraftSessionName] = useState('');
  const avatarButtonRef = useRef(null);
  const avatarMenuRef = useRef(null);
  const sessionNameInputRef = useRef<HTMLInputElement | null>(null);
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
  const sessionProjection = useMemo(
    () => projectAgentCellSessionTree({ sessions, activeSessionId: activeSession?.id || null }),
    [activeSession?.id, sessions]
  );
  const activeSessionPath = useMemo(
    () => {
      const activeId = String(activeSession?.id || '').trim();
      if (!activeId) {
        return [];
      }
      const activeRow = sessionProjection.rowsById[activeId];
      if (!activeRow) {
        return activeSession ? [activeSession] : [];
      }
      return [...activeRow.ancestorSessionIds, activeRow.id]
        .map((sessionId) => sessionProjection.rowsById[sessionId]?.session)
        .filter(Boolean);
    },
    [activeSession, sessionProjection]
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

  useEffect(() => {
    setIsRenamingSession(false);
    setDraftSessionName(activeSession?.name || activeSession?.id || '');
  }, [activeSession?.id, activeSession?.name]);

  useEffect(() => {
    if (!isRenamingSession) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      sessionNameInputRef.current?.focus();
      sessionNameInputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isRenamingSession]);

  const handleStartSessionRename = useCallback(() => {
    if (!activeSession) {
      return;
    }
    setDraftSessionName(activeSession.name || activeSession.id || '');
    setIsRenamingSession(true);
  }, [activeSession]);
  const handleCancelSessionRename = useCallback(() => {
    setDraftSessionName(activeSession?.name || activeSession?.id || '');
    setIsRenamingSession(false);
  }, [activeSession?.id, activeSession?.name]);
  const handleConfirmSessionRename = useCallback(() => {
    const nextName = String(draftSessionName || '').trim();
    if (!nextName || !activeSession?.id || !cell?.id || !onRenameSession) {
      handleCancelSessionRename();
      return;
    }
    onRenameSession(activeSession.id, nextName, cell.id);
    setIsRenamingSession(false);
  }, [activeSession?.id, cell?.id, draftSessionName, handleCancelSessionRename, onRenameSession]);

  const assetBase =
    (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';

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
            onCreateSession={undefined}
            shortcutBindings={terminusBindings}
          />
        </div>
      </main>
    );
  }

  const idleMs = idleSince ? Math.max(0, idleNow - idleSince) : null;
  const isClosed = ['archived', 'closed'].includes(cell.state);
  const idleLabel = formatIdleClock(idleMs);
  const attachmentState = String(cell?.attachmentState || 'attached').trim().toLowerCase();
  const attachmentTone =
    attachmentState === 'missing'
      ? 'border-rose-400/30 bg-rose-500/10 text-rose-200'
      : attachmentState === 'detached'
        ? 'border-amber-300/25 bg-amber-500/10 text-amber-100'
        : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200';
  const attachmentLabel =
    attachmentState === 'missing'
      ? 'Missing worktree'
      : attachmentState === 'detached'
        ? 'Detached worktree'
        : 'Attached worktree';
  const attachmentPath = cell?.lastKnownWorktreePath || cell?.worktreePath || '';
  const branchMeta = resolveCellBranchMeta(cell);
  const avatarRingClass = onUpdateCellAvatar
    ? 'bg-muted/30 hover:bg-muted/40'
    : 'bg-muted/10';

  return (
    <main className="flex h-full flex-1 flex-col bg-background overflow-hidden">
      <header className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-4">
        <div className="flex min-w-0 items-center gap-2.5 text-xs text-foreground">
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

          <div className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border/50 bg-muted/10 px-2.5 py-1 text-[10px] font-semibold text-foreground">
            <span>{cell.name}</span>
            {branchMeta.label ? (
              <>
                <span className="text-muted-foreground/40">•</span>
                <span
                  className={`font-mono text-[9px] ${
                    branchMeta.isDetachedHead ? 'text-amber-100/82' : 'text-muted-foreground'
                  }`}
                  title={branchMeta.title || undefined}
                >
                  {branchMeta.label}
                </span>
              </>
            ) : null}
          </div>

          <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
            {activeSessionPath.length ? (
              activeSessionPath.map((session, index) => {
                const isActivePathItem = session.id === activeSession?.id;
                return (
                  <React.Fragment key={session.id}>
                    {index > 0 ? (
                      <ChevronRight size={12} className="shrink-0 text-muted-foreground/40" />
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onJumpToSession?.(cell.id, session.id)}
                      className={`min-w-0 rounded-full px-2 py-1 text-[10px] transition-colors ${
                        isActivePathItem
                          ? 'bg-primary/12 text-primary'
                          : 'text-muted-foreground hover:bg-muted/10 hover:text-foreground'
                      }`}
                      title={session.name || session.id}
                    >
                      <span className="truncate">{session.name || session.id}</span>
                    </button>
                  </React.Fragment>
                );
              })
            ) : (
              <span className="text-[10px] text-muted-foreground">No active session</span>
            )}
            {activeSession && onRenameSession ? (
              isRenamingSession ? (
                <div className="flex items-center gap-1 rounded-full border border-border/50 bg-muted/10 px-1.5 py-1">
                  <input
                    ref={sessionNameInputRef}
                    value={draftSessionName}
                    onChange={(event) => setDraftSessionName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        handleConfirmSessionRename();
                      }
                      if (event.key === 'Escape') {
                        event.preventDefault();
                        handleCancelSessionRename();
                      }
                    }}
                    className="w-32 border-0 bg-transparent px-1 text-[10px] text-foreground outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleConfirmSessionRename}
                    className="rounded p-1 text-emerald-300 transition-colors hover:bg-emerald-500/10 hover:text-emerald-200"
                    title="Save session name"
                  >
                    <Check size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelSessionRename}
                    className="rounded p-1 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
                    title="Cancel rename"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleStartSessionRename}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/10 hover:text-foreground"
                  title="Rename active session"
                >
                  <PencilLine size={12} />
                </button>
              )
            ) : null}
          </div>

          {attachmentState !== 'attached' ? (
            <span
              className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] ${attachmentTone}`}
              title={attachmentPath || attachmentLabel}
            >
              <span>{attachmentLabel}</span>
            </span>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-background/50 px-2.5 py-1 text-[10px] font-medium text-foreground">
            <Clock3 size={11} className="text-primary" />
            <span className="text-muted-foreground">Idle</span>
            <span className="tabular-nums text-foreground">{idleLabel}</span>
          </div>
          <div className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-background/50 px-1.5 py-1">
            <span className="px-1 text-[10px] font-medium text-muted-foreground">Text {terminalFontSize}</span>
            <button
              onClick={onZoomOut}
              className="rounded-full p-1.5 text-muted-foreground transition-all hover:bg-white/5 hover:text-foreground"
              title="Decrease terminal text size"
            >
              <ZoomOut size={12} />
            </button>
            <button
              onClick={onZoomIn}
              className="rounded-full p-1.5 text-muted-foreground transition-all hover:bg-white/5 hover:text-foreground"
              title="Increase terminal text size"
            >
              <ZoomIn size={12} />
            </button>
            <button
              onClick={onZoomReset}
              className="rounded-full p-1.5 text-muted-foreground transition-all hover:bg-white/5 hover:text-foreground"
              title="Reset terminal text size"
            >
              <RotateCcw size={12} />
            </button>
          </div>
          <button
            onClick={onRefreshSessions}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-background/50 px-2.5 py-1 text-[10px] font-medium text-muted-foreground transition-all hover:text-foreground"
            data-testid="refresh-sessions"
            title="Refresh session state"
          >
            <RefreshCw size={11} className={sessionLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          {attachmentState !== 'attached' ? (
            <div className="flex items-center gap-1.5">
              {onClearCellAttachment ? (
                <button
                  type="button"
                  onClick={onClearCellAttachment}
                  className="flex items-center gap-1.5 rounded px-2 py-1 text-[10px] font-medium text-amber-100 transition-colors hover:bg-amber-500/10"
                  title="Clear stale attachment metadata from this Cell record"
                >
                  <Unplug size={12} />
                  <span>Clear Attachment</span>
                </button>
              ) : null}
              {onDeleteCell ? (
                <button
                  type="button"
                  onClick={onDeleteCell}
                  className="flex items-center gap-1.5 rounded px-2 py-1 text-[10px] font-medium text-rose-200 transition-colors hover:bg-rose-500/10"
                  title="Delete this detached Cell"
                >
                  <Trash2 size={12} />
                  <span>Delete Cell</span>
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </header>

      <div className="flex-1 flex flex-col min-h-0 bg-black/20">
        {attachmentState !== 'attached' ? (
          <div className="flex min-h-0 flex-1 items-start justify-center overflow-y-auto px-6 py-6">
            <div className="w-full max-w-[960px] rounded-[28px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(24,28,36,0.92),rgba(12,15,20,0.97))] p-6 shadow-[0_28px_64px_-28px_rgba(0,0,0,0.72)]">
              <div className="flex items-start justify-between gap-6">
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-100/62">
                    Detached Workspace
                  </div>
                  <div className="mt-2 text-[24px] font-semibold tracking-[-0.04em] text-foreground">
                    {cell.name}
                  </div>
                  <div className="mt-3 max-w-[64ch] text-[13px] leading-6 text-muted-foreground">
                    This Cell remains tracked even though its worktree is {attachmentLabel.toLowerCase()}.
                    Runtime evidence and session history stay available here while you decide whether to archive the Cell, clear stale attachment metadata, or remove the record.
                  </div>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] ${attachmentTone}`}
                  title={attachmentPath || attachmentLabel}
                >
                  <span>{attachmentLabel}</span>
                </span>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.65fr)]">
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground/58">
                    Attachment Record
                  </div>
                  <div className="mt-3 text-[12px] text-foreground/86">
                    <div className="font-medium text-foreground">Last known path</div>
                    <div className="mt-1 break-all font-mono text-[11px] text-muted-foreground/78">
                      {attachmentPath || 'No worktree path recorded'}
                    </div>
                  </div>
                  <div className="mt-4 text-[12px] text-foreground/86">
                    <div className="font-medium text-foreground">Retained sessions</div>
                    <div className="mt-2 space-y-2">
                      {Array.isArray(sessions) && sessions.length > 0 ? (
                        sessions.map((session: any) => (
                          <div
                            key={session.id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-black/18 px-3 py-2"
                          >
                            <div className="min-w-0">
                              <div className="truncate text-[11px] font-medium text-foreground">
                                {session.name || session.id}
                              </div>
                              <div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/68">
                                {session.status || 'unknown'}
                              </div>
                            </div>
                            {onJumpToSession ? (
                              <button
                                type="button"
                                onClick={() => onJumpToSession?.(cell.id, session.id)}
                                className="shrink-0 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-foreground transition-colors hover:bg-white/[0.06]"
                              >
                                Inspect
                              </button>
                            ) : null}
                          </div>
                        ))
                      ) : (
                        <div className="rounded-xl border border-dashed border-white/[0.08] bg-black/12 px-3 py-3 text-[11px] text-muted-foreground">
                          No retained sessions recorded for this Cell.
                        </div>
                      )}
                    </div>
                  </div>
                  {onJumpToSession ? (
                    <div className="mt-4 rounded-xl border border-white/[0.06] bg-black/12 px-3 py-2 text-[10px] leading-5 text-muted-foreground/72">
                      Select a retained session to inspect reply and run evidence from the existing shell-side surfaces.
                    </div>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-white/[0.08] bg-black/18 p-4">
                  <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground/58">
                    Workspace Actions
                  </div>
                  <div className="mt-3 flex flex-col gap-2">
                    {onArchiveCell ? (
                      <button
                        type="button"
                        onClick={() => onArchiveCell?.(cell)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300/24 bg-amber-500/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-100 transition-colors hover:bg-amber-500/16"
                      >
                        Archive Cell
                      </button>
                    ) : null}
                    {onClearCellAttachment ? (
                      <button
                        type="button"
                        onClick={() => onClearCellAttachment?.(cell)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground transition-colors hover:bg-white/[0.06]"
                      >
                        Clear Attachment
                      </button>
                    ) : null}
                    {onDeleteCell ? (
                      <button
                        type="button"
                        onClick={() => onDeleteCell?.(cell)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-300/20 bg-rose-500/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-100 transition-colors hover:bg-rose-500/16"
                      >
                        Delete Cell
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
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
                onCreateSession={onCreateSession}
                shortcutBindings={terminusBindings}
              />
            </div>
          </div>
        )}

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
