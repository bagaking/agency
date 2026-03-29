import React from 'react';
import { FileText, RefreshCw } from 'lucide-react';

import type { AgentCellFileChangeEntry } from '../../utils/agentCellFileChanges';
import {
  FileDashboardList,
  type FileDashboardPreviewState,
} from '../fileDashboard/FileDashboardList';
import { IconButton } from '../ui/IconButton';

type ExplorerWorkingSetViewProps = {
  title: string;
  subtitle: string;
  entries: AgentCellFileChangeEntry[];
  mode: 'flat' | 'tree';
  refreshing: boolean;
  updatedAt: number;
  preview: FileDashboardPreviewState | null;
  onRefresh: () => void | Promise<void>;
  onModeChange: (mode: 'flat' | 'tree') => void;
  onOpenEntry: (entry: AgentCellFileChangeEntry) => void | Promise<void>;
  onRevealEntry: (entry: AgentCellFileChangeEntry) => void | Promise<void>;
  onPreviewEntry: (entry: AgentCellFileChangeEntry) => void | Promise<void>;
  onDragEntry: (event: React.DragEvent, entry: AgentCellFileChangeEntry) => void;
  onClearPreview: () => void;
};

function formatUpdatedAgo(updatedAt: number) {
  if (!updatedAt) {
    return '';
  }
  const deltaMs = Math.max(0, Date.now() - updatedAt);
  const deltaSec = Math.floor(deltaMs / 1000);
  if (deltaSec < 60) {
    return `${deltaSec}s ago`;
  }
  const deltaMin = Math.floor(deltaSec / 60);
  if (deltaMin < 60) {
    return `${deltaMin}m ago`;
  }
  const deltaHours = Math.floor(deltaMin / 60);
  return `${deltaHours}h ago`;
}

export function ExplorerWorkingSetView({
  title,
  subtitle,
  entries,
  mode,
  refreshing,
  updatedAt,
  preview,
  onRefresh,
  onModeChange,
  onOpenEntry,
  onRevealEntry,
  onPreviewEntry,
  onDragEntry,
  onClearPreview,
}: ExplorerWorkingSetViewProps) {
  const updatedAgo = formatUpdatedAgo(updatedAt);

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-sidebar text-sidebar-foreground">
      <div className="border-b border-border/40 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5">
              <FileText size={11} strokeWidth={1.6} className="text-primary/80" />
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground/55">
                {title}
              </span>
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
                {entries.length}
              </span>
            </div>
            <div className="mt-1 truncate text-[10px] text-muted-foreground/60">{subtitle}</div>
          </div>
          <div className="flex items-center gap-1">
            <div className="inline-flex rounded-full border border-border/30 bg-muted/10 p-0.5">
              <WorkingSetModeButton
                active={mode === 'flat'}
                label="Flat"
                onClick={() => onModeChange('flat')}
              />
              <WorkingSetModeButton
                active={mode === 'tree'}
                label="Grouped"
                onClick={() => onModeChange('tree')}
              />
            </div>
            <IconButton
              label="Refresh working set"
              focusRing="sidebar"
              className="h-6 w-6 rounded-md text-muted-foreground/60 hover:bg-white/5 hover:text-foreground"
              onClick={() => void onRefresh()}
              disabled={refreshing}
            >
              <RefreshCw
                size={11}
                strokeWidth={1.6}
                className={refreshing ? 'animate-spin' : ''}
              />
            </IconButton>
          </div>
        </div>
        {updatedAgo ? (
          <div className="mt-2 text-[10px] text-muted-foreground/55">Updated {updatedAgo}</div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 px-2 py-2">
        <FileDashboardList
          entries={entries}
          mode={mode}
          loading={refreshing}
          loadingMessage="Scanning working set…"
          emptyMessage="No files in this working set."
          onOpen={(entry) => void onOpenEntry(entry)}
          onReveal={(entry) => void onRevealEntry(entry)}
          onPreview={(entry) => void onPreviewEntry(entry)}
          onDragStart={onDragEntry}
          preview={preview}
          onClearPreview={onClearPreview}
          listTestId="explorer-working-set-list"
        />
      </div>
    </section>
  );
}

function WorkingSetModeButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors ${
        active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {label}
    </button>
  );
}
