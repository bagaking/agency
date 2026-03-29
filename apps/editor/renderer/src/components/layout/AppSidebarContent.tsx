import React, { Suspense } from 'react';
import { AgentCellsSidebar } from '../AgentCellsSidebar';
import { lazyNamedComponent } from '../ui/lazyNamedComponent';

const LazyHierarchySidebar = lazyNamedComponent(
  () => import('../HierarchySidebar'),
  'HierarchySidebar'
);
const LazyProjectExplorerSidebar = lazyNamedComponent(
  () => import('../explorer/ProjectExplorerSidebar'),
  'ProjectExplorerSidebar'
);
const LazyActionSheetsSidebar = lazyNamedComponent(
  () => import('../actionSheets/ActionSheetsSidebar'),
  'ActionSheetsSidebar'
);
const LazyHilMemoSidebar = lazyNamedComponent(
  () => import('../hil/memo/HilMemoSidebar'),
  'HilMemoSidebar'
);

const sidebarFallback = <div className="h-full w-full bg-sidebar" />;

export function AppSidebarContent({
  activeView,
  projectContext,
  agentCellsProps,
  hierarchySidebarProps,
  actionSheetsProps,
  memoSidebarProps,
}: any) {
  if (activeView === 'explorer') {
    return (
      <Suspense fallback={sidebarFallback}>
        <LazyProjectExplorerSidebar
          {...projectContext}
        />
      </Suspense>
    );
  }

  if (activeView === 'agent-cells') {
    return <AgentCellsSidebar {...agentCellsProps} />;
  }

  if (activeView === 'hierarchy') {
    return (
      <Suspense fallback={sidebarFallback}>
        <LazyHierarchySidebar {...hierarchySidebarProps} />
      </Suspense>
    );
  }

  if (activeView === 'action-sheets') {
    return (
      <Suspense fallback={sidebarFallback}>
        <LazyActionSheetsSidebar {...actionSheetsProps} />
      </Suspense>
    );
  }

  if (activeView === 'memo') {
    return (
      <Suspense fallback={sidebarFallback}>
        <LazyHilMemoSidebar {...memoSidebarProps} />
      </Suspense>
    );
  }

  return null;
}
