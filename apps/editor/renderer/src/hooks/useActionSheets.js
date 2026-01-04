import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  listActionSheets,
  readActionSheet,
  createActionSheet,
  updateActionSheetStatus,
  updateActionSheetPlan,
  updateActionSheetPrompt,
  updateActionSheetChecks,
  runActionSheetChecks,
} from '../services/agencyBridge.js';
import { buildActionSheetPromptText } from '../utils/actionSheetPrompt.js';

const DEFAULT_CONDITIONAL = {
  enabled: true,
  when: 'checks.all_passed',
  repeat: { maxAttempts: 3, cooldownMs: 60000 },
  followupPrompt: '',
};

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function useActionSheets({
  worktreePath,
  selectedCellId,
  runActionCommand,
  onOpenTerminal,
  onSelectSession,
  onSwitchView,
}) {
  const [sheets, setSheets] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [selectedSheet, setSelectedSheet] = useState(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const runnerTimersRef = useRef(new Map());

  const refreshList = useCallback(async () => {
    if (!worktreePath || !listActionSheets) {
      setSheets([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await listActionSheets({ worktreePath });
      setSheets(Array.isArray(result) ? result : []);
    } catch (loadError) {
      setError(loadError?.message || 'Failed to load Action Sheets.');
    } finally {
      setLoading(false);
    }
  }, [worktreePath]);

  const loadSheet = useCallback(
    async (id) => {
      if (!worktreePath || !id || !readActionSheet) {
        setSelectedSheet(null);
        return;
      }
      setDetailLoading(true);
      setError('');
      try {
        const sheet = await readActionSheet({ worktreePath, id });
        setSelectedSheet(sheet || null);
      } catch (loadError) {
        setError(loadError?.message || 'Failed to load Action Sheet.');
        setSelectedSheet(null);
      } finally {
        setDetailLoading(false);
      }
    },
    [worktreePath]
  );

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  useEffect(() => {
    setSelectedId('');
    setSelectedSheet(null);
  }, [worktreePath]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedSheet(null);
      return;
    }
    loadSheet(selectedId);
  }, [loadSheet, selectedId]);

  const createSheet = useCallback(
    async (payload) => {
      if (!worktreePath || !createActionSheet) {
        return null;
      }
      setError('');
      const created = await createActionSheet({
        worktreePath,
        payload,
      });
      if (created?.id) {
        await refreshList();
        setSelectedId(created.id);
      }
      return created;
    },
    [refreshList, worktreePath]
  );

  const updateSheetStatus = useCallback(
    async (id, patch) => {
      if (!worktreePath || !id || !updateActionSheetStatus) {
        return null;
      }
      const updated = await updateActionSheetStatus({ worktreePath, id, patch });
      await refreshList();
      if (id === selectedId) {
        setSelectedSheet((current) =>
          current ? { ...current, status: { ...current.status, ...updated } } : current
        );
      }
      return updated;
    },
    [refreshList, selectedId, worktreePath]
  );

  const updateSheetPlan = useCallback(
    async (id, plan) => {
      if (!worktreePath || !id || !updateActionSheetPlan) {
        return null;
      }
      const updated = await updateActionSheetPlan({ worktreePath, id, plan });
      if (id === selectedId) {
        setSelectedSheet(updated);
      }
      await refreshList();
      return updated;
    },
    [refreshList, selectedId, worktreePath]
  );

  const updateSheetPrompt = useCallback(
    async (id, prompt) => {
      if (!worktreePath || !id || !updateActionSheetPrompt) {
        return null;
      }
      const updated = await updateActionSheetPrompt({ worktreePath, id, prompt });
      if (id === selectedId) {
        setSelectedSheet(updated);
      }
      await refreshList();
      return updated;
    },
    [refreshList, selectedId, worktreePath]
  );

  const updateSheetChecks = useCallback(
    async (id, checks) => {
      if (!worktreePath || !id || !updateActionSheetChecks) {
        return null;
      }
      const updated = await updateActionSheetChecks({ worktreePath, id, checks });
      if (id === selectedId) {
        setSelectedSheet(updated);
      }
      await refreshList();
      return updated;
    },
    [refreshList, selectedId, worktreePath]
  );

  const refreshChecks = useCallback(
    async (id) => {
      if (!worktreePath || !id || !runActionSheetChecks) {
        return null;
      }
      const updated = await runActionSheetChecks({ worktreePath, id });
      await loadSheet(id);
      await refreshList();
      return updated;
    },
    [loadSheet, refreshList, worktreePath]
  );

  const clearRunner = useCallback((id) => {
    const record = runnerTimersRef.current.get(id);
    if (record?.intervalId) {
      window.clearInterval(record.intervalId);
    }
    if (record?.timeoutId) {
      window.clearTimeout(record.timeoutId);
    }
    runnerTimersRef.current.delete(id);
  }, []);

  const scheduleMonitor = useCallback(
    (id, options = {}) => {
      clearRunner(id);
      const intervalMs = toNumber(options.intervalMs, 15000);
      const intervalId = window.setInterval(async () => {
        const result = await refreshChecks(id);
        const sheet = await readActionSheet({ worktreePath, id });
        const conditional = sheet?.status?.conditional || DEFAULT_CONDITIONAL;
        const gateStatus = result?.gateStatus || sheet?.status?.gateStatus;
        if (gateStatus === 'passed') {
          clearRunner(id);
          if (conditional?.followupPrompt?.trim()) {
            await runActionCommand({
              command: conditional.followupPrompt.trim(),
              kind: 'resume',
              label: `${sheet?.status?.title || 'Action Sheet'} (follow-up)`,
              sessionId: sheet?.status?.sessionId,
            });
            await updateSheetStatus(id, {
              followupDispatchedAt: new Date().toISOString(),
            });
          }
          await updateSheetStatus(id, { state: 'completed', nextRunAt: null });
          return;
        }
        if (conditional?.enabled && conditional?.repeat?.maxAttempts && gateStatus !== 'passed') {
          const attempts = toNumber(sheet?.status?.attempts, 0);
          const maxAttempts = toNumber(conditional.repeat.maxAttempts, 0);
          const cooldownMs = toNumber(conditional.repeat.cooldownMs, 60000);
          if (attempts < maxAttempts && sheet?.status?.state !== 'queued') {
            clearRunner(id);
            const nextRunAt = new Date(Date.now() + cooldownMs).toISOString();
            await updateSheetStatus(id, { state: 'queued', nextRunAt });
            const timeoutId = window.setTimeout(() => {
              runSheet({ id, sessionId: sheet?.status?.sessionId }).catch(() => undefined);
            }, cooldownMs);
            runnerTimersRef.current.set(id, { timeoutId });
          }
        }
      }, intervalMs);
      runnerTimersRef.current.set(id, { intervalId });
    },
    [clearRunner, refreshChecks, runActionCommand, updateSheetStatus, worktreePath]
  );

  const runSheet = useCallback(
    async ({ id, sessionId }) => {
      if (!worktreePath || !id || !runActionCommand) {
        return;
      }
      try {
        const sheet = await readActionSheet({ worktreePath, id });
        if (!sheet) {
          throw new Error('Action Sheet not found.');
        }
        const conditional = sheet.status?.conditional || DEFAULT_CONDITIONAL;
        const attempts = toNumber(sheet.status?.attempts, 0) + 1;
        const promptText = buildActionSheetPromptText(sheet.prompt);
        await updateSheetStatus(id, {
          state: 'running',
          sessionId,
          cellId: selectedCellId || sheet.status?.cellId || '',
          attempts,
          lastRunAt: new Date().toISOString(),
          gateStatus: 'waiting',
          nextRunAt: null,
          conditional,
        });
        if (onSwitchView) {
          onSwitchView('agent-cells');
        }
        if (onOpenTerminal) {
          onOpenTerminal();
        }
        if (sessionId && onSelectSession) {
          onSelectSession(sessionId);
        }
        await runActionCommand({
          command: promptText,
          kind: 'resume',
          label: sheet.status?.title || 'Action Sheet',
          sessionId,
        });
        await updateSheetStatus(id, { state: 'waiting_gate', lastError: '' });
        scheduleMonitor(id);
      } catch (err) {
        await updateSheetStatus(id, {
          state: 'failed',
          lastError: err?.message || 'Failed to run Action Sheet.',
        });
        clearRunner(id);
        throw err;
      }
    },
    [
      onOpenTerminal,
      onSelectSession,
      onSwitchView,
      runActionCommand,
      scheduleMonitor,
      selectedCellId,
      updateSheetStatus,
      worktreePath,
      clearRunner,
    ]
  );

  const cancelSheet = useCallback(
    async (id) => {
      clearRunner(id);
      await updateSheetStatus(id, { state: 'canceled', nextRunAt: null });
    },
    [clearRunner, updateSheetStatus]
  );

  const conditionalDefaults = useMemo(() => DEFAULT_CONDITIONAL, []);

  return {
    sheets,
    selectedId,
    selectedSheet,
    loading,
    detailLoading,
    error,
    setSelectedId,
    refreshList,
    createSheet,
    updateSheetStatus,
    updateSheetPlan,
    updateSheetPrompt,
    updateSheetChecks,
    refreshChecks,
    runSheet,
    cancelSheet,
    conditionalDefaults,
  };
}
