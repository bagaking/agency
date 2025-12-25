import React, { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';

function TerminalPane({ cell, mode }) {
  const containerRef = useRef(null);
  const terminalRef = useRef(null);
  const fitRef = useRef(null);

  useEffect(() => {
    if (!cell || !containerRef.current) {
      return undefined;
    }

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

    const unsubscribe = window.agency?.onTerminalData((payload) => {
      if (payload?.cellId === cell.id) {
        terminal.write(payload.data);
      }
    });

    window.agency
      ?.startTerminal({
        cellId: cell.id,
        worktreePath: cell.worktreePath,
        mode,
      })
      .catch((error) => console.error(error));

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
      terminal.dispose();
      terminalRef.current = null;
      fitRef.current = null;
    };
  }, [cell, mode]);

  return <div ref={containerRef} className="h-full w-full" />;
}

export default TerminalPane;
