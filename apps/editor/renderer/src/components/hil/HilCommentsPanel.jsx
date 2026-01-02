import React from 'react';
import { ListTodo, MessageSquarePlus, CheckCircle2, Archive, RefreshCw, FileText } from 'lucide-react';

const resolveCommentBody = (comment) =>
  typeof comment?.body === 'string'
    ? comment.body
    : typeof comment?.message === 'string'
      ? comment.message
      : '';

const resolveTodo = (comment) => Boolean(comment?.meta?.todo || comment?.todo);

const statusStyle = (status) => {
  switch (status) {
    case 'resolved':
      return 'text-emerald-400/80 border-emerald-500/20 bg-emerald-500/10';
    case 'archived':
      return 'text-muted-foreground/60 border-white/10 bg-white/5';
    default:
      return 'text-amber-300/80 border-amber-500/20 bg-amber-500/10';
  }
};

export function HilCommentsPanel({
  activeFile,
  cursorPosition,
  comments,
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
  onCommentMessageChange,
  onCommentTodoChange,
  onCloseComment,
  onSubmitComment,
}) {
  const lineLabel = cursorPosition?.line || 1;
  const columnLabel = cursorPosition?.column || 1;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-foreground">Comments</div>
          <div className="text-[10px] text-muted-foreground/60">
            {activeFile ? activeFile : 'No file selected'}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onOpenComment({ line: lineLabel, column: columnLabel })}
          className="flex items-center gap-1 rounded-full border border-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-primary/70 hover:border-primary/40 hover:text-primary"
        >
          <MessageSquarePlus size={12} />
          Add
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {loading && <div className="text-[10px] text-muted-foreground/40">Loading comments…</div>}
        {error && <div className="text-[10px] text-rose-400">{error}</div>}
        {!loading && !error && comments.length === 0 && (
          <div className="text-[10px] text-muted-foreground/40">No comments yet.</div>
        )}

        {comments.map((comment) => {
          const body = resolveCommentBody(comment);
          const todo = resolveTodo(comment);
          const status = comment.status || 'open';
          return (
            <div key={comment.id} className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground/60">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <FileText size={10} />
                    Ln {comment.line}
                  </span>
                  {todo && (
                    <span className="flex items-center gap-1 text-amber-300/80">
                      <ListTodo size={10} />
                      TODO
                    </span>
                  )}
                </div>
                <span className={`rounded-full border px-2 py-0.5 text-[9px] ${statusStyle(status)}`}>
                  {status}
                </span>
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground/80">{body}</div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[9px] uppercase tracking-widest text-muted-foreground/50">
                {status === 'open' ? (
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 hover:border-emerald-400/40 hover:text-emerald-200"
                    onClick={() => onUpdateStatus(comment, 'resolved')}
                  >
                    <CheckCircle2 size={10} />
                    Resolve
                  </button>
                ) : (
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 hover:border-amber-400/40 hover:text-amber-200"
                    onClick={() => onUpdateStatus(comment, 'open')}
                  >
                    <RefreshCw size={10} />
                    Reopen
                  </button>
                )}
                {status !== 'archived' && (
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 hover:border-white/30 hover:text-foreground"
                    onClick={() => onUpdateStatus(comment, 'archived')}
                  >
                    <Archive size={10} />
                    Archive
                  </button>
                )}
                <button
                  type="button"
                  className="flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 hover:border-primary/40 hover:text-primary"
                  onClick={() => onPromoteComment(comment)}
                >
                  <MessageSquarePlus size={10} />
                  Promote
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {commentModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f1218] p-4 shadow-2xl">
            <div className="text-xs font-semibold text-foreground">New Comment</div>
            <div className="mt-1 text-[10px] text-muted-foreground/60">
              {activeFile} · Ln {commentTarget.line}
            </div>
            <textarea
              value={commentMessage}
              onChange={(event) => onCommentMessageChange(event.target.value)}
              placeholder="Leave a comment for this line…"
              className="mt-3 h-28 w-full rounded-xl border border-white/10 bg-[#0b0d11] px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/60"
            />
            <div className="mt-3 flex items-center justify-between">
              <label className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
                <input
                  type="checkbox"
                  checked={commentTodo}
                  onChange={(event) => onCommentTodoChange(event.target.checked)}
                  className="h-3 w-3 rounded border border-white/20 bg-transparent text-primary focus:ring-primary/40"
                />
                Mark as TODO
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onCloseComment}
                  className="rounded-full border border-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={commentSaving}
                  onClick={onSubmitComment}
                  className="rounded-full bg-primary px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow hover:bg-primary/90 disabled:opacity-60"
                >
                  {commentSaving ? 'Saving…' : 'Submit'}
                </button>
              </div>
            </div>
            {commentError && (
              <div className="mt-2 text-[10px] text-rose-400">{commentError}</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
