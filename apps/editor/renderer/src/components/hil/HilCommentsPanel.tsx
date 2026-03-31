import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  CheckCircle2, 
  Hash, 
  Terminal, 
  StickyNote, 
  Layers, 
  Quote,
  FileCode,
  MessageSquarePlus,
  RefreshCw,
  X
} from 'lucide-react';
import { IconButton } from '../ui/IconButton';
import { focusRing } from '../ui/focusRing';
import { resolveFileReferenceTarget } from '../../utils/fileReferences';
import { setFileDragPayload } from '../../utils/fileDragPayload';
import { useFileSnippetPreview } from '../../hooks/useFileSnippetPreview';
import {
  HIL_SURFACE_COPY,
  HilStatusBadge,
  HilSurfaceHeader,
  HilSurfaceSection,
} from './hilSurfaceSystem';

const kindIcons = {
    comment: Terminal,
    memo: StickyNote,
    draft: Layers
};

const focusRingClass = focusRing.default;

export function HilCommentsPanel({
  activeFile,
  cursorPosition,
  comments = [],
  loading,
  error,
  onOpenAnchor,
  onRevealAnchor,
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
  worktreePath,
}: any) {
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
    <div className="flex flex-col gap-3 py-1 select-none">
      <HilSurfaceHeader
        eyebrow={HIL_SURFACE_COPY.commentsSubtitle}
        title={HIL_SURFACE_COPY.commentsTitle}
        subtitle={
          activeFile
            ? `Review notes for ${activeFile}`
            : 'Review file-linked notes and route them into draft work.'
        }
        meta={
          <>
            <HilStatusBadge label={`${pendingCount} open`} tone="active" />
            <HilStatusBadge label={`${processedCount} done`} tone="success" />
            {activeFile ? <HilStatusBadge label={`Ln ${resolvedLine}`} tone="neutral" /> : null}
          </>
        }
        actions={
          activeFile ? (
            <button
              type="button"
              onClick={() =>
                onOpenComment?.({
                  line: cursorPosition?.line || 1,
                  column: cursorPosition?.column || 1,
                })
              }
              className={`inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary transition-colors hover:border-primary/45 hover:bg-primary/14 ${focusRingClass}`}
            >
              <MessageSquarePlus size={12} strokeWidth={1.8} aria-hidden="true" />
              New Comment
            </button>
          ) : null
        }
      />

      {commentModalOpen ? (
        <HilSurfaceSection
          eyebrow="Compose"
          title="New Comment"
          description="Capture the current line context first, then write the note you want to keep."
          actions={
            <IconButton
              label="Close comment editor"
              onClick={onCloseComment}
              className="rounded-md p-0.5 text-muted-foreground/50 hover:text-foreground hover:bg-muted/10 transition-colors"
            >
              <X size={13} aria-hidden="true" />
            </IconButton>
          }
          tone="active"
        >
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2 px-0.5">
              {activeFile ? <HilStatusBadge label={activeFile} tone="neutral" /> : null}
              <HilStatusBadge label={`Ln ${resolvedLine}`} tone="active" />
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
                <div className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2 font-mono text-[10px] text-muted-foreground/68 overflow-hidden shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)]">
                {snippetLines.map((line) => (
                    <div
                    key={`${line.line}-${line.isTarget ? 't' : 'n'}`}
                    className={`flex gap-3 min-h-[18px] items-center ${line.isTarget ? 'bg-primary/7 text-primary -mx-3 px-3 font-medium' : ''}`}
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
              className="mt-1 w-full resize-none rounded-xl border border-white/[0.08] bg-background/80 px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground/30 focus:border-primary/30 focus:ring-1 focus:ring-primary/10 focus:outline-none transition-colors"
              placeholder="Write the note you want the future draft to preserve…"
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
                className={`rounded-md px-2.5 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/10 transition-colors ${focusRingClass}`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSubmitComment}
                disabled={commentSaving}
                className={`rounded-full bg-primary hover:bg-primary/90 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary-foreground shadow-sm transition-colors transition-transform active:scale-95 disabled:opacity-50 disabled:pointer-events-none ${focusRingClass}`}
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
        </HilSurfaceSection>
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
        <div className="flex flex-col gap-3">
        {comments.map((comment, i) => (
          <CommentItem 
            key={comment.id || i} 
            comment={comment} 
            onUpdateStatus={onUpdateStatus}
            worktreePath={worktreePath}
            onOpenAnchor={onOpenAnchor}
            onRevealAnchor={onRevealAnchor}
          />
        ))}
        </div>
      ) : (
        <div className="py-16 flex flex-col items-center justify-center opacity-20 text-muted-foreground/40">
            <Hash size={32} strokeWidth={1} />
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] mt-2">No comments yet</p>
        </div>
      )}
    </div>
  );
}

