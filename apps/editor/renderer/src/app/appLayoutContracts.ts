export const ACTIVE_VIEWS = [
  'agent-cells',
  'explorer',
  'memo',
  'action-sheets',
  'hierarchy',
  'settings',
] as const;
export type ActiveView = (typeof ACTIVE_VIEWS)[number];

export const HIERARCHY_SECTIONS = [
  'actions',
  'harness-providers',
  'app-shortcuts',
  'reply-quick-prompts',
  'session-naming',
  'gates',
  'softlinks',
] as const;
export type HierarchySection = (typeof HIERARCHY_SECTIONS)[number];

export const SCOPED_CONFIG_SCOPES = ['global', 'project', 'agent'] as const;
export type ScopedConfigScope = (typeof SCOPED_CONFIG_SCOPES)[number];

export const GATE_STAGES = ['draft', 'active', 'archived'] as const;
export type GateStage = (typeof GATE_STAGES)[number];

export const HIL_DRAWER_PANELS = ['comments', 'drafts', 'reply'] as const;
export type HilDrawerPanel = (typeof HIL_DRAWER_PANELS)[number];

export type UnknownRecord = Record<string, unknown>;
export type UnknownList = unknown[];
export type FlexibleHandler<Args extends unknown[] = never[], Result = unknown> = (
  ...args: Args
) => Result;

export type AppCell = UnknownRecord & {
  id?: string;
  name?: string;
  branch?: string;
  worktreePath?: string;
  state?: string;
  isVirtual?: boolean;
};

export type TmuxStatus = UnknownRecord & {
  available?: boolean;
  error?: string;
  version?: string;
};

export type ActionSheetsPanelProps = UnknownRecord & {
  sheets: UnknownList;
  onToggleArchived: FlexibleHandler;
};

export type ExplorerSidebarProps = UnknownRecord & {
  rootLabel?: string;
  onRevealHandled: FlexibleHandler;
};

export type ExplorerPaneProps = UnknownRecord & {
  activeRootLabel?: string;
  pendingJump: unknown;
  onJumpHandled: FlexibleHandler;
};

export type MemoPaneProps = UnknownRecord & {
  screenshotShortcut: unknown;
  onDispatchActionSheet: FlexibleHandler;
};

export type MemoDrawerProps = UnknownRecord & {
  flashVoiceShortcut: unknown;
};

function parseLiteral<T extends readonly string[]>(
  values: T,
  value: unknown
): T[number] | null {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return null;
  }
  return (values as readonly string[]).includes(normalized)
    ? (normalized as T[number])
    : null;
}

export function parseActiveView(value: unknown): ActiveView | null {
  return parseLiteral(ACTIVE_VIEWS, value);
}

export function parseHierarchySection(value: unknown): HierarchySection | null {
  return parseLiteral(HIERARCHY_SECTIONS, value);
}

export function parseScopedConfigScope(value: unknown): ScopedConfigScope | null {
  return parseLiteral(SCOPED_CONFIG_SCOPES, value);
}

export function parseGateStage(value: unknown): GateStage | null {
  return parseLiteral(GATE_STAGES, value);
}

export function parseHilDrawerPanel(value: unknown): HilDrawerPanel | null {
  return parseLiteral(HIL_DRAWER_PANELS, value);
}

export function parseHilDrawerPanelByView(value: unknown): Record<string, HilDrawerPanel> {
  if (!value || typeof value !== 'object') {
    return {};
  }
  const next: Record<string, HilDrawerPanel> = {};
  Object.entries(value as Record<string, unknown>).forEach(([view, panel]) => {
    const parsedPanel = parseHilDrawerPanel(panel);
    if (view && parsedPanel) {
      next[view] = parsedPanel;
    }
  });
  return next;
}

export interface LayoutState {
  activeView: ActiveView;
  hierarchySection: HierarchySection;
  displayCells: AppCell[];
  selectedId: string | null;
  selectedCell: AppCell | null;
  sidebarWidth: number;
  sidebarCollapsed: boolean;
  hilDrawerOpen: boolean;
  hilDrawerPanel: HilDrawerPanel;
  terminalMode: string;
  terminalOpen: boolean;
}

export interface ProjectState {
  projectReady: boolean;
  projectError: string;
  projectRoot: string;
  recentProjects: UnknownList;
  tmuxStatus: TmuxStatus;
}

