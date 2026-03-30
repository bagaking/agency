import { useCallback } from 'react';

import {
  confirmDelivery as agencyConfirmDelivery,
  getDeliveryStatus as agencyGetDeliveryStatus,
  getGates as agencyGetGates,
  readActionSheet as agencyReadActionSheet,
  startDelivery as agencyStartDelivery,
  updateHilItem as agencyUpdateHilItem,
} from '../services/agencyBridge';
import { buildActionSheetCompletion, buildActionSheetPlan } from '../utils/actionSheetCompletion';
import {
  normalizeDeliveryMode,
  type DeliveryMode,
} from '../utils/deliveryMetadata';
import { buildExplorerDeliveryPromptText } from './explorerDeliveryPrompt';

type UseActionSheetOrchestrationArgs = {
  modal: any;
  selectedCell: any | null;
  actionSheetsRoot: string;
  hilWorktreePath: string;
  conditionalDefaults: any;
  activeSessionId: string;
  summarizeHilDraft?: (draft: any) => string;
  refreshHilMemo?: () => Promise<any>;
  createActionSheet: (payload: any) => Promise<any>;
  updateActionSheetStatus: (id: string, payload: any) => Promise<any>;
  updateActionSheetPlan: (id: string, content: any) => Promise<any>;
  updateActionSheetPrompt: (id: string, payload: any) => Promise<any>;
  updateActionSheetChecks: (id: string, checks: any[]) => Promise<any>;
  dispatchActionSheet: (payload: any) => Promise<any>;
  archiveActionSheet: (id: string) => Promise<any>;
  deleteActionSheet: (id: string) => Promise<any>;
  dispatchSessionCommand: (payload: any) => Promise<any>;
  setActionSheetInlineError: (value: string) => void;
  setActionSheetSessionId: (value: string) => void;
  setActionSheetId: (value: any) => void;
  setExplorerDeliverySummary: (value: any) => void;
  setActiveView: (view: string) => void;
  handleOpenTerminal: () => void;
  selectSession: (sessionId: string, cellId?: string) => void;
  projectGatesPath: string;
  agentGatesPath: string;
};

const LINE_BREAK = String.fromCharCode(10);
const PARAGRAPH_BREAK = `${LINE_BREAK}${LINE_BREAK}`;

