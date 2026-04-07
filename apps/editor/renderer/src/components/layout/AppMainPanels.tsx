import React, { Suspense, useRef } from 'react';
import { EditorPane } from '../EditorPane';
import { ProjectHomeView } from '../projectHome/ProjectHomeView';
import { DeferredMount } from '../ui/DeferredMount';
import { lazyNamedComponent } from '../ui/lazyNamedComponent';

const paneVisibilityClass = (isVisible) =>
  isVisible ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none';

const LazyWorkbenchPane = lazyNamedComponent(
  () => import('../workbench/WorkbenchPane'),
  'WorkbenchPane'
);
const LazyHilMemoView = lazyNamedComponent(
  () => import('../hil/memo/HilMemoView'),
  'HilMemoView'
);
const LazyQuickActionsView = lazyNamedComponent(
  () => import('../QuickActionsView'),
  'QuickActionsView'
);
const LazyHarnessProviderSettingsView = lazyNamedComponent(
  () => import('../HarnessProviderSettingsView'),
  'HarnessProviderSettingsView'
);
const LazyAppShortcutsView = lazyNamedComponent(
  () => import('../AppShortcutsView'),
  'AppShortcutsView'
);
const LazyReplyQuickPromptsView = lazyNamedComponent(
  () => import('../ReplyQuickPromptsView'),
  'ReplyQuickPromptsView'
);
const LazySessionNamingView = lazyNamedComponent(
  () => import('../SessionNamingView'),
  'SessionNamingView'
);
const LazyActionSheetsView = lazyNamedComponent(
  () => import('../actionSheets/ActionSheetsView'),
  'ActionSheetsView'
);
const LazyWorktreeLinksView = lazyNamedComponent(
  () => import('../WorktreeLinksView'),
  'WorktreeLinksView'
);
const LazyProjectSettingsView = lazyNamedComponent(
  () => import('../ProjectSettingsView'),
  'ProjectSettingsView'
);
const panelFallback = <div className="absolute inset-0 bg-background" />;

export function AppMainPanels({
  activeView,
  projectHomeVisible,
  projectHomeViewProps,
  hierarchySection,
  editorPaneProps,
  explorerPaneProps,
  memoPaneProps,
  actionSheetsProps,
  quickActionsViewProps,
  harnessProviderSettingsViewProps,
  appShortcutsViewProps,
  replyQuickPromptsViewProps,
  sessionNamingViewProps,
  gatesViewProps,
  worktreeLinksViewProps,
  projectSettingsViewProps,
}: any) {
  const showAgentCellsPane = !projectHomeVisible && activeView === 'agent-cells';
  const showExplorerPane = !projectHomeVisible && activeView === 'explorer';
  const mainPanelsRef = useRef<HTMLDivElement | null>(null);

  return (
    <div ref={mainPanelsRef} data-shell-main-panels className="relative flex-1 overflow-hidden">
      {projectHomeVisible ? (
        <div className="absolute inset-0">
          <ProjectHomeView {...projectHomeViewProps} />
        </div>
      ) : null}
      {showAgentCellsPane ? (
        <div className={`absolute inset-0 ${paneVisibilityClass(true)}`}>
          <EditorPane {...editorPaneProps} />
        </div>
      ) : null}

      {showExplorerPane ? (
        <DeferredMount active={true} strategy="retain">
          <div className={`absolute inset-0 ${paneVisibilityClass(true)}`}>
            <Suspense fallback={panelFallback}>
              <LazyWorkbenchPane {...explorerPaneProps} />
            </Suspense>
          </div>
        </DeferredMount>
      ) : null}

      {activeView === 'memo' ? (
        <div className="absolute inset-0">
          <Suspense fallback={panelFallback}>
            <LazyHilMemoView {...memoPaneProps} />
          </Suspense>
        </div>
      ) : null}

      {activeView === 'hierarchy' && ['actions', 'gates'].includes(hierarchySection) ? (
        <div className="absolute inset-0">
          <Suspense fallback={panelFallback}>
            <LazyQuickActionsView {...quickActionsViewProps} />
          </Suspense>
        </div>
      ) : null}

      {activeView === 'hierarchy' && hierarchySection === 'harness-providers' ? (
        <div className="absolute inset-0">
          <Suspense fallback={panelFallback}>
            <LazyHarnessProviderSettingsView {...harnessProviderSettingsViewProps} />
          </Suspense>
        </div>
      ) : null}

      {activeView === 'hierarchy' && hierarchySection === 'app-shortcuts' ? (
        <div className="absolute inset-0">
          <Suspense fallback={panelFallback}>
            <LazyAppShortcutsView {...appShortcutsViewProps} />
          </Suspense>
        </div>
      ) : null}

      {activeView === 'hierarchy' && hierarchySection === 'reply-quick-prompts' ? (
        <div className="absolute inset-0">
          <Suspense fallback={panelFallback}>
            <LazyReplyQuickPromptsView {...replyQuickPromptsViewProps} />
          </Suspense>
        </div>
      ) : null}

      {activeView === 'hierarchy' && hierarchySection === 'session-naming' ? (
        <div className="absolute inset-0">
          <Suspense fallback={panelFallback}>
            <LazySessionNamingView {...sessionNamingViewProps} />
          </Suspense>
        </div>
      ) : null}

      {activeView === 'action-sheets' ? (
        <div className="absolute inset-0">
          <Suspense fallback={panelFallback}>
            <LazyActionSheetsView {...actionSheetsProps} />
          </Suspense>
        </div>
      ) : null}

      {activeView === 'hierarchy' && hierarchySection === 'softlinks' ? (
        <div className="absolute inset-0">
          <Suspense fallback={panelFallback}>
            <LazyWorktreeLinksView {...worktreeLinksViewProps} />
          </Suspense>
        </div>
      ) : null}

      {activeView === 'settings' ? (
        <div className="absolute inset-0">
          <Suspense fallback={panelFallback}>
            <LazyProjectSettingsView {...projectSettingsViewProps} />
          </Suspense>
        </div>
      ) : null}
    </div>
  );
}