export interface ScopeState {
  actionsScope: ScopedConfigScope;
  appShortcutsScope: ScopedConfigScope;
  replyQuickPromptsScope: ScopedConfigScope;
  sessionNamingScope: ScopedConfigScope;
  gateScope: ScopedConfigScope;
  gateStage: GateStage;
}

export interface GateState {
  gateDisplayStage: GateStage | string;
  gateResultsByStage: UnknownRecord;
  gatesCheckingByStage: UnknownRecord;
  activityDiffThreshold: number;
}

export type SessionsState = UnknownRecord & {
  activeSessionId?: string;
  sessions?: UnknownList;
  sessionLoading?: boolean;
  sessionError?: string;
  lastActivityAt?: number | null;
  refreshSessions?: FlexibleHandler;
  zoomIn?: FlexibleHandler;
  zoomOut?: FlexibleHandler;
  zoomReset?: FlexibleHandler;
  pendingCommand?: unknown;
  acknowledgeCommandSent?: FlexibleHandler;
  updateSessionActivity?: FlexibleHandler;
  handleSessionAttached?: FlexibleHandler;
  sendSessionText?: FlexibleHandler;
  activeFontSize?: number;
  sessionsByCellId?: Record<string, UnknownList>;
  activeSessionByCellId?: Record<string, string>;
  sessionActivityByKey?: Record<string, number>;
  createSessionForCell?: FlexibleHandler;
  dispatchSessionCommand?: FlexibleHandler;
  closeSession?: FlexibleHandler;
  detachSession?: FlexibleHandler;
  renameSession?: FlexibleHandler;
  updateSessionAvatar?: FlexibleHandler;
  moveSessionNode?: FlexibleHandler;
  prepareSessionContinueOnMobile?: FlexibleHandler;
  trackPendingHarnessRun?: FlexibleHandler;
  clearTrackedHarnessRun?: FlexibleHandler;
  settleTrackedHarnessRun?: FlexibleHandler;
  focusSessionInUi?: FlexibleHandler;
};

export type SessionReplyContextState = UnknownRecord & {
  activeProfileId?: string;
  activeProfileBindings?: UnknownList;
  handleJumpToSession?: FlexibleHandler;
  activeSession?: unknown;
  activeReplySelection?: unknown;
  handleClearReplySelection?: FlexibleHandler;
  terminusProfiles?: UnknownList;
  sessionNamingPreviewContext?: unknown;
};

export type SelectionState = UnknownRecord & {
  sessionTargets?: UnknownList;
  replyFocusToken?: unknown;
  availableActionSessions?: UnknownList;
  actionSheetSessionId?: string;
  actionSheetInlineError?: string;
  cells?: AppCell[];
  setSelectedId?: FlexibleHandler<[string | null]>;
  explorerMeta?: unknown;
  pendingExplorerReveal?: unknown;
  pendingWorkbenchJump?: unknown;
};

export type MemoState = UnknownRecord & {
  hilMemo?: unknown;
  memoCapture?: unknown;
  memoFocusTarget?: string;
};

export type ExplorerState = UnknownRecord & {
  explorerRootPath?: string;
  explorerRootLabel?: string;
  sessionMapOpen?: boolean;
  explorerDeliverySummary?: unknown;
};

export type NavigationHandlers = UnknownRecord & {
  handleSelectProjectRoot?: FlexibleHandler;
  handleSwitchView?: FlexibleHandler<[ActiveView]>;
  handleSelectHierarchySection?: FlexibleHandler<[HierarchySection]>;
  handleSelectSessionFromSidebar?: FlexibleHandler;
  handleOpenRecentProject?: FlexibleHandler<[string]>;
  handleSelectActionsScope?: FlexibleHandler<[ScopedConfigScope]>;
  handleOpenHarnessProviders?: FlexibleHandler;
  handleConfigureProfile?: FlexibleHandler;
  handleSelectAppShortcutsScope?: FlexibleHandler<[ScopedConfigScope]>;
  handleSelectReplyQuickPromptsScope?: FlexibleHandler<[ScopedConfigScope]>;
  handleSelectSessionNamingScope?: FlexibleHandler<[ScopedConfigScope]>;
  handleSelectGateScope?: FlexibleHandler<[ScopedConfigScope]>;
  setGateStage?: FlexibleHandler<[GateStage]>;
  handleSaveGates?: FlexibleHandler;
  setSidebarWidth?: FlexibleHandler<[number]>;
  handleSidebarResizeEnd?: FlexibleHandler<[number]>;
  handleToggleSidebar?: FlexibleHandler;
  setHilDrawerOpen?: FlexibleHandler<[boolean]>;
  handleSelectHilDrawerPanel?: FlexibleHandler<[HilDrawerPanel]>;
  handleHierarchyJump?: FlexibleHandler<[HierarchySection]>;
};

