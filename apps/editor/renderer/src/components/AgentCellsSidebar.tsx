import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Command, Link2, Plus, SquareTerminal } from 'lucide-react';

import { AgentCellsExplorerPanel } from './agentCells/AgentCellsExplorerPanel';
import { AgentCellsSessionsPanel } from './agentCells/AgentCellsSessionsPanel';

export function AgentCellsSidebar({
  cells,
  selectedId,
  onSelect,
  onCreate,
  projectRoot,
  onJump,
  onOpenExplorer,
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
  onDispatchCommand,
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
  onCreateAttachmentCell,
  onOpenFileReference,
  onRevealFileReference,
  onImportFileReferences,
}: any) {
  const [sidebarBodyHeight, setSidebarBodyHeight] = useState(0);
  const [sidebarTopHeight, setSidebarTopHeight] = useState(0);
  const sidebarBodyRef = useRef<HTMLDivElement | null>(null);
  const sidebarTopRef = useRef<HTMLDivElement | null>(null);

  const selectedCell = useMemo(() => {
    if (!selectedId) {
      return null;
    }
    return (cells || []).find((cell: any) => cell?.id === selectedId) || null;
  }, [cells, selectedId]);

  useEffect(() => {
    const node = sidebarBodyRef.current;
    if (!node) {
      return undefined;
    }

    const syncHeight = () => {
      const nextHeight = Number(node.getBoundingClientRect().height || 0);
      setSidebarBodyHeight(Number.isFinite(nextHeight) ? nextHeight : 0);
    };

    syncHeight();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', syncHeight);
      return () => window.removeEventListener('resize', syncHeight);
    }

    const observer = new ResizeObserver(() => syncHeight());
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const node = sidebarTopRef.current;
    if (!node) {
      return undefined;
    }

    const syncHeight = () => {
      const nextHeight = Number(node.getBoundingClientRect().height || 0);
      setSidebarTopHeight(Number.isFinite(nextHeight) ? nextHeight : 0);
    };

    syncHeight();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', syncHeight);
      return () => window.removeEventListener('resize', syncHeight);
    }

    const observer = new ResizeObserver(() => syncHeight());
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <aside
      className="flex h-full min-h-0 w-full flex-col text-sidebar-foreground"
      data-testid="sidebar"
    >
      <div className="flex items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <span>Agent Cells</span>
        <button
          onClick={onCreate}
          className={`rounded p-1 ${projectReady ? 'hover:bg-muted/50 hover:text-foreground' : 'opacity-40 cursor-not-allowed'}`}
          title={projectReady ? 'New Cell' : 'Select a project to create Cells'}
          data-testid="open-create-cell"
          disabled={!projectReady}
        >
          <Plus size={16} strokeWidth={1.5} />
        </button>
      </div>

      <div ref={sidebarBodyRef} className="flex-1 min-h-0 flex flex-col px-2 pb-2">
        <div ref={sidebarTopRef}>
          <div className="mb-2 px-2 text-xs font-medium text-muted-foreground">CONFIGURATION</div>
          <div className="grid grid-cols-2 gap-1">
            <NavItem
              icon={SquareTerminal}
              label="Terminus"
              onClick={() => onJump?.('actions')}
              disabled={!projectReady}
            />
            <NavItem
              icon={Command}
              label="App Shortcuts"
              onClick={() => onJump?.('app-shortcuts')}
              disabled={!projectReady}
            />
            <NavItem
              icon={Link2}
              label="Softlinks"
              onClick={() => onJump?.('softlinks')}
              disabled={!projectReady}
            />
          </div>
        </div>

        <AgentCellsSessionsPanel
          cells={cells}
          selectedId={selectedId}
          projectRoot={projectRoot}
          onSelect={onSelect}
          onCreateCell={onCreate}
          onOpenExplorer={onOpenExplorer}
          projectReady={projectReady}
          projectError={projectError}
          onSelectProject={onSelectProject}
          recentProjects={recentProjects}
          onOpenRecentProject={onOpenRecentProject}
          sessionsByCellId={sessionsByCellId}
          activeSessionByCellId={activeSessionByCellId}
          sessionActivityByKey={sessionActivityByKey}
          terminusProfiles={terminusProfiles}
          onSelectSession={onSelectSession}
          onCreateSession={onCreateSession}
          onDispatchCommand={onDispatchCommand}
          onCloseSession={onCloseSession}
          onDetachSession={onDetachSession}
          onRenameSession={onRenameSession}
          onUpdateSessionAvatar={onUpdateSessionAvatar}
          onMoveSessionNode={onMoveSessionNode}
          onContinueSessionOnMobile={onContinueSessionOnMobile}
          onTrackPendingHarnessRun={onTrackPendingHarnessRun}
          onClearTrackedHarnessRun={onClearTrackedHarnessRun}
          onSettleTrackedHarnessRun={onSettleTrackedHarnessRun}
          onFocusSessionInUi={onFocusSessionInUi}
          onConfigureProfile={onConfigureProfile}
          onArchiveCell={onArchiveCell}
          onCreateAttachmentCell={onCreateAttachmentCell}
        />

        <AgentCellsExplorerPanel
          projectReady={projectReady}
          selectedCell={selectedCell}
          sidebarBodyHeight={sidebarBodyHeight}
          sidebarTopHeight={sidebarTopHeight}
          onOpenFileReference={onOpenFileReference}
          onRevealFileReference={onRevealFileReference}
          onImportFileReferences={onImportFileReferences}
        />
      </div>
    </aside>
  );
}

function NavItem({ icon: Icon, label, onClick, disabled }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-[11px] transition-colors ${
        disabled
          ? 'cursor-not-allowed text-muted-foreground/50'
          : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
      }`}
    >
      <span className="flex items-center gap-1.5 truncate">
        <Icon size={14} strokeWidth={1.5} className="opacity-70" />
        <span className="truncate">{label}</span>
      </span>
      <ArrowUpRight
        size={12}
        strokeWidth={1.5}
        className={disabled ? 'opacity-30' : 'opacity-50'}
      />
    </button>
  );
}
