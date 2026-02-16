import { useEffect } from 'react';

export const useTerminalRuntimeEffect = (runtime: any) => {
  const {
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
    stripTrailingPunctuation,
    findPathMatches,
    buildSelectionSite,
    formatSelectionTime,
    writeSelectionToClipboard,
    getBufferSnapshot,
    countDiffChars,
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
    const resolvePathTarget = (rawText) => {
      const cleaned = stripTrailingPunctuation(rawText || '');
      if (!cleaned) {
        return null;
      }
      const match = /^(.*?)(?::(\d+)(?::(\d+))?)?$/.exec(cleaned);
      if (!match) {
        return null;
      }
      let targetPath = match[1] || '';
      const line = match[2] ? Number(match[2]) : null;
      const column = match[3] ? Number(match[3]) : null;
      if (!targetPath) {
        return null;
      }
      targetPath = targetPath.replace(/\\/g, '/');
      if (targetPath.startsWith('./')) {
        targetPath = targetPath.slice(2);
      }
      const normalizedRoot = worktreePath ? String(worktreePath).replace(/\\/g, '/').replace(/\/+$/, '') : '';
      if (targetPath.startsWith('/')) {
        if (!normalizedRoot || !targetPath.startsWith(`${normalizedRoot}/`)) {
          return null;
        }
        targetPath = targetPath.slice(normalizedRoot.length + 1);
      }
      return {
        path: targetPath,
        rootPath: normalizedRoot || worktreePath,
        line: Number.isFinite(line) ? line : null,
        column: Number.isFinite(column) ? column : null,
      };
    };
    const handleLinkActivate = (rawText, event) => {
      const isMac = navigator.platform?.toLowerCase().includes('mac');
      const modKey = isMac ? event?.metaKey : event?.ctrlKey;
      if (!modKey) {
        return;
      }
      const resolved = resolvePathTarget(rawText);
      if (!resolved?.path) {
        return;
      }
      onOpenWorkbenchFile?.({
        path: resolved.path,
        rootPath: resolved.rootPath,
        line: resolved.line,
        column: resolved.column,
        focusView: true,
        cellId,
      });
    };
    linkProviderRef.current = entry.terminal.registerLinkProvider({
      provideLinks: (bufferLineNumber, callback) => {
        const buffer = entry.terminal?.buffer?.active;
        const line = buffer?.getLine(bufferLineNumber);
        const columnMap = [];
        const text = line ? line.translateToString(true, undefined, undefined, columnMap) : '';
        if (!text) {
          callback(undefined);
          return;
        }
        const matches = findPathMatches(text);
        if (!matches.length) {
          callback(undefined);
          return;
        }
        const resolveColumn = (index) => {
          if (!columnMap.length) {
            return index;
          }
          const clamped = Math.max(0, Math.min(index, columnMap.length - 1));
          const column = columnMap[clamped];
          return Number.isFinite(column) ? column : index;
        };
        const resolveRange = (match) => {
          const length = match.text.length;
          const startCol = resolveColumn(match.startIndex);
          if (length <= 0) {
            return {
              start: { x: startCol + 1, y: bufferLineNumber },
              end: { x: startCol + 1, y: bufferLineNumber },
            };
          }
          const endColRaw = resolveColumn(match.startIndex + length);
          const endCol = Math.max(startCol, endColRaw - 1);
          return {
            start: { x: startCol + 1, y: bufferLineNumber },
            end: { x: endCol + 1, y: bufferLineNumber },
          };
        };
        const links = matches.map((match) => ({
          text: match.text,
          range: resolveRange(match),
          activate: (event) => handleLinkActivate(match.text, event),
        }));
        callback(links);
      },
    });

    let resizeFrame = null;
    const MIN_COLS = 20;
    const MIN_ROWS = 5;
    const OUTPUT_SUPPRESS_MS = 220;
    const LOG_THROTTLE_MS = 1200;

    const logResizeSkip = (reason, meta) => {
      const now = Date.now();
      const last = resizeLogRef.current[reason] || 0;
      if (now - last < LOG_THROTTLE_MS) {
        return;
      }
      resizeLogRef.current[reason] = now;
      logRuntime({
        level: 'warn',
        message: `terminal resize skipped: ${reason}`,
        meta: {
          cellId,
          sessionId,
          mode,
          ...meta,
        },
      });
    };

    const scheduleDeferredResize = (delay, reason) => {
      if (resizeAttemptsRef.current >= 6) {
        return;
      }
      resizeAttemptsRef.current += 1;
      if (deferredResizeRef.current) {
        return;
      }
      deferredResizeRef.current = setTimeout(() => {
        deferredResizeRef.current = null;
        scheduleResize(true, reason);
      }, delay);
    };

    const scheduleResize = (force = false, reason = 'auto') => {
      if (!terminalRef.current || !fitRef.current || !containerRef.current) {
        return;
      }
      const now = Date.now();
      if (!force && now - lastOutputAtRef.current < OUTPUT_SUPPRESS_MS) {
        logResizeSkip('output-throttle', { reason });
        scheduleDeferredResize(250, 'deferred-output');
        return;
      }
      const rect = containerRef.current.getBoundingClientRect();
      const width = Math.round(rect.width);
      const height = Math.round(rect.height);
      if (!width || !height) {
        logResizeSkip('zero-dimensions', { width, height, reason });
        scheduleDeferredResize(120, 'deferred-zero');
        return;
      }
      if (!force && width === lastResizeRef.current.width && height === lastResizeRef.current.height) {
        return;
      }
      const proposed = fitRef.current.proposeDimensions?.();
      if (!proposed || !proposed.cols || !proposed.rows) {
        logResizeSkip('missing-dimensions', { width, height, reason });
        scheduleDeferredResize(140, 'deferred-missing');
        return;
      }
      if (proposed.cols < MIN_COLS || proposed.rows < MIN_ROWS) {
        logResizeSkip('below-minimum', {
          width,
          height,
          cols: proposed.cols,
          rows: proposed.rows,
          reason,
        });
        return;
      }
      if (resizeFrame) {
        cancelAnimationFrame(resizeFrame);
      }
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = null;
        if (!terminalRef.current || !fitRef.current || !containerRef.current) {
          return;
        }
        fitRef.current.fit();
        const { cols, rows } = terminalRef.current;
        if (cols < MIN_COLS || rows < MIN_ROWS) {
          logResizeSkip('below-minimum', { cols, rows, reason });
          return;
        }
        if (!force && cols === lastResizeRef.current.cols && rows === lastResizeRef.current.rows) {
          lastResizeRef.current = { width, height, cols, rows };
          return;
        }
        resizeAttemptsRef.current = 0;
        lastResizeRef.current = { width, height, cols, rows };
        resizeTerminal({
          cellId,
          sessionId,
          cols,
          rows,
        });
      });
    };

    resizeHandlerRef.current = scheduleResize;
    focusHandlerRef.current = () => {
      terminalRef.current?.focus();
    };

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => scheduleResize(false, 'resize-observer'))
        : null;
    if (resizeObserver) {
      resizeObserver.observe(containerRef.current);
    }
    scheduleResize(true, 'init');
    if (document.fonts?.ready) {
      document.fonts.ready
        .then(() => scheduleResize(true, 'fonts-ready'))
        .catch(() => {});
    }
    if (isActiveRef.current) {
      terminalRef.current?.focus();
    }

    const setTmuxMouseEnabled = (enabled, { force = false }: any = {}) => {
      if (!worktreePath || !sessionId) {
        return;
      }
      if (!force && mouseOverrideRef.current.lastEnabled === enabled) {
        return;
      }
      mouseOverrideRef.current.lastEnabled = enabled;
      setSessionMouse({ worktreePath, sessionId, enabled }).catch(() => undefined);
    };

    const clearSelectionActivationTimer = () => {
      if (!selectionActivationTimerRef.current) {
        return;
      }
      clearTimeout(selectionActivationTimerRef.current);
      selectionActivationTimerRef.current = null;
    };

    const scheduleSelectionActivationGuard = () => {
      clearSelectionActivationTimer();
      selectionMouseLockRef.current = true;
      setTmuxMouseEnabled(false, { force: true });
      selectionActivationTimerRef.current = setTimeout(() => {
        selectionActivationTimerRef.current = null;
        const selectionActive = Boolean(
          terminalRef.current?.hasSelection?.() || selectionTextRef.current
        );
        if (selectionActive) {
          selectionMouseLockRef.current = true;
          setTmuxMouseEnabled(false, { force: true });
          return;
        }
        selectionMouseLockRef.current = false;
        ensureTmuxMouseOn();
      }, 180);
    };

    const ensureTmuxMouseOn = () => {
      if (selectionOverrideRef.current || selectionMouseLockRef.current) {
        return;
      }
      if (terminalRef.current?.hasSelection?.() || selectionTextRef.current) {
        return;
      }
      const tracking = terminalRef.current?.modes?.mouseTrackingMode || 'none';
      setTmuxMouseEnabled(true, { force: tracking === 'none' });
    };

    const bufferDisposable = entry.terminal.onBufferChange?.(() => {
      ensureTmuxMouseOn();
    });
    ensureTmuxMouseOn();

    const handlePointerDown = (event) => {
      terminalRef.current?.focus();
      pointerDownRef.current = { x: event.clientX, y: event.clientY, at: Date.now() };
      const terminal = terminalRef.current;
      const isAlternate = terminal?.buffer?.active?.type === 'alternate';
      const wantsSelectionOverride =
        !isAlternate &&
        event.button === 0 &&
        (event.shiftKey || event.altKey || event.metaKey);
      if (wantsSelectionOverride) {
        clearSelectionActivationTimer();
        selectionOverrideRef.current = true;
        selectionMouseLockRef.current = true;
        setTmuxMouseEnabled(false, { force: true });
      } else {
        clearSelectionActivationTimer();
        selectionOverrideRef.current = false;
        if (!terminal?.hasSelection?.() && !selectionTextRef.current) {
          selectionMouseLockRef.current = false;
          ensureTmuxMouseOn();
        }
      }
    };
    const handlePointerUp = () => {
      if (!pointerDownRef.current) {
        return;
      }
      const terminal = terminalRef.current;
      const hadSelectionOverride = selectionOverrideRef.current;
      const selectionActive = Boolean(
        terminal?.hasSelection?.() || selectionTextRef.current
      );
      if (hadSelectionOverride) {
        selectionOverrideRef.current = false;
      }
      if (selectionActive) {
        clearSelectionActivationTimer();
        selectionMouseLockRef.current = true;
        setTmuxMouseEnabled(false, { force: true });
      } else if (hadSelectionOverride) {
        scheduleSelectionActivationGuard();
      } else {
        clearSelectionActivationTimer();
        selectionMouseLockRef.current = false;
        ensureTmuxMouseOn();
      }
      pointerDownRef.current = null;
    };
    containerRef.current.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('mouseup', handlePointerUp);

    const sendExtendedKey = (data) => {
      if (!cellId || !sessionId || !sessionReadyRef.current) {
        return;
      }
      writeTerminal({ cellId, sessionId, data });
    };

    const resolveShiftEnterPayload = () => {
      const terminal = terminalRef.current;
      if (terminal?.modes?.bracketedPasteMode) {
        return '\x1b[200~\n\x1b[201~';
      }
      return '\x1b[13;2u';
    };

    const resolveModifierArrowPayload = (event) => {
      const mapping = {
        ArrowUp: 'A',
        ArrowDown: 'B',
        ArrowRight: 'C',
        ArrowLeft: 'D',
      };
      if (
        event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey &&
        (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
      ) {
        return event.key === 'ArrowLeft' ? '\x1bb' : '\x1bf';
      }
      if (
        event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.shiftKey &&
        (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
      ) {
        return event.key === 'ArrowLeft' ? '\x1b[H' : '\x1b[F';
      }
      if (
        event.ctrlKey &&
        !event.altKey &&
        !event.metaKey &&
        !event.shiftKey &&
        mapping[event.key]
      ) {
        return `\x1b[1;5${mapping[event.key]}`;
      }
      return '';
    };

    const handleModifierArrow = (event) => {
      const payload = resolveModifierArrowPayload(event);
      if (!payload) {
        return false;
      }
      if (event.type === 'keydown') {
        sendExtendedKey(payload);
      }
      if (event.type === 'keydown' || event.type === 'keypress' || event.type === 'keyup') {
        event.preventDefault();
        event.stopPropagation();
        return true;
      }
      return false;
    };

    const handleSelectionCopy = (event) => {
      if (!event.metaKey || event.ctrlKey || event.altKey) {
        return false;
      }
      if (String(event.key || '').toLowerCase() !== 'c') {
        return false;
      }
      const selection = entry.terminal?.getSelection?.() || selectionTextRef.current || '';
      if (!selection) {
        return false;
      }
      if (event.type === 'keydown') {
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
      }
      if (event.type === 'keydown' || event.type === 'keypress' || event.type === 'keyup') {
        event.preventDefault();
        event.stopPropagation();
        return true;
      }
      return false;
    };

    const handleExtendedEnter = (event) => {
      if (
        event.key !== 'Enter' ||
        !event.shiftKey ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      ) {
        return false;
      }
      if (event.type === 'keydown') {
        sendExtendedKey(resolveShiftEnterPayload());
      }
      if (event.type === 'keydown' || event.type === 'keypress' || event.type === 'keyup') {
        event.preventDefault();
        event.stopPropagation();
        return true;
      }
      return false;
    };

    const isActionableBinding = (binding) => {
      if (!binding) {
        return false;
      }
      const action = binding.action || {};
      const type = action.type || 'sendText';
      if (type === 'pasteFiles') {
        return true;
      }
      if (type === 'sendKeys') {
        return Array.isArray(action.keys) && action.keys.some((key) => String(key ?? '').length > 0);
      }
      if (type === 'sendText') {
        return action.text !== undefined && action.text !== null && String(action.text).length > 0;
      }
      return false;
    };

    const handleCustomKeyEvent = (event) => {
      if (!sessionReadyRef.current) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
      if (
        event.isComposing ||
        event.key === 'Process' ||
        event.key === 'Dead' ||
        event.key === 'Unidentified' ||
        event.keyCode === 229
      ) {
        return true;
      }
      if (handleSelectionCopy(event)) {
        return false;
      }
      const index = bindingIndexRef.current;
      const binding = index && index.size > 0 ? matchShortcutBinding(event, index) : null;
      if (binding && isActionableBinding(binding)) {
        if (event.type === 'keydown') {
          dispatchRef.current?.(binding.action || {});
        }
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
      if (handleModifierArrow(event)) {
        return false;
      }
      if (handleExtendedEnter(event)) {
        return false;
      }
      return true;
    };
    entry.terminal.attachCustomKeyEventHandler(handleCustomKeyEvent);

    const handleWheelEvent = (event) => {
      const terminal = terminalRef.current;
      if (!terminal) {
        return true;
      }
      if (event.ctrlKey) {
        return false;
      }
      const mouseMode = terminal.modes?.mouseTrackingMode || 'none';
      const activeBuffer = terminal.buffer?.active;
      const isAlternate = activeBuffer?.type === 'alternate';
      if (mouseMode !== 'none' && !event.altKey) {
        return true;
      }
      const delta = event.deltaY;
      if (!delta) {
        return false;
      }
      const direction = delta > 0 ? 1 : -1;
      let lines = 0;
      if (event.deltaMode === 1) {
        lines = delta;
      } else {
        const base = Math.round(Math.abs(delta) / 40);
        lines = (base === 0 ? 1 : base) * direction;
      }
      if (isAlternate) {
        const stepCount = Math.min(3, Math.max(1, Math.abs(lines || 1)));
        const sequence = direction < 0 ? '\x1b[5~' : '\x1b[6~';
        sendExtendedKey(sequence.repeat(stepCount));
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
      if (mouseMode !== 'none' && event.altKey) {
        if (lines) {
          terminal.scrollLines(lines);
        }
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
      return true;
    };
    entry.terminal.attachCustomWheelEventHandler(handleWheelEvent);

    const selectionDisposable = entry.terminal.onSelectionChange(() => {
      if (!isActiveRef.current) {
        return;
      }
      const selection = entry.terminal?.getSelection?.() || '';
      const isAlternate = entry.terminal?.buffer?.active?.type === 'alternate';
      if (!selection) {
        clearSelectionActivationTimer();
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
          ensureTmuxMouseOn();
        }
        return;
      }
      if (!isAlternate) {
        clearSelectionActivationTimer();
        selectionMouseLockRef.current = true;
        setTmuxMouseEnabled(false, { force: true });
      }
      const position = entry.terminal?.getSelectionPosition?.() || null;
      const updatedAt = Date.now();
      const rawSite = buildSelectionSite(entry.terminal, position);
      const site = rawSite || `\`${selection}\``;
      const timeTag = formatSelectionTime(updatedAt);
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

    const handleWindowResize = () => scheduleResize(false, 'window-resize');
    window.addEventListener('resize', handleWindowResize);

    return () => {
      window.removeEventListener('resize', handleWindowResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (containerRef.current) {
        containerRef.current.removeEventListener('mousedown', handlePointerDown);
      }
      window.removeEventListener('mouseup', handlePointerUp);
      clearSelectionActivationTimer();
      if (resizeFrame) {
        cancelAnimationFrame(resizeFrame);
      }
      if (activityFrameRef.current) {
        cancelAnimationFrame(activityFrameRef.current);
        activityFrameRef.current = null;
      }
      if (deferredResizeRef.current) {
        clearTimeout(deferredResizeRef.current);
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
