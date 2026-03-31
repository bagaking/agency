import assert from 'node:assert/strict';
import test from 'node:test';

import { buildComposedAppLayoutProps } from '../buildComposedAppLayoutProps';

function createFixture() {
  const noop = () => undefined;
  const asyncNoop = async () => undefined;

  let toggledArchivedResult: boolean | null = null;
  let revealedExplorerPayload: any = undefined;
  let handledWorkbenchJumpPayload: any = undefined;
  let hierarchyJumpTarget: string | null = null;

  const layoutState = {
    activeView: 'agent-cells',
    hierarchySection: 'actions',
    displayCells: [{ id: 'cell-1', name: 'Cell 1' }],
    selectedId: 'cell-1',
    selectedCell: { id: 'cell-1', worktreePath: '/tmp/repo/cell-1' },
    sidebarWidth: 320,
    sidebarCollapsed: false,
    hilDrawerOpen: true,
    hilDrawerPanel: 'comments',
    terminalMode: 'shell',
    terminalOpen: true,
  };

  const projectState = {
    projectReady: true,
    projectError: '',
    projectRoot: '/tmp/repo',
    recentProjects: [],
    tmuxStatus: { available: true },
  };

  const scopeState = {
    actionsScope: 'global',
    appShortcutsScope: 'global',
    replyQuickPromptsScope: 'global',
    sessionNamingScope: 'global',
    gateScope: 'global',
    gateStage: 'active',
  };

  const gateState = {
    gateDisplayStage: 'active',
    gateResultsByStage: {},
    gatesCheckingByStage: {},
    activityDiffThreshold: 5,
  };

  const sessionsState = {
    sessions: [{ id: 'sess-1', status: 'active' }],
    sessionsByCellId: { 'cell-1': [{ id: 'sess-1', status: 'active' }] },
    activeSessionId: 'sess-1',
    activeSessionByCellId: { 'cell-1': 'sess-1' },
    activeFontSize: 14,
    sessionFontSizeByKey: {},
    sessionActivityByKey: {},
    sessionVisitedByKey: {},
    sessionLoading: false,
    sessionError: '',
    pendingCommand: '',
    lastActivityAt: null,
    refreshSessions: asyncNoop,
    refreshSessionsForCells: asyncNoop,
    createSessionForCell: asyncNoop,
    createSession: asyncNoop,
    closeSession: asyncNoop,
    detachSession: asyncNoop,
    renameSession: asyncNoop,
    updateSessionAvatar: asyncNoop,
    moveSessionNode: asyncNoop,
    selectSession: noop,
    updateSessionActivity: noop,
    zoomIn: noop,
    zoomOut: noop,
    zoomReset: noop,
    dispatchSessionCommand: asyncNoop,
    sendSessionText: asyncNoop,
    acknowledgeCommandSent: noop,
    handleSessionAttached: noop,
    resetSessions: noop,
  };

  const sessionReplyContext = {
    activeProfileBindings: { Enter: 'send' },
    handleJumpToSession: noop,
    activeSession: { id: 'sess-1' },
    activeReplySelection: { text: 'snippet' },
    handleClearReplySelection: noop,
    terminusProfiles: [{ id: 'default' }],
    sessionNamingPreviewContext: { branch: 'main' },
  };

  const hierarchyConfig = {
    resolvedReplyQuickPrompts: [],
    memoVoiceShortcut: 'Cmd+Shift+V',
    screenshotShortcut: 'Cmd+Shift+S',
    profileRows: [],
    bindingRowsByProfile: {},
    terminusScopeDisabled: false,
    projectSettingsPath: '/tmp/repo/.agency/terminus.json',
    agentSettingsPath: '/tmp/repo/.agency/cell/terminus.json',
    terminusError: '',
    terminusSaving: false,
    terminusDirty: false,
    terminusSummary: { total: 0 },
    addProfile: noop,
    updateProfile: noop,
    overrideProfile: noop,
    removeProfile: noop,
    resetProfile: noop,
    addBinding: noop,
    updateBinding: noop,
    overrideBinding: noop,
    removeBinding: noop,
    resetBinding: noop,
    saveTerminusSettings: asyncNoop,
    clearTerminusError: noop,
    appShortcutRows: [],
    appShortcutsScopeDisabled: false,
    appShortcutsError: '',
    appShortcutsSaving: false,
    appShortcutsDirty: false,
    appShortcutsSummary: { total: 0 },
    updateAppShortcut: noop,
    overrideAppShortcut: noop,
    resetAppShortcut: noop,
    saveAppShortcuts: asyncNoop,
    clearAppShortcutsError: noop,
    appShortcutsPaths: {},
    replyQuickPromptsRows: [],
    replyQuickPromptsScopeDisabled: false,
    replyQuickPromptsError: '',
    replyQuickPromptsSaving: false,
    replyQuickPromptsDirty: false,
    replyQuickPromptsSummary: { total: 0 },
    addReplyQuickPrompt: noop,
    updateReplyQuickPrompt: noop,
    removeReplyQuickPrompt: noop,
    saveReplyQuickPrompts: asyncNoop,
    clearReplyQuickPromptsError: noop,
    replyQuickPromptsPaths: {},
    sessionNamingSettings: {},
    resolvedSessionNaming: {},
    sessionNamingScopeDisabled: false,
    sessionNamingError: '',
    sessionNamingSaving: false,
    sessionNamingDirty: false,
    sessionNamingSummary: { total: 0 },
    updateSessionNamingRule: noop,
    updateSessionNamingList: noop,
    removeSessionNamingList: noop,
    renameSessionNamingList: noop,
    addSessionNamingList: noop,
    saveSessionNamingSettings: asyncNoop,
    clearSessionNamingError: noop,
    sessionNamingPaths: {},
    gateRows: [],
    gateScopeDisabled: false,
    projectGatesPath: '/tmp/repo/.agency/gates.json',
    agentGatesPath: '/tmp/repo/.agency/cell/gates.json',
    gatesError: '',
    gatesSaving: false,
    gateSummary: { total: 0 },
    addGate: noop,
    updateGate: noop,
    overrideGate: noop,
    removeGate: noop,
    resetGate: noop,
    saveGates: asyncNoop,
    worktreeLinks: [],
    worktreeLinksAuto: false,
    worktreeLinksCandidates: [],
    worktreeLinksStatusesByPath: {},
    worktreeLinksConfigPath: '/tmp/repo/.agency/worktree-links.json',
    worktreeLinksLoading: false,
    worktreeLinksError: '',
    worktreeLinksDirty: false,
    toggleWorktreeLinksAuto: noop,
    addWorktreeLink: noop,
    addWorktreeLinkFromCandidate: noop,
    updateWorktreeLink: noop,
    removeWorktreeLink: noop,
    applyWorktreeLink: asyncNoop,
    applyAllWorktreeLinks: asyncNoop,
    saveWorktreeLinks: asyncNoop,
    refreshWorktreeLinks: asyncNoop,
    resolvedRepoRoot: '/tmp/repo',
    canUseProjectScope: true,
    canUseAgentScope: true,
  };

  const promoteWorkflow = {
    promoteModalOpen: false,
    promoteDescription: '',
    promoteError: '',
    promoteLoading: false,
    promoteItems: [],
    promoteSelectedIds: [],
    promotePreviewById: {},
    promoteStep: 'select',
    promoteDraft: null,
    promoteMode: 'delivery',
    promoteActionSheet: null,
    promoteGateStatus: null,
    promoteExecutionStatus: null,
    promoteSessionId: '',
    setPromoteDescription: noop,
    togglePromoteItem: noop,
    togglePromoteGroup: noop,
    loadPromotePreview: asyncNoop,
    setPromoteSessionId: noop,
    selectPromoteMode: noop,
    createPromoteSession: asyncNoop,
    dispatchPromote: asyncNoop,
    confirmPromote: asyncNoop,
    promoteDraftId: '',
    promoteActionSheetId: '',
    closePromoteModal: noop,
    openPromoteModal: noop,
  };

  const hilCommentState = {
    comments: [],
    commentsLoading: false,
    commentsError: '',
    openCommentModal: noop,
    updateCommentStatus: asyncNoop,
    commentModalOpen: false,
    commentTarget: null,
    commentMessage: '',
    commentTodo: false,
    commentError: '',
    commentSaving: false,
    commentSnippet: '',
    commentSnippetLoading: false,
    commentSnippetError: '',
    setCommentMessage: noop,
    setCommentTodo: noop,
    closeCommentModal: noop,
    submitComment: asyncNoop,
    commentCountsByPath: {},
    commentLines: {},
  };

  const actionSheetsState = {
    cancelSheet: asyncNoop,
    sheets: [],
    setShowArchived: (updater: (value: boolean) => boolean) => {
      toggledArchivedResult = updater(false);
    },
    selectedSheet: null,
    selectedId: '',
    setSelectedId: noop,
    updateSheetChecks: asyncNoop,
    refreshList: asyncNoop,
    showArchived: false,
    refreshChecks: asyncNoop,
    loading: false,
    detailLoading: false,
    error: '',
  };

  const workbenchState = {
    activeTab: { path: 'README.md' },
    cursorPosition: { line: 1, column: 1 },
    workbench: {
      openFile: noop,
    },
    setCursorPosition: noop,
  };

  const selectionState = {
    replyFocusToken: 2,
    sessionTargets: [{ sessionId: 'sess-1' }],
    availableActionSessions: [{ id: 'sess-1' }],
    actionSheetSessionId: 'sess-1',
    actionSheetInlineError: '',
    pendingExplorerReveal: { path: 'README.md' },
    pendingWorkbenchJump: { path: 'README.md' },
    explorerMeta: {},
    cells: [{ id: 'cell-1' }],
    setSelectedId: noop,
  };

  const memoState = {
    hilMemo: {
      draftItems: [],
      summarizeBody: noop,
      activeInboxSection: { id: 'comments' },
      refresh: asyncNoop,
    },
    memoCapture: {
      flashText: '',
      onFlashChange: noop,
      handleCreateFlash: asyncNoop,
      flashVoice: false,
      flashVoiceSegments: [],
      excerptUrl: '',
      setExcerptUrl: noop,
      handleFetchExcerpt: asyncNoop,
      excerptPreview: null,
      excerptFetching: false,
      excerptNote: '',
      setExcerptNote: noop,
      handleCreateExcerpt: asyncNoop,
      screenshotAsset: null,
      captureResult: null,
      screenshotNote: '',
      setScreenshotNote: noop,
      handleCaptureScreenshot: asyncNoop,
      handleOpenRouting: noop,
      captureLoading: false,
    },
    memoFocusTarget: '',
  };

  const navigationHandlers = {
    handleSwitchView: noop,
    handleSelectHierarchySection: noop,
    handleHierarchyJump: (target: string) => {
      hierarchyJumpTarget = target;
    },
    handleSelectSessionFromSidebar: noop,
    handleSelectProjectRoot: asyncNoop,
    handleOpenRecentProject: asyncNoop,
    handleSelectActionsScope: noop,
    handleConfigureProfile: noop,
    handleSelectAppShortcutsScope: noop,
    handleSelectReplyQuickPromptsScope: noop,
    handleSelectSessionNamingScope: noop,
    handleSelectGateScope: noop,
    setGateStage: noop,
    handleSaveGates: asyncNoop,
    setSidebarWidth: noop,
    handleSidebarResizeEnd: noop,
    handleToggleSidebar: noop,
    setHilDrawerOpen: noop,
    handleSelectHilDrawerPanel: noop,
  };

  const actionHandlers = {
    handleStateChange: asyncNoop,
    handleTurnGateCreateSheet: asyncNoop,
    handleTurnGateExecuteSheet: asyncNoop,
    handleOpenTerminal: noop,
    handleUpdateCellAvatar: asyncNoop,
    handleOpenWorkbenchFile: noop,
    handleSelectionContext: noop,
    handleReplySelection: noop,
    handleOpenMemoReference: noop,
    handleRevealMemoReference: noop,
    handleFocusPromoteSession: noop,
    handleOpenDeliveryTimeline: noop,
    handleDispatchActionSheet: asyncNoop,
    handleArchiveActionSheet: asyncNoop,
    handleDeleteActionSheet: asyncNoop,
    handleOpenActionSheets: noop,
    handleOpenMemoDraft: noop,
    handleViewActionSheetSession: noop,
    handleRunDraftInActiveSession: asyncNoop,
    handleOpenMemoInbox: noop,
    handleFocusInboxInput: noop,
    handleCreateDraftActionSheet: asyncNoop,
    handleFocusInboxInputHandled: noop,
    handleCreateActionSheet: asyncNoop,
    handleSaveActionSheet: asyncNoop,
    setActionSheetSessionId: noop,
    handleOpenExplorerDeliveryTimeline: noop,
    handleDispatchExplorerFeed: asyncNoop,
    handleToggleSessionMap: noop,
    setPendingExplorerReveal: (value: any) => {
      revealedExplorerPayload = value;
    },
    handleAddCommentFromExplorer: noop,
    handleJumpToComments: noop,
    handleWorkbenchMetaChange: noop,
    handleWorkbenchSelectionChange: noop,
    setPendingWorkbenchJump: (value: any) => {
      handledWorkbenchJumpPayload = value;
    },
    handleRevealPathInExplorerFromWorkbench: noop,
    handleOpenCreateCellModal: noop,
    handleOpenExplorerForCell: noop,
    handleOpenAgentCellFileReference: noop,
    handleRevealAgentCellFileReference: noop,
    handleImportAgentCellFileReferences: noop,
    handleContinueSessionOnMobile: asyncNoop,
  };

  const explorerState = {
    explorerRootPath: '/tmp/repo/cell-1',
    explorerRootLabel: 'Cell 1',
    explorerDeliverySummary: null,
    sessionMapOpen: false,
  };

  return {
    args: {
      layoutState,
      projectState,
      scopeState,
      gateState,
      sessionsState,
      sessionReplyContext,
      hierarchyConfig,
      promoteWorkflow,
      hilCommentState,
      actionSheetsState,
      workbenchState,
      selectionState,
      memoState,
      navigationHandlers,
      actionHandlers,
      explorerState,
    },
    refs: {
      layoutState,
      gateState,
      sessionsState,
      sessionReplyContext,
      hierarchyConfig,
      selectionState,
      actionHandlers,
      actionSheetsState,
      workbenchState,
      toggledArchivedResult: () => toggledArchivedResult,
      revealedExplorerPayload: () => revealedExplorerPayload,
      handledWorkbenchJumpPayload: () => handledWorkbenchJumpPayload,
      hierarchyJumpTarget: () => hierarchyJumpTarget,
    },
  };
}