export function useActionSheetOrchestration({
  modal,
  selectedCell,
  actionSheetsRoot,
  hilWorktreePath,
  conditionalDefaults,
  activeSessionId,
  summarizeHilDraft,
  refreshHilMemo,
  createActionSheet,
  updateActionSheetStatus,
  updateActionSheetPlan,
  updateActionSheetPrompt,
  updateActionSheetChecks,
  dispatchActionSheet,
  archiveActionSheet,
  deleteActionSheet,
  dispatchSessionCommand,
  setActionSheetInlineError,
  setActionSheetSessionId,
  setActionSheetId,
  setExplorerDeliverySummary,
  setActiveView,
  handleOpenTerminal,
  selectSession,
  projectGatesPath,
  agentGatesPath,
}: UseActionSheetOrchestrationArgs) {
  const repoRootPath = selectedCell?.projectRoot || actionSheetsRoot || '';
  const selectedCellId = selectedCell?.id || '';

  const handleOpenActionSheets = useCallback(
    (sheetId?: string) => {
      if (sheetId) {
        setActionSheetId(sheetId);
      }
      setActiveView('action-sheets');
    },
    [setActionSheetId, setActiveView]
  );

  const createDefaultActionSheet = useCallback(
    async ({ title }: { title: string }) => {
      if (!actionSheetsRoot) {
        throw new Error('Select a project before creating Action Sheets.');
      }
      const created = await createActionSheet({
        title,
        prompt: { requirements: '', context: '', checks: '', done: '' },
        checks: [],
        conditional: conditionalDefaults,
      });
      if (!created?.id) {
        throw new Error('Unable to create Action Sheet.');
      }
      const completion = buildActionSheetCompletion(created.id);
      await updateActionSheetPlan(created.id, buildActionSheetPlan({ title, marker: completion.marker }));
      await updateActionSheetPrompt(created.id, {
        requirements: '',
        context: '',
        checks: '',
        done: completion.done,
      });
      await updateActionSheetChecks(created.id, completion.checks);
      return created;
    },
    [
      actionSheetsRoot,
      conditionalDefaults,
      createActionSheet,
      updateActionSheetChecks,
      updateActionSheetPlan,
      updateActionSheetPrompt,
    ]
  );

  const handleCreateActionSheet = useCallback(async () => {
    try {
      await createDefaultActionSheet({ title: 'Action Sheet' });
    } catch (error: any) {
      setActionSheetInlineError(error?.message || 'Unable to create Action Sheet.');
    }
  }, [createDefaultActionSheet, setActionSheetInlineError]);

  const handleCreateDraftActionSheet = useCallback(
    async (draft: any) => {
      if (!draft?.id) {
        throw new Error('Draft unavailable.');
      }
      const summary = summarizeHilDraft ? summarizeHilDraft(draft) : 'Draft';
      const title = `Draft: ${summary}`.slice(0, 64);
      return createDefaultActionSheet({ title });
    },
    [createDefaultActionSheet, summarizeHilDraft]
  );

  const handleSaveActionSheet = useCallback(
    async (id: string, payload: any) => {
      if (!id) {
        return;
      }
      await updateActionSheetStatus(id, {
        title: payload.title,
        conditional: payload.conditional,
      });
      await updateActionSheetPlan(id, payload.plan);
      await updateActionSheetPrompt(id, payload.prompt);
      await updateActionSheetChecks(id, payload.checks);
    },
    [updateActionSheetChecks, updateActionSheetPlan, updateActionSheetPrompt, updateActionSheetStatus]
  );

  const handleDispatchActionSheet = useCallback(
    async (id: string, sessionId: string) => {
      if (!id) {
        return;
      }
      if (!sessionId) {
        setActionSheetInlineError('Select a session before dispatching an Action Sheet.');
        return;
      }
      setActionSheetInlineError('');
      setActionSheetSessionId(sessionId);
      await dispatchActionSheet({ id, sessionId });
    },
    [dispatchActionSheet, setActionSheetInlineError, setActionSheetSessionId]
  );

  const handleRunDraftInActiveSession = useCallback(
    async (draft: any) => {
      if (!draft?.id) {
        return;
      }
      if (!activeSessionId) {
        setActionSheetInlineError('Select a session before running a draft.');
        return;
      }
      if (!hilWorktreePath) {
        setActionSheetInlineError('Select a project before running a draft.');
        return;
      }
      const actionSheetsPath = actionSheetsRoot || hilWorktreePath;
      if (!actionSheetsPath) {
        setActionSheetInlineError('Select a project before running a draft.');
        return;
      }
      try {
        let actionSheetId = draft.meta?.actionSheetId || '';
        if (actionSheetId) {
          try {
            const sheet = await agencyReadActionSheet({
              worktreePath: actionSheetsPath,
              id: actionSheetId,
            });
            if (!sheet) {
              actionSheetId = '';
            }
          } catch {
            actionSheetId = '';
          }
        }
        if (!actionSheetId) {
          const created = await handleCreateDraftActionSheet(draft);
          actionSheetId = created?.id || '';
          if (!actionSheetId) {
            throw new Error('Unable to create Action Sheet.');
          }
          const updated = await agencyUpdateHilItem({
            worktreePath: hilWorktreePath,
            repoRootPath,
            cellId: selectedCellId,
            itemId: draft.id,
            patch: {
              meta: {
                ...(draft.meta || {}),
                actionSheetId,
              },
            },
          });
          if (!updated) {
            throw new Error('HIL IPC unavailable.');
          }
          await refreshHilMemo?.();
        }
        setActionSheetInlineError('');
        await handleDispatchActionSheet(actionSheetId, activeSessionId);
      } catch (error: any) {
        setActionSheetInlineError(error?.message || 'Failed to dispatch draft Action Sheet.');
      }
    },
    [
      activeSessionId,
      actionSheetsRoot,
      handleCreateDraftActionSheet,
      handleDispatchActionSheet,
      hilWorktreePath,
      repoRootPath,
      refreshHilMemo,
      selectedCellId,
      setActionSheetInlineError,
    ]
  );

  const handleDispatchExplorerFeed = useCallback(
    async ({
      description,
      context,
      sessionId,
      mode,
      references,
    }: {
      description?: string;
      context?: string;
      sessionId?: string;
      mode?: DeliveryMode | string;
      references?: string[];
    } = {}) => {
      if (!hilWorktreePath) {
        setActionSheetInlineError('Select a project before dispatching feed.');
        return null;
      }
      const trimmedDescription = String(description || '').trim();
      if (!trimmedDescription) {
        return null;
      }
      if (!sessionId) {
        setActionSheetInlineError('Select a session before dispatching feed.');
        return null;
      }
      const normalizedMode = normalizeDeliveryMode(mode);
      const requestedAt = new Date().toISOString();
      const normalizedReferencePaths = Array.from(
        new Set(
          (Array.isArray(references) ? references : [])
            .map((entry) => String(entry || '').trim())
            .filter(Boolean)
        )
      );
      const normalizedReferences = normalizedReferencePaths.map((targetPath) => ({
        system: 'explorer',
        path: targetPath,
        line: null,
        kind: 'file',
      }));
      const promptText = buildExplorerDeliveryPromptText({
        description: trimmedDescription,
        context: String(context || ''),
        mode: normalizedMode,
        requestedAt,
        sessionId,
        references: normalizedReferences,
      });
      const title = `Feed: ${trimmedDescription.slice(0, 32)}`;
      try {
        const run = await agencyStartDelivery({
          request: {
            worktreePath: hilWorktreePath,
            repoRootPath,
            source: 'explorer',
            mode: normalizedMode,
            description: trimmedDescription,
            sessionId,
            cellId: selectedCellId,
            selectedItems: normalizedReferencePaths.map((targetPath) => ({
              id: `explorer:${targetPath}`,
              kind: 'file',
              body: targetPath,
              anchor: {
                file: targetPath,
                line: 1,
                column: 1,
              },
              references: [],
            })),
            metadata: {
              command: promptText,
              sourceKind: 'explorer',
              feedDescription: trimmedDescription,
              feedContext: String(context || ''),
              promoted: normalizedMode === 'quick',
              requestedAt,
              sourceSession: {
                cellId: selectedCellId,
                sessionId: sessionId || '',
              },
              conditional: normalizedMode === 'gated' ? conditionalDefaults : undefined,
            },
            dispatch: {
              label: `Explorer (${normalizedMode})`,
              appendEnter: true,
              doubleEnter: true,
            },
          },
        });
        const draftId = String(run?.draftId || '').trim();
        const actionSheetId = String(run?.actionSheetId || '').trim();
        if (!draftId) {
          throw new Error('Unable to create delivery draft.');
        }

        if (normalizedMode === 'gated') {
          setActionSheetSessionId(sessionId);
          if (actionSheetId) {
            await dispatchActionSheet({ id: actionSheetId, sessionId });
          }
        } else {
          await agencyConfirmDelivery({
            worktreePath: hilWorktreePath,
            repoRootPath,
            cellId: selectedCellId,
            draftId,
          });
        }

        const status = await agencyGetDeliveryStatus({
          worktreePath: hilWorktreePath,
          repoRootPath,
          cellId: selectedCellId,
          draftId,
        });
        const resolvedStatus = status?.executionStatus || (normalizedMode === 'quick' ? 'complete' : 'running');
        const updatedAt = new Date().toISOString();

        if (normalizedMode === 'quick') {
          setExplorerDeliverySummary({
            source: 'explorer',
            mode: normalizedMode,
            status: 'complete',
            draftId,
            actionSheetId,
            sessionId,
            updatedAt,
            title,
            description: trimmedDescription,
            references: normalizedReferences,
          });
          setActionSheetInlineError('');
          return {
            source: 'explorer',
            mode: normalizedMode,
            status: 'complete',
            draftId,
            actionSheetId,
            consumed: true,
          };
        }

        setExplorerDeliverySummary({
          source: 'explorer',
          mode: normalizedMode,
          status: resolvedStatus,
          draftId,
          actionSheetId,
          sessionId,
          updatedAt,
          title,
          description: trimmedDescription,
          references: normalizedReferences,
        });
        setActionSheetInlineError('');
        return {
          source: 'explorer',
          mode: normalizedMode,
          status: resolvedStatus,
          draftId,
          actionSheetId,
          consumed: false,
        };
      } catch (error: any) {
        const message =
          error?.message ||
          (normalizedMode === 'gated' ? 'Failed to dispatch gated explorer feed.' : 'Failed to dispatch quick explorer feed.');
        setActionSheetInlineError(message);
        setExplorerDeliverySummary((current: any) => ({
          ...(current || {}),
          source: 'explorer',
          mode: normalizedMode,
          status: 'failed',
          sessionId: sessionId || current?.sessionId || '',
          updatedAt: new Date().toISOString(),
          error: message,
        }));
        throw error;
      }
    },
    [
      conditionalDefaults,
      dispatchActionSheet,
      hilWorktreePath,
      repoRootPath,
      selectedCellId,
      setActionSheetInlineError,
      setActionSheetSessionId,
      setExplorerDeliverySummary,
    ]
  );

  const handleViewActionSheetSession = useCallback(
    (sessionId: string) => {
      if (!sessionId) {
        return;
      }
      setActionSheetSessionId(sessionId);
      setActiveView('agent-cells');
      handleOpenTerminal();
      selectSession(sessionId);
    },
    [handleOpenTerminal, selectSession, setActiveView, setActionSheetSessionId]
  );

  const handleArchiveActionSheet = useCallback(
    async (id: string) => {
      if (!id) {
        return;
      }
      setActionSheetInlineError('');
      try {
        await archiveActionSheet(id);
      } catch (error: any) {
        setActionSheetInlineError(error?.message || 'Failed to archive Action Sheet.');
      }
    },
    [archiveActionSheet, setActionSheetInlineError]
  );

  const handleDeleteActionSheet = useCallback(
    async (id: string) => {
      if (!id) {
        return;
      }
      setActionSheetInlineError('');
      try {
        await deleteActionSheet(id);
      } catch (error: any) {
        setActionSheetInlineError(error?.message || 'Failed to delete Action Sheet.');
      }
    },
    [deleteActionSheet, setActionSheetInlineError]
  );

  const createTemplatedActionSheet = useCallback(
    async ({ title, prompt, checks }: { title: string; prompt: any; checks: any[] }) => {
      const resolvedTitle = String(title || '').trim() || 'Action Sheet';
      const created = await createActionSheet({
        title: resolvedTitle,
        prompt: { requirements: '', context: '', checks: '', done: '' },
        checks: [],
        conditional: conditionalDefaults,
      });
      if (!created?.id) {
        throw new Error('Unable to create Action Sheet.');
      }
      const completion = buildActionSheetCompletion(created.id);
      await updateActionSheetPlan(created.id, buildActionSheetPlan({ title: resolvedTitle, marker: completion.marker }));
      const doneBlock = [String(prompt?.done || '').trim(), completion.done].filter(Boolean).join(PARAGRAPH_BREAK);
      await updateActionSheetPrompt(created.id, {
        requirements: String(prompt?.requirements || ''),
        context: String(prompt?.context || ''),
        checks: String(prompt?.checks || ''),
        done: doneBlock,
      });
      const mergedChecks = [...(Array.isArray(checks) ? checks : []), ...completion.checks];
      await updateActionSheetChecks(created.id, mergedChecks);
      return created;
    },
    [
      conditionalDefaults,
      createActionSheet,
      updateActionSheetChecks,
      updateActionSheetPlan,
      updateActionSheetPrompt,
    ]
  );

  const createTurnGateCreateSheetForCell = useCallback(
    async ({ cell, stage }: { cell: any; stage?: string }) => {
      if (!cell?.id) {
        throw new Error('Cell selection is required.');
      }
      const repoRoot = String(cell.projectRoot || actionSheetsRoot || '').trim();
      const attachedWorktreePath = String(cell.attachedWorktreePath || '').trim();
      const lastKnownWorktreePath = String(cell.lastKnownWorktreePath || cell.worktreePath || '').trim();
      const hasAttachment = Boolean(attachedWorktreePath);
      const resolvedAgentGatesPath =
        repoRoot && cell.id ? `${repoRoot}/.agency/cells/${cell.id}/gates.yaml` : '';
      const resolvedStage = String(stage || '').trim() || 'active';
      const title = `Turn Gate Create: ${cell.name || cell.id}`;
      const prompt = {
        requirements: [
          'Define what "done" means for this Turn and ensure gates/checks exist before development.',
          '',
          'Gate Create (before development):',
          '- Confirm contract artifacts exist (OpenSpec change or a design note).',
          '- Define/adjust gates (Global -> Project -> Agent) so exit criteria is measurable.',
          '- Ensure checks are executable and reflect the desired exit criteria.',
          hasAttachment
            ? '- If this Cell is attached, make sure worktree-bound checks match the intended development path.'
            : '- This Cell is detached or missing a worktree, so keep the sheet focused on repo-owned evidence and lifecycle expectations.',
        ].join(LINE_BREAK),
        context: [
          `Cell: ${cell.name || cell.id}`,
          `Branch: ${cell.branch || ''}`,
          `Attachment: ${attachedWorktreePath || lastKnownWorktreePath || 'none'}`,
          `Target stage: ${resolvedStage}`,
          '',
          'Key paths:',
          projectGatesPath ? `- Project gates: ${projectGatesPath}` : null,
          resolvedAgentGatesPath ? `- Agent gates: ${resolvedAgentGatesPath}` : null,
          '',
          'Reference:',
          '- docs/notes-gate-turn-workflow.md',
        ]
          .filter(Boolean)
          .join(LINE_BREAK),
        checks: [
          'Suggested checks to consider adding (choose what applies):',
          '- openspec validate <change-id> --strict',
          '- pnpm -C apps/editor run typecheck:renderer',
          '- pnpm -C apps/editor run typecheck:electron',
          '- pnpm -C apps/editor exec playwright test',
        ].join(LINE_BREAK),
        done: [
          'Before starting development:',
          '- Make sure gates/checks match the Turn exit criteria.',
          '- Make sure the plan/checklist is actionable.',
        ].join(LINE_BREAK),
      };
      return createTemplatedActionSheet({ title, prompt, checks: [] });
    },
    [createTemplatedActionSheet, projectGatesPath]
  );

  const handleTurnGateCreateSheet = useCallback(
    async (stage?: string) => {
      if (!selectedCell?.id) {
        modal?.notify?.({
          title: 'Turn Gate Create unavailable',
          description: 'Select a Cell before creating a Turn gate sheet.',
          tone: 'warning',
        });
        return;
      }
      try {
        const created = await createTurnGateCreateSheetForCell({ cell: selectedCell, stage });
        handleOpenActionSheets(created.id);
      } catch (error: any) {
        modal?.notify?.({
          title: 'Failed to create Turn Gate sheet',
          description: error?.message || String(error),
          tone: 'danger',
        });
      }
    },
    [createTurnGateCreateSheetForCell, handleOpenActionSheets, modal, selectedCell]
  );

  const handleTurnGateExecuteSheet = useCallback(
    async (stage?: string) => {
      if (!selectedCell?.id) {
        modal?.notify?.({
          title: 'Turn Gate Execute unavailable',
          description: 'Select a Cell before creating a Turn gate execution sheet.',
          tone: 'warning',
        });
        return;
      }
      const resolvedStage = String(stage || '').trim() || 'active';
      try {
        const hasAttachment = Boolean(selectedCell.attachedWorktreePath);
        const resolved = await agencyGetGates({
          scope: 'resolved',
          rootPath: selectedCell.projectRoot || actionSheetsRoot || '',
          worktreePath: selectedCell.attachedWorktreePath || '',
          cellId: selectedCell.id,
        });
        const gates = Array.isArray(resolved?.[resolvedStage]) ? resolved[resolvedStage] : [];
        const checks = gates
          .map((gate: any) => {
            const commands = (Array.isArray(gate?.commands) ? gate.commands : [])
              .map((command: any) => String(command || '').trim())
              .filter((command: string) => command && !command.startsWith('#'));
            if (!gate?.id || commands.length === 0) {
              return null;
            }
            return {
              id: gate.id,
              label: gate.label || gate.id,
              commands,
            };
          })
          .filter(Boolean);

        const checkSummary = checks.length
          ? ['This sheet mirrors lifecycle gates:', '', ...checks.map((check: any) => `- ${check.label}`)].join(LINE_BREAK)
          : 'No gates with commands were found for this stage. Add gates first (Hierarchy -> Gates).';

        const title = `Turn Gate Execute (${resolvedStage}): ${selectedCell.name || selectedCell.id}`;
        const prompt = {
          requirements: [
            hasAttachment
              ? 'Execute this Turn gate set and fix failures until the worktree is merge-ready.'
              : 'Execute this Turn gate set and fix failures until the repo-owned Cell state and evidence are ready for the next lifecycle step.',
            '',
            'Gate Execute (after development):',
            '- Run the checks (mirrors lifecycle gates for the selected stage).',
            '- Fix failures until all checks pass.',
            hasAttachment
              ? '- Then proceed to merge / archive / lifecycle transition as needed.'
              : '- Then proceed to archive / cleanup / lifecycle transition as needed.',
          ].join(LINE_BREAK),
          context: [
            `Cell: ${selectedCell.name || selectedCell.id}`,
            `Branch: ${selectedCell.branch || ''}`,
            `Attachment: ${
              selectedCell.attachedWorktreePath ||
              selectedCell.lastKnownWorktreePath ||
              selectedCell.worktreePath ||
              'none'
            }`,
            `Stage: ${resolvedStage}`,
            '',
            'Key paths:',
            projectGatesPath ? `- Project gates: ${projectGatesPath}` : null,
            agentGatesPath ? `- Agent gates: ${agentGatesPath}` : null,
            '',
            'Reference:',
            '- docs/notes-gate-turn-workflow.md',
          ]
            .filter(Boolean)
            .join(LINE_BREAK),
          checks: checkSummary,
          done: [
            'After all checks pass:',
            hasAttachment
              ? '- Merge the branch/worktree changes.'
              : '- Confirm detached-cell evidence and lifecycle metadata are still consistent.',
            '- Archive the OpenSpec change if applicable.',
          ].join(LINE_BREAK),
        };

        const created = await createTemplatedActionSheet({ title, prompt, checks });
        handleOpenActionSheets(created.id);
      } catch (error: any) {
        modal?.notify?.({
          title: 'Failed to create Turn Gate execution sheet',
          description: error?.message || String(error),
          tone: 'danger',
        });
      }
    },
    [agentGatesPath, createTemplatedActionSheet, handleOpenActionSheets, modal, projectGatesPath, selectedCell]
  );

  return {
    handleCreateActionSheet,
    handleCreateDraftActionSheet,
    handleSaveActionSheet,
    handleDispatchActionSheet,
    handleRunDraftInActiveSession,
    handleDispatchExplorerFeed,
    handleViewActionSheetSession,
    handleArchiveActionSheet,
    handleDeleteActionSheet,
    handleOpenActionSheets,
    createTurnGateCreateSheetForCell,
    handleTurnGateCreateSheet,
    handleTurnGateExecuteSheet,
  };
}
