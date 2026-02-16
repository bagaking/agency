import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useRef, useState } from 'react';
import { getFileSnippet } from '../services/agencyBridge';

export type FileSnippetPreviewState = {
  relativePath: string;
  line: number | null;
  snippet: Array<{
    line: number;
    content: string;
    isTarget?: boolean;
  }>;
  loading: boolean;
  error: string;
};

type LoadFileSnippetPreviewPayload = {
  rootPath: string;
  targetPath: string;
  relativePath?: string;
  line?: number | null;
  context?: number;
};

type UseFileSnippetPreviewOptions = {
  defaultContext?: number;
  emptyMessage?: string;
};

const normalizePreviewPath = (value: string): string => String(value || '').trim();

const normalizePreviewLine = (value: number | null | undefined): number | null =>
  Number.isFinite(value) ? Math.max(1, Math.floor(Number(value))) : null;

const toPreviewState = ({
  relativePath,
  line,
  snippet,
  loading,
  error,
}: {
  relativePath: string;
  line: number | null;
  snippet: FileSnippetPreviewState['snippet'];
  loading: boolean;
  error: string;
}): FileSnippetPreviewState => ({
  relativePath,
  line,
  snippet: Array.isArray(snippet) ? snippet : [],
  loading,
  error: String(error || ''),
});

export const useFileSnippetPreview = (
  options: UseFileSnippetPreviewOptions = {}
): {
  preview: FileSnippetPreviewState | null;
  loadPreview: (payload: LoadFileSnippetPreviewPayload) => Promise<FileSnippetPreviewState | null>;
  clearPreview: () => void;
  setPreview: Dispatch<SetStateAction<FileSnippetPreviewState | null>>;
} => {
  const { defaultContext = 2, emptyMessage = 'Unable to load preview.' } = options;
  const [preview, setPreview] = useState<FileSnippetPreviewState | null>(null);
  const requestIdRef = useRef(0);

  const loadPreview = useCallback(
    async ({
      rootPath,
      targetPath,
      relativePath,
      line,
      context,
    }: LoadFileSnippetPreviewPayload): Promise<FileSnippetPreviewState | null> => {
      const normalizedRootPath = normalizePreviewPath(rootPath);
      const normalizedTargetPath = normalizePreviewPath(targetPath);
      const normalizedRelativePath =
        normalizePreviewPath(relativePath || normalizedTargetPath || normalizedRootPath);
      const normalizedLine = normalizePreviewLine(line);

      if (!normalizedRootPath || !normalizedTargetPath || !normalizedRelativePath) {
        setPreview(null);
        return null;
      }

      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      const loadingState = toPreviewState({
        relativePath: normalizedRelativePath,
        line: normalizedLine,
        snippet: [],
        loading: true,
        error: '',
      });
      setPreview(loadingState);

      try {
        const result = await getFileSnippet({
          rootPath: normalizedRootPath,
          targetPath: normalizedTargetPath,
          line: normalizedLine || 1,
          context: Number.isFinite(context) ? Number(context) : defaultContext,
        });
        if (requestIdRef.current !== requestId) {
          return null;
        }

        const hasSnippet = Array.isArray(result?.snippet);
        const snippet = hasSnippet ? result.snippet : [];
        const nextState =
          hasSnippet
            ? toPreviewState({
                relativePath: normalizedRelativePath,
                line: normalizedLine,
                snippet,
                loading: false,
                error: '',
              })
            : toPreviewState({
                relativePath: normalizedRelativePath,
                line: normalizedLine,
                snippet: [],
                loading: false,
                error: emptyMessage,
              });
        setPreview(nextState);
        return nextState;
      } catch (error: any) {
        if (requestIdRef.current !== requestId) {
          return null;
        }
        const failedState = toPreviewState({
          relativePath: normalizedRelativePath,
          line: normalizedLine,
          snippet: [],
          loading: false,
          error: error?.message || emptyMessage,
        });
        setPreview(failedState);
        return failedState;
      }
    },
    [defaultContext, emptyMessage]
  );

  const clearPreview = useCallback(() => {
    requestIdRef.current = 0;
    setPreview(null);
  }, []);

  return {
    preview,
    loadPreview,
    clearPreview,
    setPreview,
  };
};

export const __testFileSnippetPreview = {
  normalizePreviewLine,
  normalizePreviewPath,
  toPreviewState,
};
