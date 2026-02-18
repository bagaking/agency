import { useCallback, useEffect, useState, type DragEvent } from 'react';
import { useFileSnippetPreview } from '../../hooks/useFileSnippetPreview';
import { setFileDragPayload } from '../../utils/fileDragPayload';
import type { AgentCellFileChangeEntry } from '../../utils/agentCellFileChanges';
import { explorerPathUtils } from '../../hooks/useProjectExplorer';

type UseExplorerChangedFilesActionsOptions = {
  rootPath: string;
  scopeRootPath: string;
  selectedCellWorktreePath: string;
  selectedCellId: string | null;
  isPanelOpen: boolean;
  changedPanelEntries: AgentCellFileChangeEntry[];
  refreshAll: (payload: { forceStatus: boolean }) => Promise<void>;
  selectPathInExplorer: (path: string) => void;
  handleOpenEntry: (path: string, mode: 'preview' | 'pinned') => Promise<boolean>;
  expandAncestorsForPath: (path: string) => Promise<boolean>;
  revealEntry: (payload: { targetPath: string }) => Promise<void>;
  clearError: () => void;
  setErrorMessage: (message: string) => void;
};

export const useExplorerChangedFilesActions = ({
  rootPath,
  scopeRootPath,
  selectedCellWorktreePath,
  selectedCellId,
  isPanelOpen,
  changedPanelEntries,
  refreshAll,
  selectPathInExplorer,
  handleOpenEntry,
  expandAncestorsForPath,
  revealEntry,
  clearError,
  setErrorMessage,
}: UseExplorerChangedFilesActionsOptions) => {
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(0);
  const snippetPreview = useFileSnippetPreview({ defaultContext: 2 });

  useEffect(() => {
    setUpdatedAt(Date.now());
  }, [changedPanelEntries, selectedCellId]);

  useEffect(() => {
    snippetPreview.clearPreview();
  }, [selectedCellId, snippetPreview]);

  useEffect(() => {
    if (isPanelOpen) {
      return;
    }
    snippetPreview.clearPreview();
  }, [isPanelOpen, snippetPreview]);

  const refreshChangesPanel = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshAll({ forceStatus: true });
      setUpdatedAt(Date.now());
    } finally {
      setRefreshing(false);
    }
  }, [refreshAll]);

  const handleOpenChangedEntry = useCallback(
    async (
      entry: AgentCellFileChangeEntry,
      options: {
        mode?: 'preview' | 'pinned';
      } = {}
    ) => {
      const targetPath = explorerPathUtils.toRelativePath(entry?.relativePath || '');
      if (!targetPath) {
        return;
      }

      // Keep the dispatch footer ("pending send") in sync with changed-files interactions.
      selectPathInExplorer(targetPath);

      const mode = options.mode === 'pinned' ? 'pinned' : 'preview';
      const opened = await handleOpenEntry(targetPath, mode);
      if (!opened) {
        return;
      }
      try {
        const expanded = await expandAncestorsForPath(targetPath);
        if (expanded) {
          selectPathInExplorer(targetPath);
        }
      } catch {
        // Ignore selection sync failures; open already succeeded.
      }
    },
    [expandAncestorsForPath, handleOpenEntry, selectPathInExplorer]
  );

  const handleRevealChangedEntry = useCallback(
    async (entry: AgentCellFileChangeEntry) => {
      const targetPath = explorerPathUtils.toRelativePath(entry?.relativePath || '');
      if (!targetPath) {
        return;
      }

      // Sync footer selection even when only revealing (no open).
      selectPathInExplorer(targetPath);

      try {
        await revealEntry({ targetPath });
        const expanded = await expandAncestorsForPath(targetPath);
        if (expanded) {
          selectPathInExplorer(targetPath);
        }
        clearError();
      } catch (error: any) {
        setErrorMessage(error?.message || 'Failed to reveal file.');
      }
    },
    [clearError, expandAncestorsForPath, revealEntry, selectPathInExplorer, setErrorMessage]
  );

  const handlePreviewChangedEntry = useCallback(
    async (entry: AgentCellFileChangeEntry) => {
      const targetPath = explorerPathUtils.toRelativePath(entry?.relativePath || '');
      const activeRootPath = selectedCellWorktreePath || rootPath || scopeRootPath || '';
      if (!targetPath || !activeRootPath) {
        snippetPreview.clearPreview();
        return;
      }

      const line = Number.isFinite(entry?.line) ? Math.max(1, Math.floor(entry.line)) : null;
      await snippetPreview.loadPreview({
        rootPath: activeRootPath,
        targetPath,
        relativePath: targetPath,
        line,
        context: 2,
      });
    },
    [rootPath, scopeRootPath, selectedCellWorktreePath, snippetPreview]
  );

  const handleChangeEntryDragStart = useCallback(
    (event: DragEvent, entry: AgentCellFileChangeEntry) => {
      const success = setFileDragPayload(event, entry?.absolutePath || '');
      if (!success) {
        event.preventDefault();
      }
    },
    []
  );

  return {
    changesPanelPreview: snippetPreview.preview,
    changesPanelRefreshing: refreshing,
    changesPanelUpdatedAt: updatedAt,
    refreshChangesPanel,
    clearChangesPanelPreview: snippetPreview.clearPreview,
    handleOpenChangedEntry,
    handleRevealChangedEntry,
    handlePreviewChangedEntry,
    handleChangeEntryDragStart,
  };
};
