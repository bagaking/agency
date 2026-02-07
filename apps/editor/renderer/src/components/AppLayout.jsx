import React from 'react';
import { ActivityBar } from './ActivityBar.jsx';
import { SidebarDock } from './layout/SidebarDock.jsx';
import { AppSidebarContent } from './layout/AppSidebarContent.jsx';
import { AppMainPanels } from './layout/AppMainPanels.jsx';
import { AppHilPanel } from './layout/AppHilPanel.jsx';

export function AppLayout({
  activeView,
  onSwitchView,
  hierarchySection,
  appShortcutsScope,
  sessionNamingScope,
  onSelectHierarchySection,
  cells,
  selectedId,
  selectedCell,
  onSelectCell,
  onCreateCell,
  onJumpToHierarchy,
  onOpenExplorerForCell,
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
  projectReady,
  projectError,
  projectRoot,
  recentProjects,
  tmuxStatus,
  onSelectProject,
  onOpenRecentProject,
  onOpenActions,
  onOpenAppShortcuts,
  onOpenGates,
  onOpenSoftlinks,
  actionsScope,
  onSelectActionsScope,
  onSelectAppShortcutsScope,
  onSelectSessionNamingScope,
  actionsScopeDisabled,
  actionSummary,
  activeProfileId,
  appShortcutsScopeDisabled,
  appShortcutsSummary,
  appShortcutRows,
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
  actionSheetsProps,
  onConfigureProfile,
}) {
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
        onConfigureProfile,
      }}
      hierarchySidebarProps={{
        section: hierarchySection,
        actionsScope,
        appShortcutsScope,
        sessionNamingScope,
        gateScope,
        onSelectActionsScope,
        onSelectAppShortcutsScope,
        onSelectSessionNamingScope,
        onSelectGateScope,
        onSelectSoftlinks: () => onSelectHierarchySection('softlinks'),
        canUseProjectScope,
        canUseAgentScope,
        actionSummary,
        appShortcutsSummary,
        sessionNamingSummary,
        gateSummary,
      }}
      actionSheetsProps={actionSheetsProps}
      memoSidebarProps={memoSidebarProps}
    />
  );

  return (
    <div className="flex flex-1 overflow-hidden">
      <ActivityBar activeView={activeView} onSwitchView={onSwitchView} />

      {hasSidebar ? (
        <SidebarDock
          width={sidebarWidth}
          collapsed={sidebarCollapsed}
          onResize={onResizeSidebar}
          onResizeEnd={onResizeSidebarEnd}
          onToggleCollapse={onToggleSidebar}
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
          appShortcutsViewProps={{
            actions: appShortcutRows,
            scope: appShortcutsScope,
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
          sessionNamingViewProps={{
            scope: sessionNamingScope,
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
            onOpenAppShortcuts,
            onOpenGates,
            onOpenSoftlinks,
          }}
        />

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
