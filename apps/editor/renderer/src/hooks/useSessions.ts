import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { disposeTerminalEntry } from '../terminal/terminalManager';
import { pickSessionAvatarId } from '../utils/agentAvatar';
import { BASELINE_PROFILE_ID } from '../utils/terminusSettings';
import {
  closeSession as closeSessionBridge,
  createSession as createSessionBridge,
  detachSession as detachSessionBridge,
  disposeTerminal as disposeTerminalBridge,
  isAgencyMethodAvailable,
  listSessions as listSessionsBridge,
  logRuntime as logRuntimeBridge,
  moveSessionNode as moveSessionNodeBridge,
  prepareSessionContinueOnMobile as prepareSessionContinueOnMobileBridge,
  renameSession as renameSessionBridge,
  updateSessionMeta as updateSessionMetaBridge,
  writeTerminal as writeTerminalBridge,
} from '../services/agencyBridge';
import {
  cancelMainAgentHarnessRun,
  inspectMainAgentHarnessRun,
  onMainAgentHarnessProgress,
  startMainAgentHarnessRun,
} from '../services/mainAgentHarness';
import {
  DEFAULT_FONT_SIZE,
  DETACHED_ACTIVITY_POLL_MS,
  buildSessionKey,
  filterOpenSessions,
  mergeSessionActivityTimestamps,
  normalizeTerminalText,
  resolveActiveSession,
} from './shared/sessionRuntime';
import { useSessionSelectionState } from './shared/useSessionSelectionState';
import { useSessionTraceLogging } from './shared/useSessionTraceLogging';
import { useSessionActivityState } from './shared/useSessionActivityState';

