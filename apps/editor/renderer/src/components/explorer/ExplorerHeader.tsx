import React from 'react';
import { 
  Search, 
  X, 
  Filter, 
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
  headerPrimaryCommands,
  headerSecondaryCommands,
  hasCells,
  cells,
  selectedId,
  onSelectCell,
  workingSetOptions,
  activeWorkingSetViewId,
  onWorkingSetChange,
  searchMode,
  searchModeOptions,
  onSearchModeChange,
  searchQuery,
  onSearchChange,
  onClearSearch,
  hasActiveFilters,
  showFilterMenuButton = true,
  filterMenuOpen,
  filterMenuId,
  filterMenuButtonRef,
  onToggleFilterMenu,
  searchTruncated,
}: any) {
  const contextBits = showFilterMenuButton ? [activeFilterSummary || ''].filter(Boolean) : [];
  const searchModeDescriptors = Array.isArray(searchModeOptions) ? searchModeOptions : [];
  const activeSearchModeDescriptor =
    searchModeDescriptors.find((option) => option.id === searchMode) || searchModeDescriptors[0];
  const searchPlaceholder = activeSearchModeDescriptor?.placeholder || 'Search files…';
  const contextLabel = contextBits.join(' · ');

  return (
    <header
      data-testid="explorer-header"
      className="shrink-0 space-y-1.5 border-b border-border/25 bg-sidebar/80 px-3 py-2 text-sidebar-foreground"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="shrink-0 text-[8px] font-semibold uppercase tracking-[0.26em] text-muted-foreground/46">
              Explorer
            </span>
            <h2 className="truncate text-[13px] font-semibold tracking-[0.01em] text-foreground">
              {activeRootLabel}
            </h2>
            {contextLabel ? (
              <span className="truncate text-[9px] font-medium uppercase tracking-[0.18em] text-muted-foreground/58">
                {contextLabel}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {(Array.isArray(headerPrimaryCommands) ? headerPrimaryCommands : []).map((command) => (
            <HeaderButton
              key={command.id}
              icon={command.icon}
              onClick={command.onSelect}
              title={command.label}
              disabled={command.isDisabled}
              className={command.id === 'explorer.refresh' && command.spinning ? 'animate-spin' : ''}
            />
          ))}
        </div>
      </div>

      {(hasCells || (Array.isArray(workingSetOptions) && workingSetOptions.length > 1)) && (
        <div className="flex items-center gap-2">
          {hasCells ? (
            <div className="group relative min-w-0 flex-1">
              <select
                aria-label="Active cell"
                className={`w-full appearance-none rounded-md border border-border/40 bg-muted/10 px-2 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:border-border/80 cursor-pointer ${focusRingClass}`}
                value={selectedId || ''}
                onChange={(e) => onSelectCell?.(e.target.value)}
              >
                {cells.map((cell) => (
                  <option key={cell.id} value={cell.id} className="bg-popover text-foreground">
                    {cell.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={10}
                aria-hidden="true"
                className="absolute right-2 top-2.5 text-muted-foreground/40 pointer-events-none group-hover:text-muted-foreground transition-colors"
              />
            </div>
          ) : null}
          {Array.isArray(workingSetOptions) && workingSetOptions.length > 1 ? (
            <div className="inline-flex gap-1 rounded-full border border-border/30 bg-muted/5 px-1.5 py-0.5">
              {workingSetOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onWorkingSetChange?.(option.id)}
                  className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.25em] transition-colors ${focusRingClass} ${
                    activeWorkingSetViewId === option.id
                      ? 'bg-foreground/10 text-foreground'
                      : 'text-muted-foreground/60 hover:text-foreground'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      )}

      <div className="flex items-center gap-1.5">
        {(Array.isArray(headerSecondaryCommands) ? headerSecondaryCommands : []).map((command) => (
          <SecondaryHeaderAction
            key={command.id}
            icon={command.icon}
            label={command.label}
            onClick={command.onSelect}
            disabled={command.isDisabled}
          />
        ))}
        {searchModeDescriptors.length ? (
          <div className="inline-flex gap-1 rounded-full border border-border/30 bg-muted/5 px-1.5 py-0.5">
            {searchModeDescriptors.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => onSearchModeChange?.(option.id)}
                className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.25em] transition-colors ${focusRingClass} ${
                  searchMode === option.id
                    ? 'bg-foreground/10 text-foreground'
                    : 'text-muted-foreground/60 hover:text-foreground'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}
        <div className="relative flex-1 min-w-0 group">
          <Search size={12} strokeWidth={2} aria-hidden="true" className="absolute left-2.5 top-2 text-muted-foreground/40 group-focus-within:text-muted-foreground/70 transition-colors" />
          <input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            name="explorerSearch"
            autoComplete="off"
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className={`w-full rounded-full border border-border/30 bg-sidebar/70 px-8 py-1.5 text-[11px] text-foreground transition-colors placeholder:text-muted-foreground/40 focus:bg-sidebar/90 focus:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/15 ${focusRingClass}`}
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
        {showFilterMenuButton ? (
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
              hasActiveFilters
                ? 'border-border/60 bg-muted/20 text-primary'
                : 'border-border/40 text-muted-foreground/55 hover:border-border/70 hover:text-foreground'
            }`}
          >
            <span className="relative inline-flex">
              <Filter size={12} strokeWidth={1.5} aria-hidden="true" />
              {activeFilterCount > 0 ? (
                <span className="absolute -right-2 -top-2 min-w-[0.95rem] rounded-full bg-primary/80 px-1 text-[7px] font-semibold leading-4 text-primary-foreground shadow-[0_0_0_1px_rgba(31,35,46,0.4)]">
                  {activeFilterCount}
                </span>
              ) : null}
            </span>
          </IconButton>
        ) : null}
      </div>

      {searchTruncated && (
        <div className="flex items-center gap-1.5 px-1 text-[10px] text-amber-300/80 italic">
          <Info size={10} aria-hidden="true" /> Search results truncated
        </div>
      )}
    </header>
  );
}

function HeaderButton({ icon: Icon, onClick, title, className = "", disabled = false }: any) {
  return (
    <IconButton
      label={title}
      focusRing="sidebar"
      onClick={onClick}
      disabled={disabled}
      className={`h-7 w-7 rounded-md p-1 text-muted-foreground/70 transition-colors hover:bg-muted/30 hover:text-foreground disabled:opacity-40 ${className}`}
    >
      <Icon size={14} strokeWidth={1.5} aria-hidden="true" />
    </IconButton>
  );
}

function SecondaryHeaderAction({
  icon: Icon,
  label,
  onClick,
  disabled = false,
}: any) {
  return (
    <IconButton
      label={label}
      focusRing="sidebar"
      onClick={onClick}
      disabled={disabled}
      className={`h-7 w-7 rounded-full border border-border/30 bg-muted/5 p-1 text-muted-foreground/60 transition-colors hover:border-border hover:bg-muted/10 hover:text-foreground disabled:opacity-35 ${focusRingClass}`}
    >
      <Icon size={12} strokeWidth={1.7} aria-hidden="true" />
    </IconButton>
  );
}
