import React, { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { 
  RefreshCw, 
  CheckCircle2, 
  Archive, 
  Trash2,
  Plus,
  Hash, 
  Target, 
  Terminal,
  StickyNote,
  Layers,
  FileText,
  Activity,
  Clock,
  Play,
  Pause,
  MessageSquareText,
} from 'lucide-react';
import { ProjectEmptyState } from '../../ProjectEmptyState';
import { InboxSection } from './InboxSection';
import { CaptureRoutingSheet } from '../../capture/CaptureRoutingSheet';
import { ActionSheetStatusPanel } from '../../actionSheets/ActionSheetStatusPanel';
import { useModal } from '../../modals/ModalSystem';
import { IconButton } from '../../ui/IconButton';
import { focusRing } from '../../ui/focusRing';
import {
  updateHilItem as agencyUpdateHilItem,
  deleteHilItem as agencyDeleteHilItem,
  getWorkbenchFileUrl as agencyGetWorkbenchFileUrl,
} from '../../../services/agencyBridge';

const kindIcons = {
    comment: Terminal,
    memo: StickyNote,
    draft: Layers,
    reply: MessageSquareText,
};

const focusRingClass = focusRing.default;

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
  const [mutationError, setMutationError] = useState('');
  const modal = useModal();
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

  const updateStatus = useCallback(async (item, status) => {
    if (!item?.id || !worktreePath) {
      return;
    }
    try {
      const updated = await agencyUpdateHilItem({
        worktreePath,
        itemId: item.id,
        patch: { status },
      });
      if (!updated) {
        throw new Error('HIL IPC unavailable.');
      }
      setMutationError('');
      await refresh();
    } catch (updateError) {
      console.error(updateError);
      setMutationError(updateError?.message || 'Failed to update item.');
      modal?.notify?.({
        title: 'Draft update failed',
        description: updateError?.message || 'Unable to update the draft status.',
        tone: 'warning',
      });
    }
  }, [modal, refresh, worktreePath]);

  const handleArchiveDraft = useCallback(
    async (draft) => {
      if (!draft?.id) {
        return;
      }
      if (!modal?.confirm) {
        console.warn('Modal system unavailable; archive aborted.');
        return;
      }
      const confirmed = await modal.confirm({
        title: 'Archive Draft',
        description: 'This draft will move to archived status.',
        confirmLabel: 'Archive',
        cancelLabel: 'Cancel',
        tone: 'warning',
        icon: Archive,
      });
      if (!confirmed) {
        return;
      }
      await updateStatus(draft, 'archived');
    },
    [modal, updateStatus]
  );
  const handleDeleteDraft = useCallback(
    async (draft) => {
      if (!draft?.id || !worktreePath) {
        return;
      }
      if (!modal?.confirm) {
        console.warn('Modal system unavailable; delete aborted.');
        return;
      }
      const confirmed = await modal.confirm({
        title: 'Delete Draft',
        description: 'This draft will be removed from the HIL index and cannot be restored.',
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        tone: 'danger',
        icon: Trash2,
      });
      if (!confirmed) {
        return;
      }
      try {
        const result = await agencyDeleteHilItem({ worktreePath, itemId: draft.id });
        if (!result) {
          throw new Error('HIL IPC unavailable.');
        }
        setMutationError('');
        await refresh();
        setDockSelection({ type: 'inbox', inboxType: 'comments', draftId: null });
      } catch (deleteError) {
        console.error(deleteError);
        setMutationError(deleteError?.message || 'Failed to delete draft.');
        modal?.notify?.({
          title: 'Draft delete failed',
          description: deleteError?.message || 'Unable to delete the draft.',
          tone: 'danger',
        });
      }
    },
    [modal, refresh, setDockSelection, worktreePath]
  );
  const handleCreateDraftActionSheet = useCallback(
    async (draft) => {
      if (!draft?.id || !worktreePath || typeof onCreateActionSheet !== 'function') {
        return;
      }
      try {
        const created = await onCreateActionSheet(draft);
        if (!created?.id) {
          throw new Error('Unable to create Action Sheet.');
        }
        const updated = await agencyUpdateHilItem({
          worktreePath,
          itemId: draft.id,
          patch: {
            meta: {
              ...(draft.meta || {}),
              actionSheetId: created.id,
            },
          },
        });
        if (!updated) {
          throw new Error('HIL IPC unavailable.');
        }
        setMutationError('');
        await refresh();
      } catch (createError) {
        console.error(createError);
        setMutationError(createError?.message || 'Failed to create Action Sheet.');
        modal?.notify?.({
          title: 'Action Sheet create failed',
          description: createError?.message || 'Unable to create an Action Sheet from this draft.',
          tone: 'warning',
        });
      }
    },
    [modal, onCreateActionSheet, refresh, worktreePath]
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
            <DraftDetail
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
              <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4">
                <div className="flex flex-col gap-0.5">
                  {visibleInboxItems.map((item, index) => (
                  <MemoRow
                    key={item.id}
                    index={index}
                    item={item}
                    worktreePath={worktreePath}
                    onUpdateStatus={updateStatus}
                    resolveBody={resolveBody}
                    onOpenDetail={(detail) => {
                      if (!modal?.openModal) {
                        return;
                      }
                      const bodyText = resolveBody(detail) || 'No content.';
                      const noteType = detail.kind === 'memo' ? detail.meta?.noteType : '';
                      const titleParts = [detail.kind, noteType].filter(Boolean).map((value) => String(value).toUpperCase());
                      const title = titleParts.length ? `${titleParts.join(' · ')} Detail` : 'Memo Detail';
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
                        description: sourceUrl ? `${sourceUrl}\n\n${bodyText}` : bodyText,
                        content,
                        variant: 'floating',
                        tone: 'info',
                        dismissLabel: 'Close',
                        dismissOnOverlay: true,
                      });
                    }}
                  />
                  ))}
                </div>

                {!loading && visibleInboxItems.length === 0 && (
                  <div className="py-32 flex flex-col items-center justify-center opacity-5">
                    <Hash size={64} strokeWidth={1} />
                    <p className="text-[11px] font-black uppercase tracking-[0.5em] mt-6">
                      Inbox Empty
                    </p>
                  </div>
                )}
              </div>
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

