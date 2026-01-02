import React, { useEffect, useRef, useState } from 'react';
import {
  attachTerminal,
  ensureInputListener,
  ensureStarted,
  ensureTerminalEntry,
} from '../terminal/terminalManager.js';

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
}) {
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
  const [errorMessage, setErrorMessage] = useState('');
  const [sessionReady, setSessionReady] = useState(false);
  const cellId = cell?.id;
  const worktreePath = cell?.worktreePath;
  const safePathPattern = /^[A-Za-z0-9_\-./]+$/;

  const sendCommand = (command) => {
    if (!command || !cellId) {
      return;
    }
    const text = String(command).replace(/\r\n/g, '\n');
    const lines = text.split('\n');
    lines.forEach((line) => {
      window.agency?.writeTerminal({ cellId, sessionId, data: `${line}\r` });
    });
    if (onCommandSent) {
      onCommandSent({ cellId, command });
    }
    if (onActivity) {
      onActivity({ cellId, sessionId });
    }
  };

  const formatShellPath = (value) => {
    if (!value) {
      return '';
    }
    if (safePathPattern.test(value)) {
      return value;
    }
    return `'${String(value).replace(/'/g, `'\\''`)}'`;
  };

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
    ensureInputListener({
      entry,
      onInput: (data) => {
        window.agency?.writeTerminal({ cellId, sessionId, data });
        if (onActivity) {
          onActivity({ cellId, sessionId });
        }
      },
    });

    setSessionReady(entry.started);
    setErrorMessage('');

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
      window.agency?.logRuntime?.({
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
        window.agency?.resizeTerminal({
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
    if (isActive) {
      terminalRef.current?.focus();
    }

    const handleFocus = () => {
      terminalRef.current?.focus();
    };
    containerRef.current.addEventListener('mousedown', handleFocus);

    const handleTerminalPaste = async () => {
      if (!window.agency?.materializeClipboard || !worktreePath) {
        return false;
      }
      try {
        const result = await window.agency.materializeClipboard({
          rootPath: worktreePath,
          targetDir: '.agency/tmp',
          includeText: true,
          relativeTo: worktreePath,
        });
        if (result?.type === 'files' || result?.type === 'image') {
          const paths = (result.paths || []).filter(Boolean).map(formatShellPath);
          if (paths.length) {
            window.agency?.writeTerminal({ cellId, sessionId, data: paths.join(' ') });
            if (onActivity) {
              onActivity({ cellId, sessionId });
            }
          }
          return true;
        }
        if (result?.type === 'text' && result.text) {
          const normalized = String(result.text)
            .replace(/\r\n/g, '\n')
            .replace(/\n/g, '\r');
          window.agency?.writeTerminal({ cellId, sessionId, data: normalized });
          if (onActivity) {
            onActivity({ cellId, sessionId });
          }
          return true;
        }
      } catch (error) {
        window.agency?.logRuntime?.({
          level: 'error',
          message: 'terminal paste failed',
          meta: {
            cellId,
            sessionId,
            error: error?.message || String(error),
          },
        });
      }
      return false;
    };

    const handleCustomKeyEvent = (event) => {
      if (event.key === 'Enter' && event.metaKey) {
        if (event.type === 'keydown') {
          window.agency?.writeTerminal({ cellId, sessionId, data: '\r' });
        }
        event.preventDefault();
        return false;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'v') {
        if (!window.agency?.materializeClipboard || !worktreePath) {
          return true;
        }
        if (event.type === 'keydown') {
          handleTerminalPaste();
        }
        event.preventDefault();
        return false;
      }
      return true;
    };
    entry.terminal.attachCustomKeyEventHandler(handleCustomKeyEvent);

    const wheelTargets = [
      entry.terminal.element,
      entry.terminal.element?.querySelector('.xterm-viewport'),
      containerRef.current,
    ].filter(Boolean);
    const pasteTargets = [
      entry.terminal.element,
      entry.terminal.element?.querySelector('textarea'),
      containerRef.current,
    ].filter(Boolean);
    const handleWheel = (event) => {
      if (!terminalRef.current) {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      const delta = event.deltaY;
      if (delta === 0) {
        return;
      }
      const viewport = terminalRef.current?._core?.viewport;
      let lines = viewport?.getLinesScrolled ? viewport.getLinesScrolled(event) : 0;
      if (!lines && delta !== 0) {
        const base = Math.round(Math.abs(delta) / 40);
        const adjusted = base === 0 ? 1 : base;
        lines = adjusted * (delta > 0 ? 1 : -1);
        if (event.shiftKey) {
          lines *= 3;
        }
      }
      if (lines) {
        terminalRef.current.scrollLines(lines);
      }
    };
    wheelTargets.forEach((target) => {
      target.addEventListener('wheel', handleWheel, { passive: false, capture: true });
    });
    const handlePasteEvent = (event) => {
      if (!window.agency?.materializeClipboard || !worktreePath) {
        return;
      }
      event.preventDefault();
      handleTerminalPaste();
    };
    pasteTargets.forEach((target) => {
      target.addEventListener('paste', handlePasteEvent);
    });

    const unsubscribe = window.agency?.onTerminalData((payload) => {
      if (payload?.cellId === cellId && payload?.sessionId === sessionId) {
        lastOutputAtRef.current = Date.now();
        entry.terminal.write(payload.data);
        if (onActivity) {
          onActivity({ cellId, sessionId });
        }
      }
    });
    const unsubscribeError = window.agency?.onTerminalError((payload) => {
      if (payload?.cellId === cellId && payload?.sessionId === sessionId) {
        setErrorMessage(payload.message || 'Terminal failed to start.');
        window.agency?.logRuntime?.({
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
        containerRef.current.removeEventListener('mousedown', handleFocus);
      }
      if (resizeFrame) {
        cancelAnimationFrame(resizeFrame);
      }
      if (deferredResizeRef.current) {
        clearTimeout(deferredResizeRef.current);
      }
      wheelTargets.forEach((target) => {
        target.removeEventListener('wheel', handleWheel, { capture: true });
      });
      pasteTargets.forEach((target) => {
        target.removeEventListener('paste', handlePasteEvent);
      });
      if (unsubscribe) {
        unsubscribe();
      }
      if (unsubscribeError) {
        unsubscribeError();
      }
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
          if (onActivity) {
            onActivity({ cellId, sessionId });
          }
          if (onSessionAttached) {
            onSessionAttached({ cellId, sessionId });
          }
          if (commandQueueRef.current.length) {
            const queue = [...commandQueueRef.current];
            commandQueueRef.current = [];
            queue.forEach((command) => sendCommand(command));
          }
        }
      })
      .catch((error) => {
        if (!canceled) {
          setErrorMessage(error?.message || 'Terminal failed to start.');
          window.agency?.logRuntime?.({
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
    if (pendingCommand.command === lastQueuedRef.current) {
      return;
    }
    lastQueuedRef.current = pendingCommand.command;
    if (sessionReady) {
      sendCommand(pendingCommand.command);
    } else {
      commandQueueRef.current.push(pendingCommand.command);
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
        window.agency?.logRuntime?.({
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

  if (errorMessage) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-amber-200">
        {errorMessage}
      </div>
    );
  }

  return <div ref={containerRef} className="h-full w-full" />;
}

export default TerminalPane;
