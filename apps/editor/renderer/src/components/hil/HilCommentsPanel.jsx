import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Clock, 
  CheckCircle2, 
  CornerDownRight, 
  Hash, 
  Terminal, 
  StickyNote, 
  Layers, 
  Target, 
  Quote,
  FileCode,
  Search
} from 'lucide-react';

const kindIcons = {
    comment: Terminal,
    memo: StickyNote,
    draft: Layers
};

export function HilCommentsPanel({
  comments,
  onResolve,
  onReply,
  worktreePath
}) {
  return (
    <div className="flex flex-col gap-4 py-2">
      {comments && comments.length > 0 ? (
        comments.map((comment, i) => (
          <CommentItem 
            key={comment.id || i} 
            comment={comment} 
            onResolve={onResolve}
            onReply={onReply}
            worktreePath={worktreePath}
          />
        ))
      ) : (
        <div className="py-20 flex flex-col items-center justify-center opacity-10">
            <Hash size={32} strokeWidth={1} />
            <p className="text-[10px] font-black uppercase tracking-widest mt-2">No HIL Data</p>
        </div>
      )}
    </div>
  );
}

function CommentItem({ comment, onResolve, onReply, worktreePath }) {
    const isResolved = comment.status === 'resolved';
    const Icon = kindIcons[comment.kind] || Terminal;
    
    return (
        <div className={`group relative flex flex-col rounded-xl transition-all duration-300 ${isResolved ? 'opacity-30 grayscale' : 'hover:bg-white/5'}`}>
            {/* Type Indicator with Tooltip */}
            <div className="absolute -left-2 -top-2 z-10">
                <div 
                    title={`Type: ${comment.kind.toUpperCase()}`}
                    className={`flex h-5 w-5 items-center justify-center rounded-md border shadow-xl transition-all ${
                        isResolved ? 'bg-muted border-border text-muted-foreground' : 'bg-[#1a1d23] border-white/10 text-primary'
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
                    <span className="text-[11px] font-bold text-white/80 tracking-tight uppercase">
                        {comment.author?.label || 'Agent'}
                    </span>
                    <span className="text-[9px] font-medium text-muted-foreground/30 uppercase tabular-nums">
                        {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </span>
                </header>

                <div className="text-[11px] leading-relaxed text-muted-foreground/70 break-words mb-3 selection:bg-primary/30">
                    {comment.body || comment.message}
                </div>

                <footer className="flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all">
                    <button 
                        onClick={() => onReply?.(comment.id)} 
                        className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40 hover:text-primary transition-all"
                    >
                        <CornerDownRight size={12} />
                        Reply
                    </button>
                    {!isResolved && (
                        <button 
                            onClick={() => onResolve?.(comment.id)}
                            className="flex items-center gap-1 text-[9px] font-bold text-emerald-500/60 hover:text-emerald-400 transition-all"
                        >
                            <CheckCircle2 size={12} />
                            Resolve
                        </button>
                    )}
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
            <div className="h-px flex-1 bg-gradient-to-r from-primary/10 to-transparent" />
            
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
            className="fixed z-[999] w-[480px] rounded-2xl border border-white/10 bg-[#1a1d23]/98 backdrop-blur-3xl shadow-[0_30px_100px_rgba(0,0,0,0.7)] p-5 animate-tab-in flex flex-col gap-5 ring-1 ring-black/50"
        >
            {/* Code Context Section */}
            <div className="flex flex-col gap-3">
                <header className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                            <FileCode size={14} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/80">Code Reference</span>
                            <span className="text-[9px] font-mono text-muted-foreground/40">{fileName}</span>
                        </div>
                    </div>
                    {loading && <RefreshCw size={12} className="animate-spin text-primary/40" />}
                </header>

                <div className="rounded-xl bg-black/40 border border-white/5 overflow-hidden">
                    {snippet ? (
                        <div className="py-2 flex flex-col">
                            {snippet.map((l, i) => (
                                <div key={i} className={`flex items-center gap-4 px-4 h-6 text-[11px] ${l.isTarget ? 'bg-primary/10 border-y border-primary/5' : ''}`}>
                                    <span className={`w-8 text-right font-mono text-[9px] shrink-0 ${l.isTarget ? 'text-primary font-bold' : 'text-white/10'}`}>{l.line}</span>
                                    <pre className={`truncate font-mono ${l.isTarget ? 'text-primary-foreground font-semibold' : 'text-white/40'}`}>{l.content || ' '}</pre>
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

            <div className="h-px w-full bg-white/5" />

            {/* Comment Preview Section */}
            <div className="flex flex-col gap-2 relative">
                <div className="absolute -left-2 top-0 bottom-0 w-1 bg-primary/20 rounded-full" />
                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-primary/60 mb-1">
                    <Quote size={10} fill="currentColor" />
                    Annotation Detail
                </div>
                <p className="text-xs leading-relaxed text-white/80 italic font-serif pl-2">
                    "{commentBody}"
                </p>
            </div>
        </div>,
        document.body
    );
}