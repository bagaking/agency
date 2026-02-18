import { useCallback } from 'react';

import {
  createCell as agencyCreateCell,
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
  const handleStateChange = useCallback(
    async (nextState: string) => {
      if (!scopedCell) {
        return;
      }
      if (nextState === scopedCell.state) {
        return;
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
      const freshCell = nextCells.find((cell) => cell.id === scopedCell.id) || scopedCell;
      let gates: any[] = [];
      if (['active', 'archived'].includes(nextState)) {
        gates = await checkGatesForCell({ cell: freshCell, stage: nextState, silent: true });
      }
      setPendingTransition({
        cell: freshCell,
        nextState,
        gates,
      });
    },
    [cells, checkGatesForCell, projectRoot, scopedCell, setCells, setPendingTransition, setTransitionError]
  );

  const handleUpdateCellAvatar = useCallback(
    async (avatar: string) => {
      if (!selectedCell) {
        return;
      }
      await agencyUpdateCellMeta({
        id: selectedCell.id,
        worktreePath: selectedCell.worktreePath,
        avatar,
      });
      await loadCells();
    },
    [loadCells, selectedCell]
  );

  const handleCreate = useCallback(
    async ({ name, branch, reusePath, startTurnGateCreate }: any) => {
      if (!projectReady) {
        setProjectError('Select a project before creating a Cell.');
        return;
      }
      setLoading(true);
      try {
        const cell = await agencyCreateCell({
          name,
          branch,
          reusePath,
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
    handleUpdateCellAvatar,
    handleCreate,
    handleSaveGates,
  };
}
