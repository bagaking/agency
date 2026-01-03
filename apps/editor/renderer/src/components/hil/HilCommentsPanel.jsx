import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  CheckCircle2, 
  Hash, 
  Terminal, 
  StickyNote, 
  Layers, 
  Target, 
  Quote,
  FileCode,
  MessageSquarePlus,
  RefreshCw,
  X
} from 'lucide-react';

const kindIcons = {
    comment: Terminal,
    memo: StickyNote,
    draft: Layers
};

export function HilCommentsPanel({
  activeFile,
  cursorPosition,
  comments = [],
  loading,
  error,
  onOpenComment,
  onPromoteComment,
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
  onOpenBulkPromote,
  bulkPromoteOpen,
  bulkPromoteDescription,
  bulkPromoteError,
  bulkPromoteLoading,
  bulkPromoteItems = [],
  bulkPromoteSelectedIds = [],
  bulkPromotePreviewById = {},
  onBulkPromoteDescriptionChange,
  onBulkPromoteToggleItem,
  onBulkPromotePreview,
  onCloseBulkPromote,
  onSubmitBulkPromote,
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
    <div className="flex flex-col gap-3 py-2 select-none">
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2 text-muted-foreground/50">
          <span className="text-[10px] font-black uppercase tracking-[0.25em]">
            {fileLabel || 'HIL Comments'}
          </span>
          <span className="text-[9px] uppercase tracking-widest opacity-40">
            {pendingCount} open · {processedCount} processed
          </span>
        </div>
        <div className="flex items-center gap-1">
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
              className="flex h-7 w-7 items-center justify-center rounded-full bg-muted/10 border border-border/10 text-muted-foreground/60 hover:text-foreground transition-all hover:bg-muted/20 active:scale-95"
            >
              <MessageSquarePlus size={12} />
            </button>
          ) : null}
          <button
            type="button"
            aria-label="Promote comments"
            title="Promote comments"
            onClick={() => (bulkPromoteOpen ? onCloseBulkPromote?.() : onOpenBulkPromote?.())}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-muted/10 border border-border/10 text-muted-foreground/60 hover:text-foreground transition-all hover:bg-muted/20 active:scale-95"
          >
            <Target size={12} />
          </button>
        </div>
      </div>

      {commentModalOpen ? (
        <div className="rounded-2xl border border-border/40 bg-card p-4 shadow-2xl overflow-hidden relative">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.1em] text-foreground/80">
              <MessageSquarePlus size={12} className="text-primary" />
              Add Comment
            </div>
            <button
              type="button"
              onClick={onCloseComment}
              className="rounded-full p-1 text-muted-foreground/40 hover:text-foreground hover:bg-muted/10 transition-all"
            >
              <X size={12} />
            </button>
          </div>
          
          <div className="flex flex-col gap-2">
            <div className="text-[9px] text-muted-foreground/40 uppercase tracking-[0.2em] px-1">
                {activeFile ? `${activeFile} · Ln ${resolvedLine}` : `Ln ${resolvedLine}`}
            </div>

            {commentSnippetLoading ? (
                <div className="px-1 py-4 flex items-center gap-2 text-[10px] text-muted-foreground/30 italic">
                    <RefreshCw size={10} className="animate-spin" /> Retrieving context...
                </div>
            ) : commentSnippetError ? (
                <div className="mx-1 mt-1 text-[9px] text-rose-400/80 bg-rose-500/5 px-2 py-1 rounded border border-rose-500/10">
                    {commentSnippetError}
                </div>
            ) : targetLineContent ? (
                <div className="rounded-xl border border-border/20 bg-muted/5 px-3 py-2 text-[10px] text-muted-foreground">
                    <span className="opacity-30 mr-2 font-mono">Ln {resolvedLine}</span>
                    <span className="font-mono text-foreground/80">{targetLineContent}</span>
                </div>
            ) : null}

            {snippetLines?.length ? (
                <div className="rounded-xl border border-border/10 bg-muted/5 px-3 py-2 font-mono text-[9px] text-muted-foreground/40 overflow-hidden">
                {snippetLines.map((line) => (
                    <div
                    key={`${line.line}-${line.isTarget ? 't' : 'n'}`}
                    className={`flex gap-3 h-4 items-center ${line.isTarget ? 'bg-primary/5 text-primary -mx-3 px-3' : ''}`}
                    >
                    <span className="w-6 text-right opacity-20 tabular-nums">{line.line}</span>
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
            rows={4}
            className="mt-4 w-full resize-none rounded-xl border border-border/20 bg-background/50 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/20 focus:border-primary/40 focus:outline-none transition-all"
            placeholder="Write a note to capture context or questions..."
          />

          <div className="mt-4 flex items-center justify-between">
            <label className="flex items-center gap-2 text-[10px] text-muted-foreground/60 cursor-pointer group/todo">
              <input
                type="checkbox"
                checked={Boolean(commentTodo)}
                onChange={(event) => onCommentTodoChange?.(event.target.checked)}
                className="h-3 w-3 rounded border-border bg-transparent text-primary focus:ring-primary/20"
              />
              <span className="group-hover/todo:text-foreground transition-colors">Mark as TODO</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onCloseComment}
                className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 hover:text-foreground transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSubmitComment}
                disabled={commentSaving}
                className="rounded-full bg-primary/80 hover:bg-primary px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
              >
                {commentSaving ? 'Saving...' : 'Submit'}
              </button>
            </div>
          </div>
          {commentError ? (
            <div className="mt-3 text-[10px] font-semibold text-rose-400 bg-rose-500/5 p-2 rounded-lg border border-rose-500/10">
                {commentError}
            </div>
          ) : null}
        </div>
      ) : null}

      {bulkPromoteOpen ? (
        <BulkPromotePanel
          loading={bulkPromoteLoading}
          error={bulkPromoteError}
          description={bulkPromoteDescription}
          items={bulkPromoteItems}
          selectedIds={bulkPromoteSelectedIds}
          previewById={bulkPromotePreviewById}
          onChangeDescription={onBulkPromoteDescriptionChange}
          onToggleItem={onBulkPromoteToggleItem}
          onPreviewItem={onBulkPromotePreview}
          onClose={onCloseBulkPromote}
          onSubmit={onSubmitBulkPromote}
        />
      ) : null}

      {error ? (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-[10px] text-rose-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground/50">
          <RefreshCw size={12} className="animate-spin" />
          Loading comments...
        </div>
      ) : comments && comments.length > 0 ? (
        comments.map((comment, i) => (
          <CommentItem 
            key={comment.id || i} 
            comment={comment} 
            onUpdateStatus={onUpdateStatus}
            onPromote={onPromoteComment}
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

function CommentItem({ comment, onUpdateStatus, onPromote, worktreePath }) {
    const isResolved = comment.status === 'resolved';
    const isProcessed = Boolean(comment.processed);
    const kindLabel = (comment.kind || 'comment').toUpperCase();
    const Icon = kindIcons[comment.kind] || Terminal;
    
    return (
        <div className={`group relative flex flex-col rounded-xl transition-all duration-300 ${isResolved ? 'opacity-40 grayscale' : 'hover:bg-muted/5'}`}>
            {/* Type Indicator with Tooltip */}
            <div className="absolute -left-2 -top-2 z-10">
                <div 
                    title={`Type: ${kindLabel}`}
                    className={`flex h-5 w-5 items-center justify-center rounded-md border shadow-xl transition-all ${
                        isResolved ? 'bg-muted border-border text-muted-foreground' : 'bg-popover border-border/40 text-primary'
                    }`}
                >
                    <Icon size={10} strokeWidth={2.5} />
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

            <div className="px-3 pb-3">
                <header className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-foreground/80 tracking-tight uppercase">
                          {comment.author?.label || 'Agent'}
                      </span>
                      {isProcessed ? (
                        <span className="rounded-full border border-emerald-500/30 px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest text-emerald-400/70">
                          Processed
                        </span>
                      ) : null}
                    </div>
                    <span className="text-[9px] font-medium text-muted-foreground/30 uppercase tabular-nums">
                        {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </span>
                </header>

                <div className="text-[11px] leading-relaxed text-muted-foreground break-words mb-3 selection:bg-primary/30">
                    {comment.body || comment.message}
                </div>

                <footer className="flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0">
                    <button 
                        onClick={() => onPromote?.(comment)}
                        disabled={isProcessed}
                        className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40 hover:text-primary transition-all disabled:opacity-40"
                    >
                        <Target size={12} />
                        Promote
                    </button>
                    <button 
                        onClick={() => onUpdateStatus?.(comment, isResolved ? 'open' : 'resolved')}
                        className="flex items-center gap-1 text-[9px] font-bold text-emerald-500/60 hover:text-emerald-400 transition-all"
                    >
                        <CheckCircle2 size={12} />
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
            className="flex items-center gap-2 mb-2 px-1 cursor-help"
            onMouseEnter={(e) => { setMousePos({ x: e.clientX, y: e.clientY }); setShowTooltip(true); }}
            onMouseLeave={() => setShowTooltip(false)}
        >
            <div className={`h-1.5 w-1.5 rounded-full ${isResolved ? 'bg-muted-foreground/20' : 'bg-primary shadow-[0_0_8px_rgba(59,130,246,0.5)]'}`} />
            <span className={`text-[10px] font-black uppercase tracking-tighter ${isResolved ? 'text-muted-foreground/40' : 'text-primary'}`}>
                Ln {anchor.line}
            </span>
            <span className="text-[10px] text-muted-foreground/30 font-mono italic truncate max-w-[180px]">
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
            className="fixed z-[999] w-[480px] rounded-2xl border border-border/40 bg-popover/98 backdrop-blur-3xl shadow-2xl p-5 flex flex-col gap-5 ring-1 ring-border/10"
        >
            {/* Code Context Section */}
            <div className="flex flex-col gap-3">
                <header className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                            <FileCode size={14} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest text-foreground/80">Code Reference</span>
                            <span className="text-[9px] font-mono text-muted-foreground/40">{fileName}</span>
                        </div>
                    </div>
                    {loading && <RefreshCw size={12} className="animate-spin text-primary/40" />}
                </header>

                <div className="rounded-xl bg-background/40 border border-border/10 overflow-hidden">
                    {snippet ? (
                        <div className="py-2 flex flex-col">
                            {snippet.map((l, i) => (
                                <div key={i} className={`flex items-center gap-4 px-4 h-6 text-[11px] ${l.isTarget ? 'bg-primary/10 border-y border-primary/5' : ''}`}>
                                    <span className={`w-8 text-right font-mono text-[9px] shrink-0 ${l.isTarget ? 'text-primary font-bold' : 'text-muted-foreground/30'}`}>{l.line}</span>
                                    <pre className={`truncate font-mono ${l.isTarget ? 'text-foreground font-semibold' : 'text-muted-foreground/40'}`}>{l.content || ' '}</pre>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-32 flex items-center justify-center italic text-[10px] text-muted-foreground/20 uppercase tracking-widest">
                            {loading ? 'Retrieving Matrix...' : 'Snippet Unavailable'}
                        </div>
                    )}
                </div>
            </div>

            <div className="h-px w-full bg-border/10" />

            {/* Comment Preview Section */}
            <div className="flex flex-col gap-2 relative">
                <div className="absolute -left-2 top-0 bottom-0 w-1 bg-primary/20 rounded-full" />
                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-primary/60 mb-1">
                    <Quote size={10} fill="currentColor" />
                    Annotation Detail
                </div>
                <p className="text-xs leading-relaxed text-foreground/80 italic font-serif pl-2">
                    "{commentBody}"
                </p>
            </div>
        </div>,
        document.body
    );
}

function BulkPromotePanel({
  loading,
  error,
  description,
  items,
  selectedIds,
  previewById,
  onChangeDescription,
  onToggleItem,
  onPreviewItem,
  onClose,
  onSubmit,
}) {
  return (
    <div className="rounded-2xl border border-border/40 bg-card p-4 shadow-2xl overflow-hidden relative">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] font-black uppercase tracking-[0.1em] text-foreground/80">
          Promote Comments
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1 text-muted-foreground/40 hover:text-foreground hover:bg-muted/10 transition-all"
        >
          <X size={12} />
        </button>
      </div>
      <textarea
        value={description}
        onChange={(event) => onChangeDescription?.(event.target.value)}
        rows={3}
        className="w-full resize-none rounded-xl border border-border/20 bg-background/50 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/20 focus:border-primary/40 focus:outline-none transition-all"
        placeholder="Describe the draft you want to create from selected comments..."
      />
      <div className="mt-3 flex max-h-64 flex-col gap-2 overflow-y-auto custom-scrollbar pr-1">
        {items.length === 0 ? (
          <div className="text-[10px] text-muted-foreground/30 py-8 text-center italic">No pending comments.</div>
        ) : (
          items.map((item) => {
            const checked = selectedIds.includes(item.id);
            const preview = previewById[item.id];
            return (
              <div
                key={item.id}
                className="rounded-xl border border-border/10 bg-muted/5 px-3 py-2 text-[10px] text-muted-foreground transition-all hover:bg-muted/10 group/item"
                onMouseEnter={() => onPreviewItem?.(item)}
              >
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleItem?.(item.id)}
                    className="mt-1 h-3 w-3 rounded border-border bg-transparent text-primary focus:ring-primary/20"
                  />
                  <div className="flex flex-1 flex-col gap-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground/70 truncate mr-2">
                        {item.anchor?.file || 'Unknown file'}
                      </span>
                      <span className="text-[9px] text-muted-foreground/30 tabular-nums shrink-0">Ln {item.anchor?.line || 1}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground/60 line-clamp-2 leading-snug">
                      {item.body || item.message}
                    </div>
                    {preview ? (
                      preview.error ? (
                        <div className="mt-1 text-[9px] text-rose-400 opacity-60">{preview.error}</div>
                      ) : (
                        <div className="mt-1 rounded-lg border border-border/10 bg-background/40 px-2 py-1 font-mono text-[9px] text-muted-foreground/40 overflow-hidden">
                          {preview.snippet?.map((line) => (
                            <div key={`${item.id}-${line.line}`} className="flex gap-2">
                              <span className="w-6 text-right opacity-20">{line.line}</span>
                              <span className="truncate">{line.text || ' '}</span>
                            </div>
                          ))}
                        </div>
                      )
                    ) : (
                      <div className="mt-1 text-[9px] text-muted-foreground/20 italic group-hover/item:text-muted-foreground/40 transition-colors">Hover to preview context.</div>
                    )}
                  </div>
                </label>
              </div>
            );
          })
        )}
      </div>
      {error ? <div className="mt-3 text-[10px] font-semibold text-rose-400 bg-rose-500/5 p-2 rounded-lg border border-rose-500/10">{error}</div> : null}
      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 hover:text-foreground transition-all"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={loading}
          className="rounded-full bg-primary/80 hover:bg-primary px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
        >
          {loading ? 'Promoting...' : 'Create Draft'}
        </button>
      </div>
    </div>
  );
}
