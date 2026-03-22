import { useCallback, useEffect, useRef } from 'react';
import type {
  ActiveView,
  HilDrawerPanel,
} from './appLayoutContracts';
import {
  parseActiveView,
  parseHilDrawerPanel,
  parseHilDrawerPanelByView,
} from './appLayoutContracts';

import {
  getProjectContext,
  getTmuxStatus as agencyGetTmuxStatus,
  getUiState,
  isAgencyAvailable,
  listCells as agencyListCells,
  onCellsUpdated as subscribeCellsUpdated,
} from '../services/agencyBridge';

type UseRendererBootstrapArgs = {
  projectRoot: string;
  selectedId: string | null;
  defaultCells: any[];
  setLoading: (value: boolean) => void;
  setCells: (value: any[]) => void;
  setSelectedId: (value: any) => void;
  setProjectRoot: (value: string) => void;
  setRecentProjects: (value: any[]) => void;
  setFallbackTerminalRoot: (value: string) => void;
  setUserDataPath: (value: string) => void;
  setProjectError: (value: string) => void;
  setInitialActiveSessions: (value: any) => void;
  setInitialWorkbenchTabs: (value: any) => void;
  setInitialWorkbenchActiveTabs: (value: any) => void;
  setSidebarWidth: (value: number) => void;
  setSidebarCollapsed: (value: boolean) => void;
  setActiveView: (value: ActiveView) => void;
  setHilDrawerOpen: (value: boolean) => void;
  setHilDrawerPanel: (value: HilDrawerPanel) => void;
  setHilDrawerPanelByView: (value: any) => void;
  setTerminalOpen: (value: boolean) => void;
  setUiStateLoaded: (value: boolean) => void;
  uiStateLoaded: boolean;
  setTmuxStatus: (value: any) => void;
  setIpcAvailable: (value: boolean) => void;
};

