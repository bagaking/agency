import { useCallback, useEffect, useState } from 'react';

import {
  confirmDelivery as agencyConfirmDelivery,
  getDeliveryStatus as agencyGetDeliveryStatus,
  listHilItems as agencyListHilItems,
  readWorkbenchEntry as agencyReadWorkbenchEntry,
  startDelivery as agencyStartDelivery,
} from '../services/agencyBridge';
import {
  normalizeDeliveryMode,
  type DeliveryMode,
} from '../utils/deliveryMetadata';
import {
  buildPromotePromptBundle,
  buildPromotePromptText,
} from '../utils/hilPromotePrompt';

type UseHilPromoteWorkflowArgs = {
  promoteWorktreePath: string;
  sessions: any[];
  activeSessionId: string;
  activeView: string;
  selectedCellId: string;
  conditionalDefaults: any;
  dispatchActionSheet: (payload: any) => Promise<any>;
  createSession: (payload: any) => Promise<any>;
  loadComments: () => Promise<void>;
  openHilDrawer: (panel?: string) => void;
  closeAfterConfirm?: boolean;
};

const isDraftComplete = (draft: any) => {
  if (!draft) {
    return false;
  }
  if (draft.meta?.promoted !== true) {
    return false;
  }
  if (draft.meta?.executionStatus !== 'complete') {
    return false;
  }
  const todos = Array.isArray(draft.meta?.todos) ? draft.meta.todos : null;
  if (!todos || todos.length === 0) {
    return true;
  }
  return todos.every((todo: any) => todo?.done === true || todo?.checked === true || todo?.status === 'done');
};

const normalizeActionSheetExecution = (state: string) => {
  if (state === 'completed') {
    return 'complete';
  }
  if (state === 'waiting_gate') {
    return 'running';
  }
  if (state === 'queued' || state === 'running' || state === 'failed' || state === 'canceled') {
    return state;
  }
  return 'idle';
};

