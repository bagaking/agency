import { useCallback } from 'react';
import { explorerPathUtils } from '../../hooks/useProjectExplorer';

type UseExplorerExternalImportOptions = {
  importExternalEntries: (payload: {
    sourcePaths: string[];
    targetDir: string;
  }) => Promise<any>;
  expandAncestorsForPath: (path: string) => Promise<boolean>;
  selectPathInExplorer: (path: string) => void;
  setErrorMessage: (message: string) => void;
  clearError: () => void;
};

export const useExplorerExternalImport = ({
  importExternalEntries,
  expandAncestorsForPath,
  selectPathInExplorer,
  setErrorMessage,
  clearError,
}: UseExplorerExternalImportOptions) =>
  useCallback(
    async (sourcePaths: string[], targetDir: string) => {
      if (!sourcePaths.length) {
        return;
      }
      try {
        const report = await importExternalEntries({ sourcePaths, targetDir });
        if (!report) {
          setErrorMessage('External import is unavailable.');
          return;
        }
        const importedPaths = Array.from(
          new Set(
            [
              ...(Array.isArray(report.importedPaths) ? report.importedPaths : []),
              ...((Array.isArray(report.imported) ? report.imported : [])
                .map((entry: any) => String(entry?.targetPath || '').trim())
                .filter(Boolean)),
            ]
              .map((entry) => explorerPathUtils.toRelativePath(String(entry || '')))
              .filter(Boolean)
          )
        );
        const firstImportedPath = importedPaths[0] || '';
        if (firstImportedPath) {
          await expandAncestorsForPath(firstImportedPath);
          selectPathInExplorer(firstImportedPath);
        }
        const failureCount = Array.isArray(report.failures) ? report.failures.length : 0;
        if (failureCount > 0) {
          const importedCount = Array.isArray(report.imported) ? report.imported.length : 0;
          const firstFailure = report.failures?.[0]?.error ? ` (${report.failures[0].error})` : '';
          const importedLabel = importedCount === 1 ? 'entry' : 'entries';
          const failedLabel = failureCount === 1 ? 'failure' : 'failures';
          if (importedCount > 0) {
            setErrorMessage(
              `Imported ${importedCount} ${importedLabel} with ${failureCount} ${failedLabel}${firstFailure}.`
            );
          } else {
            setErrorMessage(`Import failed: ${failureCount} ${failedLabel}${firstFailure}.`);
          }
        } else {
          clearError();
        }
      } catch (error: any) {
        setErrorMessage(error?.message || 'Import failed.');
      }
    },
    [
      clearError,
      expandAncestorsForPath,
      importExternalEntries,
      selectPathInExplorer,
      setErrorMessage,
    ]
  );

