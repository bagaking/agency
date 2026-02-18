import { useCallback, useEffect } from 'react';

type UseSessionSidebarSelectionArgs = {
  activeView: string;
  projectReady: boolean;
  displayCells: any[];
  refreshSessionsForCells: (cells: any[], options?: any) => void;
  selectSession: (sessionId: string, cellId?: string) => void;
  setSelectedId: (value: any) => void;
  setTerminalOpen: (value: boolean) => void;
};

export function useSessionSidebarSelection({
  activeView,
  projectReady,
  displayCells,
  refreshSessionsForCells,
  selectSession,
  setSelectedId,
  setTerminalOpen,
}: UseSessionSidebarSelectionArgs) {
  useEffect(() => {
    if (activeView !== 'agent-cells' || !projectReady || displayCells.length === 0) {
      return;
    }
    refreshSessionsForCells(displayCells, { silent: true });
  }, [activeView, displayCells, projectReady, refreshSessionsForCells]);

  const handleSelectSessionFromSidebar = useCallback(
    (cellId: string, sessionId: string) => {
      if (!cellId || !sessionId) {
        return;
      }
      const targetCell = displayCells.find((cell) => cell.id === cellId);
      if (!targetCell) {
        return;
      }
      setSelectedId(cellId);
      selectSession(sessionId, cellId);
      setTerminalOpen(true);
      refreshSessionsForCells([targetCell], { silent: true });
    },
    [displayCells, refreshSessionsForCells, selectSession, setSelectedId, setTerminalOpen]
  );

  return {
    handleSelectSessionFromSidebar,
  };
}