export function useHilPromoteWorkflow({
  promoteWorktreePath,
  sessions,
  activeSessionId,
  activeView,
  selectedCellId,
  conditionalDefaults,
  dispatchActionSheet,
  createSession,
  loadComments,
  openHilDrawer,
}: UseHilPromoteWorkflowArgs) {
  const [promoteModalOpen, setPromoteModalOpen] = useState(false);
  const [promoteStep, setPromoteStep] = useState('setup');
  const [promoteDescription, setPromoteDescription] = useState('');
  const [promoteLoading, setPromoteLoading] = useState(false);
  const [promoteError, setPromoteError] = useState('');
  const [promoteItems, setPromoteItems] = useState<any[]>([]);
  const [promoteSelectedIds, setPromoteSelectedIds] = useState<string[]>([]);
  const [promotePreviewById, setPromotePreviewById] = useState<Record<string, any>>({});
  const [promoteDraftId, setPromoteDraftId] = useState('');
  const [promoteDraft, setPromoteDraft] = useState<any>(null);
  const [promoteMode, setPromoteMode] = useState<DeliveryMode>('quick');
  const [promoteGateStatus, setPromoteGateStatus] = useState('waiting');
  const [promoteExecutionStatus, setPromoteExecutionStatus] = useState('idle');
  const [promoteSessionId, setPromoteSessionId] = useState('');
  const [lastPromoteSessionId, setLastPromoteSessionId] = useState('');
  const [promoteActionSheetId, setPromoteActionSheetId] = useState('');
  const [promoteActionSheet, setPromoteActionSheet] = useState<any>(null);

  useEffect(() => {
    if (promoteSessionId) {
      setLastPromoteSessionId(promoteSessionId);
    }
  }, [promoteSessionId]);

  const openPromoteModal = useCallback(async () => {
    if (!promoteWorktreePath) {
      return;
    }
    setPromoteModalOpen(true);
    setPromoteLoading(true);
    setPromoteError('');
    setPromoteDescription('');
    setPromotePreviewById({});
    setPromoteStep('setup');
    setPromoteDraftId('');
    setPromoteDraft(null);
    setPromoteMode('quick');
    setPromoteGateStatus('waiting');
    setPromoteExecutionStatus('idle');
    setPromoteActionSheetId('');
    setPromoteActionSheet(null);
    try {
      const list = await agencyListHilItems({
        worktreePath: promoteWorktreePath,
        kind: 'all',
      });
      if (!list) {
        setPromoteItems([]);
        setPromoteSelectedIds([]);
        return;
      }
      const pending = (Array.isArray(list) ? list : [])
        .filter((item) => item && (item.kind === 'comment' || item.kind === 'memo' || item.kind === 'reply'))
        .filter((item) => item.meta?.processed !== true)
        .sort((a, b) => {
          const fileA = a.anchor?.file || '';
          const fileB = b.anchor?.file || '';
          if (fileA !== fileB) {
            return fileA.localeCompare(fileB);
          }
          const lineA = Number(a.anchor?.line || 0);
          const lineB = Number(b.anchor?.line || 0);
          if (lineA !== lineB) {
            return lineA - lineB;
          }
          return (a.createdAt || '').localeCompare(b.createdAt || '');
        });
      setPromoteItems(pending);
      setPromoteSelectedIds(pending.map((item) => item.id));
      const availableSessions = sessions.filter((session) => session.status !== 'closed');
      const preferredSession =
        activeView === 'agent-cells'
          ? availableSessions.find((session) => session.id === activeSessionId) ||
            availableSessions.find((session) => session.id === lastPromoteSessionId)
          : availableSessions.find((session) => session.id === lastPromoteSessionId);
      const fallbackSession = preferredSession || availableSessions[0] || null;
      setPromoteSessionId(fallbackSession?.id || '');
    } catch (error: any) {
      setPromoteError(error?.message || 'Failed to load pending items.');
      setPromoteItems([]);
      setPromoteSelectedIds([]);
    } finally {
      setPromoteLoading(false);
    }
  }, [activeSessionId, activeView, lastPromoteSessionId, promoteWorktreePath, sessions]);

  const closePromoteModal = useCallback(() => {
    setPromoteModalOpen(false);
    setPromoteError('');
    setPromoteItems([]);
    setPromoteSelectedIds([]);
    setPromotePreviewById({});
    setPromoteDescription('');
    setPromoteStep('setup');
    setPromoteDraftId('');
    setPromoteDraft(null);
    setPromoteMode('quick');
    setPromoteGateStatus('waiting');
    setPromoteSessionId('');
    setPromoteExecutionStatus('idle');
    setPromoteActionSheetId('');
    setPromoteActionSheet(null);
  }, []);

  const togglePromoteItem = useCallback((itemId: string) => {
    if (!itemId) {
      return;
    }
    setPromoteSelectedIds((current) => {
      if (current.includes(itemId)) {
        return current.filter((id) => id !== itemId);
      }
      return [...current, itemId];
    });
  }, []);

  const togglePromoteGroup = useCallback((itemIds: string[]) => {
    const ids = Array.isArray(itemIds) ? itemIds.filter(Boolean) : [];
    if (!ids.length) {
      return;
    }
    setPromoteSelectedIds((current) => {
      const selected = new Set(current);
      const allSelected = ids.every((id) => selected.has(id));
      if (allSelected) {
        ids.forEach((id) => selected.delete(id));
      } else {
        ids.forEach((id) => selected.add(id));
      }
      return Array.from(selected);
    });
  }, []);

  const loadPromotePreview = useCallback(
    async (item: any) => {
      if (!item?.id || !item?.anchor?.file || !promoteWorktreePath) {
        return;
      }
      if (promotePreviewById[item.id]) {
        return;
      }
      try {
        const result = await agencyReadWorkbenchEntry({
          rootPath: promoteWorktreePath,
          targetPath: item.anchor.file,
        });
        if (!result) {
          setPromotePreviewById((current) => ({
            ...current,
            [item.id]: {
              error: 'Unable to load preview.',
            },
          }));
          return;
        }
        const content = result?.content || '';
        const lines = content.split('\n');
        const targetLine = Math.max(1, Number(item.anchor?.line || 1));
        const start = Math.max(1, targetLine - 2);
        const end = Math.min(lines.length || 1, targetLine + 2);
        const snippet = lines.slice(start - 1, end).map((text, index) => ({
          line: start + index,
          text,
        }));
        setPromotePreviewById((current) => ({
          ...current,
          [item.id]: {
            snippet,
            file: item.anchor.file,
            line: targetLine,
          },
        }));
      } catch (error: any) {
        setPromotePreviewById((current) => ({
          ...current,
          [item.id]: {
            error: error?.message || 'Unable to load preview.',
          },
        }));
      }
    },
    [promotePreviewById, promoteWorktreePath]
  );

  const createPromoteSession = useCallback(async () => {
    if (!promoteWorktreePath) {
      return;
    }
    const created = await createSession({ name: 'Promote' });
    if (created?.id) {
      setPromoteSessionId(created.id);
    }
  }, [createSession, promoteWorktreePath]);

  const dispatchPromote = useCallback(async () => {
    if (!promoteWorktreePath) {
      return;
    }
    if (!promoteDescription.trim()) {
      setPromoteError('Description is required.');
      return;
    }
    const selected = promoteItems.filter((item) => promoteSelectedIds.includes(item.id));
    if (!selected.length) {
      setPromoteError('Select at least one item to promote.');
      return;
    }
    if (!promoteSessionId) {
      setPromoteError('Select a session to dispatch the promote workflow.');
      return;
    }
    setPromoteLoading(true);
    setPromoteError('');
    try {
      const trimmedDescription = promoteDescription.trim();
      const mode = normalizeDeliveryMode(promoteMode);
      const promptBundle = buildPromotePromptBundle({
        description: trimmedDescription,
        items: selected,
        previewById: promotePreviewById,
      });
      const promptText = buildPromotePromptText(promptBundle);
      const requestedAt = new Date().toISOString();
      const dispatchPromptText = [
        '<delivery>',
        'source: promote',
        `mode: ${mode}`,
        `session_id: ${promoteSessionId}`,
        `requested_at: ${requestedAt}`,
        '</delivery>',
        '',
        promptText,
      ].join('\n');

      const run = await agencyStartDelivery({
        request: {
          worktreePath: promoteWorktreePath,
          source: 'promote',
          mode,
          description: trimmedDescription,
          sessionId: promoteSessionId,
          cellId: selectedCellId || '',
          selectedItems: selected.map((item) => ({
            id: String(item?.id || ''),
            kind: String(item?.kind || 'comment'),
            body: String(item?.body || item?.message || ''),
            anchor: item?.anchor || null,
            references: Array.isArray(item?.references) ? item.references : [],
          })),
          metadata: {
            command: dispatchPromptText,
            sourceKind: 'hil',
            promoteSessionId: promoteSessionId || '',
            promoted: false,
            promptBundle,
            promptText,
            requestedAt,
            sourceSession: {
              cellId: selectedCellId || '',
              sessionId: promoteSessionId || '',
            },
            conditional: mode === 'gated' ? conditionalDefaults : undefined,
          },
          dispatch: {
            label: `Promote (${mode})`,
            appendEnter: true,
            doubleEnter: true,
          },
        },
      });

      const draftId = String(run?.draftId || '').trim();
      const actionSheetId = String(run?.actionSheetId || '').trim();
      if (!draftId) {
        setPromoteError('Unable to create draft.');
        return;
      }

      setPromoteDraftId(draftId);
      setPromoteGateStatus('waiting');
      setPromoteExecutionStatus('running');
      setPromoteActionSheetId(actionSheetId);
      setPromoteActionSheet(null);
      setPromoteStep('waiting');

      if (mode === 'gated') {
        if (!actionSheetId) {
          throw new Error('Unable to create Action Sheet.');
        }
        await dispatchActionSheet({ id: actionSheetId, sessionId: promoteSessionId });
      } else {
        await agencyConfirmDelivery({
          worktreePath: promoteWorktreePath,
          draftId,
        });
        await loadComments();
      }

      const status = await agencyGetDeliveryStatus({
        worktreePath: promoteWorktreePath,
        draftId,
      });
      setPromoteDraft(status?.draft || null);
      setPromoteActionSheetId(String(status?.actionSheetId || actionSheetId));
      setPromoteActionSheet(status?.actionSheetStatus || null);
      setPromoteExecutionStatus(status?.executionStatus || (mode === 'quick' ? 'complete' : 'running'));
      const gateReady =
        mode === 'quick'
          ? true
          : status?.actionSheetStatus?.gateStatus === 'passed' ||
            status?.actionSheetStatus?.state === 'completed' ||
            isDraftComplete(status?.draft);
      setPromoteGateStatus(gateReady ? 'ready' : 'waiting');
    } catch (error: any) {
      setPromoteError(error?.message || 'Failed to dispatch promote workflow.');
      setPromoteExecutionStatus('failed');
    } finally {
      setPromoteLoading(false);
    }
  }, [
    conditionalDefaults,
    dispatchActionSheet,
    loadComments,
    promoteDescription,
    promoteMode,
    promoteItems,
    promotePreviewById,
    promoteSelectedIds,
    promoteSessionId,
    promoteWorktreePath,
    selectedCellId,
  ]);

  const confirmPromote = useCallback(async () => {
    if (!promoteWorktreePath || !promoteDraftId) {
      return;
    }
    const mode = normalizeDeliveryMode(promoteMode);
    if (mode === 'quick') {
      closePromoteModal();
      return;
    }
    if (promoteGateStatus !== 'ready') {
      setPromoteError('Draft completion gate is not ready.');
      return;
    }
    setPromoteLoading(true);
    setPromoteError('');
    try {
      await agencyConfirmDelivery({
        worktreePath: promoteWorktreePath,
        draftId: promoteDraftId,
      });
      await loadComments();
      closePromoteModal();
      openHilDrawer('comments');
    } catch (error: any) {
      setPromoteError(error?.message || 'Failed to confirm promote.');
    } finally {
      setPromoteLoading(false);
    }
  }, [
    closePromoteModal,
    loadComments,
    openHilDrawer,
    promoteDraftId,
    promoteGateStatus,
    promoteMode,
    promoteWorktreePath,
  ]);

  useEffect(() => {
    if (!promoteModalOpen || promoteStep !== 'waiting' || !promoteDraftId || !promoteWorktreePath) {
      return undefined;
    }
    let canceled = false;
    const poll = async () => {
      try {
        const status = await agencyGetDeliveryStatus({
          worktreePath: promoteWorktreePath,
          draftId: promoteDraftId,
        });
        if (canceled) {
          return;
        }
        if (!status) {
          setPromoteDraft(null);
          setPromoteActionSheet(null);
          setPromoteGateStatus('missing');
          setPromoteExecutionStatus('missing');
          return;
        }
        const nextDraft = status?.draft || null;
        const actionSheetStatus = status?.actionSheetStatus || null;
        const sheetId = String(status?.actionSheetId || '');
        setPromoteDraft(nextDraft);
        setPromoteActionSheet(actionSheetStatus);
        if (sheetId) {
          setPromoteActionSheetId(sheetId);
        }
        if (actionSheetStatus?.state) {
          setPromoteExecutionStatus(normalizeActionSheetExecution(actionSheetStatus.state));
        } else {
          setPromoteExecutionStatus(status?.executionStatus || nextDraft?.meta?.executionStatus || 'waiting');
        }
        const gateReady =
          actionSheetStatus?.gateStatus === 'passed' ||
          actionSheetStatus?.state === 'completed' ||
          isDraftComplete(nextDraft);
        setPromoteGateStatus(gateReady ? 'ready' : 'waiting');
      } catch {
        if (canceled) {
          return;
        }
        setPromoteGateStatus('waiting');
      }
    };
    poll();
    const interval = setInterval(poll, 3000);
    return () => {
      canceled = true;
      clearInterval(interval);
    };
  }, [
    promoteDraftId,
    promoteModalOpen,
    promoteStep,
    promoteWorktreePath,
  ]);

  return {
    promoteModalOpen,
    promoteStep,
    promoteDescription,
    promoteLoading,
    promoteError,
    promoteItems,
    promoteSelectedIds,
    promotePreviewById,
    promoteDraftId,
    promoteDraft,
    promoteMode,
    promoteActionSheet,
    promoteActionSheetId,
    promoteGateStatus,
    promoteExecutionStatus,
    promoteSessionId,
    setPromoteDescription,
    setPromoteSessionId,
    selectPromoteMode: (mode: DeliveryMode) => setPromoteMode(normalizeDeliveryMode(mode)),
    openPromoteModal,
    closePromoteModal,
    togglePromoteItem,
    togglePromoteGroup,
    loadPromotePreview,
    createPromoteSession,
    dispatchPromote,
    confirmPromote,
  };
}
