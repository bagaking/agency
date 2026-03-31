import { useEffect, useRef } from 'react';
import { logRuntime as logRuntimeBridge } from '../../services/agencyBridge';

const isDevBuild = Boolean(import.meta.env?.DEV);

type UseSessionTraceLoggingArgs = {
  activeSessionByCellId: Record<string, string>;
  selectedCellId?: string;
  activeSessionId?: string;
  openSessions?: unknown[];
};

export function useSessionTraceLogging({
  activeSessionByCellId,
  selectedCellId,
  activeSessionId,
  openSessions,
}: UseSessionTraceLoggingArgs) {
  const activeSessionTraceRef = useRef<Record<string, string>>({});
  const derivedActiveTraceRef = useRef<{ cellId: string; sessionId: string }>({
    cellId: '',
    sessionId: '',
  });

  useEffect(() => {
    const previous = activeSessionTraceRef.current || {};
    const next = activeSessionByCellId || {};
    const keys = new Set([...Object.keys(previous), ...Object.keys(next)]);
    keys.forEach((cellId) => {
      const prevSessionId = previous[cellId];
      const nextSessionId = next[cellId];
      if (prevSessionId === nextSessionId) {
        return;
      }
      const meta = {
        source: 'active-session-state',
        cellId,
        prevSessionId: prevSessionId || '',
        nextSessionId: nextSessionId || '',
        selectedCellId: selectedCellId || '',
      };
      logRuntimeBridge({
        level: 'info',
        message: 'session active pointer updated',
        meta,
      });
      if (isDevBuild) {
        console.debug('[SessionTrace] session active pointer updated', meta);
      }
    });
    activeSessionTraceRef.current = next;
  }, [activeSessionByCellId, selectedCellId]);

  useEffect(() => {
    const next = {
      cellId: selectedCellId || '',
      sessionId: activeSessionId || '',
    };
    const prev = derivedActiveTraceRef.current;
    if (prev.cellId === next.cellId && prev.sessionId === next.sessionId) {
      return;
    }
    const meta = {
      source: 'derived-active-session',
      prevCellId: prev.cellId,
      prevSessionId: prev.sessionId,
      nextCellId: next.cellId,
      nextSessionId: next.sessionId,
      openSessionCount: Array.isArray(openSessions) ? openSessions.length : 0,
      preferredSessionId: selectedCellId ? activeSessionByCellId[selectedCellId] || '' : '',
    };
    logRuntimeBridge({
      level: 'info',
      message: 'session derived active changed',
      meta,
    });
    if (isDevBuild) {
      console.warn('[SessionTrace] session derived active changed', meta);
    }
    derivedActiveTraceRef.current = next;
  }, [activeSessionByCellId, activeSessionId, openSessions, selectedCellId]);
}
