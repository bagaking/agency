import { useCallback, useEffect, useRef } from 'react';

import {
  isAgencyMethodAvailable,
  onExplorerChanged,
  statWorkbenchEntry,
} from '../../services/agencyBridge';
import {
  isPathPossiblyChanged,
  resolveExternalReloadStrategy,
} from '../../utils/workbenchDiskSync';
import { WORKBENCH_TAB_DISK_SYNC_INTERVAL_MS } from './workbenchPaneHelpers';

type WorkbenchDiskSyncBindings = {
  activeTab: any;
  loadTab: (tab: any) => void;
  updateTabState: (tabId: string, updates: Record<string, any>) => void;
  tabStateByIdRef: { current: Record<string, any> };
};

export const useWorkbenchDiskSync = ({
  activeTab,
  loadTab,
  updateTabState,
  tabStateByIdRef,
}: WorkbenchDiskSyncBindings) => {
  const diskCheckInFlightRef = useRef(new Set<string>());
  const checkTabDiskVersion = useCallback(
    async (tab: any) => {
      if (!tab || !isAgencyMethodAvailable('statWorkbenchEntry')) {
        return;
      }
      const tabId = tab.id;
      const currentState = tabStateByIdRef.current[tabId];
      if (!currentState || currentState.loading || currentState.saving) {
        return;
      }
      if (diskCheckInFlightRef.current.has(tabId)) {
        return;
      }
      diskCheckInFlightRef.current.add(tabId);
      try {
        const stat = await statWorkbenchEntry({
          rootPath: tab.rootPath,
          targetPath: tab.path,
        });
        const latestState = tabStateByIdRef.current[tabId] || {};
        const diskMtimeMs = Number(stat?.mtimeMs || 0);
        const decision = resolveExternalReloadStrategy({
          knownMtimeMs: Number(latestState.mtimeMs || 0),
          diskMtimeMs,
          isDirty: Boolean(latestState.isDirty),
        });
        if (!decision.diskNewer) {
          if (latestState.needsReload) {
            updateTabState(tabId, { needsReload: false, diskMtimeMs: 0 });
          }
          return;
        }
        if (decision.shouldMarkNeedsReload) {
          updateTabState(tabId, { needsReload: true, diskMtimeMs });
          return;
        }
        if (decision.shouldAutoReload) {
          loadTab(tab);
        }
      } catch (_error) {
        // Ignore transient stat/read failures and keep current editor state.
      } finally {
        diskCheckInFlightRef.current.delete(tabId);
      }
    },
    [loadTab, tabStateByIdRef, updateTabState]
  );

  useEffect(() => {
    if (!activeTab) {
      return undefined;
    }
    const runCheck = () => {
      checkTabDiskVersion(activeTab);
    };
    runCheck();
    const intervalHandle = window.setInterval(() => {
      if (document.hidden) {
        return;
      }
      runCheck();
    }, WORKBENCH_TAB_DISK_SYNC_INTERVAL_MS);
    const handleFocus = () => runCheck();
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        runCheck();
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.clearInterval(intervalHandle);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeTab, checkTabDiskVersion]);

  useEffect(() => {
    if (!activeTab || !isAgencyMethodAvailable('onExplorerChanged')) {
      return undefined;
    }
    const unsubscribe = onExplorerChanged((payload) => {
      if (!payload) {
        return;
      }
      if (
        payload.rootPath &&
        activeTab.rootPath &&
        payload.rootPath !== activeTab.rootPath
      ) {
        return;
      }
      if (
        !isPathPossiblyChanged({
          targetPath: activeTab.path,
          changedDirs: payload.paths || [],
        })
      ) {
        return;
      }
      checkTabDiskVersion(activeTab);
    });
    return () => {
      unsubscribe?.();
    };
  }, [activeTab, checkTabDiskVersion]);
};
