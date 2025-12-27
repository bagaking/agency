import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';

function TerminalPane({ cell, sessionId, mode, pendingCommand, onCommandSent }) {
  const containerRef = useRef(null);
  const terminalRef = useRef(null);
  const fitRef = useRef(null);
  const commandQueueRef = useRef([]);
  const lastQueuedRef = useRef(null);
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
    const scheduleResize = () => {
      if (!terminalRef.current || !fitRef.current) {
        return;
      }
      if (resizeFrame) {
        cancelAnimationFrame(resizeFrame);
      }
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = null;
        if (!terminalRef.current || !fitRef.current) {
          return;
        }
        fitRef.current.fit();
        window.agency?.resizeTerminal({
          cellId: cell.id,
          sessionId,
          cols: terminalRef.current.cols,
          rows: terminalRef.current.rows,
        });
      });
    };

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => scheduleResize())
        : null;
    if (resizeObserver) {
      resizeObserver.observe(containerRef.current);
    }
    scheduleResize();
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
        terminal.write(payload.data);
      }
    });
    const unsubscribeError = window.agency?.onTerminalError((payload) => {
      if (payload?.cellId === cell.id && payload?.sessionId === sessionId) {
        setErrorMessage(payload.message || 'Terminal failed to start.');
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

    window.addEventListener('resize', scheduleResize);

    return () => {
      window.removeEventListener('resize', scheduleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (resizeFrame) {
        cancelAnimationFrame(resizeFrame);
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
