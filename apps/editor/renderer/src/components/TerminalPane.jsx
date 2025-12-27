import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';

function TerminalPane({ cell, mode, pendingCommand, onCommandSent }) {
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
    window.agency?.writeTerminal({ cellId: cell.id, data: `${command}\r` });
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
      theme: {
        background: '#0b0d12',
        foreground: '#f8fafc',
      },
    });
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(containerRef.current);
    fitAddon.fit();

    terminalRef.current = terminal;
    fitRef.current = fitAddon;

    setErrorMessage('');

    const unsubscribe = window.agency?.onTerminalData((payload) => {
      if (payload?.cellId === cell.id) {
        terminal.write(payload.data);
      }
    });
    const unsubscribeError = window.agency?.onTerminalError((payload) => {
      if (payload?.cellId === cell.id) {
        setErrorMessage(payload.message || 'Terminal failed to start.');
      }
    });

    const startTerminal = async () => {
      try {
        await window.agency?.startTerminal({
          cellId: cell.id,
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
      window.agency?.writeTerminal({ cellId: cell.id, data });
    });

    const handleResize = () => {
      if (!terminalRef.current || !fitRef.current) {
        return;
      }
      fitRef.current.fit();
      window.agency?.resizeTerminal({
        cellId: cell.id,
        cols: terminalRef.current.cols,
        rows: terminalRef.current.rows,
      });
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
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
  }, [cell, mode]);

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
  }, [pendingCommand, sessionReady, cell?.id]);

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
