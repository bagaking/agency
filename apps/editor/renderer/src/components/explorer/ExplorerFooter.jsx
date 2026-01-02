import React, { useState, useMemo } from 'react';
import {
  X,
  Send,
  Terminal,
  Clock,
  CheckCircle2,
  FolderClosed,
  FileText
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
  nodesByPath,
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
  const [showManifest, setShowManifest] = useState(false);
  const activeSessions = (sessions || []).filter((s) => s.status !== 'closed');

  const handleSend = () => {
    const current = activeSessions.find(s => s.id === activeSessionId) || activeSessions[0];
    if (!current || selectionCount === 0) return;
    const filesString = (selectionTargets || []).join(', ');
    const finalMsg = `[Context] ${filesString}${comment ? `\n[Note] ${comment}` : ''}`;
    const escaped = finalMsg.split("\"").join('\\"').split('\n').join('\\n');
    
    onRunCommand?.({
      command: `echo -e "${escaped}"`, 
      kind: 'resume', 
      label: `Feed` 
    });
    setComment('');
  };

  const selectionManifest = useMemo(() => {
    if (!selectionTargets?.length || !nodesByPath) return { dirs: [], files: [] };
    const dirs = [];
    const files = [];
    selectionTargets.forEach(path => {
        const node = nodesByPath[path];
        if (node?.type === 'dir') dirs.push(node.name || path);
        else files.push(node?.name || path);
    });
    return { dirs, files };
  }, [selectionTargets, nodesByPath]);

  return (
    <footer className="shrink-0 flex flex-col bg-[#0b0d11] select-none border-t border-white/[0.02] relative">
      
      {/* 1. Selection Manifest Hover Panel */}
      {showManifest && selectionCount > 0 && (
        <div className="absolute bottom-full left-3 mb-2 w-64 max-h-60 overflow-y-auto rounded-xl border border-white/10 bg-[#1a1d23]/95 backdrop-blur-xl p-3 shadow-2xl animate-tab-in z-50 ring-1 ring-black/50">
            <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-primary/60">Selection Manifest</span>
                <span className="text-[9px] font-mono text-white/20">{selectionCount} total</span>
            </div>
            
            {selectionManifest.dirs.length > 0 && (
                <div className="mb-4">
                    <div className="flex items-center gap-1.5 text-[8px] font-bold text-muted-foreground/40 uppercase mb-1.5 px-1">
                        <FolderClosed size={8} />
                        Containers
                    </div>
                    <div className="space-y-0.5">
                        {selectionManifest.dirs.map((d, i) => (
                            <div key={i} className="text-[10px] text-white/60 truncate px-2 py-0.5 rounded hover:bg-white/5 font-medium">{d}</div>
                        ))}
                    </div>
                </div>
            )}

            {selectionManifest.files.length > 0 && (
                <div>
                    <div className="flex items-center gap-1.5 text-[8px] font-bold text-muted-foreground/40 uppercase mb-1.5 px-1">
                        <FileText size={8} />
                        Assets
                    </div>
                    <div className="space-y-0.5">
                        {selectionManifest.files.map((f, i) => (
                            <div key={i} className="text-[10px] text-white/60 truncate px-2 py-0.5 rounded hover:bg-white/5 font-medium">{f}</div>
                        ))}
                    </div>
                </div>
            )}
        </div>
      )}

      {/* 2. Input Context (Only when selected) */}
      {selectionCount > 0 && (
        <div className="flex h-8 items-center px-3 gap-3 animate-tab-in bg-white/[0.01] border-b border-white/[0.02]">
            <div 
                className="flex items-center gap-1.5 shrink-0 cursor-help group/trigger"
                onMouseEnter={() => setShowManifest(true)}
                onMouseLeave={() => setShowManifest(false)}
            >
                <span className="text-[10px] text-primary tracking-tight font-normal">
                    <span className="opacity-60">{selectionCount}</span> items
                </span>
                <div className="h-1 w-1 rounded-full bg-primary/20 group-hover/trigger:bg-primary transition-colors" />
            </div>
            
            <div className="h-3 w-[1px] bg-white/5" />

            <input 
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="instruction..."
                className="flex-1 bg-transparent border-none text-[11px] text-muted-foreground placeholder:text-white/5 focus:outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />

            <div className="flex items-center gap-1">
                <button 
                    onClick={handleSend}
                    className={`p-1 transition-all ${comment ? 'text-primary hover:scale-110' : 'text-white/5 pointer-events-none'}`}
                >
                    <Send size={12} strokeWidth={2} />
                </button>
                <button onClick={onClearSelection} className="p-1 text-white/5 hover:text-white/20">
                    <X size={12} strokeWidth={2} />
                </button>
            </div>
        </div>
      )}

      {/* 3. Pipeline Monitor */}
      <div className="h-7 flex items-center justify-between px-3">
        <div className="flex items-center gap-4 overflow-hidden flex-1">
            <div className="flex items-center gap-1.5 text-[9px] font-medium text-white/10 uppercase tracking-widest shrink-0">
                <Terminal size={10} strokeWidth={1.5} />
                Pipes
            </div>
            
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                {activeSessions.map(s => {
                    const isActive = s.id === activeSessionId;
                    const key = `${activeCell?.id}:${s.id}`;
                    const lastActivity = sessionActivityByKey?.[key];
                    const idleMs = now - (lastActivity || (s.updatedAt ? new Date(s.updatedAt).getTime() : now));
                    
                    return (
                        <button
                            key={s.id}
                            onClick={() => onSelectSession?.(s.id)}
                            className={`flex items-center gap-2 px-2 h-5 rounded transition-all whitespace-nowrap group ${isActive ? 'text-primary' : 'text-muted-foreground/30 hover:text-muted-foreground/60'}`}
                        >
                            <div className={`h-1 w-1 rounded-full transition-all ${isActive ? 'bg-primary shadow-[0_0_5px_rgba(59,130,246,0.5)]' : 'bg-white/10 group-hover:bg-white/20'}`} />
                            <span className="text-[10px] font-medium tracking-tight">{s.name || s.id}</span>
                            {!isActive && (
                                <span className="text-[8px] opacity-40 font-mono italic">{formatIdle(idleMs)}</span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>

        <div className="flex items-center gap-2 pl-4">
            <div className="text-[9px] font-medium text-white/5 tracking-widest uppercase truncate max-w-[80px]">
                {activeCell?.name || 'Ready'}
            </div>
            {activeCell && <CheckCircle2 size={10} className="text-white/5" />}
        </div>
      </div>
    </footer>
  );
}
