import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, FileText, Loader2, Eye } from 'lucide-react';
import { explorerPathUtils } from '../../hooks/useProjectExplorer.js';

export function ProjectExplorerPane({ rootPath, filePath, onReveal }) {
  const [content, setContent] = useState('');
  const [binary, setBinary] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const [size, setSize] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fileName = useMemo(() => (filePath ? explorerPathUtils.basename(filePath) : ''), [filePath]);

  useEffect(() => {
    let active = true;
    if (!filePath) {
      setContent('');
      setBinary(false);
      setTruncated(false);
      setSize(0);
      setError('');
      setLoading(false);
      return undefined;
    }
    if (!window.agency?.readExplorerEntry) {
      setError('Explorer preview is unavailable.');
      return undefined;
    }
    setLoading(true);
    setError('');
    window.agency
      .readExplorerEntry({ rootPath: rootPath || undefined, targetPath: filePath })
      .then((result) => {
        if (!active) {
          return;
        }
        setBinary(Boolean(result?.binary));
        setTruncated(Boolean(result?.truncated));
        setSize(result?.size || 0);
        setContent(result?.content || '');
      })
      .catch((err) => {
        if (!active) {
          return;
        }
        setError(err?.message || 'Failed to load file.');
      })
      .finally(() => {
        if (!active) {
          return;
        }
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [filePath, rootPath]);

  if (!filePath) {
    return (
      <section className="flex h-full items-center justify-center bg-background text-muted-foreground">
        <div className="text-center text-sm">
          <FileText size={20} className="mx-auto mb-2 opacity-60" />
          Select a file in Explorer to preview it.
        </div>
      </section>
    );
  }

  return (
    <section className="flex h-full flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-foreground">{fileName}</span>
          <span className="text-[11px] text-muted-foreground truncate" title={filePath}>
            {filePath}
          </span>
        </div>
        <button
          type="button"
          onClick={onReveal}
          disabled={!onReveal}
          className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
          title="Reveal in Finder"
        >
          <Eye size={12} />
          Reveal
        </button>
      </header>

      <div className="flex-1 overflow-auto p-4 text-xs font-mono text-foreground">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 size={14} className="animate-spin" />
            Loading preview...
          </div>
        ) : null}
        {!loading && error ? (
          <div className="flex items-center gap-2 text-rose-300">
            <AlertTriangle size={14} />
            {error}
          </div>
        ) : null}
        {!loading && !error && (binary || truncated) ? (
          <div className="flex items-center gap-2 text-amber-200/80">
            <AlertTriangle size={14} />
            {binary
              ? 'Binary file preview is not available.'
              : `Preview truncated to ${Math.round((content.length || 0) / 1024)} KB.`}
            {size ? <span className="text-muted-foreground/60">({size} bytes)</span> : null}
          </div>
        ) : null}
        {!loading && !error && !binary ? (
          <div className="space-y-0.5">
            {content.split('\n').map((line, index) => (
              <div key={`${index}-${line}`} className="flex gap-4">
                <span className="w-10 text-right text-muted-foreground/60 select-none">
                  {index + 1}
                </span>
                <span className="whitespace-pre-wrap break-words">{line}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