test('buildComposedAppLayoutProps wires editor and hierarchy wiring', () => {
  const fixture = createFixture();
  const result = buildComposedAppLayoutProps(fixture.args as any);

  assert.equal(result.activeView, fixture.refs.layoutState.activeView);
  assert.equal(result.onSwitchView, fixture.args.navigationHandlers.handleSwitchView);
  assert.equal(result.onOpenHilPromote, fixture.args.promoteWorkflow.openPromoteModal);
  assert.equal(result.terminusProfiles, fixture.refs.sessionReplyContext.terminusProfiles);
  assert.equal(result.editorPaneProps.sessionId, fixture.refs.sessionsState.activeSessionId);
  assert.equal(result.editorPaneProps.terminusBindings, fixture.refs.sessionReplyContext.activeProfileBindings);
  assert.equal(result.editorPaneProps.onOpenTerminal, fixture.refs.actionHandlers.handleOpenTerminal);
  assert.equal(result.editorPaneProps.activityDiffThreshold, fixture.refs.gateState.activityDiffThreshold);
  assert.equal(
    result.onContinueSessionOnMobile,
    fixture.refs.actionHandlers.handleContinueSessionOnMobile
  );
  assert.equal(result.onMoveSessionNode, fixture.refs.sessionsState.moveSessionNode);
});

