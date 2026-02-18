import { useCallback, useEffect, useState } from 'react';

import {
  createHilItem as agencyCreateHilItem,
  listHilItems as agencyListHilItems,
  readActionSheet as agencyReadActionSheet,
  readWorkbenchEntry as agencyReadWorkbenchEntry,
  updateHilItem as agencyUpdateHilItem,
} from '../services/agencyBridge';
import { BASELINE_PROFILE_ID } from '../utils/terminusSettings';
import {
  buildDeliveryMeta,
  normalizeDeliveryMode,
  setDeliveryExecutionStatus,
  type DeliveryMode,
} from '../utils/deliveryMetadata';
import {
  buildPromoteActionSheetPrompt,
  buildPromotePromptBundle,
  buildPromotePromptText,
} from '../utils/hilPromotePrompt';
import { buildActionSheetCompletion, buildActionSheetPlan } from '../utils/actionSheetCompletion';

type UseHilPromoteWorkflowArgs = {
  promoteWorktreePath: string;
  sessions: any[];
  activeSessionId: string;
  activeView: string;
  selectedCellId: string;
  conditionalDefaults: any;
  createActionSheet: (payload: any) => Promise<any>;
  updateActionSheetPlan: (id: string, content: string) => Promise<any>;
  updateActionSheetPrompt: (id: string, payload: any) => Promise<any>;
  updateActionSheetChecks: (id: string, checks: any[]) => Promise<any>;
  dispatchActionSheet: (payload: any) => Promise<any>;
  dispatchSessionCommand: (payload: any) => Promise<any>;
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
  createActionSheet,
  updateActionSheetPlan,
  updateActionSheetPrompt,
  updateActionSheetChecks,
  dispatchActionSheet,
  dispatchSessionCommand,
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
      const promptBundle = buildPromotePromptBundle({
        description: promoteDescription.trim(),
        items: selected,
        previewById: promotePreviewById,
      });
      const promptText = buildPromotePromptText(promptBundle);
      const actionSheetPrompt = buildPromoteActionSheetPrompt({
        description: promoteDescription.trim(),
        items: selected,
        previewById: promotePreviewById,
      });
      const requestedAt = new Date().toISOString();
      const references = selected.map((item) => ({
        system: 'hil',
        id: item.id,
        path: item.anchor?.file || null,
        line: item.anchor?.line || null,
        kind: item.kind || null,
      }));
      const mode = normalizeDeliveryMode(promoteMode);
      const actionSheetTitle = `Promote: ${promoteDescription.trim().slice(0, 32)}`;
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

      const seedMeta = buildDeliveryMeta({
        source: 'promote',
        mode,
        status: 'queued',
        requestedAt,
        sessionId: promoteSessionId,
        cellId: selectedCellId || '',
        actionSheetId: mode === 'gated' ? '(pending)' : '',
        references,
        existingMeta: {
          sourceKind: 'hil',
          promoteSessionId: promoteSessionId,
          promoted: false,
          promptBundle,
          promptText,
        },
        timelineLabel: mode === 'gated' ? 'Queued gated promote' : 'Queued quick promote',
      });

      let createdSheet: any = null;
      if (mode === 'gated') {
        createdSheet = await createActionSheet({
          title: actionSheetTitle,
          prompt: {
            requirements: actionSheetPrompt.requirements,
            context: actionSheetPrompt.context,
            checks: '',
            done: '',
          },
          checks: [],
          conditional: conditionalDefaults,
        });
        if (!createdSheet?.id) {
          setPromoteError('Unable to create Action Sheet.');
          return;
        }
        const completion = buildActionSheetCompletion(createdSheet.id);
        await updateActionSheetPlan(
          createdSheet.id,
          buildActionSheetPlan({ title: actionSheetTitle, marker: completion.marker })
        );
        await updateActionSheetPrompt(createdSheet.id, {
          requirements: actionSheetPrompt.requirements,
          context: actionSheetPrompt.context,
          checks: '',
          done: completion.done,
        });
        await updateActionSheetChecks(createdSheet.id, completion.checks);
      }

      const draft = await agencyCreateHilItem({
        worktreePath: promoteWorktreePath,
        kind: 'draft',
        body: promoteDescription.trim(),
        references,
        meta: {
          ...seedMeta,
          actionSheetId: createdSheet?.id || '',
        },
      });
      if (!draft) {
        setPromoteError('Unable to create draft.');
        return;
      }

      setPromoteDraftId(draft.id);
      setPromoteDraft(draft);
      setPromoteGateStatus('waiting');
      setPromoteExecutionStatus('queued');
      setPromoteActionSheetId(createdSheet?.id || '');
      setPromoteActionSheet(createdSheet?.status || null);
      setPromoteStep('waiting');

      if (mode === 'gated') {
        await dispatchActionSheet({ id: createdSheet.id, sessionId: promoteSessionId });
      } else {
        await dispatchSessionCommand({
          command: dispatchPromptText,
          kind: 'dispatch',
          label: `Promote (quick): ${promoteDescription.trim().slice(0, 32)}`,
          sessionId: promoteSessionId,
          cellId: selectedCellId || '',
          profileId: BASELINE_PROFILE_ID,
          worktreePath: promoteWorktreePath,
          appendEnter: true,
          doubleEnter: true,
        });
      }

      const runningMeta = setDeliveryExecutionStatus({
        meta: draft.meta || seedMeta,
        source: 'promote',
        mode,
        status: 'running',
        at: new Date().toISOString(),
        label: mode === 'gated' ? 'Gated promote dispatched' : 'Quick promote dispatched',
        sessionId: promoteSessionId,
        actionSheetId: createdSheet?.id || '',
      });

      const updatedDraft = await agencyUpdateHilItem({
        worktreePath: promoteWorktreePath,
        itemId: draft.id,
        patch: { meta: runningMeta },
      });

      if (updatedDraft) {
        setPromoteDraft(updatedDraft);
        setPromoteExecutionStatus(updatedDraft.meta?.executionStatus || 'running');
      } else {
        setPromoteExecutionStatus('running');
      }

      if (mode === 'quick') {
        const promotedAt = new Date().toISOString();
        await Promise.all(
          selected.map((item) =>
            agencyUpdateHilItem({
              worktreePath: promoteWorktreePath,
              itemId: item.id,
              patch: {
                meta: {
                  processed: true,
                  promotedDraftId: draft.id,
                  promoteSessionId: promoteSessionId || null,
                  promotedAt,
                },
              },
            })
          )
        );
        await loadComments();
        const completedMeta = setDeliveryExecutionStatus({
          meta: updatedDraft?.meta || runningMeta,
          source: 'promote',
          mode,
          status: 'complete',
          at: promotedAt,
          label: 'Quick promote acknowledged',
          details: 'Selected items were consumed immediately after dispatch ACK.',
          sessionId: promoteSessionId,
          actionSheetId: createdSheet?.id || '',
        });
        completedMeta.promoted = true;
        completedMeta.executionAcknowledgedAt = promotedAt;
        const completedDraft = await agencyUpdateHilItem({
          worktreePath: promoteWorktreePath,
          itemId: draft.id,
          patch: { meta: completedMeta },
        });
        if (completedDraft) {
          setPromoteDraft(completedDraft);
        }
        setPromoteExecutionStatus('complete');
        setPromoteGateStatus('ready');
      }
    } catch (error: any) {
      setPromoteError(error?.message || 'Failed to dispatch promote workflow.');
      setPromoteExecutionStatus('failed');
    } finally {
      setPromoteLoading(false);
    }
  }, [
    conditionalDefaults,
    createActionSheet,
    dispatchActionSheet,
    dispatchSessionCommand,
    loadComments,
    promoteDescription,
    promoteMode,
    promoteItems,
    promotePreviewById,
    promoteSelectedIds,
    promoteSessionId,
    promoteWorktreePath,
    selectedCellId,
    updateActionSheetChecks,
    updateActionSheetPlan,
    updateActionSheetPrompt,
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
    const selected = promoteItems.filter((item) => promoteSelectedIds.includes(item.id));
    if (!selected.length) {
      setPromoteError('Select at least one item to promote.');
      return;
    }
    setPromoteLoading(true);
    setPromoteError('');
    try {
      const promotedAt = new Date().toISOString();
      await Promise.all(
        selected.map((item) =>
          agencyUpdateHilItem({
            worktreePath: promoteWorktreePath,
            itemId: item.id,
            patch: {
              meta: {
                processed: true,
                promotedDraftId: promoteDraftId,
                promoteSessionId: promoteSessionId || null,
                promotedAt,
              },
            },
          })
        )
      );
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
    promoteItems,
    promoteSelectedIds,
    promoteSessionId,
    promoteWorktreePath,
  ]);

  useEffect(() => {
    if (!promoteModalOpen || promoteStep !== 'waiting' || !promoteDraftId || !promoteWorktreePath) {
      return undefined;
    }
    let canceled = false;
    const poll = async () => {
      try {
        const list = await agencyListHilItems({
          worktreePath: promoteWorktreePath,
          kind: 'draft',
        });
        if (canceled) {
          return;
        }
        const drafts = Array.isArray(list) ? list : [];
        const found = drafts.find((item) => item.id === promoteDraftId);
        if (!found) {
          setPromoteDraft(null);
          setPromoteGateStatus('missing');
          setPromoteExecutionStatus('missing');
          return;
        }
        let nextDraft = found;
        const sheetId = promoteActionSheetId || found.meta?.actionSheetId || '';
        if (sheetId && !promoteActionSheetId) {
          setPromoteActionSheetId(sheetId);
        }
        let actionSheetStatus: any = null;
        if (sheetId) {
          try {
            const sheet = await agencyReadActionSheet({
              worktreePath: promoteWorktreePath,
              id: sheetId,
            });
            if (sheet?.status) {
              actionSheetStatus = sheet.status;
              setPromoteActionSheet(sheet.status);
            }
          } catch {
            setPromoteActionSheet(null);
          }
        } else {
          setPromoteActionSheet(null);
        }
        const actionSheetCompleted = actionSheetStatus?.state === 'completed';
        const actionSheetFailed = actionSheetStatus?.state === 'failed';
        if (actionSheetStatus?.gateStatus === 'passed' || actionSheetCompleted) {
          if (nextDraft.meta?.promoted !== true || nextDraft.meta?.executionStatus !== 'complete') {
            const updated = await agencyUpdateHilItem({
              worktreePath: promoteWorktreePath,
              itemId: nextDraft.id,
              patch: {
                meta: {
                  promoted: true,
                  executionStatus: 'complete',
                  executionFinishedAt: new Date().toISOString(),
                },
              },
            });
            if (updated) {
              nextDraft = updated;
            }
          }
        } else if (actionSheetFailed && nextDraft.meta?.executionStatus !== 'failed') {
          const updated = await agencyUpdateHilItem({
            worktreePath: promoteWorktreePath,
            itemId: nextDraft.id,
            patch: {
              meta: {
                executionStatus: 'failed',
              },
            },
          });
          if (updated) {
            nextDraft = updated;
          }
        }
        setPromoteDraft(nextDraft);
        if (actionSheetStatus?.state) {
          setPromoteExecutionStatus(normalizeActionSheetExecution(actionSheetStatus.state));
        } else {
          setPromoteExecutionStatus(nextDraft.meta?.executionStatus || 'waiting');
        }
        const gateReady =
          actionSheetStatus?.gateStatus === 'passed' || actionSheetCompleted || isDraftComplete(nextDraft);
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
    promoteActionSheetId,
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

