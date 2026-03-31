import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

import {
  onWindowHomeShellData,
  onWindowHomeShellError,
  onWindowHomeShellExit,
  resizeWindowHomeShell,
  startWindowHomeShell,
  writeWindowHomeShell,
} from '../../services/agencyBridge';
import {
  attachWindowHomeShellTerminal,
  ensureWindowHomeShellEntry,
  ensureWindowHomeShellInputListener,
} from '../../terminal/windowHomeShellManager';

export function WindowHomeShellPane({
  visible,
  homePath,
  onClose,
  onReady,
  onExit,
  onError,
}: {
  visible: boolean;
  homePath: string;
  onClose?: () => void;
  onReady?: (payload?: { cwd?: string; shellPath?: string }) => void;
  onExit?: () => void;
  onError?: (message: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const entryRef = useRef<any>(null);
  const resizeFrameRef = useRef<number | null>(null);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!visible || !containerRef.current) {
      return undefined;
    }

    const entry = ensureWindowHomeShellEntry();
    entryRef.current = entry;
    attachWindowHomeShellTerminal({
      targetEntry: entry,
      container: containerRef.current,
    });
    ensureWindowHomeShellInputListener({
      targetEntry: entry,
      onInput: (data) => {
        writeWindowHomeShell({ data });
      },
    });

    const scheduleResize = () => {
      if (!entryRef.current || !containerRef.current) {
        return;
      }
      if (resizeFrameRef.current) {
        cancelAnimationFrame(resizeFrameRef.current);
      }
      resizeFrameRef.current = requestAnimationFrame(() => {
        resizeFrameRef.current = null;
        entryRef.current.fitAddon.fit();
        resizeWindowHomeShell({
          cols: entryRef.current.terminal.cols,
          rows: entryRef.current.terminal.rows,
        });
      });
    };

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => scheduleResize())
        : null;
    if (resizeObserver && containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    const unsubscribeData = onWindowHomeShellData((payload: any) => {
      if (!payload?.data || !entryRef.current) {
        return;
      }
      entryRef.current.terminal.write(String(payload.data));
    });
    const unsubscribeError = onWindowHomeShellError((payload: any) => {
      const message = String(payload?.message || 'Window home shell failed.');
      setLocalError(message);
      onError?.(message);
    });
    const unsubscribeExit = onWindowHomeShellExit(() => {
      onExit?.();
    });

    let cancelled = false;
    startWindowHomeShell({
      cwd: homePath,
    })
      .then((result: any) => {
        if (cancelled) {
          return;
        }
        setLocalError('');
        onReady?.({
          cwd: result?.cwd,
          shellPath: result?.shellPath,
        });
        scheduleResize();
        entryRef.current?.terminal.focus();
      })
      .catch((error: any) => {
        if (cancelled) {
          return;
        }
        const message = error?.message || 'Window home shell failed to start.';
        setLocalError(message);
        onError?.(message);
      });

    window.addEventListener('resize', scheduleResize);

    return () => {
      cancelled = true;
      window.removeEventListener('resize', scheduleResize);
      unsubscribeData?.();
      unsubscribeError?.();
      unsubscribeExit?.();
      resizeObserver?.disconnect();
      if (resizeFrameRef.current) {
        cancelAnimationFrame(resizeFrameRef.current);
        resizeFrameRef.current = null;
      }
    };
  }, [homePath, onError, onExit, onReady, visible]);

  return (
    <div className="flex min-h-[320px] flex-1 flex-col overflow-hidden rounded-[22px] border border-white/[0.08] bg-[#05070b] shadow-[0_30px_90px_-28px_rgba(0,0,0,0.9)]">
      <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.03] px-4 py-2">
        <div className="min-w-0">
          <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/42">
            Home Shell
          </div>
          <div className="truncate text-[11px] text-white/76">{homePath}</div>
        </div>
        <div className="flex items-center gap-2">
          {localError ? (
            <div className="rounded-full border border-rose-300/20 bg-rose-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-rose-200">
              Error
            </div>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white/62 transition-colors hover:bg-white/[0.08] hover:text-white"
            aria-label="Close home shell"
          >
            <X size={13} />
          </button>
        </div>
      </div>
      <div ref={containerRef} className="min-h-0 flex-1 bg-[#05070b] p-2" />
    </div>
  );
}
