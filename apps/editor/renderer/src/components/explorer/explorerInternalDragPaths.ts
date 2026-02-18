import { explorerPathUtils } from '../../hooks/useProjectExplorer';

export const EXPLORER_INTERNAL_DRAG_MIME = 'application/agency-paths';

export const buildExplorerInternalDragPayload = (
  targetPath: string,
  selectionSet: ReadonlySet<string>
): string[] => (selectionSet.has(targetPath) ? Array.from(selectionSet) : [targetPath]);

export const writeExplorerInternalDragPaths = (
  dataTransfer: DataTransfer | null | undefined,
  paths: string[]
): boolean => {
  if (!dataTransfer?.setData) {
    return false;
  }
  dataTransfer.setData(EXPLORER_INTERNAL_DRAG_MIME, JSON.stringify(paths));
  dataTransfer.effectAllowed = 'move';
  return true;
};

export const readExplorerInternalDragPaths = (
  dataTransfer: DataTransfer | null | undefined
): string[] => {
  if (!dataTransfer?.getData) {
    return [];
  }
  const rawPayload = dataTransfer.getData(EXPLORER_INTERNAL_DRAG_MIME);
  if (!rawPayload) {
    return [];
  }
  try {
    const parsed = JSON.parse(rawPayload);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return Array.from(
      new Set(
        parsed
          .map((value) => explorerPathUtils.toRelativePath(String(value || '').trim()))
          .filter(Boolean)
      )
    );
  } catch {
    return [];
  }
};
