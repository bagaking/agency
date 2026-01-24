import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  CheckCircle2, 
  Hash, 
  Terminal, 
  StickyNote, 
  Layers, 
  Quote,
  Camera,
  FileCode,
  MessageSquarePlus,
  RefreshCw,
  X
} from 'lucide-react';
import { ActionSheetStatusPanel } from '../actionSheets/ActionSheetStatusPanel.jsx';

const kindIcons = {
    comment: Terminal,
    memo: StickyNote,
    draft: Layers
};

const memoTypeMeta = {
  flash: { label: 'Flash', icon: StickyNote },
  excerpt: { label: 'Excerpt', icon: Quote },
  screenshot: { label: 'Screenshot', icon: Camera },
};

const toTitle = (value) =>
  value ? value.slice(0, 1).toUpperCase() + value.slice(1) : '';

const resolvePromoteType = (item) => {
  if (item.kind === 'comment') {
    return { id: 'comment', label: 'Comments', icon: Terminal };
  }
  if (item.kind === 'memo') {
    const noteType = item.meta?.noteType;
    const meta = memoTypeMeta[noteType] || { label: noteType ? toTitle(noteType) : 'Memo', icon: StickyNote };
    return { id: `memo:${noteType || 'memo'}`, label: meta.label, icon: meta.icon };
  }
  return { id: item.kind || 'unknown', label: toTitle(item.kind || 'Item'), icon: FileCode };
};

const resolvePromoteSource = (item) => {
  if (item.anchor?.file) {
    return { id: item.anchor.file, label: item.anchor.file };
  }
  return { id: 'unlinked', label: 'Unlinked' };
};

