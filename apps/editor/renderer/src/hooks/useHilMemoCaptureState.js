import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createHilItem as agencyCreateHilItem,
  startScreenshotCapture as agencyStartScreenshotCapture,
  saveCaptureAsset as agencySaveCaptureAsset,
  copyCaptureToClipboard as agencyCopyCaptureToClipboard,
  getWorkbenchFileUrl as agencyGetWorkbenchFileUrl,
  fetchHilExcerpt as agencyFetchHilExcerpt,
} from '../services/agencyBridge.js';
import { useVoiceCapture } from './useVoiceCapture.js';

export function useHilMemoCaptureState({
  worktreePath,
  projectRoot,
  cells = [],
  selectedCellId,
  selection,
  refresh,
}) {
  const [flashText, setFlashText] = useState('');
  const [excerptUrl, setExcerptUrl] = useState('');
  const [excerptPreview, setExcerptPreview] = useState(null);
  const [excerptFetching, setExcerptFetching] = useState(false);
  const [excerptNote, setExcerptNote] = useState('');
  const [screenshotNote, setScreenshotNote] = useState('');
  const [captureError, setCaptureError] = useState('');
  const [captureLoading, setCaptureLoading] = useState(false);
  const [screenshotAsset, setScreenshotAsset] = useState(null);
  const [captureResult, setCaptureResult] = useState(null);
  const [routingOpen, setRoutingOpen] = useState(false);
  const [routingMode, setRoutingMode] = useState('hil');
  const [routingTargetId, setRoutingTargetId] = useState('');
  const [routingError, setRoutingError] = useState('');

  const appendFlashText = useCallback((snippet) => {
    const addition = String(snippet || '').trim();
    if (!addition) {
      return;
    }
    setFlashText((current) => {
      const base = String(current || '').trim();
      if (!base) {
        return addition;
      }
      return `${base} ${addition}`;
    });
  }, [setFlashText]);

  const flashVoice = useVoiceCapture({
    onFinal: appendFlashText,
  });

  const routingTargets = useMemo(() => {
    const list = [];
    const seen = new Set();
    if (projectRoot) {
      list.push({
        id: 'project-root',
        label: 'Project Root',
        worktreePath: projectRoot,
      });
      seen.add(projectRoot);
    }
    (cells || [])
      .filter((cell) => cell?.worktreePath)
      .forEach((cell) => {
        if (seen.has(cell.worktreePath)) {
          return;
        }
        seen.add(cell.worktreePath);
        list.push({
          id: cell.id,
          label: cell.name || cell.id,
          worktreePath: cell.worktreePath,
        });
      });
    return list;
  }, [cells, projectRoot]);

  const resolveDefaultRoutingTarget = useCallback(() => {
    const selectedCell = cells.find((cell) => cell.id === selectedCellId && cell.worktreePath);
    if (selectedCell?.id) {
      return selectedCell.id;
    }
    if (projectRoot) {
      return 'project-root';
    }
    return routingTargets[0]?.id || '';
  }, [cells, projectRoot, routingTargets, selectedCellId]);

  const selectionInWorktree = Boolean(
    selection?.filePath && selection?.rootPath && worktreePath && selection.rootPath === worktreePath
  );
  const selectionPath = selectionInWorktree ? selection.filePath : '';
  const selectionText = selectionInWorktree ? selection.text || '' : '';
  const selectionLines = selectionInWorktree
    ? { start: selection.startLine, end: selection.endLine }
    : null;

  useEffect(() => {
    const normalizedInput = excerptUrl.trim();
    if (!excerptPreview || !normalizedInput) {
      return;
    }
    if (excerptPreview.url && excerptPreview.url !== normalizedInput) {
      setExcerptPreview(null);
    }
  }, [excerptPreview, excerptUrl]);

  useEffect(() => {
    if (routingOpen && !routingTargetId) {
      const nextTarget = resolveDefaultRoutingTarget();
      if (nextTarget) {
        setRoutingTargetId(nextTarget);
      }
    }
  }, [resolveDefaultRoutingTarget, routingOpen, routingTargetId]);

  const resetCaptureState = useCallback(() => {
    flashVoice.stop?.();
    setFlashText('');
    setExcerptUrl('');
    setExcerptPreview(null);
    setExcerptFetching(false);
    setExcerptNote('');
    setScreenshotNote('');
    setScreenshotAsset(null);
    setCaptureResult(null);
    setRoutingOpen(false);
    setRoutingMode('hil');
    setRoutingTargetId('');
    setRoutingError('');
    setCaptureError('');
    setCaptureLoading(false);
    flashVoice.reset?.();
  }, [flashVoice]);

  const handleCreateMemo = useCallback(
    async ({ body, anchor, meta }) => {
      if (!worktreePath) {
        setCaptureError('Select a project before creating memos.');
        return;
      }
      if (!body || !body.trim()) {
        setCaptureError('Content is required.');
        return;
      }
      setCaptureLoading(true);
      setCaptureError('');
      try {
        await agencyCreateHilItem({
          worktreePath,
          kind: 'memo',
          body: body.trim(),
          anchor,
          meta,
        });
        resetCaptureState();
        await refresh?.();
      } catch (createError) {
        setCaptureError(createError?.message || 'Failed to create memo.');
      } finally {
        setCaptureLoading(false);
      }
    },
    [refresh, resetCaptureState, worktreePath]
  );

  const handleCreateFlash = useCallback(async () => {
    await handleCreateMemo({
      body: flashText,
      meta: { noteType: 'flash' },
    });
  }, [flashText, handleCreateMemo]);

  const handleFetchExcerpt = useCallback(async () => {
    const trimmedUrl = excerptUrl.trim();
    if (!trimmedUrl) {
      setCaptureError('Enter a URL to fetch.');
      return;
    }
    setCaptureError('');
    setExcerptFetching(true);
    try {
      const result = await agencyFetchHilExcerpt({ url: trimmedUrl });
      if (!result) {
        throw new Error('Excerpt fetch unavailable.');
      }
      setExcerptPreview(result);
      if (result?.url) {
        setExcerptUrl(result.url);
      }
    } catch (error) {
      setExcerptPreview(null);
      setCaptureError(error?.message || 'Failed to fetch excerpt.');
    } finally {
      setExcerptFetching(false);
    }
  }, [excerptUrl]);

  const handleCreateExcerpt = useCallback(async () => {
    if (!excerptPreview) {
      setCaptureError('Fetch a URL before saving an excerpt.');
      return;
    }
    const summary = excerptPreview.summary || excerptPreview.excerpt || excerptPreview.title || excerptPreview.url || '';
    await handleCreateMemo({
      body: summary,
      meta: {
        noteType: 'excerpt',
        source: {
          url: excerptPreview.url,
          title: excerptPreview.title,
          byline: excerptPreview.byline,
          siteName: excerptPreview.siteName,
          excerpt: excerptPreview.excerpt,
          summary: excerptPreview.summary,
          text: excerptPreview.text,
          wordCount: excerptPreview.wordCount,
          charCount: excerptPreview.charCount,
          fetchedAt: excerptPreview.fetchedAt,
          truncated: excerptPreview.truncated,
          note: excerptNote.trim() || null,
        },
      },
    });
  }, [excerptNote, excerptPreview, handleCreateMemo]);

  const handleCaptureScreenshot = useCallback(async () => {
    if (!worktreePath) {
      setCaptureError('Select a project before capturing.');
      return;
    }
    setCaptureLoading(true);
    setCaptureError('');
    try {
      const result = await agencyStartScreenshotCapture({ includeAgencyWindows: false });
      if (!result?.dataUrl) {
        setCaptureError('Capture failed.');
        return;
      }
      setCaptureResult(result);
      setRoutingMode('hil');
      if (!routingTargetId) {
        const nextTarget = resolveDefaultRoutingTarget();
        if (nextTarget) {
          setRoutingTargetId(nextTarget);
        }
      }
      setRoutingError('');
      setRoutingOpen(true);
    } catch (captureError) {
      setCaptureError(captureError?.message || 'Failed to capture screenshot.');
    } finally {
      setCaptureLoading(false);
    }
  }, [resolveDefaultRoutingTarget, routingTargetId, worktreePath]);

  const handleConfirmRouting = useCallback(async () => {
    if (!captureResult?.dataUrl) {
      setRoutingError('Capture payload missing.');
      return;
    }
    const target = cells.find((cell) => cell.id === routingTargetId) || null;
    const targetWorktree = target?.worktreePath || projectRoot || worktreePath;
    const saveToHil = routingMode === 'hil' || routingMode === 'both';
    const saveToClipboard = routingMode === 'clipboard' || routingMode === 'both';
    if (saveToHil && !targetWorktree) {
      setRoutingError('Select a target worktree.');
      return;
    }
    setCaptureLoading(true);
    setRoutingError('');
    try {
      if (saveToClipboard) {
        await agencyCopyCaptureToClipboard({ dataUrl: captureResult.dataUrl });
      }
      let assetMeta = null;
      if (saveToHil) {
        assetMeta = await agencySaveCaptureAsset({
          worktreePath: targetWorktree,
          dataUrl: captureResult.dataUrl,
        });
        if (!assetMeta?.path) {
          throw new Error('Failed to save screenshot asset.');
        }
        const filename = assetMeta.path.split('/').pop() || 'screenshot';
        await agencyCreateHilItem({
          worktreePath: targetWorktree,
          kind: 'memo',
          body: screenshotNote.trim() || `Screenshot ${filename}`,
          meta: {
            noteType: 'screenshot',
            asset: assetMeta,
          },
        });
        if (targetWorktree === worktreePath) {
          const urlResult = await agencyGetWorkbenchFileUrl({
            rootPath: targetWorktree,
            targetPath: assetMeta.path,
          });
          setScreenshotAsset({
            ...assetMeta,
            url: urlResult?.url || '',
          });
          await refresh?.();
        }
      }
      setCaptureResult(null);
      setRoutingOpen(false);
      setScreenshotNote('');
      setRoutingMode('hil');
      setRoutingTargetId('');
    } catch (error) {
      setRoutingError(error?.message || 'Failed to route capture.');
    } finally {
      setCaptureLoading(false);
    }
  }, [
    captureResult,
    cells,
    projectRoot,
    refresh,
    routingMode,
    routingTargetId,
    screenshotNote,
    worktreePath,
  ]);

  const handleCancelRouting = useCallback(() => {
    setRoutingOpen(false);
    setCaptureResult(null);
    setRoutingError('');
  }, []);

  const handleOpenRouting = useCallback(() => {
    if (captureResult) {
      setRoutingOpen(true);
    }
  }, [captureResult]);

  return {
    flashText,
    setFlashText,
    flashVoice,
    excerptUrl,
    setExcerptUrl,
    excerptPreview,
    excerptFetching,
    excerptNote,
    setExcerptNote,
    screenshotNote,
    setScreenshotNote,
    captureError,
    setCaptureError,
    captureLoading,
    screenshotAsset,
    captureResult,
    routingOpen,
    routingMode,
    setRoutingMode,
    routingTargetId,
    setRoutingTargetId,
    routingError,
    routingTargets,
    selectionPath,
    selectionInWorktree,
    selectionText,
    selectionLines,
    handleCreateFlash,
    handleFetchExcerpt,
    handleCreateExcerpt,
    handleCaptureScreenshot,
    handleConfirmRouting,
    handleCancelRouting,
    handleOpenRouting,
  };
}
