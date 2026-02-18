import React, { useCallback, useEffect, useMemo, useState } from 'react';
import '@xterm/xterm/css/xterm.css';
import { StatusBar } from './components/StatusBar';
import { AppLayout } from './components/AppLayout';
import { CreateCellModal } from './components/modals/CreateCellModal';
import { LifecycleConfirmModal } from './components/modals/LifecycleConfirmModal';
import { ModalProvider, useModal } from './components/modals/ModalSystem';
import { useTerminusSettings } from './hooks/useTerminusSettings';
import { useAppShortcuts } from './hooks/useAppShortcuts';
import { useReplyQuickPrompts } from './hooks/useReplyQuickPrompts';
import { useSessionNamingSettings } from './hooks/useSessionNamingSettings';
import { useGates } from './hooks/useGates';
import { useWorktreeLinks } from './hooks/useWorktreeLinks';
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
import { buildAppLayoutPanelProps } from './app/buildAppLayoutPanelProps';
import { buildAppLayoutProps } from './app/buildAppLayoutProps';
import { useCellLifecycleTransitionModal } from './app/useCellLifecycleTransitionModal';
import { useCreateCellModalLauncher } from './app/useCreateCellModalLauncher';
import { useGlobalAppShortcutListener } from './app/useGlobalAppShortcutListener';
import { BASELINE_PROFILE_ID } from './utils/terminusSettings';
import { SessionMapOverlay } from './components/sessionMap/SessionMapOverlay';
import { SessionMapToggle } from './components/sessionMap/SessionMapToggle';
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
  const [showCreate, setShowCreate] = useState(false);
  const [pendingTransition, setPendingTransition] = useState(null);
  const [transitionError, setTransitionError] = useState('');
  const [transitionLoading, setTransitionLoading] = useState(false);
  const [uiStateLoaded, setUiStateLoaded] = useState(false);
  const [activeView, setActiveView] = useState('agent-cells');
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hilDrawerOpen, setHilDrawerOpen] = useState(false);
  const [hilDrawerPanel, setHilDrawerPanel] = useState('comments');
  const [hilDrawerPanelByView, setHilDrawerPanelByView] = useState({});
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [workbenchSelectionByCellId, setWorkbenchSelectionByCellId] = useState({});
  const [replySelectionByKey, setReplySelectionByKey] = useState({});
  const [replyFocusToken, setReplyFocusToken] = useState(0);
  const [pendingWorkbenchJump, setPendingWorkbenchJump] = useState(null);
  const [pendingExplorerReveal, setPendingExplorerReveal] = useState(null);
  const [hierarchySection, setHierarchySection] = useState('actions');
  const [actionsScope, setActionsScope] = useState('global');
  const [appShortcutsScope, setAppShortcutsScope] = useState('global');
  const [replyQuickPromptsScope, setReplyQuickPromptsScope] = useState('global');
  const [sessionNamingScope, setSessionNamingScope] = useState('global');
  const [gateScope, setGateScope] = useState('global');
  const [gateStage, setGateStage] = useState('active');
  const [memoFocusTarget, setMemoFocusTarget] = useState('');
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalMode, setTerminalMode] = useState('shell');
  const [tmuxStatus, setTmuxStatus] = useState({ available: true, error: '', version: '' });
  const [ipcAvailable, setIpcAvailable] = useState(true);
  const [initialActiveSessions, setInitialActiveSessions] = useState({});
  const [initialWorkbenchTabs, setInitialWorkbenchTabs] = useState({});
  const [initialWorkbenchActiveTabs, setInitialWorkbenchActiveTabs] = useState({});
  const [userDataPath, setUserDataPath] = useState('');
  const [explorerDeliverySummary, setExplorerDeliverySummary] = useState<any>(null);
  const [actionSheetSessionId, setActionSheetSessionId] = useState('');
  const [actionSheetInlineError, setActionSheetInlineError] = useState('');
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
    setActiveView,
    setHilDrawerOpen,
    setHilDrawerPanel,
    setHilDrawerPanelByView,
    setTerminalOpen,
    setUiStateLoaded,
    uiStateLoaded,
    setTmuxStatus,
    setIpcAvailable,
  });
  const {
    links: worktreeLinks,
    autoLinkOnCreate: worktreeLinksAuto,
    candidates: worktreeLinksCandidates,
    statusesByPath: worktreeLinksStatusesByPath,
    repoRoot: worktreeLinksRepoRoot,
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
  } = useWorktreeLinks({ selectedCell: scopedCell, cells, projectRoot });
  const {
    resolvedProfiles,
    resolvedBindingsByProfile,
    profileRows,
    bindingRowsByProfile,
    scopeDisabled: terminusScopeDisabled,
    projectSettingsPath,
    agentSettingsPath,
    error: terminusError,
    saving: terminusSaving,
    dirty: terminusDirty,
    summary: terminusSummary,
    addProfile,
    updateProfile,
    overrideProfile,
    removeProfile,
    resetProfile,
    addBinding,
    updateBinding,
    overrideBinding,
    removeBinding,
    resetBinding,
    saveSettings: saveTerminusSettings,
    clearError: clearTerminusError,
  } = useTerminusSettings({ selectedCell: scopedCell, terminusScope: actionsScope });
  const {
    resolvedActions: appShortcutResolvedActions,
    actionRows: appShortcutRows,
    scopeDisabled: appShortcutsScopeDisabled,
    projectSettingsPath: appShortcutsProjectPath,
    agentSettingsPath: appShortcutsAgentPath,
    globalSettingsPath: appShortcutsGlobalPath,
    error: appShortcutsError,
    saving: appShortcutsSaving,
    dirty: appShortcutsDirty,
    summary: appShortcutsSummary,
    updateAction: updateAppShortcut,
    overrideAction: overrideAppShortcut,
    resetAction: resetAppShortcut,
    saveAppShortcuts,
    clearError: clearAppShortcutsError,
  } = useAppShortcuts({
    selectedCell: scopedCell,
    appShortcutsScope,
    userDataPath,
  });
  const {
    scopePrompts: replyQuickPromptsRows,
    resolvedPrompts: resolvedReplyQuickPrompts,
    scopeDisabled: replyQuickPromptsScopeDisabled,
    projectSettingsPath: replyQuickPromptsProjectPath,
    agentSettingsPath: replyQuickPromptsAgentPath,
    globalSettingsPath: replyQuickPromptsGlobalPath,
    error: replyQuickPromptsError,
    saving: replyQuickPromptsSaving,
    dirty: replyQuickPromptsDirty,
    summary: replyQuickPromptsSummary,
    addPrompt: addReplyQuickPrompt,
    updatePrompt: updateReplyQuickPrompt,
    removePrompt: removeReplyQuickPrompt,
    savePrompts: saveReplyQuickPrompts,
    clearError: clearReplyQuickPromptsError,
  } = useReplyQuickPrompts({
    selectedCell: scopedCell,
    scope: replyQuickPromptsScope,
    userDataPath,
  });
  const {
    scopeSettings: sessionNamingSettings,
    resolvedSettings: resolvedSessionNaming,
    scopeDisabled: sessionNamingScopeDisabled,
    projectSettingsPath: sessionNamingProjectPath,
    agentSettingsPath: sessionNamingAgentPath,
    globalSettingsPath: sessionNamingGlobalPath,
    error: sessionNamingError,
    saving: sessionNamingSaving,
    dirty: sessionNamingDirty,
    summary: sessionNamingSummary,
    updateRule: updateSessionNamingRule,
    updateNameList: updateSessionNamingList,
    removeNameList: removeSessionNamingList,
    renameNameList: renameSessionNamingList,
    addNameList: addSessionNamingList,
    saveSettings: saveSessionNamingSettings,
    clearError: clearSessionNamingError,
  } = useSessionNamingSettings({
    selectedCell: scopedCell,
    sessionNamingScope,
    userDataPath,
  });
  const memoVoiceShortcut = useMemo(() => {
    const action = (appShortcutResolvedActions || []).find((entry) => entry.id === 'memo.voice');
    return action?.shortcut || '';
  }, [appShortcutResolvedActions]);
  const screenshotShortcut = useMemo(() => {
    const action = (appShortcutResolvedActions || []).find((entry) => entry.id === 'capture.screenshot');
    return action?.shortcut || '';
  }, [appShortcutResolvedActions]);
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
  } = useGates({ selectedCell: scopedCell, gateScope, gateStage, repoRoot: projectRoot });
  const handleOpenTerminal = useCallback(() => {
    setTerminalMode('shell');
    setTerminalOpen(true);
  }, []);
  const {
    sessions,
    sessionsByCellId,
    activeSessionId,
    activeFontSize,
    sessionFontSizeByKey,
    lastActivityAt,
    sessionActivityByKey,
    sessionVisitedByKey,
    sessionLoading,
    sessionError,
    pendingCommand,
    activeSessionByCellId,
    refreshSessions,
    refreshSessionsForCells,
    createSession,
    createSessionForCell,
    closeSession,
    detachSession,
    renameSession,
    updateSessionAvatar,
    selectSession,
    updateSessionActivity,
    zoomIn,
    zoomOut,
    zoomReset,
    dispatchSessionCommand,
    sendSessionText,
    acknowledgeCommandSent,
    handleSessionAttached,
    resetSessions,
  } = useSessions({
    selectedCell,
    cells,
    tmuxStatus,
    onOpenTerminal: handleOpenTerminal,
    initialActiveSessions,
  });
  const sessionTargets = useMemo(() => {
    const list = [];
    (displayCells || []).forEach((cell) => {
      const sessions = sessionsByCellId[cell.id] || [];
      sessions.forEach((session) => {
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
  }, [displayCells, sessionsByCellId]);
  const {
    activityDiffThreshold,
    focusSession,
    sessionMapEnabled,
    sessionMapModel,
    sessionMapOpen,
    handleToggleSessionMap,
    resolveSessionMapFontSize,
    handleSelectSessionFromMap,
  } = useSessionMapOverlayController({
    projectRoot,
    projectReady,
    cells,
    sessions,
    sessionsByCellId,
    activeSessionId,
    activeSessionByCellId,
    sessionActivityByKey,
    sessionVisitedByKey,
    resolvedProfiles,
    activeFontSize,
    sessionFontSizeByKey,
    refreshSessionsForCells,
    selectSession,
    setSelectedId,
    setTerminalOpen,
    setActiveView,
  });

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
  const {
    sheets: actionSheets,
    selectedId: actionSheetId,
    selectedSheet: actionSheetDetail,
    loading: actionSheetsLoading,
    detailLoading: actionSheetDetailLoading,
    error: actionSheetsError,
    setSelectedId: setActionSheetId,
    refreshList: refreshActionSheets,
    createSheet: createActionSheet,
    updateSheetStatus: updateActionSheetStatus,
    updateSheetPlan: updateActionSheetPlan,
    updateSheetPrompt: updateActionSheetPrompt,
    updateSheetChecks: updateActionSheetChecks,
    refreshChecks: refreshActionSheetChecks,
    dispatchSheet: dispatchActionSheet,
    cancelSheet: cancelActionSheet,
    conditionalDefaults,
    showArchived: showArchivedActionSheets,
    setShowArchived: setShowArchivedActionSheets,
    archiveSheet: archiveActionSheet,
    deleteSheet: deleteActionSheet,
  } = useActionSheets({
    worktreePath: actionSheetsRoot,
    selectedCellId: selectedCell?.id || '',
    dispatchSessionCommand,
    onOpenTerminal: handleOpenTerminal,
    onSelectSession: selectSession,
    onSwitchView: setActiveView,
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
    if (actionSheetSessionId || !activeSessionId) {
      return;
    }
    setActionSheetSessionId(activeSessionId);
  }, [actionSheetSessionId, activeSessionId]);
  useEffect(() => {
    const linked = actionSheetDetail?.status?.sessionId;
    if (actionSheetSessionId || !linked) {
      return;
    }
    setActionSheetSessionId(linked);
  }, [actionSheetDetail?.status?.sessionId, actionSheetSessionId]);
  useEffect(() => {
    setExplorerDeliverySummary(null);
  }, [projectRoot, selectedCell?.id]);
  useEffect(() => {
    if (activeView !== 'agent-cells' || !projectReady || displayCells.length === 0) {
      return;
    }
    refreshSessionsForCells(displayCells, { silent: true });
  }, [activeView, projectReady, displayCells, refreshSessionsForCells]);
  const handleSelectSessionFromSidebar = useCallback(
    (cellId, sessionId) => {
      if (!cellId || !sessionId) {
        return;
      }
      const targetCell = displayCells.find((cell) => cell.id === cellId);
      if (!targetCell) {
        return;
      }
      setSelectedId(cellId);
      selectSession(sessionId, cellId);
      setTerminalOpen(true);
      refreshSessionsForCells([targetCell], { silent: true });
    },
    [displayCells, refreshSessionsForCells, selectSession]
  );
  const activeTab = workbench.activeTab;
  const [workbenchMetaByCellId, setWorkbenchMetaByCellId] = useState({});
  const handleWorkbenchMetaChange = useCallback((cellId, meta) => {
    if (!cellId) {
      return;
    }
    setWorkbenchMetaByCellId((current) => ({
      ...current,
      [cellId]: meta || {},
    }));
  }, []);
  useEffect(() => {
    if (activeView === 'agent-cells') {
      setHilDrawerOpen(true);
      setHilDrawerPanel('reply');
    }
  }, [activeView]);
  useEffect(() => {
    if (hilDrawerOpen && activeView === 'agent-cells' && hilDrawerPanel !== 'reply') {
      setHilDrawerPanel('reply');
    }
  }, [hilDrawerOpen, activeView, hilDrawerPanel]);
  const openHilDrawer = useCallback((panel = 'comments') => {
    setHilDrawerPanel(panel);
    setHilDrawerOpen(true);
  }, []);
  const handleSelectHilDrawerPanel = useCallback(
    (panel) => {
      if (!panel) {
        return;
      }
      setHilDrawerPanel(panel);
      setHilDrawerPanelByView((current) => ({
        ...current,
        [activeView]: panel,
      }));
    },
    [activeView]
  );
  const availableActionSessions = useMemo(
    () => sessions.filter((session) => session.status !== 'closed'),
    [sessions]
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
    conditionalDefaults,
    activeSessionId,
    summarizeHilDraft: hilMemo.summarizeBody,
    refreshHilMemo: hilMemo.refresh,
    createActionSheet,
    updateActionSheetStatus,
    updateActionSheetPlan,
    updateActionSheetPrompt,
    updateActionSheetChecks,
    dispatchActionSheet,
    archiveActionSheet,
    deleteActionSheet,
    dispatchSessionCommand,
    setActionSheetInlineError,
    setActionSheetSessionId,
    setActionSheetId,
    setExplorerDeliverySummary,
    setActiveView,
    handleOpenTerminal,
    selectSession,
    projectGatesPath,
    agentGatesPath,
  });

  const {
    commentRootPath,
    commentFilePath,
    comments,
    commentsLoading,
    commentsError,
    refreshComments: loadComments,
    commentLines,
    commentCountsByPath: hilCommentCounts,
    commentModalOpen,
    commentTarget,
    commentMessage,
    commentTodo,
    commentError,
    commentSaving,
    commentSnippet,
    commentSnippetLoading,
    commentSnippetError,
    setCommentMessage,
    setCommentTodo,
    openCommentModal,
    closeCommentModal,
    submitComment,
    updateCommentStatus,
  } = useHilFileCommenting({
    activeTab,
    cursorPosition,
    hilWorktreePath: selectedCell?.worktreePath || projectRoot || '',
    openHilDrawer,
  });
  const handleWorkbenchSelectionChange = useCallback(
    (selection) => {
      const cellKey = selectedCell?.id || 'repo';
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
    [selectedCell?.id]
  );
  const handleSelectionContext = useCallback((selection) => {
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
    (selection) => {
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
    [activeView]
  );
  const promoteWorktreePath = selectedCell?.worktreePath || projectRoot || '';
  const {
    promoteModalOpen,
    promoteStep,
    promoteDescription,
    promoteLoading,
    promoteError,
    promoteItems,
    promoteSelectedIds,
    promotePreviewById,
    promoteDraftId,
    promoteDraft,
    promoteMode,
    promoteActionSheet,
    promoteActionSheetId,
    promoteGateStatus,
    promoteExecutionStatus,
    promoteSessionId,
    setPromoteDescription,
    setPromoteSessionId,
    selectPromoteMode,
    openPromoteModal,
    closePromoteModal,
    togglePromoteItem,
    togglePromoteGroup,
    loadPromotePreview,
    createPromoteSession,
    dispatchPromote,
    confirmPromote,
  } = useHilPromoteWorkflow({
    promoteWorktreePath,
    sessions,
    activeSessionId,
    activeView,
    selectedCellId: selectedCell?.id || '',
    conditionalDefaults,
    createActionSheet,
    updateActionSheetPlan,
    updateActionSheetPrompt,
    updateActionSheetChecks,
    dispatchActionSheet,
    dispatchSessionCommand,
    createSession,
    loadComments,
    openHilDrawer,
  });

  useEffect(() => {
    if (commentModalOpen || promoteModalOpen) {
      setHilDrawerPanel('comments');
      setHilDrawerOpen(true);
      return;
    }
    const preferredPanel = hilDrawerPanelByView[activeView];
    setHilDrawerPanel(preferredPanel || resolveHilDrawerDefault(activeView));
  }, [activeView, commentModalOpen, hilDrawerPanelByView, promoteModalOpen]);

  const { handleSelectProjectRoot, handleOpenRecentProject } = useAppProjectLifecycle({
    resetSessions,
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
    activeSessionByCellId,
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
  const gateDisplayStage = scopedCell?.state === 'archived' ? 'archived' : 'active';
  const gateResultsByStage = scopedCell ? gateResultsByCellId[scopedCell.id] || {} : {};
  const gatesCheckingByStage = scopedCell ? gatesCheckingByCellId[scopedCell.id] || {} : {};
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
    checkGatesForCell,
    createTurnGateCreateSheetForCell,
    handleOpenActionSheets,
    handleOpenTerminal,
    setTransitionError,
    setCells,
    setPendingTransition,
    setProjectError,
    setLoading,
    setShowCreate,
    setSelectedId,
    saveGates,
    modal,
  });
  const canUseScopedConfig = Boolean(scopedCell?.worktreePath);
  const resolvedRepoRoot = projectRoot || worktreeLinksRepoRoot;
  const appShortcutsPaths = {
    global: appShortcutsGlobalPath,
    project: appShortcutsProjectPath,
    agent: appShortcutsAgentPath,
  };
  const replyQuickPromptsPaths = {
    global: replyQuickPromptsGlobalPath,
    project: replyQuickPromptsProjectPath,
    agent: replyQuickPromptsAgentPath,
  };
  const sessionNamingPaths = {
    global: sessionNamingGlobalPath,
    project: sessionNamingProjectPath,
    agent: sessionNamingAgentPath,
  };
  const terminusProfiles = useMemo(
    () =>
      (resolvedProfiles || []).filter((profile) => {
        const startCommand = String(profile.startCommand || '').trim();
        const resumeCommand = String(profile.resumeCommand || '').trim();
        return Boolean(startCommand || resumeCommand);
      }),
    [resolvedProfiles]
  );
  const activeSession = useMemo(
    () => sessions?.find((session) => session.id === activeSessionId) || null,
    [sessions, activeSessionId]
  );
  const replySelectionKey = useMemo(() => {
    if (!selectedCell?.id || !activeSessionId) {
      return '';
    }
    return `${selectedCell.id}:${activeSessionId}`;
  }, [activeSessionId, selectedCell?.id]);
  const activeReplySelection = useMemo(() => {
    if (!replySelectionKey) {
      return null;
    }
    return replySelectionByKey[replySelectionKey] || null;
  }, [replySelectionByKey, replySelectionKey]);
  const activeProfileId = activeSession?.profileId || BASELINE_PROFILE_ID;
  const activeProfileBindings = useMemo(() => {
    if (!resolvedBindingsByProfile) {
      return [];
    }
    if (typeof resolvedBindingsByProfile.get === 'function') {
      return resolvedBindingsByProfile.get(activeProfileId) || [];
    }
    return resolvedBindingsByProfile[activeProfileId] || [];
  }, [activeProfileId, resolvedBindingsByProfile]);
  const sessionNamingPreviewContext = useMemo(() => {
    const projectLabel = (projectRoot || '')
      .split('/')
      .filter(Boolean)
      .pop();
    return {
      cell: selectedCell?.name || 'Agent',
      profile: activeProfileId || 'shell',
      project: projectLabel || '',
      branch: selectedCell?.branch || '',
      user: 'you',
    };
  }, [activeProfileId, projectRoot, selectedCell?.branch, selectedCell?.name]);
  const {
    openWorkbenchFile: handleOpenWorkbenchFile,
    revealWorkbenchFile: handleRevealWorkbenchFile,
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
    setActiveView,
    setSidebarCollapsed,
    setSelectedId,
    setPendingExplorerReveal,
    setPendingWorkbenchJump,
  });

  const handleJumpToSession = useCallback(
    (cellId, sessionId) => {
      handleSelectSessionFromMap(cellId, sessionId, { focusView: true });
    },
    [handleSelectSessionFromMap]
  );

  const handleJumpToReplyMemo = useCallback(() => {
    setActiveView('memo');
    if (sidebarCollapsed) {
      setSidebarCollapsed(false);
    }
    hilMemo.setDockSelection({
      type: 'inbox',
      inboxType: 'reply',
      draftId: null,
    });
  }, [hilMemo.setDockSelection, sidebarCollapsed]);
  const handleClearReplySelection = useCallback(() => {
    if (!replySelectionKey) {
      return;
    }
    setReplySelectionByKey((current) => {
      if (!current[replySelectionKey]) {
        return current;
      }
      const next = { ...current };
      delete next[replySelectionKey];
      return next;
    });
  }, [replySelectionKey]);

  const editorPaneProps = {
    cell: selectedCell,
    projectReady,
    projectError,
    terminalMode,
    terminalOpen,
    sessionId: activeSessionId,
    sessionTargets,
    sessions,
    sessionLoading,
    sessionError,
    terminusBindings: activeProfileBindings,
    tmuxStatus,
    gateResultsByStage,
    gatesCheckingByStage,
    gateDisplayStage,
    idleSince: lastActivityAt,
    isVisible: activeView === 'agent-cells',
    onRefreshSessions: refreshSessions,
    onStateChange: handleStateChange,
    onTurnGateCreate: handleTurnGateCreateSheet,
    onTurnGateExecute: handleTurnGateExecuteSheet,
    onOpenTerminal: handleOpenTerminal,
    onZoomIn: zoomIn,
    onZoomOut: zoomOut,
    onZoomReset: zoomReset,
    onSelectProject: handleSelectProjectRoot,
    pendingCommand,
    onCommandSent: acknowledgeCommandSent,
    onSessionActivity: updateSessionActivity,
    onSessionAttached: handleSessionAttached,
    onSendSessionText: sendSessionText,
    terminalFontSize: activeFontSize,
    onUpdateCellAvatar: handleUpdateCellAvatar,
    onOpenWorkbenchFile: handleOpenWorkbenchFile,
    onJumpToSession: handleJumpToSession,
    onJumpToMemo: handleJumpToReplyMemo,
    activityDiffThreshold,
    onSelectionContext: handleSelectionContext,
    onReplySelection: handleReplySelection,
  };
  const {
    handleSwitchView,
    handleHierarchyJump,
    handleSelectActionsScope,
    handleConfigureProfile,
    handleSelectAppShortcutsScope,
    handleSelectReplyQuickPromptsScope,
    handleSelectGateScope,
    handleSelectSessionNamingScope,
    handleSelectHierarchySection,
    handleToggleSidebar,
  } = useHierarchyNavigation({
    sidebarCollapsed,
    setActiveView,
    setSidebarCollapsed,
    setHierarchySection,
    setActionsScope,
    setAppShortcutsScope,
    setReplyQuickPromptsScope,
    setGateScope,
    setSessionNamingScope,
    clearTerminusError,
    clearAppShortcutsError,
    clearReplyQuickPromptsError,
    clearGatesError,
    clearSessionNamingError,
    clearWorktreeLinksError,
  });
  const explorerRootPath = projectReady
    ? selectedCell?.worktreePath || projectRoot || ''
    : '';
  const explorerRootLabel = projectReady
    ? selectedCell?.name || 'Repository'
    : 'Project';
  const explorerMeta = workbenchMetaByCellId[selectedCell?.id || 'repo'] || {};
  const memoSelection = workbenchSelectionByCellId[selectedCell?.id || 'repo'] || null;
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
  const handleAddCommentFromExplorer = useCallback((path) => {
    if (!path) {
      return;
    }
    void handleOpenWorkbenchFile({
      path,
      rootPath: explorerRootPath,
      focusView: true,
      cellId: selectedCell?.id,
      sourceSurface: 'explorer',
    });
    setTimeout(() => {
      openCommentModal({ line: 1 });
    }, 100);
  }, [explorerRootPath, handleOpenWorkbenchFile, openCommentModal, selectedCell?.id]);
  const handleJumpToComments = useCallback(
    (path) => {
      if (!path) {
        return;
      }
      void handleOpenWorkbenchFile({
        path,
        rootPath: explorerRootPath,
        focusView: true,
        cellId: selectedCell?.id,
        sourceSurface: 'explorer',
      });
      setActiveView('explorer');
      openHilDrawer('comments');
    },
    [explorerRootPath, handleOpenWorkbenchFile, openHilDrawer, selectedCell?.id]
  );
  const handleFocusPromoteSession = useCallback(() => {
    if (!promoteSessionId) {
      return;
    }
    setActiveView('agent-cells');
    handleOpenTerminal();
    selectSession(promoteSessionId);
  }, [handleOpenTerminal, promoteSessionId, selectSession]);
  const handleFocusInboxInput = useCallback((targetId) => {
    if (!targetId) {
      return;
    }
    setMemoFocusTarget(targetId);
  }, []);
  const handleFocusInboxInputHandled = useCallback(() => {
    setMemoFocusTarget('');
  }, []);
  const handleOpenMemoInbox = useCallback(
    (inboxType = 'comments') => {
      handleSwitchView('memo');
      hilMemo.setDockSelection({
        type: 'inbox',
        inboxType,
        draftId: null,
      });
    },
    [handleSwitchView, hilMemo.setDockSelection]
  );
  const handleOpenMemoDraft = useCallback(
    (draftId) => {
      if (!draftId) {
        return;
      }
      handleSwitchView('memo');
      hilMemo.setDockSelection({
        type: 'draft',
        inboxType: 'comments',
        draftId,
      });
    },
    [handleSwitchView, hilMemo.setDockSelection]
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
    checkGatesForCell,
  });
  const {
    hilReplyProps,
    hilCommentsProps,
    hilDraftsProps,
    memoDrawerProps,
    appLayoutActionSheetsProps,
    appLayoutExplorerSidebarProps,
    appLayoutExplorerPaneProps,
    appLayoutMemoPaneProps,
    appLayoutMemoSidebarProps,
  } = buildAppLayoutPanelProps({
    selectedCell,
    projectRoot,
    activeSession,
    activeReplySelection,
    replyFocusToken,
    resolvedReplyQuickPrompts,
    sessionTargets,
    handleClearReplySelection,
    sendSessionText,
    handleJumpToSession,
    handleJumpToReplyMemo,
    activeTab,
    cursorPosition,
    comments,
    commentsLoading,
    commentsError,
    handleOpenMemoReference,
    handleRevealMemoReference,
    openCommentModal,
    updateCommentStatus,
    commentModalOpen,
    commentTarget,
    commentMessage,
    commentTodo,
    commentError,
    commentSaving,
    commentSnippet,
    commentSnippetLoading,
    commentSnippetError,
    setCommentMessage,
    setCommentTodo,
    closeCommentModal,
    submitComment,
    promoteModalOpen,
    promoteDescription,
    promoteError,
    promoteLoading,
    promoteItems,
    promoteSelectedIds,
    promotePreviewById,
    promoteStep,
    promoteDraft,
    promoteMode,
    promoteActionSheet,
    promoteGateStatus,
    promoteExecutionStatus,
    promoteSessionId,
    sessions,
    sessionActivityByKey,
    closePromoteModal,
    setPromoteDescription,
    togglePromoteItem,
    togglePromoteGroup,
    loadPromotePreview,
    setPromoteSessionId,
    selectPromoteMode,
    createPromoteSession,
    dispatchPromote,
    confirmPromote,
    handleFocusPromoteSession,
    handleOpenDeliveryTimeline,
    promoteDraftId,
    promoteActionSheetId,
    handleDispatchActionSheet,
    cancelActionSheet,
    handleArchiveActionSheet,
    handleDeleteActionSheet,
    handleOpenActionSheets,
    hilMemo,
    handleOpenMemoDraft,
    handleViewActionSheetSession,
    handleRunDraftInActiveSession,
    actionSheets,
    activeSessionId,
    handleOpenMemoInbox,
    handleFocusInboxInput,
    memoCapture,
    memoVoiceShortcut,
    screenshotShortcut,
    projectReady,
    projectError,
    handleSelectProjectRoot,
    handleCreateDraftActionSheet,
    memoFocusTarget,
    handleFocusInboxInputHandled,
    setShowArchivedActionSheets,
    actionSheetDetail,
    actionSheetId,
    setActionSheetId,
    handleCreateActionSheet,
    handleSaveActionSheet,
    updateActionSheetChecks,
    refreshActionSheets,
    showArchivedActionSheets,
    refreshActionSheetChecks,
    availableActionSessions,
    actionSheetSessionId,
    setActionSheetSessionId,
    actionSheetsLoading,
    actionSheetDetailLoading,
    actionSheetInlineError,
    actionSheetsError,
    explorerRootPath,
    explorerRootLabel,
    cells,
    selectedId,
    setSelectedId,
    sessionMapOpen,
    handleSwitchView,
    explorerMeta,
    handleDispatchExplorerFeed,
    explorerDeliverySummary,
    handleOpenExplorerDeliveryTimeline,
    handleToggleSessionMap,
    pendingExplorerReveal,
    setPendingExplorerReveal,
    workbench,
    handleAddCommentFromExplorer,
    hilCommentCounts,
    handleJumpToComments,
    commentLines,
    handleWorkbenchMetaChange,
    setCursorPosition,
    handleWorkbenchSelectionChange,
    pendingWorkbenchJump,
    setPendingWorkbenchJump,
    handleRevealPathInExplorerFromWorkbench,
  });
  const appLayoutProps = buildAppLayoutProps({
    activeView,
    handleSwitchView,
    hierarchySection,
    handleSelectHierarchySection,
    displayCells,
    selectedId,
    selectedCell,
    setSelectedId,
    handleOpenCreateCellModal,
    handleHierarchyJump,
    handleOpenExplorerForCell,
    handleOpenAgentCellFileReference,
    handleRevealAgentCellFileReference,
    handleImportAgentCellFileReferences,
    sessionsByCellId,
    activeSessionByCellId,
    sessionActivityByKey,
    terminusProfiles,
    handleSelectSessionFromSidebar,
    createSessionForCell,
    dispatchSessionCommand,
    closeSession,
    detachSession,
    renameSession,
    updateSessionAvatar,
    projectReady,
    projectError,
    projectRoot,
    recentProjects,
    tmuxStatus,
    handleSelectProjectRoot,
    handleOpenRecentProject,
    actionsScope,
    handleSelectActionsScope,
    handleConfigureProfile,
    appShortcutsScope,
    handleSelectAppShortcutsScope,
    replyQuickPromptsScope,
    handleSelectReplyQuickPromptsScope,
    sessionNamingScope,
    handleSelectSessionNamingScope,
    terminusScopeDisabled,
    terminusSummary,
    appShortcutsScopeDisabled,
    appShortcutsSummary,
    replyQuickPromptsScopeDisabled,
    replyQuickPromptsSummary,
    appShortcutRows,
    replyQuickPromptsRows,
    resolvedReplyQuickPrompts,
    replyQuickPromptsPaths,
    replyQuickPromptsError,
    replyQuickPromptsSaving,
    replyQuickPromptsDirty,
    addReplyQuickPrompt,
    updateReplyQuickPrompt,
    removeReplyQuickPrompt,
    saveReplyQuickPrompts,
    clearReplyQuickPromptsError,
    appShortcutsPaths,
    appShortcutsError,
    appShortcutsSaving,
    appShortcutsDirty,
    updateAppShortcut,
    overrideAppShortcut,
    resetAppShortcut,
    saveAppShortcuts,
    clearAppShortcutsError,
    sessionNamingScopeDisabled,
    sessionNamingSummary,
    sessionNamingSettings,
    resolvedSessionNaming,
    sessionNamingPaths,
    sessionNamingError,
    sessionNamingSaving,
    sessionNamingDirty,
    sessionNamingPreviewContext,
    updateSessionNamingRule,
    updateSessionNamingList,
    renameSessionNamingList,
    removeSessionNamingList,
    addSessionNamingList,
    saveSessionNamingSettings,
    clearSessionNamingError,
    profileRows,
    activeProfileId,
    projectSettingsPath,
    agentSettingsPath,
    terminusError,
    terminusSaving,
    terminusDirty,
    addProfile,
    removeProfile,
    overrideProfile,
    resetProfile,
    updateProfile,
    saveTerminusSettings,
    bindingRowsByProfile,
    addBinding,
    removeBinding,
    overrideBinding,
    resetBinding,
    updateBinding,
    clearTerminusError,
    gateScope,
    handleSelectGateScope,
    gateStage,
    setGateStage,
    gateScopeDisabled,
    gateSummary,
    gateRows,
    projectGatesPath,
    agentGatesPath,
    gatesError,
    gatesSaving,
    addGate,
    removeGate,
    overrideGate,
    resetGate,
    updateGate,
    handleSaveGates,
    worktreeLinks,
    worktreeLinksAuto,
    worktreeLinksCandidates,
    worktreeLinksStatusesByPath,
    worktreeLinksConfigPath,
    worktreeLinksLoading,
    worktreeLinksError,
    worktreeLinksDirty,
    toggleWorktreeLinksAuto,
    addWorktreeLink,
    addWorktreeLinkFromCandidate,
    updateWorktreeLink,
    removeWorktreeLink,
    applyWorktreeLink,
    applyAllWorktreeLinks,
    saveWorktreeLinks,
    refreshWorktreeLinks,
    resolvedRepoRoot,
    canUseScopedConfig,
    editorPaneProps,
    sidebarWidth,
    sidebarCollapsed,
    setSidebarWidth,
    handleSidebarResizeEnd,
    handleToggleSidebar,
    hilDrawerOpen,
    hilDrawerPanel,
    setHilDrawerOpen,
    handleSelectHilDrawerPanel,
    openPromoteModal,
    hilCommentsProps,
    hilDraftsProps,
    hilReplyProps,
    memoDrawerProps,
    appLayoutActionSheetsProps,
    appLayoutExplorerSidebarProps,
    appLayoutExplorerPaneProps,
    appLayoutMemoPaneProps,
    appLayoutMemoSidebarProps,
  });

  return (
    <div className="relative flex h-screen flex-col bg-background text-foreground overflow-hidden">
      <AppLayout {...appLayoutProps} />

        <SessionMapOverlay
          open={sessionMapOpen}
          model={sessionMapModel}
          onSelectSession={handleSelectSessionFromMap}
          onClose={handleToggleSessionMap}
          resolveFontSize={resolveSessionMapFontSize}
          terminusProfiles={terminusProfiles}
          onCreateSession={createSessionForCell}
          onDispatchCommand={dispatchSessionCommand}
          onRenameSession={renameSession}
          onUpdateSessionAvatar={updateSessionAvatar}
          onOpenFileShortcut={handleOpenSessionMapShortcut}
          onRevealFileShortcut={handleRevealSessionMapShortcut}
          mode="dock"
        />

        <StatusBar
          loading={loading}
          onRefresh={loadCells}
          tmuxStatus={tmuxStatus}
          ipcAvailable={ipcAvailable}
          centerSlot={sessionMapCenterSlot}
        />

        {showCreate ? (
          <CreateCellModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />
        ) : null}
        {pendingTransition ? (
          <LifecycleConfirmModal
            transition={pendingTransition}
            error={transitionError}
            loading={transitionLoading}
            onCancel={handleCancelTransition}
            onConfirm={handleConfirmTransition}
            onRefresh={handleRefreshTransitionGates}
          />
        ) : null}

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
