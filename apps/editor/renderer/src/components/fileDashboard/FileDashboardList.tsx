import React, { useMemo } from 'react';
import { Eye, FolderOpen } from 'lucide-react';
import type { AgentCellFileChangeEntry } from '../../utils/agentCellFileChanges';

const fileStatusColors: Record<string, string> = {
  added: 'text-emerald-400',
  modified: 'text-amber-300',
  deleted: 'text-rose-400',
  renamed: 'text-sky-400',
  copied: 'text-sky-400',
  untracked: 'text-lime-300',
  ignored: 'text-slate-300',
  conflict: 'text-rose-500',
};

const fileStatusBadges: Record<string, string> = {
  added: 'A',
  modified: 'M',
  deleted: 'D',
  renamed: 'R',
  copied: 'C',
  untracked: '?',
  ignored: 'I',
  conflict: '!',
};

export type FileDashboardPreviewState = {
  relativePath: string;
  line: number | null;
  snippet: Array<{
    line: number;
    content: string;
    isTarget?: boolean;
  }>;
  loading: boolean;
  error: string;
};

type FileDashboardListProps = {
  entries?: AgentCellFileChangeEntry[];
  mode?: 'flat' | 'tree';
  loading?: boolean;
  loadingMessage?: string;
  emptyMessage?: string;
  onOpen?: (entry: AgentCellFileChangeEntry) => void;
  onReveal?: (entry: AgentCellFileChangeEntry) => void;
  onPreview?: (entry: AgentCellFileChangeEntry) => void;
  onDragStart?: (event: React.DragEvent, entry: AgentCellFileChangeEntry) => void;
  preview?: FileDashboardPreviewState | null;
  onClearPreview?: () => void;
  listTestId?: string;
};

type TreeNode = {
  id: string;
  type: 'dir' | 'file';
  name: string;
  path: string;
  children: TreeNode[];
  childMap: Map<string, TreeNode>;
  entry: AgentCellFileChangeEntry | null;
};

const buildTree = (entries: AgentCellFileChangeEntry[] = []): TreeNode[] => {
  const root: TreeNode = {
    id: 'root',
    type: 'dir',
    name: '',
    path: '',
    children: [],
    childMap: new Map(),
    entry: null,
  };

  const ensureChild = (
    parent: TreeNode,
    payload: { name: string; path: string; type: 'dir' | 'file' }
  ) => {
    const key = `${payload.type}:${payload.path}`;
    let node = parent.childMap.get(key);
    if (node) {
      return node;
    }
    node = {
      id: key,
      type: payload.type,
      name: payload.name,
      path: payload.path,
      children: [],
      childMap: new Map(),
      entry: null,
    };
    parent.childMap.set(key, node);
    parent.children.push(node);
    return node;
  };

  (Array.isArray(entries) ? entries : []).forEach((entry) => {
    const relativePath = String(entry?.relativePath || '').trim();
    if (!relativePath) {
      return;
    }
    const parts = relativePath.split('/').filter(Boolean);
    let current = root;
    let currentPath = '';

    parts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isLeaf = index === parts.length - 1;
      const child = ensureChild(current, {
        name: part,
        path: currentPath,
        type: isLeaf ? 'file' : 'dir',
      });
      if (isLeaf) {
        child.entry = entry;
      }
      current = child;
    });
  });

  const finalize = (node: TreeNode) => {
    node.children.sort((left, right) => {
      if (left.type !== right.type) {
        return left.type === 'dir' ? -1 : 1;
      }
      return left.name.localeCompare(right.name);
    });
    node.children.forEach((child) => finalize(child));
  };

  finalize(root);
  return root.children;
};

const buildPreviewKey = (entry: AgentCellFileChangeEntry | null | undefined) => {
  if (!entry?.relativePath) {
    return '';
  }
  const relativePath = String(entry.relativePath).trim();
  if (!relativePath) {
    return '';
  }
  const line = Number.isFinite(entry.line) ? Math.max(1, Math.floor(Number(entry.line))) : null;
  return `${relativePath}:${line || ''}`;
};

const renderMeta = (entry: AgentCellFileChangeEntry) => {
  if (entry?.sourceType === 'modified') {
    const added = Number(entry?.added || 0);
    const deleted = Number(entry?.deleted || 0);
    if (added || deleted) {
      return `+${added} -${deleted}`;
    }
    return String(entry?.status || 'modified');
  }

  const linePart = entry?.line ? `:${entry.line}` : '';
  const sessionPart = entry?.sessionCount && entry.sessionCount > 1 ? ` · ${entry.sessionCount} sessions` : '';
  return `${linePart}${sessionPart}`;
};

const resolveStatusVisual = (entry: AgentCellFileChangeEntry) => {
  const statusKey = String(entry?.status || '').toLowerCase();
  const badge = fileStatusBadges[statusKey];
  if (!badge) {
    return null;
  }
  return {
    badge,
    label: statusKey,
    colorClass: fileStatusColors[statusKey] || 'text-muted-foreground',
  };
};

