import { startTransition, useCallback, useEffect, useMemo, useState } from 'react';

import {
  replaceExplorerContent,
  searchExplorerContent,
} from '../../services/agencyBridge';

export type ExplorerContentSearchScope = {
  kind: string;
  path?: string;
  paths?: string[];
};

export type ExplorerContentSearchResultMatch = {
  line: number;
  column: number;
  endColumn: number;
  text: string;
  snippet: string;
};

export type ExplorerContentSearchResult = {
  path: string;
  matchCount: number;
  matches: ExplorerContentSearchResultMatch[];
};

type UseExplorerContentSearchOptions = {
  rootPath: string;
  enabled?: boolean;
  scope: ExplorerContentSearchScope;
  caseSensitive: boolean;
  wholeWord: boolean;
  useRegex: boolean;
};

export function useExplorerContentSearch({
  rootPath,
  enabled = true,
  scope,
  caseSensitive,
  wholeWord,
  useRegex,
}: UseExplorerContentSearchOptions) {
  const [query, setQuery] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [results, setResults] = useState<ExplorerContentSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [error, setError] = useState('');
  const [truncated, setTruncated] = useState(false);
  const [totalResultFiles, setTotalResultFiles] = useState(0);
  const [totalResultMatches, setTotalResultMatches] = useState(0);
  const [scannedFiles, setScannedFiles] = useState(0);
  const [skippedBinaryCount, setSkippedBinaryCount] = useState(0);
  const [skippedLargeCount, setSkippedLargeCount] = useState(0);

  const serializedScope = useMemo(() => JSON.stringify(scope || {}), [scope]);

  const runSearch = useCallback(async () => {
    const trimmedQuery = query.trim();
    if (!enabled || !rootPath || !trimmedQuery) {
      startTransition(() => {
        setResults([]);
        setTruncated(false);
        setTotalResultFiles(0);
        setTotalResultMatches(0);
        setScannedFiles(0);
        setSkippedBinaryCount(0);
        setSkippedLargeCount(0);
        setError('');
      });
      return null;
    }
    setLoading(true);
    setError('');
    try {
      const response = await searchExplorerContent({
        rootPath,
        query: trimmedQuery,
        scope,
        caseSensitive,
        wholeWord,
        useRegex,
      });
      startTransition(() => {
        setResults(Array.isArray(response?.results) ? response.results : []);
        setTruncated(Boolean(response?.truncated));
        setTotalResultFiles(Number(response?.totalResultFiles || 0));
        setTotalResultMatches(Number(response?.totalResultMatches || 0));
        setScannedFiles(Number(response?.scannedFiles || 0));
        setSkippedBinaryCount(Number(response?.skippedBinaryCount || 0));
        setSkippedLargeCount(Number(response?.skippedLargeCount || 0));
      });
      return response;
    } catch (searchError: any) {
      startTransition(() => {
        setResults([]);
        setTruncated(false);
        setTotalResultFiles(0);
        setTotalResultMatches(0);
        setScannedFiles(0);
        setSkippedBinaryCount(0);
        setSkippedLargeCount(0);
        setError(searchError?.message || 'Failed to search file contents.');
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [caseSensitive, enabled, query, rootPath, scope, useRegex, wholeWord]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void runSearch();
    }, 220);
    return () => window.clearTimeout(handle);
  }, [runSearch, serializedScope]);

  const applyReplace = useCallback(
    async ({ confirmedPaths = [] }: { confirmedPaths?: string[] } = {}) => {
      const trimmedQuery = query.trim();
      if (!enabled || !rootPath || !trimmedQuery) {
        return null;
      }
      setReplacing(true);
      setError('');
      try {
        const response = await replaceExplorerContent({
          rootPath,
          query: trimmedQuery,
          replacement: replaceText,
          scope,
          caseSensitive,
          wholeWord,
          useRegex,
          confirmedPaths,
        });
        await runSearch();
        return response;
      } catch (replaceError: any) {
        setError(replaceError?.message || 'Failed to replace content.');
        return null;
      } finally {
        setReplacing(false);
      }
    },
    [
      caseSensitive,
      enabled,
      query,
      replaceText,
      rootPath,
      runSearch,
      scope,
      useRegex,
      wholeWord,
    ]
  );

  return {
    query,
    setQuery,
    replaceText,
    setReplaceText,
    results,
    loading,
    replacing,
    error,
    truncated,
    totalResultFiles,
    totalResultMatches,
    scannedFiles,
    skippedBinaryCount,
    skippedLargeCount,
    refreshSearch: runSearch,
    applyReplace,
  };
}