function MemoRow({ item, index, worktreePath, onUpdateStatus, resolveBody, onOpenDetail }: any) {
    const isResolved = item.status === 'resolved' || item.status === 'archived';
    const isProcessed = item.kind === 'comment' && item.meta?.processed === true;
    const isMemoProcessed = item.kind === 'memo' && item.meta?.processed === true;
    const isReplyProcessed = item.kind === 'reply' && item.meta?.processed === true;
    const Icon = kindIcons[item.kind] || FileText;
    const bodySummary = resolveBody(item);
    const noteType = item.kind === 'memo' ? item.meta?.noteType : null;
    const noteLabel = noteType ? String(noteType).toUpperCase() : null;
    const voiceAsset = item.kind === 'memo' ? item.meta?.voice?.asset : null;
    const replyTimeTag = item.kind === 'reply' ? item.meta?.selection?.timeTag || 'Nature' : '';
    
    return (
        <div
            role="button"
            tabIndex={0}
            onClick={() => onOpenDetail?.(item)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onOpenDetail?.(item);
              }
            }}
            className={`group flex flex-col gap-1 px-4 py-3 rounded-xl transition-colors duration-300 ${focusRingClass} focus-visible:ring-primary/30 ${
                isResolved ? 'opacity-40 grayscale' : 'hover:bg-muted/5'
            }`}
        >
            <div className="flex items-start gap-4">
                {/* Index & Status Dot */}
                <div className="w-8 flex items-center gap-3 shrink-0 pt-0.5">
                    <span className="text-[9px] font-mono text-muted-foreground/30 font-black">{String(index + 1).padStart(2, '0')}</span>
                    <div className={`h-1.5 w-1.5 rounded-full transition-colors transition-shadow duration-700 ${item.status === 'open' ? 'bg-primary shadow-[0_0_10px_rgba(59,130,246,0.4)]' : 'bg-muted-foreground/30'}`} />
                </div>

                {/* Content Summary */}
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
                        <span className="inline-flex items-center gap-2">
                          <Icon size={13} strokeWidth={1.5} className={!isResolved ? 'text-primary/60' : 'text-muted-foreground/30'} />
                          {item.kind}
                        </span>
                        {noteLabel ? (
                            <span className="rounded-full border border-border/20 px-1.5 py-0 text-[8px] font-bold uppercase tracking-widest text-muted-foreground/50">
                                {noteLabel}
                            </span>
                        ) : null}
                        {isProcessed || isMemoProcessed || isReplyProcessed ? (
                            <span className="rounded-full border border-emerald-500/30 px-1.5 py-0 text-[8px] font-bold uppercase tracking-widest text-emerald-400/70">
                                Done
                            </span>
                        ) : null}
                    </div>
                    <div className="text-[13px] text-muted-foreground/80 leading-snug line-clamp-2 tracking-tight group-hover:text-foreground transition-colors duration-300 font-medium">
                        {bodySummary}
                    </div>
                    {voiceAsset ? (
                        <div className="mt-1">
                          <MemoAudioButton voiceAsset={voiceAsset} worktreePath={worktreePath} />
                        </div>
                    ) : null}
                </div>

                {/* Inline Hover Actions: Zen Style */}
                <div className="mt-0.5 flex items-center gap-1 opacity-0 translate-x-2 transition-opacity transition-transform group-hover:opacity-100 group-hover:translate-x-0 group-focus-within:opacity-100 group-focus-within:translate-x-0">
                    {item.status === 'open' ? (
                        <RowAction icon={CheckCircle2} title="Resolve" onClick={() => onUpdateStatus(item, 'resolved')} color="hover:text-emerald-500 hover:bg-emerald-500/10" />
                    ) : (
                        <RowAction icon={RefreshCw} title="Restore" onClick={() => onUpdateStatus(item, 'open')} color="hover:text-amber-500 hover:bg-amber-500/10" />
                    )}
                    <RowAction icon={Archive} title="Archive" onClick={() => onUpdateStatus(item, 'archived')} />
                </div>
            </div>

            {/* Context & Temporal */}
            <div className="ml-12 flex items-center justify-between gap-3 text-[10px] text-muted-foreground/40">
                {item.kind === 'reply' ? (
                    <div className="flex items-center gap-2 font-mono italic truncate max-w-[220px] group-hover:text-muted-foreground/60 transition-colors">
                        <Clock size={10} className="shrink-0" />
                        {replyTimeTag}
                    </div>
                ) : item.anchor?.file ? (
                    <div className="flex items-center gap-2 font-mono italic truncate max-w-[220px] group-hover:text-muted-foreground/60 transition-colors">
                        <Target size={10} className="shrink-0" />
                        {item.anchor.file.split('/').pop()}
                        <span className="not-italic opacity-40">:{item.anchor.line}</span>
                    </div>
                ) : (
                    <span className="italic text-muted-foreground/30">Unlinked</span>
                )}
                <div className="font-mono font-bold tabular-nums text-muted-foreground/30">
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                </div>
            </div>
        </div>
    );
}

