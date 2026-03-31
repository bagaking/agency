import { startTransition, useCallback, useEffect, useMemo, useState } from 'react';

import {
  createHilItem,
  fetchHilExcerpt,
  openExternalUrl,
  writeWorkbenchEntry,
} from '../../services/agencyBridge';
import {
  buildExplorerResearchMarkdown,
  buildExplorerResearchMemoPayload,
  buildExplorerResearchSuggestedPath,
  type ExplorerResearchPreview,
} from './explorerResearchArtifacts';

type ExplorerResearchLanePrompt = (defaultValue: string) => Promise<string | null>;

type ExplorerResearchLaneDependencies = {
  fetchPreview: (payload: { url: string }) => Promise<ExplorerResearchPreview | null>;
  openExternal: (payload: { url: string }) => Promise<{ ok?: boolean; error?: string } | void>;
  writeEntry: (payload: {
    rootPath: string;
    targetPath: string;
    content: string;
  }) => Promise<{ path?: string } | null>;
  createMemo: (payload: {
    worktreePath: string;
    repoRootPath?: string;
    cellId?: string;
    kind: 'memo';
    body: string;
    references: Array<Record<string, any>>;
    meta: Record<string, any>;
  }) => Promise<{ id?: string } | null>;
};

type UseExplorerResearchLaneOptions = {
  rootPath: string;
  projectRoot?: string;
  selectedCellId?: string;
  targetDirPath: string;
  allowMemoCapture: boolean;
  allowMarkdownSave: boolean;
  promptForPath: ExplorerResearchLanePrompt;
  onOpenSavedFile?: (path: string) => void;
  onRevealSavedFile?: (path: string) => void;
};

const defaultDependencies: ExplorerResearchLaneDependencies = {
  fetchPreview: fetchHilExcerpt,
  openExternal: openExternalUrl,
  writeEntry: writeWorkbenchEntry,
  createMemo: createHilItem,
};

function normalizeBrowserEscapeUrl(input: string) {
  const value = String(input || '').trim();
  if (!value) {
    return '';
  }
  const candidate = value.includes('://') ? value : `https://${value}`;
  try {
    return new URL(candidate).toString();
  } catch (_error) {
    return value;
  }
}

