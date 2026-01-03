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
              className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/70 hover:text-foreground hover:bg-muted/10 transition-all active:scale-95"
            >
              <MessageSquarePlus size={13} strokeWidth={1.5} />
            </button>
          ) : null}
          <button
            type="button"
            aria-label="Promote comments"
            title="Promote comments"
            onClick={() => (bulkPromoteOpen ? onCloseBulkPromote?.() : onOpenBulkPromote?.())}
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/70 hover:text-foreground hover:bg-muted/10 transition-all active:scale-95"
          >
            <Target size={13} strokeWidth={1.5} />
          </button>
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
              onClick={onCloseComment}
              className="rounded-md p-0.5 text-muted-foreground/50 hover:text-foreground hover:bg-muted/10 transition-all"
            >
              <X size={13} />
            </button>
          </div>
          
          <div className="flex flex-col gap-1.5">
            <div className="text-[10px] font-medium text-muted-foreground/60 px-0.5">
                {activeFile ? `${activeFile} · Ln ${resolvedLine}` : `Ln ${resolvedLine}`}
            </div>

            {commentSnippetLoading ? (
                <div className="px-1 py-2 flex items-center gap-2 text-[10px] text-muted-foreground/40 italic">
                    <RefreshCw size={10} className="animate-spin" /> Retrieving context...
                </div>
            ) : commentSnippetError ? (
                <div className="mx-0.5 mt-0.5 text-[10px] text-rose-400 bg-rose-500/5 px-2 py-1 rounded border border-rose-500/10">
                    {commentSnippetError}
                </div>
            ) : targetLineContent ? (
                <div className="rounded-md border border-border/10 bg-muted/5 px-2.5 py-1.5 text-xs text-foreground/90 font-mono">
                    <span className="opacity-30 mr-3 select-none text-[10px]">{resolvedLine}</span>
                    <span>{targetLineContent}</span>
                </div>
            ) : null}

            {snippetLines?.length ? (
                <div className="rounded-md border border-border/10 bg-muted/5 px-2.5 py-1.5 font-mono text-[10px] text-muted-foreground/60 overflow-hidden">
                {snippetLines.map((line) => (
                    <div
                    key={`${line.line}-${line.isTarget ? 't' : 'n'}`}
                    className={`flex gap-3 h-4 items-center ${line.isTarget ? 'bg-primary/5 text-primary -mx-2.5 px-2.5 font-medium' : ''}`}
                    >
                    <span className="w-5 text-right opacity-30 tabular-nums select-none">{line.line}</span>
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
            className="mt-2 w-full resize-none rounded-lg border border-border/20 bg-background px-2.5 py-2 text-sm text-foreground placeholder:text-muted-foreground/30 focus:border-primary/30 focus:ring-1 focus:ring-primary/10 focus:outline-none transition-all"
            placeholder="Write a note..."
          />

          <div className="mt-2.5 flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground/70 cursor-pointer group/todo select-none">
              <input
                type="checkbox"
                checked={Boolean(commentTodo)}
                onChange={(event) => onCommentTodoChange?.(event.target.checked)}
                className="h-3 w-3 rounded border-border/60 bg-transparent text-primary focus:ring-offset-0 focus:ring-1 focus:ring-primary/20 transition-all"
              />
              <span className="group-hover:text-foreground transition-colors">TODO</span>
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onCloseComment}
                className="rounded-md px-2.5 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/10 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSubmitComment}
                disabled={commentSaving}
                className="rounded-md bg-primary hover:bg-primary/90 px-3 py-1 text-[10px] font-semibold text-primary-foreground shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
              >
                {commentSaving ? 'Saving...' : 'Submit'}
              </button>
            </div>
          </div>
          {commentError ? (
            <div className="mt-2 text-[10px] font-medium text-rose-400 bg-rose-500/5 p-1.5 rounded border border-rose-500/10">
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
            <div className="absolute -left-2 -top-1.5 z-10">
                <div 
                    title={`Type: ${kindLabel}`}
                    className={`flex h-4 w-4 items-center justify-center rounded border shadow-sm transition-all ${
                        isResolved ? 'bg-muted border-border text-muted-foreground' : 'bg-popover border-border/40 text-primary'
                    }`}
                >
                    <Icon size={9} strokeWidth={2.5} />
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

            <div className="px-2.5 pb-2.5">
                <header className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-foreground/80 tracking-tight uppercase">
                          {comment.author?.label || 'Agent'}
                      </span>
                      {isProcessed ? (
                        <span className="rounded-full border border-emerald-500/30 px-1.5 py-0 text-[8px] font-bold uppercase tracking-widest text-emerald-400/70">
                          Done
                        </span>
                      ) : null}
                    </div>
                    <span className="text-[9px] font-medium text-muted-foreground/30 uppercase tabular-nums">
                        {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </span>
                </header>

                <div className="text-[11px] leading-snug text-muted-foreground break-words mb-2 selection:bg-primary/30">
                    {comment.body || comment.message}
                </div>

                <footer className="flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0 h-4">
                    <button 
                        onClick={() => onPromote?.(comment)}
                        disabled={isProcessed}
                        className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40 hover:text-primary transition-all disabled:opacity-40"
                    >
                        <Target size={10} />
                        Promote
                    </button>
                    <button 
                        onClick={() => onUpdateStatus?.(comment, isResolved ? 'open' : 'resolved')}
                        className="flex items-center gap-1 text-[9px] font-bold text-emerald-500/60 hover:text-emerald-400 transition-all"
                    >
                        <CheckCircle2 size={10} />
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
            className="flex items-center gap-1.5 mb-1.5 px-0.5 cursor-help"
            onMouseEnter={(e) => { setMousePos({ x: e.clientX, y: e.clientY }); setShowTooltip(true); }}
            onMouseLeave={() => setShowTooltip(false)}
        >
            <div className={`h-1 w-1 rounded-full ${isResolved ? 'bg-muted-foreground/20' : 'bg-primary shadow-[0_0_6px_rgba(59,130,246,0.6)]'}`} />
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
                                    <span className={`w-6 text-right font-mono text-[9px] shrink-0 ${l.isTarget ? 'text-primary font-bold' : 'text-muted-foreground/30'}`}>{l.line}</span>
                                    <pre className={`truncate font-mono ${l.isTarget ? 'text-foreground font-semibold' : 'text-muted-foreground/40'}`}>{l.content || ' '}</pre>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-24 flex items-center justify-center italic text-[10px] text-muted-foreground/20 uppercase tracking-widest">
                            {loading ? 'Retrieving Matrix...' : 'Snippet Unavailable'}
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
    <div className="rounded-xl border border-border/20 bg-card p-4 shadow-xl overflow-hidden relative ring-1 ring-black/5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-bold text-foreground">
          Promote Comments
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground/50 hover:text-foreground hover:bg-muted/10 transition-all"
        >
          <X size={14} />
        </button>
      </div>
      <textarea
        value={description}
        onChange={(event) => onChangeDescription?.(event.target.value)}
        rows={3}
        className="w-full resize-none rounded-lg border border-border/20 bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/30 focus:border-primary/30 focus:ring-1 focus:ring-primary/10 focus:outline-none transition-all"
        placeholder="Describe the draft you want to create from selected comments..."
      />
      <div className="mt-3 flex max-h-64 flex-col gap-2 overflow-y-auto custom-scrollbar pr-1">
        {items.length === 0 ? (
          <div className="text-[11px] text-muted-foreground/40 py-8 text-center italic">No pending comments.</div>
        ) : (
          items.map((item) => {
            const checked = selectedIds.includes(item.id);
            const preview = previewById[item.id];
            return (
              <div
                key={item.id}
                className="rounded-lg border border-border/10 bg-muted/5 px-3 py-2.5 transition-all hover:bg-muted/10 group/item select-none"
                onMouseEnter={() => onPreviewItem?.(item)}
              >
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleItem?.(item.id)}
                    className="mt-0.5 h-3.5 w-3.5 rounded border-border/60 bg-transparent text-primary focus:ring-offset-0 focus:ring-1 focus:ring-primary/20 transition-all"
                  />
                  <div className="flex flex-1 flex-col gap-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground/80 truncate mr-2 text-[11px]">
                        {item.anchor?.file || 'Unknown file'}
                      </span>
                      <span className="text-[10px] text-muted-foreground/40 tabular-nums shrink-0 font-medium">Ln {item.anchor?.line || 1}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground/80 line-clamp-2 leading-relaxed">
                      {item.body || item.message}
                    </div>
                    {preview ? (
                      preview.error ? (
                        <div className="mt-1.5 text-[10px] text-rose-400 opacity-80">{preview.error}</div>
                      ) : (
                        <div className="mt-1.5 rounded border border-border/10 bg-background/60 px-2 py-1.5 font-mono text-[10px] text-muted-foreground/60 overflow-hidden">
                          {preview.snippet?.map((line) => (
                            <div key={`${item.id}-${line.line}`} className="flex gap-3">
                              <span className="w-5 text-right opacity-30 select-none">{line.line}</span>
                              <span className="truncate">{line.text || ' '}</span>
                            </div>
                          ))}
                        </div>
                      )
                    ) : (
                      <div className="mt-1 text-[10px] text-muted-foreground/30 italic group-hover/item:text-muted-foreground/50 transition-colors">Hover to preview context.</div>
                    )}
                  </div>
                </label>
              </div>
            );
          })
        )}
      </div>
      {error ? <div className="mt-3 text-[11px] font-medium text-rose-400 bg-rose-500/5 p-2 rounded border border-rose-500/10">{error}</div> : null}
      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/10 transition-all"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={loading}
          className="rounded-md bg-primary hover:bg-primary/90 px-4 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-sm transition-all active:scale-95 disabled:opacity-50"
        >
          {loading ? 'Promoting...' : 'Create Draft'}
        </button>
      </div>
    </div>
  );
}
