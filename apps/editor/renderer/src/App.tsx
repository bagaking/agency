import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useSessionMap } from './hooks/useSessionMap';
import { useActionSheets } from './hooks/useActionSheets';
import { useWorkbench } from './hooks/useWorkbench';
import { useHilMemoState } from './hooks/useHilMemoState';
import { useHilMemoCaptureState } from './hooks/useHilMemoCaptureState';
import {
  createCell as agencyCreateCell,
  createHilItem as agencyCreateHilItem,
  getFileSnippet as agencyGetFileSnippet,
  getProjectContext,
  getTmuxStatus as agencyGetTmuxStatus,
  getUiState,
  getGates as agencyGetGates,
  isAgencyAvailable,
  listCells as agencyListCells,
  listComments as agencyListComments,
  listHilItems as agencyListHilItems,
  onCellsUpdated as subscribeCellsUpdated,
  onProjectUpdated as subscribeProjectUpdated,
  onRecentProjectsUpdated as subscribeRecentProjectsUpdated,
  readActionSheet as agencyReadActionSheet,
  readWorkbenchEntry as agencyReadWorkbenchEntry,
  onAppShortcutTriggered as subscribeAppShortcutTriggered,
  selectProjectRoot as agencySelectProjectRoot,
  setProjectRoot as agencySetProjectRoot,
  setUiState as agencySetUiState,
  submitComment as agencySubmitComment,
  updateCellState as agencyUpdateCellState,
  updateCellMeta as agencyUpdateCellMeta,
  updateHilItem as agencyUpdateHilItem,
} from './services/agencyBridge';
import { warmSessionMapPreviewCache } from './services/sessionMapPreviewCache';
import { useWorkbenchFileNavigation } from './app/useWorkbenchFileNavigation';
import { buildPromotePromptBundle, buildPromotePromptText, buildPromoteActionSheetPrompt } from './utils/hilPromotePrompt';
import { buildActionSheetCompletion, buildActionSheetPlan } from './utils/actionSheetCompletion';
import {
  buildDeliveryMeta,
  normalizeDeliveryMode,
  setDeliveryExecutionStatus,
  type DeliveryMode,
} from './utils/deliveryMetadata';
import { BASELINE_PROFILE_ID } from './utils/terminusSettings';
import { SessionMapOverlay } from './components/sessionMap/SessionMapOverlay';
import { SessionMapToggle } from './components/sessionMap/SessionMapToggle';
import { PREVIEW_WARMUP_DELAY_MS } from './components/sessionMap/sessionMapConstants';
import { buildSessionMapModel } from './utils/sessionMapModel';
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

