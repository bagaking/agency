import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '@xterm/xterm/css/xterm.css';
import { AppLayout } from './components/AppLayout';
import { ModalProvider, useModal } from './components/modals/ModalSystem';
import { useSessions } from './hooks/useSessions';
import { useActionSheets } from './hooks/useActionSheets';
import { useWorkbench } from './hooks/useWorkbench';
import { useHilMemoState } from './hooks/useHilMemoState';
import { useHilMemoCaptureState } from './hooks/useHilMemoCaptureState';
import {
  setUiState as agencySetUiState,
} from './services/agencyBridge';
import { useAppProjectLifecycle } from './app/useAppProjectLifecycle';
import { useWorkbenchFileNavigation } from './app/useWorkbenchFileNavigation';
import { useCellLifecycleActions } from './app/useCellLifecycleActions';
import { useHilPromoteWorkflow } from './app/useHilPromoteWorkflow';
import { useActionSheetOrchestration } from './app/useActionSheetOrchestration';
import { useHilFileCommenting } from './app/useHilFileCommenting';
import { useSessionMapOverlayController } from './app/useSessionMapOverlayController';
import { useHierarchyNavigation } from './app/useHierarchyNavigation';
import { useRendererBootstrap } from './app/useRendererBootstrap';
import { buildComposedAppLayoutProps } from './app/buildComposedAppLayoutProps';
import { useCellLifecycleTransitionModal } from './app/useCellLifecycleTransitionModal';
import { useCreateCellModalLauncher } from './app/useCreateCellModalLauncher';
import { useGlobalAppShortcutListener } from './app/useGlobalAppShortcutListener';
import { useHilDrawerController } from './app/useHilDrawerController';
import { useSessionSidebarSelection } from './app/useSessionSidebarSelection';
import { useHierarchyConfigState } from './app/useHierarchyConfigState';
import { useSessionReplyContext } from './app/useSessionReplyContext';
import { useMemoNavigationHandlers } from './app/useMemoNavigationHandlers';
import { useExplorerCommentRouting } from './app/useExplorerCommentRouting';
import { useWorkbenchReplySelectionState } from './app/useWorkbenchReplySelectionState';
import { useAppShellLayoutState } from './app/useAppShellLayoutState';
import { useWindowShellState } from './app/useWindowShellState';
import {
  buildMobileContinuationFeedback,
  resolveMobileContinuationErrorTitle,
} from './app/mobileContinuationFeedback';
import { AppShellChrome } from './app/AppShellChrome';
import { WindowTitleBar } from './components/WindowTitleBar';
import { SessionMapToggle } from './components/sessionMap/SessionMapToggle';
import { writeTextToClipboard } from './utils/clipboard';
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

const HIL_DRAWER_DEFAULTS = {
  'agent-cells': 'reply',
  'action-sheets': 'comments',
  explorer: 'comments',
};

const resolveHilDrawerDefault = (view) => HIL_DRAWER_DEFAULTS[view] || 'comments';

