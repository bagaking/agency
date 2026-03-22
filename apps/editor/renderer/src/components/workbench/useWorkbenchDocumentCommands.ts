import { useCallback } from 'react';
import { isAgencyMethodAvailable } from '../../services/agencyBridge';
import {
  loadWorkbenchBlameLines,
  loadWorkbenchDiffHunks,
  normalizeWorkbenchSaveAsPath,
  saveWorkbenchTabContent,
} from './workbenchPaneCommands';
import { loadWorkbenchCodeState } from './workbenchPaneLoaders';

type UseWorkbenchDocumentCommandsArgs = {
  activeTab: any;
  activeState: any;
  modal: any;
  openFile: (payload: { path: string; mode: 'pinned' | 'preview'; rootPath: string }) => void;
  updateTabState: (tabId: string, updates: Record<string, unknown>) => void;
  loadTab: (tab: any) => Promise<void> | void;
};

export function useWorkbenchDocumentCommands({
  activeTab,
  activeState,
  modal,
  openFile,
  updateTabState,
  loadTab,
}: UseWorkbenchDocumentCommandsArgs) {
  const handleSave = useCallback(async () => {
    if (!activeTab || !activeState || !isAgencyMethodAvailable('writeWorkbenchEntry')) return;
    updateTabState(activeTab.id, { saving: true });
    try {
      const content = activeState.content || '';
      const result = await saveWorkbenchTabContent({
        rootPath: activeTab.rootPath,
        targetPath: activeTab.path,
        content,
      });
      updateTabState(activeTab.id, {
        saving: false,
        isDirty: false,
        syncedContent: content,
        mtimeMs: result?.mtimeMs || activeState.mtimeMs,
        needsReload: false,
        diskMtimeMs: 0,
      });
    } catch (_error) {
      updateTabState(activeTab.id, { saving: false, error: 'Save failed' });
    }
  }, [activeState, activeTab, updateTabState]);

  const handleSaveAs = useCallback(async () => {
    if (!activeTab || !activeState || !isAgencyMethodAvailable('writeWorkbenchEntry')) {
      return;
    }
    const nextPath = await modal?.prompt?.({
      title: 'Save As',
      description: 'Provide the target path for the new workbench file.',
      inputLabel: 'Target path',
      placeholder: 'src/example.ts',
      defaultValue: activeTab.path,
      confirmLabel: 'Save',
      cancelLabel: 'Cancel',
      validateValue: (value: string) =>
        normalizeWorkbenchSaveAsPath(value) ? '' : 'A valid relative file path is required.',
    });
    if (typeof nextPath !== 'string') {
      return;
    }
    const normalizedPath = normalizeWorkbenchSaveAsPath(nextPath);
    if (!normalizedPath) {
      return;
    }
    updateTabState(activeTab.id, { saving: true });
    try {
      await saveWorkbenchTabContent({
        rootPath: activeTab.rootPath,
        targetPath: normalizedPath,
        content: activeState.content || '',
      });
      updateTabState(activeTab.id, { saving: false });
      openFile({ path: normalizedPath, mode: 'pinned', rootPath: activeTab.rootPath });
    } catch (_error) {
      updateTabState(activeTab.id, { saving: false, error: 'Save as failed.' });
    }
  }, [activeState, activeTab, modal, openFile, updateTabState]);

  const handleReload = useCallback(() => {
    if (activeTab) {
      void loadTab(activeTab);
    }
  }, [activeTab, loadTab]);

  const toggleDiff = useCallback(async () => {
    if (!activeTab || !isAgencyMethodAvailable('diffWorkbenchEntry')) return;
    const enabled = !activeState.diffEnabled;
    updateTabState(activeTab.id, { diffEnabled: enabled });
    if (enabled && !activeState.diffHunks) {
      try {
        const hunks = await loadWorkbenchDiffHunks({
          rootPath: activeTab.rootPath,
          targetPath: activeTab.path,
        });
        updateTabState(activeTab.id, { diffHunks: hunks });
      } catch (_error) {
        // Keep toggle resilient; command panel can still render without hunks.
      }
    }
  }, [activeState, activeTab, updateTabState]);

  const toggleBlame = useCallback(async () => {
    if (!activeTab || !isAgencyMethodAvailable('blameWorkbenchEntry')) return;
    const enabled = !activeState.blameEnabled;
    updateTabState(activeTab.id, { blameEnabled: enabled });
    if (enabled && !activeState.blameLines) {
      try {
        const lines = await loadWorkbenchBlameLines({
          rootPath: activeTab.rootPath,
          targetPath: activeTab.path,
        });
        updateTabState(activeTab.id, { blameLines: lines });
      } catch (_error) {
        // Keep toggle resilient; blame remains optional.
      }
    }
  }, [activeState, activeTab, updateTabState]);

  const handleUnlock = useCallback(async () => {
    if (!activeTab) {
      return;
    }
    updateTabState(activeTab.id, { loading: true });
    try {
      const nextState = await loadWorkbenchCodeState({
        rootPath: activeTab.rootPath,
        targetPath: activeTab.path,
      });
      updateTabState(activeTab.id, { ...nextState, error: '' });
    } catch (_error) {
      updateTabState(activeTab.id, { loading: false, error: 'Forced load failed.' });
    }
  }, [activeTab, updateTabState]);

  return {
    handleSave,
    handleSaveAs,
    handleReload,
    toggleDiff,
    toggleBlame,
    handleUnlock,
  };
}
