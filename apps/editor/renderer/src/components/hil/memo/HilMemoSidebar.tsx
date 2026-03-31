import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  RefreshCw, 
  Search,
  Layers,
  ChevronDown,
  Check,
  X
} from 'lucide-react';
import {
  HIL_SURFACE_COPY,
  HilStatusBadge,
  HilSurfaceHeader,
} from '../hilSurfaceSystem';
import { IconButton } from '../../ui/IconButton';
import { focusRing } from '../../ui/focusRing';

export function HilMemoSidebar({
  loading,
  refresh,
  searchQuery,
  onSearchChange,
  filters,
  onFiltersChange,
  summary,
  inboxSections,
  inboxCounts,
  pendingInboxCount,
  dockSelection,
  onDockSelectionChange,
  draftItems,
  draftCount,
  summarizeBody,
}: any) {
  const focusRingClass = focusRing.sidebar;
  return (
    <aside className="flex flex-col h-full bg-[linear-gradient(180deg,rgba(18,22,29,0.98),rgba(10,13,18,0.99))] overflow-hidden select-none">
      {/* Header Section */}
      <div className="shrink-0 border-b border-white/[0.06] px-4 py-4 bg-white/[0.02] z-20">
        <div className="flex items-start justify-between gap-3 mb-3">
          <HilSurfaceHeader
            eyebrow={HIL_SURFACE_COPY.workspaceSubtitle}
            title={HIL_SURFACE_COPY.workspaceTitle}
            subtitle="Capture, review, and route artifact records from one workspace."
            meta={
              <>
                <HilStatusBadge label={`${summary.comment + summary.memo + summary.draft} records`} tone="neutral" />
                <HilStatusBadge label={`${pendingInboxCount} inbox`} tone="active" />
                <HilStatusBadge label={`${draftCount} drafts`} tone="warning" />
              </>
            }
            compact
          />
          <IconButton
            label="Refresh memo workspace"
            onClick={refresh}
            focusRing="sidebar"
            className="shrink-0 p-1.5 rounded-full border border-white/[0.08] bg-background/40 hover:bg-sidebar-accent text-muted-foreground/40 hover:text-foreground transition-colors"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
          </IconButton>
        </div>

        <div className="relative group">
          <Search size={12} strokeWidth={2} aria-hidden="true" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
          <input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            type="search"
            name="hil-search"
            autoComplete="off"
            spellCheck={false}
            aria-label="Search repository"
            placeholder="Search memo records…"
            className="w-full rounded-full border border-border/40 bg-muted/10 px-8 py-1.5 text-[11px] text-foreground transition-colors placeholder:text-muted-foreground/30 focus:bg-background focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Clear search"
              className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground rounded ${focusRingClass}`}
              onClick={() => onSearchChange('')}
            >
              <X size={12} strokeWidth={1.5} aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="mt-3 flex items-center gap-1.5 overflow-visible">
          <FilterChip 
            label="Kind" 
            value={filters.kind} 
            options={kindOptions} 
            onChange={(v) => onFiltersChange({ ...filters, kind: v })} 
          />
          <FilterChip 
            label="Status" 
            value={filters.status} 
            options={statusOptions} 
            onChange={(v) => onFiltersChange({ ...filters, status: v })} 
            align="right"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Inbox Section */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-2 bg-sidebar/95 border-b border-sidebar-border/40 backdrop-blur-md">
          <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/42">
            Capture & Review
          </div>
          <HilStatusBadge label={`${pendingInboxCount}`} tone="neutral" className="px-2 py-0.5" />
        </div>
        
        <div className="flex flex-col py-1 pb-3">
          {inboxSections.map((section) => {
            const Icon = section.icon;
            const active = dockSelection.type === 'inbox' && dockSelection.inboxType === section.id;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => onDockSelectionChange({ type: 'inbox', inboxType: section.id, draftId: null })}
                className={`flex w-full items-center justify-between px-4 py-1.5 text-left text-[11px] transition-colors border-l-2 ${focusRingClass} focus-visible:ring-primary/30 ${
                  active
                    ? 'bg-sidebar-accent/70 text-primary border-primary font-medium shadow-[inset_0_0_10px_rgba(59,130,246,0.02)]'
                    : 'text-muted-foreground/72 hover:text-foreground border-transparent hover:bg-sidebar-accent/30'
                }`}
              >
                <span className="flex items-center gap-2.5 truncate">
                  <Icon size={12} aria-hidden="true" className={active ? 'text-primary' : 'text-muted-foreground/40'} />
                  <span className="truncate">{section.label}</span>
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  {active ? (
                    <span className="text-[9px] text-muted-foreground/42 truncate max-w-[82px]">
                      {section.description}
                    </span>
                  ) : null}
                  <span className="text-[9px] font-mono opacity-30">
                    {inboxCounts[section.id] || 0}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Drafts Section */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-2 bg-sidebar/95 border-y border-sidebar-border/40 backdrop-blur-md">
          <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/42">
            Drafts
          </div>
          <HilStatusBadge label={`${draftCount}`} tone="warning" className="px-2 py-0.5" />
        </div>
        
        <div className="flex flex-col py-1 pb-8">
          {draftItems.length ? (
            draftItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onDockSelectionChange({ type: 'draft', draftId: item.id })}
                className={`flex w-full flex-col gap-0.5 px-4 py-2.5 text-left transition-colors border-l-2 ${focusRingClass} focus-visible:ring-primary/30 ${
                  dockSelection.type === 'draft' && dockSelection.draftId === item.id
                    ? 'bg-sidebar-accent/70 text-primary border-primary shadow-[inset_0_0_10px_rgba(59,130,246,0.02)]'
                    : 'text-muted-foreground/72 hover:text-foreground border-transparent hover:bg-sidebar-accent/30'
                }`}
              >
                <span className={`text-[12px] truncate ${dockSelection.type === 'draft' && dockSelection.draftId === item.id ? 'font-medium' : ''}`}>
                  {summarizeBody(item)}
                </span>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <HilStatusBadge
                    label={item.status}
                    tone={
                      item.status === 'open'
                        ? 'active'
                        : item.status === 'resolved'
                          ? 'success'
                          : 'neutral'
                    }
                    className="px-2 py-0.5"
                  />
                  <Layers size={10} aria-hidden="true" className="opacity-10 shrink-0" />
                </div>
              </button>
            ))
          ) : (
            <div className="px-4 py-8 text-center">
              <div className="text-[10px] text-muted-foreground/20 italic">
                No active drafts
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

  function FilterChip({ label, value, options, onChange, align = 'left' }: any) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef(null);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
    const activeLabel = options.find(o => o.value === value)?.label || value;
    const menuId = `filter-${label.replace(/\s+/g, '-').toLowerCase()}`;
    const focusRingClass = focusRing.sidebar;

    useEffect(() => {
        if (!open) return;
        
        const updatePosition = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setDropdownPos({
                    top: rect.bottom + 4,
                    left: align === 'right' ? rect.right - 128 : rect.left,
                    width: 128
                });
            }
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);

        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [open, align]);

    return (
        <div className="relative shrink-0" ref={containerRef}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={open ? menuId : undefined}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md border transition-colors transition-shadow text-[10px] ${focusRingClass} ${
                    open 
                    ? 'bg-background border-primary/40 text-foreground shadow-sm' 
                    : 'bg-muted/10 border-border/40 text-muted-foreground/60 hover:border-border hover:text-foreground'
                }`}
            >
                <span className="opacity-40 font-bold uppercase tracking-tighter text-[8px]">{label}</span>
                <span className="font-medium truncate max-w-[60px]">{activeLabel}</span>
                <ChevronDown size={8} aria-hidden="true" className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && createPortal(
                <div 
                    style={{ 
                        position: 'fixed',
                        top: dropdownPos.top,
                        left: dropdownPos.left,
                        width: dropdownPos.width,
                        zIndex: 9999
                    }}
                    id={menuId}
                    role="listbox"
                    aria-label={`${label} filter`}
                    className={`bg-popover border border-border rounded-lg shadow-2xl py-1 overflow-hidden backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-100 ${align === 'right' ? 'origin-top-right' : 'origin-top-left'}`}
                >
                    {options.map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                                onChange(opt.value);
                                setOpen(false);
                            }}
                            role="option"
                            aria-selected={value === opt.value}
                            className={`flex w-full items-center justify-between px-3 py-1.5 text-[11px] hover:bg-primary/10 transition-colors ${
                                value === opt.value ? 'text-primary bg-primary/5 font-medium' : 'text-muted-foreground'
                            }`}
                        >
                            <span>{opt.label}</span>
                            {value === opt.value && <Check size={10} aria-hidden="true" />}
                        </button>
                    ))}
                </div>,
                document.body
            )}
        </div>
    );
}

const kindOptions = [
  { value: 'all', label: 'Everything' },
  { value: 'comment', label: 'Comments' },
  { value: 'memo', label: 'Memos' },
  { value: 'draft', label: 'Drafts' },
];

const statusOptions = [
  { value: 'all', label: 'Any Status' },
  { value: 'open', label: 'Active' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'archived', label: 'Archived' },
];
