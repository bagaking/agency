import React from 'react';
import { ChevronDown, FileText, RefreshCw } from 'lucide-react';

import { formatIdleShort } from '../../utils/timeFormat';
import type { AgentCellFileChangeEntry } from '../../utils/agentCellFileChanges';
import {
  FileDashboardList,
  type FileDashboardPreviewState,
} from '../fileDashboard/FileDashboardList';
import { IconButton } from '../ui/IconButton';
import { focusRing } from '../ui/focusRing';

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
  const panelBodyId = 'explorer-changed-files-panel-body';
  const focusRingClass = focusRing.sidebar;

  return (
    <div
      className="mx-2 mb-2 shrink-0 rounded-md border border-white/[0.08] bg-white/[0.04]"
      data-testid="explorer-changes-panel"
    >
      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 text-[10px] text-muted-foreground">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1">
            <FileText size={11} strokeWidth={1.6} />
            <span className="font-semibold uppercase tracking-[0.18em] text-muted-foreground/[0.55]">
              Changed Files
            </span>
            <span className="ml-1 rounded bg-background/60 px-1 text-[9px] font-mono text-muted-foreground/80">{entries.length}</span>
          </div>
          <div className="mt-0.5 truncate text-[10px] text-muted-foreground/60">
            {selectedCell?.name || selectedCellId || 'Selected Cell'}
          </div>
        </div>
        <div className="inline-flex items-center gap-1">
          <IconButton
            label="Refresh changed files"
            focusRing="sidebar"
            onClick={() => void onRefresh()}
            className="h-6 w-6 rounded-md text-muted-foreground hover:bg-white/5 hover:text-foreground"
            disabled={refreshing}
          >
            <RefreshCw
              size={10}
              strokeWidth={1.6}
              className={refreshing ? 'animate-spin' : ''}
            />
          </IconButton>
          <button
            type="button"
            onClick={onToggleOpen}
            aria-expanded={isOpen}
            aria-controls={panelBodyId}
            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide transition-colors ${focusRingClass} ${
              isOpen ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
            title={isOpen ? 'Collapse changed files panel' : 'Expand changed files panel'}
          >
            <ChevronDown
              size={10}
              strokeWidth={1.8}
              className={`transition-transform ${isOpen ? 'rotate-0' : '-rotate-90'}`}
              aria-hidden="true"
            />
            {isOpen ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>

      {isOpen ? (
        <div
          id={panelBodyId}
          className="border-t border-white/8 px-2.5 pb-2 pt-1.5 flex max-h-64 min-h-0 flex-col"
        >
          <div className="mb-1 flex items-center justify-between gap-2">
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
                title="Group files by folder"
              >
                Grouped
              </button>
            </div>
            {updatedAt ? (
              <div className="text-[9px] text-muted-foreground/[0.55]">
                Updated {formatIdleShort(Math.max(0, Date.now() - updatedAt))} ago
              </div>
            ) : null}
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
        </div>
      ) : null}
    </div>
  );
}
