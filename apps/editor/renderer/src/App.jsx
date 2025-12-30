import React, { useCallback, useEffect, useMemo, useState } from 'react';
import 'xterm/css/xterm.css';
import { StatusBar } from './components/StatusBar.jsx';
import { AppLayout } from './components/AppLayout.jsx';
import { CreateCellModal } from './components/modals/CreateCellModal.jsx';
import { LifecycleConfirmModal } from './components/modals/LifecycleConfirmModal.jsx';
import { useQuickActions } from './hooks/useQuickActions.js';
import { useGates } from './hooks/useGates.js';
import { useWorktreeLinks } from './hooks/useWorktreeLinks.js';
import { useSessions } from './hooks/useSessions.js';
import { useWorkbench } from './hooks/useWorkbench.js';
const defaultCells = [
  {
    id: 'sample-cell',
    name: 'sample-cell',
    branch: 'feature/sample-cell',
    worktreePath: '',
    state: 'draft',
    gatesStage: 'active',
    gates: [],
    validation: { warnings: ['Spec file not found (temporary validation).'] },
  },
];
function App() {
  const [cells, setCells] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [pendingTransition, setPendingTransition] = useState(null);
  const [transitionError, setTransitionError] = useState('');
  const [transitionLoading, setTransitionLoading] = useState(false);
  const [uiStateLoaded, setUiStateLoaded] = useState(false);
  const [activeView, setActiveView] = useState('agent-cells');
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hierarchySection, setHierarchySection] = useState('actions');
  const [actionsScope, setActionsScope] = useState('global');
  const [gateScope, setGateScope] = useState('global');
  const [gateStage, setGateStage] = useState('active');
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalMode, setTerminalMode] = useState('shell');
  const [tmuxStatus, setTmuxStatus] = useState({ available: true });
  const [initialActiveSessions, setInitialActiveSessions] = useState({});
  const [initialWorkbenchTabs, setInitialWorkbenchTabs] = useState({});
  const [initialWorkbenchActiveTabs, setInitialWorkbenchActiveTabs] = useState({});
  const selectedCell = useMemo(
    () => cells.find((cell) => cell.id === selectedId),
    [cells, selectedId]
  );
  const loadCells = useCallback(
    async (preferredSelection) => {
      setLoading(true);
      try {
        if (window.agency && window.agency.listCells) {
          const result = await window.agency.listCells();
          setCells(result);
          if (result.length && !selectedId) {
            const match = preferredSelection
              ? result.find((cell) => cell.id === preferredSelection)
              : null;
            setSelectedId(match ? match.id : result[0].id);
          }
        } else {
          setCells(defaultCells);
          if (!selectedId) setSelectedId(defaultCells[0].id);
        }
      } catch (error) {
        console.error(error);
        setCells(defaultCells);
        if (!selectedId) setSelectedId(defaultCells[0].id);
      } finally {
        setLoading(false);
      }
    },
    [selectedId]
  );
  useEffect(() => {
    const bootstrap = async () => {
      if (window.agency?.getUiState) {
        try {
          const state = await window.agency.getUiState();
          if (state?.activeSessionByCellId && typeof state.activeSessionByCellId === 'object') {
            setInitialActiveSessions(state.activeSessionByCellId);
          }
          if (state?.workbenchTabsByCellId && typeof state.workbenchTabsByCellId === 'object') {
            setInitialWorkbenchTabs(state.workbenchTabsByCellId);
          }
          if (state?.workbenchActiveTabByCellId && typeof state.workbenchActiveTabByCellId === 'object') {
            setInitialWorkbenchActiveTabs(state.workbenchActiveTabByCellId);
          }
          if (state?.selectedId) {
            setSelectedId(state.selectedId);
          }
          if (typeof state?.sidebarWidth === 'number') {
            setSidebarWidth(state.sidebarWidth);
          }
          if (typeof state?.sidebarCollapsed === 'boolean') {
            setSidebarCollapsed(state.sidebarCollapsed);
          }
          if (typeof state?.activeView === 'string') {
            const allowedViews = new Set(['agent-cells', 'explorer', 'hierarchy', 'settings']);
            if (allowedViews.has(state.activeView)) {
              setActiveView(state.activeView);
            }
          }
          await loadCells(state?.selectedId);
        } catch (error) {
          console.error(error);
          await loadCells();
        } finally {
          setUiStateLoaded(true);
        }
        return;
      }
      await loadCells();
      setUiStateLoaded(true);
    };
    bootstrap();
  }, [loadCells]);
  useEffect(() => {
    if (!window.agency || !window.agency.onCellsUpdated) {
      return undefined;
    }
    const unsubscribe = window.agency.onCellsUpdated(() => loadCells());
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [loadCells]);
  useEffect(() => {
    const loadTmuxStatus = async () => {
      if (!window.agency?.getTmuxStatus) {
        return;
      }
      try {
        const status = await window.agency.getTmuxStatus();
        setTmuxStatus(status || { available: false, error: 'Unable to detect tmux.' });
      } catch (error) {
        setTmuxStatus({
          available: false,
          error: error?.message || 'Unable to detect tmux.',
        });
      }
    };
    loadTmuxStatus();
  }, []);
  const {
    links: worktreeLinks,
    autoLinkOnCreate: worktreeLinksAuto,
    candidates: worktreeLinksCandidates,
    statusesByPath: worktreeLinksStatusesByPath,
    repoRoot,
    configPath: worktreeLinksConfigPath,
    loading: worktreeLinksLoading,
    error: worktreeLinksError,
    dirty: worktreeLinksDirty,
    toggleAuto: toggleWorktreeLinksAuto,
    addLink: addWorktreeLink,
    addFromCandidate: addWorktreeLinkFromCandidate,
    updateLink: updateWorktreeLink,
    removeLink: removeWorktreeLink,
    saveLinks: saveWorktreeLinks,
    applyLink: applyWorktreeLink,
    applyAll: applyAllWorktreeLinks,
    refreshLinks: refreshWorktreeLinks,
    clearError: clearWorktreeLinksError,
  } = useWorktreeLinks({ selectedCell, cells });
  const {
    resolvedQuickActions,
    actionsRows,
    scopeDisabled: actionsScopeDisabled,
    projectActionsPath,
    agentActionsPath,
    quickActionsError,
    quickActionsSaving,
    actionSummary,
    addQuickAction,
    updateQuickAction,
    overrideQuickAction,
    removeQuickAction,
    resetQuickAction,
    saveQuickActions,
    clearQuickActionsError,
  } = useQuickActions({ selectedCell, actionsScope });
  const {
    gateRows,
    gateScopeDisabled,
    projectGatesPath,
    agentGatesPath,
    gatesError,
    gatesSaving,
    gateResultsByCellId,
    gatesCheckingByCellId,
    gateSummary,
    checkGatesForCell,
    addGate,
    updateGate,
    overrideGate,
    removeGate,
    resetGate,
    saveGates,
    clearGatesError,
  } = useGates({ selectedCell, gateScope, gateStage, repoRoot });
  const handleOpenTerminal = useCallback(() => {
    setTerminalMode('shell');
    setTerminalOpen(true);
  }, []);
  const {
    sessions,
    activeSessionId,
    activeFontSize,
    lastActivityAt,
    sessionActivityByKey,
    sessionLoading,
    sessionError,
    pendingCommand,
    activeSessionByCellId,
    refreshSessions,
    createSession,
    closeSession,
    detachSession,
    renameSession,
    selectSession,
    updateSessionActivity,
    zoomIn,
    zoomOut,
    zoomReset,
    runActionCommand,
    acknowledgeCommandSent,
    handleSessionAttached,
  } = useSessions({
    selectedCell,
    tmuxStatus,
    onOpenTerminal: handleOpenTerminal,
    initialActiveSessions,
  });
  const workbench = useWorkbench({
    selectedCell,
    repoRoot,
    initialTabsByCellId: initialWorkbenchTabs,
    initialActiveTabByCellId: initialWorkbenchActiveTabs,
  });
  useEffect(() => {
    if (!selectedCell?.id) {
      return;
    }
    if (uiStateLoaded && window.agency?.setUiState) {
      window.agency
        .setUiState({
          selectedId: selectedCell.id,
          activeSessionByCellId,
        })
        .catch(() => undefined);
    }
    setTerminalMode('shell');
    setTerminalOpen(true);
  }, [selectedCell?.id, activeSessionByCellId, uiStateLoaded]);

  useEffect(() => {
    if (!uiStateLoaded || !window.agency?.setUiState) {
      return;
    }
    const handle = setTimeout(() => {
      window.agency
        .setUiState({
          sidebarWidth,
          sidebarCollapsed,
          activeView,
          workbenchTabsByCellId: workbench.serializeTabs(workbench.tabsByCellId),
          workbenchActiveTabByCellId: workbench.activeTabByCellId,
        })
        .catch(() => undefined);
    }, 200);
    return () => clearTimeout(handle);
  }, [
    activeView,
    sidebarCollapsed,
    sidebarWidth,
    uiStateLoaded,
    workbench.activeTabByCellId,
    workbench.tabsByCellId,
  ]);
  const gateDisplayStage = selectedCell?.state === 'archived' ? 'archived' : 'active';
  const gateResultsByStage = selectedCell ? gateResultsByCellId[selectedCell.id] || {} : {};
  const gatesCheckingByStage = selectedCell ? gatesCheckingByCellId[selectedCell.id] || {} : {};
  const handleStateChange = useCallback(
    async (nextState) => {
      if (!selectedCell || !window.agency?.updateCellState) {
        return;
      }
      if (nextState === selectedCell.state) {
        return;
      }
      setTransitionError('');
      let nextCells = cells;
      if (window.agency?.listCells) {
        try {
          nextCells = await window.agency.listCells();
          setCells(nextCells);
        } catch (error) {
          console.error(error);
        }
      }
      const freshCell = nextCells.find((cell) => cell.id === selectedCell.id) || selectedCell;
      let gates = [];
      if (['active', 'archived'].includes(nextState)) {
        gates = await checkGatesForCell({ cell: freshCell, stage: nextState, silent: true });
      }
      setPendingTransition({
        cell: freshCell,
        nextState,
        gates,
      });
    },
    [cells, checkGatesForCell, selectedCell]
  );
  const handleCreate = useCallback(
    async ({ name, branch, reusePath }) => {
      if (!window.agency?.createCell) {
        return;
      }
      setLoading(true);
      try {
        const cell = await window.agency.createCell({ name, branch, reusePath });
        setShowCreate(false);
        await loadCells();
        if (cell?.id) {
          setSelectedId(cell.id);
        }
        handleOpenTerminal();
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    },
    [handleOpenTerminal, loadCells]
  );
  const handleSaveGates = useCallback(async () => {
    await saveGates();
    await loadCells();
  }, [loadCells, saveGates]);
  const canUseScopedConfig = Boolean(selectedCell?.worktreePath);

  const editorPaneProps = {
    cell: selectedCell,
    terminalMode,
    terminalOpen,
    sessionId: activeSessionId,
    sessions,
    sessionLoading,
    sessionError,
    quickActions: resolvedQuickActions,
    tmuxStatus,
    gateResultsByStage,
    gatesCheckingByStage,
    gateDisplayStage,
    idleSince: lastActivityAt,
    isVisible: activeView === 'agent-cells',
    onCreateSession: createSession,
    onRefreshSessions: refreshSessions,
    onSelectSession: selectSession,
    onCloseSession: closeSession,
    onDetachSession: detachSession,
    onRenameSession: renameSession,
    onStateChange: handleStateChange,
    onOpenTerminal: handleOpenTerminal,
    onZoomIn: zoomIn,
    onZoomOut: zoomOut,
    onZoomReset: zoomReset,
    onRunCommand: runActionCommand,
    pendingCommand,
    onCommandSent: acknowledgeCommandSent,
    onSessionActivity: updateSessionActivity,
    onSessionAttached: handleSessionAttached,
    terminalFontSize: activeFontSize,
  };
  const explorerRootPath = selectedCell?.worktreePath || repoRoot || '';
  const explorerRootLabel = selectedCell?.name || 'Repository';
  const handleSwitchView = useCallback(
    (view) => {
      setActiveView(view);
      if (sidebarCollapsed) {
        setSidebarCollapsed(false);
      }
    },
    [sidebarCollapsed]
  );
  const handleSidebarResizeEnd = useCallback(
    (nextWidth) => {
      setSidebarWidth(nextWidth);
      if (window.agency?.setUiState) {
        window.agency
          .setUiState({
            sidebarWidth: nextWidth,
            sidebarCollapsed,
          })
          .catch(() => undefined);
      }
    },
    [sidebarCollapsed]
  );
  const handleHierarchyJump = useCallback(
    (target) => {
      setHierarchySection(target);
      setActiveView('hierarchy');
      if (target === 'actions') {
        clearQuickActionsError();
      }
      if (target === 'gates') {
        clearGatesError();
      }
      if (target === 'softlinks') {
        clearWorktreeLinksError();
      }
    },
    [clearGatesError, clearQuickActionsError, clearWorktreeLinksError]
  );
  const handleSelectActionsScope = useCallback(
    (scope) => {
      setHierarchySection('actions');
      setActionsScope(scope);
      clearQuickActionsError();
    },
    [clearQuickActionsError]
  );
  const handleSelectGateScope = useCallback(
    (scope) => {
      setHierarchySection('gates');
      setGateScope(scope);
      clearGatesError();
    },
    [clearGatesError]
  );
  const handleSelectHierarchySection = useCallback(
    (section) => {
      setHierarchySection(section);
      if (section === 'softlinks') {
        clearWorktreeLinksError();
      }
    },
    [clearWorktreeLinksError]
  );
  return (
    <div className="flex h-screen flex-col bg-background text-foreground overflow-hidden">
      <AppLayout
        activeView={activeView}
        onSwitchView={handleSwitchView}
        hierarchySection={hierarchySection}
        onSelectHierarchySection={handleSelectHierarchySection}
        cells={cells}
        selectedId={selectedId}
        selectedCell={selectedCell}
        onSelectCell={setSelectedId}
        onCreateCell={() => setShowCreate(true)}
        onJumpToHierarchy={handleHierarchyJump}
        actionsScope={actionsScope}
        onSelectActionsScope={handleSelectActionsScope}
        actionsScopeDisabled={actionsScopeDisabled}
        actionSummary={actionSummary}
        actionsRows={actionsRows}
        projectActionsPath={projectActionsPath}
        agentActionsPath={agentActionsPath}
        quickActionsError={quickActionsError}
        quickActionsSaving={quickActionsSaving}
        onAddAction={addQuickAction}
        onRemoveAction={removeQuickAction}
        onOverrideAction={overrideQuickAction}
        onResetAction={resetQuickAction}
        onUpdateAction={updateQuickAction}
        onSaveActions={saveQuickActions}
        gateScope={gateScope}
        onSelectGateScope={handleSelectGateScope}
        gateStage={gateStage}
        onSelectGateStage={setGateStage}
        gateScopeDisabled={gateScopeDisabled}
        gateSummary={gateSummary}
        gateRows={gateRows}
        projectGatesPath={projectGatesPath}
        agentGatesPath={agentGatesPath}
        gatesError={gatesError}
        gatesSaving={gatesSaving}
        onAddGate={addGate}
        onRemoveGate={removeGate}
        onOverrideGate={overrideGate}
        onResetGate={resetGate}
        onUpdateGate={updateGate}
        onSaveGates={handleSaveGates}
        worktreeLinks={worktreeLinks}
        worktreeLinksAuto={worktreeLinksAuto}
        worktreeLinksCandidates={worktreeLinksCandidates}
        worktreeLinksStatusesByPath={worktreeLinksStatusesByPath}
        worktreeLinksConfigPath={worktreeLinksConfigPath}
        worktreeLinksLoading={worktreeLinksLoading}
        worktreeLinksError={worktreeLinksError}
        worktreeLinksDirty={worktreeLinksDirty}
        onToggleWorktreeLinksAuto={toggleWorktreeLinksAuto}
        onAddWorktreeLink={addWorktreeLink}
        onAddWorktreeLinkFromCandidate={addWorktreeLinkFromCandidate}
        onUpdateWorktreeLink={updateWorktreeLink}
        onRemoveWorktreeLink={removeWorktreeLink}
        onApplyWorktreeLink={applyWorktreeLink}
        onApplyAllWorktreeLinks={applyAllWorktreeLinks}
        onSaveWorktreeLinks={saveWorktreeLinks}
        onRefreshWorktreeLinks={refreshWorktreeLinks}
        repoRoot={repoRoot}
        canUseProjectScope={canUseScopedConfig}
        canUseAgentScope={canUseScopedConfig}
        editorPaneProps={editorPaneProps}
        sidebarWidth={sidebarWidth}
        sidebarCollapsed={sidebarCollapsed}
        onResizeSidebar={setSidebarWidth}
        onResizeSidebarEnd={handleSidebarResizeEnd}
        onToggleSidebar={() => setSidebarCollapsed((value) => !value)}
        explorerSidebarProps={{
          rootPath: explorerRootPath,
          rootLabel: explorerRootLabel,
          cells,
          selectedId,
          onSelectCell: setSelectedId,
          selectedCell,
          sessions,
          activeSessionId,
          sessionActivityByKey,
          onOpenFile: ({ path, mode }) => {
            workbench.openFile({ path, mode, rootPath: explorerRootPath });
          },
        }}
        explorerPaneProps={{
          workbench,
          activeRootPath: explorerRootPath,
          activeRootLabel: explorerRootLabel,
        }}
      />

      <StatusBar loading={loading} onRefresh={loadCells} tmuxStatus={tmuxStatus} />

      {showCreate ? (
        <CreateCellModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />
      ) : null}
      {pendingTransition ? (
        <LifecycleConfirmModal
          transition={pendingTransition}
          error={transitionError}
          loading={transitionLoading}
          onCancel={() => {
            setPendingTransition(null);
            setTransitionError('');
          }}
          onConfirm={async () => {
            if (!pendingTransition?.cell) {
              return;
            }
            setTransitionLoading(true);
            try {
              await window.agency.updateCellState({
                id: pendingTransition.cell.id,
                state: pendingTransition.nextState,
                worktreePath: pendingTransition.cell.worktreePath,
              });
              await loadCells();
              setPendingTransition(null);
            } catch (error) {
              setTransitionError(error?.message || 'Lifecycle transition failed.');
            } finally {
              setTransitionLoading(false);
            }
          }}
          onRefresh={async () => {
            if (!pendingTransition?.cell) {
              return;
            }
            try {
              const gates = ['active', 'archived'].includes(pendingTransition.nextState)
                ? await checkGatesForCell({
                    cell: pendingTransition.cell,
                    stage: pendingTransition.nextState,
                  })
                : [];
              setPendingTransition({
                ...pendingTransition,
                gates,
              });
              setTransitionError('');
            } catch (error) {
              setTransitionError(error?.message || 'Failed to run gates.');
            }
          }}
        />
      ) : null}
    </div>
  );
}

export default App;
