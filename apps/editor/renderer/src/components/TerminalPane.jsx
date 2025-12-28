import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';

function TerminalPane({ cell, sessionId, mode, pendingCommand, onCommandSent }) {
  const containerRef = useRef(null);
  const terminalRef = useRef(null);
  const fitRef = useRef(null);
  const commandQueueRef = useRef([]);
  const lastQueuedRef = useRef(null);
  const lastResizeRef = useRef({ width: 0, height: 0, cols: 0, rows: 0 });
  const lastOutputAtRef = useRef(0);
  const deferredResizeRef = useRef(null);
  const resizeLogRef = useRef({});
  const [errorMessage, setErrorMessage] = useState('');
  const [sessionReady, setSessionReady] = useState(false);

  const sendCommand = (command) => {
    if (!command || !cell?.id) {
      return;
    }
    const text = String(command).replace(/\r\n/g, '\n');
    const lines = text.split('\n');
    lines.forEach((line) => {
      window.agency?.writeTerminal({ cellId: cell.id, sessionId, data: `${line}\r` });
    });
    if (onCommandSent) {
      onCommandSent({ cellId: cell.id, command });
    }
  };

  useEffect(() => {
    if (!cell || !containerRef.current || !cell.worktreePath) {
      return undefined;
    }
    commandQueueRef.current = [];
    lastQueuedRef.current = null;
    setSessionReady(false);

    const terminal = new Terminal({
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 13,
      cursorBlink: true,
      scrollback: 5000,
      scrollOnUserInput: true,
      theme: {
        background: '#0b0d12',
        foreground: '#f8fafc',
      },
    });
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(containerRef.current);

    terminalRef.current = terminal;
    fitRef.current = fitAddon;

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
          cellId: cell.id,
          sessionId,
          mode,
          ...meta,
        },
      });
    };

    const scheduleResize = (force = false, reason = 'auto') => {
      if (!terminalRef.current || !fitRef.current || !containerRef.current) {
        return;
      }
      const now = Date.now();
      if (!force && now - lastOutputAtRef.current < OUTPUT_SUPPRESS_MS) {
        logResizeSkip('output-throttle', { reason });
        if (!deferredResizeRef.current) {
          deferredResizeRef.current = setTimeout(() => {
            deferredResizeRef.current = null;
            scheduleResize(true, 'deferred-output');
          }, 250);
        }
        return;
      }
      const rect = containerRef.current.getBoundingClientRect();
      const width = Math.round(rect.width);
      const height = Math.round(rect.height);
      if (!width || !height) {
        logResizeSkip('zero-dimensions', { width, height, reason });
        if (!deferredResizeRef.current) {
          deferredResizeRef.current = setTimeout(() => {
            deferredResizeRef.current = null;
            scheduleResize(true, 'deferred-zero');
          }, 100);
        }
        return;
      }
      if (!force && width === lastResizeRef.current.width && height === lastResizeRef.current.height) {
        return;
      }
      const proposed = fitRef.current.proposeDimensions?.();
      if (!proposed || !proposed.cols || !proposed.rows) {
        logResizeSkip('missing-dimensions', { width, height, reason });
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
        lastResizeRef.current = { width, height, cols, rows };
        window.agency?.resizeTerminal({
          cellId: cell.id,
          sessionId,
          cols,
          rows,
        });
      });
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
    terminal.focus();

    setErrorMessage('');

    const handleCustomKeyEvent = (event) => {
      if (event.key === 'Enter' && event.metaKey) {
        if (event.type === 'keydown') {
          window.agency?.writeTerminal({ cellId: cell.id, sessionId, data: '\r' });
        }
        event.preventDefault();
        return false;
      }
      return true;
    };
    terminal.attachCustomKeyEventHandler(handleCustomKeyEvent);

    const wheelTargets = [
      terminal.element,
      terminal.element?.querySelector('.xterm-viewport'),
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

    const unsubscribe = window.agency?.onTerminalData((payload) => {
      if (payload?.cellId === cell.id && payload?.sessionId === sessionId) {
        lastOutputAtRef.current = Date.now();
        terminal.write(payload.data);
      }
    });
    const unsubscribeError = window.agency?.onTerminalError((payload) => {
      if (payload?.cellId === cell.id && payload?.sessionId === sessionId) {
        setErrorMessage(payload.message || 'Terminal failed to start.');
        window.agency?.logRuntime?.({
          level: 'error',
          message: 'terminal error received',
          meta: {
            cellId: cell.id,
            sessionId,
            mode,
            error: payload.message,
          },
        });
      }
    });

    const startTerminal = async () => {
      try {
        await window.agency?.startTerminal({
          cellId: cell.id,
          sessionId,
          worktreePath: cell.worktreePath,
          mode,
        });
        setSessionReady(true);
        setTimeout(() => scheduleResize(true, 'post-start'), 60);
        if (commandQueueRef.current.length) {
          const queue = [...commandQueueRef.current];
          commandQueueRef.current = [];
          queue.forEach((command) => sendCommand(command));
        }
      } catch (error) {
        console.error(error);
      }
    };
    startTerminal();

    terminal.onData((data) => {
      window.agency?.writeTerminal({ cellId: cell.id, sessionId, data });
    });

    const handleWindowResize = () => scheduleResize(false, 'window-resize');
    window.addEventListener('resize', handleWindowResize);

    return () => {
      window.removeEventListener('resize', handleWindowResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
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
      if (unsubscribe) {
        unsubscribe();
      }
      if (unsubscribeError) {
        unsubscribeError();
      }
      terminal.dispose();
      terminalRef.current = null;
      fitRef.current = null;
      setSessionReady(false);
    };
  }, [cell, mode, sessionId]);

  useEffect(() => {
    if (!pendingCommand || !cell || pendingCommand.cellId !== cell.id) {
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
  }, [pendingCommand, sessionReady, cell?.id, sessionId]);

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
