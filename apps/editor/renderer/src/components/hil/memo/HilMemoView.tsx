import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import { Activity } from 'lucide-react';
import { ProjectEmptyState } from '../../ProjectEmptyState';
import { InboxSection } from './InboxSection';
import { HilMemoDraftDetail } from './HilMemoDraftDetail';
import { HilMemoList, MemoAudioButton } from './HilMemoList';
import { useHilMemoMutations } from './useHilMemoMutations';
import { CaptureRoutingSheet } from '../../capture/CaptureRoutingSheet';
import { useModal } from '../../modals/ModalSystem';
import { resolveFileReferenceTarget } from '../../../utils/fileReferences';
import { setFileDragPayload } from '../../../utils/fileDragPayload';


const isDraftComplete = (draft) => {
  if (!draft) {
    return false;
  }
  if (draft.meta?.promoted !== true) {
    return false;
  }
  if (draft.meta?.executionStatus !== 'complete') {
    return false;
  }
  const todos = Array.isArray(draft.meta?.todos) ? draft.meta.todos : null;
  if (!todos || todos.length === 0) {
    return true;
  }
  return todos.every((todo) => todo?.done === true || todo?.checked === true || todo?.status === 'done');
};

export function HilMemoView({
  worktreePath,
  projectRoot,
  selectedCellId,
  projectReady,
  projectError,
  onSelectProject,
  sessions = [],
  onViewSession,
  actionSheets = [],
  onDispatchActionSheet,
  onCancelActionSheet,
  onArchiveActionSheet,
  onDeleteActionSheet,
  onOpenActionSheets,
  onCreateActionSheet,
  onOpenReference,
  onRevealReference,
  flashText,
  onFlashChange,
  setFlashText,
  flashVoice,
  flashVoiceSegments,
  flashVoiceShortcut,
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
  handleCreateFlash,
  handleCreateExcerpt,
  handleFetchExcerpt,
  handleCaptureScreenshot,
  handleConfirmRouting,
  handleCancelRouting,
  handleOpenRouting,
  // Props from useHilMemoState
  loading,
  error,
  refresh,
  dockSelection,
  setDockSelection,
  selectedDraft,
  activeInboxSection,
  visibleInboxItems,
  summarizeBody,
  resolveBody,
  focusInboxInputId,
  onFocusInboxInputHandled,
  screenshotShortcut,
}: any) {
  const modal = useModal();
  const {
    mutationError,
    updateStatus,
    handleArchiveDraft,
    handleDeleteDraft,
    handleCreateDraftActionSheet,
  } = useHilMemoMutations({
    worktreePath,
    projectRoot,
    cellId: selectedCellId,
    refresh,
    setDockSelection,
    modal,
    onCreateActionSheet,
  });

  const flashInputRef = useRef(null);
  const excerptUrlInputRef = useRef(null);
  const excerptNoteInputRef = useRef(null);
  const screenshotNoteInputRef = useRef(null);
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return false;
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);
  const handleFlashChange = useCallback(
    (value) => {
      if (onFlashChange) {
        onFlashChange(value);
        return;
      }
      setFlashText?.(value);
    },
    [onFlashChange, setFlashText]
  );

  useEffect(() => {
    if (!focusInboxInputId) {
      return;
    }
    if (!activeInboxSection || activeInboxSection.id !== focusInboxInputId) {
      return;
    }
    const targetRef =
      focusInboxInputId === 'flash'
        ? flashInputRef
        : focusInboxInputId === 'excerpt'
          ? excerptUrlInputRef
          : focusInboxInputId === 'screenshot'
            ? screenshotNoteInputRef
            : null;
    const node = targetRef?.current;
    if (node && typeof node.focus === 'function') {
      node.focus();
      if (typeof node.scrollIntoView === 'function') {
        node.scrollIntoView({
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
          block: 'center',
        });
      }
    }
    onFocusInboxInputHandled?.();
  }, [
    activeInboxSection,
    focusInboxInputId,
    onFocusInboxInputHandled,
    prefersReducedMotion,
  ]);

  const sessionsById = useMemo(() => {
    const map = new Map();
    (sessions || []).forEach((session) => {
      if (session?.id) {
        map.set(session.id, session);
      }
    });
    return map;
  }, [sessions]);

  const actionSheetsById = useMemo(() => {
    const map = new Map();
    (actionSheets || []).forEach((sheet) => {
      if (sheet?.id) {
        map.set(sheet.id, sheet);
      }
    });
    return map;
  }, [actionSheets]);

  const resolveReferenceTarget = useCallback(
    (rawPath) => resolveFileReferenceTarget({ path: rawPath, rootPath: worktreePath }),
    [worktreePath]
  );

  const handleOpenReference = useCallback(
    ({ path, line, column }: { path?: string; line?: number; column?: number } = {}) => {
      const resolved = resolveReferenceTarget(path);
      if (!resolved?.relativePath) {
        return;
      }
      onOpenReference?.({
        path: resolved.relativePath,
        line,
        column,
      });
    },
    [onOpenReference, resolveReferenceTarget]
  );

  const handleRevealReference = useCallback(
    ({ path }: { path?: string } = {}) => {
      const resolved = resolveReferenceTarget(path);
      if (!resolved?.relativePath) {
        return;
      }
      onRevealReference?.({ path: resolved.relativePath });
    },
    [onRevealReference, resolveReferenceTarget]
  );

  const handleReferenceDragStart = useCallback(
    (event, path) => {
      const resolved = resolveReferenceTarget(path);
      const success = setFileDragPayload(event, resolved?.absolutePath || '');
      if (!success) {
        event.preventDefault();
      }
    },
    [resolveReferenceTarget]
  );

  const handleOpenMemoItemDetail = useCallback(
    (detail) => {
      if (!modal?.openModal) {
        return;
      }
      const bodyText = resolveBody(detail) || 'No content.';
      const noteType = detail.kind === 'memo' ? detail.meta?.noteType : '';
      const titleParts = [detail.kind, noteType]
        .filter(Boolean)
        .map((value) => String(value).toUpperCase());
      const title = titleParts.length
        ? `${titleParts.join(' · ')} Detail`
        : 'Memo Detail';
      const sourceUrl = detail.meta?.source?.url || '';
      const voiceAsset = detail.kind === 'memo' ? detail.meta?.voice?.asset : null;
      const content = voiceAsset ? (
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
            Voice
          </span>
          <MemoAudioButton voiceAsset={voiceAsset} worktreePath={worktreePath} />
        </div>
      ) : null;
      modal.openModal({
        title,
        description: sourceUrl ? `${sourceUrl}

${bodyText}` : bodyText,
        content,
        variant: 'floating',
        tone: 'info',
        dismissLabel: 'Close',
        dismissOnOverlay: true,
      });
    },
    [modal, resolveBody, worktreePath]
  );

  useEffect(() => {
    setCaptureError('');
  }, [activeInboxSection?.id]);

  if (!projectReady) {
    return (
      <ProjectEmptyState
        title="No project selected"
        description="Select a workspace to manage HIL repository."
        error={projectError}
        onSelect={onSelectProject}
      />
    );
  }

  return (
    <div className="flex h-full flex-col bg-background overflow-hidden">
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-hidden">
          {dockSelection.type === 'draft' && selectedDraft ? (
            <HilMemoDraftDetail
              draft={selectedDraft}
              onUpdateStatus={updateStatus}
              onArchiveDraft={handleArchiveDraft}
              sessionsById={sessionsById}
              onViewSession={onViewSession}
              actionSheetsById={actionSheetsById}
              sessions={sessions}
              onDispatchActionSheet={onDispatchActionSheet}
              onCancelActionSheet={onCancelActionSheet}
              onArchiveActionSheet={onArchiveActionSheet}
              onDeleteActionSheet={onDeleteActionSheet}
              onOpenActionSheets={onOpenActionSheets}
              mutationError={mutationError}
              onDeleteDraft={handleDeleteDraft}
              onCreateActionSheet={handleCreateDraftActionSheet}
              resolveBody={resolveBody}
              summarizeBody={summarizeBody}
              onOpenReference={handleOpenReference}
              onRevealReference={handleRevealReference}
              onReferenceDragStart={handleReferenceDragStart}
              isGateReady={isDraftComplete(selectedDraft)}
            />
          ) : (
            <div className="flex h-full flex-col">
              <InboxSection
                activeSection={activeInboxSection}
                flashValue={flashText}
                onFlashChange={handleFlashChange}
                onSaveFlash={handleCreateFlash}
                flashVoice={flashVoice}
                flashVoiceSegments={flashVoiceSegments}
                flashVoiceShortcut={flashVoiceShortcut}
                flashInputRef={flashInputRef}
                excerptUrl={excerptUrl}
                onExcerptUrlChange={setExcerptUrl}
                onFetchExcerpt={handleFetchExcerpt}
                excerptPreview={excerptPreview}
                excerptFetching={excerptFetching}
                excerptNote={excerptNote}
                onExcerptNoteChange={setExcerptNote}
                onSaveExcerpt={handleCreateExcerpt}
                excerptUrlInputRef={excerptUrlInputRef}
                excerptNoteInputRef={excerptNoteInputRef}
                screenshotAsset={screenshotAsset}
                pendingCapture={captureResult}
                screenshotNote={screenshotNote}
                onScreenshotNoteChange={setScreenshotNote}
                onCaptureScreenshot={handleCaptureScreenshot}
                onOpenRouting={handleOpenRouting}
                screenshotShortcut={screenshotShortcut}
                captureLoading={captureLoading}
                captureError={captureError}
                screenshotNoteInputRef={screenshotNoteInputRef}
              />

              {mutationError && (
                <div
                  role="status"
                  aria-live="polite"
                  className="mx-6 mt-4 p-4 bg-rose-500/5 rounded-2xl border border-rose-500/10 text-rose-400 text-[11px] font-medium animate-slide-down"
                >
                  <Activity size={14} className="inline mr-2" /> {mutationError}
                </div>
              )}
              {error && (
                <div
                  role="status"
                  aria-live="polite"
                  className="mx-6 mt-4 p-4 bg-rose-500/5 rounded-2xl border border-rose-500/10 text-rose-400 text-[11px] font-medium animate-slide-down"
                >
                  <Activity size={14} className="inline mr-2" /> {error}
                </div>
              )}
              <HilMemoList
                visibleInboxItems={visibleInboxItems}
                loading={loading}
                worktreePath={worktreePath}
                onUpdateStatus={updateStatus}
                resolveBody={resolveBody}
                onOpenReference={handleOpenReference}
                onReferenceDragStart={handleReferenceDragStart}
                onOpenDetail={handleOpenMemoItemDetail}
              />
            </div>
          )}
        </div>
      </div>
      <CaptureRoutingSheet
        open={routingOpen}
        previewUrl={captureResult?.dataUrl || ''}
        note={screenshotNote}
        onNoteChange={setScreenshotNote}
        targets={routingTargets}
        selectedTargetId={routingTargetId}
        onSelectTarget={setRoutingTargetId}
        mode={routingMode}
        onModeChange={setRoutingMode}
        onConfirm={handleConfirmRouting}
        onCancel={handleCancelRouting}
        error={routingError}
      />
    </div>
  );
}
