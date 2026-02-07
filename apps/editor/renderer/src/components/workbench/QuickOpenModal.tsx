import React, { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';

export function QuickOpenModal({ open, onClose, onSelect, rootPath }: any) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
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
        return;
      }
      if (!window.agency?.searchExplorerFiles) {
        return;
      }
      setLoading(true);
      try {
        const result = await window.agency.searchExplorerFiles({
          query: query.trim(),
          rootPath: rootPath || undefined,
        });
        setResults(result?.matches || []);
      } catch (error) {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [open, query, rootPath]);

  const visible = useMemo(() => results.slice(0, 20), [results]);

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
      <div className="w-[520px] rounded border border-border bg-popover shadow-xl">
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
              }
            }}
            placeholder="Quick open..."
            className="flex-1 bg-transparent text-foreground outline-none"
          />
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={14} />
          </button>
        </div>
        <div className="max-h-[320px] overflow-y-auto">
          {loading ? (
            <div className="px-4 py-3 text-xs text-muted-foreground">Searching...</div>
          ) : null}
          {!loading && visible.length === 0 ? (
            <div className="px-4 py-3 text-xs text-muted-foreground">No matches</div>
          ) : null}
          {visible.map((path, index) => (
            <button
              key={path}
              type="button"
              className={`flex w-full items-center px-4 py-2 text-xs transition-colors ${
                index === activeIndex ? 'bg-muted/60 text-foreground' : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
              }`}
              onClick={() => onSelect(path)}
            >
              {path}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