function MemoAudioButton({ voiceAsset, worktreePath }: any) {
  const [audioUrl, setAudioUrl] = useState('');
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);

  const ensureUrl = useCallback(async () => {
    if (audioUrl || !voiceAsset?.path) {
      return audioUrl;
    }
    const result = await agencyGetWorkbenchFileUrl({
      rootPath: worktreePath || null,
      targetPath: voiceAsset.path,
    });
    const url = result?.url || '';
    setAudioUrl(url);
    return url;
  }, [audioUrl, voiceAsset?.path, worktreePath]);

  const handleToggle = async (event) => {
    event.stopPropagation();
    const url = await ensureUrl();
    if (!url) {
      return;
    }
    const audioEl = audioRef.current;
    if (!audioEl) {
      return;
    }
    if (audioEl.paused) {
      try {
        await audioEl.play();
        setPlaying(true);
      } catch (error) {
        setPlaying(false);
      }
    } else {
      audioEl.pause();
      setPlaying(false);
    }
  };

  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) {
      return undefined;
    }
    const handleEnded = () => {
      setPlaying(false);
    };
    audioEl.addEventListener('ended', handleEnded);
    return () => {
      audioEl.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleToggle}
        className={`flex items-center gap-1 rounded-md border border-border/20 px-2 py-1 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60 transition-colors hover:border-primary/40 hover:text-foreground ${focusRingClass}`}
      >
        {playing ? <Pause size={10} /> : <Play size={10} />}
        {playing ? 'Pause' : 'Play'}
      </button>
      {voiceAsset?.durationMs ? (
        <span className="text-[9px] text-muted-foreground/50">
          {(voiceAsset.durationMs / 1000).toFixed(1)}s
        </span>
      ) : null}
      <audio ref={audioRef} src={audioUrl} />
    </div>
  );
}

