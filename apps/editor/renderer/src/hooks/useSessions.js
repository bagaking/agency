import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { disposeTerminalEntry } from '../terminal/terminalManager.js';
import { pickSessionAvatarId } from '../utils/agentAvatar.js';
import { BASELINE_PROFILE_ID } from '../utils/terminusSettings.js';
import {
  ACTIVITY_BOOTSTRAP_THRESHOLD_MS,
  ATTACH_ACTIVITY_GRACE_MS,
  DEFAULT_FONT_SIZE,
  DETACHED_ACTIVITY_POLL_MS,
  buildSessionKey,
  clampFontSize,
  filterOpenSessions,
  mergeSessionActivityTimestamps,
  normalizeTerminalText,
  resolveActiveSession,
} from './shared/sessionRuntime.js';

export function useSessions({
  selectedCell,
  cells,
  tmuxStatus,
  onOpenTerminal,
  initialActiveSessions,
}) {
  const [activeSessionByCellId, setActiveSessionByCellId] = useState(
    initialActiveSessions || {}
  );
  const activeSessionByCellIdRef = useRef(initialActiveSessions || {});
  const selectionVersionRef = useRef(0);
  const [sessionsByCellId, setSessionsByCellId] = useState({});
  const [sessionFontSizeByKey, setSessionFontSizeByKey] = useState({});
  const [sessionActivityByKey, setSessionActivityByKey] = useState({});
  const [sessionVisitedByKey, setSessionVisitedByKey] = useState({});
  const sessionActivityByKeyRef = useRef({});
  const activityBootstrapByKeyRef = useRef({});
  const activityIgnoreUntilByKeyRef = useRef({});
  const detachedPollBusyRef = useRef(false);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState('');
  const [pendingCommand, setPendingCommand] = useState(null);
  const cellsById = useMemo(() => {
    const list = Array.isArray(cells) ? cells : [];
    return new Map(list.filter(Boolean).map((cell) => [cell.id, cell]));
  }, [cells]);
  const resolveCell = useCallback(
    (cellId) => {
      if (!cellId) {
        return selectedCell || null;
      }
      if (selectedCell?.id === cellId) {
        return selectedCell;
      }
      return cellsById.get(cellId) || null;
    },
    [cellsById, selectedCell]
  );

  useEffect(() => {
    if (initialActiveSessions && typeof initialActiveSessions === 'object') {
      setActiveSessionByCellId(initialActiveSessions);
      activeSessionByCellIdRef.current = initialActiveSessions;
    }
  }, [initialActiveSessions]);

  useEffect(() => {
    activeSessionByCellIdRef.current = activeSessionByCellId;
  }, [activeSessionByCellId]);

  useEffect(() => {
    sessionActivityByKeyRef.current = sessionActivityByKey;
  }, [sessionActivityByKey]);

  const sessions = selectedCell ? sessionsByCellId[selectedCell.id] || [] : [];
  const detachedPollCells = useMemo(() => {
    const entries = Object.entries(sessionsByCellId || {});
    if (!entries.length) {
      return [];
    }
    const list = [];
    entries.forEach(([cellId, cellSessions]) => {
      if (!Array.isArray(cellSessions)) {
        return;
      }
      if (!cellSessions.some((session) => session.status === 'detached')) {
        return;
      }
      const cell = cellsById.get(cellId);
      if (cell) {
        list.push(cell);
      }
    });
    return list;
  }, [cellsById, sessionsByCellId]);

  const openSessions = useMemo(() => {
    const preferred = activeSessionByCellId[selectedCell?.id];
    return filterOpenSessions(sessions, preferred);
  }, [sessions, activeSessionByCellId, selectedCell?.id]);

  const preferredSessionId = selectedCell ? activeSessionByCellId[selectedCell.id] : undefined;
  const activeSession = selectedCell
    ? resolveActiveSession({ openSessions, preferredSessionId })
    : null;
  const activeSessionId = activeSession?.id;
  const activeSessionKey =
    selectedCell && activeSessionId ? buildSessionKey(selectedCell.id, activeSessionId) : null;
  const activeFontSize = activeSessionKey
    ? sessionFontSizeByKey[activeSessionKey] || DEFAULT_FONT_SIZE
    : DEFAULT_FONT_SIZE;
  const lastActivityAt = activeSessionKey ? sessionActivityByKey[activeSessionKey] : null;
  const lastVisitedAt = activeSessionKey ? sessionVisitedByKey[activeSessionKey] : null;

  const loadSessionsForCell = useCallback(
    async (cell, { silent = false } = {}) => {
      if (!cell || !window.agency?.listSessions) {
        return;
      }
      const selectionVersion = selectionVersionRef.current;
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
            profileId: BASELINE_PROFILE_ID,
            cellName: cell.name,
            cellBranch: cell.branch,
          });
          nextSessions = created ? [created] : nextSessions;
        }
        setSessionsByCellId((current) => ({ ...current, [cell.id]: nextSessions }));
        setSessionActivityByKey((current) =>
          mergeSessionActivityTimestamps({
            current,
            cellId: cell.id,
            sessions: nextSessions,
          })
        );

        const preferred = activeSessionByCellIdRef.current[cell.id];
        const open = filterOpenSessions(nextSessions, preferred);
        const active = resolveActiveSession({ openSessions: open, preferredSessionId: preferred });
        if (selectionVersionRef.current !== selectionVersion) {
          return;
        }
        if (active?.id && active.id !== preferred) {
          activeSessionByCellIdRef.current = {
            ...activeSessionByCellIdRef.current,
            [cell.id]: active.id,
          };
        }
        setActiveSessionByCellId((current) => {
          const nextId = active?.id;
          if (!nextId) {
            if (!current[cell.id]) {
              return current;
            }
            const next = { ...current };
            delete next[cell.id];
            return next;
          }
          if (current[cell.id] === nextId) {
            return current;
          }
          return {
            ...current,
            [cell.id]: nextId,
          };
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
    [tmuxStatus?.available, tmuxStatus?.error]
  );

  const refreshSessionsForCells = useCallback(
    async (cellsList, { silent = true } = {}) => {
      const list = Array.isArray(cellsList) ? cellsList : [];
      if (list.length === 0) {
        return;
      }
      await Promise.all(
        list.map((cell) => loadSessionsForCell(cell, { silent }))
      );
    },
    [loadSessionsForCell]
  );

  useEffect(() => {
    if (!detachedPollCells.length) {
      return undefined;
    }
    let canceled = false;
    const poll = async () => {
      if (canceled || detachedPollBusyRef.current) {
        return;
      }
      detachedPollBusyRef.current = true;
      try {
        await refreshSessionsForCells(detachedPollCells, { silent: true });
      } finally {
        detachedPollBusyRef.current = false;
      }
    };
    poll();
    const interval = setInterval(poll, DETACHED_ACTIVITY_POLL_MS);
    return () => {
      canceled = true;
      clearInterval(interval);
    };
  }, [detachedPollCells, refreshSessionsForCells]);

  useEffect(() => {
    if (!selectedCell) {
      return;
    }
    loadSessionsForCell(selectedCell);
  }, [selectedCell?.id, tmuxStatus?.available, loadSessionsForCell]);

  const updateSessionActivity = useCallback(({ cellId, sessionId }) => {
    if (!cellId || !sessionId) {
      return;
    }
    const key = buildSessionKey(cellId, sessionId);
    const now = Date.now();
    const ignoreUntil = activityIgnoreUntilByKeyRef.current[key];
    if (Number.isFinite(ignoreUntil)) {
      if (now < ignoreUntil) {
        return;
      }
      delete activityIgnoreUntilByKeyRef.current[key];
    }
    if (activityBootstrapByKeyRef.current[key]) {
      delete activityBootstrapByKeyRef.current[key];
      return;
    }
    setSessionActivityByKey((current) => ({ ...current, [key]: now }));
  }, []);

  const sendSessionText = useCallback(({ cellId, sessionId, text }) => {
    if (!cellId || !sessionId || !window.agency?.writeTerminal) {
      return false;
    }
    const payload = normalizeTerminalText(text);
    if (!payload) {
      return false;
    }
    window.agency.writeTerminal({ cellId, sessionId, data: payload });
    return true;
  }, []);

  const updateSessionVisited = useCallback(({ cellId, sessionId }) => {
    if (!cellId || !sessionId) {
      return;
    }
    const key = buildSessionKey(cellId, sessionId);
    setSessionVisitedByKey((current) => ({ ...current, [key]: Date.now() }));
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
    (sessionId, cellIdOverride) => {
      const cellId = cellIdOverride || selectedCell?.id;
      if (!cellId) {
        return;
      }
      selectionVersionRef.current += 1;
      activeSessionByCellIdRef.current = {
        ...activeSessionByCellIdRef.current,
        [cellId]: sessionId,
      };
      setActiveSessionByCellId((current) => ({
        ...current,
        [cellId]: sessionId,
      }));
      updateSessionVisited({ cellId, sessionId });
    },
    [selectedCell?.id, updateSessionVisited]
  );

  const createSessionForCell = useCallback(
    async (cellInput, options = {}) => {
      const targetCell =
        cellInput && typeof cellInput === 'object' ? cellInput : resolveCell(cellInput);
      if (!targetCell || !window.agency?.createSession) {
        return null;
      }
      const shouldOpenTerminal = targetCell.id === selectedCell?.id;
      if (shouldOpenTerminal) {
        onOpenTerminal?.();
      }
      if (tmuxStatus?.available === false) {
        setSessionError(tmuxStatus.error || 'tmux is required. Install tmux and try again.');
        return null;
      }
      setSessionLoading(true);
      setSessionError('');
      try {
        const { name, sessionId, profileId, avatar } = options || {};
        const preferredAvatar =
          avatar || pickSessionAvatarId(sessionsByCellId[targetCell.id] || []);
        const created = await window.agency.createSession({
          cellId: targetCell.id,
          worktreePath: targetCell.worktreePath,
          name: name || undefined,
          sessionId: sessionId || undefined,
          profileId: profileId || BASELINE_PROFILE_ID,
          avatar: preferredAvatar,
          cellName: targetCell.name,
          cellBranch: targetCell.branch,
        });
        setSessionsByCellId((current) => {
          const currentSessions = current[targetCell.id] || [];
          const nextSessions = created ? [...currentSessions, created] : currentSessions;
          return { ...current, [targetCell.id]: nextSessions };
        });
        if (created?.id) {
          selectionVersionRef.current += 1;
          activeSessionByCellIdRef.current = {
            ...activeSessionByCellIdRef.current,
            [targetCell.id]: created.id,
          };
          setActiveSessionByCellId((current) => ({
            ...current,
            [targetCell.id]: created.id,
          }));
        }
        return created || null;
      } catch (error) {
        setSessionError(error?.message || 'Failed to create session.');
        return null;
      } finally {
        setSessionLoading(false);
      }
    },
    [
      onOpenTerminal,
      resolveCell,
      selectedCell?.id,
      sessionsByCellId,
      tmuxStatus?.available,
      tmuxStatus?.error,
    ]
  );

  const createSession = useCallback(
    async (options = {}) => {
      if (!selectedCell) {
        return null;
      }
      return createSessionForCell(selectedCell, options);
    },
    [createSessionForCell, selectedCell]
  );

  const refreshSessions = useCallback(() => {
    if (selectedCell) {
      loadSessionsForCell(selectedCell);
    }
  }, [loadSessionsForCell, selectedCell]);

  const closeSession = useCallback(
    async (sessionId, cellIdOverride) => {
      const targetCell = resolveCell(cellIdOverride) || selectedCell;
      if (!targetCell || !window.agency?.closeSession) {
        return;
      }
      setSessionLoading(true);
      setSessionError('');
      try {
        await window.agency.closeSession({
          worktreePath: targetCell.worktreePath,
          sessionId,
        });
        window.agency?.disposeTerminal?.({ cellId: targetCell.id, sessionId });
        disposeTerminalEntry({ cellId: targetCell.id, sessionId });
        await loadSessionsForCell(targetCell);
      } catch (error) {
        setSessionError(error?.message || 'Failed to close session.');
      } finally {
        setSessionLoading(false);
      }
    },
    [loadSessionsForCell, resolveCell, selectedCell]
  );

  const detachSession = useCallback(
    async (sessionId, cellIdOverride) => {
      const targetCell = resolveCell(cellIdOverride) || selectedCell;
      if (!targetCell || !window.agency?.detachSession) {
        return;
      }
      setSessionLoading(true);
      setSessionError('');
      try {
        await window.agency.detachSession({
          worktreePath: targetCell.worktreePath,
          sessionId,
        });
        window.agency?.disposeTerminal?.({ cellId: targetCell.id, sessionId });
        disposeTerminalEntry({ cellId: targetCell.id, sessionId });
        await loadSessionsForCell(targetCell);
      } catch (error) {
        setSessionError(error?.message || 'Failed to detach session.');
      } finally {
        setSessionLoading(false);
      }
    },
    [loadSessionsForCell, resolveCell, selectedCell]
  );

  const renameSession = useCallback(
    async (sessionId, name, cellIdOverride) => {
      const targetCell = resolveCell(cellIdOverride) || selectedCell;
      if (!targetCell || !window.agency?.renameSession) {
        return;
      }
      setSessionLoading(true);
      setSessionError('');
      try {
        await window.agency.renameSession({
          worktreePath: targetCell.worktreePath,
          sessionId,
          name,
        });
        await loadSessionsForCell(targetCell);
      } catch (error) {
        setSessionError(error?.message || 'Failed to rename session.');
      } finally {
        setSessionLoading(false);
      }
    },
    [loadSessionsForCell, resolveCell, selectedCell]
  );

  const updateSessionAvatar = useCallback(
    async (sessionId, avatar, cellIdOverride) => {
      const targetCell = resolveCell(cellIdOverride) || selectedCell;
      if (!targetCell || !window.agency?.updateSessionMeta) {
        return;
      }
      setSessionLoading(true);
      setSessionError('');
      try {
        const updated = await window.agency.updateSessionMeta({
          worktreePath: targetCell.worktreePath,
          sessionId,
          avatar,
        });
        if (updated) {
          setSessionsByCellId((current) => {
            const nextSessions = (current[targetCell.id] || []).map((session) =>
              session.id === sessionId ? { ...session, ...updated } : session
            );
            return { ...current, [targetCell.id]: nextSessions };
          });
        } else {
          await loadSessionsForCell(targetCell);
        }
      } catch (error) {
        setSessionError(error?.message || 'Failed to update session avatar.');
      } finally {
        setSessionLoading(false);
      }
    },
    [loadSessionsForCell, resolveCell, selectedCell]
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

  const dispatchSessionCommand = useCallback(
    async ({
      command,
      kind,
      label,
      sessionId,
      appendEnter,
      doubleEnter,
      profileId,
      cellId,
      worktreePath,
    }) => {
      if (!command) {
        return;
      }
      const targetCell = resolveCell(cellId);
      if (!targetCell) {
        return;
      }
      const shouldAppendEnter = appendEnter ?? kind === 'dispatch';
      const shouldDoubleEnter = doubleEnter ?? false;
      if (targetCell.id === selectedCell?.id) {
        onOpenTerminal?.();
      }
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
          const preferredAvatar = pickSessionAvatarId(sessionsByCellId[targetCell.id] || []);
          const created = await window.agency.createSession({
            cellId: targetCell.id,
            worktreePath: worktreePath || targetCell.worktreePath,
            name: label ? `CLI - ${label}` : 'CLI',
            profileId: profileId || BASELINE_PROFILE_ID,
            avatar: preferredAvatar,
            cellName: targetCell.name,
            cellBranch: targetCell.branch,
          });
          if (created?.id) {
            setSessionsByCellId((current) => ({
              ...current,
              [targetCell.id]: [...(current[targetCell.id] || []), created],
            }));
            setActiveSessionByCellId((current) => ({
              ...current,
              [targetCell.id]: created.id,
            }));
          }
          setPendingCommand({
            cellId: targetCell.id,
            command,
            sessionId,
            appendEnter: shouldAppendEnter,
            doubleEnter: shouldDoubleEnter,
          });
        } catch (error) {
          setSessionError(error?.message || 'Failed to create session.');
        } finally {
          setSessionLoading(false);
        }
        return;
      }
      setPendingCommand({
        cellId: targetCell.id,
        command,
        sessionId,
        appendEnter: shouldAppendEnter,
        doubleEnter: shouldDoubleEnter,
      });
    },
    [onOpenTerminal, resolveCell, selectedCell?.id, sessionsByCellId, tmuxStatus?.available, tmuxStatus?.error]
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

  const handleSessionAttached = useCallback(
    ({ cellId, sessionId } = {}) => {
      if (cellId && sessionId) {
        const key = buildSessionKey(cellId, sessionId);
        const lastActivity = sessionActivityByKeyRef.current[key];
        if (
          Number.isFinite(lastActivity) &&
          Date.now() - lastActivity > ACTIVITY_BOOTSTRAP_THRESHOLD_MS
        ) {
          activityIgnoreUntilByKeyRef.current[key] = Date.now() + ATTACH_ACTIVITY_GRACE_MS;
          activityBootstrapByKeyRef.current[key] = true;
        } else {
          delete activityIgnoreUntilByKeyRef.current[key];
          delete activityBootstrapByKeyRef.current[key];
        }
      }
      if (selectedCell) {
        loadSessionsForCell(selectedCell, { silent: true });
      }
    },
    [loadSessionsForCell, selectedCell]
  );

  const clearSessionError = useCallback(() => setSessionError(''), []);

  const resetSessions = useCallback(() => {
    setSessionsByCellId({});
    setActiveSessionByCellId({});
    activeSessionByCellIdRef.current = {};
    setSessionFontSizeByKey({});
    setSessionActivityByKey({});
    setSessionVisitedByKey({});
    activityIgnoreUntilByKeyRef.current = {};
    setSessionError('');
    setPendingCommand(null);
  }, []);

  return {
    sessions,
    sessionsByCellId,
    activeSessionId,
    activeSessionKey,
    activeFontSize,
    sessionFontSizeByKey,
    lastActivityAt,
    lastVisitedAt,
    sessionActivityByKey,
    sessionVisitedByKey,
    sessionLoading,
    sessionError,
    pendingCommand,
    activeSessionByCellId,
    setActiveSessionByCellId,
    loadSessionsForCell,
    refreshSessions,
    refreshSessionsForCells,
    createSession,
    createSessionForCell,
    closeSession,
    detachSession,
    renameSession,
    updateSessionAvatar,
    selectSession,
    updateSessionActivity,
    sendSessionText,
    updateSessionVisited,
    zoomIn,
    zoomOut,
    zoomReset,
    dispatchSessionCommand,
    acknowledgeCommandSent,
    handleSessionAttached,
    clearSessionError,
    resetSessions,
  };
}
