import { useCallback, type DragEvent } from 'react';
import { explorerPathUtils } from '../../hooks/useProjectExplorer';
import { getPathForDroppedFile } from '../../services/agencyBridge';
import {
  hasExternalDropEntries as hasExternalDroppedPaths,
  readExternalDropPaths as readDroppedExternalPaths,
} from '../../utils/externalDropPaths';
import { readExplorerInternalDragPaths } from './explorerInternalDragPaths';

type ExplorerDropTreeNode = {
  type?: string;
};

type UseExplorerDropHandlersOptions = {
  treeNodes: Record<string, ExplorerDropTreeNode | undefined>;
  focusedPath: string;
  onMoveEntries: (paths: string[], targetDir: string) => Promise<void>;
  onImportExternalEntries: (paths: string[], targetDir: string) => Promise<void>;
  setErrorMessage: (message: string) => void;
};

const EXTERNAL_DROP_PATH_ERROR =
  'Unable to read dropped file paths. Please drag files from Finder directly.';

export const useExplorerDropHandlers = ({
  treeNodes,
  focusedPath,
  onMoveEntries,
  onImportExternalEntries,
  setErrorMessage,
}: UseExplorerDropHandlersOptions) => {
  const hasExternalDropEntries = useCallback(
    (dataTransfer: DataTransfer | null | undefined) => hasExternalDroppedPaths(dataTransfer),
    []
  );

  const readExternalDropPaths = useCallback(
    (dataTransfer: DataTransfer | null | undefined): string[] =>
      readDroppedExternalPaths(dataTransfer, {
        getPathForDroppedFile,
      }),
    []
  );

  const resolveDropDirectory = useCallback(
    (targetPath: string): string => {
      const normalizedPath = explorerPathUtils.toRelativePath(targetPath || '');
      if (!normalizedPath) {
        return '';
      }
      const node = treeNodes[normalizedPath];
      if (node?.type === 'dir') {
        return normalizedPath;
      }
      return explorerPathUtils.dirname(normalizedPath);
    },
    [treeNodes]
  );

  const resolveBlankDropDirectory = useCallback((): string => {
    if (!focusedPath) {
      return '';
    }
    return resolveDropDirectory(focusedPath);
  }, [focusedPath, resolveDropDirectory]);

  const readExternalDropPathsWithValidation = useCallback(
    (dataTransfer: DataTransfer | null | undefined): string[] => {
      const externalPaths = readExternalDropPaths(dataTransfer);
      if (!externalPaths.length) {
        setErrorMessage(EXTERNAL_DROP_PATH_ERROR);
        return [];
      }
      return externalPaths;
    },
    [readExternalDropPaths, setErrorMessage]
  );

  const handleRowDragOver = useCallback(
    (event: DragEvent, _rowPath: string, isDir: boolean) => {
      const internalPaths = readExplorerInternalDragPaths(event.dataTransfer);
      if (internalPaths.length > 0) {
        if (!isDir) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = 'move';
        return;
      }

      if (!hasExternalDropEntries(event.dataTransfer)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = 'copy';
    },
    [hasExternalDropEntries]
  );

  const handleRowDrop = useCallback(
    async (event: DragEvent, rowPath: string, isDir: boolean) => {
      const internalPaths = readExplorerInternalDragPaths(event.dataTransfer);
      if (internalPaths.length > 0) {
        event.preventDefault();
        event.stopPropagation();
        if (!isDir) {
          return;
        }
        await onMoveEntries(internalPaths, rowPath);
        return;
      }

      if (!hasExternalDropEntries(event.dataTransfer)) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();

      const externalPaths = readExternalDropPathsWithValidation(event.dataTransfer);
      if (!externalPaths.length) {
        return;
      }

      const targetDir = isDir ? rowPath : resolveDropDirectory(rowPath);
      await onImportExternalEntries(externalPaths, targetDir);
    },
    [
      hasExternalDropEntries,
      onImportExternalEntries,
      onMoveEntries,
      readExternalDropPathsWithValidation,
      resolveDropDirectory,
    ]
  );

  const handleTreeDragOver = useCallback(
    (event: DragEvent) => {
      const inRow = event.target instanceof Element && event.target.closest('[data-explorer-path]');
      if (inRow) {
        return;
      }

      if (readExplorerInternalDragPaths(event.dataTransfer).length > 0) {
        return;
      }

      if (!hasExternalDropEntries(event.dataTransfer)) {
        return;
      }

      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    },
    [hasExternalDropEntries]
  );

  const handleTreeDrop = useCallback(
    async (event: DragEvent) => {
      const inRow = event.target instanceof Element && event.target.closest('[data-explorer-path]');
      if (inRow) {
        return;
      }

      if (readExplorerInternalDragPaths(event.dataTransfer).length > 0) {
        return;
      }

      event.preventDefault();
      const externalPaths = readExternalDropPathsWithValidation(event.dataTransfer);
      if (!externalPaths.length) {
        return;
      }

      await onImportExternalEntries(externalPaths, resolveBlankDropDirectory());
    },
    [onImportExternalEntries, readExternalDropPathsWithValidation, resolveBlankDropDirectory]
  );

  const handleSidebarDragOver = useCallback(
    (event: DragEvent) => {
      if (event.defaultPrevented) {
        return;
      }
      if (!hasExternalDropEntries(event.dataTransfer)) {
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    },
    [hasExternalDropEntries]
  );

  const handleSidebarDrop = useCallback(
    async (event: DragEvent) => {
      if (event.defaultPrevented) {
        return;
      }
      if (!hasExternalDropEntries(event.dataTransfer)) {
        return;
      }
      event.preventDefault();
      const externalPaths = readExternalDropPathsWithValidation(event.dataTransfer);
      if (!externalPaths.length) {
        return;
      }
      await onImportExternalEntries(externalPaths, resolveBlankDropDirectory());
    },
    [
      hasExternalDropEntries,
      onImportExternalEntries,
      readExternalDropPathsWithValidation,
      resolveBlankDropDirectory,
    ]
  );

  return {
    handleRowDragOver,
    handleRowDrop,
    handleTreeDragOver,
    handleTreeDrop,
    handleSidebarDragOver,
    handleSidebarDrop,
  };
};