export function FileDashboardList({
  entries = [],
  mode = 'flat',
  loading = false,
  loadingMessage = 'Loading…',
  emptyMessage = 'No files yet.',
  onOpen,
  onReveal,
  onPreview,
  onDragStart,
  preview = null,
  onClearPreview,
  listTestId,
}: FileDashboardListProps) {
  const tree = useMemo(() => buildTree(entries), [entries]);
  const activePreviewKey = preview
    ? `${String(preview.relativePath || '').trim()}:${preview.line || ''}`
    : '';

  const renderEntryRow = (
    entry: AgentCellFileChangeEntry,
    {
      key,
      indent = 0,
      useDisplayPath = false,
    }: { key?: string; indent?: number; useDisplayPath?: boolean } = {}
  ) => {
    if (!entry) {
      return null;
    }

    const rowKey = key || `${entry.relativePath}:${entry.line || ''}:${entry.column || ''}`;
    const statusVisual = resolveStatusVisual(entry);
    const label = useDisplayPath
      ? entry.displayPath || entry.relativePath.split('/').pop() || entry.relativePath
      : entry.relativePath;
    const meta = renderMeta(entry);
    const previewKey = buildPreviewKey(entry);
    const isPreviewing = Boolean(previewKey && activePreviewKey && previewKey === activePreviewKey);

    return (
      <div
        key={rowKey}
        className={`group flex items-center gap-1 px-1 py-0.5 text-[10px] leading-tight transition-colors hover:bg-muted/30 ${
          isPreviewing ? 'bg-primary/10' : ''
        }`}
        style={indent > 0 ? { marginLeft: `${indent}px` } : undefined}
      >
        <button
          type="button"
          draggable={Boolean(onDragStart && entry.absolutePath)}
          onDragStart={(event) => onDragStart?.(event, entry)}
          onClick={() => onOpen?.(entry)}
          className="min-w-0 flex-1 truncate text-left text-foreground/90 hover:text-foreground"
          title={entry.relativePath}
        >
          {label}
          {meta ? <span className="text-muted-foreground">{` ${meta}`}</span> : null}
        </button>
        {statusVisual ? (
          <span
            className={`px-1 text-[8px] font-semibold uppercase tracking-wide ${statusVisual.colorClass}`}
            title={`Status: ${statusVisual.label}`}
          >
            {statusVisual.badge}
          </span>
        ) : null}
        {onPreview ? (
          <button
            type="button"
            onClick={() => void onPreview(entry)}
            className="inline-flex items-center rounded p-0.5 text-muted-foreground hover:text-primary"
            title="Preview without switching view"
          >
            <Eye size={10} strokeWidth={1.6} />
          </button>
        ) : null}
        {onReveal ? (
          <button
            type="button"
            onClick={() => void onReveal(entry)}
            className="px-1 text-[8px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-primary"
            title="Reveal in Explorer"
          >
            R
          </button>
        ) : null}
      </div>
    );
  };

  const renderTreeNode = (node: TreeNode, depth = 0): React.ReactNode => {
    const indent = Math.max(4, depth * 10 + 4);
    if (node.type === 'dir') {
      return (
        <div key={node.id} className="space-y-0">
          <div
            className="flex items-center gap-1 text-[10px] text-muted-foreground/90"
            style={{ paddingLeft: `${indent}px` }}
          >
            <FolderOpen size={10} strokeWidth={1.5} className="text-muted-foreground/70" />
            <span className="truncate">{node.name}</span>
          </div>
          {node.children.map((child) => renderTreeNode(child, depth + 1))}
        </div>
      );
    }

    if (!node.entry) {
      return null;
    }

    return renderEntryRow(node.entry, {
      key: `${node.entry.relativePath}:${node.entry.line || ''}:${node.entry.column || ''}`,
      indent,
      useDisplayPath: true,
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto pr-0.5" data-testid={listTestId}>
        {entries.length ? (
          mode === 'flat' ? (
            <div className="space-y-0">{entries.map((entry) => renderEntryRow(entry))}</div>
          ) : (
            <div className="space-y-0">{tree.map((node) => renderTreeNode(node))}</div>
          )
        ) : (
          <div className="px-1 py-1 text-[10px] text-muted-foreground">
            {loading ? loadingMessage : emptyMessage}
          </div>
        )}
      </div>

      {preview ? (
        <div className="mt-1 rounded bg-background/70 px-1.5 py-1 text-[9px] text-muted-foreground">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="truncate text-foreground/85">
              {preview.relativePath}
              {preview.line ? `:${preview.line}` : ''}
            </span>
            {onClearPreview ? (
              <button
                type="button"
                onClick={onClearPreview}
                className="rounded px-1 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            ) : null}
          </div>
          {preview.loading ? (
            <div>Loading preview…</div>
          ) : preview.error ? (
            <div className="text-rose-300">{preview.error}</div>
          ) : preview.snippet?.length ? (
            <div className="max-h-24 space-y-0 overflow-y-auto font-mono">
              {preview.snippet.map((line) => (
                <div
                  key={`${line.line}:${line.content}`}
                  className={line.isTarget ? 'text-primary' : 'text-muted-foreground/90'}
                >
                  <span className="mr-1.5 opacity-60">{line.line}</span>
                  <span>{line.content || ' '}</span>
                </div>
              ))}
            </div>
          ) : (
            <div>No preview lines available.</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
