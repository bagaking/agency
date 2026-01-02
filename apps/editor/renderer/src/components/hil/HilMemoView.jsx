import React, { useMemo, useCallback } from 'react';
import { FileText, RefreshCw, Tag, CheckCircle2, Archive, RefreshCw as RefreshIcon, MessageSquarePlus } from 'lucide-react';
import { ProjectEmptyState } from '../ProjectEmptyState.jsx';
import { useHilItems } from '../../hooks/useHilItems.js';

const kindOptions = [
  { value: 'all', label: 'All' },
  { value: 'comment', label: 'Comments' },
  { value: 'memo', label: 'Memos' },
  { value: 'draft', label: 'Drafts' },
];

const statusOptions = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'archived', label: 'Archived' },
];

const resolveBody = (item) =>
  typeof item?.body === 'string' ? item.body : typeof item?.message === 'string' ? item.message : '';

export function HilMemoView({ worktreePath, projectReady, projectError, onSelectProject }) {
  const { items, filters, setFilters, loading, error, refresh } = useHilItems({ worktreePath });
  const summary = useMemo(() => {
    const counts = { comment: 0, memo: 0, draft: 0 };
    items.forEach((item) => {
      if (counts[item.kind] !== undefined) {
        counts[item.kind] += 1;
      }
    });
    return counts;
  }, [items]);

  const updateStatus = useCallback(
    async (item, status) => {
      if (!window.agency?.updateHilItem || !item?.id || !worktreePath) {
        return;
      }
      await window.agency.updateHilItem({
        worktreePath,
        itemId: item.id,
        patch: { status },
      });
      refresh();
    },
    [refresh, worktreePath]
  );

  const promoteItem = useCallback(
    async (item) => {
      if (!window.agency?.promoteHilItem || !item?.id || !worktreePath) {
        return;
      }
      await window.agency.promoteHilItem({ worktreePath, itemId: item.id });
      refresh();
    },
    [refresh, worktreePath]
  );

  if (!projectReady) {
    return (
      <ProjectEmptyState
        title="No project selected"
        description="Select a workspace to view HIL memos."
        error={projectError}
        onSelect={onSelectProject}
      />
    );
  }

  return (
    <section className="flex h-full flex-1 flex-col bg-[#0b0d11] overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/[0.03] px-6 py-4">
        <div>
          <div className="text-sm font-semibold text-foreground">Memo Center</div>
          <div className="text-[10px] text-muted-foreground/60">
            Comments {summary.comment} · Memos {summary.memo} · Drafts {summary.draft}
          </div>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 hover:text-foreground"
        >
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      <div className="flex items-center gap-3 border-b border-white/[0.03] px-6 py-3 text-[10px] uppercase tracking-widest text-muted-foreground/60">
        <div className="flex items-center gap-2">
          <Tag size={12} />
          Kind
        </div>
        <select
          className="rounded-md border border-white/10 bg-transparent px-2 py-1 text-[10px] text-foreground"
          value={filters.kind}
          onChange={(event) => setFilters((current) => ({ ...current, kind: event.target.value }))}
        >
          {kindOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="ml-4 flex items-center gap-2">
          <Tag size={12} />
          Status
        </div>
        <select
          className="rounded-md border border-white/10 bg-transparent px-2 py-1 text-[10px] text-foreground"
          value={filters.status}
          onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading && <div className="text-[10px] text-muted-foreground/40">Loading HIL items…</div>}
        {error && <div className="text-[10px] text-rose-400">{error}</div>}
        {!loading && !error && items.length === 0 && (
          <div className="text-[10px] text-muted-foreground/40">No HIL items yet.</div>
        )}
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground/60">
                <div className="flex items-center gap-2">
                  <FileText size={12} />
                  <span className="uppercase tracking-widest">{item.kind}</span>
                  {item.anchor?.file ? (
                    <span className="text-muted-foreground/40">{item.anchor.file}</span>
                  ) : null}
                </div>
                <span className="rounded-full border border-white/10 px-2 py-0.5 text-[9px] uppercase tracking-widest">
                  {item.status || 'open'}
                </span>
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground/80">
                {resolveBody(item)}
              </div>
              {item.anchor?.line ? (
                <div className="mt-2 text-[10px] text-muted-foreground/40">Ln {item.anchor.line}</div>
              ) : null}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[9px] uppercase tracking-widest text-muted-foreground/50">
                {item.status === 'open' ? (
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 hover:border-emerald-400/40 hover:text-emerald-200"
                    onClick={() => updateStatus(item, 'resolved')}
                  >
                    <CheckCircle2 size={10} />
                    Resolve
                  </button>
                ) : (
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 hover:border-amber-400/40 hover:text-amber-200"
                    onClick={() => updateStatus(item, 'open')}
                  >
                    <RefreshIcon size={10} />
                    Reopen
                  </button>
                )}
                {item.status !== 'archived' && (
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 hover:border-white/30 hover:text-foreground"
                    onClick={() => updateStatus(item, 'archived')}
                  >
                    <Archive size={10} />
                    Archive
                  </button>
                )}
                {item.kind === 'comment' && (
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 hover:border-primary/40 hover:text-primary"
                    onClick={() => promoteItem(item)}
                  >
                    <MessageSquarePlus size={10} />
                    Promote
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
