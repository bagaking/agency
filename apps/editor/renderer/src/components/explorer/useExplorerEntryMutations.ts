import { useCallback } from 'react';
import { explorerPathUtils } from '../../hooks/useProjectExplorer';

type UseExplorerEntryMutationsArgs = {
  activeDir: string;
  draftEntry: any;
  renameTarget: any;
  modal: any;
  expandPath: (path: string) => void;
  setDraftEntry: (value: any) => void;
  setRenameTarget: (value: any) => void;
  createEntry: (payload: { type: string; parentPath: string; name: string }) => Promise<unknown>;
  renameEntry: (payload: { sourcePath: string; targetPath: string }) => Promise<unknown>;
  deleteEntry: (payload: { targetPath: string }) => Promise<unknown>;
  copyEntry: (payload: { sourcePath: string; targetPath: string }) => Promise<unknown>;
  revealEntry: (payload: { targetPath: string }) => Promise<unknown>;
  refreshAll: (options?: { forceStatus?: boolean; reloadExpanded?: boolean }) => Promise<unknown>;
  clearError: () => void;
  setErrorMessage: (message: string) => void;
  setSelectedPaths: (value: any) => void;
};

export function useExplorerEntryMutations({
  activeDir,
  draftEntry,
  renameTarget,
  modal,
  expandPath,
  setDraftEntry,
  setRenameTarget,
  createEntry,
  renameEntry,
  deleteEntry,
  copyEntry,
  revealEntry,
  refreshAll,
  clearError,
  setErrorMessage,
  setSelectedPaths,
}: UseExplorerEntryMutationsArgs) {
  const startDraft = useCallback(
    (type: 'file' | 'dir') => {
      if (activeDir) {
        expandPath(activeDir);
      }
      setDraftEntry({ type, parentPath: activeDir || '', value: '' });
    },
    [activeDir, expandPath, setDraftEntry]
  );

  const handleDraftSubmit = useCallback(async () => {
    if (!draftEntry?.value) {
      setDraftEntry(null);
      return;
    }
    try {
      await createEntry({
        type: draftEntry.type,
        parentPath: draftEntry.parentPath,
        name: draftEntry.value,
      });
      clearError();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to create.');
    }
    setDraftEntry(null);
  }, [clearError, createEntry, draftEntry, setDraftEntry, setErrorMessage]);

  const handleRenameSubmit = useCallback(async () => {
    if (!renameTarget?.path || !renameTarget?.value) {
      setRenameTarget(null);
      return;
    }
    const parent = explorerPathUtils.dirname(renameTarget.path);
    const nextPath = [parent, renameTarget.value].filter(Boolean).join('/');
    if (nextPath === renameTarget.path) {
      setRenameTarget(null);
      return;
    }
    try {
      await renameEntry({ sourcePath: renameTarget.path, targetPath: nextPath });
      clearError();
    } catch (_err) {
      setErrorMessage('Rename failed.');
    }
    setRenameTarget(null);
  }, [clearError, renameEntry, renameTarget, setErrorMessage, setRenameTarget]);

  const handleDelete = useCallback(
    async (targets: string[] | string) => {
      const list = (Array.isArray(targets) ? targets : [targets]).filter(Boolean);
      if (!list.length) return;
      const confirmed = await modal?.confirm?.({
        title: list.length === 1 ? 'Delete item' : `Delete ${list.length} items`,
        description:
          list.length === 1
            ? 'The selected entry will be permanently removed.'
            : 'The selected entries will be permanently removed.',
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        tone: 'danger',
      });
      if (!confirmed) return;
      try {
        for (const targetPath of list) {
          // eslint-disable-next-line no-await-in-loop
          await deleteEntry({ targetPath });
        }
        setSelectedPaths((current: string[]) => current.filter((item) => !list.includes(item)));
        clearError();
      } catch (_err) {
        setErrorMessage('Delete failed.');
      }
    },
    [clearError, deleteEntry, modal, setErrorMessage, setSelectedPaths]
  );

  const handleDuplicate = useCallback(
    async (targetPath: string) => {
      const name = explorerPathUtils.basename(targetPath);
      const parent = explorerPathUtils.dirname(targetPath);
      const nextName = await modal?.prompt?.({
        title: 'Duplicate Entry',
        description: 'Choose the new name for the duplicated entry.',
        inputLabel: 'New name',
        defaultValue: `${name}-copy`,
        confirmLabel: 'Duplicate',
        cancelLabel: 'Cancel',
        validateValue: (value: string) =>
          String(value || '').trim() ? '' : 'A new entry name is required.',
        normalizeValue: (value: string) => value.trim(),
      });
      if (typeof nextName !== 'string' || !nextName) return;
      try {
        const nextPath = [parent, nextName].filter(Boolean).join('/');
        await copyEntry({ sourcePath: targetPath, targetPath: nextPath });
        await refreshAll();
      } catch (_err) {
        setErrorMessage('Duplicate failed.');
      }
    },
    [copyEntry, modal, refreshAll, setErrorMessage]
  );

  const handleReveal = useCallback(
    async (targets: string[] | string) => {
      const list = (Array.isArray(targets) ? targets : [targets]).filter(Boolean);
      try {
        for (const targetPath of list) {
          // eslint-disable-next-line no-await-in-loop
          await revealEntry({ targetPath });
        }
      } catch (_err) {
        // Non-blocking reveal action.
      }
    },
    [revealEntry]
  );

  const handleMove = useCallback(
    async (paths: string[], targetDir: string) => {
      try {
        let didMove = false;
        for (const sourcePath of paths) {
          if (sourcePath === targetDir || targetDir.startsWith(`${sourcePath}/`)) {
            setErrorMessage('Cannot move a folder into itself.');
            continue;
          }
          const nextPath = [targetDir, explorerPathUtils.basename(sourcePath)]
            .filter(Boolean)
            .join('/');
          if (sourcePath === nextPath) {
            continue;
          }
          // eslint-disable-next-line no-await-in-loop
          await renameEntry({ sourcePath, targetPath: nextPath });
          didMove = true;
        }
        if (didMove) {
          await refreshAll();
        }
      } catch (_err) {
        setErrorMessage('Move failed.');
      }
    },
    [refreshAll, renameEntry, setErrorMessage]
  );

  const requestRename = useCallback(
    (path: string) => {
      if (!path) return;
      setRenameTarget({ path, value: explorerPathUtils.basename(path) });
    },
    [setRenameTarget]
  );

  return {
    startDraft,
    handleDraftSubmit,
    handleRenameSubmit,
    handleDelete,
    handleDuplicate,
    handleReveal,
    handleMove,
    requestRename,
  };
}