test('buildComposedAppLayoutProps preserves action sheets and explorer callbacks', () => {
  const fixture = createFixture();
  const result = buildComposedAppLayoutProps(fixture.args as any);

  assert.equal(result.actionSheetsProps.sheets, fixture.refs.actionSheetsState.sheets);
  result.actionSheetsProps.onToggleArchived();
  assert.equal(fixture.refs.toggledArchivedResult(), true);

  result.explorerSidebarProps.onRevealHandled();
  assert.equal(fixture.refs.revealedExplorerPayload(), null);

  result.explorerPaneProps.onJumpHandled();
  assert.equal(fixture.refs.handledWorkbenchJumpPayload(), null);

  assert.equal(result.explorerPaneProps.pendingJump, fixture.refs.selectionState.pendingWorkbenchJump);
  assert.equal(result.memoPaneProps.screenshotShortcut, fixture.refs.hierarchyConfig.screenshotShortcut);
  assert.equal(result.memoDrawerProps.flashVoiceShortcut, fixture.refs.hierarchyConfig.memoVoiceShortcut);
  assert.equal(result.memoPaneProps.onDispatchActionSheet, fixture.refs.actionHandlers.handleDispatchActionSheet);
  assert.equal(result.explorerPaneProps.onCursorPositionChange, fixture.refs.workbenchState.setCursorPosition);
});

