import { useCallback, useEffect, useMemo, useState } from 'react';
import { explorerPathUtils } from '../../hooks/useProjectExplorer';
import {
  inspectClipboardPayload,
  isAgencyMethodAvailable,
  materializeClipboard,
  materializeMarkdown,
  writeClipboardFileReferences,
} from '../../services/agencyBridge';
import { writeTextToClipboard } from '../../utils/clipboard';

type ClipboardMode = 'copy' | 'cut';

type ClipboardState = {
  mode: ClipboardMode;
  paths: string[];
  preferInternalPaste: boolean;
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
  renameEntry: (payload: {
    sourcePath: string;
    targetPath: string;
    resolveConflicts?: boolean;
  }) => Promise<{ path?: string; conflictResolved?: boolean } | null>;
  copyEntry: (payload: {
    sourcePath: string;
    targetPath: string;
    resolveConflicts?: boolean;
  }) => Promise<{ path?: string; conflictResolved?: boolean } | null>;
  clearError: () => void;
  setErrorMessage: (message: string) => void;
  openEntry: (targetPath: string, mode: 'preview' | 'pinned') => Promise<boolean>;
  onEntryRelocated?: (payload: { sourcePath: string; targetPath: string }) => void;
};

type PathListInput = string | string[];

const normalizePathList = (targets: PathListInput): string[] =>
  (Array.isArray(targets) ? targets : [targets]).map((value) => String(value || '')).filter(Boolean);

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

const dedupeClipboardPaths = (paths: string[]): string[] =>
  Array.from(new Set((Array.isArray(paths) ? paths : []).map((value) => String(value || '')).filter(Boolean)));

export const buildExplorerClipboardState = ({
  mode,
  selectionTargets,
  wroteSystemClipboard,
}: {
  mode: ClipboardMode;
  selectionTargets: string[];
  wroteSystemClipboard: boolean;
}): ClipboardState => {
  const paths = dedupeClipboardPaths(selectionTargets);
  if (!paths.length) {
    return null;
  }
  if (wroteSystemClipboard) {
    return null;
  }
  return {
    mode,
    paths,
    preferInternalPaste: mode === 'cut' || !wroteSystemClipboard,
  };
};

export const shouldUseInternalExplorerClipboard = (clipboard: ClipboardState): boolean =>
  Boolean(clipboard?.preferInternalPaste && clipboard.paths.length);

type ClipboardPayloadSummary = {
  hasFiles?: boolean;
  hasImage?: boolean;
} | null;

