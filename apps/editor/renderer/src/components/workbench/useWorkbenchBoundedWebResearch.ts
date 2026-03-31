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
} from '../explorer/explorerResearchArtifacts';
import { normalizeWorkbenchResearchUrl } from './workbenchBoundedResearch';

type WorkbenchBoundedWebResearchPrompt = (defaultValue: string) => Promise<string | null>;

type UseWorkbenchBoundedWebResearchArgs = {
  rootPath: string;
  url: string;
  defaultTargetDirPath?: string;
  promptForPath: WorkbenchBoundedWebResearchPrompt;
};

type WorkbenchBoundedWebResearchDependencies = {
  fetchPreview: (payload: { url: string }) => Promise<ExplorerResearchPreview | null>;
  openExternal: (payload: { url: string }) => Promise<{ ok?: boolean; error?: string } | void>;
  writeEntry: (payload: {
    rootPath: string;
    targetPath: string;
    content: string;
  }) => Promise<{ path?: string } | null>;
  createMemo: (payload: {
    worktreePath: string;
    kind: 'memo';
    body: string;
    references: Array<Record<string, any>>;
    meta: Record<string, any>;
  }) => Promise<{ id?: string } | null>;
};

const defaultDependencies: WorkbenchBoundedWebResearchDependencies = {
  fetchPreview: fetchHilExcerpt,
  openExternal: openExternalUrl,
  writeEntry: writeWorkbenchEntry,
  createMemo: createHilItem,
};

export function useWorkbenchBoundedWebResearch({
  rootPath,
  url,
  defaultTargetDirPath = 'docs',
  promptForPath,
}: UseWorkbenchBoundedWebResearchArgs,
dependencies: WorkbenchBoundedWebResearchDependencies = defaultDependencies) {
  const [note, setNote] = useState('');
  const [preview, setPreview] = useState<ExplorerResearchPreview | null>(null);
  const [fetching, setFetching] = useState(false);
  const [savingMarkdown, setSavingMarkdown] = useState(false);
  const [creatingMemo, setCreatingMemo] = useState(false);
  const [error, setError] = useState('');
  const [savedArtifact, setSavedArtifact] = useState<{ path: string; savedAt: string } | null>(null);
  const [memoArtifact, setMemoArtifact] = useState<{ id: string; createdAt: string } | null>(null);
  const [preferredMode, setPreferredMode] = useState<'live' | 'reader'>('live');
  const [liveFrameKey, setLiveFrameKey] = useState(0);

  const normalizedUrl = useMemo(() => normalizeWorkbenchResearchUrl(url), [url]);
  const browserUrl = normalizedUrl;

  const suggestedPath = useMemo(() => {
    if (savedArtifact?.path) {
      return savedArtifact.path;
    }
    return buildExplorerResearchSuggestedPath({
      preview,
      targetDirPath: defaultTargetDirPath,
    });
  }, [defaultTargetDirPath, preview, savedArtifact?.path]);

  const inspect = useCallback(async () => {
    if (!normalizedUrl) {
      setError('Enter a URL to inspect.');
      return null;
    }

    setFetching(true);
    setError('');
    try {
      const nextPreview = await dependencies.fetchPreview({ url: normalizedUrl });
      if (!nextPreview) {
        throw new Error('Unable to inspect URL.');
      }
      startTransition(() => {
        setPreview(nextPreview);
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
  }, [dependencies, normalizedUrl]);

  useEffect(() => {
    if (!normalizedUrl) {
      setPreview(null);
      setSavedArtifact(null);
      setMemoArtifact(null);
      setError('');
      return;
    }
    void inspect();
  }, [inspect, normalizedUrl]);

  const reload = useCallback(async () => {
    setLiveFrameKey((current) => current + 1);
    await inspect();
  }, [inspect]);

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
    if (!preview) {
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
          sourceSurface: 'workbench-bounded-web-research',
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
  }, [dependencies, note, preview, promptForPath, rootPath, suggestedPath]);

  const createCitationMemo = useCallback(async () => {
    if (!preview) {
      return null;
    }
    setCreatingMemo(true);
    setError('');
    try {
      const payload = buildExplorerResearchMemoPayload({
        preview,
        note,
        savedPath: savedArtifact?.path || '',
        sourceSurface: 'workbench-bounded-web-research',
      });
      const result = await dependencies.createMemo({
        worktreePath: rootPath,
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
  }, [dependencies, note, preview, rootPath, savedArtifact?.path]);

  return {
    url: normalizedUrl,
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
    preferredMode,
    setPreferredMode,
    liveFrameKey,
    inspect,
    reload,
    openInBrowser,
    saveMarkdown,
    createCitationMemo,
  };
}