export type ActionHandlers = UnknownRecord & {
  handleStateChange?: FlexibleHandler;
  handleTurnGateCreateSheet?: FlexibleHandler;
  handleTurnGateExecuteSheet?: FlexibleHandler;
  handleOpenTerminal?: FlexibleHandler;
  handleUpdateCellAvatar?: FlexibleHandler;
  handleOpenWorkbenchFile?: FlexibleHandler;
  handleSelectionContext?: FlexibleHandler;
  handleReplySelection?: FlexibleHandler;
  handleOpenMemoReference?: FlexibleHandler;
  handleRevealMemoReference?: FlexibleHandler;
  handleFocusPromoteSession?: FlexibleHandler;
  handleOpenDeliveryTimeline?: FlexibleHandler;
  handleDispatchActionSheet?: FlexibleHandler;
  handleArchiveActionSheet?: FlexibleHandler;
  handleDeleteActionSheet?: FlexibleHandler;
  handleOpenActionSheets?: FlexibleHandler;
  handleOpenMemoDraft?: FlexibleHandler;
  handleViewActionSheetSession?: FlexibleHandler;
  handleRunDraftInActiveSession?: FlexibleHandler;
  handleOpenMemoInbox?: FlexibleHandler;
  handleFocusInboxInput?: FlexibleHandler;
  handleCreateDraftActionSheet?: FlexibleHandler;
  handleFocusInboxInputHandled?: FlexibleHandler;
  handleCreateActionSheet?: FlexibleHandler;
  handleSaveActionSheet?: FlexibleHandler;
  setActionSheetSessionId?: FlexibleHandler<[string]>;
  handleDispatchExplorerFeed?: FlexibleHandler;
  handleOpenExplorerDeliveryTimeline?: FlexibleHandler;
  handleToggleSessionMap?: FlexibleHandler;
  setPendingExplorerReveal?: FlexibleHandler;
  handleAddCommentFromExplorer?: FlexibleHandler;
  handleJumpToComments?: FlexibleHandler;
  handleWorkbenchMetaChange?: FlexibleHandler;
  handleWorkbenchSelectionChange?: FlexibleHandler;
  setPendingWorkbenchJump?: FlexibleHandler;
  handleRevealPathInExplorerFromWorkbench?: FlexibleHandler;
  handleOpenCreateCellModal?: FlexibleHandler;
  handleOpenExplorerForCell?: FlexibleHandler;
  handleOpenAgentCellFileReference?: FlexibleHandler;
  handleRevealAgentCellFileReference?: FlexibleHandler;
  handleImportAgentCellFileReferences?: FlexibleHandler;
  handleContinueSessionOnMobile?: FlexibleHandler;
  handleFocusSessionInUi?: FlexibleHandler<[string, string]>;
};

