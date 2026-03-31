import { useCallback } from 'react';

import { updateCellState as agencyUpdateCellState } from '../services/agencyBridge';

type UseCellLifecycleTransitionModalArgs = {
  pendingTransition: any;
  setPendingTransition: (value: any) => void;
  setTransitionError: (value: string) => void;
  setTransitionLoading: (value: boolean) => void;
  loadCells: (preferredSelection?: string | null) => Promise<void>;
  checkGatesForCell: (payload: any) => Promise<any[]>;
};

export function useCellLifecycleTransitionModal({
  pendingTransition,
  setPendingTransition,
  setTransitionError,
  setTransitionLoading,
  loadCells,
  checkGatesForCell,
}: UseCellLifecycleTransitionModalArgs) {
  const handleCancelTransition = useCallback(() => {
    setPendingTransition(null);
    setTransitionError('');
  }, [setPendingTransition, setTransitionError]);

  const handleConfirmTransition = useCallback(async () => {
    if (!pendingTransition?.cell) {
      return;
    }
    setTransitionLoading(true);
    try {
      const result = await agencyUpdateCellState({
        id: pendingTransition.cell.id,
        state: pendingTransition.nextState,
        worktreePath: pendingTransition.cell.worktreePath,
        rootPath: pendingTransition.cell.projectRoot || '',
      });
      if (!result) {
        setTransitionError('Lifecycle transition failed.');
        return;
      }
      await loadCells(
        pendingTransition.preferredSelectionId ?? pendingTransition.cell.id ?? null
      );
      setPendingTransition(null);
    } catch (error: any) {
      setTransitionError(error?.message || 'Lifecycle transition failed.');
    } finally {
      setTransitionLoading(false);
    }
  }, [loadCells, pendingTransition, setPendingTransition, setTransitionError, setTransitionLoading]);

  const handleRefreshTransitionGates = useCallback(async () => {
    if (!pendingTransition?.cell) {
      return;
    }
    try {
      const attachmentState = String(
        pendingTransition.cell?.attachmentState || 'attached'
      ).trim().toLowerCase();
      const gates = ['active', 'archived'].includes(pendingTransition.nextState) && attachmentState === 'attached'
        ? await checkGatesForCell({
            cell: pendingTransition.cell,
            stage: pendingTransition.nextState,
          })
        : [];
      setPendingTransition({
        ...pendingTransition,
        gates,
      });
      setTransitionError('');
    } catch (error: any) {
      setTransitionError(error?.message || 'Failed to run gates.');
    }
  }, [checkGatesForCell, pendingTransition, setPendingTransition, setTransitionError]);

  return {
    handleCancelTransition,
    handleConfirmTransition,
    handleRefreshTransitionGates,
  };
}