export const hasExplorerExternalClipboardPayload = (payload: ClipboardPayloadSummary): boolean =>
  Boolean(payload?.hasFiles || payload?.hasImage);

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
  onEntryRelocated,
}: UseExplorerClipboardActionsOptions) => {
  const [clipboard, setClipboard] = useState<ClipboardState>(null);
  const [externalClipboardPayload, setExternalClipboardPayload] = useState<ClipboardPayloadSummary>(
    null
  );

  const refreshExternalClipboardPayload = useCallback(async () => {
    if (!isAgencyMethodAvailable('inspectClipboardPayload')) {
      setExternalClipboardPayload(null);
      return;
    }
    try {
      const payload = await inspectClipboardPayload();
      setExternalClipboardPayload(payload || null);
    } catch {
      setExternalClipboardPayload(null);
    }
  }, []);

  useEffect(() => {
    void refreshExternalClipboardPayload();
    const handleFocus = () => {
      void refreshExternalClipboardPayload();
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [refreshExternalClipboardPayload]);

  const canPaste = useMemo(
    () =>
      Boolean(clipboard?.paths?.length) ||
      hasExplorerExternalClipboardPayload(externalClipboardPayload),
    [clipboard, externalClipboardPayload]
  );

  const resolvePasteDirectory = useCallback((): string => {
    if (!activeTarget) {
      return '';
    }
    const node = treeNodes[activeTarget];
    return node?.type === 'dir' ? activeTarget : explorerPathUtils.dirname(activeTarget);
  }, [activeTarget, treeNodes]);

  const handleCopySelection = useCallback(
    async (mode: ClipboardMode) => {
      const normalizedTargets = dedupeClipboardPaths(selectionTargets);
      if (!normalizedTargets.length) {
        return;
      }
      setClipboard(
        buildExplorerClipboardState({
          mode,
          selectionTargets: normalizedTargets,
          wroteSystemClipboard: false,
        })
      );
      let wroteSystemClipboard = false;
      if (isAgencyMethodAvailable('writeClipboardFileReferences')) {
        try {
          const baseRoot = rootPath || repoRoot || '';
          if (baseRoot) {
            await writeClipboardFileReferences({
              rootPath: baseRoot,
              relativePaths: normalizedTargets,
              mode,
            });
            wroteSystemClipboard = true;
            setExternalClipboardPayload({ hasFiles: true, hasImage: false });
            clearError();
          }
        } catch {
          // Fall back to Explorer-local clipboard state.
        }
      }
      setClipboard(
        buildExplorerClipboardState({
          mode,
          selectionTargets: normalizedTargets,
          wroteSystemClipboard,
        })
      );
    },
    [clearError, repoRoot, rootPath, selectionTargets]
  );

  const handlePasteSelection = useCallback(async () => {
    const baseRoot = rootPath || repoRoot || '';
    const targetDir = resolvePasteDirectory();
    let nextExternalClipboardPayload = externalClipboardPayload;

    if (baseRoot && isAgencyMethodAvailable('inspectClipboardPayload')) {
      try {
        const latestPayload = await inspectClipboardPayload();
        nextExternalClipboardPayload = latestPayload || null;
        setExternalClipboardPayload(nextExternalClipboardPayload);
      } catch {
        // Fall back to the latest cached payload state.
      }
    }

    if (
      baseRoot &&
      isAgencyMethodAvailable('materializeClipboard') &&
      hasExplorerExternalClipboardPayload(nextExternalClipboardPayload)
    ) {
      try {
        const result = await materializeClipboard({
          rootPath: baseRoot,
          targetDir,
          includeText: false,
          relativeTo: baseRoot,
        });
        if (result?.type === 'explorer-selection') {
          const sourcePaths = dedupeClipboardPaths(result.paths || []);
          const mode = result.mode === 'cut' ? 'cut' : 'copy';
          let didApply = false;
          let hadError = false;
          const pastedPaths: string[] = [];
          for (const sourcePath of sourcePaths) {
            const baseName = explorerPathUtils.basename(sourcePath);
            const targetPath = [targetDir, baseName].filter(Boolean).join('/');
            if (targetDir && targetDir.startsWith(`${sourcePath}/`)) {
              setErrorMessage('Cannot paste a folder into itself.');
              hadError = true;
              continue;
            }
            if (sourcePath === targetPath && mode === 'cut') {
              setErrorMessage('Target already matches current location.');
              hadError = true;
              continue;
            }
            if (mode === 'cut') {
              const moveResult = await renameEntry({
                sourcePath,
                targetPath,
                resolveConflicts: true,
              });
              const nextPath = explorerPathUtils.toRelativePath(moveResult?.path || targetPath);
              if (nextPath) {
                pastedPaths.push(nextPath);
                onEntryRelocated?.({
                  sourcePath,
                  targetPath: nextPath,
                });
              }
            } else {
              const copyResult = await copyEntry({
                sourcePath,
                targetPath,
                resolveConflicts: true,
              });
              const nextPath = explorerPathUtils.toRelativePath(copyResult?.path || targetPath);
              if (nextPath) {
                pastedPaths.push(nextPath);
              }
            }
            didApply = true;
          }

          if (!hadError) {
            clearError();
          }
          if (didApply) {
            setClipboard(null);
            if (mode === 'cut' && isAgencyMethodAvailable('writeClipboardFileReferences') && pastedPaths.length) {
              try {
                await writeClipboardFileReferences({
                  rootPath: baseRoot,
                  relativePaths: pastedPaths,
                  mode: 'copy',
                });
                setExternalClipboardPayload({ hasFiles: true, hasImage: false });
              } catch {
                // Ignore clipboard rewrite failures after a successful move.
              }
            } else {
              await refreshExternalClipboardPayload();
            }
            await refreshAll();
            if (targetDir) {
              await expandPath(targetDir);
            }
            if (pastedPaths.length) {
              setSelectedPaths(pastedPaths);
            }
          }
          return;
        }

        if (result?.type === 'files' || result?.type === 'image') {
          if (targetDir) {
            await expandPath(targetDir);
          }
          await refreshAll();
          if (Array.isArray(result?.paths) && result.paths.length) {
            setSelectedPaths(result.paths);
          }
          await refreshExternalClipboardPayload();
          clearError();
          return;
        }
      } catch (error: any) {
        setErrorMessage(error?.message || 'Failed to paste.');
        return;
      }
    }

    if (!shouldUseInternalExplorerClipboard(clipboard)) {
      return;
    }

    if (!clipboard?.paths?.length) {
      return;
    }

    try {
      let didApply = false;
      let hadError = false;
      const pastedPaths: string[] = [];
      for (const sourcePath of clipboard.paths) {
        const baseName = explorerPathUtils.basename(sourcePath);
        const targetPath = [targetDir, baseName].filter(Boolean).join('/');
        if (targetDir && targetDir.startsWith(`${sourcePath}/`)) {
          setErrorMessage('Cannot paste a folder into itself.');
          hadError = true;
          continue;
        }
        const result =
          clipboard.mode === 'cut'
            ? await renameEntry({
                sourcePath,
                targetPath,
                resolveConflicts: true,
              })
            : await copyEntry({
                sourcePath,
                targetPath,
                resolveConflicts: true,
              });
        const nextPath = explorerPathUtils.toRelativePath(result?.path || targetPath);
        if (nextPath) {
          pastedPaths.push(nextPath);
          if (clipboard.mode === 'cut') {
            onEntryRelocated?.({
              sourcePath,
              targetPath: nextPath,
            });
          }
        }
        didApply = true;
      }

      if (!hadError) {
        clearError();
      }
      if (didApply) {
        await refreshAll();
        if (targetDir) {
          await expandPath(targetDir);
        }
        if (pastedPaths.length) {
          setSelectedPaths(pastedPaths);
        }
        if (clipboard.mode === 'cut') {
          setClipboard(null);
        }
      }
    } catch {
      setErrorMessage('Paste failed.');
    }
  }, [
    clipboard,
    clearError,
    copyEntry,
    expandPath,
    externalClipboardPayload,
    refreshAll,
    refreshExternalClipboardPayload,
    renameEntry,
    repoRoot,
    resolvePasteDirectory,
    rootPath,
    setErrorMessage,
    setSelectedPaths,
    onEntryRelocated,
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
    refreshExternalClipboardPayload,
    handleCopySelection,
    handlePasteSelection,
    handlePasteMarkdown,
    handleCopyPath,
    handleCopyRelativePath,
  };
};
