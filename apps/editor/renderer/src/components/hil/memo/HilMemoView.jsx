import React, { useMemo, useCallback, useEffect, useState } from 'react';
import { 
  RefreshCw, 
  CheckCircle2, 
  Archive, 
  Hash, 
  Target, 
  Terminal,
  StickyNote,
  Layers,
  FileText,
  Activity,
  Clock,
} from 'lucide-react';
import { ProjectEmptyState } from '../../ProjectEmptyState.jsx';
import { InboxSection } from './InboxSection.jsx';
import { CaptureRoutingSheet } from '../../capture/CaptureRoutingSheet.jsx';
import { ActionSheetStatusPanel } from '../../actionSheets/ActionSheetStatusPanel.jsx';
import {
  createHilItem as agencyCreateHilItem,
  startScreenshotCapture as agencyStartScreenshotCapture,
  saveCaptureAsset as agencySaveCaptureAsset,
  copyCaptureToClipboard as agencyCopyCaptureToClipboard,
  getWorkbenchFileUrl as agencyGetWorkbenchFileUrl,
} from '../../../services/agencyBridge.js';

const kindIcons = {
    comment: Terminal,
    memo: StickyNote,
    draft: Layers
};

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
  selection,
  cells = [],
  selectedCellId,
  projectRoot,
  sessions = [],
  onViewSession,
  actionSheets = [],
  onDispatchActionSheet,
  onCancelActionSheet,
  onOpenActionSheets,
  // Props from useHilMemoState
  items,
  loading,
  error,
  refresh,
  searchQuery,
  dockSelection,
  setDockSelection,
  draftItems,
  selectedDraft,
  activeInboxSection,
  visibleInboxItems,
  summarizeBody,
  resolveBody,
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

  const updateStatus = useCallback(async (item, status) => {
    if (!window.agency?.updateHilItem || !item?.id || !worktreePath) return;
    await window.agency.updateHilItem({ worktreePath, itemId: item.id, patch: { status } });
    refresh();
  }, [refresh, worktreePath]);

  const selectionInWorktree = Boolean(
    selection?.filePath && selection?.rootPath && worktreePath && selection.rootPath === worktreePath
  );
  const selectionText = selectionInWorktree ? selection.text || '' : '';
  const selectionLines = selectionInWorktree
    ? { start: selection.startLine, end: selection.endLine }
    : null;

  useEffect(() => {
    setCaptureError('');
  }, [activeInboxSection?.id]);

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
        refresh();
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
  }, [cells, routingTargetId, selectedCellId, worktreePath]);

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
          refresh();
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
              sessionsById={sessionsById}
              onViewSession={onViewSession}
              actionSheetsById={actionSheetsById}
              sessions={sessions}
              onDispatchActionSheet={onDispatchActionSheet}
              onCancelActionSheet={onCancelActionSheet}
              onOpenActionSheets={onOpenActionSheets}
              resolveBody={resolveBody}
              summarizeBody={summarizeBody}
            />
          ) : (
            <div className="flex h-full flex-col">
              <InboxSection
                activeSection={activeInboxSection}
                selectionPath={selectionInWorktree ? selection?.filePath : ''}
                selectionLines={selectionLines}
                selectionText={selectionText}
                flashValue={flashText}
                onFlashChange={setFlashText}
                onSaveFlash={handleCreateFlash}
                excerptNote={excerptNote}
                onExcerptNoteChange={setExcerptNote}
                onSaveExcerpt={handleCreateExcerpt}
                screenshotAsset={screenshotAsset}
                pendingCapture={captureResult}
                screenshotNote={screenshotNote}
                onScreenshotNoteChange={setScreenshotNote}
                onCaptureScreenshot={handleCaptureScreenshot}
                onOpenRouting={() => {
                  if (captureResult) {
                    setRoutingOpen(true);
                  }
                }}
                captureLoading={captureLoading}
                captureError={captureError}
              />

              {error && (
                <div className="mx-6 mt-4 p-4 bg-rose-500/5 rounded-2xl border border-rose-500/10 text-rose-400 text-[11px] font-medium animate-slide-down">
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
                    onUpdateStatus={updateStatus}
                    resolveBody={resolveBody}
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

function MemoRow({ item, index, onUpdateStatus, resolveBody }) {
    const isResolved = item.status === 'resolved' || item.status === 'archived';
    const isProcessed = item.kind === 'comment' && item.meta?.processed === true;
    const isMemoProcessed = item.kind === 'memo' && item.meta?.processed === true;
    const Icon = kindIcons[item.kind] || FileText;
    const bodySummary = resolveBody(item);
    const noteType = item.kind === 'memo' ? item.meta?.noteType : null;
    const noteLabel = noteType ? String(noteType).toUpperCase() : null;
    
    return (
        <div className={`group flex items-center h-12 px-4 gap-6 transition-all duration-500 rounded-xl ${
            isResolved ? 'opacity-40 grayscale' : 'hover:bg-muted/5'
        }`}>
            {/* Index & Status Dot */}
            <div className="w-8 flex items-center gap-3 shrink-0">
                <span className="text-[9px] font-mono text-muted-foreground/30 font-black">{String(index + 1).padStart(2, '0')}</span>
                <div className={`h-1.5 w-1.5 rounded-full transition-all duration-700 ${item.status === 'open' ? 'bg-primary shadow-[0_0_10px_rgba(59,130,246,0.4)]' : 'bg-muted-foreground/30'}`} />
            </div>

            {/* Type Identifier */}
            <div className="w-24 shrink-0 flex items-center gap-2">
                <Icon size={13} strokeWidth={1.5} className={!isResolved ? 'text-primary/60' : 'text-muted-foreground/30'} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">{item.kind}</span>
                {noteLabel ? (
                    <span className="rounded-full border border-border/20 px-1.5 py-0 text-[8px] font-bold uppercase tracking-widest text-muted-foreground/50">
                        {noteLabel}
                    </span>
                ) : null}
                {isProcessed || isMemoProcessed ? (
                    <span className="rounded-full border border-emerald-500/30 px-1.5 py-0 text-[8px] font-bold uppercase tracking-widest text-emerald-400/70">
                        Done
                    </span>
                ) : null}
            </div>

            {/* Content Summary */}
            <div className="flex-1 min-w-0 flex items-center gap-4">
                <div className="text-[13px] text-muted-foreground truncate tracking-tight group-hover:text-foreground transition-colors duration-300 font-medium">
                    {bodySummary}
                </div>
                
                {/* Inline Hover Actions: Zen Style */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                    {item.status === 'open' ? (
                        <RowAction icon={CheckCircle2} title="Resolve" onClick={() => onUpdateStatus(item, 'resolved')} color="hover:text-emerald-500 hover:bg-emerald-500/10" />
                    ) : (
                        <RowAction icon={RefreshCw} title="Restore" onClick={() => onUpdateStatus(item, 'open')} color="hover:text-amber-500 hover:bg-amber-500/10" />
                    )}
                    <RowAction icon={Archive} title="Archive" onClick={() => onUpdateStatus(item, 'archived')} />
                </div>
            </div>

            {/* Context & Temporal */}
            <div className="w-64 shrink-0 flex items-center justify-end gap-6">
                {item.anchor?.file && (
                    <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground/30 italic truncate max-w-[160px] group-hover:text-muted-foreground/50 transition-colors">
                        <Target size={10} className="shrink-0" />
                        {item.anchor.file.split('/').pop()}
                        <span className="not-italic opacity-40">:{item.anchor.line}</span>
                    </div>
                )}
                <div className="text-[10px] font-mono text-muted-foreground/20 font-bold tabular-nums">
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                </div>
            </div>
        </div>
    );
}

function DraftDetail({
  draft,
  onUpdateStatus,
  sessionsById,
  onViewSession,
  actionSheetsById,
  sessions,
  onDispatchActionSheet,
  onCancelActionSheet,
  onOpenActionSheets,
  resolveBody,
  summarizeBody,
}) {
    const createdAt = draft.createdAt ? new Date(draft.createdAt) : null;
    const references = Array.isArray(draft.references) ? draft.references : [];
    const executionStatus = draft.meta?.executionStatus || 'idle';
    const executionSessionId = draft.meta?.executionSessionId || draft.meta?.promoteSessionId || '';
    const executionRequestedAt = draft.meta?.executionRequestedAt ? new Date(draft.meta.executionRequestedAt) : null;
    const executionStartedAt = draft.meta?.executionStartedAt ? new Date(draft.meta.executionStartedAt) : null;
    const executionFinishedAt = draft.meta?.executionFinishedAt ? new Date(draft.meta.executionFinishedAt) : null;
    const actionSheetId = draft.meta?.actionSheetId || '';
    const actionSheetStatus = actionSheetId
        ? actionSheetsById?.get(actionSheetId) || { id: actionSheetId, state: 'idle', gateStatus: 'idle' }
        : null;
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
                        onClick={() => onUpdateStatus(draft, 'archived')}
                    />
                </div>
            </header>
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
                        {actionSheetId ? (
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
                {actionSheetId ? (
                  <ActionSheetStatusPanel
                    sheet={actionSheetStatus}
                    sessions={sessions}
                    sessionId={actionSheetStatus?.sessionId || executionSessionId}
                    onDispatchSheet={onDispatchActionSheet}
                    onCancelSheet={onCancelActionSheet}
                    onViewSession={onViewSession}
                    onOpenPanel={onOpenActionSheets}
                    compact
                    showSessionSelect={false}
                  />
                ) : null}
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

function RowAction({ icon: Icon, onClick, title, color = "hover:text-foreground hover:bg-muted/10" }) {
    return (
        <button 
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className={`p-1.5 rounded-lg transition-all text-muted-foreground/40 ${color}`}
            title={title}
        >
            <Icon size={14} strokeWidth={2} />
        </button>
    )
}
