import React, { useState, useMemo } from 'react';
import {
  X,
  Send,
  Terminal,
  Clock,
  CheckCircle2,
  FolderClosed,
  FileText,
} from 'lucide-react';
import { statusColors, getFileIcon } from './explorerUtils.jsx';

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
  statusByPath,
  folderStatusByPath,
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

  const manifestTree = useMemo(() => {
    if (!selectionTargets?.length) return [];
    const root = {};
    const targetsSet = new Set(selectionTargets);

    selectionTargets.forEach(path => {
      const parts = path.split('/');
      let current = root;
      let currentPath = '';
      
      parts.forEach((part, index) => {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        const nodeMeta = nodesByPath?.[currentPath];
        const statusMeta = nodeMeta?.type === 'dir' ? folderStatusByPath?.[currentPath] : statusByPath?.[currentPath];

        if (!current[part]) {
          current[part] = { 
            name: part, 
            children: {},
            type: nodeMeta?.type || (index === parts.length - 1 ? 'file' : 'dir'),
            isSelected: targetsSet.has(currentPath),
            status: statusMeta?.status || null
          };
        }
        current = current[part].children;
      });
    });

    const sortNodes = (obj) => {
      return Object.values(obj).sort((a, b) => {
        if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
        return a.name.localeCompare(b.name);
      }).map(node => ({
        ...node,
        children: sortNodes(node.children)
      }));
    };

    return sortNodes(root);
  }, [selectionTargets, nodesByPath, folderStatusByPath, statusByPath]);

  return (
    <footer className="shrink-0 flex flex-col bg-sidebar select-none border-t border-border/40 relative">
      
      {/* 1. Selection Manifest (Tree View) */}
      {showManifest && selectionCount > 0 && (
        <div className="absolute bottom-full left-3 mb-2 w-64 max-h-72 overflow-y-auto rounded-xl border border-border/50 bg-popover/98 backdrop-blur-3xl p-2 shadow-2xl animate-tab-in z-50 ring-1 ring-border/10 scrollbar-hide">
            <div className="flex items-center justify-between mb-2 border-b border-border/10 pb-1.5 px-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-primary/60">Selection Hierarchy</span>
                <span className="text-[9px] font-mono text-muted-foreground/40">{selectionCount} items</span>
            </div>
            
            <div className="space-y-px">
                {manifestTree.map((node, i) => (
                    <ManifestNode key={i} node={node} depth={0} />
                ))}
            </div>
        </div>
      )}

      {/* 2. Compact Interaction Bar */}
      {selectionCount > 0 && (
        <div className="flex h-8 items-center px-3 gap-3 animate-tab-in bg-muted/5 border-b border-border/10">
            <div 
                className="flex items-center gap-1.5 shrink-0 cursor-help group/trigger h-full px-1"
                onMouseEnter={() => setShowManifest(true)}
                onMouseLeave={() => setShowManifest(false)}
            >
                <span className="text-[10px] text-primary tracking-tight font-medium opacity-80 group-hover/trigger:opacity-100 transition-opacity">
                    {selectionCount} items
                </span>
                <div className="h-1 w-1 rounded-full bg-primary/20 group-hover/trigger:bg-primary transition-colors" />
            </div>
            
            <div className="h-3 w-[1px] bg-border/20" />

            <input 
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="attach instruction..."
                className="flex-1 bg-transparent border-none text-[11px] text-muted-foreground placeholder:text-muted-foreground/30 focus:outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />

            <div className="flex items-center gap-1">
                <button 
                    onClick={handleSend}
                    className={`p-1 transition-all ${comment ? 'text-primary hover:scale-110' : 'text-muted-foreground/40 pointer-events-none'}`}
                >
                    <Send size={12} strokeWidth={2} />
                </button>
                <button onClick={onClearSelection} className="p-1 text-muted-foreground/40 hover:text-foreground/80">
                    <X size={12} strokeWidth={2} />
                </button>
            </div>
        </div>
      )}

      {/* 3. Pipeline Monitor */}
      <div className="h-7 flex items-center justify-between px-3">
        <div className="flex items-center gap-4 overflow-hidden flex-1">
            <div className="flex items-center gap-1.5 text-[9px] font-medium text-muted-foreground/40 uppercase tracking-widest shrink-0">
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
                            <div className={`h-1 w-1 rounded-full transition-all ${isActive ? 'bg-primary shadow-[0_0_5px_rgba(59,130,246,0.5)]' : 'bg-foreground/10 group-hover:bg-foreground/20'}`} />
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
            <div className="text-[9px] font-medium text-muted-foreground/30 tracking-widest uppercase truncate max-w-[80px]">
                {activeCell?.name || 'Ready'}
            </div>
            {activeCell && <CheckCircle2 size={10} className="text-muted-foreground/30" />}
        </div>
      </div>
    </footer>
  );
}

function ManifestNode({ node, depth }) {
    const iconInfo = node.type === 'dir' ? { icon: FolderClosed, color: 'text-primary/40' } : getFileIcon(node.name, false);
    const Icon = iconInfo.icon;
    
    // Only highlight if the item is explicitly selected. 
    // Intermediate directories (not selected) should stay gray.
    const colorClass = node.isSelected 
        ? (node.status ? statusColors[node.status] : 'text-foreground/90')
        : 'text-muted-foreground/40';
    
    return (
        <div className="flex flex-col">
            <div 
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] transition-colors ${colorClass}`}
                style={{ paddingLeft: `${depth * 8 + 8}px` }}
            >
                <Icon size={8} className={node.isSelected ? iconInfo.color : 'opacity-40'} />
                <span className={`truncate ${node.isSelected ? 'font-semibold' : 'font-normal'}`}>
                    {node.name}
                </span>
            </div>
            {node.children.length > 0 && (
                <div className="flex flex-col">
                    {node.children.map((child, i) => (
                        <ManifestNode key={i} node={child} depth={depth + 1} />
                    ))}
                </div>
            )}
        </div>
    );
}
