import React from 'react';
import { Plus, RefreshCw, FolderOpen } from 'lucide-react';
import { stateBadge, formatTime } from './actionSheetUi.js';

export function ActionSheetsSidebar({
  projectReady,
  sheets = [],
  selectedId,
  onSelectSheet,
  onCreateSheet,
  onRefreshList,
  loading,
}) {
  const hasRunning = sheets.some((sheet) => sheet.state === 'running' || sheet.state === 'waiting_gate');

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
        <button
          type="button"
          onClick={onCreateSheet}
          className="rounded-md border border-sidebar-border px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
        >
          <Plus size={12} />
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-sidebar-border/50 bg-sidebar/50">
        <button
          type="button"
          onClick={onRefreshList}
          className="flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-foreground transition-colors"
        >
          <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
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
                <span className={`rounded-full border px-1.5 py-0.5 text-[8px] uppercase font-bold tracking-wider ${stateBadge(sheet.state)}`}>
                  {sheet.state || 'queued'}
                </span>
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
