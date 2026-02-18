import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FileText, RefreshCw, GripHorizontal } from 'lucide-react';

import { FileDashboardList } from '../fileDashboard/FileDashboardList';
import { useFileSnippetPreview } from '../../hooks/useFileSnippetPreview';
import { formatIdleShort } from '../../utils/timeFormat';
import { buildAgentCellModifiedFileChanges, type AgentCellFileChangeEntry } from '../../utils/agentCellFileChanges';
import { setFileDragPayload } from '../../utils/fileDragPayload';
import {
  hasExternalDropEntries as hasExternalDroppedPaths,
  readExternalDropPaths as readDroppedExternalPaths,
} from '../../utils/externalDropPaths';
import { getExplorerStatus, getPathForDroppedFile, searchExplorerFiles } from '../../services/agencyBridge';

const FILE_DASHBOARD_MIN_HEIGHT = 148;
const FILE_DASHBOARD_DEFAULT_RATIO = 0.5;
const FILE_DASHBOARD_MAX_RATIO = 0.82;
const FILE_DASHBOARD_ALL_LIMIT = 4000;
const AGENTS_PANEL_MIN_HEIGHT = 128;

const clampNumber = (value: number, min: number, max: number) => {
  const upper = Math.max(min, max);
  return Math.min(upper, Math.max(min, value));
};

type AgentCellsExplorerPanelProps = {
  projectReady?: boolean;
  selectedCell?: any | null;
  sidebarBodyHeight?: number;
  sidebarTopHeight?: number;
  onOpenFileReference?: (payload: any) => void;
  onRevealFileReference?: (payload: any) => void;
  onImportFileReferences?: (payload: any) => Promise<any>;
};

