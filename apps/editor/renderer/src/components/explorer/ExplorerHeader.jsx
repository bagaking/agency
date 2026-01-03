import React from 'react';
import { 
  FilePlus2, 
  FolderPlus, 
  RefreshCw, 
  Search, 
  X, 
  Filter, 
  Layers, 
  ChevronDown, 
  Info 
} from 'lucide-react';
import { Tooltip } from '../ui/Tooltip.jsx';

export function ExplorerHeader({
  activeRootLabel,
  onJumpToAgents,
  onNewFile,
  onNewFolder,
  onRefresh,
  isLoading,
  hasCells,
  cells,
  selectedId,
  onSelectCell,
  searchQuery,
  onSearchChange,
  onClearSearch,
  hasActiveFilters,
  onToggleFilterMenu,
  searchTruncated,
  selectionCount,
  onCopyPaths,
  onDeleteSelection,
  onClearSelection,
}) {
  return (
    <header data-testid="explorer-header" className="shrink-0 space-y-3 px-4 py-3 border-b border-border/40 bg-sidebar text-sidebar-foreground">
      <div className="flex items-center justify-between">
        <div className="flex flex-col min-w-0">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">Explorer</h2>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs font-semibold text-foreground truncate">{activeRootLabel}</span>
            <div className="h-1 w-1 rounded-full bg-primary/80" />
          </div>
        </div>
        <div className="flex items-center gap-1">
          <HeaderButton icon={Layers} onClick={onJumpToAgents} title="Go to Agent Cells" />
          <HeaderButton icon={FilePlus2} onClick={onNewFile} title="New File" />
          <HeaderButton icon={FolderPlus} onClick={onNewFolder} title="New Folder" />
          <HeaderButton 
            icon={RefreshCw} 
            onClick={onRefresh} 
            title="Refresh" 
            className={isLoading ? "animate-spin" : ""} 
          />
        </div>
      </div>

      {hasCells && (
        <div className="group relative">
          <select
            className="w-full appearance-none rounded border border-border/40 bg-muted/10 px-2 py-1.5 text-[11px] font-medium text-foreground transition-all focus:border-primary/50 focus:outline-none hover:border-border/80 cursor-pointer"
            value={selectedId || ''}
            onChange={(e) => onSelectCell?.(e.target.value)}
          >
            {cells.map((cell) => (
              <option key={cell.id} value={cell.id} className="bg-popover text-foreground">Agent: {cell.name}</option>
            ))}
          </select>
          <ChevronDown size={10} className="absolute right-2 top-2.5 text-muted-foreground/40 pointer-events-none group-hover:text-muted-foreground transition-colors" />
        </div>
      )}

      <div className="flex items-center gap-1.5">
        <div className="relative flex-1 group">
          <Search size={12} strokeWidth={2} className="absolute left-2.5 top-2 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
          <input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search files..."
            className="w-full rounded-full border border-border/40 bg-muted/10 px-8 py-1.5 text-[11px] text-foreground transition-all placeholder:text-muted-foreground/30 focus:bg-background focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
          />
          {searchQuery && (
            <button className="absolute right-2.5 top-1.5 text-muted-foreground/40 hover:text-foreground" onClick={onClearSearch}>
              <X size={12} strokeWidth={1.5} />
            </button>
          )}
        </div>
        <Tooltip label="Explorer filters">
          <button
            className={`flex h-7 w-7 items-center justify-center rounded-full border transition-all ${
              hasActiveFilters ? 'border-primary/40 bg-primary/10 text-primary active-tab-glow' : 'border-border/40 text-muted-foreground/50 hover:border-border hover:text-foreground'
            }`}
            onClick={onToggleFilterMenu}
          >
            <Filter size={12} strokeWidth={1.5} />
          </button>
        </Tooltip>
      </div>

      {searchTruncated && (
        <div className="flex items-center gap-1.5 px-1 text-[10px] text-amber-400/70 italic">
          <Info size={10} /> Search results truncated
        </div>
      )}
    </header>
  );
}

function HeaderButton({ icon: Icon, onClick, title, className = "" }) {
  return (
    <Tooltip label={title}>
      <button
        type="button"
        className={`p-1 text-muted-foreground/60 hover:text-foreground transition-colors rounded hover:bg-muted/30 ${className}`}
        onClick={onClick}
        aria-label={title}
      >
        <Icon size={14} strokeWidth={1.5} />
      </button>
    </Tooltip>
  );
}

function SelectionAction({ children, onClick, variant }) {
  return (
    <button
      type="button"
      className={`rounded border px-2 py-0.5 text-[10px] transition-colors ${
        variant === 'destructive' 
          ? 'border-rose-500/40 text-rose-300 hover:text-rose-200 hover:bg-rose-500/10' 
          : 'border-border/60 hover:text-foreground hover:bg-white/5'
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
