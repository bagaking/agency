import { useCallback } from 'react';

type UseMemoNavigationHandlersArgs = {
  handleSwitchView: (view: string) => void;
  setDockSelection: (value: any) => void;
  setMemoFocusTarget: (value: string) => void;
  handleOpenActionSheets: (actionSheetId?: string) => void;
  explorerDeliverySummary: any;
};

export function useMemoNavigationHandlers({
  handleSwitchView,
  setDockSelection,
  setMemoFocusTarget,
  handleOpenActionSheets,
  explorerDeliverySummary,
}: UseMemoNavigationHandlersArgs) {
  const handleFocusInboxInput = useCallback((targetId: string) => {
    if (!targetId) {
      return;
    }
    setMemoFocusTarget(targetId);
  }, [setMemoFocusTarget]);

  const handleFocusInboxInputHandled = useCallback(() => {
    setMemoFocusTarget('');
  }, [setMemoFocusTarget]);

  const handleOpenMemoInbox = useCallback(
    (inboxType = 'comments') => {
      handleSwitchView('memo');
      setDockSelection({
        type: 'inbox',
        inboxType,
        draftId: null,
      });
    },
    [handleSwitchView, setDockSelection]
  );

  const handleOpenMemoDraft = useCallback(
    (draftId: string) => {
      if (!draftId) {
        return;
      }
      handleSwitchView('memo');
      setDockSelection({
        type: 'draft',
        inboxType: 'comments',
        draftId,
      });
    },
    [handleSwitchView, setDockSelection]
  );

  const handleOpenDeliveryTimeline = useCallback(
    ({ draftId, actionSheetId }: { draftId?: string; actionSheetId?: string } = {}) => {
      if (draftId) {
        handleOpenMemoDraft(draftId);
        return;
      }
      if (actionSheetId) {
        handleOpenActionSheets(actionSheetId);
      }
    },
    [handleOpenActionSheets, handleOpenMemoDraft]
  );

  const handleOpenExplorerDeliveryTimeline = useCallback(() => {
    if (!explorerDeliverySummary) {
      return;
    }
    handleOpenDeliveryTimeline({
      draftId: explorerDeliverySummary?.draftId,
      actionSheetId: explorerDeliverySummary?.actionSheetId,
    });
  }, [explorerDeliverySummary, handleOpenDeliveryTimeline]);

  return {
    handleFocusInboxInput,
    handleFocusInboxInputHandled,
    handleOpenMemoInbox,
    handleOpenMemoDraft,
    handleOpenDeliveryTimeline,
    handleOpenExplorerDeliveryTimeline,
  };
}

