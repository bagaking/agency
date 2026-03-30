import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createHilItem as agencyCreateHilItem,
  startScreenshotCapture as agencyStartScreenshotCapture,
  saveCaptureAsset as agencySaveCaptureAsset,
  copyCaptureToClipboard as agencyCopyCaptureToClipboard,
  getWorkbenchFileUrl as agencyGetWorkbenchFileUrl,
  fetchHilExcerpt as agencyFetchHilExcerpt,
  saveVoiceCaptureAudio as agencySaveVoiceCaptureAudio,
} from '../services/agencyBridge';
import { useVoiceCapture } from './useVoiceCapture';

export function useHilMemoCaptureState({
  worktreePath,
  projectRoot,
  cells = [],
  selectedCellId,
  selection,
  onCaptureSaved,
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
  const [voiceLiveSegments, setVoiceLiveSegments] = useState([]);
  const voiceLiveMapRef = useRef(new Map());
  const voiceLiveOrderRef = useRef([]);
  const voiceCommittedRef = useRef(new Set());

  const syncVoiceLiveSegments = useCallback(() => {
    const order = voiceLiveOrderRef.current;
    const map = voiceLiveMapRef.current;
    setVoiceLiveSegments(order.map((id) => map.get(id)).filter(Boolean));
  }, []);

  const appendCommittedText = useCallback((addition) => {
    const text = String(addition || '').trim();
    if (!text) {
      return;
    }
    setFlashText((current) => {
      const raw = String(current || '');
      if (!raw.trim()) {
        return text;
      }
      const separator = raw.endsWith(' ') ? '' : ' ';
      return `${raw}${separator}${text}`;
    });
  }, []);

  const handleVoiceFinal = useCallback(
    (snippet) => {
      if (!snippet) {
        return;
      }
      if (typeof snippet === 'string') {
        appendCommittedText(snippet);
        return;
      }
      const text = String(snippet.text || '').trim();
      if (!text) {
        return;
      }
      const segmentId = snippet.segmentId || '';
      const reason = snippet.reason || 'final';
      const isDraft = reason === 'draft';
      if (segmentId && isDraft) {
        const map = voiceLiveMapRef.current;
        const order = voiceLiveOrderRef.current;
        if (!map.has(segmentId)) {
          order.push(segmentId);
        }
        map.set(segmentId, {
          id: segmentId,
          text,
          status: 'rescoring',
          reason,
          language: snippet.language || null,
        });
        syncVoiceLiveSegments();
        return;
      }
      if (segmentId && voiceCommittedRef.current.has(segmentId)) {
        return;
      }
      appendCommittedText(text);
      if (segmentId) {
        voiceCommittedRef.current.add(segmentId);
        const map = voiceLiveMapRef.current;
        if (map.has(segmentId)) {
          map.delete(segmentId);
          voiceLiveOrderRef.current = voiceLiveOrderRef.current.filter((id) => id !== segmentId);
          syncVoiceLiveSegments();
        }
      }
    },
    [appendCommittedText, syncVoiceLiveSegments]
  );

  const flashVoice = useVoiceCapture({
    onFinal: handleVoiceFinal,
  });

  const handleFlashChange = useCallback((value) => {
    setFlashText(value);
    voiceLiveMapRef.current.clear();
    voiceLiveOrderRef.current = [];
    voiceCommittedRef.current.clear();
    setVoiceLiveSegments([]);
  }, []);

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
      .filter((cell) => cell?.attachedWorktreePath || cell?.projectRoot || cell?.worktreePath)
      .forEach((cell) => {
        const targetRoot = cell.attachedWorktreePath || cell.projectRoot || cell.worktreePath;
        if (seen.has(targetRoot)) {
          return;
        }
        seen.add(targetRoot);
        list.push({
          id: cell.id,
          label: cell.name || cell.id,
          worktreePath: targetRoot,
        });
      });
    return list;
  }, [cells, projectRoot]);

  const resolveDefaultRoutingTarget = useCallback(() => {
    const selectedCell = cells.find(
      (cell) =>
        cell.id === selectedCellId &&
        (cell.attachedWorktreePath || cell.projectRoot || cell.worktreePath)
    );
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
    voiceLiveMapRef.current.clear();
    voiceLiveOrderRef.current = [];
    voiceCommittedRef.current.clear();
    setVoiceLiveSegments([]);
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
    async ({ body, anchor = null, meta }: { body: string; anchor?: any; meta: any }) => {
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
          repoRootPath: projectRoot,
          cellId: selectedCellId,
          kind: 'memo',
          body: body.trim(),
          anchor,
          meta,
        });
        if (meta?.noteType) {
          onCaptureSaved?.(meta.noteType);
        }
        resetCaptureState();
        await refresh?.();
      } catch (createError) {
        setCaptureError(createError?.message || 'Failed to create memo.');
      } finally {
        setCaptureLoading(false);
      }
    },
    [onCaptureSaved, projectRoot, refresh, resetCaptureState, selectedCellId, worktreePath]
  );

  const handleCreateFlash = useCallback(async () => {
    let voiceMeta = null;
    if (flashVoice?.audio) {
      const voicePayload = flashVoice.audio;
      try {
        const saved = await agencySaveVoiceCaptureAudio({
          worktreePath,
          sourcePath: voicePayload.path || null,
          dataUrl: voicePayload.dataUrl || null,
          durationMs: voicePayload.durationMs ?? null,
          mime: voicePayload.mime || null,
        });
        if (!saved?.path) {
          setCaptureError('Failed to save voice audio.');
          return;
        }
        voiceMeta = {
          asset: saved,
          backend: voicePayload.backend || null,
          capturedAt: new Date().toISOString(),
        };
        await flashVoice.clearAudio?.();
      } catch (error) {
        setCaptureError(error?.message || 'Failed to save voice audio.');
        return;
      }
    }
    await handleCreateMemo({
      body: flashText,
      meta: {
        noteType: 'flash',
        ...(voiceMeta ? { voice: voiceMeta } : {}),
      },
    });
  }, [flashText, flashVoice, handleCreateMemo, worktreePath]);

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
    const targetWorktree =
      target?.attachedWorktreePath ||
      target?.projectRoot ||
      target?.worktreePath ||
      projectRoot ||
      worktreePath;
    const targetCellId = target?.id || (routingTargetId === 'project-root' ? selectedCellId : '');
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
          repoRootPath: projectRoot,
          cellId: targetCellId,
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
        if (targetWorktree === worktreePath) {
          onCaptureSaved?.('screenshot');
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
    selectedCellId,
    worktreePath,
    onCaptureSaved,
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
    onFlashChange: handleFlashChange,
    flashVoice,
    flashVoiceSegments: voiceLiveSegments,
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
