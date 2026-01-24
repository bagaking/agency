import React from 'react';
import { Plus, RefreshCw, FolderOpen, Archive } from 'lucide-react';
import { stateBadge, formatTime } from './actionSheetUi.js';
import { Tooltip } from '../ui/Tooltip.jsx';

export function ActionSheetsSidebar({
  projectReady,
  sheets = [],
  selectedId,
  onSelectSheet,
  onCreateSheet,
  onRefreshList,
  showArchived = false,
  onToggleArchived,
  loading,
}) {
  const hasRunning = sheets.some((sheet) => sheet.state === 'running' || sheet.state === 'waiting_gate');
  const archivedCount = sheets.filter((sheet) => sheet.archived).length;
  const focusRingClass =
    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background';

  if (!projectReady) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center text-muted-foreground/50">
        <FolderOpen size={24} className="mb-2 opacity-50" />
        <div className="text-xs">No project selected</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-sidebar">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-sidebar-border">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
            Action Sheets
          </div>
          <div className="text-[11px] text-muted-foreground/60">
            {sheets.length} total
          </div>
        </div>
        <Tooltip label="Create action sheet" side="left">
          <button
            type="button"
            onClick={onCreateSheet}
            aria-label="Create action sheet"
            className={`inline-flex h-7 w-7 items-center justify-center rounded-md border border-sidebar-border text-muted-foreground transition-colors hover:text-foreground hover:border-primary/40 ${focusRingClass}`}
          >
            <Plus size={12} aria-hidden="true" />
          </button>
        </Tooltip>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-sidebar-border/50 bg-sidebar/50">
        <Tooltip label="Refresh list" side="bottom">
          <button
            type="button"
            onClick={onRefreshList}
            aria-label="Refresh list"
            className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:text-foreground ${focusRingClass}`}
          >
            <RefreshCw size={10} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
          </button>
        </Tooltip>
        <Tooltip
          label={
            showArchived
              ? `Hide archived${archivedCount ? ` (${archivedCount})` : ''}`
              : `Show archived${archivedCount ? ` (${archivedCount})` : ''}`
          }
          side="bottom"
        >
          <button
            type="button"
            onClick={onToggleArchived}
            aria-pressed={showArchived}
            aria-label={showArchived ? 'Hide archived' : 'Show archived'}
            className={`inline-flex h-7 w-7 items-center justify-center rounded-md border transition-colors ${focusRingClass} ${
              showArchived
                ? 'border-primary/40 text-primary'
                : 'border-transparent text-muted-foreground/60 hover:text-foreground hover:border-sidebar-border'
            }`}
          >
            <Archive size={10} aria-hidden="true" />
          </button>
        </Tooltip>
        {hasRunning && (
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
            </span>
            <div className="text-[9px] uppercase tracking-[0.2em] text-amber-500/80 font-medium">
              Running
            </div>
          </div>
        )}
      </div>

      {/* Sheet List */}
      <div className="flex-1 overflow-y-auto py-1">
        {sheets.length ? (
          sheets.map((sheet) => (
            <button
              key={sheet.id}
              type="button"
              onClick={() => onSelectSheet(sheet.id)}
              className={`w-full px-4 py-3 text-left border-l-2 transition-all group ${
                selectedId === sheet.id
                  ? 'border-primary bg-sidebar-accent text-sidebar-foreground'
                  : 'border-transparent text-muted-foreground/70 hover:bg-sidebar-accent/50 hover:text-foreground'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className={`text-[12px] font-medium truncate ${selectedId === sheet.id ? 'text-foreground' : ''}`}>
                    {sheet.title || sheet.id}
                </span>
                <div className="flex items-center gap-1.5">
                  {sheet.archived ? (
                    <span className="rounded-full border border-border/30 px-1.5 py-0.5 text-[8px] uppercase font-semibold tracking-wider text-muted-foreground">
                      archived
                    </span>
                  ) : null}
                  <span className={`rounded-full border px-1.5 py-0.5 text-[8px] uppercase font-bold tracking-wider ${stateBadge(sheet.state)}`}>
                    {sheet.state || 'queued'}
                  </span>
                </div>
              </div>
              <div className="text-[10px] flex items-center gap-2 opacity-60">
                <span>{sheet.sessionId ? `#${sheet.sessionId}` : '-'}</span>
                <span className="text-[8px]">•</span>
                <span>{formatTime(sheet.updatedAt)}</span>
              </div>
            </button>
          ))
        ) : (
          <div className="px-4 py-8 text-center">
            <div className="text-[11px] text-muted-foreground/40 italic">
              No Action Sheets yet.
            </div>
            <button 
                onClick={onCreateSheet}
                className="mt-2 text-[10px] text-primary hover:underline"
            >
                Create one?
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
