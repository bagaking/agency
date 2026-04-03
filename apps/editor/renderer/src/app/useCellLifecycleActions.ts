import { useCallback } from 'react';

import {
  clearCellAttachment as agencyClearCellAttachment,
  createCell as agencyCreateCell,
  deleteCell as agencyDeleteCell,
  listCells as agencyListCells,
  updateCellMeta as agencyUpdateCellMeta,
} from '../services/agencyBridge';

type UseCellLifecycleActionsArgs = {
  scopedCell: any | null;
  cells: any[];
  projectRoot: string;
  projectReady: boolean;
  selectedCell: any | null;
  loadCells: (preferredSelection?: string | null, rootOverride?: string) => Promise<void>;
  checkGatesForCell: (payload: any) => Promise<any[]>;
  createTurnGateCreateSheetForCell: (payload: any) => Promise<any>;
  handleOpenActionSheets: (sheetId?: string) => void;
  handleOpenTerminal: () => void;
  setTransitionError: (value: string) => void;
  setCells: (value: any[]) => void;
  setPendingTransition: (value: any) => void;
  setProjectError: (value: string) => void;
  setLoading: (value: boolean) => void;
  setSelectedId: (value: any) => void;
  saveGates: () => Promise<any>;
  modal: any;
};

export function useCellLifecycleActions({
  scopedCell,
  cells,
  projectRoot,
  projectReady,
  selectedCell,
  loadCells,
  checkGatesForCell,
  createTurnGateCreateSheetForCell,
  handleOpenActionSheets,
  handleOpenTerminal,
  setTransitionError,
  setCells,
  setPendingTransition,
  setProjectError,
  setLoading,
  setSelectedId,
  saveGates,
  modal,
}: UseCellLifecycleActionsArgs) {
  const resolveLifecycleTargetCell = useCallback(
    (targetCell?: any | null) => targetCell || scopedCell || selectedCell || null,
    [scopedCell, selectedCell]
  );

  const handleStateChange = useCallback(
    async (nextState: string, targetCell?: any | null, transitionMeta: Record<string, any> = {}) => {
      const resolvedCell = resolveLifecycleTargetCell(targetCell);
      if (!resolvedCell) {
        return;
      }
      const shouldSelectTarget = transitionMeta.selectTarget !== false;
      if (nextState === resolvedCell.state) {
        return;
      }
      if (shouldSelectTarget && resolvedCell?.id && resolvedCell.id !== selectedCell?.id) {
        setSelectedId(resolvedCell.id);
      }
      setTransitionError('');
      let nextCells = cells;
      try {
        const result = await agencyListCells({ rootPath: projectRoot });
        if (Array.isArray(result)) {
          nextCells = result;
          setCells(nextCells);
        }
      } catch (error) {
        console.error(error);
      }
      const freshCell = nextCells.find((cell) => cell.id === resolvedCell.id) || resolvedCell;
      const attachmentState = String(freshCell?.attachmentState || 'attached').trim().toLowerCase();
      let gates: any[] = [];
      const shouldCheckGates =
        transitionMeta.requireGates === true &&
        ['active', 'archived'].includes(nextState) &&
        attachmentState === 'attached';
      if (shouldCheckGates) {
        gates = await checkGatesForCell({ cell: freshCell, stage: nextState, silent: true });
      }
      setPendingTransition({
        cell: freshCell,
        nextState,
        gates,
        source: transitionMeta.source || 'lifecycle-stepper',
        preferredSelectionId: shouldSelectTarget ? freshCell.id : selectedCell?.id || null,
      });
    },
    [
      cells,
      checkGatesForCell,
      projectRoot,
      resolveLifecycleTargetCell,
      selectedCell?.id,
      setCells,
      setPendingTransition,
      setSelectedId,
      setTransitionError,
    ]
  );

  const handleArchiveCell = useCallback(
    (targetCell?: any | null) =>
      handleStateChange('archived', targetCell, {
        source: 'cleanup-card',
        selectTarget: false,
      }),
    [handleStateChange]
  );

  const handleUpdateCellAvatar = useCallback(
    async (avatar: string) => {
      if (!selectedCell) {
        return;
      }
      await agencyUpdateCellMeta({
        id: selectedCell.id,
        worktreePath: selectedCell.worktreePath,
        rootPath: projectRoot,
        avatar,
      });
      await loadCells();
    },
    [loadCells, projectRoot, selectedCell]
  );

  const handleClearAttachment = useCallback(async (targetCell?: any | null) => {
    const resolvedCell = resolveLifecycleTargetCell(targetCell);
    if (!resolvedCell) {
      return;
    }
    if (resolvedCell?.id && resolvedCell.id !== selectedCell?.id) {
      setSelectedId(resolvedCell.id);
    }
    if (!modal?.confirm) {
      return;
    }
    const confirmed = await modal.confirm({
      title: 'Clear Cell Attachment',
      description:
        'This removes the current worktree attachment from the Cell record. Session history and Cell metadata stay in the repository-owned Cell store.',
      confirmLabel: 'Clear Attachment',
      cancelLabel: 'Cancel',
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }
    setLoading(true);
    try {
      await agencyClearCellAttachment({
        id: resolvedCell.id,
        worktreePath: resolvedCell.worktreePath,
        rootPath: projectRoot,
      });
      await loadCells(resolvedCell.id);
    } catch (error: any) {
      modal?.notify?.({
        title: 'Failed to clear attachment',
        description: error?.message || 'Unable to clear attachment metadata for this Cell.',
        tone: 'warning',
      });
    } finally {
      setLoading(false);
    }
  }, [loadCells, modal, projectRoot, resolveLifecycleTargetCell, selectedCell?.id, setLoading, setSelectedId]);

  const handleDelete = useCallback(async (targetCell?: any | null) => {
    const resolvedCell = resolveLifecycleTargetCell(targetCell);
    if (!resolvedCell) {
      return;
    }
    if (resolvedCell?.id && resolvedCell.id !== selectedCell?.id) {
      setSelectedId(resolvedCell.id);
    }
    if (!modal?.confirm) {
      return;
    }
    const confirmed = await modal.confirm({
      title: 'Delete Cell',
      description:
        'This removes the repo-owned Cell record and its Cell-owned artifacts. It does not restore deleted worktrees.',
      confirmLabel: 'Delete Cell',
      cancelLabel: 'Cancel',
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }
    setLoading(true);
    try {
      await agencyDeleteCell({
        id: resolvedCell.id,
        worktreePath: resolvedCell.worktreePath,
        rootPath: projectRoot,
      });
      await loadCells();
    } catch (error: any) {
      modal?.notify?.({
        title: 'Failed to delete Cell',
        description: error?.message || 'Unable to delete this Cell.',
        tone: 'warning',
      });
    } finally {
      setLoading(false);
    }
  }, [loadCells, modal, projectRoot, resolveLifecycleTargetCell, selectedCell?.id, setLoading, setSelectedId]);

  const handleCreate = useCallback(
    async ({ name, branch, baseBranch, existingBranch, reusePath, bindToCellId, startTurnGateCreate }: any) => {
      if (!projectReady) {
        setProjectError('Select a project before creating or tracking a Cell.');
        return;
      }
      setLoading(true);
      try {
        const cell = await agencyCreateCell({
          name,
          branch,
          baseBranch,
          existingBranch,
          reusePath,
          bindToCellId,
          rootPath: projectRoot,
        });
        if (!cell) {
          return;
        }
        await loadCells();
        if (cell?.id) {
          setSelectedId(cell.id);
        }
        handleOpenTerminal();

        if (startTurnGateCreate) {
          try {
            const stage = cell?.state === 'archived' ? 'archived' : 'active';
            const created = await createTurnGateCreateSheetForCell({ cell, stage });
            handleOpenActionSheets(created.id);
          } catch (error: any) {
            modal?.notify?.({
              title: 'Failed to start Turn',
              description: error?.message || 'Unable to create Gate Create sheet for this Cell.',
              tone: 'warning',
            });
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    },
    [
      createTurnGateCreateSheetForCell,
      handleOpenActionSheets,
      handleOpenTerminal,
      loadCells,
      modal,
      projectReady,
      projectRoot,
      setLoading,
      setProjectError,
      setSelectedId,
    ]
  );

  const handleSaveGates = useCallback(async () => {
    await saveGates();
    await loadCells();
  }, [loadCells, saveGates]);

  return {
    handleStateChange,
    handleArchiveCell,
    handleUpdateCellAvatar,
    handleClearAttachment,
    handleDelete,
    handleCreate,
    handleSaveGates,
  };
}
