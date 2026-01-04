import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createHilItem as agencyCreateHilItem,
  startScreenshotCapture as agencyStartScreenshotCapture,
  saveCaptureAsset as agencySaveCaptureAsset,
  copyCaptureToClipboard as agencyCopyCaptureToClipboard,
  getWorkbenchFileUrl as agencyGetWorkbenchFileUrl,
} from '../services/agencyBridge.js';

export function useHilMemoCaptureState({
  worktreePath,
  projectRoot,
  cells = [],
  selectedCellId,
  selection,
  refresh,
}) {
  const [flashText, setFlashText] = useState('');
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
    if (routingOpen && !routingTargetId) {
      const nextTarget = resolveDefaultRoutingTarget();
      if (nextTarget) {
        setRoutingTargetId(nextTarget);
      }
    }
  }, [resolveDefaultRoutingTarget, routingOpen, routingTargetId]);

  const resetCaptureState = useCallback(() => {
    setFlashText('');
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
  }, []);

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

  const handleCreateExcerpt = useCallback(async () => {
    if (!selectionInWorktree || !selectionText.trim()) {
      setCaptureError('Select text in the editor to capture an excerpt.');
      return;
    }
    await handleCreateMemo({
      body: selectionText,
      anchor: selection?.filePath
        ? {
            file: selection.filePath,
            line: selection.startLine || 1,
            column: selection.startColumn || 1,
          }
        : null,
      meta: {
        noteType: 'excerpt',
        source: {
          file: selection.filePath,
          startLine: selection.startLine,
          endLine: selection.endLine,
          selection: selectionText,
          note: excerptNote.trim() || null,
        },
      },
    });
  }, [excerptNote, handleCreateMemo, selection, selectionInWorktree, selectionText]);

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
    handleCreateExcerpt,
    handleCaptureScreenshot,
    handleConfirmRouting,
    handleCancelRouting,
    handleOpenRouting,
  };
}
