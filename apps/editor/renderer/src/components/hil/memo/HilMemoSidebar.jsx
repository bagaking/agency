import React, { useEffect, useRef, useState } from 'react';
import { 
  RefreshCw, 
  Search,
  Terminal,
  StickyNote,
  Layers,
  Camera,
  Quote,
  ChevronDown,
  Info
} from 'lucide-react';
import { Tooltip } from '../../ui/Tooltip.jsx';

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
}) {
  return (
    <aside className="flex flex-col h-full bg-sidebar">
      <div className="border-b border-sidebar-border px-4 pt-4 pb-3 bg-sidebar/50">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col shrink-0">
            <h2 className="text-[9px] font-black uppercase tracking-[0.4em] text-primary/40 mb-1">Human-In-Loop</h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-[9px] font-bold text-muted-foreground/20 uppercase tracking-widest">
                <span className="flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-muted-foreground/30" /> {summary.comment}</span>
                <span className="flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-muted-foreground/30" /> {summary.memo}</span>
                <span className="flex items-center gap-1 text-primary/40"><div className="w-1 h-1 rounded-full bg-current" /> {summary.draft}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Tooltip label="HIL captures comments, memos, and drafts for the active worktree." side="left">
              <button
                type="button"
                className="shrink-0 p-1.5 rounded-full hover:bg-sidebar-accent text-muted-foreground/40 hover:text-foreground transition-all"
                aria-label="HIL help"
              >
                <Info size={14} />
              </button>
            </Tooltip>
            <button onClick={refresh} className="shrink-0 p-1.5 rounded-full hover:bg-sidebar-accent text-muted-foreground/40 hover:text-foreground transition-all">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="mt-4 relative group">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/30 group-focus-within:text-primary transition-all" />
          <input 
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="FILTER OBJECTS..."
            className="w-full h-8 rounded-full border border-sidebar-border/40 bg-sidebar-accent/20 pl-8 pr-3 text-[11px] text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 focus:bg-sidebar/60 transition-all tracking-wider"
          />
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <FilterChip 
            label="Type" 
            value={filters.kind} 
            options={kindOptions} 
            onChange={(v) => onFiltersChange({ ...filters, kind: v })} 
          />
          <FilterChip 
            label="Status" 
            value={filters.status} 
            options={statusOptions} 
            onChange={(v) => onFiltersChange({ ...filters, status: v })} 
          />
        </div>
      </div>

      <div className="flex items-center justify-between px-4 py-2 bg-sidebar/30 border-b border-sidebar-border/50">
        <div className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
          Inbox
        </div>
        <span className="text-[9px] font-mono text-muted-foreground/40">{pendingInboxCount}</span>
      </div>
      
      <div className="flex flex-col py-1">
        {inboxSections.map((section) => {
          const Icon = section.icon;
          const active = dockSelection.type === 'inbox' && dockSelection.inboxType === section.id;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onDockSelectionChange({ type: 'inbox', inboxType: section.id, draftId: null })}
              className={`flex w-full items-center justify-between px-4 py-2 text-left text-[11px] transition-all border-l-2 ${
                active
                  ? 'bg-sidebar-accent text-primary border-primary'
                  : 'text-muted-foreground/60 hover:text-foreground border-transparent hover:bg-sidebar-accent/50'
              }`}
            >
              <span className="flex items-center gap-2">
                <Icon size={14} className={active ? 'text-primary' : 'text-muted-foreground/40'} />
                <span className={active ? 'font-bold' : 'font-medium'}>{section.label}</span>
              </span>
              <span className="text-[10px] font-mono opacity-40">
                {inboxCounts[section.id] || 0}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex items-center justify-between px-4 py-2 bg-sidebar/30 border-y border-sidebar-border/50">
        <div className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
          Drafts
        </div>
        <span className="text-[9px] font-mono text-muted-foreground/40">{draftCount}</span>
      </div>
      
      <div className="flex-1 overflow-y-auto py-1">
        {draftItems.length ? (
          draftItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onDockSelectionChange({ type: 'draft', draftId: item.id })}
              className={`flex w-full flex-col gap-1 px-4 py-2 text-left transition-all border-l-2 ${
                dockSelection.type === 'draft' && dockSelection.draftId === item.id
                  ? 'bg-sidebar-accent text-primary border-primary'
                  : 'text-muted-foreground/60 hover:text-foreground border-transparent hover:bg-sidebar-accent/50'
              }`}
            >
              <span className={`text-[11px] truncate ${dockSelection.type === 'draft' && dockSelection.draftId === item.id ? 'font-bold' : 'font-medium'}`}>
                {summarizeBody(item)}
              </span>
              <div className="flex items-center justify-between">
                <span className="text-[8px] uppercase tracking-[0.2em] opacity-40">
                    {item.status}
                </span>
                <Layers size={10} className="opacity-20" />
              </div>
            </button>
          ))
        ) : (
          <div className="px-4 py-8 text-center">
            <div className="text-[10px] text-muted-foreground/30 italic">
              No drafts yet.
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

function FilterChip({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const activeLabel = options.find((option) => option.value === value)?.label;

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const handleClick = (event) => {
      if (buttonRef.current?.contains(event.target)) {
        return;
      }
      if (menuRef.current?.contains(event.target)) {
        return;
      }
      setOpen(false);
    };
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClick);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-sidebar-accent/40 border border-sidebar-border/30 text-[9px] font-bold text-muted-foreground/60 hover:text-primary hover:border-primary/30 transition-all"
        aria-expanded={open}
      >
        <span className="opacity-40">{label}:</span>
        <span className="text-muted-foreground/80 tracking-tight">{activeLabel}</span>
        <ChevronDown size={8} className={`opacity-30 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open ? (
        <div
          ref={menuRef}
          className="absolute z-[70] mt-1 min-w-[140px] rounded-md border border-border/40 bg-popover p-1 text-[10px] shadow-xl"
        >
          {options.map((option) => {
            const isActive = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`w-full text-left px-2 py-1 rounded transition-colors ${
                  isActive
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
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
