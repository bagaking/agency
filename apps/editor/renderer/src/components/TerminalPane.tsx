import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, MessageSquarePlus, RefreshCw, Send, StickyNote } from 'lucide-react';
import {
  attachTerminal,
  ensureInputListener,
  ensureStarted,
  ensureTerminalEntry,
} from '../terminal/terminalManager';
import {
  buildShortcutIndex,
  dispatchTerminalAction,
  matchShortcutBinding,
} from '../terminal/terminalInputDispatcher';
import {
  createHilItem,
  logRuntime,
  onTerminalData,
  onTerminalError,
  onTerminalDetached,
  resizeTerminal,
  setSessionInteractive,
  setSessionMouse,
  writeTerminal,
} from '../services/agencyBridge';
import {
  getCachedSessionMapPreview,
  primeSessionMapPreview,
} from '../services/sessionMapPreviewCache';
import { AgentAvatarBadge } from './ui/AgentAvatarBadge';
import { resolveAvatarId } from '../utils/agentAvatar';
import { normalizeLineEndingsToLf } from '../utils/lineEndings';
import {
  DEFAULT_ACTIVITY_DIFF_THRESHOLD,
  resolveActivityDiffThreshold,
} from '../utils/terminalActivityDiff';
import { normalizeTerminalSelectionText } from '../utils/terminalSelection';
import { PREVIEW_LINES } from './sessionMap/sessionMapConstants';
import { useTerminalRuntimeEffect } from './terminal/useTerminalRuntimeEffect';

