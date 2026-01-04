import React from 'react';
import { ActivityBar } from './ActivityBar.jsx';
import { AgentCellsSidebar } from './AgentCellsSidebar.jsx';
import { HierarchySidebar } from './HierarchySidebar.jsx';
import { ProjectExplorerSidebar } from './explorer/ProjectExplorerSidebar.jsx';
import { WorkbenchPane } from './workbench/WorkbenchPane.jsx';
import { EditorPane } from './EditorPane.jsx';
import { QuickActionsView } from './QuickActionsView.jsx';
import { GatesView } from './GatesView.jsx';
import { WorktreeLinksView } from './WorktreeLinksView.jsx';
import { SidebarDock } from './layout/SidebarDock.jsx';
import { ProjectSettingsView } from './ProjectSettingsView.jsx';
import { HilDrawer } from './hil/HilDrawer.jsx';
import { HilCommentsPanel } from './hil/HilCommentsPanel.jsx';
import { HilDraftsPanel } from './hil/HilDraftsPanel.jsx';
import { HilMemoDrawer } from './hil/HilMemoDrawer.jsx';
import { HilMemoView } from './hil/memo/HilMemoView.jsx';
import { HilMemoSidebar } from './hil/memo/HilMemoSidebar.jsx';
import { ActionSheetsView } from './actionSheets/ActionSheetsView.jsx';
import { ActionSheetsSidebar } from './actionSheets/ActionSheetsSidebar.jsx';