function AppShell() {
  const modal = useModal();
  const [cells, setCells] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [projectRoot, setProjectRoot] = useState('');
  const [projectError, setProjectError] = useState('');
  const [recentProjects, setRecentProjects] = useState([]);
  const [fallbackTerminalRoot, setFallbackTerminalRoot] = useState('');
  const [pendingTransition, setPendingTransition] = useState(null);
  const [transitionError, setTransitionError] = useState('');
  const [transitionLoading, setTransitionLoading] = useState(false);
  const [uiStateLoaded, setUiStateLoaded] = useState(false);
  const [memoFocusTarget, setMemoFocusTarget] = useState('');
  const [tmuxStatus, setTmuxStatus] = useState({ available: true, error: '', version: '' });
  const [ipcAvailable, setIpcAvailable] = useState(true);
  const [initialActiveSessions, setInitialActiveSessions] = useState({});
  const [initialWorkbenchTabs, setInitialWorkbenchTabs] = useState({});
  const [initialWorkbenchActiveTabs, setInitialWorkbenchActiveTabs] = useState({});
  const [userDataPath, setUserDataPath] = useState('');
  const [explorerDeliverySummary, setExplorerDeliverySummary] = useState<any>(null);
  const [actionSheetSessionId, setActionSheetSessionId] = useState('');
  const [actionSheetInlineError, setActionSheetInlineError] = useState('');
  const {
    activeView,
    setActiveView,
    setActiveViewCompat,
    sidebarWidth,
    setSidebarWidth,
    sidebarCollapsed,
    setSidebarCollapsed,
    hilDrawerOpen,
    setHilDrawerOpen,
    hilDrawerPanel,
    setHilDrawerPanel,
    setHilDrawerPanelCompat,
    hilDrawerPanelByView,
    setHilDrawerPanelByView,
    setHilDrawerPanelByViewCompat,
    hierarchySection,
    setHierarchySection,
    setHierarchySectionCompat,
    actionsScope,
    setActionsScope,
    setActionsScopeCompat,
    appShortcutsScope,
    setAppShortcutsScope,
    setAppShortcutsScopeCompat,
    replyQuickPromptsScope,
    setReplyQuickPromptsScope,
    setReplyQuickPromptsScopeCompat,
    sessionNamingScope,
    setSessionNamingScope,
    setSessionNamingScopeCompat,
    gateScope,
    setGateScope,
    setGateScopeCompat,
    gateStage,
    setGateStage,
    terminalOpen,
    setTerminalOpen,
    terminalMode,
    setTerminalMode,
  } = useAppShellLayoutState();
  const projectReady = Boolean(projectRoot);
  const virtualCell = useMemo(() => {
    if (projectReady) {
      return null;
    }
    return {
      id: 'local-terminal',
      name: 'Local Terminal',
      branch: 'local',
      worktreePath: fallbackTerminalRoot || '/',
      state: 'draft',
      isVirtual: true,
      validation: { warnings: ['Project root not selected.'] },
    };
  }, [fallbackTerminalRoot, projectReady]);
  const displayCells = useMemo(() => {
    if (projectReady) {
      return cells;
    }
    return virtualCell ? [virtualCell] : [];
  }, [cells, projectReady, virtualCell]);
  const selectedCell = useMemo(
    () => displayCells.find((cell) => cell.id === selectedId) || null,
    [displayCells, selectedId]
  );
  const selectionTraceRef = useRef<{ selectedId: string; cellId: string }>({
    selectedId: '',
    cellId: '',
  });
  useEffect(() => {
    const next = {
      selectedId: selectedId || '',
      cellId: selectedCell?.id || '',
    };
    const prev = selectionTraceRef.current;
    if (prev.selectedId === next.selectedId && prev.cellId === next.cellId) {
      return;
    }
    if (import.meta.env.DEV) {
      console.warn('[SessionTrace] selected cell changed', {
        prevSelectedId: prev.selectedId,
        nextSelectedId: next.selectedId,
        prevCellId: prev.cellId,
        nextCellId: next.cellId,
      });
    }
    selectionTraceRef.current = next;
  }, [selectedCell?.id, selectedId]);
  const scopedCell = useMemo(() => {
    if (!projectReady || !selectedCell || selectedCell.isVirtual) {
      return null;
    }
    return selectedCell;
  }, [projectReady, selectedCell]);
  const { loadCells } = useRendererBootstrap({
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
    setActiveView: setActiveViewCompat,
    setHilDrawerOpen,
    setHilDrawerPanel: setHilDrawerPanelCompat,
    setHilDrawerPanelByView: setHilDrawerPanelByViewCompat,
    setTerminalOpen,
    setUiStateLoaded,
    uiStateLoaded,
    setTmuxStatus,
    setIpcAvailable,
  });
  const hierarchyConfig = useHierarchyConfigState({
    scopedCell,
    cells,
    projectRoot,
    actionsScope,
    appShortcutsScope,
    replyQuickPromptsScope,
    sessionNamingScope,
    gateScope,
    gateStage,
    userDataPath,
  });
  const handleOpenTerminal = useCallback(() => {
    setTerminalMode('shell');
    setTerminalOpen(true);
  }, []);
  const sessionsState = useSessions({
    selectedCell,
    cells,
    tmuxStatus,
    onOpenTerminal: handleOpenTerminal,
    initialActiveSessions,
  });
  const handleFocusSessionInUi = useCallback(
    (cellId: string, sessionId: string) => {
      const normalizedCellId = String(cellId || '').trim();
      const normalizedSessionId = String(sessionId || '').trim();
      if (!normalizedCellId || !normalizedSessionId) {
        return;
      }
      setSelectedId(normalizedCellId);
      sessionsState.selectSession(normalizedSessionId, normalizedCellId);
      handleOpenTerminal();
    },
    [handleOpenTerminal, sessionsState.selectSession]
  );
  const sessionTargets = useMemo(() => {
    const list = [];
    (displayCells || []).forEach((cell) => {
      const cellSessions = sessionsState.sessionsByCellId[cell.id] || [];
      cellSessions.forEach((session) => {
        if (!session || session.status === 'closed' || session.status === 'stale') {
          return;
        }
        list.push({
          cellId: cell.id,
          cellName: cell.name || cell.id,
          sessionId: session.id,
          sessionName: session.name || session.id,
          status: session.status,
          avatar: session.avatar,
        });
      });
    });
    return list;
  }, [displayCells, sessionsState.sessionsByCellId]);
  const {
    activityDiffThreshold,
    focusSession,
    sessionMapEnabled,
    sessionMapModel,
    sessionMapOpen,
    openSessionMap,
    handleToggleSessionMap,
    resolveSessionMapFontSize,
    handleSelectSessionFromMap,
  } = useSessionMapOverlayController({
    projectRoot,
    projectReady,
    cells,
    sessions: sessionsState.sessions,
    sessionsByCellId: sessionsState.sessionsByCellId,
    activeSessionId: sessionsState.activeSessionId,
    activeSessionByCellId: sessionsState.activeSessionByCellId,
    sessionActivityByKey: sessionsState.sessionActivityByKey,
    sessionVisitedByKey: sessionsState.sessionVisitedByKey,
    resolvedProfiles: hierarchyConfig.resolvedProfiles,
    activeFontSize: sessionsState.activeFontSize,
    sessionFontSizeByKey: sessionsState.sessionFontSizeByKey,
    refreshSessionsForCells: sessionsState.refreshSessionsForCells,
    selectSession: sessionsState.selectSession,
    setSelectedId,
    setTerminalOpen,
    setActiveView: setActiveViewCompat,
  });
  const activeHarnessRun = useMemo(
    () =>
      (sessionsState.harnessRuns || []).find((run: any) =>
        ['queued', 'running', 'cancelling'].includes(String(run?.status || '').trim().toLowerCase())
      ) || null,
    [sessionsState.harnessRuns]
  );
  const lastAutoOpenedRunRef = useRef('');
  const lastAutoOpenedErrorRef = useRef('');
  const lastNotifiedSessionErrorRef = useRef('');
  useEffect(() => {
    const activeRunId = String(activeHarnessRun?.runId || '').trim();
    if (!activeRunId) {
      return;
    }
    if (lastAutoOpenedRunRef.current === activeRunId) {
      return;
    }
    if (!sessionMapOpen) {
      openSessionMap();
    }
    lastAutoOpenedRunRef.current = activeRunId;
  }, [activeHarnessRun, openSessionMap, sessionMapOpen]);
  useEffect(() => {
    const message = String(sessionsState.sessionError || '').trim();
    if (!message) {
      lastAutoOpenedErrorRef.current = '';
      lastNotifiedSessionErrorRef.current = '';
      return;
    }
    if (!sessionMapEnabled) {
      return;
    }
    if (lastAutoOpenedErrorRef.current === message) {
      return;
    }
    if (!sessionMapOpen) {
      openSessionMap();
    }
    lastAutoOpenedErrorRef.current = message;
  }, [openSessionMap, sessionMapEnabled, sessionMapOpen, sessionsState.sessionError]);
  useEffect(() => {
    const message = String(sessionsState.sessionError || '').trim();
    if (!message) {
      lastNotifiedSessionErrorRef.current = '';
      return;
    }
    if (lastNotifiedSessionErrorRef.current === message) {
      return;
    }
    void modal.openModal({
      id: `session-error-${Date.now().toString(36)}`,
      variant: 'alert',
      tone: 'danger',
      title: 'Session Action Failed',
      description: message,
      dismissLabel: 'Close',
      dismissOnOverlay: false,
    });
    lastNotifiedSessionErrorRef.current = message;
  }, [modal, sessionsState.sessionError]);

  const sessionMapCenterSlot = (
    <SessionMapToggle
      open={sessionMapOpen}
      stats={sessionMapEnabled ? sessionMapModel.stats : null}
      onToggle={handleToggleSessionMap}
      disabled={!sessionMapEnabled}
      focusCell={selectedCell}
      focusSession={focusSession}
    />
  );
  const actionSheetsRoot = projectRoot || selectedCell?.worktreePath || '';
  const hilWorktreePath = selectedCell?.worktreePath || projectRoot || '';
  const actionSheetsState = useActionSheets({
    worktreePath: actionSheetsRoot,
    selectedCellId: selectedCell?.id || '',
    dispatchSessionCommand: sessionsState.dispatchSessionCommand,
    onOpenTerminal: handleOpenTerminal,
    onSelectSession: sessionsState.selectSession,
    onSwitchView: setActiveViewCompat,
  });
  const workbench = useWorkbench({
    selectedCell: scopedCell,
    repoRoot: projectRoot,
    cells,
    initialTabsByCellId: initialWorkbenchTabs,
    initialActiveTabByCellId: initialWorkbenchActiveTabs,
  });
  const hilMemo = useHilMemoState({
    worktreePath: selectedCell?.worktreePath || projectRoot || '',
  });
  useEffect(() => {
    if (actionSheetSessionId || !sessionsState.activeSessionId) {
      return;
    }
    setActionSheetSessionId(sessionsState.activeSessionId);
  }, [actionSheetSessionId, sessionsState.activeSessionId]);
  useEffect(() => {
    const linked = actionSheetsState.selectedSheet?.status?.sessionId;
    if (actionSheetSessionId || !linked) {
      return;
    }
    setActionSheetSessionId(linked);
  }, [actionSheetSessionId, actionSheetsState.selectedSheet?.status?.sessionId]);
  useEffect(() => {
    setExplorerDeliverySummary(null);
  }, [projectRoot, selectedCell?.id]);
  const { handleSelectSessionFromSidebar } = useSessionSidebarSelection({
    activeView,
    projectReady,
    displayCells,
    refreshSessionsForCells: sessionsState.refreshSessionsForCells,
    selectSession: sessionsState.selectSession,
    setSelectedId,
    setTerminalOpen,
  });
  const activeTab = workbench.activeTab;
  const {
    cursorPosition,
    setCursorPosition,
    setWorkbenchSelectionByCellId,
    replySelectionByKey,
    setReplySelectionByKey,
    replyFocusToken,
    pendingWorkbenchJump,
    setPendingWorkbenchJump,
    pendingExplorerReveal,
    setPendingExplorerReveal,
    setWorkbenchMetaByCellId,
    explorerMeta,
    memoSelection,
    handleWorkbenchMetaChange,
    handleWorkbenchSelectionChange,
    handleSelectionContext,
    handleReplySelection,
  } = useWorkbenchReplySelectionState({
    selectedCellId: selectedCell?.id || '',
    activeView,
    setHilDrawerOpen,
    setHilDrawerPanel: setHilDrawerPanelCompat,
    setHilDrawerPanelByView: setHilDrawerPanelByViewCompat,
  });
  const { openHilDrawer, handleSelectHilDrawerPanel } = useHilDrawerController({
    activeView,
    hilDrawerOpen,
    hilDrawerPanel,
    setHilDrawerOpen,
    setHilDrawerPanel: setHilDrawerPanelCompat,
    setHilDrawerPanelByView,
  });
  const availableActionSessions = useMemo(
    () => sessionsState.sessions.filter((session) => session.status !== 'closed'),
    [sessionsState.sessions]
  );
  const {
    handleCreateActionSheet,
    handleCreateDraftActionSheet,
    handleSaveActionSheet,
    handleDispatchActionSheet,
    handleRunDraftInActiveSession,
    handleDispatchExplorerFeed,
    handleViewActionSheetSession,
    handleArchiveActionSheet,
    handleDeleteActionSheet,
    handleOpenActionSheets,
    createTurnGateCreateSheetForCell,
    handleTurnGateCreateSheet,
    handleTurnGateExecuteSheet,
  } = useActionSheetOrchestration({
    modal,
    selectedCell,
    actionSheetsRoot,
    hilWorktreePath,
    conditionalDefaults: actionSheetsState.conditionalDefaults,
    activeSessionId: sessionsState.activeSessionId,
    summarizeHilDraft: hilMemo.summarizeBody,
    refreshHilMemo: hilMemo.refresh,
    createActionSheet: actionSheetsState.createSheet,
    updateActionSheetStatus: actionSheetsState.updateSheetStatus,
    updateActionSheetPlan: actionSheetsState.updateSheetPlan,
    updateActionSheetPrompt: actionSheetsState.updateSheetPrompt,
    updateActionSheetChecks: actionSheetsState.updateSheetChecks,
    dispatchActionSheet: actionSheetsState.dispatchSheet,
    archiveActionSheet: actionSheetsState.archiveSheet,
    deleteActionSheet: actionSheetsState.deleteSheet,
    dispatchSessionCommand: sessionsState.dispatchSessionCommand,
    setActionSheetInlineError,
    setActionSheetSessionId,
    setActionSheetId: actionSheetsState.setSelectedId,
    setExplorerDeliverySummary,
    setActiveView: setActiveViewCompat,
    handleOpenTerminal,
    selectSession: sessionsState.selectSession,
    projectGatesPath: hierarchyConfig.projectGatesPath,
    agentGatesPath: hierarchyConfig.agentGatesPath,
  });

  const hilCommentState = useHilFileCommenting({
    activeTab,
    cursorPosition,
    hilWorktreePath: selectedCell?.worktreePath || projectRoot || '',
    openHilDrawer,
  });
  const promoteWorktreePath = selectedCell?.worktreePath || projectRoot || '';
  const promoteWorkflow = useHilPromoteWorkflow({
    promoteWorktreePath,
    sessions: sessionsState.sessions,
    activeSessionId: sessionsState.activeSessionId,
    activeView,
    selectedCellId: selectedCell?.id || '',
    conditionalDefaults: actionSheetsState.conditionalDefaults,
    dispatchActionSheet: actionSheetsState.dispatchSheet,
    createSession: sessionsState.createSession,
    loadComments: hilCommentState.refreshComments,
    openHilDrawer,
  });

  useEffect(() => {
    if (hilCommentState.commentModalOpen || promoteWorkflow.promoteModalOpen) {
      setHilDrawerPanel('comments');
      setHilDrawerOpen(true);
      return;
    }
    const preferredPanel = hilDrawerPanelByView[activeView];
    setHilDrawerPanel(preferredPanel || resolveHilDrawerDefault(activeView));
  }, [activeView, hilCommentState.commentModalOpen, hilDrawerPanelByView, promoteWorkflow.promoteModalOpen]);

  const { handleSelectProjectRoot, handleOpenRecentProject } = useAppProjectLifecycle({
    resetSessions: sessionsState.resetSessions,
    workbench,
    setSelectedId,
    setCells,
    setInitialActiveSessions,
    setWorkbenchSelectionByCellId,
    setWorkbenchMetaByCellId,
    setInitialWorkbenchTabs,
    setInitialWorkbenchActiveTabs,
    setProjectError,
    setProjectRoot,
    setRecentProjects,
    selectedCellId: selectedCell?.id || '',
    activeSessionByCellId: sessionsState.activeSessionByCellId,
    uiStateLoaded,
    setTerminalMode,
    setTerminalOpen,
    sidebarWidth,
    sidebarCollapsed,
    activeView,
    hilDrawerOpen,
    hilDrawerPanel,
    hilDrawerPanelByView,
  });
  const windowShellState = useWindowShellState();
  const gateDisplayStage = scopedCell?.state === 'archived' ? 'archived' : 'active';
  const gateResultsByStage = scopedCell ? hierarchyConfig.gateResultsByCellId[scopedCell.id] || {} : {};
  const gatesCheckingByStage = scopedCell ? hierarchyConfig.gatesCheckingByCellId[scopedCell.id] || {} : {};
  const {
    handleStateChange,
    handleUpdateCellAvatar,
    handleCreate,
    handleSaveGates,
  } = useCellLifecycleActions({
    scopedCell,
    cells,
    projectRoot,
    projectReady,
    selectedCell,
    loadCells,
    checkGatesForCell: hierarchyConfig.checkGatesForCell,
    createTurnGateCreateSheetForCell,
    handleOpenActionSheets,
    handleOpenTerminal,
    setTransitionError,
    setCells,
    setPendingTransition,
    setProjectError,
    setLoading,
    setSelectedId,
    saveGates: hierarchyConfig.saveGates,
    modal,
  });
  const {
    openWorkbenchFile: handleOpenWorkbenchFile,
    revealPathInExplorerFromWorkbench: handleRevealPathInExplorerFromWorkbench,
    openMemoReference: handleOpenMemoReference,
    revealMemoReference: handleRevealMemoReference,
    openSessionMapShortcut: handleOpenSessionMapShortcut,
    revealSessionMapShortcut: handleRevealSessionMapShortcut,
    openAgentCellFileReference: handleOpenAgentCellFileReference,
    revealAgentCellFileReference: handleRevealAgentCellFileReference,
    importAgentCellFileReferences: handleImportAgentCellFileReferences,
  } = useWorkbenchFileNavigation({
    modal,
    projectRoot,
    selectedCell,
    sidebarCollapsed,
    workbench,
    setActiveView: setActiveViewCompat,
    setSidebarCollapsed,
    setSelectedId,
    setPendingExplorerReveal,
    setPendingWorkbenchJump,
  });
  const sessionReplyContext = useSessionReplyContext({
    resolvedProfiles: hierarchyConfig.resolvedProfiles,
    sessions: sessionsState.sessions,
    activeSessionId: sessionsState.activeSessionId,
    selectedCell,
    replySelectionByKey,
    resolvedBindingsByProfile: hierarchyConfig.resolvedBindingsByProfile,
    projectRoot,
    setActiveView: setActiveViewCompat,
    sidebarCollapsed,
    setSidebarCollapsed,
    setReplySelectionByKey,
    setDockSelection: hilMemo.setDockSelection,
    handleSelectSessionFromMap,
  });

  const {
    handleSwitchView,
    handleHierarchyJump,
    handleSelectActionsScope,
    handleOpenHarnessProviders,
    handleConfigureProfile,
    handleSelectAppShortcutsScope,
    handleSelectReplyQuickPromptsScope,
    handleSelectGateScope,
    handleSelectSessionNamingScope,
    handleSelectHierarchySection,
    handleToggleSidebar,
  } = useHierarchyNavigation({
    sidebarCollapsed,
    setActiveView: setActiveViewCompat,
    setSidebarCollapsed,
    setHierarchySection: setHierarchySectionCompat,
    setActionsScope: setActionsScopeCompat,
    setAppShortcutsScope: setAppShortcutsScopeCompat,
    setReplyQuickPromptsScope: setReplyQuickPromptsScopeCompat,
    setGateScope: setGateScopeCompat,
    setSessionNamingScope: setSessionNamingScopeCompat,
    clearTerminusError: hierarchyConfig.clearTerminusError,
    clearHarnessProvidersError: hierarchyConfig.clearHarnessProvidersError,
    clearAppShortcutsError: hierarchyConfig.clearAppShortcutsError,
    clearReplyQuickPromptsError: hierarchyConfig.clearReplyQuickPromptsError,
    clearGatesError: hierarchyConfig.clearGatesError,
    clearSessionNamingError: hierarchyConfig.clearSessionNamingError,
    clearWorktreeLinksError: hierarchyConfig.clearWorktreeLinksError,
  });
  const explorerRootPath = projectReady
    ? selectedCell?.worktreePath || projectRoot || ''
    : '';
  const explorerRootLabel = projectReady
    ? selectedCell?.name || 'Repository'
    : 'Project';
  const handleMemoCaptureSaved = useCallback(
    (noteType) => {
      if (!noteType) {
        return;
      }
      handleSwitchView('memo');
      hilMemo.setDockSelection({
        type: 'inbox',
        inboxType: noteType,
        draftId: null,
      });
    },
    [handleSwitchView, hilMemo.setDockSelection]
  );
  const memoCapture = useHilMemoCaptureState({
    worktreePath: selectedCell?.worktreePath || projectRoot || '',
    projectRoot,
    cells: projectReady ? cells : [],
    selectedCellId: selectedCell?.id || '',
    selection: memoSelection,
    onCaptureSaved: handleMemoCaptureSaved,
    refresh: hilMemo.refresh,
  });
  const { handleAddCommentFromExplorer, handleJumpToComments } = useExplorerCommentRouting({
    explorerRootPath,
    selectedCellId: selectedCell?.id || '',
    handleOpenWorkbenchFile,
    openCommentModal: hilCommentState.openCommentModal,
    setActiveView: setActiveViewCompat,
    openHilDrawer,
  });
  const handleFocusPromoteSession = useCallback(() => {
    if (!promoteWorkflow.promoteSessionId) {
      return;
    }
    setActiveView('agent-cells');
    handleOpenTerminal();
    sessionsState.selectSession(promoteWorkflow.promoteSessionId);
  }, [handleOpenTerminal, promoteWorkflow.promoteSessionId, sessionsState.selectSession]);
  const {
    handleFocusInboxInput,
    handleFocusInboxInputHandled,
    handleOpenMemoInbox,
    handleOpenMemoDraft,
    handleOpenDeliveryTimeline,
    handleOpenExplorerDeliveryTimeline,
  } = useMemoNavigationHandlers({
    handleSwitchView,
    setDockSelection: hilMemo.setDockSelection,
    setMemoFocusTarget,
    handleOpenActionSheets,
    explorerDeliverySummary,
  });
  const { handleCaptureScreenshot, flashVoice } = memoCapture;
  useGlobalAppShortcutListener({
    handleSwitchView,
    setHilDrawerOpen,
    handleOpenMemoInbox,
    handleCaptureScreenshot,
    flashVoice,
  });
  const handleOpenExplorerForCell = useCallback(
    (cellId) => {
      if (cellId) {
        setSelectedId(cellId);
      }
      handleSwitchView('explorer');
    },
    [handleSwitchView]
  );
  const handleOpenCreateCellModal = useCreateCellModalLauncher({
    projectReady,
    handleSelectProjectRoot,
    modal,
    handleCreate,
  });

  const handleContinueSessionOnMobile = useCallback(
    async (sessionId, cellId, mode = 'direct') => {
      if (!sessionId) {
        return;
      }
      try {
        const result = await sessionsState.prepareSessionContinueOnMobile(sessionId, cellId, mode);
        if (!result) {
          throw new Error('Mobile continuation is unavailable in this runtime.');
        }

        if (result.command) {
          await writeTextToClipboard(result.command);
        }

        const feedback = buildMobileContinuationFeedback({
          requestedMode: mode,
          sessionId,
          result,
        });

        if (feedback.kind === 'success') {
          modal.notify({
            tone: 'success',
            title: feedback.title,
            description: feedback.description,
          });
          return;
        }

        modal.openModal({
          tone: 'warning',
          variant: 'alert',
          title: feedback.title,
          description: feedback.description,
          dismissLabel: 'OK',
        });
      } catch (error) {
        modal.notify({
          tone: 'danger',
          title: resolveMobileContinuationErrorTitle(mode),
          description: error?.message || 'Failed to prepare mobile continuation command.',
        });
      }
    },
    [modal, sessionsState.prepareSessionContinueOnMobile]
  );

  const handleSidebarResizeEnd = useCallback(
    (nextWidth) => {
      setSidebarWidth(nextWidth);
      agencySetUiState({
        sidebarWidth: nextWidth,
        sidebarCollapsed,
      }).catch(() => undefined);
    },
    [sidebarCollapsed]
  );
  const {
    handleCancelTransition,
    handleConfirmTransition,
    handleRefreshTransitionGates,
  } = useCellLifecycleTransitionModal({
    pendingTransition,
    setPendingTransition,
    setTransitionError,
    setTransitionLoading,
    loadCells,
    checkGatesForCell: hierarchyConfig.checkGatesForCell,
  });
  const appLayoutProps = buildComposedAppLayoutProps({
    layoutState: {
      activeView,
      hierarchySection,
      displayCells,
      selectedId,
      selectedCell,
      sidebarWidth,
      sidebarCollapsed,
      hilDrawerOpen,
      hilDrawerPanel,
      terminalMode,
      terminalOpen,
    },
    projectState: {
      projectReady,
      projectError,
      projectRoot,
      recentProjects,
      tmuxStatus,
    },
    scopeState: {
      actionsScope,
      appShortcutsScope,
      replyQuickPromptsScope,
      sessionNamingScope,
      gateScope,
      gateStage,
    },
    gateState: {
      gateDisplayStage,
      gateResultsByStage,
      gatesCheckingByStage,
      activityDiffThreshold,
    },
    sessionsState,
    sessionReplyContext,
    hierarchyConfig,
    promoteWorkflow,
    hilCommentState,
    actionSheetsState,
    workbenchState: {
      activeTab,
      cursorPosition,
      workbench,
      setCursorPosition,
    },
    selectionState: {
      replyFocusToken,
      sessionTargets,
      availableActionSessions,
      actionSheetSessionId,
      actionSheetInlineError,
      pendingExplorerReveal,
      pendingWorkbenchJump,
      explorerMeta,
      cells,
      setSelectedId,
    },
    memoState: {
      hilMemo,
      memoCapture,
      memoFocusTarget,
    },
    explorerState: {
      explorerRootPath,
      explorerRootLabel,
      explorerDeliverySummary,
      sessionMapOpen,
    },
    navigationHandlers: {
      handleSwitchView,
      handleSelectHierarchySection,
      handleHierarchyJump,
      handleSelectSessionFromSidebar,
      handleSelectProjectRoot,
      handleOpenRecentProject,
      handleSelectActionsScope,
      handleOpenHarnessProviders,
      handleConfigureProfile,
      handleSelectAppShortcutsScope,
      handleSelectReplyQuickPromptsScope,
      handleSelectSessionNamingScope,
      handleSelectGateScope,
      setGateStage,
      handleSaveGates,
      setSidebarWidth,
      handleSidebarResizeEnd,
      handleToggleSidebar,
      setHilDrawerOpen,
      handleSelectHilDrawerPanel,
    },
    actionHandlers: {
      handleStateChange,
      handleTurnGateCreateSheet,
      handleTurnGateExecuteSheet,
      handleOpenTerminal,
      handleUpdateCellAvatar,
      handleOpenWorkbenchFile,
      handleSelectionContext,
      handleReplySelection,
      handleOpenMemoReference,
      handleRevealMemoReference,
      handleFocusPromoteSession,
      handleOpenDeliveryTimeline,
      handleDispatchActionSheet,
      handleArchiveActionSheet,
      handleDeleteActionSheet,
      handleOpenActionSheets,
      handleOpenMemoDraft,
      handleViewActionSheetSession,
      handleRunDraftInActiveSession,
      handleOpenMemoInbox,
      handleFocusInboxInput,
      handleCreateDraftActionSheet,
      handleFocusInboxInputHandled,
      handleCreateActionSheet,
      handleSaveActionSheet,
      setActionSheetSessionId,
      handleOpenExplorerDeliveryTimeline,
      handleDispatchExplorerFeed,
      handleToggleSessionMap,
      setPendingExplorerReveal,
      handleAddCommentFromExplorer,
      handleJumpToComments,
      handleWorkbenchMetaChange,
      handleWorkbenchSelectionChange,
      setPendingWorkbenchJump,
      handleRevealPathInExplorerFromWorkbench,
      handleOpenCreateCellModal,
      handleOpenExplorerForCell,
      handleOpenAgentCellFileReference,
      handleRevealAgentCellFileReference,
      handleImportAgentCellFileReferences,
      handleContinueSessionOnMobile,
      handleFocusSessionInUi,
    },
  });

  return (
    <div className="relative flex h-screen flex-col bg-background text-foreground overflow-hidden">
      <WindowTitleBar
        projectRoot={projectRoot}
        projectError={projectError}
        windows={windowShellState.windows}
        onCreateWindow={windowShellState.handleCreateWindow}
        onFocusWindow={windowShellState.handleFocusWindow}
        onSelectProject={handleSelectProjectRoot}
      />
      <AppLayout {...appLayoutProps} />
      <AppShellChrome
        sessionMapOpen={sessionMapOpen}
        sessionMapModel={sessionMapModel}
        handleSelectSessionFromMap={handleSelectSessionFromMap}
        handleToggleSessionMap={handleToggleSessionMap}
        resolveSessionMapFontSize={resolveSessionMapFontSize}
        terminusProfiles={sessionReplyContext.terminusProfiles}
        createSessionForCell={sessionsState.createSessionForCell}
        dispatchSessionCommand={sessionsState.dispatchSessionCommand}
        renameSession={sessionsState.renameSession}
        updateSessionAvatar={sessionsState.updateSessionAvatar}
        harnessRuns={sessionsState.harnessRuns || []}
        sessionError={sessionsState.sessionError || ''}
        onClearSessionError={sessionsState.clearSessionError}
        onCancelHarnessRun={sessionsState.cancelHarnessRun}
        onResumeHarnessRun={sessionsState.resumeHarnessRun}
        handleOpenSessionMapShortcut={handleOpenSessionMapShortcut}
        handleRevealSessionMapShortcut={handleRevealSessionMapShortcut}
        loading={loading}
        loadCells={loadCells}
        tmuxStatus={tmuxStatus}
        ipcAvailable={ipcAvailable}
        sessionMapCenterSlot={sessionMapCenterSlot}
        pendingTransition={pendingTransition}
        transitionError={transitionError}
        transitionLoading={transitionLoading}
        handleCancelTransition={handleCancelTransition}
        handleConfirmTransition={handleConfirmTransition}
        handleRefreshTransitionGates={handleRefreshTransitionGates}
      />
    </div>
  );
}

function App() {
  return (
    <ModalProvider>
      <AppShell />
    </ModalProvider>
  );
}

export default App;
