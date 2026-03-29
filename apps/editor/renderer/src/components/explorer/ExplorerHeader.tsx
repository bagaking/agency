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
import { IconButton } from '../ui/IconButton';
import { focusRing } from '../ui/focusRing';

const focusRingClass = focusRing.sidebar;

export function ExplorerHeader({
  activeRootLabel,
  activeFilterCount,
  activeFilterSummary,
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
  filterMenuOpen,
  filterMenuId,
  filterMenuButtonRef,
  onToggleFilterMenu,
  searchTruncated,
}: any) {
  const contextBits = [activeFilterSummary || ''].filter(Boolean);

  return (
    <header data-testid="explorer-header" className="shrink-0 space-y-3 px-4 py-3 border-b border-border/40 bg-sidebar text-sidebar-foreground">
      <div className="flex items-center justify-between">
        <div className="flex flex-col min-w-0">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">Explorer</h2>
          <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
            <span className="truncate text-xs font-semibold text-foreground">{activeRootLabel}</span>
            {contextBits.length ? (
              <>
                <div className="h-1 w-1 rounded-full bg-primary/70" />
                <span className="truncate text-[9px] font-medium uppercase tracking-[0.16em] text-muted-foreground/[0.55]">
                  {contextBits.join(' · ')}
                </span>
              </>
            ) : null}
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
        <div className="flex items-center gap-2">
            <span className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/[0.4]">
              Scope
            </span>
          <div className="group relative min-w-0 flex-1">
          <select
            aria-label="Active agent cell"
            className={`w-full appearance-none rounded-md border border-border/40 bg-muted/10 px-2 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:border-border/80 cursor-pointer ${focusRingClass}`}
            value={selectedId || ''}
            onChange={(e) => onSelectCell?.(e.target.value)}
          >
            {cells.map((cell) => (
              <option key={cell.id} value={cell.id} className="bg-popover text-foreground">Agent: {cell.name}</option>
            ))}
          </select>
          <ChevronDown size={10} aria-hidden="true" className="absolute right-2 top-2.5 text-muted-foreground/40 pointer-events-none group-hover:text-muted-foreground transition-colors" />
          </div>
        </div>
      )}

      <div className="flex items-center gap-1.5">
        <div className="relative flex-1 group">
          <Search size={12} strokeWidth={2} aria-hidden="true" className="absolute left-2.5 top-2 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
          <input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            name="explorerSearch"
            autoComplete="off"
            placeholder="Search files…"
            aria-label="Search files"
            className={`w-full rounded-full border border-border/40 bg-muted/10 px-8 py-1.5 text-[11px] text-foreground transition-colors placeholder:text-muted-foreground/30 focus:bg-background focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20 ${focusRingClass}`}
          />
          {searchQuery && (
            <button
              type="button"
              className={`absolute right-2.5 top-1.5 text-muted-foreground/40 transition-colors hover:text-foreground ${focusRingClass}`}
              onClick={onClearSearch}
              aria-label="Clear search"
            >
              <X size={12} strokeWidth={1.5} aria-hidden="true" />
            </button>
          )}
        </div>
        <IconButton
          ref={filterMenuButtonRef}
          label="Explorer filters"
          data-testid="explorer-filter-toggle"
          onClick={onToggleFilterMenu}
          aria-controls={filterMenuOpen ? filterMenuId : undefined}
          aria-expanded={filterMenuOpen}
          aria-haspopup="dialog"
          aria-pressed={hasActiveFilters}
          className={`h-7 w-7 rounded-full border transition-colors ${
            hasActiveFilters ? 'border-primary/40 bg-primary/10 text-primary active-tab-glow' : 'border-border/40 text-muted-foreground/50 hover:border-border hover:text-foreground'
          }`}
        >
          <span className="relative inline-flex">
            <Filter size={12} strokeWidth={1.5} aria-hidden="true" />
            {activeFilterCount > 0 ? (
              <span className="absolute -right-2 -top-2 min-w-[0.95rem] rounded-full bg-primary px-1 text-[8px] font-black leading-4 text-primary-foreground shadow-[0_0_0_2px_rgba(31,35,46,1)]">
                {activeFilterCount}
              </span>
            ) : null}
          </span>
        </IconButton>
      </div>

      {searchTruncated && (
        <div className="flex items-center gap-1.5 px-1 text-[10px] text-amber-400/70 italic">
          <Info size={10} aria-hidden="true" /> Search results truncated
        </div>
      )}
    </header>
  );
}

function HeaderButton({ icon: Icon, onClick, title, className = "" }: any) {
  return (
    <IconButton
      label={title}
      focusRing="sidebar"
      onClick={onClick}
      className={`h-7 w-7 rounded-md p-1 text-muted-foreground/70 transition-colors hover:bg-muted/30 hover:text-foreground ${className}`}
    >
      <Icon size={14} strokeWidth={1.5} aria-hidden="true" />
    </IconButton>
  );
}
