import React, { useState } from 'react';
import {
  X,
  Send,
  Terminal,
  Clock,
  FileDigit,
  MessageSquare
} from 'lucide-react';

const formatIdle = (ms) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}m`;
};

export function ExplorerFooter({
  selectionCount,
  selectionTargets,
  onClearSelection,
  sessions,
  activeSessionId,
  sessionActivityByKey,
  now,
  onSelectSession,
  onRunCommand,
  activeCell,
}) {
  const [comment, setComment] = useState('');
  const activeSessions = (sessions || []).filter((s) => s.status !== 'closed');

  const handleSend = () => {
    const current = activeSessions.find(s => s.id === activeSessionId) || activeSessions[0];
    if (!current || selectionCount === 0) return;
    
    // Construct instruction message
    const filesString = (selectionTargets || []).join(', ');
    const finalMsg = `[Action] Process selected files:\nFiles: ${filesString}${comment ? `\nNote: ${comment}` : ''}`;
    
    // Manual escaping to avoid truncated regex issues in tool calls
    const escaped = finalMsg
      .split("'").join("\'\'")
      .split('\n').join('\\n');
    
    onRunCommand?.({
      command: `echo -e "${escaped}"`, 
      kind: 'resume', 
      label: `Feed Agent` 
    });
    
    setComment('');
  };

  return (
    <footer className="shrink-0 flex flex-col bg-[#0c0d10] border-t border-white/5 select-none overflow-hidden shadow-2xl">
      
      {/* 1. Action Layer: Only visible when files are selected */}
      <div className={`transition-all duration-300 ease-in-out ${selectionCount > 0 ? 'h-12 opacity-100' : 'h-0 opacity-0'}`}>
        <div className="flex items-center h-full px-4 gap-4 bg-primary/5">
            <div className="flex items-center gap-2 shrink-0">
                <FileDigit size={14} className="text-primary" />
                <span className="text-xs font-bold text-foreground">{selectionCount} items</span>
            </div>

            <div className="flex-1 relative flex items-center">
                <MessageSquare size={12} className="absolute left-3 text-white/20" />
                <input 
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Ask agent to handle these files..."
                    className="w-full h-8 bg-black/40 border border-white/10 rounded-lg pl-9 pr-4 text-xs text-white placeholder:text-white/10 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
            </div>

            <div className="flex items-center gap-2 shrink-0">
                <button 
                    onClick={handleSend}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-primary text-white text-[11px] font-bold hover:bg-primary/90 active:scale-95 transition-all shadow-lg shadow-primary/20"
                >
                    <Send size={12} />
                    Feed
                </button>
                <button 
                    onClick={onClearSelection}
                    className="p-1.5 text-white/20 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors"
                    title="Clear Selection"
                >
                    <X size={14} />
                </button>
            </div>
        </div>
      </div>

      {/* 2. Status & Pipeline Layer: Always visible */}
      <div className="h-9 flex items-center justify-between px-4 bg-black/20 border-t border-white/[0.02]">
        <div className="flex items-center gap-4 overflow-hidden h-full">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/30 shrink-0">
                <Terminal size={12} />
                Pipes
            </div>
            
            <div className="flex items-center gap-1.5 h-full overflow-x-auto no-scrollbar scroll-smooth">
                {activeSessions.map(s => {
                    const isActive = s.id === activeSessionId;
                    const key = `${activeCell?.id}:${s.id}`;
                    const lastActivity = sessionActivityByKey?.[key];
                    const idleMs = now - (lastActivity || (s.updatedAt ? new Date(s.updatedAt).getTime() : now));
                    
                    return (
                        <button
                            key={s.id}
                            onClick={() => onSelectSession?.(s.id)}
                            className={`flex items-center gap-2.5 px-3 h-7 rounded-md transition-all whitespace-nowrap ${isActive ? 'bg-white/5 text-primary ring-1 ring-white/10' : 'text-muted-foreground/60 hover:bg-white/[0.02] hover:text-muted-foreground'}`}
                        >
                            <div className="relative">
                                <div className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-primary' : 'bg-white/10'}`} />
                                {isActive && <div className="absolute inset-0 bg-primary rounded-full animate-ping opacity-40" />} 
                            </div>
                            <span className="text-[11px] font-semibold tracking-tight">{s.name || s.id}</span>
                            {!isActive && (
                                <div className="flex items-center gap-1 opacity-40 text-[10px]">
                                    <Clock size={10} />
                                    {formatIdle(idleMs)}
                                </div>
                            )}
                        </button>
                    );
                })}
                {activeSessions.length === 0 && (
                    <span className="text-[10px] text-white/10 italic">Waiting for connection...</span>
                )}
            </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-4 border-l border-white/5 pl-4 h-full">
            {activeCell ? (
                <div className="flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest truncate max-w-[120px]">
                        {activeCell.name}
                    </span>
                </div>
            ) : (
                <span className="text-[10px] font-bold text-white/5 uppercase tracking-[0.2em]">Idle Mode</span>
            )}
        </div>
      </div>
    </footer>
  );
}
