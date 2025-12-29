import { useCallback, useEffect, useMemo, useState } from 'react';

const DEFAULT_FONT_SIZE = 13;
const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 20;

const buildSessionKey = (cellId, sessionId) => `${cellId}:${sessionId}`;
const clampFontSize = (value) => Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, value));

export function useSessions({
  selectedCell,
  tmuxStatus,
  onOpenTerminal,
  initialActiveSessions,
}) {
  const [activeSessionByCellId, setActiveSessionByCellId] = useState(
    initialActiveSessions || {}
  );
  const [sessionsByCellId, setSessionsByCellId] = useState({});
  const [sessionFontSizeByKey, setSessionFontSizeByKey] = useState({});
  const [sessionActivityByKey, setSessionActivityByKey] = useState({});
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState('');
  const [pendingCommand, setPendingCommand] = useState(null);

  useEffect(() => {
    if (initialActiveSessions && typeof initialActiveSessions === 'object') {
      setActiveSessionByCellId(initialActiveSessions);
    }
  }, [initialActiveSessions]);

  const sessions = selectedCell ? sessionsByCellId[selectedCell.id] || [] : [];

  const openSessions = useMemo(() => {
    const preferred = activeSessionByCellId[selectedCell?.id];
    return sessions.filter((session) => {
      if (session.status === 'closed') {
        return false;
      }
      if (session.status === 'detached') {
        return session.id === preferred;
      }
      return true;
    });
  }, [sessions, activeSessionByCellId, selectedCell?.id]);

  const preferredSessionId = selectedCell ? activeSessionByCellId[selectedCell.id] : undefined;
  const activeSessionId = selectedCell
    ? openSessions.find((session) => session.id === preferredSessionId)?.id ||
      openSessions.find((session) => session.status === 'active')?.id ||
      openSessions[0]?.id
    : undefined;
  const activeSessionKey =
    selectedCell && activeSessionId ? buildSessionKey(selectedCell.id, activeSessionId) : null;
  const activeFontSize = activeSessionKey
    ? sessionFontSizeByKey[activeSessionKey] || DEFAULT_FONT_SIZE
    : DEFAULT_FONT_SIZE;
  const lastActivityAt = activeSessionKey ? sessionActivityByKey[activeSessionKey] : null;

  const loadSessionsForCell = useCallback(
    async (cell, { silent = false } = {}) => {
      if (!cell || !window.agency?.listSessions) {
        return;
      }
      if (tmuxStatus?.available === false) {
        if (!silent) {
          setSessionError(tmuxStatus.error || 'tmux is required. Install tmux and try again.');
        }
        setSessionsByCellId((current) => ({ ...current, [cell.id]: [] }));
        setActiveSessionByCellId((current) => {
          const next = { ...current };
          delete next[cell.id];
          return next;
        });
        return;
      }
      if (!silent) {
        setSessionLoading(true);
        setSessionError('');
      }
      try {
        let nextSessions = await window.agency.listSessions({ worktreePath: cell.worktreePath });
        if (nextSessions.length === 0 && window.agency?.createSession) {
          const created = await window.agency.createSession({
            cellId: cell.id,
            worktreePath: cell.worktreePath,
            name: 'Default',
            sessionId: 'default',
          });
          nextSessions = created ? [created] : nextSessions;
        }
        setSessionsByCellId((current) => ({ ...current, [cell.id]: nextSessions }));

        const open = nextSessions.filter(
          (session) => session.status !== 'closed' && session.status !== 'detached'
        );
        const preferred = activeSessionByCellId[cell.id];
        const active =
          (preferred && open.find((session) => session.id === preferred)) ||
          open.find((session) => session.status === 'active') ||
          open[0];
        setActiveSessionByCellId((current) => {
          const next = { ...current };
          if (active && active.id) {
            next[cell.id] = active.id;
          } else {
            delete next[cell.id];
          }
          return next;
        });
      } catch (error) {
        if (!silent) {
          setSessionError(error?.message || 'Failed to load sessions.');
        }
        setSessionsByCellId((current) => ({ ...current, [cell.id]: [] }));
        setActiveSessionByCellId((current) => {
          const next = { ...current };
          delete next[cell.id];
          return next;
        });
      } finally {
        if (!silent) {
          setSessionLoading(false);
        }
      }
    },
    [activeSessionByCellId, tmuxStatus?.available, tmuxStatus?.error]
  );

  useEffect(() => {
    if (!selectedCell) {
      return;
    }
    loadSessionsForCell(selectedCell);
  }, [selectedCell?.id, tmuxStatus?.available, loadSessionsForCell]);

  useEffect(() => {
    if (!activeSessionKey) {
      return;
    }
    if (!sessionActivityByKey[activeSessionKey]) {
      setSessionActivityByKey((current) => ({
        ...current,
        [activeSessionKey]: Date.now(),
      }));
    }
  }, [activeSessionKey, sessionActivityByKey]);

  const updateSessionActivity = useCallback(({ cellId, sessionId }) => {
    if (!cellId || !sessionId) {
      return;
    }
    const key = buildSessionKey(cellId, sessionId);
    setSessionActivityByKey((current) => ({ ...current, [key]: Date.now() }));
  }, []);

  const updateFontSizeForSession = useCallback(({ cellId, sessionId, nextSize }) => {
    if (!cellId || !sessionId) {
      return;
    }
    const key = buildSessionKey(cellId, sessionId);
    setSessionFontSizeByKey((current) => ({
      ...current,
      [key]: clampFontSize(nextSize),
    }));
  }, []);

  const selectSession = useCallback(
    (sessionId) => {
      if (!selectedCell) {
        return;
      }
      setActiveSessionByCellId((current) => ({
        ...current,
        [selectedCell.id]: sessionId,
      }));
      updateSessionActivity({ cellId: selectedCell.id, sessionId });
    },
    [selectedCell, updateSessionActivity]
  );

  const createSession = useCallback(
    async (options = {}) => {
      if (!selectedCell || !window.agency?.createSession) {
        return;
      }
      if (tmuxStatus?.available === false) {
        setSessionError(tmuxStatus.error || 'tmux is required. Install tmux and try again.');
        return;
      }
      setSessionLoading(true);
      setSessionError('');
      try {
        const { name, sessionId } = options || {};
        const created = await window.agency.createSession({
          cellId: selectedCell.id,
          worktreePath: selectedCell.worktreePath,
          name: name || undefined,
          sessionId: sessionId || undefined,
        });
        setSessionsByCellId((current) => {
          const currentSessions = current[selectedCell.id] || [];
          const nextSessions = created ? [...currentSessions, created] : currentSessions;
          return { ...current, [selectedCell.id]: nextSessions };
        });
        if (created?.id) {
          setActiveSessionByCellId((current) => ({
            ...current,
            [selectedCell.id]: created.id,
          }));
        }
      } catch (error) {
        setSessionError(error?.message || 'Failed to create session.');
      } finally {
        setSessionLoading(false);
      }
    },
    [selectedCell, tmuxStatus?.available, tmuxStatus?.error]
  );

  const refreshSessions = useCallback(() => {
    if (selectedCell) {
      loadSessionsForCell(selectedCell);
    }
  }, [loadSessionsForCell, selectedCell]);

  const closeSession = useCallback(
    async (sessionId) => {
      if (!selectedCell || !window.agency?.closeSession) {
        return;
      }
      setSessionLoading(true);
      setSessionError('');
      try {
        await window.agency.closeSession({
          worktreePath: selectedCell.worktreePath,
          sessionId,
        });
        await loadSessionsForCell(selectedCell);
      } catch (error) {
        setSessionError(error?.message || 'Failed to close session.');
      } finally {
        setSessionLoading(false);
      }
    },
    [loadSessionsForCell, selectedCell]
  );

  const detachSession = useCallback(
    async (sessionId) => {
      if (!selectedCell || !window.agency?.detachSession) {
        return;
      }
      setSessionLoading(true);
      setSessionError('');
      try {
        await window.agency.detachSession({
          worktreePath: selectedCell.worktreePath,
          sessionId,
        });
        await loadSessionsForCell(selectedCell);
      } catch (error) {
        setSessionError(error?.message || 'Failed to detach session.');
      } finally {
        setSessionLoading(false);
      }
    },
    [loadSessionsForCell, selectedCell]
  );

  const renameSession = useCallback(
    async (sessionId, name) => {
      if (!selectedCell || !window.agency?.renameSession) {
        return;
      }
      setSessionLoading(true);
      setSessionError('');
      try {
        await window.agency.renameSession({
          worktreePath: selectedCell.worktreePath,
          sessionId,
          name,
        });
        await loadSessionsForCell(selectedCell);
      } catch (error) {
        setSessionError(error?.message || 'Failed to rename session.');
      } finally {
        setSessionLoading(false);
      }
    },
    [loadSessionsForCell, selectedCell]
  );

  const zoomIn = useCallback(() => {
    if (!selectedCell || !activeSessionId) {
      return;
    }
    updateFontSizeForSession({
      cellId: selectedCell.id,
      sessionId: activeSessionId,
      nextSize: activeFontSize + 1,
    });
  }, [activeFontSize, activeSessionId, selectedCell, updateFontSizeForSession]);

  const zoomOut = useCallback(() => {
    if (!selectedCell || !activeSessionId) {
      return;
    }
    updateFontSizeForSession({
      cellId: selectedCell.id,
      sessionId: activeSessionId,
      nextSize: activeFontSize - 1,
    });
  }, [activeFontSize, activeSessionId, selectedCell, updateFontSizeForSession]);

  const zoomReset = useCallback(() => {
    if (!selectedCell || !activeSessionId) {
      return;
    }
    updateFontSizeForSession({
      cellId: selectedCell.id,
      sessionId: activeSessionId,
      nextSize: DEFAULT_FONT_SIZE,
    });
  }, [activeSessionId, selectedCell, updateFontSizeForSession]);

  const runActionCommand = useCallback(
    async ({ command, kind, label }) => {
      if (!selectedCell || !command) {
        return;
      }
      onOpenTerminal?.();
      if (kind === 'start') {
        if (tmuxStatus?.available === false) {
          setSessionError(tmuxStatus.error || 'tmux is required. Install tmux and try again.');
          return;
        }
        if (!window.agency?.createSession) {
          return;
        }
        setSessionLoading(true);
        setSessionError('');
        try {
          const created = await window.agency.createSession({
            cellId: selectedCell.id,
            worktreePath: selectedCell.worktreePath,
            name: label ? `CLI - ${label}` : 'CLI',
          });
          if (created?.id) {
            setSessionsByCellId((current) => ({
              ...current,
              [selectedCell.id]: [...(current[selectedCell.id] || []), created],
            }));
            setActiveSessionByCellId((current) => ({
              ...current,
              [selectedCell.id]: created.id,
            }));
          }
          setPendingCommand({ cellId: selectedCell.id, command });
        } catch (error) {
          setSessionError(error?.message || 'Failed to create session.');
        } finally {
          setSessionLoading(false);
        }
        return;
      }
      setPendingCommand({ cellId: selectedCell.id, command });
    },
    [onOpenTerminal, selectedCell, tmuxStatus?.available, tmuxStatus?.error]
  );

  const acknowledgeCommandSent = useCallback((payload) => {
    setPendingCommand((current) => {
      if (!current) {
        return current;
      }
      if (current.cellId !== payload?.cellId || current.command !== payload?.command) {
        return current;
      }
      return null;
    });
  }, []);

  const handleSessionAttached = useCallback(() => {
    if (selectedCell) {
      loadSessionsForCell(selectedCell, { silent: true });
    }
  }, [loadSessionsForCell, selectedCell]);

  const clearSessionError = useCallback(() => setSessionError(''), []);

  return {
    sessions,
    activeSessionId,
    activeSessionKey,
    activeFontSize,
    lastActivityAt,
    sessionLoading,
    sessionError,
    pendingCommand,
    activeSessionByCellId,
    setActiveSessionByCellId,
    loadSessionsForCell,
    refreshSessions,
    createSession,
    closeSession,
    detachSession,
    renameSession,
    selectSession,
    updateSessionActivity,
    zoomIn,
    zoomOut,
    zoomReset,
    runActionCommand,
    acknowledgeCommandSent,
    handleSessionAttached,
    clearSessionError,
  };
}