function CommentItem({ comment, onUpdateStatus, worktreePath, onOpenAnchor, onRevealAnchor }: any) {
    const isResolved = comment.status === 'resolved';
    const isProcessed = Boolean(comment.processed);
    const kindLabel = (comment.kind || 'comment').toUpperCase();
    const Icon = kindIcons[comment.kind] || Terminal;
    
    return (
        <div className={`group relative flex flex-col rounded-2xl border border-white/[0.06] bg-[linear-gradient(180deg,rgba(28,33,42,0.68),rgba(16,19,24,0.9))] px-3 py-3 transition-colors duration-300 ${isResolved ? 'opacity-55 grayscale' : 'hover:border-primary/18 hover:bg-[linear-gradient(180deg,rgba(30,36,46,0.76),rgba(17,21,27,0.92))]'}`}>
            {comment.anchor && (
                <ContextAnchor 
                    anchor={comment.anchor} 
                    commentBody={comment.body || comment.message} 
                    worktreePath={worktreePath}
                    isResolved={isResolved}
                    onOpenAnchor={onOpenAnchor}
                    onRevealAnchor={onRevealAnchor}
                />
            )}

            <div className="pt-1">
                <header className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-white/[0.08] bg-background/40 text-primary/80">
                        <Icon size={11} strokeWidth={2.2} aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold text-foreground/86 tracking-[0.01em] truncate">
                          {comment.author?.label || 'Agent'}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2">
                          <HilStatusBadge label={kindLabel} tone="neutral" className="px-2 py-0.5" />
                          {isProcessed ? (
                            <HilStatusBadge label="Done" tone="success" className="px-2 py-0.5" />
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <span className="text-[9px] font-medium text-muted-foreground/34 uppercase tabular-nums">
                        {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </span>
                </header>

                <div className="text-[12px] leading-relaxed text-muted-foreground/86 break-words mb-2 selection:bg-primary/30">
                    {comment.body || comment.message}
                </div>

                <footer className="flex items-center justify-end opacity-0 translate-y-1 transition-opacity transition-transform group-hover:opacity-100 group-hover:translate-y-0 h-5">
                    <button
                        type="button"
                        onClick={() => onUpdateStatus?.(comment, isResolved ? 'open' : 'resolved')}
                        aria-label={isResolved ? 'Reopen comment' : 'Resolve comment'}
                        className={`flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-emerald-300/88 hover:border-emerald-400/40 hover:text-emerald-200 transition-colors ${focusRingClass} focus-visible:ring-emerald-400/50`}
                    >
                        <CheckCircle2 size={9} aria-hidden="true" />
                        {isResolved ? 'Reopen' : 'Resolve'}
                    </button>
                </footer>
            </div>
        </div>
    );
}

function ContextAnchor({ anchor, commentBody, worktreePath, isResolved, onOpenAnchor, onRevealAnchor }: any) {
    const [showTooltip, setShowTooltip] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const {
      preview: snippetPreviewState,
      loadPreview: loadSnippetPreview,
      clearPreview: clearSnippetPreview,
    } = useFileSnippetPreview({ defaultContext: 3, emptyMessage: '' });
    const snippet = snippetPreviewState?.snippet?.length ? snippetPreviewState.snippet : null;
    const loading = Boolean(snippetPreviewState?.loading);
    const resolvedReference = useMemo(
        () => resolveFileReferenceTarget({ path: anchor?.file, rootPath: worktreePath }),
        [anchor?.file, worktreePath]
    );

    useEffect(() => {
        clearSnippetPreview();
    }, [anchor?.file, anchor?.line, clearSnippetPreview, worktreePath]);

    useEffect(() => {
        if (!showTooltip || snippetPreviewState || !worktreePath || !anchor?.file) {
            return;
        }
        loadSnippetPreview({
            rootPath: worktreePath,
            targetPath: anchor.file,
            relativePath: anchor.file,
            line: anchor.line,
            context: 3,
        });
    }, [anchor?.file, anchor?.line, loadSnippetPreview, showTooltip, snippetPreviewState, worktreePath]);

    const handleOpen = () => {
        if (!anchor?.file) {
            return;
        }
        onOpenAnchor?.({
            path: anchor.file,
            line: anchor.line,
            column: anchor.column,
        });
    };

    const handleReveal = (event) => {
        event.stopPropagation();
        if (!anchor?.file) {
            return;
        }
        onRevealAnchor?.({ path: anchor.file });
    };

    const handleDragStart = (event) => {
        const success = setFileDragPayload(event, resolvedReference?.absolutePath || '');
        if (!success) {
            event.preventDefault();
        }
    };

    return (
        <div 
            role="button"
            tabIndex={0}
            className="flex items-center gap-2 mb-1.5 cursor-pointer"
            onClick={handleOpen}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleOpen();
                }
            }}
            onMouseEnter={(e) => { setMousePos({ x: e.clientX, y: e.clientY }); setShowTooltip(true); }}
            onMouseLeave={() => setShowTooltip(false)}
            draggable={Boolean(resolvedReference?.absolutePath)}
            onDragStart={handleDragStart}
        >
            <HilStatusBadge
              label={`Ln ${anchor.line}`}
              tone={isResolved ? 'neutral' : 'active'}
              className="px-2 py-0.5"
            />
            <span className="text-[10px] text-muted-foreground/46 font-mono italic truncate max-w-[180px]">
                {anchor.file}
            </span>
            <div className={`h-px flex-1 bg-gradient-to-r ${isResolved ? 'from-muted-foreground/10' : 'from-primary/10'} to-transparent`} />
            {onRevealAnchor ? (
              <button
                type="button"
                onClick={handleReveal}
                className="rounded-full border border-border/30 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70 hover:border-primary/50 hover:text-primary"
              >
                Reveal
              </button>
            ) : null}
            
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

function ContextTooltip({ x, y, snippet, loading, commentBody, fileName }: any) {
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
