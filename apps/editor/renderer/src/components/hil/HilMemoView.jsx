import React, { useMemo, useCallback, useEffect, useState } from 'react';
import { 
  RefreshCw, 
  CheckCircle2, 
  Archive, 
  MessageSquarePlus, 
  Hash, 
  Target, 
  Search,
  Filter,
  Clock,
  Terminal,
  StickyNote,
  Layers,
  FileText,
  Activity,
  ChevronDown
} from 'lucide-react';
import { ProjectEmptyState } from '../ProjectEmptyState.jsx';
import { useHilItems } from '../../hooks/useHilItems.js';

const kindIcons = {
    comment: Terminal,
    memo: StickyNote,
    draft: Layers
};

const resolveBody = (item) =>
  typeof item?.body === 'string' ? item.body : typeof item?.message === 'string' ? item.message : '';

const summarizeBody = (item) => {
  const raw = resolveBody(item).trim();
  if (!raw) {
    return 'Untitled Draft';
  }
  const firstLine = raw.split('\n')[0];
  if (firstLine.length > 46) {
    return `${firstLine.slice(0, 46)}…`;
  }
  return firstLine;
};

export function HilMemoView({ worktreePath, projectReady, projectError, onSelectProject }) {
  const { items, filters, setFilters, loading, error, refresh } = useHilItems({
    worktreePath,
    fetchAll: true,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [dockSelection, setDockSelection] = useState({ type: 'inbox', draftId: null });

  const draftItems = useMemo(
    () => items.filter((item) => item.kind === 'draft'),
    [items]
  );
  const inboxItems = useMemo(
    () => items.filter((item) => item.kind === 'comment' && item.meta?.processed !== true),
    [items]
  );
  const selectedDraft = useMemo(
    () => draftItems.find((item) => item.id === dockSelection.draftId) || null,
    [dockSelection.draftId, draftItems]
  );
  const pendingInboxCount = inboxItems.length;
  const draftCount = draftItems.length;

  useEffect(() => {
    if (dockSelection.type === 'draft' && !selectedDraft) {
      setDockSelection({ type: 'inbox', draftId: null });
    }
  }, [dockSelection.type, selectedDraft]);

  const filteredItems = useMemo(() => {
    let result = items;
    if (filters.kind !== 'all') {
      result = result.filter((item) => item.kind === filters.kind);
    }
    if (filters.status !== 'all') {
      result = result.filter((item) => item.status === filters.status);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          (item.body || item.message || '').toLowerCase().includes(q) ||
          (item.anchor?.file || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [items, searchQuery, filters.kind, filters.status]);

  const visibleInboxItems = useMemo(
    () => filteredItems.filter((item) => item.kind === 'comment' && item.meta?.processed !== true),
    [filteredItems]
  );

  const summary = useMemo(() => {
    const counts = { comment: 0, memo: 0, draft: 0 };
    items.forEach((item) => {
      if (counts[item.kind] !== undefined) counts[item.kind] += 1;
    });
    return counts;
  }, [items]);

  const updateStatus = useCallback(async (item, status) => {
    if (!window.agency?.updateHilItem || !item?.id || !worktreePath) return;
    await window.agency.updateHilItem({ worktreePath, itemId: item.id, patch: { status } });
    refresh();
  }, [refresh, worktreePath]);

  const promoteItem = useCallback(async (item) => {
    if (!window.agency?.promoteHilItem || !item?.id || !worktreePath) return;
    await window.agency.promoteHilItem({ worktreePath, itemId: item.id });
    refresh();
  }, [refresh, worktreePath]);

  if (!projectReady) {
    return (
      <ProjectEmptyState
        title="No project selected"
        description="Select a workspace to manage HIL repository."
        error={projectError}
        onSelect={onSelectProject}
      />
    );
  }

  return (
    <section className="flex h-full flex-1 flex-col bg-background overflow-hidden select-none">
      <div className="flex flex-1 overflow-hidden">
        {/* Dock */}
        <aside className="w-64 shrink-0 border-r border-border/20 bg-muted/5">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/10">
            <div className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
              Input Box
            </div>
            <span className="text-[10px] font-mono text-muted-foreground/40">{pendingInboxCount}</span>
          </div>
          <button
            type="button"
            onClick={() => setDockSelection({ type: 'inbox', draftId: null })}
            className={`flex w-full items-center gap-2 px-4 py-2 text-left text-[11px] font-semibold transition ${
              dockSelection.type === 'inbox'
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground/60 hover:text-foreground'
            }`}
          >
            <MessageSquarePlus size={14} />
            Comment Inbox
          </button>

          <div className="mt-4 flex items-center justify-between px-4 py-2 border-t border-border/10">
            <div className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
              Drafts
            </div>
            <span className="text-[10px] font-mono text-muted-foreground/40">{draftCount}</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {draftItems.length ? (
              draftItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setDockSelection({ type: 'draft', draftId: item.id })}
                  className={`flex w-full flex-col gap-1 px-4 py-2 text-left text-[11px] transition ${
                    dockSelection.type === 'draft' && dockSelection.draftId === item.id
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground/60 hover:text-foreground'
                  }`}
                >
                  <span className="truncate font-semibold">{summarizeBody(item)}</span>
                  <span className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground/40">
                    {item.status}
                  </span>
                </button>
              ))
            ) : (
              <div className="px-4 py-6 text-[10px] text-muted-foreground/40">
                No drafts yet.
              </div>
            )}
          </div>
        </aside>

        {/* Main Pane */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <header className="shrink-0 flex items-center px-6 h-20 gap-12">
            <div className="flex flex-col shrink-0">
              <h2 className="text-[9px] font-black uppercase tracking-[0.4em] text-primary/40 mb-1">Human-In-Loop</h2>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-foreground tracking-tighter italic">Repository_</span>
                <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground/20 uppercase tracking-widest ml-2">
                  <span className="flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-muted-foreground/30" /> {summary.comment}</span>
                  <span className="flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-muted-foreground/30" /> {summary.memo}</span>
                  <span className="flex items-center gap-1.5 text-primary/40"><div className="w-1 h-1 rounded-full bg-current" /> {summary.draft}</span>
                </div>
              </div>
            </div>

            <div className="flex-1 relative group max-w-xl">
              <Search size={14} className="absolute left-0 top-1/2 -translate-y-1/2 text-muted-foreground/30 group-focus-within:text-primary transition-all" />
              <input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="FILTER OBJECTS..."
                className="w-full h-10 bg-transparent border-b border-border/10 pl-8 text-xs text-foreground placeholder:text-muted-foreground/20 focus:outline-none focus:border-primary/40 transition-all tracking-[0.1em]"
              />
            </div>

            <button onClick={refresh} className="shrink-0 p-3 rounded-full bg-muted/5 text-muted-foreground/40 hover:text-foreground transition-all hover:bg-muted/10 active:scale-90">
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </header>

          <div className="shrink-0 flex items-center px-6 h-10 gap-6 bg-muted/5 border-y border-border/10">
            <div className="flex items-center gap-2 text-[9px] font-black text-muted-foreground/30 uppercase tracking-[0.3em]">
              <Filter size={10} strokeWidth={3} /> Selector
            </div>
            <div className="flex items-center gap-1">
              <FilterChip 
                label="Type" 
                value={filters.kind} 
                options={kindOptions} 
                onChange={(v) => setFilters(curr => ({ ...curr, kind: v }))} 
              />
              <FilterChip 
                label="Status" 
                value={filters.status} 
                options={statusOptions} 
                onChange={(v) => setFilters(curr => ({ ...curr, status: v }))} 
              />
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            {dockSelection.type === 'draft' && selectedDraft ? (
              <DraftDetail
                draft={selectedDraft}
                onUpdateStatus={updateStatus}
              />
            ) : (
              <div className="flex h-full flex-col">
                {error && (
                  <div className="mx-6 mt-4 p-4 bg-rose-500/5 rounded-2xl border border-rose-500/10 text-rose-400 text-[11px] font-medium animate-slide-down">
                    <Activity size={14} className="inline mr-2" /> {error}
                  </div>
                )}
                <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4">
                  <div className="flex flex-col gap-0.5">
                    {visibleInboxItems.map((item, index) => (
                      <MemoRow
                        key={item.id}
                        index={index}
                        item={item}
                        onUpdateStatus={updateStatus}
                        onPromote={promoteItem}
                      />
                    ))}
                  </div>

                  {!loading && visibleInboxItems.length === 0 && (
                    <div className="py-32 flex flex-col items-center justify-center opacity-5">
                      <Hash size={64} strokeWidth={1} />
                      <p className="text-[11px] font-black uppercase tracking-[0.5em] mt-6">
                        Inbox Empty
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function FilterChip({ label, value, options, onChange }) {
    const activeLabel = options.find(o => o.value === value)?.label;
    return (
        <div className="relative group/chip">
            <select
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-popover text-foreground">{opt.label}</option>
                ))}
            </select>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted/10 border border-border/10 text-[10px] font-bold text-muted-foreground/50 group-hover/chip:text-primary group-hover/chip:border-primary/20 transition-all">
                <span className="opacity-40">{label}:</span>
                <span className="text-muted-foreground/80 tracking-tight">{activeLabel}</span>
                <ChevronDown size={10} className="opacity-20" />
            </div>
        </div>
    );
}

function MemoRow({ item, index, onUpdateStatus, onPromote }) {
    const isResolved = item.status === 'resolved' || item.status === 'archived';
    const Icon = kindIcons[item.kind] || FileText;
    const bodySummary = resolveBody(item);
    
    return (
        <div className={`group flex items-center h-12 px-4 gap-6 transition-all duration-500 rounded-xl ${
            isResolved ? 'opacity-40 grayscale' : 'hover:bg-muted/5'
        }`}>
            {/* Index & Status Dot */}
            <div className="w-8 flex items-center gap-3 shrink-0">
                <span className="text-[9px] font-mono text-muted-foreground/30 font-black">{String(index + 1).padStart(2, '0')}</span>
                <div className={`h-1.5 w-1.5 rounded-full transition-all duration-700 ${item.status === 'open' ? 'bg-primary shadow-[0_0_10px_rgba(59,130,246,0.4)]' : 'bg-muted-foreground/30'}`} />
            </div>

            {/* Type Identifier */}
            <div className="w-24 shrink-0 flex items-center gap-2">
                <Icon size={13} strokeWidth={1.5} className={!isResolved ? 'text-primary/60' : 'text-muted-foreground/30'} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">{item.kind}</span>
            </div>

            {/* Content Summary */}
            <div className="flex-1 min-w-0 flex items-center gap-4">
                <div className="text-[13px] text-muted-foreground truncate tracking-tight group-hover:text-foreground transition-colors duration-300 font-medium">
                    {bodySummary}
                </div>
                
                {/* Inline Hover Actions: Zen Style */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                    {item.status === 'open' ? (
                        <RowAction icon={CheckCircle2} title="Resolve" onClick={() => onUpdateStatus(item, 'resolved')} color="hover:text-emerald-500 hover:bg-emerald-500/10" />
                    ) : (
                        <RowAction icon={RefreshCw} title="Restore" onClick={() => onUpdateStatus(item, 'open')} color="hover:text-amber-500 hover:bg-amber-500/10" />
                    )}
                    {item.kind === 'comment' && (
                        <RowAction icon={MessageSquarePlus} title="Promote" onClick={() => onPromote(item)} color="hover:text-primary hover:bg-primary/10" />
                    )}
                    <RowAction icon={Archive} title="Archive" onClick={() => onUpdateStatus(item, 'archived')} />
                </div>
            </div>

            {/* Context & Temporal */}
            <div className="w-64 shrink-0 flex items-center justify-end gap-6">
                {item.anchor?.file && (
                    <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground/30 italic truncate max-w-[160px] group-hover:text-muted-foreground/50 transition-colors">
                        <Target size={10} className="shrink-0" />
                        {item.anchor.file.split('/').pop()}
                        <span className="not-italic opacity-40">:{item.anchor.line}</span>
                    </div>
                )}
                <div className="text-[10px] font-mono text-muted-foreground/20 font-bold tabular-nums">
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                </div>
            </div>
        </div>
    );
}

function DraftDetail({ draft, onUpdateStatus }) {
    const isResolved = draft.status === 'resolved' || draft.status === 'archived';
    const createdAt = draft.createdAt ? new Date(draft.createdAt) : null;
    const references = Array.isArray(draft.references) ? draft.references : [];

    return (
        <div className="flex h-full flex-col">
            <header className="flex items-center justify-between px-6 py-4 border-b border-border/10">
                <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
                        Draft Detail
                    </div>
                    <div className="text-lg font-semibold text-foreground tracking-tight">
                        {summarizeBody(draft)}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground/40 uppercase tracking-[0.2em]">
                        <span className="inline-flex items-center gap-1">
                            <Layers size={12} />
                            {draft.status}
                        </span>
                        {createdAt && (
                            <span className="inline-flex items-center gap-1">
                                <Clock size={12} />
                                {createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {draft.status === 'open' ? (
                        <RowAction
                            icon={CheckCircle2}
                            title="Resolve"
                            onClick={() => onUpdateStatus(draft, 'resolved')}
                            color="hover:text-emerald-500 hover:bg-emerald-500/10"
                        />
                    ) : (
                        <RowAction
                            icon={RefreshCw}
                            title="Reopen"
                            onClick={() => onUpdateStatus(draft, 'open')}
                            color="hover:text-amber-500 hover:bg-amber-500/10"
                        />
                    )}
                    <RowAction
                        icon={Archive}
                        title="Archive"
                        onClick={() => onUpdateStatus(draft, 'archived')}
                    />
                </div>
            </header>
            <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4">
                <div className="rounded-2xl border border-border/10 bg-muted/5 p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
                        Draft Body
                    </div>
                    <div className="mt-3 text-[13px] leading-relaxed text-foreground/80 whitespace-pre-wrap">
                        {resolveBody(draft) || 'No content.'}
                    </div>
                </div>

                {references.length > 0 && (
                    <div className="mt-6">
                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
                            References
                        </div>
                        <div className="mt-2 flex flex-col gap-2">
                            {references.map((ref, index) => (
                                <div
                                    key={`${ref.id || ref.path || index}`}
                                    className="rounded-xl border border-border/10 bg-muted/5 px-3 py-2 text-[11px] text-muted-foreground/70"
                                >
                                    <div className="flex items-center gap-2">
                                        <Target size={12} className="text-primary/60" />
                                        <span className="font-mono truncate">
                                            {ref.path || ref.id || 'Unknown reference'}
                                        </span>
                                        {ref.line ? (
                                            <span className="text-[10px] text-muted-foreground/40">:{ref.line}</span>
                                        ) : null}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function RowAction({ icon: Icon, onClick, title, color = "hover:text-foreground hover:bg-muted/10" }) {
    return (
        <button 
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className={`p-1.5 rounded-lg transition-all text-muted-foreground/40 ${color}`}
            title={title}
        >
            <Icon size={14} strokeWidth={2} />
        </button>
    )
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
