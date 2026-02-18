import React from 'react';
import { FileText, RefreshCw } from 'lucide-react';

import { formatIdleShort } from '../../utils/timeFormat';
import type { AgentCellFileChangeEntry } from '../../utils/agentCellFileChanges';
import {
  FileDashboardList,
  type FileDashboardPreviewState,
} from '../fileDashboard/FileDashboardList';

export type ExplorerChangedFilesPanelMode = 'flat' | 'tree';

type ExplorerChangedFilesPanelProps = {
  entries: AgentCellFileChangeEntry[];
  selectedCell: { name?: string | null } | null;
  selectedCellId: string | null;
  isOpen: boolean;
  mode: ExplorerChangedFilesPanelMode;
  refreshing: boolean;
  updatedAt: number;
  preview: FileDashboardPreviewState | null;
  onRefresh: () => void | Promise<void>;
  onToggleOpen: () => void;
  onModeChange: (mode: ExplorerChangedFilesPanelMode) => void;
  onOpenEntry: (entry: AgentCellFileChangeEntry) => void | Promise<void>;
  onRevealEntry: (entry: AgentCellFileChangeEntry) => void | Promise<void>;
  onPreviewEntry: (entry: AgentCellFileChangeEntry) => void | Promise<void>;
  onDragEntry: (event: React.DragEvent, entry: AgentCellFileChangeEntry) => void;
  onClearPreview: () => void;
};

export function ExplorerChangedFilesPanel({
  entries,
  selectedCell,
  selectedCellId,
  isOpen,
  mode,
  refreshing,
  updatedAt,
  preview,
  onRefresh,
  onToggleOpen,
  onModeChange,
  onOpenEntry,
  onRevealEntry,
  onPreviewEntry,
  onDragEntry,
  onClearPreview,
}: ExplorerChangedFilesPanelProps) {
  return (
    <div
      className="mx-2 mb-2 shrink-0 rounded-lg border border-border/60 bg-card/35"
      data-testid="explorer-changes-panel"
    >
      <div className="flex items-center justify-between px-2 py-1 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <FileText size={11} strokeWidth={1.6} />
          Changed Files
          <span className="ml-1 rounded bg-background/60 px-1 text-[9px] font-mono text-muted-foreground/80">{entries.length}</span>
        </span>
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={() => void onRefresh()}
            className="rounded p-1 text-muted-foreground hover:text-foreground"
            title="Refresh changed files"
            disabled={refreshing}
          >
            <RefreshCw
              size={10}
              strokeWidth={1.6}
              className={refreshing ? 'animate-spin' : ''}
            />
          </button>
          <button
            type="button"
            onClick={onToggleOpen}
            className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide transition-colors ${
              isOpen ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
            title={isOpen ? 'Hide changed files panel' : 'Open changed files panel'}
          >
            {isOpen ? 'Close' : 'Open'}
          </button>
        </div>
      </div>

      {isOpen ? (
        <div className="border-t border-border/40 px-2 pb-2 pt-1.5 flex max-h-64 min-h-0 flex-col">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="truncate text-[10px] text-muted-foreground/80">
              {selectedCell?.name || selectedCellId || 'Selected Cell'}
            </span>
            <div className="inline-flex rounded bg-background/60 p-0.5">
              <button
                type="button"
                onClick={() => onModeChange('flat')}
                className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide transition-colors ${
                  mode === 'flat'
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Flat
              </button>
              <button
                type="button"
                onClick={() => onModeChange('tree')}
                className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide transition-colors ${
                  mode === 'tree'
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Tree
              </button>
            </div>
          </div>

          <FileDashboardList
            entries={entries}
            mode={mode}
            loading={refreshing}
            loadingMessage="Scanning changed files…"
            emptyMessage="No changed files in the selected Cell."
            onOpen={(entry) => void onOpenEntry(entry)}
            onReveal={(entry) => void onRevealEntry(entry)}
            onPreview={(entry) => void onPreviewEntry(entry)}
            onDragStart={onDragEntry}
            preview={preview}
            onClearPreview={onClearPreview}
            listTestId="explorer-changes-panel-list"
          />

          {updatedAt ? (
            <div className="mt-1 text-[9px] text-muted-foreground/80">
              Updated {formatIdleShort(Math.max(0, Date.now() - updatedAt))} ago
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
