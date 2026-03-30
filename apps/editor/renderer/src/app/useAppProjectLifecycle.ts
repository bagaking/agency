import { useCallback, useEffect } from 'react';

import {
  onProjectUpdated as subscribeProjectUpdated,
  onRecentProjectsUpdated as subscribeRecentProjectsUpdated,
  selectProjectRoot as agencySelectProjectRoot,
  setProjectRoot as agencySetProjectRoot,
  setUiState as agencySetUiState,
} from '../services/agencyBridge';

type UseAppProjectLifecycleArgs = {
  resetSessions: () => void;
  workbench: any;
  setSelectedId: (value: any) => void;
  setCells: (value: any) => void;
  setInitialActiveSessions: (value: any) => void;
  setInitialSessionVisitedByKey: (value: any) => void;
  setWorkbenchSelectionByCellId: (value: any) => void;
  setWorkbenchMetaByCellId: (value: any) => void;
  setInitialWorkbenchTabs: (value: any) => void;
  setInitialWorkbenchActiveTabs: (value: any) => void;
  setProjectError: (value: string) => void;
  setProjectRoot: (value: string) => void;
  setRecentProjects: (value: any[]) => void;
  selectedCellId: string;
  activeSessionByCellId: Record<string, string>;
  sessionVisitedByKey: Record<string, number>;
  uiStateLoaded: boolean;
  setTerminalMode: (value: string) => void;
  setTerminalOpen: (value: boolean) => void;
  sidebarWidth: number;
  sidebarCollapsed: boolean;
  activeView: string;
  hilDrawerOpen: boolean;
  hilDrawerPanel: string;
  hilDrawerPanelByView: Record<string, string>;
};

export function useAppProjectLifecycle({
  resetSessions,
  workbench,
  setSelectedId,
  setCells,
  setInitialActiveSessions,
  setInitialSessionVisitedByKey,
  setWorkbenchSelectionByCellId,
  setWorkbenchMetaByCellId,
  setInitialWorkbenchTabs,
  setInitialWorkbenchActiveTabs,
  setProjectError,
  setProjectRoot,
  setRecentProjects,
  selectedCellId,
  activeSessionByCellId,
  sessionVisitedByKey,
  uiStateLoaded,
  setTerminalMode,
  setTerminalOpen,
  sidebarWidth,
  sidebarCollapsed,
  activeView,
  hilDrawerOpen,
  hilDrawerPanel,
  hilDrawerPanelByView,
}: UseAppProjectLifecycleArgs) {
  const resetProjectState = useCallback(() => {
    setSelectedId(null);
    setCells([]);
    setInitialActiveSessions({});
    setInitialSessionVisitedByKey({});
    resetSessions();
    workbench.resetTabs();
    setWorkbenchSelectionByCellId({});
    setWorkbenchMetaByCellId({});
    setInitialWorkbenchTabs({});
    setInitialWorkbenchActiveTabs({});
  }, [
    resetSessions,
    setCells,
    setInitialActiveSessions,
    setInitialSessionVisitedByKey,
    setInitialWorkbenchActiveTabs,
    setInitialWorkbenchTabs,
    setSelectedId,
    setWorkbenchMetaByCellId,
    setWorkbenchSelectionByCellId,
    workbench,
  ]);

  const handleSelectProjectRoot = useCallback(async () => {
    setProjectError('');
    try {
      await agencySelectProjectRoot();
    } catch (error: any) {
      setProjectError(error?.message || 'Failed to select project.');
    }
  }, [setProjectError]);

  const handleOpenRecentProject = useCallback(
    async (projectPath: string) => {
      if (!projectPath) {
        return;
      }
      setProjectError('');
      try {
        await agencySetProjectRoot({ projectRoot: projectPath });
      } catch (error: any) {
        setProjectError(error?.message || 'Failed to open project.');
      }
    },
    [setProjectError]
  );

  useEffect(() => {
    const unsubscribe = subscribeProjectUpdated((payload: any) => {
      if (!payload) {
        return;
      }
      resetProjectState();
      setProjectRoot(payload.projectRoot || '');
      setRecentProjects(Array.isArray(payload.recentProjects) ? payload.recentProjects : []);
      setProjectError('');
    });
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [resetProjectState, setProjectError, setProjectRoot, setRecentProjects]);

  useEffect(() => {
    const unsubscribe = subscribeRecentProjectsUpdated((payload: any) => {
      if (!payload) {
        return;
      }
      setRecentProjects(Array.isArray(payload.recentProjects) ? payload.recentProjects : []);
    });
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [setRecentProjects]);

  useEffect(() => {
    if (!selectedCellId) {
      return;
    }
    if (uiStateLoaded) {
      agencySetUiState({
        selectedId: selectedCellId,
        activeSessionByCellId,
      }).catch(() => undefined);
    }
    setTerminalMode('shell');
    setTerminalOpen(true);
  }, [activeSessionByCellId, selectedCellId, setTerminalMode, setTerminalOpen, uiStateLoaded]);

  useEffect(() => {
    if (!uiStateLoaded) {
      return;
    }
    const handle = setTimeout(() => {
      agencySetUiState({
        sidebarWidth,
        sidebarCollapsed,
        activeView,
        hilDrawerOpen,
        hilDrawerPanel,
        hilDrawerPanelByView,
        sessionVisitedByKey,
        workbenchTabsByCellId: workbench.serializeTabs(workbench.tabsByCellId),
        workbenchActiveTabByCellId: workbench.activeTabByCellId,
      }).catch(() => undefined);
    }, 200);
    return () => clearTimeout(handle);
  }, [
    activeView,
    hilDrawerOpen,
    hilDrawerPanel,
    hilDrawerPanelByView,
    sessionVisitedByKey,
    sidebarCollapsed,
    sidebarWidth,
    uiStateLoaded,
    workbench,
    workbench.activeTabByCellId,
    workbench.tabsByCellId,
  ]);

  return {
    resetProjectState,
    handleSelectProjectRoot,
    handleOpenRecentProject,
  };
}