export function useRendererBootstrap({
  projectRoot,
  selectedId,
  defaultCells,
  setLoading,
  setCells,
  setSelectedId,
  setProjectRoot,
  setRecentProjects,
  setFallbackTerminalRoot,
  setUserDataPath,
  setProjectError,
  setInitialActiveSessions,
  setInitialWorkbenchTabs,
  setInitialWorkbenchActiveTabs,
  setSidebarWidth,
  setSidebarCollapsed,
  setActiveView,
  setHilDrawerOpen,
  setHilDrawerPanel,
  setHilDrawerPanelByView,
  setTerminalOpen,
  setUiStateLoaded,
  uiStateLoaded,
  setTmuxStatus,
  setIpcAvailable,
}: UseRendererBootstrapArgs) {
  const loadCellsRequestIdRef = useRef(0);
  const resolveNextSelectedId = useCallback(
    ({
      currentSelectedId,
      nextCells,
      preferredSelection,
    }: {
      currentSelectedId: string | null;
      nextCells: any[];
      preferredSelection: string | null;
    }) => {
      const list = Array.isArray(nextCells) ? nextCells : [];
      if (!list.length) {
        return null;
      }
      const preferredMatch = preferredSelection
        ? list.find((cell) => cell.id === preferredSelection)
        : null;
      if (preferredMatch) {
        return preferredMatch.id;
      }
      const existingMatch = currentSelectedId
        ? list.find((cell) => cell.id === currentSelectedId)
        : null;
      if (existingMatch) {
        return existingMatch.id;
      }
      return list[0].id;
    },
    []
  );

  const loadCells = useCallback(
    async (preferredSelection: string | null = null, rootOverride = '') => {
      const requestId = loadCellsRequestIdRef.current + 1;
      loadCellsRequestIdRef.current = requestId;
      const effectiveRoot = rootOverride || projectRoot;
      setLoading(true);
      try {
        if (!effectiveRoot) {
          if (loadCellsRequestIdRef.current !== requestId) {
            return;
          }
          setCells([]);
          setSelectedId((current: string | null) => current || 'local-terminal');
          return;
        }
        const result = await agencyListCells({ rootPath: effectiveRoot });
        if (loadCellsRequestIdRef.current !== requestId) {
          return;
        }
        if (Array.isArray(result)) {
          setCells(result);
          setSelectedId((current: string | null) =>
            resolveNextSelectedId({
              currentSelectedId: current,
              nextCells: result,
              preferredSelection,
            })
          );
        } else {
          setCells(defaultCells);
          setSelectedId((current: string | null) => current || defaultCells[0].id);
        }
      } catch (error: any) {
        if (loadCellsRequestIdRef.current !== requestId) {
          return;
        }
        console.error(error);
        if (String(error?.message || '').includes('Project root is not configured')) {
          setCells([]);
          setSelectedId(null);
        } else {
          setCells(defaultCells);
          setSelectedId((current: string | null) => current || defaultCells[0].id);
        }
      } finally {
        if (loadCellsRequestIdRef.current === requestId) {
          setLoading(false);
        }
      }
    },
    [defaultCells, projectRoot, resolveNextSelectedId, setCells, setLoading, setSelectedId]
  );

  useEffect(() => {
    const bootstrap = async () => {
      let context: any = null;
      try {
        context = await getProjectContext();
      } catch (error) {
        console.error(error);
      }
      const resolvedProjectRoot = context?.projectRoot || '';
      setProjectRoot(resolvedProjectRoot);
      setRecentProjects(Array.isArray(context?.recentProjects) ? context.recentProjects : []);
      const resolvedUserDataPath = context?.userDataPath || '';
      setFallbackTerminalRoot(resolvedUserDataPath);
      setUserDataPath(resolvedUserDataPath);

      if (context?.storedRoot && !context?.valid) {
        setProjectError('Stored project path is no longer available. Select a new project.');
      } else {
        setProjectError('');
      }

      try {
        const state = await getUiState();
        if (state) {
          if (state?.activeSessionByCellId && typeof state.activeSessionByCellId === 'object') {
            setInitialActiveSessions(state.activeSessionByCellId);
          }
          if (state?.workbenchTabsByCellId && typeof state.workbenchTabsByCellId === 'object') {
            setInitialWorkbenchTabs(resolvedProjectRoot ? state.workbenchTabsByCellId : {});
          }
          if (state?.workbenchActiveTabByCellId && typeof state.workbenchActiveTabByCellId === 'object') {
            setInitialWorkbenchActiveTabs(resolvedProjectRoot ? state.workbenchActiveTabByCellId : {});
          }
          if (state?.selectedId) {
            setSelectedId(state.selectedId);
          } else if (!resolvedProjectRoot) {
            setSelectedId('local-terminal');
          }
          if (typeof state?.sidebarWidth === 'number') {
            setSidebarWidth(state.sidebarWidth);
          }
          if (typeof state?.sidebarCollapsed === 'boolean') {
            setSidebarCollapsed(state.sidebarCollapsed);
          }
          const restoredActiveView = parseActiveView(state?.activeView) || 'agent-cells';
          setActiveView(restoredActiveView);
          if (typeof state?.hilDrawerOpen === 'boolean') {
            setHilDrawerOpen(state.hilDrawerOpen);
          }
          const restoredHilDrawerPanel = parseHilDrawerPanel(state?.hilDrawerPanel);
          if (restoredHilDrawerPanel) {
            setHilDrawerPanel(restoredHilDrawerPanel);
          }
          const restoredHilDrawerPanelByView = parseHilDrawerPanelByView(
            state?.hilDrawerPanelByView
          );
          if (Object.keys(restoredHilDrawerPanelByView).length > 0) {
            setHilDrawerPanelByView(restoredHilDrawerPanelByView);
          } else if (restoredHilDrawerPanel) {
            setHilDrawerPanelByView({ [restoredActiveView]: restoredHilDrawerPanel });
          }
          if (!resolvedProjectRoot) {
            setActiveView('agent-cells');
            setSelectedId('local-terminal');
            setTerminalOpen(true);
            setCells([]);
          }
          await loadCells(
            state?.selectedId || (resolvedProjectRoot ? undefined : 'local-terminal'),
            resolvedProjectRoot
          );
          setUiStateLoaded(true);
          return;
        }
      } catch (error) {
        console.error(error);
      }

      await loadCells(undefined, resolvedProjectRoot);
      setUiStateLoaded(true);
    };

    bootstrap();
  }, [
    loadCells,
    setActiveView,
    setCells,
    setFallbackTerminalRoot,
    setHilDrawerOpen,
    setHilDrawerPanel,
    setHilDrawerPanelByView,
    setInitialActiveSessions,
    setInitialWorkbenchActiveTabs,
    setInitialWorkbenchTabs,
    setProjectError,
    setProjectRoot,
    setRecentProjects,
    setSelectedId,
    setSidebarCollapsed,
    setSidebarWidth,
    setTerminalOpen,
    setUiStateLoaded,
    setUserDataPath,
  ]);

  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event?.reason;
      if (reason && reason.type === 'cancelation') {
        event.preventDefault();
      }
    };
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeCellsUpdated(() => loadCells());
    if (!unsubscribe) {
      return undefined;
    }
    return () => {
      unsubscribe?.();
    };
  }, [loadCells]);

  useEffect(() => {
    if (!uiStateLoaded) {
      return;
    }
    if (!projectRoot) {
      setActiveView('agent-cells');
      setSelectedId('local-terminal');
      setTerminalOpen(true);
    }
    loadCells(undefined, projectRoot);
  }, [loadCells, projectRoot, setActiveView, setSelectedId, setTerminalOpen, uiStateLoaded]);

  useEffect(() => {
    const loadTmuxStatus = async () => {
      try {
        const status = await agencyGetTmuxStatus();
        if (!status) {
          return;
        }
        setTmuxStatus(status || { available: false, error: 'Unable to detect tmux.' });
      } catch (error: any) {
        setTmuxStatus({
          available: false,
          error: error?.message || 'Unable to detect tmux.',
          version: '',
        });
      }
    };
    loadTmuxStatus();
  }, [setTmuxStatus]);

  useEffect(() => {
    const available = isAgencyAvailable();
    setIpcAvailable(available);
    if (!available) {
      console.error('IPC unavailable: preload failed to expose window.agency.');
    }
  }, [setIpcAvailable]);

  return {
    loadCells,
  };
}
