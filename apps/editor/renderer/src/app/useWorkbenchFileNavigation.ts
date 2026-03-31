import { useCallback } from 'react';
import type { ActiveView } from './appLayoutContracts';

import { runFileIntent } from '../services/fileInteraction';

export type WorkbenchFileNavigationPayload = {
  path?: string;
  rootPath?: string;
  line?: number;
  column?: number;
  focusView?: boolean;
  mode?: 'preview' | 'pinned';
  cellId?: string;
  sourceSurface?: string;
};

export type WorkbenchFileRevealPayload = {
  path?: string;
  rootPath?: string;
  focusView?: boolean;
  cellId?: string;
  sourceSurface?: string;
};

export type WorkbenchFileImportPayload = {
  cellId?: string;
  rootPath?: string;
  sourcePaths?: string[];
  targetDir?: string;
};

type UseWorkbenchFileNavigationArgs = {
  modal: any;
  projectRoot: string;
  selectedCell: any | null;
  sidebarCollapsed: boolean;
  workbench: any;
  setActiveView: (view: ActiveView) => void;
  setSidebarCollapsed: (value: boolean) => void;
  setSelectedId: (value: any) => void;
  setPendingExplorerReveal: (value: any) => void;
  setPendingWorkbenchJump: (value: any) => void;
};

const normalizeSurface = (value: unknown, fallback: string) => {
  const normalized = String(value || '').trim();
  return normalized || fallback;
};

