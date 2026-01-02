import React from 'react';
import { STATUS_FILTERS, statusBadgeStyles, statusColors, statusBadges, statusLabels } from './explorerUtils';

export function ExplorerFilterPanel({
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
}) {
  return (
    <div
      data-explorer-filter-menu
      className="absolute right-4 top-[128px] z-50 w-56 rounded-2xl border border-white/10 bg-[#1a1d23]/95 p-3 text-[11px] text-muted-foreground shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl animate-tab-in ring-1 ring-white/5"
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
              className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-all hover:bg-white/5 ${
                active ? 'bg-white/5 text-foreground' : 'opacity-60 hover:opacity-100'
              }`}
              onClick={() => toggleStatusFilter(status)}
            >
              <span className={`px-1 rounded-[2px] text-[9px] font-black uppercase tracking-tighter ${statusColors[status]}`}>
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
          className="mt-3 w-full rounded-lg border border-white/5 bg-white/5 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider hover:bg-white/10 transition-all text-muted-foreground hover:text-foreground"
          onClick={clearStatusFilters}
        >
          Reset Status Filters
        </button>
      )}
    </div>
  );
}

function FilterToggle({ label, active, onClick }) {
  return (
    <button
      type="button"
      className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 transition-all hover:bg-white/5 ${active ? 'text-foreground font-medium' : 'text-muted-foreground/60'}`}
      onClick={onClick}
    >
      <span className="tracking-tight">{label}</span>
      <div className={`h-3 w-3 rounded-md border transition-all ${active ? 'bg-primary border-primary shadow-[0_0_8px_rgba(59,130,246,0.4)]' : 'border-white/10 bg-white/5'}`}>
          {active && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="text-white w-full h-full p-0.5">
                  <polyline points="20 6 9 17 4 12" />
              </svg>
          )}
      </div>
    </button>
  );
}
