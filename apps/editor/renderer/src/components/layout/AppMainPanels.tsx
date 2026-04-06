import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { EditorPane } from '../EditorPane';
import { ProjectHomeView } from '../projectHome/ProjectHomeView';
import { DeferredMount } from '../ui/DeferredMount';
import { lazyNamedComponent } from '../ui/lazyNamedComponent';
import { useWorkbenchBrowserSurface } from '../workbench/useWorkbenchBrowserSurface';

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
  const browserLaneMeta = explorerPaneProps?.browserLaneMeta || null;
  const handleBrowserLaneSurfaceStateChange =
    explorerPaneProps?.onBrowserLaneSurfaceStateChange || null;

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
            {browserLaneMeta?.tabId ? (
              <ShellBrowserLaneSurface
                mainPanelsRef={mainPanelsRef}
                browserLaneMeta={browserLaneMeta}
                onSurfaceStateChange={handleBrowserLaneSurfaceStateChange}
              />
            ) : null}
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

function ShellBrowserLaneSurface({
  mainPanelsRef,
  browserLaneMeta,
  onSurfaceStateChange,
}: {
  mainPanelsRef: React.MutableRefObject<HTMLDivElement | null>;
  browserLaneMeta: any;
  onSurfaceStateChange?: ((cellId: string, update: any) => void) | null;
}) {
  const slotRect = browserLaneMeta?.rect || null;
  const mainPanelsRect = mainPanelsRef.current?.getBoundingClientRect?.() || null;
  const relativeRect = useMemo(() => {
    if (!slotRect || !mainPanelsRect) {
      return null;
    }
    return {
      left: Math.round(slotRect.x - mainPanelsRect.left),
      top: Math.round(slotRect.y - mainPanelsRect.top),
      width: Math.round(slotRect.width),
      height: Math.round(slotRect.height),
    };
  }, [mainPanelsRect, slotRect]);
  const browserSurface = useWorkbenchBrowserSurface({
    tabId: String(browserLaneMeta?.tabId || ''),
    url: String(browserLaneMeta?.url || ''),
    visible:
      Boolean(browserLaneMeta?.visible) &&
      !Boolean(browserLaneMeta?.suspended) &&
      Boolean(relativeRect?.width) &&
      Boolean(relativeRect?.height),
    navigationKey: Number(browserLaneMeta?.navigationKey || 0),
    disposeOnUnmount: false,
  });

  useEffect(() => {
    if (!browserLaneMeta?.cellId || !onSurfaceStateChange) {
      return;
    }
    onSurfaceStateChange(browserLaneMeta.cellId, {
      browserSurfaceAvailable: browserSurface.browserSurfaceAvailable,
      surfaceState: browserSurface.surfaceState,
    });
  }, [
    browserLaneMeta?.cellId,
    browserSurface.browserSurfaceAvailable,
    browserSurface.surfaceState,
    onSurfaceStateChange,
  ]);

  if (!relativeRect) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute"
      style={{
        left: `${relativeRect.left}px`,
        top: `${relativeRect.top}px`,
        width: `${relativeRect.width}px`,
        height: `${relativeRect.height}px`,
      }}
    >
      <div ref={browserSurface.hostRef} className="absolute inset-0" />
    </div>
  );
}
