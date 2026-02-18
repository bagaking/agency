import { useCallback } from 'react';

type UseExplorerCommentRoutingArgs = {
  explorerRootPath: string;
  selectedCellId: string;
  handleOpenWorkbenchFile: (payload: any) => Promise<void>;
  openCommentModal: (payload?: { line?: number; column?: number }) => void;
  setActiveView: (view: string) => void;
  openHilDrawer: (panel?: string) => void;
};

export function useExplorerCommentRouting({
  explorerRootPath,
  selectedCellId,
  handleOpenWorkbenchFile,
  openCommentModal,
  setActiveView,
  openHilDrawer,
}: UseExplorerCommentRoutingArgs) {
  const handleAddCommentFromExplorer = useCallback((path: string) => {
    if (!path) {
      return;
    }
    void handleOpenWorkbenchFile({
      path,
      rootPath: explorerRootPath,
      focusView: true,
      cellId: selectedCellId,
      sourceSurface: 'explorer',
    });
    setTimeout(() => {
      openCommentModal({ line: 1 });
    }, 100);
  }, [explorerRootPath, handleOpenWorkbenchFile, openCommentModal, selectedCellId]);

  const handleJumpToComments = useCallback(
    (path: string) => {
      if (!path) {
        return;
      }
      void handleOpenWorkbenchFile({
        path,
        rootPath: explorerRootPath,
        focusView: true,
        cellId: selectedCellId,
        sourceSurface: 'explorer',
      });
      setActiveView('explorer');
      openHilDrawer('comments');
    },
    [explorerRootPath, handleOpenWorkbenchFile, openHilDrawer, selectedCellId, setActiveView]
  );

  return {
    handleAddCommentFromExplorer,
    handleJumpToComments,
  };
}