export function useSessions(options: any = {}) {
  const {
    selectedCell,
    cells,
    tmuxStatus,
    onOpenTerminal,
    initialActiveSessions,
  } = options;
  const {
    activeSessionByCellId,
    setActiveSessionByCellId,
    activeSessionByCellIdRef,
    selectionVersionRef,
  } = useSessionSelectionState(initialActiveSessions || {});
  const [sessionsByCellId, setSessionsByCellId] = useState({});
  const detachedPollBusyRef = useRef(false);
  const pendingHarnessRunsRef = useRef<
    Record<
      string,
      {
        clientRequestId: string;
        runId: string;
        cellId: string;
        sourceSessionId: string;
      }
    >
  >({});
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState('');
  const [harnessRunsById, setHarnessRunsById] = useState<Record<string, any>>({});
  const harnessRunsByIdRef = useRef<Record<string, any>>({});
  const [harnessRunOrder, setHarnessRunOrder] = useState<string[]>([]);
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
  const {
    sessionFontSizeByKey,
    sessionActivityByKey,
    sessionVisitedByKey,
    sessionActivityByKeyRef,
    activeFontSize,
    lastActivityAt,
    lastVisitedAt,
    updateSessionActivity,
    updateSessionVisited,
    zoomIn,
    zoomOut,
    zoomReset,
    markSessionAttached,
    resetActivityState,
    mergeSessionActivityState,
  } = useSessionActivityState({
    activeSessionKey,
    selectedCellId: selectedCell?.id,
    activeSessionId,
  });

  useSessionTraceLogging({
    activeSessionByCellId,
    selectedCellId: selectedCell?.id,
    activeSessionId,
    openSessions,
  });

  const loadSessionsForCell = useCallback(
    async (cell, { silent = false } = {}) => {
      if (!cell || !isAgencyMethodAvailable('listSessions')) {
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
      setSessionsByCellId((current) => {
        const existing = current[cell.id];
        if (Array.isArray(existing) && existing.length > 0) {
          return current;
        }
        return {
          ...current,
          [cell.id]: [
            {
              id: 'default',
              name: 'Default',
              status: 'active',
              profileId: BASELINE_PROFILE_ID,
            },
          ],
        };
      });
      activeSessionByCellIdRef.current = {
        ...activeSessionByCellIdRef.current,
        [cell.id]: activeSessionByCellIdRef.current[cell.id] || 'default',
      };
      setActiveSessionByCellId((current) =>
        current[cell.id]
          ? current
          : {
              ...current,
              [cell.id]: 'default',
            }
      );
      try {
        let nextSessions = await listSessionsBridge({ worktreePath: cell.worktreePath });
        if (!Array.isArray(nextSessions)) {
          nextSessions = [];
        }
        if (nextSessions.length === 0 && isAgencyMethodAvailable('createSession')) {
          const created = await createSessionBridge({
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
        mergeSessionActivityState((current: Record<string, number>) =>
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
          if (import.meta.env.DEV) {
            console.debug('[SessionTrace] skip stale session load result', {
              source: 'loadSessionsForCell',
              cellId: cell.id,
              preferredSessionId: preferred || '',
              resolvedSessionId: active?.id || '',
              selectionVersionAtRequest: selectionVersion,
              selectionVersionCurrent: selectionVersionRef.current,
            });
          }
          return;
        }
        if (active?.id && active.id !== preferred) {
          const meta = {
            source: 'loadSessionsForCell-resolve',
            cellId: cell.id,
            preferredSessionId: preferred || '',
            resolvedSessionId: active.id,
            selectedCellId: selectedCell?.id || '',
            sessionCount: nextSessions.length,
          };
          logRuntimeBridge({
            level: 'info',
            message: 'session active pointer resolved from loaded sessions',
            meta,
          });
          if (import.meta.env.DEV) {
            console.debug('[SessionTrace] session active pointer resolved from loaded sessions', meta);
          }
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
    [selectedCell?.id, tmuxStatus?.available, tmuxStatus?.error]
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

  const upsertHarnessRun = useCallback((nextRun: any) => {
    const runId = String(nextRun?.runId || '').trim();
    if (!runId) {
      return;
    }
    setHarnessRunsById((current) => {
      const previous = current[runId] || null;
      const previousTimeline = Array.isArray(previous?.timeline) ? previous.timeline : [];
      const nextTimeline = Array.isArray(nextRun?.timeline) ? nextRun.timeline : previousTimeline;
      return {
        ...current,
        [runId]: {
          ...(previous || {}),
          ...(nextRun || {}),
          timeline: nextTimeline,
        },
      };
    });
    setHarnessRunOrder((current) => {
      const next = [runId, ...current.filter((item) => item !== runId)];
      return next.slice(0, 8);
    });
  }, []);

  useEffect(() => {
    harnessRunsByIdRef.current = harnessRunsById;
  }, [harnessRunsById]);

  const isHarnessEventRelevant = useCallback((event: any) => {
    const runId = String(event?.runId || '').trim();
    const clientRequestId = String(event?.clientRequestId || '').trim();
    if (!runId) {
      return false;
    }
    if (harnessRunsByIdRef.current[runId]) {
      return true;
    }
    return Object.values(pendingHarnessRunsRef.current).some((pending) => {
      return (
        String(pending?.runId || '').trim() === runId ||
        (clientRequestId && String(pending?.clientRequestId || '').trim() === clientRequestId)
      );
    });
  }, []);

  const applyHarnessProgressEvent = useCallback((event: any) => {
    const runId = String(event?.runId || '').trim();
    if (!runId) {
      return;
    }
    const entry = event?.entry || null;
    setHarnessRunsById((current) => {
      const previous = current[runId] || {
        runId,
        timeline: [],
      };
      const previousTimeline = Array.isArray(previous?.timeline) ? previous.timeline : [];
      const nextTimeline =
        entry && !previousTimeline.some((item) => item?.id === entry?.id)
          ? [...previousTimeline, entry]
          : previousTimeline;
      return {
        ...current,
        [runId]: {
          ...previous,
          status: event?.status || previous.status || '',
          currentStep: event?.currentStep ?? previous.currentStep ?? null,
          progress: event?.progress ?? previous.progress ?? null,
          result: event?.result ?? previous.result ?? null,
          failures: event?.failures ?? previous.failures ?? [],
          owner: event?.owner ?? previous.owner ?? null,
          clientRequestId: event?.clientRequestId || previous.clientRequestId || '',
          timeline: nextTimeline,
          updatedAt: entry?.at || previous.updatedAt || '',
        },
      };
    });
    setHarnessRunOrder((current) => {
      const next = [runId, ...current.filter((item) => item !== runId)];
      return next.slice(0, 8);
    });
  }, []);

  const harnessRuns = useMemo(
    () =>
      harnessRunOrder
        .map((runId) => harnessRunsById[runId])
        .filter(Boolean),
    [harnessRunOrder, harnessRunsById]
  );

  const settlePendingHarnessRun = useCallback(
    async ({
      runId,
      clientRequestId,
      runSnapshot,
    }: {
      runId?: string;
      clientRequestId?: string;
      runSnapshot?: any;
    }) => {
      const normalizedClientRequestId = String(clientRequestId || '').trim();
      const normalizedRunId = String(runId || runSnapshot?.runId || '').trim();
      const pendingKey =
        (normalizedClientRequestId &&
          pendingHarnessRunsRef.current[normalizedClientRequestId] &&
          normalizedClientRequestId) ||
        Object.keys(pendingHarnessRunsRef.current).find(
          (key) => pendingHarnessRunsRef.current[key]?.runId === normalizedRunId
        ) ||
        '';
      if (!pendingKey) {
        return false;
      }
      const pending = pendingHarnessRunsRef.current[pendingKey];
      if (!pending?.cellId) {
        return false;
      }
      const targetRunId = normalizedRunId || String(pending?.runId || '').trim();
      if (!targetRunId) {
        return false;
      }
      const run = runSnapshot || (await inspectMainAgentHarnessRun({ runId: targetRunId }));
      upsertHarnessRun(run);
      const status = String(run?.status || '').trim().toLowerCase();
      if (!['succeeded', 'failed', 'cancelled'].includes(status)) {
        return false;
      }
      delete pendingHarnessRunsRef.current[pendingKey];
      const targetCell = resolveCell(pending.cellId);
      if (!targetCell) {
        return true;
      }
      if (status !== 'succeeded') {
        const failureMessage =
          run?.failures?.[0]?.message ||
          (status === 'cancelled' ? 'Harness run was cancelled.' : 'Harness run failed.');
        setSessionError(failureMessage);
        return true;
      }
      const created =
        run?.result?.agent?.session ||
        run?.progress?.outputsByStepId?.['create-agent']?.session ||
        null;
      await loadSessionsForCell(targetCell, { silent: true });
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
      return true;
    },
    [loadSessionsForCell, resolveCell, setActiveSessionByCellId, upsertHarnessRun]
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

  useLayoutEffect(() => {
    if (!selectedCell) {
      return;
    }
    loadSessionsForCell(selectedCell);
  }, [selectedCell?.id, tmuxStatus?.available, loadSessionsForCell]);

  const sendSessionText = useCallback(({ cellId, sessionId, text }) => {
    if (!cellId || !sessionId || !isAgencyMethodAvailable('writeTerminal')) {
      return false;
    }
    const payload = normalizeTerminalText(text);
    if (!payload) {
      return false;
    }
    writeTerminalBridge({ cellId, sessionId, data: payload });
    return true;
  }, []);

  const selectSession = useCallback(
    (sessionId, cellIdOverride = undefined) => {
      const cellId = cellIdOverride || selectedCell?.id;
      if (!cellId) {
        return;
      }
      if (activeSessionByCellIdRef.current[cellId] === sessionId) {
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
      const meta = {
        source: 'selectSession',
        cellId,
        sessionId,
        selectedCellId: selectedCell?.id || '',
        selectionVersion: selectionVersionRef.current,
      };
      logRuntimeBridge({
        level: 'info',
        message: 'session selected',
        meta,
      });
      if (import.meta.env.DEV) {
        console.debug('[SessionTrace] session selected', meta);
      }
    },
    [selectedCell?.id, updateSessionVisited]
  );

  const createSessionForCell = useCallback(
    async (cellInput, options: any = {}) => {
      const targetCell =
        cellInput && typeof cellInput === 'object' ? cellInput : resolveCell(cellInput);
      if (!targetCell || !isAgencyMethodAvailable('createSession')) {
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
        const {
          name,
          sessionId,
          profileId,
          avatar,
          parentSessionId,
          nodeKind,
          sourceSessionId,
          smartFork,
        } = options || {};
        if (smartFork) {
          const sourceSessionIdValue = sourceSessionId || parentSessionId || sessionId;
          const clientRequestId = `fork-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
          if (!sourceSessionIdValue) {
            throw new Error('Fork source session is required.');
          }
          const hasPendingFork = Object.values(pendingHarnessRunsRef.current).some(
            (item) =>
              item?.cellId === targetCell.id &&
              item?.sourceSessionId === sourceSessionIdValue
          );
          if (hasPendingFork) {
            throw new Error('A Fork run is already active for this session.');
          }
          pendingHarnessRunsRef.current = {
            ...pendingHarnessRunsRef.current,
            [clientRequestId]: {
              clientRequestId,
              runId: '',
              cellId: targetCell.id,
              sourceSessionId: sourceSessionIdValue,
            },
          };
          try {
            const harnessRun = await startMainAgentHarnessRun({
              clientRequestId,
              sourceSurface: 'agent-cells',
              callerType: 'renderer',
              callerId: 'agent-cells-fork',
              goal: {
                type: 'create_agent',
                title: 'Create Agent via Fork',
                instruction:
                  'Create a child execution lane from the selected session using a tool-native fork specialization when available.',
              },
              requestedCapabilities: ['session.runtime'],
              contextRefs: [
                {
                  type: 'cell',
                  cellId: targetCell.id,
                  worktreePath: targetCell.worktreePath,
                },
                {
                  type: 'session',
                  sessionId: sourceSessionIdValue,
                },
              ],
              runner: {
                adapterId: 'agent_backed',
                providerId: 'codex_cli',
                steps: [
                  {
                    id: 'create-agent',
                    kind: 'create_agent',
                    title: 'Create Agent from selected session',
                    skillPackId: 'session.tool-native-fork',
                    agent: {
                      strategy: 'tool_native_fork',
                      sessionRuntime: {
                        worktreePath: targetCell.worktreePath,
                        cellId: targetCell.id,
                        cellName: targetCell.name,
                        cellBranch: targetCell.branch,
                        sessionId: sourceSessionIdValue,
                      },
                    },
                  },
                ],
              },
            });
            upsertHarnessRun(harnessRun);
            const runId = String(harnessRun?.runId || '').trim();
            if (!runId) {
              throw new Error('Harness run did not return a runId.');
            }
            pendingHarnessRunsRef.current = {
              ...pendingHarnessRunsRef.current,
              [clientRequestId]: {
                ...(pendingHarnessRunsRef.current[clientRequestId] || {
                  clientRequestId,
                  cellId: targetCell.id,
                  sourceSessionId: sourceSessionIdValue,
                }),
                clientRequestId,
                runId,
                cellId: targetCell.id,
                sourceSessionId: sourceSessionIdValue,
              },
            };
            if (
              !(await settlePendingHarnessRun({
                runId,
                clientRequestId,
                runSnapshot: harnessRun,
              }))
            ) {
              const currentRun = await inspectMainAgentHarnessRun({ runId }).catch(() => null);
              if (currentRun) {
                await settlePendingHarnessRun({
                  runId,
                  clientRequestId,
                  runSnapshot: currentRun,
                });
              }
            }
          } catch (error) {
            const nextPending = { ...pendingHarnessRunsRef.current };
            delete nextPending[clientRequestId];
            pendingHarnessRunsRef.current = nextPending;
            throw error;
          }
          return null;
        }
        const preferredAvatar =
          avatar || pickSessionAvatarId(sessionsByCellId[targetCell.id] || []);
        const created = await createSessionBridge({
          cellId: targetCell.id,
          worktreePath: targetCell.worktreePath,
          name: name || undefined,
          sessionId: sessionId || undefined,
          profileId: profileId || BASELINE_PROFILE_ID,
          avatar: preferredAvatar,
          cellName: targetCell.name,
          cellBranch: targetCell.branch,
          parentSessionId: parentSessionId || null,
          nodeKind: nodeKind || undefined,
          sourceSessionId: sourceSessionId || null,
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
      settlePendingHarnessRun,
      tmuxStatus?.available,
      tmuxStatus?.error,
      upsertHarnessRun,
      loadSessionsForCell,
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
      if (!targetCell || !isAgencyMethodAvailable('closeSession')) {
        return;
      }
      setSessionLoading(true);
      setSessionError('');
      try {
        await closeSessionBridge({
          worktreePath: targetCell.worktreePath,
          sessionId,
        });
        disposeTerminalBridge({ cellId: targetCell.id, sessionId });
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
      if (!targetCell || !isAgencyMethodAvailable('detachSession')) {
        return;
      }
      setSessionLoading(true);
      setSessionError('');
      try {
        await detachSessionBridge({
          worktreePath: targetCell.worktreePath,
          sessionId,
        });
        disposeTerminalBridge({ cellId: targetCell.id, sessionId });
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
      if (!targetCell || !isAgencyMethodAvailable('renameSession')) {
        return;
      }
      setSessionLoading(true);
      setSessionError('');
      try {
        await renameSessionBridge({
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
      if (!targetCell || !isAgencyMethodAvailable('updateSessionMeta')) {
        return;
      }
      setSessionLoading(true);
      setSessionError('');
      try {
        const updated = await updateSessionMetaBridge({
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

  const moveSessionNode = useCallback(
    async (sessionId, { parentSessionId = null, beforeSessionId = null } = {}, cellIdOverride) => {
      const targetCell = resolveCell(cellIdOverride) || selectedCell;
      if (!targetCell || !sessionId || !isAgencyMethodAvailable('moveSessionNode')) {
        return null;
      }
      setSessionLoading(true);
      setSessionError('');
      try {
        const moved = await moveSessionNodeBridge({
          worktreePath: targetCell.worktreePath,
          sessionId,
          parentSessionId,
          beforeSessionId,
        });
        await loadSessionsForCell(targetCell, { silent: true });
        return moved || null;
      } catch (error) {
        setSessionError(error?.message || 'Failed to move session.');
        return null;
      } finally {
        setSessionLoading(false);
      }
    },
    [loadSessionsForCell, resolveCell, selectedCell]
  );

  const prepareSessionContinueOnMobile = useCallback(
    async (sessionId, cellIdOverride, mode = 'direct') => {
      const targetCell = resolveCell(cellIdOverride) || selectedCell;
      if (!targetCell || !isAgencyMethodAvailable('prepareSessionContinueOnMobile')) {
        return null;
      }
      setSessionError('');
      try {
        return await prepareSessionContinueOnMobileBridge({
          worktreePath: targetCell.worktreePath,
          sessionId,
          mode,
        });
      } catch (error) {
        setSessionError(error?.message || 'Failed to prepare mobile continuation command.');
        throw error;
      }
    },
    [resolveCell, selectedCell]
  );

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
        if (!isAgencyMethodAvailable('createSession')) {
          return;
        }
        setSessionLoading(true);
        setSessionError('');
        try {
          const preferredAvatar = pickSessionAvatarId(sessionsByCellId[targetCell.id] || []);
          const created = await createSessionBridge({
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
    ({ cellId, sessionId }: any = {}) => {
      markSessionAttached({ cellId, sessionId });
      if (selectedCell) {
        loadSessionsForCell(selectedCell, { silent: true });
      }
    },
    [loadSessionsForCell, markSessionAttached, selectedCell]
  );

  const clearSessionError = useCallback(() => setSessionError(''), []);

  const cancelHarnessRun = useCallback(
    async (runId: string) => {
      const normalizedRunId = String(runId || '').trim();
      if (!normalizedRunId) {
        return null;
      }
      try {
        const nextRun = await cancelMainAgentHarnessRun({
          runId: normalizedRunId,
          reason: 'user-requested-from-panel',
        });
        upsertHarnessRun(nextRun);
        return nextRun;
      } catch (error: any) {
        setSessionError(error?.message || 'Failed to cancel harness run.');
        return null;
      }
    },
    [upsertHarnessRun]
  );

  const resetSessions = useCallback(() => {
    pendingHarnessRunsRef.current = {};
    setHarnessRunsById({});
    setHarnessRunOrder([]);
    setSessionsByCellId({});
    setActiveSessionByCellId({});
    activeSessionByCellIdRef.current = {};
    resetActivityState();
    setSessionError('');
    setPendingCommand(null);
  }, [resetActivityState, setActiveSessionByCellId, activeSessionByCellIdRef]);

  useEffect(() => {
    const unsubscribe = onMainAgentHarnessProgress?.((event: any) => {
      const runId = String(event?.runId || '').trim();
      const clientRequestId = String(event?.clientRequestId || '').trim();
      if (!isHarnessEventRelevant(event)) {
        return;
      }
      applyHarnessProgressEvent(event);
      if (!runId || !event?.terminal) {
        return;
      }
      void settlePendingHarnessRun({ runId, clientRequestId }).catch((error: any) => {
        setSessionError(error?.message || 'Harness run failed.');
      });
    });
    return () => {
      unsubscribe?.();
    };
  }, [applyHarnessProgressEvent, isHarnessEventRelevant, settlePendingHarnessRun]);

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
    harnessRuns,
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
    moveSessionNode,
    prepareSessionContinueOnMobile,
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
    cancelHarnessRun,
    clearSessionError,
    resetSessions,
  };
}
