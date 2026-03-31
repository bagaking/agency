import React, { useEffect, useMemo, useState } from 'react';
import { CircleDot, FileText, Search, X } from 'lucide-react';
import { isAgencyMethodAvailable, searchExplorerFiles } from '../../services/agencyBridge';
import {
  buildWorkbenchQuickOpenSections,
  parseWorkbenchQuickOpenQuery,
  type WorkbenchQuickOpenItem,
} from './workbenchQuickOpenModel';

export function QuickOpenModal({
  open,
  onClose,
  onSelect,
  rootPath,
  openTabs = [],
  activeTabId = '',
}: any) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const parsedQuery = useMemo(() => parseWorkbenchQuickOpenQuery(query), [query]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      setTruncated(false);
      setActiveIndex(0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const handle = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        setTruncated(false);
        return;
      }
      if (!parsedQuery.pathQuery) {
        setResults([]);
        setTruncated(false);
        return;
      }
      if (!isAgencyMethodAvailable('searchExplorerFiles')) {
        return;
      }
      setLoading(true);
      try {
        const result = await searchExplorerFiles({
          query: parsedQuery.pathQuery,
          rootPath: rootPath || undefined,
        });
        setResults(result?.matches || []);
        setTruncated(Boolean(result?.truncated));
      } catch (error) {
        setResults([]);
        setTruncated(false);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [open, parsedQuery.pathQuery, query, rootPath]);

  const sections = useMemo(
    () =>
      buildWorkbenchQuickOpenSections({
        query,
        openTabs,
        activeTabId,
        fileMatches: results.slice(0, 40),
      }),
    [activeTabId, openTabs, query, results]
  );
  const visible = useMemo(
    () => sections.flatMap((section) => section.items),
    [sections]
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [visible.length]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center bg-black/50 pt-24"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Quick Open"
        data-testid="workbench-quick-open"
        className="w-[520px] rounded border border-border bg-popover shadow-xl"
      >
        <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-xs text-muted-foreground">
          <Search size={14} />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                onClose();
              }
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setActiveIndex((current) => Math.min(current + 1, visible.length - 1));
              }
              if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActiveIndex((current) => Math.max(current - 1, 0));
              }
              if (event.key === 'Enter' && visible[activeIndex]) {
                onSelect(visible[activeIndex]);
                onClose();
              }
            }}
            placeholder="Quick open files and tabs..."
            className="flex-1 bg-transparent text-foreground outline-none"
          />
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={14} />
          </button>
        </div>
        <div className="px-4 pt-2 text-[10px] text-muted-foreground/70">
          Type a path, or add <span className="font-mono">:line[:column]</span> to jump inside the file.
        </div>
        <div className="max-h-[320px] overflow-y-auto">
          {!query.trim() && sections.length > 0 ? (
            <div className="px-4 pt-3 text-[11px] text-muted-foreground">
              Jump directly to an open tab, or start typing to search project files.
            </div>
          ) : null}
          {loading ? (
            <div className="px-4 py-3 text-xs text-muted-foreground">Searching...</div>
          ) : null}
          {truncated ? (
            <div className="px-4 pt-3 text-[11px] text-amber-300/80">
              Results truncated. Narrow the query to refine project files.
            </div>
          ) : null}
          {!loading && visible.length === 0 ? (
            <div className="px-4 py-3 text-xs text-muted-foreground">
              {query.trim() ? 'No matches' : 'No open tabs yet'}
            </div>
          ) : null}
          {sections.map((section) => (
            <div key={section.id} className="py-1">
              <div className="px-4 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                {section.label}
              </div>
              {section.items.map((item) => {
                const index = visible.findIndex((entry) => entry.id === item.id);
                return (
                  <QuickOpenRow
                    key={item.id}
                    item={item}
                    active={index === activeIndex}
                    onClick={() => {
                      onSelect(item);
                      onClose();
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function QuickOpenRow({
  item,
  active,
  onClick,
}: {
  item: WorkbenchQuickOpenItem;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`flex w-full items-center gap-3 px-4 py-2 text-left transition-colors ${
        active
          ? 'bg-muted/60 text-foreground'
          : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
      }`}
      onClick={onClick}
    >
      {item.kind === 'tab' ? (
        <CircleDot size={12} className={item.isActive ? 'text-primary' : 'text-muted-foreground/60'} />
      ) : (
        <FileText size={12} className="text-muted-foreground/60" />
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium">{item.title}</div>
        <div className="truncate text-[10px] text-muted-foreground/75">{item.subtitle}</div>
      </div>
      {item.badge ? (
        <span className="rounded-full border border-border/40 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/75">
          {item.badge}
        </span>
      ) : null}
    </button>
  );
}