export function HilCommentsPanel({
  activeFile,
  cursorPosition,
  comments = [],
  loading,
  error,
  onOpenComment,
  onUpdateStatus,
  commentModalOpen,
  commentTarget,
  commentMessage,
  commentTodo,
  commentError,
  commentSaving,
  commentSnippet,
  commentSnippetLoading,
  commentSnippetError,
  onCommentMessageChange,
  onCommentTodoChange,
  onCloseComment,
  onSubmitComment,
  promoteModalOpen,
  promoteDescription,
  promoteError,
  promoteLoading,
  promoteItems = [],
  promoteSelectedIds = [],
  promotePreviewById = {},
  promoteStep,
  promoteDraft,
  promoteActionSheet,
  promoteGateStatus,
  promoteExecutionStatus,
  promoteSessionId,
  sessions = [],
  sessionActivityByKey = {},
  selectedCellId,
  onClosePromote,
  onPromoteDescriptionChange,
  onTogglePromoteItem,
  onTogglePromoteGroup,
  onPromotePreview,
  onSelectPromoteSession,
  onCreatePromoteSession,
  onDispatchPromote,
  onConfirmPromote,
  onFocusPromoteSession,
  onDispatchActionSheet,
  onCancelActionSheet,
  onArchiveActionSheet,
  onDeleteActionSheet,
  onOpenActionSheets,
  worktreePath,
}) {
  const messageRef = useRef(null);
  const fileLabel = activeFile ? activeFile.split('/').pop() : '';
  const pendingCount = useMemo(
    () => comments.filter((comment) => comment.status !== 'resolved').length,
    [comments]
  );
  const processedCount = useMemo(
    () => comments.filter((comment) => comment.processed).length,
    [comments]
  );
  const resolvedLine = Number.isFinite(commentTarget?.line)
    ? Math.max(1, Math.floor(commentTarget.line))
    : Math.max(1, Math.floor(cursorPosition?.line || 1));
  const snippetLines = commentSnippet?.snippet || null;
  const targetSnippet = snippetLines?.find((line) => line.isTarget);
  const targetLineContent = targetSnippet?.content || '';

  useEffect(() => {
    if (commentModalOpen && messageRef.current) {
      messageRef.current.focus();
    }
  }, [commentModalOpen]);

  return (
    <div className="flex flex-col gap-2 py-1 select-none">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold tracking-wider text-foreground/80">
            {fileLabel || 'HIL Comments'}
          </span>
          <span className="text-[9px] font-medium text-muted-foreground/60">
            {pendingCount} open · {processedCount} done
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          {activeFile ? (
            <button
              type="button"
              aria-label="Add comment"
              title="Add comment"
              onClick={() =>
                onOpenComment?.({
                  line: cursorPosition?.line || 1,
                  column: cursorPosition?.column || 1,
                })
              }
              className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/70 hover:text-foreground hover:bg-muted/10 transition-colors transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background"
            >
              <MessageSquarePlus size={13} strokeWidth={1.5} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>

      {commentModalOpen ? (
        <div className="rounded-xl border border-border/20 bg-card p-3 shadow-xl overflow-hidden relative ring-1 ring-black/5">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <MessageSquarePlus size={13} className="text-primary" strokeWidth={2} />
              Add Comment
            </div>
            <button
              type="button"
              aria-label="Close comment editor"
              onClick={onCloseComment}
              className="rounded-md p-0.5 text-muted-foreground/50 hover:text-foreground hover:bg-muted/10 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background"
            >
              <X size={13} aria-hidden="true" />
            </button>
          </div>
          
          <div className="flex flex-col gap-1.5">
            <div className="text-[10px] font-medium text-muted-foreground/60 px-0.5">
                {activeFile ? `${activeFile} · Ln ${resolvedLine}` : `Ln ${resolvedLine}`}
            </div>

            {commentSnippetLoading ? (
                <div className="px-1 py-2 flex items-center gap-2 text-[10px] text-muted-foreground/40 italic">
                    <RefreshCw size={10} className="animate-spin" aria-hidden="true" /> Retrieving context…
                </div>
            ) : commentSnippetError ? (
                <div role="status" aria-live="polite" className="mx-0.5 mt-0.5 text-[10px] text-rose-400 bg-rose-500/5 px-2 py-1 rounded border border-rose-500/10">
                    {commentSnippetError}
                </div>
            ) : null}

            {snippetLines?.length ? (
                <div className="rounded-md border border-border/10 bg-muted/5 px-2.5 py-1.5 font-mono text-[10px] text-muted-foreground/60 overflow-hidden">
                {snippetLines.map((line) => (
                    <div
                    key={`${line.line}-${line.isTarget ? 't' : 'n'}`}
                    className={`flex gap-3 h-4 items-center ${line.isTarget ? 'bg-primary/5 text-primary -mx-2.5 px-2.5 font-medium' : ''}`}
                    >
                    <span className="w-7 text-right opacity-30 tabular-nums select-none shrink-0">{line.line}</span>
                    <span className="truncate">{line.content || ' '}</span>
                    </div>
                ))}
                </div>
            ) : null}
          </div>

          <textarea
            ref={messageRef}
            value={commentMessage}
            onChange={(event) => onCommentMessageChange?.(event.target.value)}
            rows={3}
            name="comment-message"
            autoComplete="off"
            aria-label="Comment message"
            className="mt-2 w-full resize-none rounded-lg border border-border/20 bg-background px-2.5 py-2 text-sm text-foreground placeholder:text-muted-foreground/30 focus:border-primary/30 focus:ring-1 focus:ring-primary/10 focus:outline-none transition-colors"
            placeholder="Write a note…"
          />

          <div className="mt-2.5 flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground/70 cursor-pointer group/todo select-none">
              <input
                type="checkbox"
                checked={Boolean(commentTodo)}
                onChange={(event) => onCommentTodoChange?.(event.target.checked)}
                className="h-3 w-3 rounded border-border/60 bg-transparent text-primary focus:ring-offset-0 focus:ring-1 focus:ring-primary/20 transition-colors"
              />
              <span className="group-hover:text-foreground transition-colors">TODO</span>
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onCloseComment}
                className="rounded-md px-2.5 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/10 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSubmitComment}
                disabled={commentSaving}
                className="rounded-md bg-primary hover:bg-primary/90 px-3 py-1 text-[10px] font-semibold text-primary-foreground shadow-sm transition-colors transition-transform active:scale-95 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background"
              >
                {commentSaving ? 'Saving…' : 'Submit'}
              </button>
            </div>
          </div>
          {commentError ? (
            <div role="status" aria-live="polite" className="mt-2 text-[10px] font-medium text-rose-400 bg-rose-500/5 p-1.5 rounded border border-rose-500/10">
                {commentError}
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div role="status" aria-live="polite" className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-[10px] text-rose-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground/50">
          <RefreshCw size={12} className="animate-spin" aria-hidden="true" />
          Loading comments…
        </div>
      ) : comments && comments.length > 0 ? (
        comments.map((comment, i) => (
          <CommentItem 
            key={comment.id || i} 
            comment={comment} 
            onUpdateStatus={onUpdateStatus}
            worktreePath={worktreePath}
          />
        ))
      ) : (
        <div className="py-16 flex flex-col items-center justify-center opacity-10">
            <Hash size={32} strokeWidth={1} />
            <p className="text-[10px] font-black uppercase tracking-widest mt-2">No HIL Data</p>
        </div>
      )}
    </div>
  );
}

function CommentItem({ comment, onUpdateStatus, worktreePath }) {
    const isResolved = comment.status === 'resolved';
    const isProcessed = Boolean(comment.processed);
    const kindLabel = (comment.kind || 'comment').toUpperCase();
    const Icon = kindIcons[comment.kind] || Terminal;
    
    return (
        <div className={`group relative flex flex-col rounded-lg transition-colors duration-300 ${isResolved ? 'opacity-40 grayscale' : 'hover:bg-muted/5'}`}>
            {/* Type Indicator with Tooltip */}
            <div className="absolute -left-2 -top-1.5 z-10">
                <div
                    title={`Type: ${kindLabel}`}
                    className={`flex h-3.5 w-3.5 items-center justify-center rounded-[3px] border shadow-sm transition-colors transition-shadow ${
                        isResolved ? 'bg-muted border-border text-muted-foreground' : 'bg-popover border-border/40 text-primary'
                    }`}
                >
                    <Icon size={8} strokeWidth={2.5} aria-hidden="true" />
                </div>
            </div>

            {/* Contextual Linkage Header */}
            {comment.anchor && (
                <ContextAnchor 
                    anchor={comment.anchor} 
                    commentBody={comment.body || comment.message} 
                    worktreePath={worktreePath}
                    isResolved={isResolved}
                />
            )}

            <div className="px-2 pb-2">
                <header className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-foreground/80 tracking-tight uppercase">
                          {comment.author?.label || 'Agent'}
                      </span>
                      {isProcessed ? (
                        <span className="rounded border border-emerald-500/30 px-1 py-px text-[7px] font-bold uppercase tracking-widest text-emerald-400/70 leading-none">
                          Done
                        </span>
                      ) : null}
                    </div>
                    <span className="text-[9px] font-medium text-muted-foreground/30 uppercase tabular-nums">
                        {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </span>
                </header>

                <div className="text-[11px] leading-snug text-muted-foreground break-words mb-1.5 selection:bg-primary/30">
                    {comment.body || comment.message}
                </div>

                <footer className="flex items-center justify-end opacity-0 translate-y-1 transition-opacity transition-transform group-hover:opacity-100 group-hover:translate-y-0 h-3.5">
                    <button
                        type="button"
                        onClick={() => onUpdateStatus?.(comment, isResolved ? 'open' : 'resolved')}
                        aria-label={isResolved ? 'Reopen comment' : 'Resolve comment'}
                        className="flex items-center gap-1 text-[9px] font-bold text-emerald-500/60 hover:text-emerald-400 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                    >
                        <CheckCircle2 size={9} aria-hidden="true" />
                        {isResolved ? 'Reopen' : 'Resolve'}
                    </button>
                </footer>
            </div>
        </div>
    );
}

function ContextAnchor({ anchor, commentBody, worktreePath, isResolved }) {
    const [showTooltip, setShowTooltip] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [snippet, setSnippet] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (showTooltip && !snippet && window.agency?.getFileSnippet) {
            setLoading(true);
            window.agency.getFileSnippet({
                rootPath: worktreePath,
                targetPath: anchor.file,
                line: anchor.line,
                context: 3
            }).then(res => {
                setSnippet(res.snippet);
                setLoading(false);
            }).catch(() => setLoading(false));
        }
    }, [showTooltip, anchor, worktreePath, snippet]);

    return (
        <div 
            className="flex items-center gap-1.5 mb-1 px-0.5 cursor-help"
            onMouseEnter={(e) => { setMousePos({ x: e.clientX, y: e.clientY }); setShowTooltip(true); }}
            onMouseLeave={() => setShowTooltip(false)}
        >
            <div className={`h-1 w-1 rounded-full ${isResolved ? 'bg-muted-foreground/20' : 'bg-primary shadow-[0_0_6px_rgba(59,130,246,0.6)]'}`} />
            <span className={`text-[9px] font-black uppercase tracking-tighter ${isResolved ? 'text-muted-foreground/40' : 'text-primary'}`}>
                Ln {anchor.line}
            </span>
            <span className="text-[9px] text-muted-foreground/30 font-mono italic truncate max-w-[180px]">
                {anchor.file.split('/').pop()}
            </span>
            <div className={`h-px flex-1 bg-gradient-to-r ${isResolved ? 'from-muted-foreground/10' : 'from-primary/10'} to-transparent`} />
            
            {showTooltip && (
                <ContextTooltip 
                    x={mousePos.x} 
                    y={mousePos.y} 
                    snippet={snippet} 
                    loading={loading}
                    commentBody={commentBody}
                    fileName={anchor.file}
                />
            )}
        </div>
    );
}

function ContextTooltip({ x, y, snippet, loading, commentBody, fileName }) {
    const [pos, setPos] = useState({ left: x + 20, top: y - 100 });
    const ref = useRef(null);

    useEffect(() => {
        if (ref.current) {
            const { innerWidth, innerHeight } = window;
            const { offsetWidth, offsetHeight } = ref.current;
            let left = x + 20;
            let top = y - offsetHeight / 2;

            if (left + offsetWidth > innerWidth) left = x - offsetWidth - 20;
            if (top + offsetHeight > innerHeight) top = innerHeight - offsetHeight - 20;
            if (top < 20) top = 20;

            setPos({ left, top });
        }
    }, [x, y, snippet]);

    return createPortal(
        <div 
            ref={ref}
            style={{ left: pos.left, top: pos.top }}
            className="fixed z-[999] w-[480px] rounded-xl border border-border/40 bg-popover/98 backdrop-blur-3xl shadow-2xl p-4 flex flex-col gap-3 ring-1 ring-border/10"
        >
            {/* Code Context Section */}
            <div className="flex flex-col gap-2">
                <header className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1 rounded-md bg-primary/10 text-primary">
                            <FileCode size={13} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest text-foreground/80">Code Reference</span>
                            <span className="text-[9px] font-mono text-muted-foreground/40">{fileName}</span>
                        </div>
                    </div>
                    {loading && <RefreshCw size={12} className="animate-spin text-primary/40" />}
                </header>

                <div className="rounded-lg bg-background/40 border border-border/10 overflow-hidden">
                    {snippet ? (
                        <div className="py-1.5 flex flex-col">
                            {snippet.map((l, i) => (
                                <div key={i} className={`flex items-center gap-3 px-3 h-5 text-[10px] ${l.isTarget ? 'bg-primary/10 border-y border-primary/5' : ''}`}>
                                    <span className={`w-8 text-right font-mono text-[9px] shrink-0 tabular-nums ${l.isTarget ? 'text-primary font-bold' : 'text-muted-foreground/30'}`}>{l.line}</span>
                                    <pre className={`truncate font-mono ${l.isTarget ? 'text-foreground font-semibold' : 'text-muted-foreground/40'}`}>{l.content || ' '}</pre>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-24 flex items-center justify-center italic text-[10px] text-muted-foreground/20 uppercase tracking-widest">
                          {loading ? 'Retrieving Matrix…' : 'Snippet Unavailable'}
                        </div>
                    )}
                </div>
            </div>

            <div className="h-px w-full bg-border/10" />

            {/* Comment Preview Section */}
            <div className="flex flex-col gap-1.5 relative">
                <div className="absolute -left-2 top-0 bottom-0 w-1 bg-primary/20 rounded-full" />
                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-primary/60 mb-0.5">
                    <Quote size={10} fill="currentColor" />
                    Annotation Detail
                </div>
                <p className="text-[11px] leading-relaxed text-foreground/80 italic font-serif pl-2">
                    "{commentBody}"
                </p>
            </div>
        </div>,
        document.body
    );
}

export function PromoteModal({
  open,
  loading,
  error,
  description,
  items,
  selectedIds,
  previewById,
  promoteStep,
  promoteDraft,
  promoteActionSheet,
  promoteGateStatus,
  promoteExecutionStatus,
  promoteSessionId,
  sessions,
  sessionActivityByKey,
  selectedCellId,
  onChangeDescription,
  onToggleItem,
  onToggleGroup,
  onPreviewItem,
  onSelectSession,
  onCreateSession,
  onFocusSession,
  onClose,
  onDispatch,
  onConfirm,
  onDispatchActionSheet,
  onCancelActionSheet,
  onArchiveActionSheet,
  onDeleteActionSheet,
  onOpenActionSheets,
}) {
  if (!open) {
    return null;
  }
  const isWaiting = promoteStep === 'waiting';
  const gateStatus = isWaiting ? promoteGateStatus : 'idle';
  const gateReady = gateStatus === 'ready';
  const gateMissing = gateStatus === 'missing';
  const executionStatus = promoteExecutionStatus || (isWaiting ? 'waiting' : 'idle');
  const availableSessions = sessions.filter((session) => session.status !== 'closed');
  const activeSession = availableSessions.find((session) => session.id === promoteSessionId) || null;
  const activityKey = selectedCellId && promoteSessionId ? `${selectedCellId}:${promoteSessionId}` : '';
  const lastActivity = activityKey ? sessionActivityByKey[activityKey] : null;
  const lastActivityLabel = lastActivity
    ? new Date(lastActivity).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    : 'idle';
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const promoteTree = useMemo(() => buildPromoteTree(items), [items]);

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-2xl border border-border/20 bg-card p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[12px] font-semibold text-foreground">Promote Items</div>
            <div className="text-[10px] text-muted-foreground/60">
              Convert selected items into a draft and wait for completion.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close promote dialog"
            className="rounded-md p-1 text-muted-foreground/50 hover:text-foreground hover:bg-muted/10 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-[1.3fr_1fr] gap-4">
          <div className="space-y-3">
            <textarea
              value={description}
              onChange={(event) => onChangeDescription?.(event.target.value)}
              rows={4}
              disabled={isWaiting}
              name="promote-description"
              autoComplete="off"
              aria-label="Draft description"
              className="w-full resize-none rounded-lg border border-border/20 bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/30 focus:border-primary/30 focus:ring-1 focus:ring-primary/10 focus:outline-none transition-colors disabled:opacity-60"
              placeholder="Describe the draft you want to create from selected items…"
            />

            <div className="rounded-xl border border-border/10 bg-muted/5 px-3 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
                Agent Session
              </div>
              <div className="mt-2 flex items-center gap-2">
                <select
                  value={promoteSessionId}
                  onChange={(event) => onSelectSession?.(event.target.value)}
                  disabled={isWaiting}
                  className="flex-1 rounded-md border border-border/20 bg-background px-2 py-1.5 text-[11px] text-foreground focus:border-primary/40 focus:outline-none disabled:opacity-60"
                >
                  <option value="">Select session…</option>
                  {availableSessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.name || session.id} · {session.status}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={onCreateSession}
                  disabled={isWaiting}
                  className="rounded-md border border-border/20 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:opacity-60"
                >
                  New
                </button>
                <button
                  type="button"
                  onClick={onFocusSession}
                  disabled={!activeSession}
                  className="rounded-md border border-border/20 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:opacity-40"
                >
                  View
                </button>
              </div>
              <div className="mt-2 text-[10px] text-muted-foreground/50">
                {activeSession
                  ? `Using ${activeSession.name || activeSession.id} · ${activeSession.status} · last active ${lastActivityLabel}`
                  : 'No session selected yet.'}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-border/10 bg-muted/5 px-3 py-3">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
                  Draft Gate
                </div>
                <PromoteGateBadge status={gateStatus} />
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground/70 leading-relaxed">
                {!isWaiting
                  ? 'Dispatch promote to create a draft and begin the gate.'
                  : gateReady && promoteDraft
                    ? 'Draft marked complete. You can confirm and consume items.'
                    : gateMissing
                      ? 'Draft not found. Ensure the draft exists in .agency/hil.'
                      : 'Waiting for the agent to complete the draft and mark it promoted.'}
              </div>
              {promoteDraft ? (
                <div className="mt-2 text-[10px] text-muted-foreground/50">
                  Draft ID: <span className="font-mono">{promoteDraft.id}</span>
                </div>
              ) : null}

              <div className="mt-3 flex items-center justify-between">
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
                  Execution
                </div>
                <ExecutionStatusBadge status={executionStatus} />
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground/70 leading-relaxed">
              {executionStatus === 'running'
                ? 'Dispatch sent. Track progress in the selected session.'
                : executionStatus === 'complete'
                  ? 'Execution completed. Awaiting final confirm.'
                  : executionStatus === 'failed'
                    ? 'Execution failed. Retry by re-dispatching promote.'
                    : executionStatus === 'queued'
                      ? 'Queued for dispatch.'
                      : executionStatus === 'canceled'
                        ? 'Execution canceled. Restart to retry.'
                        : executionStatus === 'missing'
                          ? 'Draft metadata missing. Refresh and retry.'
                          : 'Execution status idle.'}
              </div>
            </div>

            {promoteActionSheet ? (
              <ActionSheetStatusPanel
                sheet={promoteActionSheet}
                sessions={availableSessions}
                sessionId={promoteSessionId}
                onDispatchSheet={onDispatchActionSheet}
                onCancelSheet={onCancelActionSheet}
                onArchiveSheet={onArchiveActionSheet}
                onDeleteSheet={onDeleteActionSheet}
                onViewSession={onFocusSession}
                onOpenPanel={onOpenActionSheets}
                compact
                showSessionSelect={false}
              />
            ) : null}
          </div>
        </div>

        <div className="mt-4 max-h-64 overflow-y-auto custom-scrollbar pr-1 space-y-3">
          {items.length === 0 ? (
            <div className="text-[11px] text-muted-foreground/40 py-6 text-center italic">
              No pending items.
            </div>
          ) : (
            promoteTree.map((typeGroup) => {
              const typeIds = typeGroup.items.map((item) => item.id);
              const typeState = resolveSelectionState(typeIds, selectedSet);
              const TypeIcon = typeGroup.icon;
              return (
                <div key={typeGroup.id} className="rounded-xl border border-border/10 bg-muted/5 px-3 py-2">
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-foreground/80">
                    <TreeCheckbox
                      state={typeState}
                      disabled={isWaiting}
                      onChange={() => onToggleGroup?.(typeIds)}
                    />
                    <TypeIcon size={13} className="text-primary/60" />
                    <span className="uppercase tracking-[0.2em] text-[9px] text-muted-foreground/50">
                      {typeGroup.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground/40">({typeIds.length})</span>
                  </div>
                  <div className="mt-2 space-y-2 pl-5">
                    {typeGroup.sources.map((sourceGroup) => {
                      const sourceIds = sourceGroup.items.map((item) => item.id);
                      const sourceState = resolveSelectionState(sourceIds, selectedSet);
                      return (
                        <div key={sourceGroup.id} className="rounded-lg border border-border/10 bg-background/60 px-2.5 py-2">
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
                            <TreeCheckbox
                              state={sourceState}
                              disabled={isWaiting}
                              onChange={() => onToggleGroup?.(sourceIds)}
                            />
                            <span className="font-mono truncate">{sourceGroup.label}</span>
                            <span className="ml-auto text-[9px] text-muted-foreground/40">
                              {sourceIds.length}
                            </span>
                          </div>
                          <div className="mt-2 space-y-2">
                            {sourceGroup.items.map((item) => {
                              const checked = selectedSet.has(item.id);
                              const preview = previewById[item.id];
                              return (
                                <div
                                  key={item.id}
                                  className="rounded-md border border-border/10 bg-muted/5 px-3 py-2 transition-colors hover:bg-muted/10 group/item select-none"
                                  onMouseEnter={() => onPreviewItem?.(item)}
                                >
                                  <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => onToggleItem?.(item.id)}
                                      disabled={isWaiting}
                                      className="mt-0.5 h-3.5 w-3.5 rounded border-border/60 bg-transparent text-primary focus:ring-offset-0 focus:ring-1 focus:ring-primary/20 transition-colors disabled:opacity-60"
                                    />
                                    <div className="flex flex-1 flex-col gap-1 min-w-0">
                                      <div className="flex items-center justify-between">
                                        <span className="font-semibold text-foreground/80 truncate mr-2 text-[11px]">
                                          {item.body || item.message}
                                        </span>
                                        {item.anchor?.line ? (
                                          <span className="text-[10px] text-muted-foreground/40 tabular-nums shrink-0 font-medium">
                                            Ln {item.anchor?.line || 1}
                                          </span>
                                        ) : null}
                                      </div>
                                      {preview ? (
                                        preview.error ? (
                                          <div className="mt-1 text-[10px] text-rose-400 opacity-80">{preview.error}</div>
                                        ) : (
                                          <div className="mt-1 rounded border border-border/10 bg-background/60 px-2 py-1.5 font-mono text-[10px] text-muted-foreground/60 overflow-hidden">
                                            {preview.snippet?.map((line) => (
                                              <div key={`${item.id}-${line.line}`} className="flex gap-3">
                                                <span className="w-7 text-right opacity-30 select-none tabular-nums shrink-0">
                                                  {line.line}
                                                </span>
                                                <span className="truncate">{line.text || ' '}</span>
                                              </div>
                                            ))}
                                          </div>
                                        )
                                      ) : (
                                        <div className="mt-1 text-[10px] text-muted-foreground/30 italic group-hover/item:text-muted-foreground/50 transition-colors">
                                          Hover to preview context.
                                        </div>
                                      )}
                                    </div>
                                  </label>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {error ? (
          <div role="status" aria-live="polite" className="mt-3 text-[11px] font-medium text-rose-400 bg-rose-500/5 p-2 rounded border border-rose-500/10">
            {error}
          </div>
        ) : null}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/10 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background"
          >
            Cancel
          </button>
          {isWaiting ? (
            <button
              type="button"
              onClick={onConfirm}
              disabled={!gateReady || loading}
              className="rounded-md bg-primary hover:bg-primary/90 px-4 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-sm transition-colors transition-transform active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background"
            >
              {loading ? 'Confirming…' : 'Confirm Draft'}
            </button>
          ) : (
            <button
              type="button"
              onClick={onDispatch}
              disabled={loading}
              className="rounded-md bg-primary hover:bg-primary/90 px-4 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-sm transition-colors transition-transform active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background"
            >
              {loading ? 'Dispatching…' : 'Dispatch Promote'}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function PromoteGateBadge({ status }) {
  const label =
    status === 'ready'
      ? 'Ready'
      : status === 'missing'
        ? 'Missing'
        : status === 'idle'
          ? 'Idle'
          : 'Waiting';
  const styles =
    status === 'ready'
      ? 'border-emerald-500/30 text-emerald-400'
      : status === 'missing'
        ? 'border-rose-500/30 text-rose-400'
        : status === 'idle'
          ? 'border-border/40 text-muted-foreground/60'
          : 'border-amber-500/30 text-amber-400';
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] ${styles}`}>
      {label}
    </span>
  );
}

function ExecutionStatusBadge({ status }) {
  const label =
    status === 'running'
      ? 'Running'
      : status === 'complete'
        ? 'Complete'
        : status === 'failed'
          ? 'Failed'
          : status === 'queued'
            ? 'Queued'
            : status === 'canceled'
              ? 'Canceled'
            : status === 'missing'
              ? 'Missing'
              : 'Idle';
  const styles =
    status === 'complete'
      ? 'border-emerald-500/30 text-emerald-400'
      : status === 'running'
        ? 'border-sky-500/30 text-sky-400'
        : status === 'failed'
          ? 'border-rose-500/30 text-rose-400'
          : status === 'queued'
            ? 'border-amber-500/30 text-amber-400'
            : status === 'missing'
              ? 'border-rose-500/30 text-rose-400'
              : status === 'canceled'
                ? 'border-border/40 text-muted-foreground/50'
                : 'border-border/40 text-muted-foreground/60';
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] ${styles}`}>
      {label}
    </span>
  );
}

function buildPromoteTree(items = []) {
  const typeMap = new Map();
  items.forEach((item) => {
    if (!item?.id) {
      return;
    }
    const typeMeta = resolvePromoteType(item);
    if (!typeMap.has(typeMeta.id)) {
      typeMap.set(typeMeta.id, { ...typeMeta, sources: new Map(), items: [] });
    }
    const typeGroup = typeMap.get(typeMeta.id);
    typeGroup.items.push(item);
    const sourceMeta = resolvePromoteSource(item);
    if (!typeGroup.sources.has(sourceMeta.id)) {
      typeGroup.sources.set(sourceMeta.id, { ...sourceMeta, items: [] });
    }
    typeGroup.sources.get(sourceMeta.id).items.push(item);
  });
  return Array.from(typeMap.values()).map((typeGroup) => ({
    ...typeGroup,
    sources: Array.from(typeGroup.sources.values()),
  }));
}

function resolveSelectionState(ids, selectedSet) {
  if (!ids.length) {
    return 'none';
  }
  let selectedCount = 0;
  ids.forEach((id) => {
    if (selectedSet.has(id)) {
      selectedCount += 1;
    }
  });
  if (selectedCount === 0) {
    return 'none';
  }
  if (selectedCount === ids.length) {
    return 'all';
  }
  return 'partial';
}

function TreeCheckbox({ state, disabled, onChange }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = state === 'partial';
    }
  }, [state]);
  return (
    <input
      ref={ref}
      type="checkbox"
      disabled={disabled}
      checked={state === 'all'}
      onChange={onChange}
      className="h-3.5 w-3.5 rounded border-border/60 bg-transparent text-primary focus:ring-offset-0 focus:ring-1 focus:ring-primary/20 transition-colors disabled:opacity-60"
    />
  );
}
