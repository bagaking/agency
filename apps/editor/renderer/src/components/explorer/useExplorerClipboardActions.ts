import { useCallback, useMemo, useState } from 'react';
import { explorerPathUtils } from '../../hooks/useProjectExplorer';
import {
  isAgencyMethodAvailable,
  materializeClipboard,
  materializeMarkdown,
} from '../../services/agencyBridge';
import { writeTextToClipboard } from '../../utils/clipboard';

type ClipboardMode = 'copy' | 'cut';

type ClipboardState = {
  mode: ClipboardMode;
  paths: string[];
} | null;

type UseExplorerClipboardActionsOptions = {
  rootPath: string;
  repoRoot: string;
  activeTarget: string;
  treeNodes: Record<string, { type?: string } | undefined>;
  selectionTargets: string[];
  setSelectedPaths: (paths: string[]) => void;
  expandPath: (path: string) => Promise<void> | void;
  refreshAll: () => Promise<void> | void;
  renameEntry: (payload: { sourcePath: string; targetPath: string }) => Promise<void>;
  copyEntry: (payload: { sourcePath: string; targetPath: string }) => Promise<void>;
  clearError: () => void;
  setErrorMessage: (message: string) => void;
  openEntry: (targetPath: string, mode: 'preview' | 'pinned') => Promise<boolean>;
};

type PathListInput = string | string[];

const normalizePathList = (targets: PathListInput): string[] =>
  (Array.isArray(targets) ? targets : [targets]).map((value) => String(value || '')).filter(Boolean);

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

export const useExplorerClipboardActions = ({
  rootPath,
  repoRoot,
  activeTarget,
  treeNodes,
  selectionTargets,
  setSelectedPaths,
  expandPath,
  refreshAll,
  renameEntry,
  copyEntry,
  clearError,
  setErrorMessage,
  openEntry,
}: UseExplorerClipboardActionsOptions) => {
  const [clipboard, setClipboard] = useState<ClipboardState>(null);

  const canPaste = useMemo(
    () =>
      Boolean(clipboard?.paths?.length) || isAgencyMethodAvailable('materializeClipboard'),
    [clipboard]
  );

  const resolvePasteDirectory = useCallback((): string => {
    if (!activeTarget) {
      return '';
    }
    const node = treeNodes[activeTarget];
    return node?.type === 'dir' ? activeTarget : explorerPathUtils.dirname(activeTarget);
  }, [activeTarget, treeNodes]);

  const handleCopySelection = useCallback(
    (mode: ClipboardMode) => {
      if (!selectionTargets.length) {
        return;
      }
      setClipboard({
        mode,
        paths: Array.from(new Set(selectionTargets)),
      });
    },
    [selectionTargets]
  );

  const handlePasteSelection = useCallback(async () => {
    const baseRoot = rootPath || repoRoot || '';
    const targetDir = resolvePasteDirectory();

    if (baseRoot && isAgencyMethodAvailable('materializeClipboard')) {
      try {
        const result = await materializeClipboard({
          rootPath: baseRoot,
          targetDir,
          includeText: false,
          relativeTo: baseRoot,
        });
        if (result?.type === 'files' || result?.type === 'image') {
          if (targetDir) {
            await expandPath(targetDir);
          }
          await refreshAll();
          if (Array.isArray(result?.paths) && result.paths.length) {
            setSelectedPaths(result.paths);
          }
          clearError();
          return;
        }
      } catch (error: any) {
        setErrorMessage(error?.message || 'Failed to paste.');
        return;
      }
    }

    if (!clipboard?.paths?.length) {
      return;
    }

    try {
      let didMove = false;
      let hadError = false;
      for (const sourcePath of clipboard.paths) {
        const baseName = explorerPathUtils.basename(sourcePath);
        const targetPath = [targetDir, baseName].filter(Boolean).join('/');
        if (targetDir && targetDir.startsWith(`${sourcePath}/`)) {
          setErrorMessage('Cannot paste a folder into itself.');
          hadError = true;
          continue;
        }
        if (sourcePath === targetPath) {
          continue;
        }
        if (clipboard.mode === 'cut') {
          await renameEntry({ sourcePath, targetPath });
        } else {
          await copyEntry({ sourcePath, targetPath });
        }
        didMove = true;
      }

      if (!hadError) {
        clearError();
      }
      if (clipboard.mode === 'cut' && didMove) {
        setClipboard(null);
      }
      if (didMove) {
        await refreshAll();
      }
    } catch {
      setErrorMessage('Paste failed.');
    }
  }, [
    clipboard,
    clearError,
    copyEntry,
    expandPath,
    refreshAll,
    renameEntry,
    repoRoot,
    resolvePasteDirectory,
    rootPath,
    setErrorMessage,
    setSelectedPaths,
  ]);

  const handlePasteMarkdown = useCallback(async () => {
    const baseRoot = rootPath || repoRoot || '';
    if (!baseRoot || !isAgencyMethodAvailable('materializeMarkdown')) {
      return;
    }

    try {
      const result = await materializeMarkdown({
        rootPath: baseRoot,
        targetDir: '.agency/tmp/clipboard',
        relativeTo: baseRoot,
      });

      let didOpen = true;
      if (result?.path) {
        const normalizedPath = explorerPathUtils.toRelativePath(result.path);
        await refreshAll();
        setSelectedPaths([normalizedPath]);
        didOpen = await openEntry(normalizedPath, 'pinned');
      }

      if (didOpen) {
        clearError();
      }
    } catch {
      setErrorMessage('Markdown capture failed.');
    }
  }, [clearError, openEntry, refreshAll, repoRoot, rootPath, setErrorMessage, setSelectedPaths]);

  const handleCopyPath = useCallback(
    async (targets: PathListInput) => {
      const list = normalizePathList(targets);
      if (!list.length) {
        return;
      }
      try {
        const base = trimTrailingSlash(rootPath || repoRoot || '');
        const payload = list.map((entry) => (base ? `${base}/${entry}` : entry)).join('\n');
        await writeTextToClipboard(payload);
      } catch {
        // Ignore clipboard write failures.
      }
    },
    [repoRoot, rootPath]
  );

  const handleCopyRelativePath = useCallback(async (targets: PathListInput) => {
    const list = normalizePathList(targets);
    if (!list.length) {
      return;
    }
    try {
      await writeTextToClipboard(list.join('\n'));
    } catch {
      // Ignore clipboard write failures.
    }
  }, []);

  return {
    canPaste,
    handleCopySelection,
    handlePasteSelection,
    handlePasteMarkdown,
    handleCopyPath,
    handleCopyRelativePath,
  };
};

