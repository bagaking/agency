import { useEffect } from 'react';

import { attachTerminalInputHandlers } from './terminalInputHandlers';
import { registerTerminalPathLinkProvider } from './terminalPathLinkProvider';
import { attachTerminalResizeController } from './terminalResizeController';
import { createTerminalSelectionMouseController } from './terminalSelectionMouseController';
import {
  buildTerminalSelectionSite,
  formatTerminalSelectionTime,
  writeSelectionToClipboard,
} from '../../utils/terminalSelection';
import { countDiffChars, getBufferSnapshot } from '../../utils/terminalActivityDiff';

export const useTerminalRuntimeEffect = (runtime: any) => {
  const {
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
    onTerminalDataSubscribe,
    onTerminalErrorSubscribe,
    setSessionMouse,
  } = runtime;

  useEffect(() => {
    if (!cellId || !sessionId || !containerRef.current || !worktreePath) {
      return undefined;
    }
    commandQueueRef.current = [];
    lastQueuedRef.current = null;
    resizeAttemptsRef.current = 0;

    const entry = ensureTerminalEntry({ cellId, sessionId, fontSize });
    entryRef.current = entry;
    terminalRef.current = entry?.terminal || null;
    fitRef.current = entry?.fitAddon || null;

    if (!entry) {
      return undefined;
    }

    attachTerminal({ entry, container: containerRef.current });
    if (!selectionServicePatchedRef.current) {
      const selectionService = entry?.terminal?._core?._selectionService;
      if (selectionService && typeof selectionService.shouldForceSelection === 'function') {
        // xterm.js only forces selection on Shift/Option; we extend to Command on macOS.
        if (!selectionService._agencyOriginalShouldForceSelection) {
          selectionService._agencyOriginalShouldForceSelection =
            selectionService.shouldForceSelection.bind(selectionService);
        }
        selectionService.shouldForceSelection = (event) => {
          if (event?.metaKey) {
            return true;
          }
          if (selectionService._agencyOriginalShouldForceSelection) {
            return selectionService._agencyOriginalShouldForceSelection(event);
          }
          return Boolean(event?.shiftKey || event?.altKey);
        };
        selectionServicePatchedRef.current = true;
      }
    }
    ensureInputListener({
      entry,
      onInput: (data) => {
        if (!sessionReadyRef.current) {
          return;
        }
        writeTerminal({ cellId, sessionId, data });
      },
    });

    setSessionReady(entry.started);
    setErrorMessage('');
    activitySnapshotRef.current = '';
    if (activityFrameRef.current) {
      cancelAnimationFrame(activityFrameRef.current);
      activityFrameRef.current = null;
    }

    if (linkProviderRef.current?.dispose) {
      linkProviderRef.current.dispose();
    }
    linkProviderRef.current = registerTerminalPathLinkProvider({
      terminal: entry.terminal,
      cellId,
      worktreePath,
      onOpenWorkbenchFile,
    });

    const detachResizeController = attachTerminalResizeController({
      cellId,
      sessionId,
      mode,
      containerRef,
      terminalRef,
      fitRef,
      lastOutputAtRef,
      lastResizeRef,
      deferredResizeRef,
      resizeLogRef,
      resizeAttemptsRef,
      resizeHandlerRef,
      focusHandlerRef,
      isActiveRef,
      resizeTerminal,
      logRuntime,
    });

    const selectionMouseController = createTerminalSelectionMouseController({
      terminalRef,
      selectionTextRef,
      pointerDownRef,
      mouseOverrideRef,
      selectionOverrideRef,
      selectionMouseLockRef,
      selectionActivationTimerRef,
      setSessionMouse,
      worktreePath,
      sessionId,
    });

    const bufferDisposable = entry.terminal.onBufferChange?.(() => {
      selectionMouseController.ensureTmuxMouseOn();
    });
    selectionMouseController.ensureTmuxMouseOn();

    containerRef.current.addEventListener('mousedown', selectionMouseController.handlePointerDown);
    window.addEventListener('mouseup', selectionMouseController.handlePointerUp);

    attachTerminalInputHandlers({
      entry,
      terminalRef,
      sessionReadyRef,
      selectionTextRef,
      bindingIndexRef,
      dispatchRef,
      cellId,
      sessionId,
      writeTerminal,
      matchShortcutBinding,
      writeSelectionToClipboard,
      logRuntime,
    });

    const selectionDisposable = entry.terminal.onSelectionChange(() => {
      if (!isActiveRef.current) {
        return;
      }
      const selection = entry.terminal?.getSelection?.() || '';
      const isAlternate = entry.terminal?.buffer?.active?.type === 'alternate';
      if (!selection) {
        selectionMouseController.clearSelectionActivationTimer();
        selectionTextRef.current = '';
        setSelectionText('');
        lastSelectionRef.current = {
          text: '',
          position: null,
          site: '',
          timeTag: '',
          updatedAt: Date.now(),
        };
        selectionOverrideRef.current = false;
        selectionMouseLockRef.current = false;
        if (!isAlternate) {
          selectionMouseController.ensureTmuxMouseOn();
        }
        return;
      }
      if (!isAlternate) {
        selectionMouseController.clearSelectionActivationTimer();
        selectionMouseLockRef.current = true;
        selectionMouseController.setTmuxMouseEnabled(false, { force: true });
      }
      const position = entry.terminal?.getSelectionPosition?.() || null;
      const updatedAt = Date.now();
      const rawSite = buildTerminalSelectionSite(entry.terminal, position);
      const site = rawSite || `\`${selection}\``;
      const timeTag = formatTerminalSelectionTime(updatedAt);
      selectionTextRef.current = selection;
      lastSelectionRef.current = {
        text: selection,
        position,
        site,
        timeTag,
        updatedAt,
      };
      selectionContextRef.current = {
        text: selection,
        site,
        timeTag,
        updatedAt,
        cellId,
        sessionId,
      };
      onSelectionContext?.({
        text: selection,
        site,
        timeTag,
        updatedAt,
        cellId,
        sessionId,
      });
      setSelectionText(selection);
    });

    const handleContextMenu = (event) => {
      const selection = entry.terminal?.getSelection?.() || '';
      if (!selection) {
        return;
      }
      event.preventDefault();
      writeSelectionToClipboard(selection).catch((error) => {
        logRuntime({
          level: 'warn',
          message: 'terminal copy failed',
          meta: {
            cellId,
            sessionId,
            error: error?.message || String(error),
          },
        });
      });
    };

    const contextMenuTargets = [entry.terminal.element, containerRef.current].filter(Boolean);
    contextMenuTargets.forEach((target) => {
      target.addEventListener('contextmenu', handleContextMenu);
    });

    const scheduleActivityCheck = () => {
      if (activityFrameRef.current) {
        return;
      }
      activityFrameRef.current = requestAnimationFrame(() => {
        activityFrameRef.current = null;
        const snapshot = getBufferSnapshot(entry.terminal, PREVIEW_LINES);
        const previous = activitySnapshotRef.current || '';
        const threshold = activityThresholdRef.current;
        if (!snapshot && !previous) {
          return;
        }
        activitySnapshotRef.current = snapshot;
        if (countDiffChars(previous, snapshot, threshold) >= threshold) {
          onActivity?.({ cellId, sessionId });
        }
      });
    };

    const unsubscribe = onTerminalDataSubscribe((payload) => {
      if (payload?.cellId === cellId && payload?.sessionId === sessionId) {
        lastOutputAtRef.current = Date.now();
        entry.terminal.write(payload.data, scheduleActivityCheck);
      }
    });
    const unsubscribeError = onTerminalErrorSubscribe((payload) => {
      if (payload?.cellId === cellId && payload?.sessionId === sessionId) {
        setErrorMessage(payload.message || 'Terminal failed to start.');
        logRuntime({
          level: 'error',
          message: 'terminal error received',
          meta: {
            cellId,
            sessionId,
            mode,
            error: payload.message,
          },
        });
      }
    });

    return () => {
      if (containerRef.current) {
        containerRef.current.removeEventListener('mousedown', selectionMouseController.handlePointerDown);
      }
      window.removeEventListener('mouseup', selectionMouseController.handlePointerUp);
      selectionMouseController.clearSelectionActivationTimer();
      detachResizeController?.();
      if (activityFrameRef.current) {
        cancelAnimationFrame(activityFrameRef.current);
        activityFrameRef.current = null;
      }
      contextMenuTargets.forEach((target) => {
        target.removeEventListener('contextmenu', handleContextMenu);
      });
      if (unsubscribe) {
        unsubscribe();
      }
      if (unsubscribeError) {
        unsubscribeError();
      }
      if (selectionDisposable?.dispose) {
        selectionDisposable.dispose();
      }
      if (bufferDisposable?.dispose) {
        bufferDisposable.dispose();
      }
      if (linkProviderRef.current?.dispose) {
        linkProviderRef.current.dispose();
      }
      mouseOverrideRef.current.lastEnabled = null;
      selectionOverrideRef.current = false;
      selectionMouseLockRef.current = false;
      linkProviderRef.current = null;
      resizeHandlerRef.current = null;
      focusHandlerRef.current = null;
      setSessionReady(false);
      if (entryRef.current) {
        entryRef.current.container = null;
      }
      entryRef.current = null;
      terminalRef.current = null;
      fitRef.current = null;
    };
  }, [cellId, sessionId, worktreePath]);

};
