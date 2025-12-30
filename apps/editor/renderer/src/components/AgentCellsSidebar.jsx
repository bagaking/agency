import React from 'react';
import { Plus, GitBranch, Circle, Command, Link2, ShieldCheck, ArrowUpRight } from 'lucide-react';

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
}) {
  return (
    <aside className="flex w-full flex-col text-sidebar-foreground" data-testid="sidebar">
      <div className="flex items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <span>Agent Cells</span>
        <button
          onClick={onCreate}
          className="rounded p-1 hover:bg-muted/50 hover:text-foreground"
          title="New Cell"
          data-testid="open-create-cell"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        <div className="mb-2 px-2 text-xs font-medium text-muted-foreground">CONFIGURATION</div>
        <div className="grid grid-cols-2 gap-1">
          <NavItem icon={Command} label="Actions" onClick={() => onJump?.('actions')} />
          <NavItem icon={ShieldCheck} label="Gates" onClick={() => onJump?.('gates')} />
          <NavItem icon={Link2} label="Softlinks" onClick={() => onJump?.('softlinks')} />
        </div>

        <div className="mb-2 mt-4 px-2 text-xs font-medium text-muted-foreground">AGENTS</div>
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
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

function NavItem({ icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
    >
      <span className="flex items-center gap-1.5 truncate">
        <Icon size={14} className="opacity-70" />
        <span className="truncate">{label}</span>
      </span>
      <ArrowUpRight size={12} className="opacity-50" />
    </button>
  );
}

function CellItem({ cell, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={`cell-item-${cell.id}`}
      className={`group flex w-full items-center gap-2 rounded px-2 py-1 text-sm transition-colors ${
        selected
          ? 'bg-primary/10 text-foreground'
          : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
      }`}
    >
      <GitBranch size={14} className={selected ? 'text-primary' : 'opacity-70'} />
      <span className="truncate">{cell.name}</span>
      <div className="ml-auto opacity-0 transition-opacity group-hover:opacity-100">
        <Circle
          size={8}
          className={statusColors[cell.state] || statusColors.draft}
          fill="currentColor"
        />
      </div>
    </button>
  );
}