const buildExplorerDeliveryPromptText = ({
  description,
  context,
  mode = 'quick',
  requestedAt = '',
  sessionId = '',
  references = [],
}: {
  description: string;
  context: string;
  mode?: DeliveryMode | string;
  requestedAt?: string;
  sessionId?: string;
  references?: Array<{ path?: string | null }>;
}) => {
  const normalizedMode = normalizeDeliveryMode(mode);
  const referenceLines = (Array.isArray(references) ? references : [])
    .map((entry) => String(entry?.path || '').trim())
    .filter(Boolean);
  const lines = ['<delivery>'];
  lines.push('source: explorer');
  lines.push(`mode: ${normalizedMode}`);
  if (sessionId) {
    lines.push(`session_id: ${sessionId}`);
  }
  if (requestedAt) {
    lines.push(`requested_at: ${requestedAt}`);
  }
  if (referenceLines.length) {
    lines.push('references:');
    referenceLines.forEach((path) => lines.push(`- ${path}`));
  }
  lines.push('</delivery>');
  lines.push('');
  lines.push('<context>');
  if (context) {
    lines.push(context);
  } else {
    lines.push('- No explicit file selection context.');
  }
  lines.push('</context>');
  lines.push('<query>');
  lines.push(description || 'Review selected files.');
  lines.push('</query>');
  return lines.join('\n');
};

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
  const [sessionMapOpen, setSessionMapOpen] = useState(false);
  const [initialActiveSessions, setInitialActiveSessions] = useState({});
  const [initialWorkbenchTabs, setInitialWorkbenchTabs] = useState({});
  const [initialWorkbenchActiveTabs, setInitialWorkbenchActiveTabs] = useState({});
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState('');
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [commentMessage, setCommentMessage] = useState('');
  const [commentTodo, setCommentTodo] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [commentSaving, setCommentSaving] = useState(false);
  const [commentTarget, setCommentTarget] = useState({ line: 1, column: 1 });
  const [commentSnippet, setCommentSnippet] = useState(null);
  const [commentSnippetLoading, setCommentSnippetLoading] = useState(false);
  const [commentSnippetError, setCommentSnippetError] = useState('');
  const [hilCommentCounts, setHilCommentCounts] = useState({});
  const [hilCommentRefreshToken, setHilCommentRefreshToken] = useState(0);
  const [userDataPath, setUserDataPath] = useState('');
  const [promoteModalOpen, setPromoteModalOpen] = useState(false);
  const [promoteStep, setPromoteStep] = useState('setup');
  const [promoteDescription, setPromoteDescription] = useState('');
  const [promoteLoading, setPromoteLoading] = useState(false);
  const [promoteError, setPromoteError] = useState('');
  const [promoteItems, setPromoteItems] = useState([]);
  const [promoteSelectedIds, setPromoteSelectedIds] = useState([]);
  const [promotePreviewById, setPromotePreviewById] = useState({});
  const [promoteDraftId, setPromoteDraftId] = useState('');
  const [promoteDraft, setPromoteDraft] = useState(null);
  const [promoteMode, setPromoteMode] = useState<DeliveryMode>('quick');
  const [promoteGateStatus, setPromoteGateStatus] = useState('waiting');
  const [promoteExecutionStatus, setPromoteExecutionStatus] = useState('idle');
  const [promoteSessionId, setPromoteSessionId] = useState('');
  const [lastPromoteSessionId, setLastPromoteSessionId] = useState('');
  const [promoteActionSheetId, setPromoteActionSheetId] = useState('');
  const [promoteActionSheet, setPromoteActionSheet] = useState(null);
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
  const loadCells = useCallback(
    async (preferredSelection = null, rootOverride = '') => {
      const effectiveRoot = rootOverride || projectRoot;
      setLoading(true);
      try {
        if (!effectiveRoot) {
          setCells([]);
          if (!selectedId) {
            setSelectedId('local-terminal');
          }
          return;
        }
        const result = await agencyListCells({ rootPath: effectiveRoot });
        if (Array.isArray(result)) {
          setCells(result);
          if (result.length) {
            const preferredMatch = preferredSelection
              ? result.find((cell) => cell.id === preferredSelection)
              : null;
            const existingMatch = selectedId
              ? result.find((cell) => cell.id === selectedId)
              : null;
            setSelectedId((preferredMatch || existingMatch || result[0]).id);
          } else {
            setSelectedId(null);
          }
        } else {
          setCells(defaultCells);
          if (!selectedId) setSelectedId(defaultCells[0].id);
        }
      } catch (error) {
        console.error(error);
        if (String(error?.message || '').includes('Project root is not configured')) {
          setCells([]);
          setSelectedId(null);
        } else {
          setCells(defaultCells);
          if (!selectedId) setSelectedId(defaultCells[0].id);
        }
      } finally {
        setLoading(false);
      }
    },
    [projectRoot, selectedId]
  );
  useEffect(() => {
    const bootstrap = async () => {
      let context = null;
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
            setInitialWorkbenchTabs(
              resolvedProjectRoot ? state.workbenchTabsByCellId : {}
            );
          }
          if (state?.workbenchActiveTabByCellId && typeof state.workbenchActiveTabByCellId === 'object') {
            setInitialWorkbenchActiveTabs(
              resolvedProjectRoot ? state.workbenchActiveTabByCellId : {}
            );
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
          let restoredActiveView = 'agent-cells';
          if (typeof state?.activeView === 'string') {
            const allowedViews = new Set(['agent-cells', 'action-sheets', 'explorer', 'hierarchy', 'settings', 'memo']);
            if (allowedViews.has(state.activeView)) {
              restoredActiveView = state.activeView;
              setActiveView(state.activeView);
            }
          }
          if (typeof state?.hilDrawerOpen === 'boolean') {
            setHilDrawerOpen(state.hilDrawerOpen);
          }
          if (typeof state?.hilDrawerPanel === 'string') {
            setHilDrawerPanel(state.hilDrawerPanel);
          }
          if (state?.hilDrawerPanelByView && typeof state.hilDrawerPanelByView === 'object') {
            setHilDrawerPanelByView(state.hilDrawerPanelByView);
          } else if (typeof state?.hilDrawerPanel === 'string') {
            setHilDrawerPanelByView({ [restoredActiveView]: state.hilDrawerPanel });
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
  }, [loadCells]);
  useEffect(() => {
    const handleRejection = (event) => {
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
      if (unsubscribe) {
        unsubscribe();
      }
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
  }, [projectRoot, uiStateLoaded, loadCells]);
  useEffect(() => {
    const loadTmuxStatus = async () => {
      try {
        const status = await agencyGetTmuxStatus();
        if (!status) {
          return;
        }
        setTmuxStatus(status || { available: false, error: 'Unable to detect tmux.' });
      } catch (error) {
        setTmuxStatus({
          available: false,
          error: error?.message || 'Unable to detect tmux.',
          version: '',
        });
      }
    };
    loadTmuxStatus();
  }, []);

  useEffect(() => {
    const available = isAgencyAvailable();
    setIpcAvailable(available);
    if (!available) {
      console.error('IPC unavailable: preload failed to expose window.agency.');
    }
  }, []);
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
    config: sessionMapConfig,
    updateConfig: updateSessionMapConfig,
    hasLoaded: sessionMapLoaded,
  } = useSessionMap({ projectRoot });
  const activityDiffThreshold = useMemo(() => {
    const parsed = Number(sessionMapConfig?.activityDiffThreshold);
    if (!Number.isFinite(parsed)) {
      return 12;
    }
    return Math.max(1, Math.floor(parsed));
  }, [sessionMapConfig?.activityDiffThreshold]);
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
  useEffect(() => {
    setSessionMapOpen(false);
  }, [projectRoot]);
  useEffect(() => {
    if (!projectReady || !sessionMapLoaded) {
      return;
    }
    if (sessionMapConfig?.autoOpenSeen) {
      return;
    }
    setSessionMapOpen(true);
    updateSessionMapConfig({ autoOpenSeen: true });
  }, [projectReady, sessionMapConfig?.autoOpenSeen, sessionMapLoaded, updateSessionMapConfig]);
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
  const mapCells = useMemo(() => (projectReady ? cells : []), [projectReady, cells]);
  const profilesById = useMemo(() => {
    if (!resolvedProfiles) {
      return null;
    }
    return new Map(resolvedProfiles.map((profile) => [profile.id, profile]));
  }, [resolvedProfiles]);
  const sessionMapModel = useMemo(
    () =>
      buildSessionMapModel({
        cells: mapCells,
        sessionsByCellId,
        activeSessionByCellId,
        sessionActivityByKey,
        sessionVisitedByKey,
        config: sessionMapConfig,
        profilesById,
      }),
    [
      mapCells,
      sessionsByCellId,
      activeSessionByCellId,
      sessionActivityByKey,
      sessionVisitedByKey,
      sessionMapConfig,
      profilesById,
    ]
  );
  const previewWarmKeyRef = useRef('');
  const sessionMapPreviewSeeds = useMemo(() => {
    if (!sessionMapModel?.clusters?.length) {
      return [];
    }
    const seeds = [];
    sessionMapModel.clusters.forEach((cluster) => {
      const cell = cluster.cell;
      if (!cell?.id || !cell?.worktreePath) {
        return;
      }
      cluster.sessions.forEach((session) => {
        if (!session?.id || session.isOffline) {
          return;
        }
        seeds.push({
          cellId: cell.id,
          worktreePath: cell.worktreePath,
          sessionId: session.id,
        });
      });
    });
    return seeds;
  }, [sessionMapModel]);
  const sessionMapEnabled = projectReady && mapCells.length > 0;
  useEffect(() => {
    if (!sessionMapEnabled || sessionMapPreviewSeeds.length === 0) {
      return;
    }
    const nextKey = sessionMapPreviewSeeds
      .map((item) => `${item.cellId}:${item.sessionId}`)
      .sort()
      .join('|');
    if (!nextKey || nextKey === previewWarmKeyRef.current) {
      return;
    }
    previewWarmKeyRef.current = nextKey;
    const scheduleWarmup = () => {
      warmSessionMapPreviewCache({
        sessions: sessionMapPreviewSeeds,
      });
    };
    if (typeof window !== 'undefined' && window.requestIdleCallback) {
      const handle = window.requestIdleCallback(scheduleWarmup, { timeout: 1200 });
      return () => window.cancelIdleCallback?.(handle);
    }
    const handle = setTimeout(scheduleWarmup, PREVIEW_WARMUP_DELAY_MS);
    return () => clearTimeout(handle);
  }, [sessionMapEnabled, sessionMapPreviewSeeds]);
  useEffect(() => {
    if (!sessionMapOpen || !sessionMapEnabled) {
      return;
    }
    refreshSessionsForCells(mapCells, { silent: true });
  }, [mapCells, refreshSessionsForCells, sessionMapEnabled, sessionMapOpen]);
  useEffect(() => {
    if (activeView !== 'agent-cells' || !projectReady || displayCells.length === 0) {
      return;
    }
    refreshSessionsForCells(displayCells, { silent: true });
  }, [activeView, projectReady, displayCells, refreshSessionsForCells]);
  const handleToggleSessionMap = useCallback(() => {
    setSessionMapOpen((value) => !value);
  }, []);
  const resolveSessionMapFontSize = useCallback(
    (cellId, sessionId) => {
      if (!cellId || !sessionId) {
        return activeFontSize || 13;
      }
      const key = `${cellId}:${sessionId}`;
      return sessionFontSizeByKey?.[key] || activeFontSize || 13;
    },
    [activeFontSize, sessionFontSizeByKey]
  );
  const handleSelectSessionFromMap = useCallback(
    (cellId, sessionId, options: { focusView?: boolean } = {}) => {
      if (!cellId || !sessionId) {
        return;
      }
      const targetCell = mapCells.find((cell) => cell.id === cellId);
      if (!targetCell) {
        return;
      }
      if (options?.focusView) {
        setActiveView('agent-cells');
      }
      setSelectedId(cellId);
      selectSession(sessionId, cellId);
      setTerminalOpen(true);
      refreshSessionsForCells([targetCell], { silent: true });
    },
    [mapCells, refreshSessionsForCells, selectSession, setActiveView]
  );
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
  const focusSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId),
    [activeSessionId, sessions]
  );
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
  const activeTab = workbench.activeTab;
  const canComment = Boolean(activeTab && activeTab.kind === 'code');
  const commentRootPath = activeTab?.rootPath || '';
  const commentFilePath = activeTab?.path || '';
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
    if (commentModalOpen || promoteModalOpen) {
      setHilDrawerPanel('comments');
      setHilDrawerOpen(true);
      return;
    }
    const preferredPanel = hilDrawerPanelByView[activeView];
    setHilDrawerPanel(preferredPanel || resolveHilDrawerDefault(activeView));
  }, [activeView, commentModalOpen, hilDrawerPanelByView, promoteModalOpen]);
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
  const createDefaultActionSheet = useCallback(
    async ({ title }) => {
      if (!actionSheetsRoot) {
        throw new Error('Select a project before creating Action Sheets.');
      }
      const created = await createActionSheet({
        title,
        prompt: { requirements: '', context: '', checks: '', done: '' },
        checks: [],
        conditional: conditionalDefaults,
      });
      if (!created?.id) {
        throw new Error('Unable to create Action Sheet.');
      }
      const completion = buildActionSheetCompletion(created.id);
      await updateActionSheetPlan(created.id, buildActionSheetPlan({ title, marker: completion.marker }));
      await updateActionSheetPrompt(created.id, {
        requirements: '',
        context: '',
        checks: '',
        done: completion.done,
      });
      await updateActionSheetChecks(created.id, completion.checks);
      return created;
    },
    [
      actionSheetsRoot,
      conditionalDefaults,
      createActionSheet,
      updateActionSheetChecks,
      updateActionSheetPlan,
      updateActionSheetPrompt,
    ]
  );
  const handleCreateActionSheet = useCallback(async () => {
    try {
      await createDefaultActionSheet({ title: 'Action Sheet' });
    } catch (error) {
      setActionSheetInlineError(error?.message || 'Unable to create Action Sheet.');
    }
  }, [createDefaultActionSheet]);
  const handleCreateDraftActionSheet = useCallback(
    async (draft) => {
      if (!draft?.id) {
        throw new Error('Draft unavailable.');
      }
      const summary = hilMemo.summarizeBody ? hilMemo.summarizeBody(draft) : 'Draft';
      const title = `Draft: ${summary}`.slice(0, 64);
      return createDefaultActionSheet({ title });
    },
    [createDefaultActionSheet, hilMemo.summarizeBody]
  );
  const handleSaveActionSheet = useCallback(
    async (id, payload) => {
      if (!id) {
        return;
      }
      await updateActionSheetStatus(id, {
        title: payload.title,
        conditional: payload.conditional,
      });
      await updateActionSheetPlan(id, payload.plan);
      await updateActionSheetPrompt(id, payload.prompt);
      await updateActionSheetChecks(id, payload.checks);
    },
    [updateActionSheetChecks, updateActionSheetPlan, updateActionSheetPrompt, updateActionSheetStatus]
  );
  const handleDispatchActionSheet = useCallback(
    async (id, sessionId) => {
      if (!id) {
        return;
      }
      if (!sessionId) {
        setActionSheetInlineError('Select a session before dispatching an Action Sheet.');
        return;
      }
      setActionSheetInlineError('');
      setActionSheetSessionId(sessionId);
      await dispatchActionSheet({ id, sessionId });
    },
    [dispatchActionSheet]
  );
  const handleRunDraftInActiveSession = useCallback(
    async (draft) => {
      if (!draft?.id) {
        return;
      }
      if (!activeSessionId) {
        setActionSheetInlineError('Select a session before running a draft.');
        return;
      }
      if (!hilWorktreePath) {
        setActionSheetInlineError('Select a project before running a draft.');
        return;
      }
      const actionSheetsPath = actionSheetsRoot || hilWorktreePath;
      if (!actionSheetsPath) {
        setActionSheetInlineError('Select a project before running a draft.');
        return;
      }
      try {
        let actionSheetId = draft.meta?.actionSheetId || '';
        if (actionSheetId && agencyReadActionSheet) {
          try {
            const sheet = await agencyReadActionSheet({
              worktreePath: actionSheetsPath,
              id: actionSheetId,
            });
            if (!sheet) {
              actionSheetId = '';
            }
          } catch (error) {
            actionSheetId = '';
          }
        }
        if (!actionSheetId) {
          const created = await handleCreateDraftActionSheet(draft);
          actionSheetId = created?.id || '';
          if (!actionSheetId) {
            throw new Error('Unable to create Action Sheet.');
          }
          const updated = await agencyUpdateHilItem({
            worktreePath: hilWorktreePath,
            itemId: draft.id,
            patch: {
              meta: {
                ...(draft.meta || {}),
                actionSheetId,
              },
            },
          });
          if (!updated) {
            throw new Error('HIL IPC unavailable.');
          }
          await hilMemo.refresh?.();
        }
        setActionSheetInlineError('');
        await handleDispatchActionSheet(actionSheetId, activeSessionId);
      } catch (error) {
        setActionSheetInlineError(error?.message || 'Failed to dispatch draft Action Sheet.');
      }
    },
    [
      activeSessionId,
      actionSheetsRoot,
      agencyReadActionSheet,
      handleCreateDraftActionSheet,
      handleDispatchActionSheet,
      hilMemo.refresh,
      hilWorktreePath,
    ]
  );
  const handleDispatchExplorerFeed = useCallback(
    async ({ description, context, sessionId, mode, references }) => {
      if (!actionSheetsRoot) {
        setActionSheetInlineError('Select a project before dispatching feed.');
        return null;
      }
      const trimmedDescription = String(description || '').trim();
      if (!trimmedDescription) {
        return null;
      }
      if (!sessionId) {
        setActionSheetInlineError('Select a session before dispatching feed.');
        return null;
      }
      const normalizedMode = normalizeDeliveryMode(mode);
      const requestedAt = new Date().toISOString();
      const normalizedReferences = Array.from(
        new Set(
          (Array.isArray(references) ? references : [])
            .map((entry) => String(entry || '').trim())
            .filter(Boolean)
        )
      ).map((targetPath) => ({
        system: 'explorer',
        path: targetPath,
        line: null,
        kind: 'file',
      }));
      const promptText = buildExplorerDeliveryPromptText({
        description: trimmedDescription,
        context: String(context || ''),
        mode: normalizedMode,
        requestedAt,
        sessionId,
        references: normalizedReferences,
      });
      const title = `Feed: ${trimmedDescription.slice(0, 32)}`;
      const seedMeta = buildDeliveryMeta({
        source: 'explorer',
        mode: normalizedMode,
        status: 'queued',
        requestedAt,
        sessionId,
        cellId: selectedCell?.id || '',
        actionSheetId: normalizedMode === 'gated' ? '(pending)' : '',
        references: normalizedReferences,
        existingMeta: {
          sourceKind: 'explorer',
          feedDescription: trimmedDescription,
          feedContext: String(context || ''),
          promoted: normalizedMode === 'quick',
        },
        timelineLabel:
          normalizedMode === 'gated' ? 'Queued gated explorer send' : 'Queued quick explorer send',
      });
      try {
        let createdSheet: any = null;
        if (normalizedMode === 'gated') {
          createdSheet = await createActionSheet({
            title,
            prompt: {
              requirements: trimmedDescription,
              context: promptText,
              checks: '',
              done: '',
            },
            checks: [],
            conditional: conditionalDefaults,
          });
          if (!createdSheet?.id) {
            throw new Error('Unable to create Action Sheet.');
          }
          const completion = buildActionSheetCompletion(createdSheet.id);
          await updateActionSheetPlan(
            createdSheet.id,
            buildActionSheetPlan({ title, marker: completion.marker })
          );
          await updateActionSheetPrompt(createdSheet.id, {
            requirements: trimmedDescription,
            context: promptText,
            checks: '',
            done: completion.done,
          });
          await updateActionSheetChecks(createdSheet.id, completion.checks);
        }

        const draft = await agencyCreateHilItem({
          worktreePath: hilWorktreePath,
          kind: 'draft',
          body: trimmedDescription,
          references: normalizedReferences,
          meta: {
            ...seedMeta,
            actionSheetId: createdSheet?.id || '',
          },
        });
        if (!draft?.id) {
          throw new Error('Unable to create delivery draft.');
        }

        if (normalizedMode === 'gated') {
          setActionSheetSessionId(sessionId);
          await dispatchActionSheet({ id: createdSheet.id, sessionId });
        } else {
          await dispatchSessionCommand({
            command: promptText,
            kind: 'dispatch',
            label: `Explorer (quick): ${trimmedDescription.slice(0, 32)}`,
            sessionId,
            cellId: selectedCell?.id || '',
            profileId: BASELINE_PROFILE_ID,
            worktreePath: hilWorktreePath,
            appendEnter: true,
            doubleEnter: true,
          });
        }

        const dispatchedAt = new Date().toISOString();
        const runningMeta = setDeliveryExecutionStatus({
          meta: draft.meta || seedMeta,
          source: 'explorer',
          mode: normalizedMode,
          status: 'running',
          at: dispatchedAt,
          label:
            normalizedMode === 'gated'
              ? 'Gated explorer send dispatched'
              : 'Quick explorer send dispatched',
          sessionId,
          actionSheetId: createdSheet?.id || '',
        });
        const runningDraft = await agencyUpdateHilItem({
          worktreePath: hilWorktreePath,
          itemId: draft.id,
          patch: { meta: runningMeta },
        });
        const nextDraft = runningDraft || draft;

        if (normalizedMode === 'quick') {
          const acknowledgedAt = new Date().toISOString();
          const completedMeta = setDeliveryExecutionStatus({
            meta: nextDraft.meta || runningMeta,
            source: 'explorer',
            mode: normalizedMode,
            status: 'complete',
            at: acknowledgedAt,
            label: 'Quick explorer send acknowledged',
            details: 'Explorer selection was consumed immediately after dispatch ACK.',
            sessionId,
            actionSheetId: createdSheet?.id || '',
          });
          completedMeta.executionAcknowledgedAt = acknowledgedAt;
          const completedDraft = await agencyUpdateHilItem({
            worktreePath: hilWorktreePath,
            itemId: draft.id,
            patch: { meta: completedMeta },
          });
          setExplorerDeliverySummary({
            source: 'explorer',
            mode: normalizedMode,
            status: 'complete',
            draftId: completedDraft?.id || draft.id,
            actionSheetId: createdSheet?.id || '',
            sessionId,
            updatedAt: acknowledgedAt,
            title,
            description: trimmedDescription,
            references: normalizedReferences,
          });
          setActionSheetInlineError('');
          return {
            source: 'explorer',
            mode: normalizedMode,
            status: 'complete',
            draftId: completedDraft?.id || draft.id,
            actionSheetId: createdSheet?.id || '',
            consumed: true,
          };
        }

        setExplorerDeliverySummary({
          source: 'explorer',
          mode: normalizedMode,
          status: 'running',
          draftId: nextDraft?.id || draft.id,
          actionSheetId: createdSheet?.id || '',
          sessionId,
          updatedAt: dispatchedAt,
          title,
          description: trimmedDescription,
          references: normalizedReferences,
        });
        setActionSheetInlineError('');
        return {
          source: 'explorer',
          mode: normalizedMode,
          status: 'running',
          draftId: nextDraft?.id || draft.id,
          actionSheetId: createdSheet?.id || '',
          consumed: false,
        };
      } catch (error) {
        const message =
          error?.message ||
          (normalizedMode === 'gated'
            ? 'Failed to dispatch gated explorer feed.'
            : 'Failed to dispatch quick explorer feed.');
        setActionSheetInlineError(message);
        setExplorerDeliverySummary((current) => ({
          ...(current || {}),
          source: 'explorer',
          mode: normalizedMode,
          status: 'failed',
          sessionId: sessionId || current?.sessionId || '',
          updatedAt: new Date().toISOString(),
          error: message,
        }));
        throw error;
      }
    },
    [
      actionSheetsRoot,
      agencyCreateHilItem,
      agencyUpdateHilItem,
      conditionalDefaults,
      createActionSheet,
      dispatchActionSheet,
      dispatchSessionCommand,
      hilWorktreePath,
      selectedCell?.id,
      updateActionSheetChecks,
      updateActionSheetPlan,
      updateActionSheetPrompt,
    ]
  );
  const handleViewActionSheetSession = useCallback(
    (sessionId) => {
      if (!sessionId) {
        return;
      }
      setActionSheetSessionId(sessionId);
      setActiveView('agent-cells');
      handleOpenTerminal();
      selectSession(sessionId);
    },
    [handleOpenTerminal, selectSession]
  );
  const handleArchiveActionSheet = useCallback(
    async (id) => {
      if (!id) {
        return;
      }
      setActionSheetInlineError('');
      try {
        await archiveActionSheet(id);
      } catch (error) {
        setActionSheetInlineError(error?.message || 'Failed to archive Action Sheet.');
      }
    },
    [archiveActionSheet]
  );
  const handleDeleteActionSheet = useCallback(
    async (id) => {
      if (!id) {
        return;
      }
      setActionSheetInlineError('');
      try {
        await deleteActionSheet(id);
      } catch (error) {
        setActionSheetInlineError(error?.message || 'Failed to delete Action Sheet.');
      }
    },
    [deleteActionSheet]
  );
  const handleOpenActionSheets = useCallback(
    (sheetId) => {
      if (sheetId) {
        setActionSheetId(sheetId);
      }
      setActiveView('action-sheets');
    },
    []
  );


  const LINE_BREAK = String.fromCharCode(10);
  const PARAGRAPH_BREAK = `${LINE_BREAK}${LINE_BREAK}`;

  const createTemplatedActionSheet = useCallback(
    async ({ title, prompt, checks }) => {
      const resolvedTitle = String(title || '').trim() || 'Action Sheet';
      const created = await createActionSheet({
        title: resolvedTitle,
        prompt: { requirements: '', context: '', checks: '', done: '' },
        checks: [],
        conditional: conditionalDefaults,
      });
      if (!created?.id) {
        throw new Error('Unable to create Action Sheet.');
      }
      const completion = buildActionSheetCompletion(created.id);
      await updateActionSheetPlan(
        created.id,
        buildActionSheetPlan({ title: resolvedTitle, marker: completion.marker })
      );
      const doneBlock = [String(prompt?.done || '').trim(), completion.done]
        .filter(Boolean)
        .join(PARAGRAPH_BREAK);
      await updateActionSheetPrompt(created.id, {
        requirements: String(prompt?.requirements || ''),
        context: String(prompt?.context || ''),
        checks: String(prompt?.checks || ''),
        done: doneBlock,
      });
      const mergedChecks = [...(Array.isArray(checks) ? checks : []), ...completion.checks];
      await updateActionSheetChecks(created.id, mergedChecks);
      return created;
    },
    [
      PARAGRAPH_BREAK,
      conditionalDefaults,
      createActionSheet,
      updateActionSheetChecks,
      updateActionSheetPlan,
      updateActionSheetPrompt,
    ]
  );

  const createTurnGateCreateSheetForCell = useCallback(
    async ({ cell, stage }) => {
      if (!cell?.worktreePath) {
        throw new Error('Cell worktree path is required.');
      }
      const worktreeName = String(cell.worktreePath).split('/').filter(Boolean).pop() || '';
      const resolvedAgentGatesPath = `${cell.worktreePath}/.agency/gates-${worktreeName}.yaml`;
      const resolvedStage = String(stage || '').trim() || 'active';
      const title = `Turn Gate Create: ${cell.name || cell.id}`;
      const prompt = {
        requirements: [
          'Define what "done" means for this Turn and ensure gates/checks exist before development.',
          '',
          'Gate Create (before development):',
          '- Confirm contract artifacts exist (OpenSpec change or a design note).',
          '- Define/adjust gates (Global -> Project -> Agent) so exit criteria is measurable.',
          '- Ensure checks are executable and reflect the desired exit criteria.',
        ].join(LINE_BREAK),
        context: [
          `Cell: ${cell.name || cell.id}`,
          `Branch: ${cell.branch || ''}`,
          `Worktree: ${cell.worktreePath}`,
          `Target stage: ${resolvedStage}`,
          '',
          'Key paths:',
          projectGatesPath ? `- Project gates: ${projectGatesPath}` : null,
          resolvedAgentGatesPath ? `- Agent gates: ${resolvedAgentGatesPath}` : null,
          '',
          'Reference:',
          '- docs/notes-gate-turn-workflow.md',
        ]
          .filter(Boolean)
          .join(LINE_BREAK),
        checks: [
          'Suggested checks to consider adding (choose what applies):',
          '- openspec validate <change-id> --strict',
          '- pnpm -C apps/editor run typecheck:renderer',
          '- pnpm -C apps/editor run typecheck:electron',
          '- pnpm -C apps/editor exec playwright test',
        ].join(LINE_BREAK),
        done: [
          'Before starting development:',
          '- Make sure gates/checks match the Turn exit criteria.',
          '- Make sure the plan/checklist is actionable.',
        ].join(LINE_BREAK),
      };
      return createTemplatedActionSheet({ title, prompt, checks: [] });
    },
    [LINE_BREAK, createTemplatedActionSheet, projectGatesPath]
  );

  const handleTurnGateCreateSheet = useCallback(
    async (stage) => {
      if (!selectedCell?.worktreePath) {
        modal?.notify?.({
          title: 'Turn Gate Create unavailable',
          description: 'Select a Cell before creating a Turn gate sheet.',
          tone: 'warning',
        });
        return;
      }
      try {
        const created = await createTurnGateCreateSheetForCell({ cell: selectedCell, stage });
        handleOpenActionSheets(created.id);
      } catch (error) {
        modal?.notify?.({
          title: 'Failed to create Turn Gate sheet',
          description: error?.message || String(error),
          tone: 'danger',
        });
      }
    },
    [createTurnGateCreateSheetForCell, handleOpenActionSheets, modal, selectedCell]
  );

  const handleTurnGateExecuteSheet = useCallback(
    async (stage) => {
      if (!selectedCell?.worktreePath) {
        modal?.notify?.({
          title: 'Turn Gate Execute unavailable',
          description: 'Select a Cell before creating a Turn gate execution sheet.',
          tone: 'warning',
        });
        return;
      }
      const resolvedStage = String(stage || '').trim() || 'active';
      try {
        const resolved = await agencyGetGates({
          scope: 'resolved',
          worktreePath: selectedCell.worktreePath,
        });
        const gates = Array.isArray(resolved?.[resolvedStage]) ? resolved[resolvedStage] : [];
        const checks = gates
          .map((gate) => {
            const commands = (Array.isArray(gate?.commands) ? gate.commands : [])
              .map((command) => String(command || '').trim())
              .filter((command) => command && !command.startsWith('#'));
            if (!gate?.id || commands.length === 0) {
              return null;
            }
            return {
              id: gate.id,
              label: gate.label || gate.id,
              commands,
            };
          })
          .filter(Boolean);

        const checkSummary = checks.length
          ? ['This sheet mirrors lifecycle gates:', '', ...checks.map((check) => `- ${check.label}`)].join(
              LINE_BREAK
            )
          : 'No gates with commands were found for this stage. Add gates first (Hierarchy -> Gates).';

        const title = `Turn Gate Execute (${resolvedStage}): ${selectedCell.name || selectedCell.id}`;
        const prompt = {
          requirements: [
            'Execute this Turn gate set and fix failures until the worktree is merge-ready.',
            '',
            'Gate Execute (after development):',
            '- Run the checks (mirrors lifecycle gates for the selected stage).',
            '- Fix failures until all checks pass.',
            '- Then proceed to merge / archive / lifecycle transition as needed.',
          ].join(LINE_BREAK),
          context: [
            `Cell: ${selectedCell.name || selectedCell.id}`,
            `Branch: ${selectedCell.branch || ''}`,
            `Worktree: ${selectedCell.worktreePath}`,
            `Stage: ${resolvedStage}`,
            '',
            'Key paths:',
            projectGatesPath ? `- Project gates: ${projectGatesPath}` : null,
            agentGatesPath ? `- Agent gates: ${agentGatesPath}` : null,
            '',
            'Reference:',
            '- docs/notes-gate-turn-workflow.md',
          ]
            .filter(Boolean)
            .join(LINE_BREAK),
          checks: checkSummary,
          done: [
            'After all checks pass:',
            '- Merge the branch/worktree changes.',
            '- Archive the OpenSpec change if applicable.',
          ].join(LINE_BREAK),
        };

        const created = await createTemplatedActionSheet({ title, prompt, checks });
        handleOpenActionSheets(created.id);
      } catch (error) {
        modal?.notify?.({
          title: 'Failed to create Turn Gate execution sheet',
          description: error?.message || String(error),
          tone: 'danger',
        });
      }
    },
    [
      LINE_BREAK,
      agentGatesPath,
      agencyGetGates,
      createTemplatedActionSheet,
      handleOpenActionSheets,
      modal,
      projectGatesPath,
      selectedCell,
    ]
  );

  const bumpHilCommentRefresh = useCallback(() => {
    setHilCommentRefreshToken((value) => value + 1);
  }, []);
  const refreshHilCommentCounts = useCallback(
    async (worktreePath) => {
      if (!worktreePath) {
        setHilCommentCounts({});
        return;
      }
      try {
        const list = await agencyListHilItems({
          worktreePath,
          kind: 'comment',
        });
        const nextCounts = {};
        (Array.isArray(list) ? list : [])
          .filter((item) => item?.kind === 'comment' && item?.status !== 'archived')
          .forEach((item) => {
            const file = item?.anchor?.file;
            if (!file) {
              return;
            }
            nextCounts[file] = (nextCounts[file] || 0) + 1;
          });
        setHilCommentCounts(nextCounts);
      } catch (error) {
        setHilCommentCounts({});
      }
    },
    []
  );
  const loadComments = useCallback(async () => {
    if (!commentRootPath || !commentFilePath || !canComment) {
      setComments([]);
      setCommentsError('');
      setCommentsLoading(false);
      return;
    }
    setCommentsLoading(true);
    setCommentsError('');
    try {
      const list = await agencyListComments({
        worktreePath: commentRootPath,
        filePath: commentFilePath,
      });
      if (!list) {
        setComments([]);
        return;
      }
      setComments(Array.isArray(list) ? list : []);
    } catch (error) {
      setCommentsError(error?.message || 'Failed to load comments.');
    } finally {
      setCommentsLoading(false);
    }
  }, [canComment, commentFilePath, commentRootPath]);
  const commentLines = useMemo(() => {
    if (!comments.length) {
      return [];
    }
    const map = new Map();
    comments.forEach((comment) => {
      const line = Number(comment.line || comment.anchor?.line);
      if (!Number.isFinite(line) || line <= 0) {
        return;
      }
      const entry = map.get(line) || { line, todo: false, count: 0 };
      entry.count += 1;
      if (comment.todo || comment.meta?.todo) {
        entry.todo = true;
      }
      map.set(line, entry);
    });
    return Array.from(map.values());
  }, [comments]);
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
  const openCommentModal = useCallback(
    ({ line, column }: { line?: number; column?: number } = {}) => {
      if (!commentRootPath || !commentFilePath) {
        return;
      }
      const nextLine = Number.isFinite(line) ? line : cursorPosition.line;
      const nextColumn = Number.isFinite(column) ? column : cursorPosition.column;
      setCommentTarget({
        line: Math.max(1, Math.floor(nextLine || 1)),
        column: Math.max(1, Math.floor(nextColumn || 1)),
      });
      setCommentModalOpen(true);
      setCommentMessage('');
      setCommentTodo(false);
      setCommentError('');
      openHilDrawer('comments');
    },
    [commentFilePath, commentRootPath, cursorPosition, openHilDrawer]
  );
  const closeCommentModal = useCallback(() => {
    setCommentModalOpen(false);
    setCommentMessage('');
    setCommentTodo(false);
    setCommentError('');
    setCommentSnippet(null);
    setCommentSnippetLoading(false);
    setCommentSnippetError('');
  }, []);
  const submitComment = useCallback(async () => {
    if (!commentRootPath || !commentFilePath) {
      return;
    }
    if (!commentMessage.trim()) {
      setCommentError('Comment cannot be empty.');
      return;
    }
    setCommentSaving(true);
    setCommentError('');
    try {
      const result = await agencySubmitComment({
        worktreePath: commentRootPath,
        filePath: commentFilePath,
        line: commentTarget.line,
        column: commentTarget.column,
        message: commentMessage.trim(),
        todo: commentTodo,
      });
      if (!result) {
        return;
      }
      await loadComments();
      bumpHilCommentRefresh();
      closeCommentModal();
      openHilDrawer('comments');
    } catch (error) {
      setCommentError(error?.message || 'Failed to submit comment.');
    } finally {
      setCommentSaving(false);
    }
  }, [commentFilePath, commentMessage, commentRootPath, commentTodo, commentTarget, closeCommentModal, loadComments, openHilDrawer, bumpHilCommentRefresh]);
  const updateCommentStatus = useCallback(
    async (comment, status) => {
      if (!comment?.id || !commentRootPath) {
        return;
      }
      const result = await agencyUpdateHilItem({
        worktreePath: commentRootPath,
        itemId: comment.id,
        patch: { status },
      });
      if (!result) {
        return;
      }
      await loadComments();
      bumpHilCommentRefresh();
    },
    [commentRootPath, loadComments, bumpHilCommentRefresh]
  );
  const isDraftComplete = useCallback((draft) => {
    if (!draft) {
      return false;
    }
    if (draft.meta?.promoted !== true) {
      return false;
    }
    if (draft.meta?.executionStatus !== 'complete') {
      return false;
    }
    const todos = Array.isArray(draft.meta?.todos) ? draft.meta.todos : null;
    if (!todos || todos.length === 0) {
      return true;
    }
    return todos.every((todo) => todo?.done === true || todo?.checked === true || todo?.status === 'done');
  }, []);
  const normalizeActionSheetExecution = useCallback((state) => {
    if (state === 'completed') {
      return 'complete';
    }
    if (state === 'waiting_gate') {
      return 'running';
    }
    if (state === 'queued' || state === 'running' || state === 'failed' || state === 'canceled') {
      return state;
    }
    return 'idle';
  }, []);
  useEffect(() => {
    loadComments();
  }, [loadComments]);
  useEffect(() => {
    const worktreePath = selectedCell?.worktreePath || projectRoot || '';
    refreshHilCommentCounts(worktreePath);
  }, [projectRoot, refreshHilCommentCounts, selectedCell?.worktreePath, hilCommentRefreshToken]);
  useEffect(() => {
    if (!commentFilePath) {
      closeCommentModal();
    }
  }, [commentFilePath, closeCommentModal]);
  useEffect(() => {
    if (!commentModalOpen || !commentRootPath || !commentFilePath) {
      setCommentSnippet(null);
      setCommentSnippetLoading(false);
      setCommentSnippetError('');
      return undefined;
    }
    let canceled = false;
    setCommentSnippetLoading(true);
    setCommentSnippetError('');
    agencyGetFileSnippet({
      rootPath: commentRootPath,
      targetPath: commentFilePath,
      line: commentTarget.line,
      context: 3,
    })
      .then((result) => {
        if (canceled) {
          return;
        }
        if (!result) {
          setCommentSnippet(null);
          return;
        }
        setCommentSnippet(result || null);
      })
      .catch((error) => {
        if (canceled) {
          return;
        }
        setCommentSnippet(null);
        setCommentSnippetError(error?.message || 'Failed to load line context.');
      })
      .finally(() => {
        if (canceled) {
          return;
        }
        setCommentSnippetLoading(false);
      });
    return () => {
      canceled = true;
    };
  }, [commentFilePath, commentModalOpen, commentRootPath, commentTarget.line]);
  useEffect(() => {
    if (promoteSessionId) {
      setLastPromoteSessionId(promoteSessionId);
    }
  }, [promoteSessionId]);
  const promoteWorktreePath = selectedCell?.worktreePath || projectRoot || '';
  const openPromoteModal = useCallback(async () => {
    if (!promoteWorktreePath) {
      return;
    }
    setPromoteModalOpen(true);
    setPromoteLoading(true);
    setPromoteError('');
    setPromoteDescription('');
    setPromotePreviewById({});
    setPromoteStep('setup');
    setPromoteDraftId('');
    setPromoteDraft(null);
    setPromoteMode('quick');
    setPromoteGateStatus('waiting');
    setPromoteExecutionStatus('idle');
    setPromoteActionSheetId('');
    setPromoteActionSheet(null);
    try {
      const list = await agencyListHilItems({
        worktreePath: promoteWorktreePath,
        kind: 'all',
      });
      if (!list) {
        setPromoteItems([]);
        setPromoteSelectedIds([]);
        return;
      }
      const pending = (Array.isArray(list) ? list : [])
        .filter((item) => item && (item.kind === 'comment' || item.kind === 'memo' || item.kind === 'reply'))
        .filter((item) => item.meta?.processed !== true)
        .sort((a, b) => {
          const fileA = a.anchor?.file || '';
          const fileB = b.anchor?.file || '';
          if (fileA !== fileB) {
            return fileA.localeCompare(fileB);
          }
          const lineA = Number(a.anchor?.line || 0);
          const lineB = Number(b.anchor?.line || 0);
          if (lineA !== lineB) {
            return lineA - lineB;
          }
          return (a.createdAt || '').localeCompare(b.createdAt || '');
        });
      setPromoteItems(pending);
      setPromoteSelectedIds(pending.map((item) => item.id));
      const availableSessions = sessions.filter((session) => session.status !== 'closed');
      const preferredSession =
        activeView === 'agent-cells'
          ? availableSessions.find((session) => session.id === activeSessionId) ||
            availableSessions.find((session) => session.id === lastPromoteSessionId)
          : availableSessions.find((session) => session.id === lastPromoteSessionId);
      const fallbackSession = preferredSession || availableSessions[0] || null;
      setPromoteSessionId(fallbackSession?.id || '');
    } catch (error) {
      setPromoteError(error?.message || 'Failed to load pending items.');
      setPromoteItems([]);
      setPromoteSelectedIds([]);
    } finally {
      setPromoteLoading(false);
    }
  }, [activeSessionId, activeView, lastPromoteSessionId, promoteWorktreePath, sessions]);
  const closePromoteModal = useCallback(() => {
    setPromoteModalOpen(false);
    setPromoteError('');
    setPromoteItems([]);
    setPromoteSelectedIds([]);
    setPromotePreviewById({});
    setPromoteDescription('');
    setPromoteStep('setup');
    setPromoteDraftId('');
    setPromoteDraft(null);
    setPromoteMode('quick');
    setPromoteGateStatus('waiting');
    setPromoteSessionId('');
    setPromoteExecutionStatus('idle');
    setPromoteActionSheetId('');
    setPromoteActionSheet(null);
  }, []);
  const togglePromoteItem = useCallback((itemId) => {
    if (!itemId) {
      return;
    }
    setPromoteSelectedIds((current) => {
      if (current.includes(itemId)) {
        return current.filter((id) => id !== itemId);
      }
      return [...current, itemId];
    });
  }, []);
  const togglePromoteGroup = useCallback((itemIds) => {
    const ids = Array.isArray(itemIds) ? itemIds.filter(Boolean) : [];
    if (!ids.length) {
      return;
    }
    setPromoteSelectedIds((current) => {
      const selected = new Set(current);
      const allSelected = ids.every((id) => selected.has(id));
      if (allSelected) {
        ids.forEach((id) => selected.delete(id));
      } else {
        ids.forEach((id) => selected.add(id));
      }
      return Array.from(selected);
    });
  }, []);
  const loadPromotePreview = useCallback(
    async (item) => {
      if (!item?.id || !item?.anchor?.file || !promoteWorktreePath) {
        return;
      }
      if (promotePreviewById[item.id]) {
        return;
      }
      try {
        const result = await agencyReadWorkbenchEntry({
          rootPath: promoteWorktreePath,
          targetPath: item.anchor.file,
        });
        if (!result) {
          setPromotePreviewById((current) => ({
            ...current,
            [item.id]: {
              error: 'Unable to load preview.',
            },
          }));
          return;
        }
        const content = result?.content || '';
        const lines = content.split('\n');
        const targetLine = Math.max(1, Number(item.anchor?.line || 1));
        const start = Math.max(1, targetLine - 2);
        const end = Math.min(lines.length || 1, targetLine + 2);
        const snippet = lines.slice(start - 1, end).map((text, index) => ({
          line: start + index,
          text,
        }));
        setPromotePreviewById((current) => ({
          ...current,
          [item.id]: {
            snippet,
            file: item.anchor.file,
            line: targetLine,
          },
        }));
      } catch (error) {
        setPromotePreviewById((current) => ({
          ...current,
          [item.id]: {
            error: error?.message || 'Unable to load preview.',
          },
        }));
      }
    },
    [promotePreviewById, promoteWorktreePath]
  );
  const createPromoteSession = useCallback(async () => {
    if (!promoteWorktreePath) {
      return;
    }
    const created = await createSession({ name: 'Promote' });
    if (created?.id) {
      setPromoteSessionId(created.id);
    }
  }, [createSession, promoteWorktreePath]);
  const dispatchPromote = useCallback(async () => {
    if (!promoteWorktreePath) {
      return;
    }
    if (!promoteDescription.trim()) {
      setPromoteError('Description is required.');
      return;
    }
    const selected = promoteItems.filter((item) => promoteSelectedIds.includes(item.id));
    if (!selected.length) {
      setPromoteError('Select at least one item to promote.');
      return;
    }
    if (!promoteSessionId) {
      setPromoteError('Select a session to dispatch the promote workflow.');
      return;
    }
    setPromoteLoading(true);
    setPromoteError('');
    try {
      const promptBundle = buildPromotePromptBundle({
        description: promoteDescription.trim(),
        items: selected,
        previewById: promotePreviewById,
      });
      const promptText = buildPromotePromptText(promptBundle);
      const actionSheetPrompt = buildPromoteActionSheetPrompt({
        description: promoteDescription.trim(),
        items: selected,
        previewById: promotePreviewById,
      });
      const requestedAt = new Date().toISOString();
      const references = selected.map((item) => ({
        system: 'hil',
        id: item.id,
        path: item.anchor?.file || null,
        line: item.anchor?.line || null,
        kind: item.kind || null,
      }));
      const mode = normalizeDeliveryMode(promoteMode);
      const actionSheetTitle = `Promote: ${promoteDescription.trim().slice(0, 32)}`;
      const dispatchPromptText = [
        '<delivery>',
        'source: promote',
        `mode: ${mode}`,
        `session_id: ${promoteSessionId}`,
        `requested_at: ${requestedAt}`,
        '</delivery>',
        '',
        promptText,
      ].join('\n');

      const seedMeta = buildDeliveryMeta({
        source: 'promote',
        mode,
        status: 'queued',
        requestedAt,
        sessionId: promoteSessionId,
        cellId: selectedCell?.id || '',
        actionSheetId: mode === 'gated' ? '(pending)' : '',
        references,
        existingMeta: {
          sourceKind: 'hil',
          promoteSessionId: promoteSessionId,
          promoted: false,
          promptBundle,
          promptText,
        },
        timelineLabel: mode === 'gated' ? 'Queued gated promote' : 'Queued quick promote',
      });

      let createdSheet: any = null;
      if (mode === 'gated') {
        createdSheet = await createActionSheet({
          title: actionSheetTitle,
          prompt: {
            requirements: actionSheetPrompt.requirements,
            context: actionSheetPrompt.context,
            checks: '',
            done: '',
          },
          checks: [],
          conditional: conditionalDefaults,
        });
        if (!createdSheet?.id) {
          setPromoteError('Unable to create Action Sheet.');
          return;
        }
        const completion = buildActionSheetCompletion(createdSheet.id);
        await updateActionSheetPlan(
          createdSheet.id,
          buildActionSheetPlan({ title: actionSheetTitle, marker: completion.marker })
        );
        await updateActionSheetPrompt(createdSheet.id, {
          requirements: actionSheetPrompt.requirements,
          context: actionSheetPrompt.context,
          checks: '',
          done: completion.done,
        });
        await updateActionSheetChecks(createdSheet.id, completion.checks);
      }

      const draft = await agencyCreateHilItem({
        worktreePath: promoteWorktreePath,
        kind: 'draft',
        body: promoteDescription.trim(),
        references,
        meta: {
          ...seedMeta,
          actionSheetId: createdSheet?.id || '',
        },
      });
      if (!draft) {
        setPromoteError('Unable to create draft.');
        return;
      }

      setPromoteDraftId(draft.id);
      setPromoteDraft(draft);
      setPromoteGateStatus('waiting');
      setPromoteExecutionStatus('queued');
      setPromoteActionSheetId(createdSheet?.id || '');
      setPromoteActionSheet(createdSheet?.status || null);
      setPromoteStep('waiting');

      // Dispatch the run (quick uses direct terminal send; gated uses Action Sheet).
      if (mode === 'gated') {
        await dispatchActionSheet({ id: createdSheet.id, sessionId: promoteSessionId });
      } else {
        await dispatchSessionCommand({
          command: dispatchPromptText,
          kind: 'dispatch',
          label: `Promote (quick): ${promoteDescription.trim().slice(0, 32)}`,
          sessionId: promoteSessionId,
          cellId: selectedCell?.id || '',
          profileId: BASELINE_PROFILE_ID,
          worktreePath: promoteWorktreePath,
          appendEnter: true,
          doubleEnter: true,
        });
      }

      const runningMeta = setDeliveryExecutionStatus({
        meta: draft.meta || seedMeta,
        source: 'promote',
        mode,
        status: 'running',
        at: new Date().toISOString(),
        label: mode === 'gated' ? 'Gated promote dispatched' : 'Quick promote dispatched',
        sessionId: promoteSessionId,
        actionSheetId: createdSheet?.id || '',
      });

      const updatedDraft = await agencyUpdateHilItem({
        worktreePath: promoteWorktreePath,
        itemId: draft.id,
        patch: { meta: runningMeta },
      });

      if (updatedDraft) {
        setPromoteDraft(updatedDraft);
        setPromoteExecutionStatus(updatedDraft.meta?.executionStatus || 'running');
      } else {
        setPromoteExecutionStatus('running');
      }

      // Quick mode consumes sources immediately after dispatch ACK (terminal write), not after completion.
      if (mode === 'quick') {
        const promotedAt = new Date().toISOString();
        await Promise.all(
          selected.map((item) =>
            agencyUpdateHilItem({
              worktreePath: promoteWorktreePath,
              itemId: item.id,
              patch: {
                meta: {
                  processed: true,
                  promotedDraftId: draft.id,
                  promoteSessionId: promoteSessionId || null,
                  promotedAt,
                },
              },
            })
          )
        );
        await loadComments();
        const completedMeta = setDeliveryExecutionStatus({
          meta: updatedDraft?.meta || runningMeta,
          source: 'promote',
          mode,
          status: 'complete',
          at: promotedAt,
          label: 'Quick promote acknowledged',
          details: 'Selected items were consumed immediately after dispatch ACK.',
          sessionId: promoteSessionId,
          actionSheetId: createdSheet?.id || '',
        });
        completedMeta.promoted = true;
        completedMeta.executionAcknowledgedAt = promotedAt;
        const completedDraft = await agencyUpdateHilItem({
          worktreePath: promoteWorktreePath,
          itemId: draft.id,
          patch: { meta: completedMeta },
        });
        if (completedDraft) {
          setPromoteDraft(completedDraft);
        }
        setPromoteExecutionStatus('complete');
        setPromoteGateStatus('ready');
      }
    } catch (error) {
      setPromoteError(error?.message || 'Failed to dispatch promote workflow.');
      setPromoteExecutionStatus('failed');
    } finally {
      setPromoteLoading(false);
    }
  }, [
    promoteDescription,
    promoteMode,
    promoteItems,
    promoteSelectedIds,
    promoteSessionId,
    promoteWorktreePath,
    promotePreviewById,
    selectedCell?.id,
    conditionalDefaults,
    createActionSheet,
    dispatchActionSheet,
    dispatchSessionCommand,
    loadComments,
    updateActionSheetChecks,
    updateActionSheetPlan,
    updateActionSheetPrompt,
  ]);
  const confirmPromote = useCallback(async () => {
    if (!promoteWorktreePath || !promoteDraftId) {
      return;
    }
    const mode = normalizeDeliveryMode(promoteMode);
    if (mode === 'quick') {
      closePromoteModal();
      return;
    }
    if (promoteGateStatus !== 'ready') {
      setPromoteError('Draft completion gate is not ready.');
      return;
    }
    const selected = promoteItems.filter((item) => promoteSelectedIds.includes(item.id));
    if (!selected.length) {
      setPromoteError('Select at least one item to promote.');
      return;
    }
    setPromoteLoading(true);
    setPromoteError('');
    try {
      const promotedAt = new Date().toISOString();
      await Promise.all(
        selected.map((item) =>
          agencyUpdateHilItem({
            worktreePath: promoteWorktreePath,
            itemId: item.id,
            patch: {
              meta: {
                processed: true,
                promotedDraftId: promoteDraftId,
                promoteSessionId: promoteSessionId || null,
                promotedAt,
              },
            },
          })
        )
      );
      await loadComments();
      closePromoteModal();
      openHilDrawer('comments');
    } catch (error) {
      setPromoteError(error?.message || 'Failed to confirm promote.');
    } finally {
      setPromoteLoading(false);
    }
  }, [
    closePromoteModal,
    loadComments,
    openHilDrawer,
    promoteDraftId,
    promoteGateStatus,
    promoteMode,
    promoteItems,
    promoteSelectedIds,
    promoteSessionId,
    promoteWorktreePath,
  ]);
  useEffect(() => {
    if (!promoteModalOpen || promoteStep !== 'waiting' || !promoteDraftId || !promoteWorktreePath) {
      return undefined;
    }
    let canceled = false;
    const poll = async () => {
      try {
        const list = await agencyListHilItems({
          worktreePath: promoteWorktreePath,
          kind: 'draft',
        });
        if (canceled) {
          return;
        }
        const drafts = Array.isArray(list) ? list : [];
        const found = drafts.find((item) => item.id === promoteDraftId);
        if (!found) {
          setPromoteDraft(null);
          setPromoteGateStatus('missing');
          setPromoteExecutionStatus('missing');
          return;
        }
        let nextDraft = found;
        const sheetId = promoteActionSheetId || found.meta?.actionSheetId || '';
        if (sheetId && !promoteActionSheetId) {
          setPromoteActionSheetId(sheetId);
        }
        let actionSheetStatus = null;
        if (sheetId) {
          try {
            const sheet = await agencyReadActionSheet({
              worktreePath: promoteWorktreePath,
              id: sheetId,
            });
            if (sheet?.status) {
              actionSheetStatus = sheet.status;
              setPromoteActionSheet(sheet.status);
            }
          } catch (readError) {
            setPromoteActionSheet(null);
          }
        } else {
          setPromoteActionSheet(null);
        }
        const actionSheetCompleted = actionSheetStatus?.state === 'completed';
        const actionSheetFailed = actionSheetStatus?.state === 'failed';
        if (actionSheetStatus?.gateStatus === 'passed' || actionSheetCompleted) {
          if (nextDraft.meta?.promoted !== true || nextDraft.meta?.executionStatus !== 'complete') {
            const updated = await agencyUpdateHilItem({
              worktreePath: promoteWorktreePath,
              itemId: nextDraft.id,
              patch: {
                meta: {
                  promoted: true,
                  executionStatus: 'complete',
                  executionFinishedAt: new Date().toISOString(),
                },
              },
            });
            if (updated) {
              nextDraft = updated;
            }
          }
        } else if (actionSheetFailed && nextDraft.meta?.executionStatus !== 'failed') {
          const updated = await agencyUpdateHilItem({
            worktreePath: promoteWorktreePath,
            itemId: nextDraft.id,
            patch: {
              meta: {
                executionStatus: 'failed',
              },
            },
          });
          if (updated) {
            nextDraft = updated;
          }
        }
        setPromoteDraft(nextDraft);
        if (actionSheetStatus?.state) {
          setPromoteExecutionStatus(normalizeActionSheetExecution(actionSheetStatus.state));
        } else {
          setPromoteExecutionStatus(nextDraft.meta?.executionStatus || 'waiting');
        }
        const gateReady =
          actionSheetStatus?.gateStatus === 'passed' ||
          actionSheetCompleted ||
          isDraftComplete(nextDraft);
        setPromoteGateStatus(gateReady ? 'ready' : 'waiting');
      } catch (error) {
        if (canceled) {
          return;
        }
        setPromoteGateStatus('waiting');
      }
    };
    poll();
    const interval = setInterval(poll, 3000);
    return () => {
      canceled = true;
      clearInterval(interval);
    };
  }, [
    isDraftComplete,
    normalizeActionSheetExecution,
    promoteActionSheetId,
    promoteDraftId,
    promoteModalOpen,
    promoteStep,
    promoteWorktreePath,
  ]);
  const resetProjectState = useCallback(() => {
    setSelectedId(null);
    setCells([]);
    setInitialActiveSessions({});
    resetSessions();
    workbench.resetTabs();
    setWorkbenchSelectionByCellId({});
    setWorkbenchMetaByCellId({});
    setInitialWorkbenchTabs({});
    setInitialWorkbenchActiveTabs({});
  }, [
    resetSessions,
    workbench,
    setInitialWorkbenchTabs,
    setInitialWorkbenchActiveTabs,
  ]);
  const handleSelectProjectRoot = useCallback(async () => {
    setProjectError('');
    try {
      const result = await agencySelectProjectRoot();
      if (!result) {
        return;
      }
    } catch (error) {
      setProjectError(error?.message || 'Failed to select project.');
    }
  }, []);

  const handleOpenRecentProject = useCallback(
    async (projectPath) => {
      if (!projectPath) {
        return;
      }
      setProjectError('');
      try {
        const result = await agencySetProjectRoot({ projectRoot: projectPath });
        if (!result) {
          return;
        }
      } catch (error) {
        setProjectError(error?.message || 'Failed to open project.');
      }
    },
    []
  );
  useEffect(() => {
    const unsubscribe = subscribeProjectUpdated(async (payload) => {
      if (!payload) {
        return;
      }
      resetProjectState();
      setProjectRoot(payload.projectRoot || '');
      setRecentProjects(Array.isArray(payload.recentProjects) ? payload.recentProjects : []);
      setProjectError('');
      // 移除这里的 setActiveView('explorer')，保留用户当前视图
    });
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [resetProjectState]);
  useEffect(() => {
    const unsubscribe = subscribeRecentProjectsUpdated((payload) => {
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
  }, []);
  useEffect(() => {
    if (!selectedCell?.id) {
      return;
    }
    if (uiStateLoaded) {
      agencySetUiState({
          selectedId: selectedCell.id,
          activeSessionByCellId,
        }).catch(() => undefined);
    }
    setTerminalMode('shell');
    setTerminalOpen(true);
  }, [selectedCell?.id, activeSessionByCellId, uiStateLoaded]);

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
    sidebarCollapsed,
    sidebarWidth,
    uiStateLoaded,
    workbench.activeTabByCellId,
    workbench.tabsByCellId,
  ]);
  const gateDisplayStage = scopedCell?.state === 'archived' ? 'archived' : 'active';
  const gateResultsByStage = scopedCell ? gateResultsByCellId[scopedCell.id] || {} : {};
  const gatesCheckingByStage = scopedCell ? gatesCheckingByCellId[scopedCell.id] || {} : {};
  const handleStateChange = useCallback(
    async (nextState) => {
      if (!scopedCell) {
        return;
      }
      if (nextState === scopedCell.state) {
        return;
      }
      setTransitionError('');
      let nextCells = cells;
      try {
        const result = await agencyListCells({ rootPath: projectRoot });
        if (Array.isArray(result)) {
          nextCells = result;
          setCells(nextCells);
        }
      } catch (error) {
        console.error(error);
      }
      const freshCell = nextCells.find((cell) => cell.id === scopedCell.id) || scopedCell;
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
    [cells, checkGatesForCell, projectRoot, scopedCell]
  );
  const handleUpdateCellAvatar = useCallback(
    async (avatar) => {
      if (!selectedCell) {
        return;
      }
      await agencyUpdateCellMeta({
        id: selectedCell.id,
        worktreePath: selectedCell.worktreePath,
        avatar,
      });
      await loadCells();
    },
    [loadCells, selectedCell]
  );
  const handleCreate = useCallback(
    async ({ name, branch, reusePath, startTurnGateCreate }) => {
      if (!projectReady) {
        setProjectError('Select a project before creating a Cell.');
        return;
      }
      setLoading(true);
      try {
        const cell = await agencyCreateCell({
          name,
          branch,
          reusePath,
          rootPath: projectRoot,
        });
        if (!cell) {
          return;
        }
        setShowCreate(false);
        await loadCells();
        if (cell?.id) {
          setSelectedId(cell.id);
        }
        handleOpenTerminal();

        if (startTurnGateCreate) {
          try {
            const stage = cell?.state === 'archived' ? 'archived' : 'active';
            const created = await createTurnGateCreateSheetForCell({ cell, stage });
            handleOpenActionSheets(created.id);
          } catch (error) {
            modal?.notify?.({
              title: 'Failed to start Turn',
              description: error?.message || 'Unable to create Gate Create sheet for this Cell.',
              tone: 'warning',
            });
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    },
    [createTurnGateCreateSheetForCell, handleOpenActionSheets, handleOpenTerminal, loadCells, modal, projectReady, projectRoot]
  );
  const handleSaveGates = useCallback(async () => {
    await saveGates();
    await loadCells();
  }, [loadCells, saveGates]);
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
  const handleSwitchView = useCallback(
    (view) => {
      setActiveView(view);
      if (sidebarCollapsed) {
        setSidebarCollapsed(false);
      }
    },
    [sidebarCollapsed]
  );
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
  const hilReplyProps = {
    cell: selectedCell,
    session: activeSession,
    worktreePath: selectedCell?.worktreePath || projectRoot || '',
    selection: activeReplySelection,
    focusToken: replyFocusToken,
    resolvedQuickPrompts: resolvedReplyQuickPrompts,
    sessionTargets,
    onClearSelection: handleClearReplySelection,
    onSendSessionText: sendSessionText,
    onJumpToSession: handleJumpToSession,
    onJumpToMemo: handleJumpToReplyMemo,
  };
  const hilCommentsProps = {
    activeFile: activeTab?.path || '',
    cursorPosition,
    worktreePath: selectedCell?.worktreePath || projectRoot || '',
    comments,
    loading: commentsLoading,
    error: commentsError,
    onOpenAnchor: ({ path, line, column }: { path?: string; line?: number; column?: number } = {}) =>
      handleOpenMemoReference({
        path,
        line,
        column,
        sourceSurface: 'memo',
      }),
    onRevealAnchor: ({ path }: { path?: string } = {}) =>
      handleRevealMemoReference({
        path,
        sourceSurface: 'memo',
      }),
    onOpenComment: openCommentModal,
    onUpdateStatus: updateCommentStatus,
    commentModalOpen,
    commentTarget,
    commentMessage,
    commentTodo,
    commentError,
    commentSaving,
    commentSnippet,
    commentSnippetLoading,
    commentSnippetError,
    onCommentMessageChange: setCommentMessage,
    onCommentTodoChange: setCommentTodo,
    onCloseComment: closeCommentModal,
    onSubmitComment: submitComment,
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
    selectedCellId: selectedCell?.id || '',
    onClosePromote: closePromoteModal,
    onPromoteDescriptionChange: setPromoteDescription,
    onTogglePromoteItem: togglePromoteItem,
    onTogglePromoteGroup: togglePromoteGroup,
    onPromotePreview: loadPromotePreview,
    onSelectPromoteSession: setPromoteSessionId,
    onSelectPromoteMode: (mode: DeliveryMode) => setPromoteMode(normalizeDeliveryMode(mode)),
    onCreatePromoteSession: createPromoteSession,
    onDispatchPromote: dispatchPromote,
    onConfirmPromote: confirmPromote,
    onFocusPromoteSession: handleFocusPromoteSession,
    onOpenPromoteTimeline: () =>
      handleOpenDeliveryTimeline({
        draftId: promoteDraftId,
        actionSheetId: promoteActionSheetId,
      }),
    onDispatchActionSheet: handleDispatchActionSheet,
    onCancelActionSheet: cancelActionSheet,
    onArchiveActionSheet: handleArchiveActionSheet,
    onDeleteActionSheet: handleDeleteActionSheet,
    onOpenActionSheets: handleOpenActionSheets,
  };
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
  const handleAppShortcutTriggered = useCallback(
    (payload) => {
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
  const hilDraftsProps = {
    drafts: hilMemo.draftItems,
    summarizeBody: hilMemo.summarizeBody,
    onOpenDraft: handleOpenMemoDraft,
    onViewSession: handleViewActionSheetSession,
    onRunDraft: handleRunDraftInActiveSession,
    actionSheets,
    sessions,
    activeSessionId,
  };
  const memoDrawerProps = {
    activeInboxId: hilMemo.activeInboxSection?.id || 'comments',
    onSelectInbox: handleOpenMemoInbox,
    onOpenInbox: () => handleOpenMemoInbox('comments'),
    onFocusInboxInput: handleFocusInboxInput,
    flashValue: memoCapture.flashText,
    onFlashChange: memoCapture.onFlashChange,
    onSaveFlash: memoCapture.handleCreateFlash,
    flashVoice: memoCapture.flashVoice,
    flashVoiceSegments: memoCapture.flashVoiceSegments,
    flashVoiceShortcut: memoVoiceShortcut,
    excerptUrl: memoCapture.excerptUrl,
    onExcerptUrlChange: memoCapture.setExcerptUrl,
    onFetchExcerpt: memoCapture.handleFetchExcerpt,
    excerptPreview: memoCapture.excerptPreview,
    excerptFetching: memoCapture.excerptFetching,
    excerptNote: memoCapture.excerptNote,
    onExcerptNoteChange: memoCapture.setExcerptNote,
    onSaveExcerpt: memoCapture.handleCreateExcerpt,
    screenshotAsset: memoCapture.screenshotAsset,
    pendingCapture: memoCapture.captureResult,
    screenshotNote: memoCapture.screenshotNote,
    onScreenshotNoteChange: memoCapture.setScreenshotNote,
    onCaptureScreenshot: memoCapture.handleCaptureScreenshot,
    onOpenRouting: memoCapture.handleOpenRouting,
    captureLoading: memoCapture.captureLoading,
    screenshotShortcut,
  };
  const handleOpenExplorerForCell = useCallback(
    (cellId) => {
      if (cellId) {
        setSelectedId(cellId);
      }
      handleSwitchView('explorer');
    },
    [handleSwitchView]
  );
  const handleOpenCreateCellModal = useCallback(() => {
    if (!projectReady) {
      handleSelectProjectRoot();
      return;
    }

    const modalId = `create-cell-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 6)}`;
    modal.openModal({
      id: modalId,
      title: 'Create New Agent Cell',
      showActions: false,
      showVariantLabel: false,
      dismissOnOverlay: true,
      content: (
        <CreateCellModal
          onClose={() => modal.closeModal(modalId, false)}
          onCreate={async (payload) => {
            await handleCreate(payload);
            modal.closeModal(modalId, true);
          }}
        />
      ),
    });
  }, [handleCreate, handleSelectProjectRoot, modal, projectReady]);

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
  const handleHierarchyJump = useCallback(
    (target) => {
      setHierarchySection(target);
      setActiveView('hierarchy');
      if (target === 'actions') {
        clearTerminusError();
      }
      if (target === 'app-shortcuts') {
        clearAppShortcutsError();
      }
      if (target === 'reply-quick-prompts') {
        clearReplyQuickPromptsError();
      }
      if (target === 'gates') {
        clearGatesError();
      }
      if (target === 'session-naming') {
        clearSessionNamingError();
      }
      if (target === 'softlinks') {
        clearWorktreeLinksError();
      }
    },
    [
      clearAppShortcutsError,
      clearGatesError,
      clearReplyQuickPromptsError,
      clearSessionNamingError,
      clearTerminusError,
      clearWorktreeLinksError,
    ]
  );
  const handleSelectActionsScope = useCallback(
    (scope) => {
      setHierarchySection('actions');
      setActionsScope(scope);
      clearTerminusError();
    },
    [clearTerminusError]
  );
  const handleConfigureProfile = useCallback(
    (profile) => {
      if (!profile) return;
      setHierarchySection('actions');
      setActiveView('hierarchy');
      if (sidebarCollapsed) {
        setSidebarCollapsed(false);
      }
      const targetScope = profile.sourceScope || 'global';
      setActionsScope(targetScope);
      clearTerminusError();
    },
    [sidebarCollapsed, clearTerminusError]
  );
  const handleSelectAppShortcutsScope = useCallback(
    (scope) => {
      setHierarchySection('app-shortcuts');
      setAppShortcutsScope(scope);
      clearAppShortcutsError();
    },
    [clearAppShortcutsError]
  );
  const handleSelectReplyQuickPromptsScope = useCallback(
    (scope) => {
      setHierarchySection('reply-quick-prompts');
      setReplyQuickPromptsScope(scope);
      clearReplyQuickPromptsError();
    },
    [clearReplyQuickPromptsError]
  );
  const handleSelectGateScope = useCallback(
    (scope) => {
      setHierarchySection('gates');
      setGateScope(scope);
      clearGatesError();
    },
    [clearGatesError]
  );
  const handleSelectSessionNamingScope = useCallback(
    (scope) => {
      setHierarchySection('session-naming');
      setSessionNamingScope(scope);
      clearSessionNamingError();
    },
    [clearSessionNamingError]
  );
  const handleSelectHierarchySection = useCallback(
    (section) => {
      setHierarchySection(section);
      if (section === 'softlinks') {
        clearWorktreeLinksError();
      }
      if (section === 'session-naming') {
        clearSessionNamingError();
      }
      if (section === 'reply-quick-prompts') {
        clearReplyQuickPromptsError();
      }
    },
    [clearReplyQuickPromptsError, clearSessionNamingError, clearWorktreeLinksError]
  );

  const handleToggleSidebar = useCallback(() => {
    setSidebarCollapsed((value) => !value);
  }, []);

  const appLayoutActionSheetsProps = {
    projectReady,
    projectError,
    onSelectProject: handleSelectProjectRoot,
    sheets: actionSheets,
    selectedSheet: actionSheetDetail,
    selectedId: actionSheetId,
    onSelectSheet: setActionSheetId,
    onCreateSheet: handleCreateActionSheet,
    onSaveSheet: handleSaveActionSheet,
    onUpdateChecks: updateActionSheetChecks,
    onRefreshList: refreshActionSheets,
    showArchived: showArchivedActionSheets,
    onToggleArchived: () => setShowArchivedActionSheets((value) => !value),
    onRefreshChecks: refreshActionSheetChecks,
    onDispatchSheet: handleDispatchActionSheet,
    onCancelSheet: cancelActionSheet,
    onArchiveSheet: handleArchiveActionSheet,
    onDeleteSheet: handleDeleteActionSheet,
    onViewSession: handleViewActionSheetSession,
    sessions: availableActionSessions,
    sessionId: actionSheetSessionId,
    onSelectSession: setActionSheetSessionId,
    loading: actionSheetsLoading,
    detailLoading: actionSheetDetailLoading,
    error: actionSheetInlineError || actionSheetsError,
  };

  const appLayoutExplorerSidebarProps = {
    rootPath: explorerRootPath,
    rootLabel: explorerRootLabel,
    cells: projectReady ? cells : [],
    selectedId,
    onSelectCell: setSelectedId,
    selectedCell,
    sessions,
    activeSessionId,
    sessionActivityByKey,
    onJumpToAgents: () => handleSwitchView('agent-cells'),
    workbenchMeta: explorerMeta,
    onDispatchFeed: handleDispatchExplorerFeed,
    explorerDeliverySummary,
    onOpenDeliveryTimeline: handleOpenExplorerDeliveryTimeline,
    onToggleSessionMap: handleToggleSessionMap,
    sessionMapOpen,
    revealRequest: pendingExplorerReveal,
    onRevealHandled: () => setPendingExplorerReveal(null),
    onOpenFile: ({ path, mode }) => {
      workbench.openFile({
        path,
        mode,
        rootPath: explorerRootPath,
        cellId: selectedCell?.id || undefined,
      });
    },
    onAddComment: handleAddCommentFromExplorer,
    commentCountsByPath: hilCommentCounts,
    onJumpToComments: handleJumpToComments,
  };

  const appLayoutExplorerPaneProps = {
    workbench,
    activeRootPath: explorerRootPath,
    activeRootLabel: explorerRootLabel,
    projectReady,
    projectError,
    onSelectProject: handleSelectProjectRoot,
    cellId: selectedCell?.id || 'repo',
    onTabMetaChange: handleWorkbenchMetaChange,
    commentLines,
    onOpenComment: openCommentModal,
    onCursorPositionChange: setCursorPosition,
    onSelectionChange: handleWorkbenchSelectionChange,
    pendingJump: pendingWorkbenchJump,
    onJumpHandled: () => setPendingWorkbenchJump(null),
    onRevealPathInExplorer: handleRevealPathInExplorerFromWorkbench,
  };

  const appLayoutMemoPaneProps = {
    ...hilMemo,
    ...memoCapture,
    flashVoiceShortcut: memoVoiceShortcut,
    screenshotShortcut,
    worktreePath: selectedCell?.worktreePath || projectRoot || '',
    projectReady,
    projectError,
    onSelectProject: handleSelectProjectRoot,
    onOpenReference: ({
      path,
      line,
      column,
    }: {
      path?: string;
      line?: number;
      column?: number;
    } = {}) =>
      handleOpenMemoReference({
        path,
        line,
        column,
        sourceSurface: 'memo',
      }),
    onRevealReference: ({ path }: { path?: string } = {}) =>
      handleRevealMemoReference({
        path,
        sourceSurface: 'memo',
      }),
    sessions,
    onViewSession: handleViewActionSheetSession,
    actionSheets,
    onDispatchActionSheet: handleDispatchActionSheet,
    onCancelActionSheet: cancelActionSheet,
    onArchiveActionSheet: handleArchiveActionSheet,
    onDeleteActionSheet: handleDeleteActionSheet,
    onOpenActionSheets: handleOpenActionSheets,
    onCreateActionSheet: handleCreateDraftActionSheet,
    focusInboxInputId: memoFocusTarget,
    onFocusInboxInputHandled: handleFocusInboxInputHandled,
  };

  const appLayoutMemoSidebarProps = {
    ...hilMemo,
    projectReady,
  };

  return (
    <div className="relative flex h-screen flex-col bg-background text-foreground overflow-hidden">
        <AppLayout
          activeView={activeView}
          onSwitchView={handleSwitchView}
          hierarchySection={hierarchySection}
          onSelectHierarchySection={handleSelectHierarchySection}
          cells={displayCells}
          selectedId={selectedId}
          selectedCell={selectedCell}
          onSelectCell={setSelectedId}
          onCreateCell={handleOpenCreateCellModal}
          onJumpToHierarchy={handleHierarchyJump}
          onOpenExplorerForCell={handleOpenExplorerForCell}
          onOpenAgentCellFileReference={handleOpenAgentCellFileReference}
          onRevealAgentCellFileReference={handleRevealAgentCellFileReference}
          onImportAgentCellFileReferences={handleImportAgentCellFileReferences}
          sessionsByCellId={sessionsByCellId}
          activeSessionByCellId={activeSessionByCellId}
          sessionActivityByKey={sessionActivityByKey}
          terminusProfiles={terminusProfiles}
          onSelectSession={handleSelectSessionFromSidebar}
          onCreateSession={createSessionForCell}
          onDispatchSessionCommand={dispatchSessionCommand}
          onCloseSession={closeSession}
          onDetachSession={detachSession}
          onRenameSession={renameSession}
          onUpdateSessionAvatar={updateSessionAvatar}
          projectReady={projectReady}
          projectError={projectError}
          projectRoot={projectRoot}
          recentProjects={recentProjects}
          tmuxStatus={tmuxStatus}
          onSelectProject={handleSelectProjectRoot}
          onOpenRecentProject={handleOpenRecentProject}
          onOpenActions={() => handleHierarchyJump('actions')}
          onOpenAppShortcuts={() => handleHierarchyJump('app-shortcuts')}
          onOpenReplyQuickPrompts={() => handleHierarchyJump('reply-quick-prompts')}
          onOpenGates={() => handleHierarchyJump('gates')}
          onOpenSoftlinks={() => handleHierarchyJump('softlinks')}
          actionsScope={actionsScope}
          onSelectActionsScope={handleSelectActionsScope}
          onConfigureProfile={handleConfigureProfile}
          appShortcutsScope={appShortcutsScope}
          onSelectAppShortcutsScope={handleSelectAppShortcutsScope}
          replyQuickPromptsScope={replyQuickPromptsScope}
          onSelectReplyQuickPromptsScope={handleSelectReplyQuickPromptsScope}
          sessionNamingScope={sessionNamingScope}
          onSelectSessionNamingScope={handleSelectSessionNamingScope}
          actionsScopeDisabled={terminusScopeDisabled}
          actionSummary={terminusSummary}
          appShortcutsScopeDisabled={appShortcutsScopeDisabled}
          appShortcutsSummary={appShortcutsSummary}
          replyQuickPromptsScopeDisabled={replyQuickPromptsScopeDisabled}
          replyQuickPromptsSummary={replyQuickPromptsSummary}
          appShortcutRows={appShortcutRows}
          replyQuickPromptsRows={replyQuickPromptsRows}
          resolvedReplyQuickPrompts={resolvedReplyQuickPrompts}
          replyQuickPromptsPaths={replyQuickPromptsPaths}
          replyQuickPromptsError={replyQuickPromptsError}
          replyQuickPromptsSaving={replyQuickPromptsSaving}
          replyQuickPromptsDirty={replyQuickPromptsDirty}
          onAddReplyQuickPrompt={addReplyQuickPrompt}
          onUpdateReplyQuickPrompt={updateReplyQuickPrompt}
          onRemoveReplyQuickPrompt={removeReplyQuickPrompt}
          onSaveReplyQuickPrompts={saveReplyQuickPrompts}
          onClearReplyQuickPromptsError={clearReplyQuickPromptsError}
          appShortcutsPaths={appShortcutsPaths}
          appShortcutsError={appShortcutsError}
          appShortcutsSaving={appShortcutsSaving}
          appShortcutsDirty={appShortcutsDirty}
          onUpdateAppShortcut={updateAppShortcut}
          onOverrideAppShortcut={overrideAppShortcut}
          onResetAppShortcut={resetAppShortcut}
          onSaveAppShortcuts={saveAppShortcuts}
          onClearAppShortcutsError={clearAppShortcutsError}
          sessionNamingScopeDisabled={sessionNamingScopeDisabled}
          sessionNamingSummary={sessionNamingSummary}
          sessionNamingSettings={sessionNamingSettings}
          resolvedSessionNaming={resolvedSessionNaming}
          sessionNamingPaths={sessionNamingPaths}
          sessionNamingError={sessionNamingError}
          sessionNamingSaving={sessionNamingSaving}
          sessionNamingDirty={sessionNamingDirty}
          sessionNamingPreviewContext={sessionNamingPreviewContext}
          onUpdateSessionNamingRule={updateSessionNamingRule}
          onUpdateSessionNamingList={updateSessionNamingList}
          onRenameSessionNamingList={renameSessionNamingList}
          onRemoveSessionNamingList={removeSessionNamingList}
          onAddSessionNamingList={addSessionNamingList}
          onSaveSessionNaming={saveSessionNamingSettings}
          onClearSessionNamingError={clearSessionNamingError}
          actionsRows={profileRows}
          activeProfileId={activeProfileId}
          projectActionsPath={projectSettingsPath}
          agentActionsPath={agentSettingsPath}
          quickActionsError={terminusError}
          quickActionsSaving={terminusSaving}
          quickActionsDirty={terminusDirty}
          onAddAction={addProfile}
          onRemoveAction={removeProfile}
          onOverrideAction={overrideProfile}
          onResetAction={resetProfile}
          onUpdateAction={updateProfile}
          onSaveActions={saveTerminusSettings}
          bindingsByProfile={bindingRowsByProfile}
          onAddBinding={addBinding}
          onRemoveBinding={removeBinding}
          onOverrideBinding={overrideBinding}
          onResetBinding={resetBinding}
          onUpdateBinding={updateBinding}
          onClearTerminusError={clearTerminusError}
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
          repoRoot={resolvedRepoRoot}
          canUseProjectScope={canUseScopedConfig}
          canUseAgentScope={canUseScopedConfig}
          editorPaneProps={editorPaneProps}
          sidebarWidth={sidebarWidth}
          sidebarCollapsed={sidebarCollapsed}
          onResizeSidebar={setSidebarWidth}
          onResizeSidebarEnd={handleSidebarResizeEnd}
          onToggleSidebar={handleToggleSidebar}
          hilDrawerOpen={hilDrawerOpen}
          hilDrawerPanel={hilDrawerPanel}
          onToggleHilDrawer={setHilDrawerOpen}
          onSelectHilDrawerPanel={handleSelectHilDrawerPanel}
          onOpenHilPromote={openPromoteModal}
          hilCommentsProps={hilCommentsProps}
          hilDraftsProps={hilDraftsProps}
          hilReplyProps={hilReplyProps}
          memoDrawerProps={memoDrawerProps}
          actionSheetsProps={appLayoutActionSheetsProps}
          explorerSidebarProps={appLayoutExplorerSidebarProps}
          explorerPaneProps={appLayoutExplorerPaneProps}
          memoPaneProps={appLayoutMemoPaneProps}
          memoSidebarProps={appLayoutMemoSidebarProps}
        />

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
                const result = await agencyUpdateCellState({
                  id: pendingTransition.cell.id,
                  state: pendingTransition.nextState,
                  worktreePath: pendingTransition.cell.worktreePath,
                });
                if (!result) {
                  setTransitionError('Lifecycle transition failed.');
                  return;
                }
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

function App() {
  return (
    <ModalProvider>
      <AppShell />
    </ModalProvider>
  );
}

export default App;
