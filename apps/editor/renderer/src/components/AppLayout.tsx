import React from 'react';
import type { AppLayoutProps } from '../app/buildAppLayoutProps';
import { ActivityBar } from './ActivityBar';
import { SidebarDock } from './layout/SidebarDock';
import { AppSidebarContent } from './layout/AppSidebarContent';
import { AppMainPanels } from './layout/AppMainPanels';
import { AppAttentionRail } from './layout/AppAttentionRail';
import { AppHilPanel } from './layout/AppHilPanel';

export function AppLayout({
  activeView,
  onSwitchView,
  hierarchySection,
  appShortcutsScope,
  replyQuickPromptsScope,
  sessionNamingScope,
  onSelectHierarchySection,
  cells,
  selectedId,
  selectedCell,
  onSelectCell,
  onCreateCell,
  onJumpToHierarchy,
  onOpenExplorerForCell,
  onOpenAgentCellFileReference,
  onRevealAgentCellFileReference,
  onImportAgentCellFileReferences,
  sessionsByCellId,
  activeSessionByCellId,
  sessionActivityByKey,
  terminusProfiles,
  onSelectSession,
  onCreateSession,
  onDispatchSessionCommand,
  onCloseSession,
  onDetachSession,
  onRenameSession,
  onUpdateSessionAvatar,
  onMoveSessionNode,
  onContinueSessionOnMobile,
  onTrackPendingHarnessRun,
  onClearTrackedHarnessRun,
  onSettleTrackedHarnessRun,
  onFocusSessionInUi,
  projectReady,
  projectError,
  projectRoot,
  recentProjects,
  tmuxStatus,
  onSelectProject,
  onOpenRecentProject,
  onOpenActions,
  onOpenHarnessProviders,
  onOpenAppShortcuts,
  onOpenReplyQuickPrompts,
  onOpenGates,
  onOpenSoftlinks,
  onArchiveCell,
  actionsScope,
  onSelectActionsScope,
  onSelectAppShortcutsScope,
  onSelectReplyQuickPromptsScope,
  onSelectSessionNamingScope,
  actionsScopeDisabled,
  actionSummary,
  harnessSettingsPath,
  harnessProvidersError,
  harnessProvidersSaving,
  harnessProvidersDirty,
  codexCliProviderSettings,
  onUpdateCodexCliProvider,
  onSaveHarnessProviders,
  onClearHarnessProvidersError,
  activeProfileId,
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
  onAddReplyQuickPrompt,
  onUpdateReplyQuickPrompt,
  onRemoveReplyQuickPrompt,
  onSaveReplyQuickPrompts,
  onClearReplyQuickPromptsError,
  appShortcutsPaths,
  appShortcutsError,
  appShortcutsSaving,
  appShortcutsDirty,
  onUpdateAppShortcut,
  onOverrideAppShortcut,
  onResetAppShortcut,
  onSaveAppShortcuts,
  onClearAppShortcutsError,
  sessionNamingScopeDisabled,
  sessionNamingSummary,
  sessionNamingSettings,
  resolvedSessionNaming,
  sessionNamingPaths,
  sessionNamingError,
  sessionNamingSaving,
  sessionNamingDirty,
  sessionNamingPreviewContext,
  onUpdateSessionNamingRule,
  onUpdateSessionNamingList,
  onRenameSessionNamingList,
  onRemoveSessionNamingList,
  onAddSessionNamingList,
  onSaveSessionNaming,
  onClearSessionNamingError,
  actionsRows,
  bindingsByProfile,
  projectActionsPath,
  agentActionsPath,
  quickActionsError,
  quickActionsSaving,
  quickActionsDirty,
  onAddAction,
  onRemoveAction,
  onOverrideAction,
  onResetAction,
  onUpdateAction,
  onSaveActions,
  onAddBinding,
  onRemoveBinding,
  onOverrideBinding,
  onResetBinding,
  onUpdateBinding,
  onClearTerminusError,
  gateScope,
  onSelectGateScope,
  gateStage,
  onSelectGateStage,
  gateScopeDisabled,
  gateSummary,
  gateRows,
  projectGatesPath,
  agentGatesPath,
  gatesError,
  gatesSaving,
  onAddGate,
  onRemoveGate,
  onOverrideGate,
  onResetGate,
  onUpdateGate,
  onSaveGates,
  worktreeLinks,
  worktreeLinksAuto,
  worktreeLinksCandidates,
  worktreeLinksStatusesByPath,
  worktreeLinksConfigPath,
  worktreeLinksLoading,
  worktreeLinksError,
  worktreeLinksDirty,
  onToggleWorktreeLinksAuto,
  onAddWorktreeLink,
  onAddWorktreeLinkFromCandidate,
  onUpdateWorktreeLink,
  onRemoveWorktreeLink,
  onApplyWorktreeLink,
  onApplyAllWorktreeLinks,
  onSaveWorktreeLinks,
  onRefreshWorktreeLinks,
  repoRoot,
  canUseProjectScope,
  canUseAgentScope,
  editorPaneProps,
  sidebarWidth,
  sidebarCollapsed,
  onResizeSidebar,
  onResizeSidebarEnd,
  onToggleSidebar,
  explorerSidebarProps,
  explorerPaneProps,
  memoPaneProps,
  memoSidebarProps,
  hilDrawerOpen,
  hilDrawerPanel,
  onToggleHilDrawer,
  onSelectHilDrawerPanel,
  onOpenHilPromote,
  hilCommentsProps,
  hilDraftsProps,
  hilReplyProps,
  memoDrawerProps,
  attentionRailProps,
  actionSheetsProps,
  onConfigureProfile,
}: AppLayoutProps) {
  const hilSubtitle = explorerPaneProps?.activeRootLabel || explorerSidebarProps?.rootLabel || '';
  const hasSidebar = ['explorer', 'agent-cells', 'hierarchy', 'action-sheets', 'memo'].includes(
    activeView
  );

  const sidebarContent = (
    <AppSidebarContent
      activeView={activeView}
      projectContext={{
        ...explorerSidebarProps,
        projectReady,
        projectError,
        onSelectProject,
        recentProjects,
        onOpenRecentProject,
      }}
      agentCellsProps={{
        cells,
        selectedId,
        onSelect: onSelectCell,
        onCreate: onCreateCell,
        onJump: onJumpToHierarchy,
        onOpenExplorer: onOpenExplorerForCell,
        onOpenFileReference: onOpenAgentCellFileReference,
        onRevealFileReference: onRevealAgentCellFileReference,
        onImportFileReferences: onImportAgentCellFileReferences,
        projectReady,
        projectError,
        onSelectProject,
        recentProjects,
        onOpenRecentProject,
        sessionsByCellId,
        activeSessionByCellId,
        sessionActivityByKey,
        terminusProfiles,
        onSelectSession,
        onCreateSession,
        onDispatchCommand: onDispatchSessionCommand,
        onCloseSession,
        onDetachSession,
        onRenameSession,
        onUpdateSessionAvatar,
        onMoveSessionNode,
        onContinueSessionOnMobile,
        onTrackPendingHarnessRun,
        onClearTrackedHarnessRun,
        onSettleTrackedHarnessRun,
        onFocusSessionInUi,
        onConfigureProfile,
        onArchiveCell,
      }}
      hierarchySidebarProps={{
        section: hierarchySection,
        actionsScope,
        appShortcutsScope,
        replyQuickPromptsScope,
        sessionNamingScope,
        gateScope,
        onSelectActionsScope,
        onSelectHarnessProviders: onOpenHarnessProviders,
        onSelectAppShortcutsScope,
        onSelectReplyQuickPromptsScope,
        onSelectSessionNamingScope,
        onSelectGateScope,
        onSelectSoftlinks: () => onSelectHierarchySection('softlinks'),
        canUseProjectScope,
        canUseAgentScope,
        actionSummary,
        harnessProvidersDirty,
        appShortcutsSummary,
        replyQuickPromptsSummary,
        sessionNamingSummary,
        gateSummary,
      }}
      actionSheetsProps={actionSheetsProps}
      memoSidebarProps={memoSidebarProps}
    />
  );

  return (
    <div className="flex flex-1 overflow-hidden">
      <ActivityBar
        activeView={activeView}
        onSwitchView={onSwitchView}
        sidebarCollapsed={sidebarCollapsed}
        sidebarVisible={hasSidebar}
        onToggleSidebar={onToggleSidebar}
      />

      {hasSidebar ? (
        <SidebarDock
          width={sidebarWidth}
          collapsed={sidebarCollapsed}
          onResize={onResizeSidebar}
          onResizeEnd={onResizeSidebarEnd}
        >
          {sidebarContent}
        </SidebarDock>
      ) : null}

      <div className="relative flex flex-1 overflow-hidden">
        <AppMainPanels
          activeView={activeView}
          hierarchySection={hierarchySection}
          editorPaneProps={editorPaneProps}
          explorerPaneProps={explorerPaneProps}
          memoPaneProps={memoPaneProps}
          actionSheetsProps={actionSheetsProps}
          quickActionsViewProps={{
            actions: actionsRows,
            bindingsByProfile,
            activeProfileId,
            scope: actionsScope,
            onSelectScope: onSelectActionsScope,
            scopeDisabled: actionsScopeDisabled,
            scopePaths: {
              project: projectActionsPath,
              agent: agentActionsPath,
            },
            error: quickActionsError,
            dirty: quickActionsDirty,
            saving: quickActionsSaving,
            onAddAction,
            onRemoveAction,
            onOverrideAction,
            onResetAction,
            onUpdateAction,
            onSaveActions,
            onAddBinding,
            onRemoveBinding,
            onOverrideBinding,
            onResetBinding,
            onUpdateBinding,
            onClearError: onClearTerminusError,
          }}
          harnessProviderSettingsViewProps={{
            codexCliProvider: codexCliProviderSettings,
            settingsPath: harnessSettingsPath,
            error: harnessProvidersError,
            dirty: harnessProvidersDirty,
            saving: harnessProvidersSaving,
            onUpdateCodexCliProvider,
            onSaveSettings: onSaveHarnessProviders,
            onClearError: onClearHarnessProvidersError,
          }}
          appShortcutsViewProps={{
            actions: appShortcutRows,
            scope: appShortcutsScope,
            onSelectScope: onSelectAppShortcutsScope,
            scopeDisabled: appShortcutsScopeDisabled,
            scopePaths: appShortcutsPaths,
            error: appShortcutsError,
            dirty: appShortcutsDirty,
            saving: appShortcutsSaving,
            onUpdateAction: onUpdateAppShortcut,
            onOverrideAction: onOverrideAppShortcut,
            onResetAction: onResetAppShortcut,
            onSave: onSaveAppShortcuts,
            onClearError: onClearAppShortcutsError,
          }}
          replyQuickPromptsViewProps={{
            scope: replyQuickPromptsScope,
            onSelectScope: onSelectReplyQuickPromptsScope,
            scopeDisabled: replyQuickPromptsScopeDisabled,
            scopePaths: replyQuickPromptsPaths,
            prompts: replyQuickPromptsRows,
            resolvedPrompts: resolvedReplyQuickPrompts,
            error: replyQuickPromptsError,
            dirty: replyQuickPromptsDirty,
            saving: replyQuickPromptsSaving,
            onAddPrompt: onAddReplyQuickPrompt,
            onUpdatePrompt: onUpdateReplyQuickPrompt,
            onRemovePrompt: onRemoveReplyQuickPrompt,
            onSavePrompts: onSaveReplyQuickPrompts,
            onClearError: onClearReplyQuickPromptsError,
          }}
          sessionNamingViewProps={{
            scope: sessionNamingScope,
            onSelectScope: onSelectSessionNamingScope,
            scopeDisabled: sessionNamingScopeDisabled,
            scopePaths: sessionNamingPaths,
            settings: sessionNamingSettings,
            resolvedSettings: resolvedSessionNaming,
            error: sessionNamingError,
            dirty: sessionNamingDirty,
            saving: sessionNamingSaving,
            previewContext: sessionNamingPreviewContext,
            onUpdateRule: onUpdateSessionNamingRule,
            onUpdateList: onUpdateSessionNamingList,
            onRenameList: onRenameSessionNamingList,
            onRemoveList: onRemoveSessionNamingList,
            onAddList: onAddSessionNamingList,
            onSave: onSaveSessionNaming,
            onClearError: onClearSessionNamingError,
          }}
          gatesViewProps={{
            gates: gateRows,
            scope: gateScope,
            onSelectScope: onSelectGateScope,
            stage: gateStage,
            scopeDisabled: gateScopeDisabled,
            scopePaths: {
              project: projectGatesPath,
              agent: agentGatesPath,
            },
            error: gatesError,
            saving: gatesSaving,
            onSelectStage: onSelectGateStage,
            onAddGate,
            onRemoveGate,
            onOverrideGate,
            onResetGate,
            onUpdateGate,
            onSaveGates,
          }}
          worktreeLinksViewProps={{
            links: worktreeLinks,
            autoLinkOnCreate: worktreeLinksAuto,
            candidates: worktreeLinksCandidates,
            statusesByPath: worktreeLinksStatusesByPath,
            configPath: worktreeLinksConfigPath,
            selectedCell,
            cells,
            repoRoot,
            loading: worktreeLinksLoading,
            error: worktreeLinksError,
            dirty: worktreeLinksDirty,
            onToggleAuto: onToggleWorktreeLinksAuto,
            onAddLink: onAddWorktreeLink,
            onAddFromCandidate: onAddWorktreeLinkFromCandidate,
            onUpdateLink: onUpdateWorktreeLink,
            onRemoveLink: onRemoveWorktreeLink,
            onApplyLink: onApplyWorktreeLink,
            onApplyAll: onApplyAllWorktreeLinks,
            onSave: onSaveWorktreeLinks,
            onRefresh: onRefreshWorktreeLinks,
          }}
          projectSettingsViewProps={{
            projectRoot,
            projectError,
            projectReady,
            recentProjects,
            tmuxStatus,
            onOpenProject: onSelectProject,
            onOpenRecent: onOpenRecentProject,
            onOpenActions,
            onOpenHarnessProviders,
            onOpenAppShortcuts,
            onOpenReplyQuickPrompts,
            onOpenGates,
            onOpenSoftlinks,
          }}
        />

        <AppAttentionRail {...attentionRailProps} />

        <AppHilPanel
          activeView={activeView}
          hilDrawerOpen={hilDrawerOpen}
          hilDrawerPanel={hilDrawerPanel}
          onToggleHilDrawer={onToggleHilDrawer}
          onSelectHilDrawerPanel={onSelectHilDrawerPanel}
          onOpenHilPromote={onOpenHilPromote}
          hilCommentsProps={hilCommentsProps}
          hilDraftsProps={hilDraftsProps}
          hilReplyProps={hilReplyProps}
          memoDrawerProps={memoDrawerProps}
          hilSubtitle={hilSubtitle}
        />
      </div>
    </div>
  );
}
