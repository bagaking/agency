import { useCallback, useEffect } from 'react';

import { onAppShortcutTriggered as subscribeAppShortcutTriggered } from '../services/agencyBridge';

type UseGlobalAppShortcutListenerArgs = {
  handleSwitchView: (view: string) => void;
  setHilDrawerOpen: (value: boolean) => void;
  handleOpenMemoInbox: (inboxType?: string) => void;
  handleCaptureScreenshot?: () => void;
  flashVoice?: { start?: () => void };
};

export function useGlobalAppShortcutListener({
  handleSwitchView,
  setHilDrawerOpen,
  handleOpenMemoInbox,
  handleCaptureScreenshot,
  flashVoice,
}: UseGlobalAppShortcutListenerArgs) {
  const handleAppShortcutTriggered = useCallback(
    (payload: any) => {
      const actionId = payload?.id;
      if (!actionId) {
        return;
      }
      if (actionId === 'view.agents') {
        handleSwitchView('agent-cells');
        return;
      }
      if (actionId === 'view.explorer') {
        handleSwitchView('explorer');
        return;
      }
      if (actionId === 'capture.screenshot') {
        handleSwitchView('memo');
        setHilDrawerOpen(true);
        handleOpenMemoInbox('screenshot');
        handleCaptureScreenshot?.();
        return;
      }
      if (actionId === 'memo.voice') {
        handleSwitchView('memo');
        setHilDrawerOpen(true);
        handleOpenMemoInbox('flash');
        flashVoice?.start?.();
      }
    },
    [flashVoice, handleCaptureScreenshot, handleOpenMemoInbox, handleSwitchView, setHilDrawerOpen]
  );

  useEffect(() => {
    const unsubscribe = subscribeAppShortcutTriggered?.(handleAppShortcutTriggered);
    return () => unsubscribe?.();
  }, [handleAppShortcutTriggered]);
}

