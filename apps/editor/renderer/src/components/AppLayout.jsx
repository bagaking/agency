import React from 'react';
import { ActivityBar } from './ActivityBar.jsx';
import { AgentCellsSidebar } from './AgentCellsSidebar.jsx';
import { HierarchySidebar } from './HierarchySidebar.jsx';
import { EditorPane } from './EditorPane.jsx';
import { QuickActionsView } from './QuickActionsView.jsx';
import { GatesView } from './GatesView.jsx';
import { WorktreeLinksView } from './WorktreeLinksView.jsx';

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
}) {
  return (
    <div className="flex flex-1 overflow-hidden">
      <ActivityBar activeView={activeView} onSwitchView={onSwitchView} />

      {activeView === 'explorer' && (
        <AgentCellsSidebar
          cells={cells}
          selectedId={selectedId}
          onSelect={onSelectCell}
          onCreate={onCreateCell}
          onJump={onJumpToHierarchy}
        />
      )}

      {activeView === 'hierarchy' && (
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
      )}

      <div className="relative flex-1 overflow-hidden">
        <div
          className={`absolute inset-0 ${
            activeView === 'hierarchy'
              ? 'opacity-0 invisible pointer-events-none'
              : 'opacity-100 visible'
          }`}
        >
          <EditorPane {...editorPaneProps} />
        </div>

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
      </div>
    </div>
  );
}