function DraftDetail({
  draft,
  onUpdateStatus,
  onArchiveDraft,
  onDeleteDraft,
  mutationError,
  sessionsById,
  onViewSession,
  actionSheetsById,
  sessions,
  onDispatchActionSheet,
  onCancelActionSheet,
  onArchiveActionSheet,
  onDeleteActionSheet,
  onOpenActionSheets,
  onCreateActionSheet,
  resolveBody,
  summarizeBody,
}: any) {
    const createdAt = draft.createdAt ? new Date(draft.createdAt) : null;
    const references = Array.isArray(draft.references) ? draft.references : [];
    const executionStatus = draft.meta?.executionStatus || 'idle';
    const executionSessionId = draft.meta?.executionSessionId || draft.meta?.promoteSessionId || '';
    const executionRequestedAt = draft.meta?.executionRequestedAt ? new Date(draft.meta.executionRequestedAt) : null;
    const executionStartedAt = draft.meta?.executionStartedAt ? new Date(draft.meta.executionStartedAt) : null;
    const executionFinishedAt = draft.meta?.executionFinishedAt ? new Date(draft.meta.executionFinishedAt) : null;
    const actionSheetId = draft.meta?.actionSheetId || '';
    const actionSheetStatus = actionSheetId ? actionSheetsById?.get(actionSheetId) || null : null;
    const hasActionSheet = Boolean(actionSheetId);
    const sessionLabel = executionSessionId
        ? sessionsById?.get(executionSessionId)?.name || executionSessionId
        : '';
    const gateReady = isDraftComplete(draft);

    return (
        <div className="flex h-full flex-col">
            <header className="flex items-center justify-between px-6 py-4 border-b border-border/10">
                <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
                        Draft Detail
                    </div>
                    <div className="text-lg font-semibold text-foreground tracking-tight">
                        {summarizeBody(draft)}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground/40 uppercase tracking-[0.2em]">
                        <span className="inline-flex items-center gap-1">
                            <Layers size={12} />
                            {draft.status}
                        </span>
                        {createdAt && (
                            <span className="inline-flex items-center gap-1">
                                <Clock size={12} />
                                {createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {draft.status === 'open' ? (
                        <RowAction
                            icon={CheckCircle2}
                            title="Resolve"
                            onClick={() => onUpdateStatus(draft, 'resolved')}
                            color="hover:text-emerald-500 hover:bg-emerald-500/10"
                        />
                    ) : (
                        <RowAction
                            icon={RefreshCw}
                            title="Reopen"
                            onClick={() => onUpdateStatus(draft, 'open')}
                            color="hover:text-amber-500 hover:bg-amber-500/10"
                        />
                    )}
                    <RowAction
                        icon={Archive}
                        title="Archive"
                        onClick={() => onArchiveDraft?.(draft)}
                    />
                    <RowAction
                        icon={Trash2}
                        title="Delete"
                        onClick={() => onDeleteDraft?.(draft)}
                        color="hover:text-rose-400 hover:bg-rose-500/10"
                    />
                </div>
            </header>
            {mutationError ? (
                <div
                  role="status"
                  aria-live="polite"
                  className="mx-6 mt-4 rounded-2xl border border-rose-500/10 bg-rose-500/5 px-4 py-3 text-[11px] font-medium text-rose-400 animate-slide-down"
                >
                    <Activity size={14} className="inline mr-2" /> {mutationError}
                </div>
            ) : null}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4">
                <div className="rounded-2xl border border-border/10 bg-muted/5 p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
                        Execution Status
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground/70">
                        <span className="inline-flex items-center gap-2 rounded-full border border-border/20 bg-muted/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">
                            {executionStatus}
                        </span>
                        <span className="inline-flex items-center gap-2">
                            <Target size={12} className={gateReady ? 'text-emerald-400' : 'text-muted-foreground/40'} />
                            {gateReady ? 'Gate ready' : 'Gate waiting'}
                        </span>
                        {executionSessionId ? (
                            <span className="inline-flex items-center gap-2">
                                <Terminal size={12} className="text-primary/60" />
                                {sessionLabel}
                            </span>
                        ) : null}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-muted-foreground/40">
                        {executionRequestedAt ? (
                            <span>Requested {executionRequestedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                        ) : null}
                        {executionStartedAt ? (
                            <span>Started {executionStartedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                        ) : null}
                        {executionFinishedAt ? (
                            <span>Finished {executionFinishedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                        ) : null}
                        {actionSheetStatus ? (
                            <span>Action Sheet {actionSheetId}</span>
                        ) : null}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => onViewSession?.(executionSessionId)}
                            disabled={!executionSessionId}
                            className="rounded-md border border-border/20 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground hover:border-primary/40 disabled:opacity-40"
                        >
                            View Session
                        </button>
                    </div>
                </div>
                {hasActionSheet ? (
                  actionSheetStatus ? (
                    <ActionSheetStatusPanel
                      sheet={actionSheetStatus}
                      sessions={sessions}
                      sessionId={actionSheetStatus?.sessionId || executionSessionId}
                      onDispatchSheet={onDispatchActionSheet}
                      onCancelSheet={onCancelActionSheet}
                      onArchiveSheet={onArchiveActionSheet}
                      onDeleteSheet={onDeleteActionSheet}
                      onViewSession={onViewSession}
                      onOpenPanel={onOpenActionSheets}
                      compact
                      showSessionSelect={false}
                    />
                  ) : (
                    <div className="rounded-2xl border border-border/10 bg-muted/5 p-4 mt-4">
                      <div className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
                        Action Sheet
                      </div>
                      <div className="mt-2 text-[11px] text-muted-foreground/60">
                        Linked Action Sheet: {actionSheetId}
                      </div>
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => onOpenActionSheets?.(actionSheetId)}
                          className="rounded-md border border-border/30 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground"
                        >
                          Open Action Sheets
                        </button>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="rounded-2xl border border-border/10 bg-muted/5 p-4 mt-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
                      Action Sheet
                    </div>
                    <div className="mt-2 text-[11px] text-muted-foreground/60">
                      No Action Sheet linked.
                    </div>
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => onCreateActionSheet?.(draft)}
                        disabled={!onCreateActionSheet}
                        className="rounded-md border border-primary/40 bg-primary/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-primary hover:bg-primary/10 disabled:opacity-40"
                      >
                        <Plus size={12} className="inline mr-1" />
                        Create Action Sheet
                      </button>
                    </div>
                  </div>
                )}
                <div className="rounded-2xl border border-border/10 bg-muted/5 p-4 mt-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
                        Draft Body
                    </div>
                    <div className="mt-3 text-[13px] leading-relaxed text-foreground/80 whitespace-pre-wrap font-mono">
                        {resolveBody(draft) || 'No content.'}
                    </div>
                </div>

                {references.length > 0 && (
                    <div className="mt-6">
                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
                            References
                        </div>
                        <div className="mt-2 flex flex-col gap-2">
                            {references.map((ref, index) => (
                                <div
                                    key={`${ref.id || ref.path || index}`}
                                    className="rounded-xl border border-border/10 bg-muted/5 px-3 py-2 text-[11px] text-muted-foreground/70"
                                >
                                    <div className="flex items-center gap-2">
                                        <Target size={12} className="text-primary/60" />
                                        <span className="font-mono truncate">
                                            {ref.path || ref.id || 'Unknown reference'}
                                        </span>
                                        {ref.line ? (
                                            <span className="text-[10px] text-muted-foreground/40">:{ref.line}</span>
                                        ) : null}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function RowAction({ icon: Icon, onClick, title, color = "hover:text-foreground hover:bg-muted/10" }: any) {
    const handleClick = (event) => {
        event.stopPropagation();
        onClick?.();
    };

    return (
        <IconButton
            label={title}
            onClick={handleClick}
            className={`p-1.5 rounded-lg transition-colors text-muted-foreground/40 ${color}`}
        >
            <Icon size={14} strokeWidth={2} aria-hidden="true" />
        </IconButton>
    );
}
