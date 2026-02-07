import React from 'react';
import { WorkbenchPane } from '../workbench/WorkbenchPane.jsx';
import { EditorPane } from '../EditorPane.jsx';
import { QuickActionsView } from '../QuickActionsView.jsx';
import { AppShortcutsView } from '../AppShortcutsView.jsx';
import { SessionNamingView } from '../SessionNamingView.jsx';
import { GatesView } from '../GatesView.jsx';
import { WorktreeLinksView } from '../WorktreeLinksView.jsx';
import { ProjectSettingsView } from '../ProjectSettingsView.jsx';
import { HilMemoView } from '../hil/memo/HilMemoView.jsx';
import { ActionSheetsView } from '../actionSheets/ActionSheetsView.jsx';

const paneVisibilityClass = (isVisible) =>
  isVisible ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none';

export function AppMainPanels({
  activeView,
  hierarchySection,
  editorPaneProps,
  explorerPaneProps,
  memoPaneProps,
  actionSheetsProps,
  quickActionsViewProps,
  appShortcutsViewProps,
  sessionNamingViewProps,
  gatesViewProps,
  worktreeLinksViewProps,
  projectSettingsViewProps,
}) {
  return (
    <div className="relative flex-1 overflow-hidden">
      <div className={`absolute inset-0 ${paneVisibilityClass(activeView === 'agent-cells')}`}>
        <EditorPane {...editorPaneProps} />
      </div>

      <div className={`absolute inset-0 ${paneVisibilityClass(activeView === 'explorer')}`}>
        <WorkbenchPane {...explorerPaneProps} />
      </div>

      {activeView === 'memo' ? (
        <div className="absolute inset-0">
          <HilMemoView {...memoPaneProps} />
        </div>
      ) : null}

      {activeView === 'hierarchy' && hierarchySection === 'actions' ? (
        <div className="absolute inset-0">
          <QuickActionsView {...quickActionsViewProps} />
        </div>
      ) : null}

      {activeView === 'hierarchy' && hierarchySection === 'app-shortcuts' ? (
        <div className="absolute inset-0">
          <AppShortcutsView {...appShortcutsViewProps} />
        </div>
      ) : null}

      {activeView === 'hierarchy' && hierarchySection === 'session-naming' ? (
        <div className="absolute inset-0">
          <SessionNamingView {...sessionNamingViewProps} />
        </div>
      ) : null}

      {activeView === 'hierarchy' && hierarchySection === 'gates' ? (
        <div className="absolute inset-0">
          <GatesView {...gatesViewProps} />
        </div>
      ) : null}

      {activeView === 'action-sheets' ? (
        <div className="absolute inset-0">
          <ActionSheetsView {...actionSheetsProps} />
        </div>
      ) : null}

      {activeView === 'hierarchy' && hierarchySection === 'softlinks' ? (
        <div className="absolute inset-0">
          <WorktreeLinksView {...worktreeLinksViewProps} />
        </div>
      ) : null}

      {activeView === 'settings' ? (
        <div className="absolute inset-0">
          <ProjectSettingsView {...projectSettingsViewProps} />
        </div>
      ) : null}
    </div>
  );
}