export function useExplorerResearchLane(
  {
    rootPath,
    projectRoot = '',
    selectedCellId = '',
    targetDirPath,
    allowMemoCapture,
    allowMarkdownSave,
    promptForPath,
    onOpenSavedFile,
    onRevealSavedFile,
  }: UseExplorerResearchLaneOptions,
  dependencies: ExplorerResearchLaneDependencies = defaultDependencies
) {
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [preview, setPreview] = useState<ExplorerResearchPreview | null>(null);
  const [fetching, setFetching] = useState(false);
  const [savingMarkdown, setSavingMarkdown] = useState(false);
  const [creatingMemo, setCreatingMemo] = useState(false);
  const [error, setError] = useState('');
  const [savedArtifact, setSavedArtifact] = useState<{ path: string; savedAt: string } | null>(null);
  const [memoArtifact, setMemoArtifact] = useState<{ id: string; createdAt: string } | null>(null);

  const browserUrl = useMemo(() => {
    return normalizeBrowserEscapeUrl(String(preview?.url || url || ''));
  }, [preview?.url, url]);

  const suggestedPath = useMemo(() => {
    if (savedArtifact?.path) {
      return savedArtifact.path;
    }
    return buildExplorerResearchSuggestedPath({
      preview,
      targetDirPath,
    });
  }, [preview, savedArtifact?.path, targetDirPath]);

  useEffect(() => {
    const normalizedInput = url.trim();
    if (!preview || !normalizedInput) {
      return;
    }
    if (preview.url && preview.url !== normalizedInput) {
      setPreview(null);
      setSavedArtifact(null);
      setMemoArtifact(null);
    }
  }, [preview, url]);

  const inspect = useCallback(async () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setError('Enter a URL to inspect.');
      return null;
    }

    setFetching(true);
    setError('');
    try {
      const nextPreview = await dependencies.fetchPreview({ url: trimmedUrl });
      if (!nextPreview) {
        throw new Error('Unable to inspect URL.');
      }
      startTransition(() => {
        setPreview(nextPreview);
        setUrl(nextPreview.url || trimmedUrl);
        setSavedArtifact(null);
        setMemoArtifact(null);
      });
      return nextPreview;
    } catch (inspectError: any) {
      startTransition(() => {
        setPreview(null);
        setSavedArtifact(null);
        setMemoArtifact(null);
      });
      setError(inspectError?.message || 'Failed to inspect URL.');
      return null;
    } finally {
      setFetching(false);
    }
  }, [dependencies, url]);

  const openInBrowser = useCallback(async () => {
    if (!browserUrl) {
      return null;
    }
    setError('');
    const result = await dependencies.openExternal({ url: browserUrl });
    if (result && result.ok === false) {
      setError(result.error || 'Failed to open URL in the system browser.');
    }
    return result;
  }, [browserUrl, dependencies]);

  const saveMarkdown = useCallback(async () => {
    if (!preview || !allowMarkdownSave) {
      return null;
    }
    const targetPath = await promptForPath(suggestedPath);
    if (!targetPath) {
      return null;
    }

    setSavingMarkdown(true);
    setError('');
    try {
      const result = await dependencies.writeEntry({
        rootPath,
        targetPath,
        content: buildExplorerResearchMarkdown(preview, {
          note,
        }),
      });
      const resolvedPath = String(result?.path || targetPath).trim();
      startTransition(() => {
        setSavedArtifact({
          path: resolvedPath,
          savedAt: new Date().toISOString(),
        });
      });
      return result;
    } catch (saveError: any) {
      setError(saveError?.message || 'Failed to save research capture.');
      return null;
    } finally {
      setSavingMarkdown(false);
    }
  }, [allowMarkdownSave, dependencies, note, preview, promptForPath, rootPath, suggestedPath]);

  const createCitationMemo = useCallback(async () => {
    if (!preview || !allowMemoCapture) {
      return null;
    }

    setCreatingMemo(true);
    setError('');
    try {
      const payload = buildExplorerResearchMemoPayload({
        preview,
        note,
        savedPath: savedArtifact?.path || '',
      });
      const result = await dependencies.createMemo({
        worktreePath: rootPath,
        repoRootPath: projectRoot,
        cellId: selectedCellId,
        kind: 'memo',
        body: payload.body,
        references: payload.references,
        meta: payload.meta,
      });
      startTransition(() => {
        setMemoArtifact({
          id: String(result?.id || '').trim(),
          createdAt: new Date().toISOString(),
        });
      });
      return result;
    } catch (memoError: any) {
      setError(memoError?.message || 'Failed to create memo citation.');
      return null;
    } finally {
      setCreatingMemo(false);
    }
  }, [allowMemoCapture, dependencies, note, preview, projectRoot, rootPath, savedArtifact?.path, selectedCellId]);

  const openSavedArtifact = useCallback(() => {
    if (!savedArtifact?.path) {
      return;
    }
    onOpenSavedFile?.(savedArtifact.path);
  }, [onOpenSavedFile, savedArtifact?.path]);

  const revealSavedArtifact = useCallback(() => {
    if (!savedArtifact?.path) {
      return;
    }
    onRevealSavedFile?.(savedArtifact.path);
  }, [onRevealSavedFile, savedArtifact?.path]);

  return {
    url,
    setUrl,
    note,
    setNote,
    preview,
    fetching,
    savingMarkdown,
    creatingMemo,
    error,
    browserUrl,
    suggestedPath,
    savedArtifact,
    memoArtifact,
    inspect,
    openInBrowser,
    saveMarkdown,
    createCitationMemo,
    openSavedArtifact,
    revealSavedArtifact,
  };
}