test('buildComposedAppLayoutProps keeps hierarchy jump shortcuts wired through layout props', () => {
  const fixture = createFixture();
  const result = buildComposedAppLayoutProps(fixture.args as any);

  result.onOpenAppShortcuts();
  assert.equal(fixture.refs.hierarchyJumpTarget(), 'app-shortcuts');

  result.onOpenGates();
  assert.equal(fixture.refs.hierarchyJumpTarget(), 'gates');

  result.onOpenSoftlinks();
  assert.equal(fixture.refs.hierarchyJumpTarget(), 'softlinks');
});

test('buildComposedAppLayoutProps derives attention rail focus session from the selected cell', () => {
  const fixture = createFixture();
  fixture.refs.layoutState.selectedCell = { id: 'cell-2', worktreePath: '/tmp/repo/cell-2' };
  fixture.refs.sessionsState.sessionsByCellId = {
    'cell-1': [{ id: 'sess-1', status: 'active' }],
    'cell-2': [{ id: 'sess-2', status: 'active' }],
  } as any;
  fixture.refs.sessionsState.activeSessionId = 'sess-1';
  fixture.refs.sessionsState.activeSessionByCellId = {
    'cell-1': 'sess-1',
    'cell-2': 'sess-2',
  } as any;

  const result = buildComposedAppLayoutProps(fixture.args as any);

  assert.equal((result.attentionRailProps as any).focusData.cell.id, 'cell-2');
  assert.equal((result.attentionRailProps as any).focusData.session.id, 'sess-2');
});

test('buildComposedAppLayoutProps wires Agent Cells reply state into the shared attention rail', () => {
  const fixture = createFixture();
  fixture.refs.layoutState.activeView = 'agent-cells';
  fixture.refs.layoutState.hilDrawerOpen = true;
  fixture.refs.layoutState.hilDrawerPanel = 'reply';
  fixture.refs.sessionReplyContext.activeSession = {
    id: 'sess-1',
    name: 'Main Session',
  } as any;

  const result = buildComposedAppLayoutProps(fixture.args as any);

  assert.equal((result.attentionRailProps as any).replyEnabled, true);
  assert.equal((result.attentionRailProps as any).replyOpen, true);
  assert.equal((result.attentionRailProps as any).replyLabel, 'Main Session');
});
