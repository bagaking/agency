import React, { useEffect, useRef } from 'react';
import { 
  Link2,
  Globe2,
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
  headerCommands,
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
  searchInputType = 'text',
  searchSubmitLabel,
  searchSubmitBusyLabel,
  searchSubmitPending = false,
  searchSubmitDisabled = false,
  onSearchSubmit,
  showUrlAffordance = false,
  urlAffordanceDisabled = false,
  urlAffordanceLabel = 'Open Web',
  onUrlAffordance,
  searchInputAutoFocusKey,
  hasActiveFilters,
  showFilterMenuButton = true,
  filterMenuOpen,
  filterMenuId,
  filterMenuButtonRef,
  onToggleFilterMenu,
  searchTruncated,
}: any) {
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const contextBits = showFilterMenuButton ? [activeFilterSummary || ''].filter(Boolean) : [];
  const searchModeDescriptors = Array.isArray(searchModeOptions) ? searchModeOptions : [];
  const activeSearchModeDescriptor =
    searchModeDescriptors.find((option) => option.id === searchMode) || searchModeDescriptors[0];
  const searchPlaceholder = activeSearchModeDescriptor?.placeholder || 'Search files…';
  const SearchLeadingIcon = searchInputType === 'url' ? Link2 : Search;
  const hasExplicitSearchSubmit = typeof onSearchSubmit === 'function' && Boolean(searchSubmitLabel);
  const inlineSearchAction = showUrlAffordance
    ? {
        label: urlAffordanceLabel,
        disabled: urlAffordanceDisabled,
        onClick: () => onUrlAffordance?.(),
        tone: 'secondary' as const,
        icon: Globe2,
      }
    : hasExplicitSearchSubmit
      ? {
          label: searchSubmitPending ? searchSubmitBusyLabel || searchSubmitLabel : searchSubmitLabel,
          disabled: searchSubmitDisabled,
          onClick: () => onSearchSubmit(),
          tone: 'primary' as const,
          icon: Globe2,
        }
      : null;
  const hasSearchSubmit = Boolean(inlineSearchAction);
  const searchInputPaddingClass = inlineSearchAction
    ? searchQuery
      ? 'pr-32'
      : 'pr-28'
    : searchQuery
      ? 'pr-14'
      : 'pr-8';

  useEffect(() => {
    if (searchInputAutoFocusKey === undefined) {
      return;
    }
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  }, [searchInputAutoFocusKey]);

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
          {(Array.isArray(headerCommands) ? headerCommands : []).map((command) => (
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

      {hasCells && (
        <div className="flex items-center gap-2">
            <span className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/[0.4]">
              Scope
            </span>
          <div className="group relative min-w-0 flex-1">
          <select
            aria-label="Active cell"
            className={`w-full appearance-none rounded-md border border-border/40 bg-muted/10 px-2 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:border-border/80 cursor-pointer ${focusRingClass}`}
            value={selectedId || ''}
            onChange={(e) => onSelectCell?.(e.target.value)}
          >
            {cells.map((cell) => (
              <option key={cell.id} value={cell.id} className="bg-popover text-foreground">
                Cell: {cell.name}
              </option>
            ))}
          </select>
          <ChevronDown size={10} aria-hidden="true" className="absolute right-2 top-2.5 text-muted-foreground/40 pointer-events-none group-hover:text-muted-foreground transition-colors" />
          </div>
        </div>
      )}

      {Array.isArray(workingSetOptions) && workingSetOptions.length > 1 ? (
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/[0.4]">
            View
          </span>
          <div className="inline-flex rounded-full border border-border/40 bg-muted/10 p-0.5">
            {workingSetOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => onWorkingSetChange?.(option.id)}
                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors ${focusRingClass} ${
                  activeWorkingSetViewId === option.id
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-1.5">
        {searchModeDescriptors.length ? (
          <div className="inline-flex rounded-full border border-border/40 bg-muted/10 p-0.5">
            {searchModeDescriptors.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => onSearchModeChange?.(option.id)}
                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors ${focusRingClass} ${
                  searchMode === option.id
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}
        <div className="relative min-w-0 flex-1 group">
          <SearchLeadingIcon
            size={12}
            strokeWidth={searchInputType === 'url' ? 1.7 : 2}
            aria-hidden="true"
            className="absolute left-2.5 top-2 text-muted-foreground/30 group-focus-within:text-primary transition-colors"
          />
          <input
            ref={searchInputRef}
            type={searchInputType}
            inputMode={searchInputType === 'url' ? 'url' : undefined}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') {
                return;
              }

              if (hasSearchSubmit) {
                event.preventDefault();
                onSearchSubmit();
                return;
              }

              if (showUrlAffordance && !urlAffordanceDisabled) {
                event.preventDefault();
                onUrlAffordance?.();
              }
            }}
            name="explorerSearch"
            autoComplete="off"
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className={`w-full rounded-full border border-border/40 bg-muted/10 pl-8 py-1.5 text-[11px] text-foreground transition-colors placeholder:text-muted-foreground/30 focus:bg-background focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20 ${searchInputPaddingClass} ${focusRingClass}`}
          />
          {(searchQuery || inlineSearchAction) && (
            <div className="absolute inset-y-1 right-1 flex items-center gap-1">
              {searchQuery ? (
                <button
                  type="button"
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground/40 transition-colors hover:bg-white/5 hover:text-foreground ${focusRingClass}`}
                  onClick={onClearSearch}
                  aria-label="Clear search"
                >
                  <X size={12} strokeWidth={1.5} aria-hidden="true" />
                </button>
              ) : null}
              {inlineSearchAction ? (
                <InlineSearchActionButton
                  icon={inlineSearchAction.icon}
                  label={inlineSearchAction.label}
                  onClick={inlineSearchAction.onClick}
                  disabled={inlineSearchAction.disabled}
                  tone={inlineSearchAction.tone}
                  title={
                    inlineSearchAction.tone === 'secondary'
                      ? 'Press Enter to open this URL'
                      : undefined
                  }
                />
              ) : null}
            </div>
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
        ) : null}
      </div>

      {searchTruncated && (
        <div className="flex items-center gap-1.5 px-1 text-[10px] text-amber-400/70 italic">
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

function InlineSearchActionButton({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  tone = 'secondary',
  title,
}: {
  icon: any;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: 'primary' | 'secondary';
  title?: string;
}) {
  const activeClass =
    tone === 'primary'
      ? 'border-primary/40 bg-primary/12 text-primary hover:border-primary/55 hover:bg-primary/18'
      : 'border-sky-500/40 bg-sky-500/10 text-sky-300 hover:border-sky-500/60 hover:bg-sky-500/15';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] transition-colors ${focusRingClass} ${
        disabled ? 'border-border/30 text-muted-foreground/35' : activeClass
      } disabled:cursor-not-allowed`}
    >
      <Icon size={10} strokeWidth={1.7} aria-hidden="true" />
      {label}
    </button>
  );
}
