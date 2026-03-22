import { useCallback, useState } from 'react';
import type { ActiveView, HilDrawerPanel } from './appLayoutContracts';

type UseWorkbenchReplySelectionStateArgs = {
  selectedCellId: string;
  activeView: ActiveView;
  setHilDrawerOpen: (value: boolean) => void;
  setHilDrawerPanel: (value: HilDrawerPanel) => void;
  setHilDrawerPanelByView: (updater: (current: Record<string, string>) => Record<string, string>) => void;
};

export function useWorkbenchReplySelectionState({
  selectedCellId,
  activeView,
  setHilDrawerOpen,
  setHilDrawerPanel,
  setHilDrawerPanelByView,
}: UseWorkbenchReplySelectionStateArgs) {
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [workbenchSelectionByCellId, setWorkbenchSelectionByCellId] = useState<Record<string, any>>(
    {}
  );
  const [replySelectionByKey, setReplySelectionByKey] = useState<Record<string, any>>({});
  const [replyFocusToken, setReplyFocusToken] = useState(0);
  const [pendingWorkbenchJump, setPendingWorkbenchJump] = useState<any>(null);
  const [pendingExplorerReveal, setPendingExplorerReveal] = useState<any>(null);
  const [workbenchMetaByCellId, setWorkbenchMetaByCellId] = useState<Record<string, any>>({});

  const handleWorkbenchMetaChange = useCallback((cellId: string, meta: any) => {
    if (!cellId) {
      return;
    }
    setWorkbenchMetaByCellId((current) => ({
      ...current,
      [cellId]: meta || {},
    }));
  }, []);

  const handleWorkbenchSelectionChange = useCallback(
    (selection: any) => {
      const cellKey = selectedCellId || 'repo';
      setWorkbenchSelectionByCellId((current) => {
        if (!selection) {
          if (!current[cellKey]) {
            return current;
          }
          const next = { ...current };
          delete next[cellKey];
          return next;
        }
        return {
          ...current,
          [cellKey]: selection,
        };
      });
    },
    [selectedCellId]
  );

  const handleSelectionContext = useCallback((selection: any) => {
    if (!selection?.cellId || !selection?.sessionId) {
      return;
    }
    const key = `${selection.cellId}:${selection.sessionId}`;
    setReplySelectionByKey((current) => ({
      ...current,
      [key]: selection,
    }));
  }, []);

  const handleReplySelection = useCallback(
    (selection: any) => {
      if (!selection?.cellId || !selection?.sessionId) {
        return;
      }
      const key = `${selection.cellId}:${selection.sessionId}`;
      setReplySelectionByKey((current) => ({
        ...current,
        [key]: selection,
      }));
      setHilDrawerPanel('reply');
      setHilDrawerOpen(true);
      setHilDrawerPanelByView((current) => ({
        ...current,
        [activeView]: 'reply',
      }));
      setReplyFocusToken((token) => token + 1);
    },
    [activeView, setHilDrawerOpen, setHilDrawerPanel, setHilDrawerPanelByView]
  );

  const cellKey = selectedCellId || 'repo';
  const explorerMeta = workbenchMetaByCellId[cellKey] || {};
  const memoSelection = workbenchSelectionByCellId[cellKey] || null;

  return {
    cursorPosition,
    setCursorPosition,
    workbenchSelectionByCellId,
    setWorkbenchSelectionByCellId,
    replySelectionByKey,
    setReplySelectionByKey,
    replyFocusToken,
    pendingWorkbenchJump,
    setPendingWorkbenchJump,
    pendingExplorerReveal,
    setPendingExplorerReveal,
    workbenchMetaByCellId,
    setWorkbenchMetaByCellId,
    explorerMeta,
    memoSelection,
    handleWorkbenchMetaChange,
    handleWorkbenchSelectionChange,
    handleSelectionContext,
    handleReplySelection,
  };
}