function TerminalPane({
  cell,
  sessionId,
  mode,
  pendingCommand,
  onCommandSent,
  onActivity,
  onSessionAttached,
  fontSize,
  isVisible,
  isActive,
  shortcutBindings,
  sessionTargets,
  onSendSessionText,
  onOpenWorkbenchFile,
  onSelectionContext,
  onReplySelection,
  activityDiffThreshold,
}: any) {
  const containerRef = useRef(null);
  const entryRef = useRef(null);
  const terminalRef = useRef(null);
  const fitRef = useRef(null);
  const commandQueueRef = useRef([]);
  const lastQueuedRef = useRef(null);
  const lastResizeRef = useRef({ width: 0, height: 0, cols: 0, rows: 0 });
  const lastOutputAtRef = useRef(0);
  const deferredResizeRef = useRef(null);
  const resizeLogRef = useRef({});
  const resizeHandlerRef = useRef(null);
  const focusHandlerRef = useRef(null);
  const resizeAttemptsRef = useRef(0);
  const activationWarnedRef = useRef(false);
  const isActiveRef = useRef(isActive);
  const bindingIndexRef = useRef(new Map());
  const dispatchRef = useRef(null);
  const pasteTrackerRef = useRef(0);
  const sessionReadyRef = useRef(false);
  const selectionTextRef = useRef('');
  const lastSelectionRef = useRef({
    text: '',
    position: null,
    site: '',
    timeTag: '',
    updatedAt: 0,
  });
  const selectionContextRef = useRef(null);
  const linkProviderRef = useRef(null);
  const activitySnapshotRef = useRef('');
  const activityFrameRef = useRef(null);
  const writeBatchRef = useRef<string[]>([]);
  const writeBatchFrameRef = useRef<number | null>(null);
  const activityThresholdRef = useRef(DEFAULT_ACTIVITY_DIFF_THRESHOLD);
  const pointerDownRef = useRef(null);
  const mouseOverrideRef = useRef({
    lastEnabled: null,
  });
  const selectionOverrideRef = useRef(false);
  const selectionMouseLockRef = useRef(false);
  const selectionActivationTimerRef = useRef(null);
  const actionBarRef = useRef(null);
  const actionMenuRef = useRef(null);
  const memoSavingRef = useRef(false);
  const selectionServicePatchedRef = useRef(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [sessionReady, setSessionReady] = useState(false);
  const [previewData, setPreviewData] = useState('');
  const [selectionText, setSelectionText] = useState('');
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const cellId = cell?.id;
  const worktreePath = cell?.worktreePath;
  const sendTargets = useMemo(() => {
    const list = Array.isArray(sessionTargets) ? sessionTargets : [];
    return list
      .filter((target) => target && target.cellId && target.sessionId)
      .filter((target) => !(target.cellId === cellId && target.sessionId === sessionId))
      .sort((a, b) => {
        const left = `${a.cellName || a.cellId} ${a.sessionName || a.sessionId}`;
        const right = `${b.cellName || b.cellId} ${b.sessionName || b.sessionId}`;
        return left.localeCompare(right);
      });
  }, [cellId, sessionId, sessionTargets]);
  const showSelectionActions = Boolean(isActive && selectionText);
  const hasSendTargets = sendTargets.length > 0;
  const selectionCount = selectionText ? selectionText.length : 0;
  const selectionCountLabel = selectionCount > 999 ? '999+' : `${selectionCount}`;
  const handleReplySelection = () => {
    const selection = selectionTextRef.current || selectionText;
    if (!selection) {
      return;
    }
    onReplySelection?.(selectionContextRef.current);
  };

  const handleCreateMemo = async () => {
    const selection = selectionTextRef.current || selectionText;
    const trimmed = selection.trim();
    if (!trimmed || !worktreePath || !cellId || !sessionId) {
      return;
    }
    if (memoSavingRef.current) {
      return;
    }
    memoSavingRef.current = true;
    const context = selectionContextRef.current || {};
    const targetMeta =
      (Array.isArray(sessionTargets)
        ? sessionTargets.find(
            (target) => target?.cellId === cellId && target?.sessionId === sessionId
          )
        : null) || {};
    try {
      await createHilItem({
        worktreePath,
        kind: 'memo',
        body: trimmed,
        meta: {
          noteType: 'flash',
          source: 'terminal-selection',
          selection: {
            text: selection,
            site: context.site || '',
            timeTag: context.timeTag || '',
          },
          session: {
            cellId,
            cellName: targetMeta.cellName || cell?.name || '',
            sessionId,
            sessionName: targetMeta.sessionName || sessionId,
          },
        },
      });
    } catch (error) {
      logRuntime({
        level: 'warn',
        message: 'terminal selection memo failed',
        meta: {
          cellId,
          sessionId,
          error: error?.message || String(error),
        },
      });
    } finally {
      memoSavingRef.current = false;
    }
  };

  const handleToggleSendMenu = () => {
    if (!hasSendTargets) {
      return;
    }
    setActionMenuOpen((current) => !current);
  };

  const handleSendSelection = (target) => {
    const selection = selectionTextRef.current || selectionText;
    if (!selection || !target?.cellId || !target?.sessionId) {
      return;
    }
    onSendSessionText?.({
      cellId: target.cellId,
      sessionId: target.sessionId,
      text: normalizeTerminalSelectionText(selection),
    });
    setActionMenuOpen(false);
  };

  const sendCommand = (payload) => {
    const command = typeof payload === 'string' ? payload : payload?.command;
    const appendEnter = typeof payload === 'string' ? true : payload?.appendEnter !== false;
    const doubleEnter = typeof payload === 'string' ? false : payload?.doubleEnter === true;
    if (!command || !cellId) {
      return;
    }
    const text = String(command).replace(/\r\n/g, '\n');
    writeTerminal({ cellId, sessionId, data: text });
    const enterCount = (appendEnter ? 1 : 0) + (doubleEnter ? 1 : 0);
    for (let i = 0; i < enterCount; i += 1) {
      writeTerminal({ cellId, sessionId, data: '\r' });
    }
    if (onCommandSent) {
      onCommandSent({ cellId, command, appendEnter, doubleEnter });
    }
  };

  useEffect(() => {
    bindingIndexRef.current = buildShortcutIndex(shortcutBindings || []);
  }, [shortcutBindings]);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    activityThresholdRef.current = resolveActivityDiffThreshold(activityDiffThreshold);
  }, [activityDiffThreshold]);

  useEffect(() => {
    if (!isActive) {
      selectionTextRef.current = '';
      setSelectionText('');
      setActionMenuOpen(false);
    }
  }, [isActive, sessionId]);

  useEffect(() => {
    if (!selectionText) {
      setActionMenuOpen(false);
    }
  }, [selectionText]);

  useEffect(() => {
    if (!actionMenuOpen) {
      return undefined;
    }
    const handlePointer = (event) => {
      if (actionMenuRef.current?.contains(event.target)) {
        return;
      }
      if (actionBarRef.current?.contains(event.target)) {
        return;
      }
      setActionMenuOpen(false);
    };
    window.addEventListener('mousedown', handlePointer);
    return () => window.removeEventListener('mousedown', handlePointer);
  }, [actionMenuOpen]);

  useEffect(() => {
    dispatchRef.current = (action) =>
      dispatchTerminalAction({
        action,
        cellId,
        sessionId,
        worktreePath,
        onActivity,
        logRuntime,
        pasteTracker: pasteTrackerRef,
      });
  }, [cellId, sessionId, worktreePath, onActivity]);

  useEffect(() => {
    if (!cellId || !sessionId || !worktreePath) {
      return undefined;
    }
    setSessionInteractive({ cellId, sessionId, worktreePath, active: Boolean(isActive) });
    return () => {
      setSessionInteractive({ cellId, sessionId, worktreePath, active: false });
    };
  }, [cellId, sessionId, worktreePath, isActive]);

  useEffect(() => {
    if (!cellId || !sessionId) {
      return undefined;
    }
    const unsubscribe = onTerminalDetached?.((payload) => {
      if (!payload || payload.cellId !== cellId || payload.sessionId !== sessionId) {
        return;
      }
      if (entryRef.current) {
        entryRef.current.started = false;
        entryRef.current.starting = null;
      }
      setSessionReady(false);
    });
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [cellId, sessionId]);

  useEffect(() => {
    sessionReadyRef.current = sessionReady;
    if (terminalRef.current) {
      terminalRef.current.options.disableStdin = !sessionReady;
    }
  }, [sessionReady]);

  useEffect(() => {
    if (!sessionReady || !worktreePath || !sessionId) {
      return;
    }
    if (selectionActivationTimerRef.current) {
      clearTimeout(selectionActivationTimerRef.current);
      selectionActivationTimerRef.current = null;
    }
    mouseOverrideRef.current.lastEnabled = null;
    selectionOverrideRef.current = false;
    selectionMouseLockRef.current = false;
    setSessionMouse({ worktreePath, sessionId, enabled: true }).catch(() => undefined);
    mouseOverrideRef.current.lastEnabled = true;
  }, [sessionReady, worktreePath, sessionId]);

  useTerminalRuntimeEffect({
    cell,
    cellId,
    sessionId,
    worktreePath,
    fontSize,
    mode,
    onOpenWorkbenchFile,
    onSelectionContext,
    onActivity,
    containerRef,
    entryRef,
    terminalRef,
    fitRef,
    commandQueueRef,
    lastQueuedRef,
    lastResizeRef,
    lastOutputAtRef,
    deferredResizeRef,
    resizeLogRef,
    resizeHandlerRef,
    focusHandlerRef,
    resizeAttemptsRef,
    isActiveRef,
    bindingIndexRef,
    dispatchRef,
    sessionReadyRef,
    selectionTextRef,
    lastSelectionRef,
    selectionContextRef,
    linkProviderRef,
    activitySnapshotRef,
    activityFrameRef,
    writeBatchRef,
    writeBatchFrameRef,
    activityThresholdRef,
    pointerDownRef,
    mouseOverrideRef,
    selectionOverrideRef,
    selectionMouseLockRef,
    selectionActivationTimerRef,
    selectionServicePatchedRef,
    setSessionReady,
    setErrorMessage,
    setSelectionText,
    ensureTerminalEntry,
    attachTerminal,
    ensureInputListener,
    matchShortcutBinding,
    PREVIEW_LINES,
    writeTerminal,
    resizeTerminal,
    logRuntime,
    onTerminalDataSubscribe: onTerminalData,
    onTerminalErrorSubscribe: onTerminalError,
    setSessionMouse,
  });


  useEffect(() => {
    if (!cellId || !sessionId || !worktreePath || !isActive || sessionReady) {
      if (sessionReady) {
        setPreviewData('');
      }
      return undefined;
    }
    let canceled = false;
    const cached = getCachedSessionMapPreview({ worktreePath, cellId, sessionId });
    if (cached?.data) {
      setPreviewData(normalizeLineEndingsToLf(cached.data));
    } else {
      setPreviewData('');
    }
    primeSessionMapPreview({
      worktreePath,
      cellId,
      sessionId,
      lines: PREVIEW_LINES,
      cacheOnly: true,
    })
      .then((result) => {
        if (canceled) {
          return;
        }
        if (result?.data) {
          setPreviewData(normalizeLineEndingsToLf(result.data));
        }
      })
      .catch(() => {});
    return () => {
      canceled = true;
    };
  }, [cellId, sessionId, worktreePath, isActive, sessionReady]);

  useEffect(() => {
    if (!entryRef.current || !isActive || !cellId || !sessionId || !worktreePath) {
      return undefined;
    }
    let canceled = false;
    ensureStarted({
      entry: entryRef.current,
      payload: {
        cellId,
        sessionId,
        worktreePath,
        mode,
      },
    })
      .then((result) => {
        if (canceled) {
          return;
        }
        setSessionReady(result.started);
        if (result.didStart) {
          setTimeout(() => resizeHandlerRef.current?.(true, 'post-start'), 60);
          if (onSessionAttached) {
            onSessionAttached({ cellId, sessionId });
          }
          if (commandQueueRef.current.length) {
            const queue = [...commandQueueRef.current];
            commandQueueRef.current = [];
            queue.forEach((item) => sendCommand(item));
          }
        }
      })
      .catch((error) => {
        if (!canceled) {
          setErrorMessage(error?.message || 'Terminal failed to start.');
          logRuntime({
            level: 'error',
            message: 'terminal start failed',
            meta: {
              cellId,
              sessionId,
              mode,
              error: error?.message || String(error),
            },
          });
          console.error(error);
        }
      });
    return () => {
      canceled = true;
    };
  }, [isActive, cellId, sessionId, worktreePath, mode]);

  useEffect(() => {
    if (!pendingCommand || !cellId || !isActive || pendingCommand.cellId !== cellId) {
      return;
    }
    if (pendingCommand.sessionId && pendingCommand.sessionId !== sessionId) {
      return;
    }
    const commandKey = `${pendingCommand.command ?? ''}::${pendingCommand.appendEnter !== false ? '1' : '0'}::${
      pendingCommand.doubleEnter ? '1' : '0'
    }`;
    if (commandKey === lastQueuedRef.current) {
      return;
    }
    lastQueuedRef.current = commandKey;
    if (sessionReady) {
      sendCommand(pendingCommand);
    } else {
      commandQueueRef.current.push({
        command: pendingCommand.command,
        appendEnter: pendingCommand.appendEnter,
        doubleEnter: pendingCommand.doubleEnter,
      });
    }
  }, [pendingCommand, sessionReady, cellId, sessionId, isActive]);

  useEffect(() => {
    if (!terminalRef.current || !fontSize) {
      return;
    }
    const nextFontSize = Number(fontSize);
    if (!Number.isFinite(nextFontSize) || nextFontSize <= 0) {
      return;
    }
    if (terminalRef.current.options.fontSize === nextFontSize) {
      return;
    }
    terminalRef.current.options.fontSize = nextFontSize;
    terminalRef.current.refresh(0, terminalRef.current.rows - 1);
    resizeHandlerRef.current?.(true, 'font-size');
  }, [fontSize]);

  useEffect(() => {
    if (!isVisible || !isActive || !terminalRef.current) {
      return;
    }
    requestAnimationFrame(() => {
      terminalRef.current?.refresh(0, terminalRef.current.rows - 1);
      resizeHandlerRef.current?.(true, 'visible');
      focusHandlerRef.current?.();
    });
  }, [isVisible, isActive]);

  useEffect(() => {
    if (!sessionReady || !isVisible || !isActive) {
      return undefined;
    }
    if (!terminalRef.current || !resizeHandlerRef.current) {
      if (!activationWarnedRef.current) {
        activationWarnedRef.current = true;
        logRuntime({
          level: 'warn',
          message: 'terminal activation refresh skipped',
          meta: { cellId, sessionId },
        });
      }
      return undefined;
    }
    let frame = null;
    const timeout = setTimeout(() => {
      resizeHandlerRef.current?.(true, 'visibility-stabilize');
    }, 120);
    frame = requestAnimationFrame(() => {
      terminalRef.current?.refresh(0, terminalRef.current.rows - 1);
      resizeHandlerRef.current?.(true, 'visibility-refresh');
    });
    return () => {
      clearTimeout(timeout);
      if (frame) {
        cancelAnimationFrame(frame);
      }
    };
  }, [sessionReady, isVisible, isActive, cellId, sessionId]);

  const showConnecting = isActive && !sessionReady;
  const showPreview = showConnecting && Boolean(previewData);

  if (errorMessage) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-amber-200">
        {errorMessage}
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {showSelectionActions ? (
        <div className="pointer-events-none absolute inset-0 z-20">
          <div
            ref={actionBarRef}
            className="pointer-events-auto absolute right-4 top-4 flex items-center gap-1 rounded-xl border border-border/40 bg-popover/90 px-2 py-1.5 text-[10px] text-foreground shadow-lg backdrop-blur-md transition-all hover:bg-popover/95"
          >
            <div className="flex flex-col px-1">
              <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/40">
                Selected
              </span>
              <span className="text-[10px] font-medium text-foreground/90 font-mono">
                {selectionCountLabel}
              </span>
            </div>
            <div className="h-4 w-px bg-border/40" />
            <button
              type="button"
              onClick={handleReplySelection}
              className="group flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors hover:bg-primary/10 hover:text-primary text-muted-foreground"
            >
              <MessageSquarePlus size={11} className="text-primary/70 group-hover:text-primary transition-colors" />
              <span>Reply</span>
            </button>
            <button
              type="button"
              onClick={handleCreateMemo}
              className="group flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors hover:bg-muted/40 hover:text-foreground text-muted-foreground"
            >
              <StickyNote size={11} className="text-muted-foreground/70 group-hover:text-foreground transition-colors" />
              <span>Record</span>
            </button>
            <button
              type="button"
              onClick={handleToggleSendMenu}
              disabled={!hasSendTargets}
              className="group flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors hover:bg-muted/40 hover:text-foreground text-muted-foreground disabled:opacity-40"
            >
              <Send size={11} className="text-muted-foreground/70 group-hover:text-foreground transition-colors" />
              <span>Send</span>
              <ChevronDown size={10} className="opacity-50" />
            </button>
          </div>
          {actionMenuOpen ? (
            <div
              ref={actionMenuRef}
              className="pointer-events-auto absolute right-4 top-[3.5rem] w-64 max-h-64 overflow-y-auto rounded-xl border border-border/60 bg-popover/95 py-1 text-[11px] shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
            >
              <div className="px-2 py-1.5 border-b border-border/10 mb-1">
                <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">
                  Send To Session
                </div>
              </div>
              {hasSendTargets ? (
                sendTargets.map((target) => (
                  <button
                    key={`${target.cellId}:${target.sessionId}`}
                    type="button"
                    onClick={() => handleSendSelection(target)}
                    className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-muted-foreground transition-colors hover:bg-muted/20 hover:text-foreground"
                  >
                    <AgentAvatarBadge
                      avatarId={resolveAvatarId(target.avatar || target.sessionId || target.cellId)}
                      size={14}
                      showRing={false}
                    />
                    <span className="flex-1 truncate opacity-80">
                      {target.cellName || target.cellId} / {target.sessionName || target.sessionId}
                    </span>
                    <span className="text-[8px] uppercase tracking-wider text-muted-foreground/40 font-medium">
                      {target.status}
                    </span>
                  </button>
                ))
              ) : (
                <div className="px-3 py-4 text-center">
                  <div className="text-[10px] text-muted-foreground/50">No active sessions</div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
      {showPreview ? (
        <div className="absolute inset-0 overflow-auto no-scrollbar bg-black/60 text-[11px] text-slate-200/80 font-mono">
          <pre className="min-h-full w-full whitespace-pre-wrap px-4 py-3 leading-relaxed">
            {previewData}
          </pre>
        </div>
      ) : null}
      {showConnecting ? (
        <div className="pointer-events-none absolute inset-x-0 top-2 flex items-center justify-center">
          <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-black/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary/80">
            <RefreshCw size={12} className="animate-spin" />
            <span>Connecting</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default TerminalPane;