export function useWorkbenchFileNavigation({
  modal,
  projectRoot,
  selectedCell,
  sidebarCollapsed,
  workbench,
  setActiveView,
  setSidebarCollapsed,
  setSelectedId,
  setPendingExplorerReveal,
  setPendingWorkbenchJump,
}: UseWorkbenchFileNavigationArgs) {
  const openWorkbenchFile = useCallback(
    async ({
      path,
      rootPath,
      line,
      column,
      focusView = true,
      mode = 'pinned',
      cellId,
      sourceSurface,
    }: WorkbenchFileNavigationPayload = {}) => {
      const normalizedPath = String(path || '').trim();
      if (!normalizedPath) {
        return;
      }
      const resolvedRoot = rootPath || selectedCell?.attachedWorktreePath || projectRoot || '';
      const targetCellId = cellId || selectedCell?.id || null;
      if (cellId && cellId !== selectedCell?.id) {
        setSelectedId(cellId);
      }
      try {
        await runFileIntent({
          intent: 'open',
          rootPath: resolvedRoot,
          targetPath: normalizedPath,
          sourceSurface: normalizeSurface(sourceSurface, 'agent-cells'),
        });
      } catch (error: any) {
        const message = error?.message || 'Unable to open file from the selected entry.';
        modal?.notify?.({
          title: 'File open failed',
          description: message,
          tone: 'warning',
        });
        return;
      }
      workbench.openFile({
        path: normalizedPath,
        mode: mode === 'preview' ? 'preview' : 'pinned',
        rootPath: resolvedRoot,
        cellId: targetCellId || undefined,
      });
      setPendingExplorerReveal({
        path: normalizedPath,
        rootPath: resolvedRoot,
        cellId: targetCellId || null,
      });
      if (focusView) {
        setActiveView('explorer');
        if (sidebarCollapsed) {
          setSidebarCollapsed(false);
        }
      }
      if (Number.isFinite(line)) {
        setPendingWorkbenchJump({
          path: normalizedPath,
          rootPath: resolvedRoot,
          line: Math.max(1, Math.floor(Number(line))),
          column: Math.max(1, Math.floor(Number(column || 1))),
          cellId: targetCellId || null,
        });
      }
    },
    [
      modal,
      projectRoot,
      selectedCell?.id,
      selectedCell?.worktreePath,
      sidebarCollapsed,
      workbench,
      setActiveView,
      setPendingExplorerReveal,
      setPendingWorkbenchJump,
      setSelectedId,
      setSidebarCollapsed,
    ]
  );

  const revealWorkbenchFile = useCallback(
    async ({
      path,
      rootPath,
      focusView = true,
      cellId,
      sourceSurface,
    }: WorkbenchFileRevealPayload = {}) => {
      const normalizedPath = String(path || '').trim();
      if (!normalizedPath) {
        return false;
      }
      const resolvedRoot = rootPath || selectedCell?.attachedWorktreePath || projectRoot || '';
      const targetCellId = cellId || selectedCell?.id || null;
      if (cellId && cellId !== selectedCell?.id) {
        setSelectedId(cellId);
      }
      try {
        await runFileIntent({
          intent: 'reveal',
          rootPath: resolvedRoot,
          targetPath: normalizedPath,
          sourceSurface: normalizeSurface(sourceSurface, 'session-map'),
        });
      } catch (error: any) {
        const message = error?.message || 'Unable to reveal file in Explorer.';
        modal?.notify?.({
          title: 'File reveal failed',
          description: message,
          tone: 'warning',
        });
        return false;
      }
      setPendingExplorerReveal({
        path: normalizedPath,
        rootPath: resolvedRoot,
        cellId: targetCellId || null,
      });
      if (focusView) {
        setActiveView('explorer');
        if (sidebarCollapsed) {
          setSidebarCollapsed(false);
        }
      }
      return true;
    },
    [
      modal,
      projectRoot,
      selectedCell?.id,
      selectedCell?.worktreePath,
      sidebarCollapsed,
      setActiveView,
      setPendingExplorerReveal,
      setSelectedId,
      setSidebarCollapsed,
    ]
  );

  const revealPathInExplorerFromWorkbench = useCallback(
    (path?: string) => {
      const normalizedPath = String(path || '').trim();
      if (!normalizedPath) {
        return;
      }
      setPendingExplorerReveal({
        path: normalizedPath,
        rootPath: selectedCell?.attachedWorktreePath || projectRoot || '',
        cellId: selectedCell?.id || null,
      });
      if (sidebarCollapsed) {
        setSidebarCollapsed(false);
      }
    },
    [
      projectRoot,
      selectedCell?.id,
      selectedCell?.worktreePath,
      sidebarCollapsed,
      setPendingExplorerReveal,
      setSidebarCollapsed,
    ]
  );

  const openMemoReference = useCallback(
    ({ path, line, column, sourceSurface }: { path?: string; line?: number; column?: number; sourceSurface?: string } = {}) =>
      openWorkbenchFile({
        path,
        rootPath: selectedCell?.attachedWorktreePath || projectRoot || '',
        line,
        column,
        focusView: true,
        cellId: selectedCell?.id,
        sourceSurface: normalizeSurface(sourceSurface, 'memo'),
      }),
    [openWorkbenchFile, projectRoot, selectedCell?.id, selectedCell?.worktreePath]
  );

  const revealMemoReference = useCallback(
    ({ path, sourceSurface }: { path?: string; sourceSurface?: string } = {}) =>
      revealWorkbenchFile({
        path,
        rootPath: selectedCell?.attachedWorktreePath || projectRoot || '',
        focusView: true,
        cellId: selectedCell?.id,
        sourceSurface: normalizeSurface(sourceSurface, 'memo'),
      }),
    [revealWorkbenchFile, projectRoot, selectedCell?.id, selectedCell?.worktreePath]
  );

  const openSessionMapShortcut = useCallback(
    ({ cellId, rootPath, path, line, column }: WorkbenchFileNavigationPayload = {}) =>
      openWorkbenchFile({
        cellId,
        rootPath,
        path,
        line,
        column,
        focusView: true,
        sourceSurface: 'session-map',
      }),
    [openWorkbenchFile]
  );

  const revealSessionMapShortcut = useCallback(
    ({ cellId, rootPath, path }: WorkbenchFileRevealPayload = {}) =>
      revealWorkbenchFile({
        cellId,
        rootPath,
        path,
        focusView: true,
        sourceSurface: 'session-map',
      }),
    [revealWorkbenchFile]
  );

  const openAgentCellFileReference = useCallback(
    ({
      cellId,
      rootPath,
      path,
      line,
      column,
      focusView = true,
      mode = 'pinned',
    }: WorkbenchFileNavigationPayload = {}) =>
      openWorkbenchFile({
        cellId,
        rootPath,
        path,
        line,
        column,
        focusView,
        mode,
        sourceSurface: 'agent-cells',
      }),
    [openWorkbenchFile]
  );

  const revealAgentCellFileReference = useCallback(
    ({ cellId, rootPath, path }: WorkbenchFileRevealPayload = {}) =>
      revealWorkbenchFile({
        cellId,
        rootPath,
        path,
        focusView: true,
        sourceSurface: 'agent-cells',
      }),
    [revealWorkbenchFile]
  );

  const importAgentCellFileReferences = useCallback(
    async ({ cellId, rootPath, sourcePaths = [], targetDir = '' }: WorkbenchFileImportPayload = {}) => {
      const dedupedPaths = Array.from(
        new Set(
          (Array.isArray(sourcePaths) ? sourcePaths : [])
            .map((item) => String(item || '').trim())
            .filter(Boolean)
        )
      );
      const normalizedTargetDir = String(targetDir || '').trim();
      if (!dedupedPaths.length) {
        return {
          targetDir: normalizedTargetDir,
          imported: [],
          importedPaths: [],
          skipped: [],
          failures: [],
          resolvedConflicts: [],
        };
      }

      const resolvedRoot = rootPath || selectedCell?.attachedWorktreePath || projectRoot || '';
      if (!resolvedRoot) {
        throw new Error('Cell worktree is unavailable.');
      }

      if (cellId && cellId !== selectedCell?.id) {
        setSelectedId(cellId);
      }

      try {
        const response = await runFileIntent({
          intent: 'import_copy',
          sourceSurface: 'agent-cells',
          rootPath: resolvedRoot,
          sourcePaths: dedupedPaths,
          targetDir: normalizedTargetDir,
        });
        return response?.data || null;
      } catch (error: any) {
        const message = error?.message || 'Unable to import files into the selected Cell.';
        modal?.notify?.({
          title: 'File import failed',
          description: message,
          tone: 'warning',
        });
        throw error;
      }
    },
    [modal, projectRoot, selectedCell?.id, selectedCell?.worktreePath, setSelectedId]
  );

  return {
    openWorkbenchFile,
    revealWorkbenchFile,
    revealPathInExplorerFromWorkbench,
    openMemoReference,
    revealMemoReference,
    openSessionMapShortcut,
    revealSessionMapShortcut,
    openAgentCellFileReference,
    revealAgentCellFileReference,
    importAgentCellFileReferences,
  };
}