export function AppLayout({
  activeView,
  onSwitchView,
  hierarchySection,
  onSelectHierarchySection,
  cells,
  selectedId,
  selectedCell,
  onSelectCell,
  onCreateCell,
  onJumpToHierarchy,
  onOpenExplorerForCell,
  projectReady,
  projectError,
  projectRoot,
  recentProjects,
  tmuxStatus,
  onSelectProject,
  onOpenRecentProject,
  onOpenActions,
  onOpenGates,
  onOpenSoftlinks,
  actionsScope,
  onSelectActionsScope,
  actionsScopeDisabled,
  actionSummary,
  actionsRows,
  projectActionsPath,
  agentActionsPath,
  quickActionsError,
  quickActionsSaving,
  onAddAction,
  onRemoveAction,
  onOverrideAction,
  onResetAction,
  onUpdateAction,
  onSaveActions,
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
  memoDrawerProps,
  actionSheetsProps,
}) {
  const hilSubtitle = explorerPaneProps?.activeRootLabel || explorerSidebarProps?.rootLabel || '';
  const isMemoView = activeView === 'memo';
  const hilDrawerPanels = isMemoView
    ? []
    : [
        { id: 'comments', label: 'Comments' },
        { id: 'drafts', label: 'Drafts' },
      ];
  const hilDrawerTitle = isMemoView
    ? 'Memo Inbox'
    : hilDrawerPanel === 'drafts'
      ? 'HIL Drafts'
      : 'Neural Comments';
  const hilDrawerSubtitle = isMemoView ? 'Shortcuts' : hilSubtitle;
  const activeSidebar =
    activeView === 'explorer' ? (
      <ProjectExplorerSidebar
        {...explorerSidebarProps}
        projectReady={projectReady}
        projectError={projectError}
        onSelectProject={onSelectProject}
        recentProjects={recentProjects}
        onOpenRecentProject={onOpenRecentProject}
      />
    ) : activeView === 'agent-cells' ? (
      <AgentCellsSidebar
        cells={cells}
        selectedId={selectedId}
        onSelect={onSelectCell}
        onCreate={onCreateCell}
        onJump={onJumpToHierarchy}
        onOpenExplorer={onOpenExplorerForCell}
        projectReady={projectReady}
        projectError={projectError}
        onSelectProject={onSelectProject}
        recentProjects={recentProjects}
        onOpenRecentProject={onOpenRecentProject}
      />
    ) : activeView === 'hierarchy' ? (
      <HierarchySidebar
        section={hierarchySection}
        actionsScope={actionsScope}
        gateScope={gateScope}
        onSelectActionsScope={onSelectActionsScope}
        onSelectGateScope={onSelectGateScope}
        onSelectSoftlinks={() => onSelectHierarchySection('softlinks')}
        canUseProjectScope={canUseProjectScope}
        canUseAgentScope={canUseAgentScope}
        actionSummary={actionSummary}
        gateSummary={gateSummary}
      />
    ) : activeView === 'action-sheets' ? (
      <ActionSheetsSidebar {...actionSheetsProps} />
    ) : activeView === 'memo' ? (
      <HilMemoSidebar {...memoSidebarProps} />
    ) : null;
  return (
    <div className="flex flex-1 overflow-hidden">
      <ActivityBar activeView={activeView} onSwitchView={onSwitchView} />

      {activeSidebar ? (
        <SidebarDock
          width={sidebarWidth}
          collapsed={sidebarCollapsed}
          onResize={onResizeSidebar}
          onResizeEnd={onResizeSidebarEnd}
          onToggleCollapse={onToggleSidebar}
        >
          {activeSidebar}
        </SidebarDock>
      ) : null}

      <div className="relative flex-1 overflow-hidden flex">
        <div className="relative flex-1 overflow-hidden">
          <div
            className={`absolute inset-0 ${
              activeView === 'agent-cells'
                ? 'opacity-100 visible'
                : 'opacity-0 invisible pointer-events-none'
            }`}
          >
            <EditorPane {...editorPaneProps} />
          </div>

          <div
            className={`absolute inset-0 ${
              activeView === 'explorer'
                ? 'opacity-100 visible'
                : 'opacity-0 invisible pointer-events-none'
            }`}
          >
            <WorkbenchPane {...explorerPaneProps} />
          </div>

          {activeView === 'memo' ? (
            <div className="absolute inset-0">
              <HilMemoView {...memoPaneProps} />
            </div>
          ) : null}

          {activeView === 'hierarchy' && hierarchySection === 'actions' ? (
            <div className="absolute inset-0">
              <QuickActionsView
                actions={actionsRows}
                scope={actionsScope}
                scopeDisabled={actionsScopeDisabled}
                scopePaths={{
                  project: projectActionsPath,
                  agent: agentActionsPath,
                }}
                error={quickActionsError}
                saving={quickActionsSaving}
                onAddAction={onAddAction}
                onRemoveAction={onRemoveAction}
                onOverrideAction={onOverrideAction}
                onResetAction={onResetAction}
                onUpdateAction={onUpdateAction}
                onSaveActions={onSaveActions}
              />
            </div>
          ) : null}

          {activeView === 'hierarchy' && hierarchySection === 'gates' ? (
            <div className="absolute inset-0">
              <GatesView
                gates={gateRows}
                scope={gateScope}
                stage={gateStage}
                scopeDisabled={gateScopeDisabled}
                scopePaths={{
                  project: projectGatesPath,
                  agent: agentGatesPath,
                }}
                error={gatesError}
                saving={gatesSaving}
                onSelectStage={onSelectGateStage}
                onAddGate={onAddGate}
                onRemoveGate={onRemoveGate}
                onOverrideGate={onOverrideGate}
                onResetGate={onResetGate}
                onUpdateGate={onUpdateGate}
                onSaveGates={onSaveGates}
              />
            </div>
          ) : null}

          {activeView === 'action-sheets' ? (
            <div className="absolute inset-0">
              <ActionSheetsView {...actionSheetsProps} />
            </div>
          ) : null}

          {activeView === 'hierarchy' && hierarchySection === 'softlinks' ? (
            <div className="absolute inset-0">
              <WorktreeLinksView
                links={worktreeLinks}
                autoLinkOnCreate={worktreeLinksAuto}
                candidates={worktreeLinksCandidates}
                statusesByPath={worktreeLinksStatusesByPath}
                configPath={worktreeLinksConfigPath}
                selectedCell={selectedCell}
                cells={cells}
                repoRoot={repoRoot}
                loading={worktreeLinksLoading}
                error={worktreeLinksError}
                dirty={worktreeLinksDirty}
                onToggleAuto={onToggleWorktreeLinksAuto}
                onAddLink={onAddWorktreeLink}
                onAddFromCandidate={onAddWorktreeLinkFromCandidate}
                onUpdateLink={onUpdateWorktreeLink}
                onRemoveLink={onRemoveWorktreeLink}
                onApplyLink={onApplyWorktreeLink}
                onApplyAll={onApplyAllWorktreeLinks}
                onSave={onSaveWorktreeLinks}
                onRefresh={onRefreshWorktreeLinks}
              />
            </div>
          ) : null}

          {activeView === 'settings' ? (
            <div className="absolute inset-0">
              <ProjectSettingsView
                projectRoot={projectRoot}
                projectError={projectError}
                projectReady={projectReady}
                recentProjects={recentProjects}
                tmuxStatus={tmuxStatus}
                onOpenProject={onSelectProject}
                onOpenRecent={onOpenRecentProject}
                onOpenActions={onOpenActions}
                onOpenGates={onOpenGates}
                onOpenSoftlinks={onOpenSoftlinks}
              />
            </div>
          ) : null}
        </div>

        <HilDrawer
          open={hilDrawerOpen}
          activePanel={hilDrawerPanel}
          onToggle={onToggleHilDrawer}
          onSelectPanel={onSelectHilDrawerPanel}
          onOpenPromote={onOpenHilPromote}
          panels={hilDrawerPanels}
          title={hilDrawerTitle}
          subtitle={hilDrawerSubtitle}
        >
          {isMemoView ? (
            <HilMemoDrawer {...memoDrawerProps} />
          ) : hilDrawerPanel === 'comments' ? (
            <HilCommentsPanel {...hilCommentsProps} />
          ) : hilDrawerPanel === 'drafts' ? (
            <HilDraftsPanel {...hilDraftsProps} />
          ) : null}
        </HilDrawer>
      </div>
    </div>
  );
}