export interface HierarchyConfigState {
  terminusScopeDisabled: boolean;
  terminusSummary: unknown;
  appShortcutsScopeDisabled: boolean;
  appShortcutsSummary: unknown;
  replyQuickPromptsScopeDisabled: boolean;
  replyQuickPromptsSummary: unknown;
  appShortcutRows: UnknownList;
  replyQuickPromptsRows: UnknownList;
  resolvedReplyQuickPrompts: UnknownList;
  replyQuickPromptsPaths: unknown;
  replyQuickPromptsError: string;
  replyQuickPromptsSaving: boolean;
  replyQuickPromptsDirty: boolean;
  addReplyQuickPrompt: FlexibleHandler;
  updateReplyQuickPrompt: FlexibleHandler;
  removeReplyQuickPrompt: FlexibleHandler;
  saveReplyQuickPrompts: FlexibleHandler;
  clearReplyQuickPromptsError: FlexibleHandler;
  appShortcutsPaths: unknown;
  appShortcutsError: string;
  appShortcutsSaving: boolean;
  appShortcutsDirty: boolean;
  updateAppShortcut: FlexibleHandler;
  overrideAppShortcut: FlexibleHandler;
  resetAppShortcut: FlexibleHandler;
  saveAppShortcuts: FlexibleHandler;
  clearAppShortcutsError: FlexibleHandler;
  sessionNamingScopeDisabled: boolean;
  sessionNamingSummary: unknown;
  sessionNamingSettings: unknown;
  resolvedSessionNaming: unknown;
  sessionNamingPaths: unknown;
  sessionNamingError: string;
  sessionNamingSaving: boolean;
  sessionNamingDirty: boolean;
  updateSessionNamingRule: FlexibleHandler;
  updateSessionNamingList: FlexibleHandler;
  renameSessionNamingList: FlexibleHandler;
  removeSessionNamingList: FlexibleHandler;
  addSessionNamingList: FlexibleHandler;
  saveSessionNamingSettings: FlexibleHandler;
  clearSessionNamingError: FlexibleHandler;
  profileRows: UnknownList;
  bindingRowsByProfile: unknown;
  projectSettingsPath: string;
  agentSettingsPath: string;
  terminusError: string;
  terminusSaving: boolean;
  terminusDirty: boolean;
  addProfile: FlexibleHandler;
  removeProfile: FlexibleHandler;
  overrideProfile: FlexibleHandler;
  resetProfile: FlexibleHandler;
  updateProfile: FlexibleHandler;
  saveTerminusSettings: FlexibleHandler;
  addBinding: FlexibleHandler;
  removeBinding: FlexibleHandler;
  overrideBinding: FlexibleHandler;
  resetBinding: FlexibleHandler;
  updateBinding: FlexibleHandler;
  clearTerminusError: FlexibleHandler;
  gateScopeDisabled: boolean;
  gateSummary: unknown;
  gateRows: UnknownList;
  projectGatesPath: string;
  agentGatesPath: string;
  gatesError: string;
  gatesSaving: boolean;
  addGate: FlexibleHandler;
  removeGate: FlexibleHandler;
  overrideGate: FlexibleHandler;
  resetGate: FlexibleHandler;
  updateGate: FlexibleHandler;
  worktreeLinks: UnknownList;
  worktreeLinksAuto: boolean;
  worktreeLinksCandidates: UnknownList;
  worktreeLinksStatusesByPath: UnknownRecord;
  worktreeLinksConfigPath: string;
  worktreeLinksLoading: boolean;
  worktreeLinksError: string;
  worktreeLinksDirty: boolean;
  toggleWorktreeLinksAuto: FlexibleHandler;
  addWorktreeLink: FlexibleHandler;
  addWorktreeLinkFromCandidate: FlexibleHandler;
  updateWorktreeLink: FlexibleHandler;
  removeWorktreeLink: FlexibleHandler;
  applyWorktreeLink: FlexibleHandler;
  applyAllWorktreeLinks: FlexibleHandler;
  saveWorktreeLinks: FlexibleHandler;
  refreshWorktreeLinks: FlexibleHandler;
  resolvedRepoRoot: string;
  canUseProjectScope: boolean;
  canUseAgentScope: boolean;
  mainAgentHarnessSettings: unknown;
  codexCliProviderSettings: unknown;
  harnessSettingsPath: string;
  harnessProvidersError: string;
  harnessProvidersSaving: boolean;
  harnessProvidersDirty: boolean;
  updateCodexCliProvider: FlexibleHandler;
  saveMainAgentHarnessSettings: FlexibleHandler;
  clearHarnessProvidersError: FlexibleHandler;
}

export interface AppLayoutCompositionInput {
  layoutState: LayoutState;
  projectState: ProjectState;
  scopeState: ScopeState;
  gateState: GateState;
  sessionsState: SessionsState;
  sessionReplyContext: SessionReplyContextState;
  hierarchyConfig: HierarchyConfigState;
  promoteWorkflow: UnknownRecord & {
    openPromoteModal?: FlexibleHandler;
  };
  hilCommentState: UnknownRecord & {
    commentCountsByPath?: UnknownRecord;
    commentLines?: UnknownList;
  };
  actionSheetsState: UnknownRecord & {
    cancelSheet?: FlexibleHandler;
    sheets?: UnknownList;
    setShowArchived?: FlexibleHandler;
    selectedSheet?: unknown;
    selectedId?: string;
    setSelectedId?: FlexibleHandler<[string]>;
    updateSheetChecks?: FlexibleHandler;
    refreshList?: FlexibleHandler;
    showArchived?: boolean;
    refreshChecks?: FlexibleHandler;
    loading?: boolean;
    detailLoading?: boolean;
    error?: string;
  };
  workbenchState: UnknownRecord & {
    activeTab?: unknown;
    cursorPosition?: unknown;
    workbench?: unknown;
    setCursorPosition?: FlexibleHandler;
  };
  selectionState: SelectionState;
  memoState: MemoState;
  navigationHandlers: NavigationHandlers;
  actionHandlers: ActionHandlers;
  explorerState: ExplorerState;
}

