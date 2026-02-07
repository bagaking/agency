import React from 'react';
import { AgentCellsSidebar } from '../AgentCellsSidebar';
import { HierarchySidebar } from '../HierarchySidebar';
import { ProjectExplorerSidebar } from '../explorer/ProjectExplorerSidebar';
import { ActionSheetsSidebar } from '../actionSheets/ActionSheetsSidebar';
import { HilMemoSidebar } from '../hil/memo/HilMemoSidebar';

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
      <ProjectExplorerSidebar
        {...projectContext}
      />
    );
  }

  if (activeView === 'agent-cells') {
    return <AgentCellsSidebar {...agentCellsProps} />;
  }

  if (activeView === 'hierarchy') {
    return <HierarchySidebar {...hierarchySidebarProps} />;
  }

  if (activeView === 'action-sheets') {
    return <ActionSheetsSidebar {...actionSheetsProps} />;
  }

  if (activeView === 'memo') {
    return <HilMemoSidebar {...memoSidebarProps} />;
  }

  return null;
}
