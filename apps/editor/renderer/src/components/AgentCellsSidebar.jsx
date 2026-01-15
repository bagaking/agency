import React from 'react';
import {
  Plus,
  GitBranch,
  Circle,
  SquareTerminal,
  Link2,
  ShieldCheck,
  ArrowUpRight,
  FolderOpen,
} from 'lucide-react';
import { RecentProjectsList } from './RecentProjectsList.jsx';

const statusColors = {
  draft: 'text-muted-foreground',
  active: 'text-emerald-400',
  paused: 'text-amber-400',
  archived: 'text-slate-500',
};

export function AgentCellsSidebar({
  cells,
  selectedId,
  onSelect,
  onCreate,
  onJump,
  onOpenExplorer,
  projectReady,
  projectError,
  onSelectProject,
  recentProjects,
  onOpenRecentProject,
}) {
  return (
    <aside className="flex w-full flex-col text-sidebar-foreground" data-testid="sidebar">
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

      <div className="flex-1 overflow-y-auto px-2">
        <div className="mb-2 px-2 text-xs font-medium text-muted-foreground">CONFIGURATION</div>
        <div className="grid grid-cols-2 gap-1">
          <NavItem
            icon={SquareTerminal}
            label="Terminus"
            onClick={() => onJump?.('actions')}
            disabled={!projectReady}
          />
          <NavItem
            icon={ShieldCheck}
            label="Gates"
            onClick={() => onJump?.('gates')}
            disabled={!projectReady}
          />
          <NavItem
            icon={Link2}
            label="Softlinks"
            onClick={() => onJump?.('softlinks')}
            disabled={!projectReady}
          />
        </div>

        <div className="mb-2 mt-4 px-2 text-xs font-medium text-muted-foreground">AGENTS</div>
        {!projectReady ? (
          <>
            <div className="mb-3 rounded-lg border border-dashed border-border px-3 py-3 text-[11px] text-muted-foreground">
              <div className="font-medium text-foreground">No project selected</div>
              <div className="mt-1">Choose a project directory to load Cells.</div>
              {projectError ? (
                <div className="mt-2 text-rose-300">{projectError}</div>
              ) : null}
              <button
                type="button"
                onClick={onSelectProject}
                className="mt-3 inline-flex items-center gap-2 rounded-full border border-primary/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary transition-colors hover:bg-primary/10"
              >
                Select Project
              </button>
            </div>
            <RecentProjectsList
              projects={recentProjects}
              onOpen={onOpenRecentProject}
              title="Recent Projects"
              emptyLabel="No recent projects yet"
            />
          </>
        ) : null}
        {cells.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-muted-foreground">
            No active cells
          </div>
        ) : (
          <div className="space-y-0.5" data-testid="cell-list">
            {cells.map((cell) => (
              <CellItem
                key={cell.id}
                cell={cell}
                selected={selectedId === cell.id}
                onClick={() => onSelect(cell.id)}
                onOpenExplorer={() => onOpenExplorer?.(cell.id)}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

function NavItem({ icon: Icon, label, onClick, disabled }) {
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
      <ArrowUpRight size={12} strokeWidth={1.5} className={disabled ? 'opacity-30' : 'opacity-50'} />
    </button>
  );
}

function CellItem({ cell, selected, onClick, onOpenExplorer }) {
  const Icon = cell.isVirtual ? SquareTerminal : GitBranch;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick?.();
        }
      }}
      data-testid={`cell-item-${cell.id}`}
      className={`group flex w-full items-center gap-2 rounded px-2 py-1 text-sm transition-colors ${
        selected
          ? 'bg-primary/10 text-foreground'
          : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
      }`}
    >
      <Icon size={14} strokeWidth={1.5} className={selected ? 'text-primary' : 'opacity-70'} />
      <span className="truncate">{cell.name}</span>
      <div className="ml-auto flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
        {!cell.isVirtual ? (
          <>
            <button
              type="button"
              className="rounded p-1 text-muted-foreground/60 hover:text-foreground hover:bg-muted/30"
              onClick={(event) => {
                event.stopPropagation();
                onOpenExplorer?.();
              }}
              title="Open in Explorer"
            >
              <FolderOpen size={12} strokeWidth={1.5} />
            </button>
            <Circle
              size={8}
              className={statusColors[cell.state] || statusColors.draft}
              fill="currentColor"
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