export interface BuildAppLayoutInput {
  activeView: ActiveView;
  handleSwitchView: FlexibleHandler<[ActiveView]>;
  hierarchySection: HierarchySection;
  handleSelectHierarchySection: FlexibleHandler<[HierarchySection]>;
  displayCells: AppCell[];
  selectedId: string | null;
  selectedCell: AppCell | null;
  setSelectedId: FlexibleHandler<[string | null]>;
  handleOpenCreateCellModal: FlexibleHandler;
  handleHierarchyJump: FlexibleHandler<[HierarchySection]>;
  handleOpenExplorerForCell: FlexibleHandler;
  handleOpenAgentCellFileReference: FlexibleHandler;
  handleRevealAgentCellFileReference: FlexibleHandler;
  handleImportAgentCellFileReferences: FlexibleHandler;
  sessionsByCellId: Record<string, UnknownList>;
  activeSessionByCellId: Record<string, string>;
  sessionActivityByKey: Record<string, number>;
  terminusProfiles: UnknownList;
  handleSelectSessionFromSidebar: FlexibleHandler;
  createSessionForCell: FlexibleHandler;
  dispatchSessionCommand: FlexibleHandler;
  closeSession: FlexibleHandler;
  detachSession: FlexibleHandler;
  renameSession: FlexibleHandler;
  updateSessionAvatar: FlexibleHandler;
  moveSessionNode: FlexibleHandler;
  prepareSessionContinueOnMobile?: FlexibleHandler;
  trackPendingHarnessRun?: FlexibleHandler;
  clearTrackedHarnessRun?: FlexibleHandler;
  settleTrackedHarnessRun?: FlexibleHandler;
  focusSessionInUi?: FlexibleHandler;
  handleContinueSessionOnMobile?: FlexibleHandler;
  projectReady: boolean;
  projectError: string;
  projectRoot: string;
  recentProjects: UnknownList;
  tmuxStatus: TmuxStatus;
  handleSelectProjectRoot: FlexibleHandler;
  handleOpenRecentProject: FlexibleHandler<[string]>;
  actionsScope: ScopedConfigScope;
  handleSelectActionsScope: FlexibleHandler<[ScopedConfigScope]>;
  handleOpenHarnessProviders: FlexibleHandler;
  handleConfigureProfile: FlexibleHandler;
  appShortcutsScope: ScopedConfigScope;
  handleSelectAppShortcutsScope: FlexibleHandler<[ScopedConfigScope]>;
  replyQuickPromptsScope: ScopedConfigScope;
  handleSelectReplyQuickPromptsScope: FlexibleHandler<[ScopedConfigScope]>;
  sessionNamingScope: ScopedConfigScope;
  handleSelectSessionNamingScope: FlexibleHandler<[ScopedConfigScope]>;
  terminusScopeDisabled: boolean;
  terminusSummary: unknown;
  harnessSettingsPath: string;
  harnessProvidersError: string;
  harnessProvidersSaving: boolean;
  harnessProvidersDirty: boolean;
  codexCliProviderSettings: unknown;
  updateCodexCliProvider: FlexibleHandler;
  saveMainAgentHarnessSettings: FlexibleHandler;
  clearHarnessProvidersError: FlexibleHandler;
  appShortcutsScopeDisabled: boolean;
  appShortcutsSummary: unknown;
  replyQuickPromptsScopeDisabled: boolean;
  replyQuickPromptsSummary: unknown;
  appShortcutRows: UnknownList;
  replyQuickPromptsRows: UnknownList;
  resolvedReplyQuickPrompts: UnknownList;
  replyQuickPromptsPaths: unknown;
  replyQuickPromptsError: string;
  replyQuickPromptsSaving: boolean;
  replyQuickPromptsDirty: boolean;
  addReplyQuickPrompt: FlexibleHandler;
  updateReplyQuickPrompt: FlexibleHandler;
  removeReplyQuickPrompt: FlexibleHandler;
  saveReplyQuickPrompts: FlexibleHandler;
  clearReplyQuickPromptsError: FlexibleHandler;
  appShortcutsPaths: unknown;
  appShortcutsError: string;
  appShortcutsSaving: boolean;
  appShortcutsDirty: boolean;
  updateAppShortcut: FlexibleHandler;
  overrideAppShortcut: FlexibleHandler;
  resetAppShortcut: FlexibleHandler;
  saveAppShortcuts: FlexibleHandler;
  clearAppShortcutsError: FlexibleHandler;
  sessionNamingScopeDisabled: boolean;
  sessionNamingSummary: unknown;
  sessionNamingSettings: unknown;
  resolvedSessionNaming: unknown;
  sessionNamingPaths: unknown;
  sessionNamingError: string;
  sessionNamingSaving: boolean;
  sessionNamingDirty: boolean;
  sessionNamingPreviewContext: unknown;
  updateSessionNamingRule: FlexibleHandler;
  updateSessionNamingList: FlexibleHandler;
  renameSessionNamingList: FlexibleHandler;
  removeSessionNamingList: FlexibleHandler;
  addSessionNamingList: FlexibleHandler;
  saveSessionNamingSettings: FlexibleHandler;
  clearSessionNamingError: FlexibleHandler;
  profileRows: UnknownList;
  activeProfileId: string;
  projectSettingsPath: string;
  agentSettingsPath: string;
  terminusError: string;
  terminusSaving: boolean;
  terminusDirty: boolean;
  addProfile: FlexibleHandler;
  removeProfile: FlexibleHandler;
  overrideProfile: FlexibleHandler;
  resetProfile: FlexibleHandler;
  updateProfile: FlexibleHandler;
  saveTerminusSettings: FlexibleHandler;
  bindingRowsByProfile: unknown;
  addBinding: FlexibleHandler;
  removeBinding: FlexibleHandler;
  overrideBinding: FlexibleHandler;
  resetBinding: FlexibleHandler;
  updateBinding: FlexibleHandler;
  clearTerminusError: FlexibleHandler;
  gateScope: ScopedConfigScope;
  handleSelectGateScope: FlexibleHandler<[ScopedConfigScope]>;
  gateStage: GateStage;
  setGateStage: FlexibleHandler<[GateStage]>;
  gateScopeDisabled: boolean;
  gateSummary: unknown;
  gateRows: UnknownList;
  projectGatesPath: string;
  agentGatesPath: string;
  gatesError: string;
  gatesSaving: boolean;
  addGate: FlexibleHandler;
  removeGate: FlexibleHandler;
  overrideGate: FlexibleHandler;
  resetGate: FlexibleHandler;
  updateGate: FlexibleHandler;
  handleSaveGates: FlexibleHandler;
  worktreeLinks: UnknownList;
  worktreeLinksAuto: boolean;
  worktreeLinksCandidates: UnknownList;
  worktreeLinksStatusesByPath: UnknownRecord;
  worktreeLinksConfigPath: string;
  worktreeLinksLoading: boolean;
  worktreeLinksError: string;
  worktreeLinksDirty: boolean;
  toggleWorktreeLinksAuto: FlexibleHandler;
  addWorktreeLink: FlexibleHandler;
  addWorktreeLinkFromCandidate: FlexibleHandler;
  updateWorktreeLink: FlexibleHandler;
  removeWorktreeLink: FlexibleHandler;
  applyWorktreeLink: FlexibleHandler;
  applyAllWorktreeLinks: FlexibleHandler;
  saveWorktreeLinks: FlexibleHandler;
  refreshWorktreeLinks: FlexibleHandler;
  resolvedRepoRoot: string;
  canUseProjectScope: boolean;
  canUseAgentScope: boolean;
  editorPaneProps: UnknownRecord;
  sidebarWidth: number;
  sidebarCollapsed: boolean;
  setSidebarWidth: FlexibleHandler<[number]>;
  handleSidebarResizeEnd: FlexibleHandler<[number]>;
  handleToggleSidebar: FlexibleHandler;
  hilDrawerOpen: boolean;
  hilDrawerPanel: HilDrawerPanel;
  setHilDrawerOpen: FlexibleHandler<[boolean]>;
  handleSelectHilDrawerPanel: FlexibleHandler<[HilDrawerPanel]>;
  openPromoteModal: FlexibleHandler;
  hilCommentsProps: UnknownRecord;
  hilDraftsProps: UnknownRecord;
  hilReplyProps: UnknownRecord;
  memoDrawerProps: UnknownRecord;
  attentionRailProps: UnknownRecord;
  appLayoutActionSheetsProps: ActionSheetsPanelProps;
  appLayoutExplorerSidebarProps: ExplorerSidebarProps;
  appLayoutExplorerPaneProps: ExplorerPaneProps;
  appLayoutMemoPaneProps: MemoPaneProps;
  appLayoutMemoSidebarProps: UnknownRecord;
}
