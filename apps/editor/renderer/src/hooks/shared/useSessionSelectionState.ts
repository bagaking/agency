import { useEffect, useRef, useState } from 'react';

export function useSessionSelectionState(initialActiveSessions: Record<string, string> = {}) {
  const [activeSessionByCellId, setActiveSessionByCellId] = useState(initialActiveSessions || {});
  const activeSessionByCellIdRef = useRef(initialActiveSessions || {});
  const selectionVersionRef = useRef(0);

  useEffect(() => {
    if (initialActiveSessions && typeof initialActiveSessions === 'object') {
      setActiveSessionByCellId(initialActiveSessions);
      activeSessionByCellIdRef.current = initialActiveSessions;
    }
  }, [initialActiveSessions]);

  useEffect(() => {
    activeSessionByCellIdRef.current = activeSessionByCellId;
  }, [activeSessionByCellId]);

  return {
    activeSessionByCellId,
    setActiveSessionByCellId,
    activeSessionByCellIdRef,
    selectionVersionRef,
  };
}
