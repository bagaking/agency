import React from 'react';
import { STATUS_FILTERS, statusBadgeStyles, statusColors, statusBadges, statusLabels } from './explorerUtils';
import { focusRing } from '../ui/focusRing';

const focusRingClass = focusRing.sidebar;

export function ExplorerFilterPanel({
  menuId,
  menuRef,
  menuStyle,
  showHidden,
  setShowHidden,
  showIgnored,
  setShowIgnored,
  showChangesOnly,
  setShowChangesOnly,
  statusFilterSet,
  toggleStatusFilter,
  clearStatusFilters,
  statusFiltersCount,
  semanticRules,
  semanticFilterSet,
  toggleSemanticFilter,
  clearSemanticFilters,
  semanticFiltersCount,
  onLocateSemanticRule,
}: any) {
  const sortedSemanticRules = Array.isArray(semanticRules)
    ? [...semanticRules].sort((a, b) => {
        const aPriority = Number(a?.priority) || 0;
        const bPriority = Number(b?.priority) || 0;
        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }
        return String(a?.label || a?.id || '').localeCompare(String(b?.label || b?.id || ''));
      })
    : [];

  return (
    <div
      id={menuId}
      ref={menuRef}
      data-explorer-filter-menu
      className="absolute z-50 max-h-[min(32rem,calc(100vh-9rem))] w-56 overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-[#1a1d23]/95 p-3 text-[11px] text-muted-foreground shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl animate-tab-in ring-1 ring-white/5"
      style={menuStyle}
      role="dialog"
      aria-label="Explorer filters"
      tabIndex={-1}
    >
      <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/30">
        Visibility
      </div>
      <div className="space-y-1">
        <FilterToggle label="Show hidden" active={showHidden} onClick={() => setShowHidden(!showHidden)} />
        <FilterToggle label="Show ignored" active={showIgnored} onClick={() => setShowIgnored(!showIgnored)} />
        <FilterToggle label="Changes only" active={showChangesOnly} onClick={() => setShowChangesOnly(!showChangesOnly)} />
      </div>
      
      <div className="mt-4 mb-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/30">
        Status Filters
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1">
        {STATUS_FILTERS.map((status) => {
          const active = statusFilterSet.has(status);
          return (
            <button
              key={status}
              type="button"
              aria-pressed={active}
              className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/5 ${focusRingClass} ${
                active ? 'bg-white/5 text-foreground' : 'opacity-60 hover:opacity-100'
              }`}
              onClick={() => toggleStatusFilter(status)}
            >
              <span className={`inline-flex h-4 min-w-[1rem] items-center justify-center rounded-md px-1 text-[8px] font-black uppercase tracking-[0.14em] ${statusBadgeStyles[status] || statusColors[status]}`}>
                {statusBadges[status]}
              </span>
              <span className="truncate tracking-tight">{statusLabels[status] || status}</span>
            </button>
          );
        })}
      </div>
      
      {statusFiltersCount > 0 && (
        <button
          type="button"
          className={`mt-3 w-full rounded-lg border border-white/5 bg-white/5 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground ${focusRingClass}`}
          onClick={clearStatusFilters}
        >
          Reset Status Filters
        </button>
      )}

      {sortedSemanticRules.length > 0 && (
        <>
          <div className="mt-4 mb-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/30">
            Semantic Files
          </div>
          <div className="mt-2 grid grid-cols-1 gap-1">
            {sortedSemanticRules.map((rule) => {
              const ruleId = String(rule?.id || '');
              if (!ruleId) {
                return null;
              }
              const active = semanticFilterSet?.has(ruleId);
              return (
                <div
                  key={ruleId}
                  className={`flex items-center gap-1 rounded-lg transition-colors hover:bg-white/5 ${
                    active ? 'bg-white/5 text-foreground' : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  <button
                    type="button"
                    aria-pressed={active}
                    className={`min-w-0 flex-1 px-2 py-1.5 text-left ${focusRingClass}`}
                    onClick={() => toggleSemanticFilter(ruleId)}
                  >
                    <span className="block truncate tracking-tight">{rule?.label || ruleId}</span>
                    <span className="inline-flex shrink-0 rounded-[2px] border border-sky-400/30 bg-sky-500/10 px-1 text-[8px] font-bold uppercase tracking-tighter text-sky-200">
                      {ruleId}
                    </span>
                  </button>
                  {onLocateSemanticRule && (
                    <button
                      type="button"
                      className={`shrink-0 rounded-md border border-white/10 px-1.5 py-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-white/10 ${focusRingClass}`}
                      onClick={() => onLocateSemanticRule(ruleId)}
                    >
                      Locate
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {semanticFiltersCount > 0 && (
            <button
              type="button"
              className={`mt-3 w-full rounded-lg border border-white/5 bg-white/5 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground ${focusRingClass}`}
              onClick={clearSemanticFilters}
            >
              Reset Semantic Filters
            </button>
          )}
        </>
      )}
    </div>
  );
}

function FilterToggle({ label, active, onClick }: any) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 transition-colors hover:bg-white/5 ${focusRingClass} ${
        active ? 'text-foreground font-medium' : 'text-muted-foreground/60'
      }`}
      onClick={onClick}
    >
      <span className="tracking-tight">{label}</span>
      <div
        className={`h-3 w-3 rounded-md border transition-colors ${active ? 'bg-primary border-primary shadow-[0_0_8px_rgba(59,130,246,0.4)]' : 'border-white/10 bg-white/5'}`}
        aria-hidden="true"
      >
          {active && (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-white w-full h-full p-0.5"
                aria-hidden="true"
              >
                  <polyline points="20 6 9 17 4 12" />
              </svg>
          )}
      </div>
    </button>
  );
}
