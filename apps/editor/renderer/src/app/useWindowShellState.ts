import { useCallback, useEffect, useState } from 'react';
import {
  normalizeWindowAttentionSummary,
  type WindowAttentionSummary,
} from '../../../shared/attention';

import {
  createWindowShell,
  focusWindowShell,
  listWindowShells,
  onWindowShellUpdated,
  toggleWindowShellZoom,
} from '../services/agencyBridge';

export type WindowShellItem = {
  windowId: number;
  windowStateId: string;
  projectRoot: string;
  projectName: string;
  title: string;
  isFocused: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  isFullScreen: boolean;
  attentionSummary: WindowAttentionSummary | null;
};

function normalizeWindowShells(payload: any): WindowShellItem[] {
  const raw = Array.isArray(payload?.windows) ? payload.windows : [];
  return raw
    .map((entry) => ({
      windowId: Number(entry?.windowId || 0),
      windowStateId: String(entry?.windowStateId || '').trim(),
      projectRoot: String(entry?.projectRoot || '').trim(),
      projectName: String(entry?.projectName || '').trim() || 'No Project',
      title: String(entry?.title || '').trim() || 'Agency',
      isFocused: Boolean(entry?.isFocused),
      isMinimized: Boolean(entry?.isMinimized),
      isMaximized: Boolean(entry?.isMaximized),
      isFullScreen: Boolean(entry?.isFullScreen),
      attentionSummary: normalizeWindowAttentionSummary(entry?.attentionSummary),
    }))
    .filter((entry) => entry.windowId > 0 && entry.windowStateId);
}

export function useWindowShellState() {
  const [windows, setWindows] = useState<WindowShellItem[]>([]);

  const refreshWindows = useCallback(async () => {
    try {
      const payload = await listWindowShells();
      setWindows(normalizeWindowShells(payload));
    } catch (error) {
      console.error(error);
    }
  }, []);

  const handleCreateWindow = useCallback(async () => {
    try {
      await createWindowShell();
    } catch (error) {
      console.error(error);
    }
  }, []);

  const handleFocusWindow = useCallback(async (windowStateId: string) => {
    if (!windowStateId) {
      return;
    }
    try {
      await focusWindowShell({ windowStateId });
    } catch (error) {
      console.error(error);
    }
  }, []);

  const handleToggleWindowZoom = useCallback(async (windowStateId?: string) => {
    try {
      await toggleWindowShellZoom(windowStateId ? { windowStateId } : {});
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    void refreshWindows();
    const unsubscribe = onWindowShellUpdated((payload: any) => {
      setWindows(normalizeWindowShells(payload));
    });
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [refreshWindows]);

  return {
    windows,
    refreshWindows,
    handleCreateWindow,
    handleFocusWindow,
    handleToggleWindowZoom,
  };
}
