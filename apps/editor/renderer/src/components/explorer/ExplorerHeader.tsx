import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Link2,
  Globe2,
  Search,
  X,
  Filter,
  ChevronDown,
  Info,
} from 'lucide-react';

import { IconButton } from '../ui/IconButton';
import { focusRing } from '../ui/focusRing';
import { resolveExplorerHeaderLayout } from './explorerHeaderLayout';

const focusRingClass = focusRing.sidebar;
const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

type HeaderSegmentOption = {
  id: string;
  label: string;
};

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
  const headerRef = useRef<HTMLElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [layoutMode, setLayoutMode] = useState<'inline' | 'stacked'>('inline');
  const contextBits = showFilterMenuButton ? [activeFilterSummary || ''].filter(Boolean) : [];
  const workingSets = Array.isArray(workingSetOptions) ? workingSetOptions : [];
  const searchModeDescriptors = Array.isArray(searchModeOptions) ? searchModeOptions : [];
  const activeSearchModeDescriptor =
    searchModeDescriptors.find((option) => option.id === searchMode) || searchModeDescriptors[0];
  const searchPlaceholder = activeSearchModeDescriptor?.placeholder || 'Search files…';
  const SearchLeadingIcon = searchInputType === 'url' ? Link2 : Search;
  const hasExplicitSearchSubmit =
    typeof onSearchSubmit === 'function' && Boolean(searchSubmitLabel);
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

  useIsomorphicLayoutEffect(() => {
    const element = headerRef.current;
    if (!element) {
      return;
    }

    const updateLayout = (width: number) => {
      setLayoutMode(resolveExplorerHeaderLayout(width));
    };

    updateLayout(element.getBoundingClientRect().width);
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      updateLayout(entry.contentRect.width);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <header
      ref={headerRef}
      data-testid="explorer-header"
      data-explorer-header-layout={layoutMode}
      className="shrink-0 border-b border-border/40 bg-sidebar px-4 py-3 text-sidebar-foreground"
    >
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">
                Explorer
              </div>
              <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
                <span className="truncate text-[13px] font-semibold text-foreground">
                  {activeRootLabel}
                </span>
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
            {layoutMode === 'inline' && workingSets.length > 1 ? (
              <CompactSegmentedControl
                ariaLabel="Explorer view"
                dataTestId="explorer-working-set-toggle"
                options={workingSets}
                activeId={activeWorkingSetViewId}
                onSelect={onWorkingSetChange}
                tone="context"
              />
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {layoutMode === 'inline' && hasCells ? (
              <CompactScopeSelect
                cells={cells}
                selectedId={selectedId}
                onSelectCell={onSelectCell}
              />
            ) : null}
            <div className="flex items-center gap-0.5">
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
        </div>

        {layoutMode === 'stacked' && (workingSets.length > 1 || hasCells) ? (
          <div
            data-testid="explorer-secondary-rail"
            className="flex min-w-0 flex-wrap items-center gap-2"
          >
            {workingSets.length > 1 ? (
              <CompactSegmentedControl
                ariaLabel="Explorer view"
                dataTestId="explorer-working-set-toggle"
                options={workingSets}
                activeId={activeWorkingSetViewId}
                onSelect={onWorkingSetChange}
                tone="context"
              />
            ) : null}
            {hasCells ? (
              <div className="ml-auto min-w-[8rem] max-w-full flex-1 basis-[9.75rem]">
                <CompactScopeSelect
                  cells={cells}
                  selectedId={selectedId}
                  onSelectCell={onSelectCell}
                  fluid={true}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex min-w-0 items-center gap-1.5">
          <div
            data-testid="explorer-search-shell"
            className="flex min-w-0 flex-1 items-center gap-1 rounded-xl border border-border/40 bg-muted/10 p-1"
          >
            {searchModeDescriptors.length ? (
              <CompactSegmentedControl
                ariaLabel="Explorer search mode"
                options={searchModeDescriptors}
                activeId={searchMode}
                onSelect={onSearchModeChange}
                tone="search"
              />
            ) : null}

            <div className="relative min-w-0 flex-1 group">
              <SearchLeadingIcon
                size={12}
                strokeWidth={searchInputType === 'url' ? 1.7 : 2}
                aria-hidden="true"
                className="absolute left-2.5 top-2 text-muted-foreground/30 transition-colors group-focus-within:text-primary"
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

                  if (inlineSearchAction) {
                    event.preventDefault();
                    inlineSearchAction.onClick();
                    return;
                  }
                }}
                name="explorerSearch"
                autoComplete="off"
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className={`w-full rounded-lg border border-transparent bg-transparent py-1.5 pl-8 text-[11px] text-foreground transition-colors placeholder:text-muted-foreground/30 focus:bg-background/70 focus:border-primary/35 focus:outline-none focus:ring-1 focus:ring-primary/15 ${searchInputPaddingClass} ${focusRingClass}`}
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
              className={`h-8 w-8 rounded-full border transition-colors ${
                hasActiveFilters
                  ? 'border-primary/40 bg-primary/10 text-primary active-tab-glow'
                  : 'border-border/40 text-muted-foreground/50 hover:border-border hover:text-foreground'
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

        {searchTruncated ? (
          <div className="flex items-center gap-1.5 px-1 text-[10px] italic text-amber-400/70">
            <Info size={10} aria-hidden="true" /> Search results truncated
          </div>
        ) : null}
      </div>
    </header>
  );
}

function CompactScopeSelect({
  cells,
  selectedId,
  onSelectCell,
  fluid = false,
}: {
  cells: Array<{ id: string; name: string }>;
  selectedId: string;
  onSelectCell: (value: string) => void;
  fluid?: boolean;
}) {
  return (
    <div className={`group relative ${fluid ? 'w-full min-w-0' : 'w-[9.75rem] shrink-0'}`}>
      <select
        aria-label="Active cell"
        className={`h-8 w-full appearance-none rounded-lg border border-border/40 bg-muted/10 px-3 pr-7 text-[11px] font-medium text-foreground transition-colors hover:border-border/80 ${focusRingClass}`}
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
        size={11}
        aria-hidden="true"
        className="pointer-events-none absolute right-2.5 top-2.5 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground"
      />
    </div>
  );
}

function CompactSegmentedControl({
  ariaLabel,
  dataTestId,
  options,
  activeId,
  onSelect,
  tone = 'context',
}: {
  ariaLabel: string;
  dataTestId?: string;
  options: HeaderSegmentOption[];
  activeId: string;
  onSelect?: (id: string) => void;
  tone?: 'context' | 'search';
}) {
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const shellClass =
    tone === 'search'
      ? 'rounded-lg border border-white/[0.05] bg-background/20'
      : 'rounded-full border border-border/40 bg-muted/10';

  const focusOption = (index: number) => {
    optionRefs.current[index]?.focus();
  };

  return (
    <div
      aria-label={ariaLabel}
      data-testid={dataTestId}
      className={`inline-flex shrink-0 p-0.5 ${shellClass}`}
      role="radiogroup"
    >
      {options.map((option, index) => (
        <button
          key={option.id}
          ref={(element) => {
            optionRefs.current[index] = element;
          }}
          type="button"
          role="radio"
          aria-checked={activeId === option.id}
          tabIndex={activeId === option.id ? 0 : -1}
          onClick={() => onSelect?.(option.id)}
          onKeyDown={(event) => {
            if (!options.length) {
              return;
            }
            if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
              event.preventDefault();
              const nextIndex = (index + 1) % options.length;
              onSelect?.(options[nextIndex].id);
              focusOption(nextIndex);
              return;
            }
            if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
              event.preventDefault();
              const nextIndex = (index - 1 + options.length) % options.length;
              onSelect?.(options[nextIndex].id);
              focusOption(nextIndex);
              return;
            }
            if (event.key === 'Home') {
              event.preventDefault();
              onSelect?.(options[0].id);
              focusOption(0);
              return;
            }
            if (event.key === 'End') {
              event.preventDefault();
              const nextIndex = options.length - 1;
              onSelect?.(options[nextIndex].id);
              focusOption(nextIndex);
            }
          }}
          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors ${focusRingClass} ${
            activeId === option.id
              ? 'bg-primary/15 text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function HeaderButton({
  icon: Icon,
  onClick,
  title,
  className = '',
  disabled = false,
}: any) {
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