export function AgentCellsExplorerPanel({
  projectReady = false,
  selectedCell = null,
  sidebarBodyHeight = 0,
  sidebarTopHeight = 0,
  onOpenFileReference,
  onRevealFileReference,
  onImportFileReferences,
}: AgentCellsExplorerPanelProps) {
  const [fileDashboardOpen, setFileDashboardOpen] = useState(true);
  const [fileDashboardLoading, setFileDashboardLoading] = useState(false);
  const [fileDashboardEntries, setFileDashboardEntries] = useState<AgentCellFileChangeEntry[]>([]);
  const [fileDashboardAllPaths, setFileDashboardAllPaths] = useState<string[]>([]);
  const [fileDashboardAllTruncated, setFileDashboardAllTruncated] = useState(false);
  const [fileDashboardUpdatedAt, setFileDashboardUpdatedAt] = useState(0);
  const [fileDashboardMode, setFileDashboardMode] = useState<'flat' | 'tree'>('flat');
  const [fileDashboardCellFilter, setFileDashboardCellFilter] = useState<'changes' | 'all'>('changes');
  const [fileDashboardNotice, setFileDashboardNotice] = useState('');
  const fileDashboardSnippetPreview = useFileSnippetPreview({ defaultContext: 2 });
  const fileDashboardPreview = fileDashboardSnippetPreview.preview;
  const [fileDashboardHeight, setFileDashboardHeight] = useState<number | null>(null);
  const [fileDashboardDragging, setFileDashboardDragging] = useState(false);

  const fileDashboardDragRef = useRef<{
    startY: number;
    startHeight: number;
    minHeight: number;
    maxHeight: number;
  } | null>(null);

  const fileDashboardScopeLabel = useMemo(() => {
    return fileDashboardCellFilter === 'all' ? 'All files · selected Cell' : 'Changes · selected Cell';
  }, [fileDashboardCellFilter]);

  const loadFileDashboardPreview = useCallback(
    async (shortcut: AgentCellFileChangeEntry) => {
      if (!shortcut?.relativePath || !selectedCell?.worktreePath) {
        fileDashboardSnippetPreview.clearPreview();
        return;
      }

      const relativePath = String(shortcut.relativePath).trim();
      if (!relativePath) {
        fileDashboardSnippetPreview.clearPreview();
        return;
      }

      const line = Number.isFinite(shortcut.line) ? Math.max(1, Math.floor(Number(shortcut.line))) : null;
      await fileDashboardSnippetPreview.loadPreview({
        rootPath: selectedCell.worktreePath,
        targetPath: relativePath,
        relativePath,
        line,
        context: 2,
      });
    },
    [fileDashboardSnippetPreview, selectedCell?.worktreePath]
  );

  const clearFileDashboardPreview = useCallback(() => {
    fileDashboardSnippetPreview.clearPreview();
  }, [fileDashboardSnippetPreview]);

  const canDropIntoFileDashboard = Boolean(
    selectedCell?.id && selectedCell?.worktreePath && onImportFileReferences
  );

  const computeFileDashboardMaxHeight = useCallback(() => {
    if (!sidebarBodyHeight) {
      return 0;
    }

    const middleAreaHeight = Math.max(0, sidebarBodyHeight - sidebarTopHeight);
    if (!middleAreaHeight) {
      return 0;
    }

    const minHeight = Math.min(FILE_DASHBOARD_MIN_HEIGHT, middleAreaHeight);
    const preferredMax = Math.floor(middleAreaHeight * FILE_DASHBOARD_MAX_RATIO);
    const spaceBoundMax = Math.floor(middleAreaHeight - AGENTS_PANEL_MIN_HEIGHT);
    const maxCandidate = Math.min(preferredMax, spaceBoundMax);
    return Math.max(minHeight, Math.min(middleAreaHeight, maxCandidate));
  }, [sidebarBodyHeight, sidebarTopHeight]);

  const resolvedFileDashboardHeight = useMemo(() => {
    if (!fileDashboardOpen || !sidebarBodyHeight) {
      return 0;
    }
    const maxHeight = computeFileDashboardMaxHeight();
    if (!maxHeight) {
      return 0;
    }
    const middleAreaHeight = Math.max(0, sidebarBodyHeight - sidebarTopHeight);
    const fallback = Math.round(middleAreaHeight * FILE_DASHBOARD_DEFAULT_RATIO);
    const minHeight = Math.min(FILE_DASHBOARD_MIN_HEIGHT, maxHeight);
    const baseHeight =
      Number.isFinite(fileDashboardHeight as number) && Number(fileDashboardHeight) > 0
        ? Number(fileDashboardHeight)
        : fallback;
    return clampNumber(baseHeight, minHeight, maxHeight);
  }, [computeFileDashboardMaxHeight, fileDashboardHeight, fileDashboardOpen, sidebarBodyHeight, sidebarTopHeight]);

  useEffect(() => {
    if (!fileDashboardOpen) {
      return;
    }
    const maxHeight = computeFileDashboardMaxHeight();
    if (!maxHeight) {
      return;
    }
    setFileDashboardHeight((current) => {
      const middleAreaHeight = Math.max(0, sidebarBodyHeight - sidebarTopHeight);
      const fallback = Math.round(middleAreaHeight * FILE_DASHBOARD_DEFAULT_RATIO);
      const minHeight = Math.min(FILE_DASHBOARD_MIN_HEIGHT, maxHeight);
      const baseHeight = Number.isFinite(current as number) && Number(current) > 0 ? Number(current) : fallback;
      return clampNumber(baseHeight, minHeight, maxHeight);
    });
  }, [computeFileDashboardMaxHeight, fileDashboardOpen, sidebarBodyHeight, sidebarTopHeight]);

  const handleFileDashboardResizeStart = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (!fileDashboardOpen) {
        return;
      }
      event.preventDefault();

      const maxHeight = computeFileDashboardMaxHeight();
      if (!maxHeight) {
        return;
      }

      const middleAreaHeight = Math.max(0, sidebarBodyHeight - sidebarTopHeight);
      const fallbackHeight = Math.round(middleAreaHeight * FILE_DASHBOARD_DEFAULT_RATIO);
      const minHeight = Math.min(FILE_DASHBOARD_MIN_HEIGHT, maxHeight);
      const startHeight = clampNumber(resolvedFileDashboardHeight || fallbackHeight, minHeight, maxHeight);
      fileDashboardDragRef.current = {
        startY: event.clientY,
        startHeight,
        minHeight,
        maxHeight,
      };
      setFileDashboardDragging(true);
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const state = fileDashboardDragRef.current;
        if (!state) {
          return;
        }
        const delta = state.startY - moveEvent.clientY;
        const nextHeight = clampNumber(Math.round(state.startHeight + delta), state.minHeight, state.maxHeight);
        setFileDashboardHeight(nextHeight);
      };

      const finishDrag = () => {
        fileDashboardDragRef.current = null;
        setFileDashboardDragging(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', handlePointerUp);
      };

      const handlePointerUp = () => {
        finishDrag();
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);
    },
    [
      computeFileDashboardMaxHeight,
      fileDashboardOpen,
      resolvedFileDashboardHeight,
      sidebarBodyHeight,
      sidebarTopHeight,
    ]
  );

  useEffect(() => {
    return () => {
      if (fileDashboardDragRef.current) {
        fileDashboardDragRef.current = null;
      }
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, []);

  useEffect(() => {
    setFileDashboardNotice('');
    clearFileDashboardPreview();
  }, [clearFileDashboardPreview, fileDashboardCellFilter, selectedCell?.id]);

  useEffect(() => {
    setFileDashboardAllPaths([]);
    setFileDashboardAllTruncated(false);
  }, [selectedCell?.id, selectedCell?.worktreePath]);

  const handleFileDashboardOpen = useCallback(
    (shortcut: AgentCellFileChangeEntry, options: { focusView?: boolean; mode?: 'preview' | 'pinned' } = {}) => {
      if (!shortcut?.relativePath || !selectedCell?.id || !selectedCell?.worktreePath) {
        return;
      }
      const focusView = options.focusView !== false;
      const mode = options.mode === 'preview' ? 'preview' : 'pinned';
      onOpenFileReference?.({
        cellId: selectedCell.id,
        rootPath: selectedCell.worktreePath,
        path: shortcut.relativePath,
        line: shortcut.line || undefined,
        column: shortcut.column || undefined,
        focusView,
        mode,
      });
    },
    [onOpenFileReference, selectedCell?.id, selectedCell?.worktreePath]
  );

  const handleFileDashboardReveal = useCallback(
    (shortcut: AgentCellFileChangeEntry) => {
      if (!shortcut?.relativePath || !selectedCell?.id || !selectedCell?.worktreePath) {
        return;
      }
      onRevealFileReference?.({
        cellId: selectedCell.id,
        rootPath: selectedCell.worktreePath,
        path: shortcut.relativePath,
      });
    },
    [onRevealFileReference, selectedCell?.id, selectedCell?.worktreePath]
  );

  const handleFileDashboardPreview = useCallback(
    async (shortcut: AgentCellFileChangeEntry) => {
      await loadFileDashboardPreview(shortcut);
      handleFileDashboardOpen(shortcut, {
        focusView: false,
        mode: 'preview',
      });
    },
    [handleFileDashboardOpen, loadFileDashboardPreview]
  );

  const handleFileDashboardDragStart = useCallback((event: React.DragEvent, shortcut: AgentCellFileChangeEntry) => {
    const success = setFileDragPayload(event, shortcut?.absolutePath || '');
    if (!success) {
      event.preventDefault();
    }
  }, []);

  const hasExternalDropEntries = useCallback((dataTransfer: any) => hasExternalDroppedPaths(dataTransfer), []);

  const readExternalDropPaths = useCallback(
    (dataTransfer: any) =>
      readDroppedExternalPaths(dataTransfer, {
        getPathForDroppedFile,
      }),
    []
  );

  const refreshFileDashboard = useCallback(
    async ({ showBusy = false, forceAllPaths = false }: { showBusy?: boolean; forceAllPaths?: boolean } = {}) => {
      if (!fileDashboardOpen || !selectedCell?.id || !selectedCell?.worktreePath) {
        setFileDashboardEntries([]);
        setFileDashboardLoading(false);
        setFileDashboardUpdatedAt(0);
        return;
      }
      if (showBusy) {
        setFileDashboardLoading(true);
      }
      try {
        const status = await getExplorerStatus({
          rootPath: selectedCell.worktreePath,
        });
        const statusFiles = status?.files || {};
        const baseRoot = String(selectedCell.worktreePath || '').replace(/\/+$/, '');

        if (fileDashboardCellFilter === 'all') {
          let allPaths = fileDashboardAllPaths;
          let truncated = fileDashboardAllTruncated;

          if (!allPaths.length || forceAllPaths) {
            const result = await searchExplorerFiles({
              rootPath: selectedCell.worktreePath,
              query: '',
              includeAll: true,
              limit: FILE_DASHBOARD_ALL_LIMIT,
            });
            allPaths = Array.isArray(result?.matches) ? result.matches : [];
            truncated = Boolean(result?.truncated);
            setFileDashboardAllPaths(allPaths);
            setFileDashboardAllTruncated(truncated);
          }

          const changedEntries = buildAgentCellModifiedFileChanges({
            statusFiles,
            cellId: selectedCell.id,
          })
            .filter((entry) => String(entry?.status || '').toLowerCase() !== 'ignored')
            .map((entry) => ({
              ...entry,
              absolutePath: baseRoot && entry?.relativePath ? `${baseRoot}/${entry.relativePath}` : '',
            }));

          const changedSet = new Set(changedEntries.map((entry) => entry.relativePath));
          const cleanEntries = allPaths
            .filter((relativePath) => !changedSet.has(relativePath))
            .map((relativePath) => ({
              rawText: relativePath,
              relativePath,
              displayPath: relativePath.split('/').pop() || relativePath,
              absolutePath: baseRoot ? `${baseRoot}/${relativePath}` : '',
              line: null,
              column: null,
              sessions: [],
              sessionCount: 0,
              latestActivityAt: 0,
            }));
          cleanEntries.sort((left, right) => left.relativePath.localeCompare(right.relativePath));

          setFileDashboardEntries([...changedEntries, ...cleanEntries]);
          setFileDashboardUpdatedAt(Date.now());
          return;
        }

        const nextEntries = buildAgentCellModifiedFileChanges({
          statusFiles,
          cellId: selectedCell.id,
        })
          .filter((entry) => String(entry?.status || '').toLowerCase() !== 'ignored')
          .map((entry) => ({
            ...entry,
            absolutePath: baseRoot && entry?.relativePath ? `${baseRoot}/${entry.relativePath}` : '',
          }));
        setFileDashboardEntries(nextEntries);
        setFileDashboardUpdatedAt(Date.now());
      } finally {
        if (showBusy) {
          setFileDashboardLoading(false);
        }
      }
    },
    [
      fileDashboardOpen,
      fileDashboardCellFilter,
      fileDashboardAllPaths,
      fileDashboardAllTruncated,
      selectedCell?.id,
      selectedCell?.worktreePath,
    ]
  );

  const handleFileDashboardImport = useCallback(
    async (sourcePaths: string[]) => {
      if (!sourcePaths?.length || !selectedCell?.id || !selectedCell?.worktreePath) {
        return;
      }
      if (!onImportFileReferences) {
        setFileDashboardNotice('Import is unavailable.');
        return;
      }

      try {
        const report = await onImportFileReferences({
          cellId: selectedCell.id,
          rootPath: selectedCell.worktreePath,
          sourcePaths,
        });
        if (!report) {
          setFileDashboardNotice('Import is unavailable.');
          return;
        }
        const importedCount = Array.isArray(report.imported)
          ? report.imported.length
          : Array.isArray(report.importedPaths)
            ? report.importedPaths.length
            : 0;
        const failureCount = Array.isArray(report.failures) ? report.failures.length : 0;
        if (failureCount > 0) {
          const firstFailure = report.failures?.[0]?.error ? ` (${report.failures[0].error})` : '';
          if (importedCount > 0) {
            setFileDashboardNotice(
              `Imported ${importedCount} item${importedCount === 1 ? '' : 's'} with ${failureCount} failure${
                failureCount === 1 ? '' : 's'
              }${firstFailure}.`
            );
          } else {
            setFileDashboardNotice(
              `Import failed: ${failureCount} failure${failureCount === 1 ? '' : 's'}${firstFailure}.`
            );
          }
        } else if (importedCount > 0) {
          setFileDashboardNotice(
            `Imported ${importedCount} item${importedCount === 1 ? '' : 's'} into ${
              selectedCell.name || selectedCell.id
            }.`
          );
        } else {
          setFileDashboardNotice('No files were imported.');
        }
        await refreshFileDashboard({ showBusy: true, forceAllPaths: true });
      } catch (error: any) {
        setFileDashboardNotice(error?.message || 'Import failed.');
      }
    },
    [onImportFileReferences, refreshFileDashboard, selectedCell?.id, selectedCell?.name, selectedCell?.worktreePath]
  );

  const handleFileDashboardDragOver = useCallback(
    (event: React.DragEvent) => {
      if (!fileDashboardOpen || !canDropIntoFileDashboard) {
        return;
      }
      if (!hasExternalDropEntries(event.dataTransfer)) {
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    },
    [canDropIntoFileDashboard, fileDashboardOpen, hasExternalDropEntries]
  );

  const handleFileDashboardDrop = useCallback(
    async (event: React.DragEvent) => {
      if (!fileDashboardOpen || !canDropIntoFileDashboard) {
        return;
      }
      if (!hasExternalDropEntries(event.dataTransfer)) {
        return;
      }
      event.preventDefault();
      const sourcePaths = readExternalDropPaths(event.dataTransfer);
      if (!sourcePaths.length) {
        setFileDashboardNotice('Unable to read dropped file paths.');
        return;
      }
      await handleFileDashboardImport(sourcePaths);
    },
    [canDropIntoFileDashboard, fileDashboardOpen, handleFileDashboardImport, hasExternalDropEntries, readExternalDropPaths]
  );

  useEffect(() => {
    if (!fileDashboardOpen) {
      setFileDashboardEntries([]);
      setFileDashboardAllPaths([]);
      setFileDashboardAllTruncated(false);
      setFileDashboardLoading(false);
      setFileDashboardUpdatedAt(0);
      setFileDashboardNotice('');
      clearFileDashboardPreview();
      return;
    }
    void refreshFileDashboard({ showBusy: true });
    const intervalMs = fileDashboardCellFilter === 'all' ? 6000 : 1600;
    const timer = setInterval(() => {
      void refreshFileDashboard();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [clearFileDashboardPreview, fileDashboardCellFilter, fileDashboardOpen, refreshFileDashboard]);

  return projectReady && selectedCell?.worktreePath ? (
    <div
      className="mt-2 shrink-0 -mx-2 border-t border-border/40 bg-sidebar/20"
      data-testid="agent-cells-file-dashboard"
      onDragOver={handleFileDashboardDragOver}
      onDrop={handleFileDashboardDrop}
    >
      <div className="flex items-center justify-between px-3 py-2 text-[11px] font-medium text-muted-foreground">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <FileText size={11} strokeWidth={1.6} />
          <span className="truncate">Explorer</span>
          {fileDashboardOpen ? (
            <span className="rounded bg-background/60 px-1 text-[9px] font-mono text-muted-foreground/80">
              {fileDashboardEntries.length}
            </span>
          ) : null}
        </span>
        <div className="inline-flex items-center gap-1">
          {fileDashboardOpen ? (
            <button
              type="button"
              onClick={() => void refreshFileDashboard({ showBusy: true, forceAllPaths: true })}
              className="rounded p-1 text-muted-foreground hover:text-foreground"
              title="Refresh Explorer panel"
              disabled={fileDashboardLoading}
            >
              <RefreshCw
                size={10}
                strokeWidth={1.6}
                className={fileDashboardLoading ? 'animate-spin' : ''}
              />
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => setFileDashboardOpen((current) => !current)}
            disabled={!projectReady || !selectedCell?.worktreePath}
            data-testid="agent-cells-file-dashboard-toggle"
            className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide transition-colors ${
              fileDashboardOpen ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
            title={fileDashboardOpen ? 'Hide Explorer panel' : 'Open Explorer panel'}
          >
            <span>{fileDashboardOpen ? 'Close' : 'Open'}</span>
          </button>
        </div>
      </div>

      {fileDashboardOpen ? (
        <div
          className={`flex h-full flex-col ${fileDashboardDragging ? 'select-none' : ''}`}
          style={{
            height: `${resolvedFileDashboardHeight || FILE_DASHBOARD_MIN_HEIGHT}px`,
          }}
        >
          <button
            type="button"
            onPointerDown={handleFileDashboardResizeStart}
            className="flex h-5 w-full cursor-row-resize items-center justify-center text-muted-foreground/50 hover:text-foreground"
            title="Drag to resize Explorer panel"
          >
            <GripHorizontal size={12} strokeWidth={1.6} />
          </button>

          <div className="flex min-h-0 flex-1 flex-col gap-1 px-3 pb-2">
            <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
              <span className="truncate">{selectedCell.name || selectedCell.id}</span>
              <span className="truncate text-[9px] text-muted-foreground/70">{fileDashboardScopeLabel}</span>
            </div>

            {fileDashboardCellFilter === 'all' && fileDashboardAllTruncated ? (
              <div className="text-[9px] text-muted-foreground/70">
                Showing first {FILE_DASHBOARD_ALL_LIMIT} files in this Cell.
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-1">
              <div className="inline-flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => setFileDashboardCellFilter('changes')}
                  className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide transition-colors ${
                    fileDashboardCellFilter === 'changes'
                      ? 'bg-primary/15 text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Changes
                </button>
                <button
                  type="button"
                  onClick={() => setFileDashboardCellFilter('all')}
                  className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide transition-colors ${
                    fileDashboardCellFilter === 'all'
                      ? 'bg-primary/15 text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  All
                </button>
              </div>

              <div className="inline-flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => setFileDashboardMode('flat')}
                  className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide transition-colors ${
                    fileDashboardMode === 'flat'
                      ? 'bg-primary/15 text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Flat
                </button>
                <button
                  type="button"
                  onClick={() => setFileDashboardMode('tree')}
                  className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide transition-colors ${
                    fileDashboardMode === 'tree'
                      ? 'bg-primary/15 text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Tree
                </button>
              </div>
            </div>

            {fileDashboardNotice ? (
              <div className="rounded bg-primary/10 px-1.5 py-1 text-[9px] text-primary">{fileDashboardNotice}</div>
            ) : null}

            <FileDashboardList
              entries={fileDashboardEntries}
              mode={fileDashboardMode}
              loading={fileDashboardLoading}
              loadingMessage={
                fileDashboardCellFilter === 'changes'
                  ? 'Scanning changes for selected Cell…'
                  : 'Listing files for selected Cell…'
              }
              emptyMessage={
                fileDashboardCellFilter === 'changes'
                  ? 'No changed files in the selected Cell.'
                  : 'No files found in the selected Cell.'
              }
              onOpen={(entry) => handleFileDashboardOpen(entry)}
              onReveal={(entry) => handleFileDashboardReveal(entry)}
              onPreview={(entry) => handleFileDashboardPreview(entry)}
              onDragStart={handleFileDashboardDragStart}
              preview={fileDashboardPreview}
              onClearPreview={clearFileDashboardPreview}
              listTestId="agent-cells-file-dashboard-list"
            />

            {canDropIntoFileDashboard ? (
              <div className="text-[9px] text-muted-foreground/80">
                Drop local files here to import into this Cell worktree.
              </div>
            ) : null}

            {fileDashboardUpdatedAt ? (
              <div className="text-[9px] text-muted-foreground/80">
                Updated {formatIdleShort(Math.max(0, Date.now() - fileDashboardUpdatedAt))} ago
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  ) : null;
}

