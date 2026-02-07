import React, { useMemo, useRef, useState } from 'react';
import {
  X,
  Send,
  Map,
  FolderClosed,
  FileText,
} from 'lucide-react';
import { statusColors, getFileIcon } from './explorerUtils.jsx';
import { Tooltip } from '../ui/Tooltip.jsx';
import { focusRing } from '../ui/focusRing';
import { AgentAvatarBadge } from '../ui/AgentAvatarBadge.jsx';
import { resolveSessionAvatarId } from '../../utils/agentAvatar';
import { formatIdleShort } from '../../utils/timeFormat';

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
  onDispatchFeed,
  activeCell,
  onToggleSessionMap,
  sessionMapOpen,
}) {
  const [comment, setComment] = useState('');
  const [showManifest, setShowManifest] = useState(false);
  const isComposingRef = useRef(false);
  const activeSessions = (sessions || []).filter((s) => s.status !== 'closed');
  const focusSession =
    activeSessions.find((session) => session.id === activeSessionId) || activeSessions[0];
  const focusRingClass = focusRing.default;
  const focusSessionKey =
    focusSession && activeCell ? `${activeCell.id}:${focusSession.id}` : null;
  const focusActivityAt = focusSessionKey ? sessionActivityByKey?.[focusSessionKey] : null;
  const focusIdleMs =
    Number.isFinite(focusActivityAt) && Number.isFinite(now)
      ? Math.max(0, now - focusActivityAt)
      : null;
  const focusSessionClosed =
    activeCell?.state === 'archived' ||
    activeCell?.state === 'closed' ||
    ['closed', 'stale', 'archived'].includes(focusSession?.status);

  const handleDispatch = async () => {
    const current = focusSession;
    const trimmedComment = comment.trim();
    if (!current || selectionCount === 0 || !trimmedComment) return;
    const buildTreeLines = (nodes, depth = 0) => {
      const indent = '  '.repeat(depth);
      return nodes.flatMap((node) => {
        const line = `${indent}- ${node.name}`;
        if (!node.children?.length) {
          return [line];
        }
        return [line, ...buildTreeLines(node.children, depth + 1)];
      });
    };
    const treeLines = manifestTree.length
      ? buildTreeLines(manifestTree)
      : (selectionTargets || []).map((path) => `- ${path}`);
    const context = treeLines.join('\n');
    try {
      await onDispatchFeed?.({
        description: trimmedComment,
        context,
        sessionId: current.id,
      });
      setComment('');
    } catch (error) {
      console.error(error);
    }
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
    <footer className="shrink-0 flex flex-col bg-sidebar text-sidebar-foreground select-none border-t border-border/40 relative">
      
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
        <div className="flex h-8 items-center px-3 gap-3 animate-tab-in bg-muted/10 border-b border-border/10">
            <div 
                className={`flex items-center gap-1.5 shrink-0 cursor-help group/trigger h-full px-1 ${focusRingClass}`}
                onMouseEnter={() => setShowManifest(true)}
                onMouseLeave={() => setShowManifest(false)}
                onFocus={() => setShowManifest(true)}
                onBlur={() => setShowManifest(false)}
                tabIndex={0}
                role="button"
                aria-label="Show selection hierarchy"
            >
                <span className="text-[10px] text-primary tracking-tight font-medium opacity-80 group-hover/trigger:opacity-100 transition-opacity">
                    {selectionCount} items
                </span>
                <div className="h-1 w-1 rounded-full bg-primary/20 group-hover/trigger:bg-primary transition-colors" aria-hidden="true" />
            </div>
            
            <div className="h-3 w-[1px] bg-border/20" />

            <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                aria-label="Selection instruction"
                onCompositionStart={() => { isComposingRef.current = true; }}
                onCompositionEnd={() => { isComposingRef.current = false; }}
                onKeyDown={(event) => {
                  if (isComposingRef.current || event.nativeEvent?.isComposing) {
                    return;
                  }
                  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                    event.preventDefault();
                    handleDispatch();
                  }
                }}
                rows={1}
                placeholder="attach instruction..."
                className="flex-1 bg-transparent border-none text-[11px] text-muted-foreground placeholder:text-muted-foreground/30 focus:outline-none resize-none leading-4 min-h-[18px] max-h-24 overflow-y-auto"
            />

            <div className="flex items-center gap-1">
                <Tooltip label="Dispatch to session">
                  <button 
                      type="button"
                      onClick={handleDispatch}
                      className={`p-1 transition-colors transition-transform ${focusRingClass} ${comment.trim() ? 'text-primary hover:scale-110' : 'text-muted-foreground/40 pointer-events-none'}`}
                      aria-label="Dispatch to session"
                  >
                      <Send size={12} strokeWidth={2} aria-hidden="true" />
                  </button>
                </Tooltip>
                <Tooltip label="Clear selection">
                  <button
                      type="button"
                      onClick={onClearSelection}
                      className={`p-1 text-muted-foreground/40 transition-colors hover:text-foreground/80 ${focusRingClass}`}
                      aria-label="Clear selection"
                  >
                      <X size={12} strokeWidth={2} aria-hidden="true" />
                  </button>
                </Tooltip>
            </div>
        </div>
      )}

      {/* 3. Active Session Card */}
      <div className="flex items-center px-3 py-2">
        <button
          type="button"
          onClick={() => onToggleSessionMap?.()}
          disabled={!focusSession}
          className={`group flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-left transition-colors ${focusRingClass} ${
            focusSession ? 'hover:bg-white/10' : 'opacity-50 cursor-not-allowed'
          } ${sessionMapOpen ? 'ring-1 ring-primary/50 bg-primary/10' : ''}`}
          aria-label="Open session map"
          title="Open session map"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="relative flex items-center justify-center">
              <AgentAvatarBadge
                avatarId={resolveSessionAvatarId(focusSession, activeCell)}
                size={24}
                idleMs={focusIdleMs}
                isClosed={focusSessionClosed}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[9px] uppercase tracking-widest text-muted-foreground/60">
                <span className="shrink-0">Active</span>
                <span className="h-1 w-1 rounded-full bg-muted-foreground/40" aria-hidden="true" />
                <span className="min-w-0 truncate text-[11px] font-semibold normal-case tracking-normal text-foreground/90">
                  {focusSession?.name || focusSession?.id || 'No session'}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[9px] text-muted-foreground/60">
                <span className="truncate">{activeCell?.name || 'No cell'}</span>
                {focusSession ? (
                  <>
                    <span>·</span>
                    <span className="font-mono">
                      {(() => {
                        if (!Number.isFinite(focusActivityAt)) {
                          return 'Idle —';
                        }
                        return `Idle ${formatIdleShort(Math.max(0, now - focusActivityAt))}`;
                      })()}
                    </span>
                  </>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            <Map size={12} />
            <span>Map</span>
          </div>
        </button>
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
                <Icon size={8} className={node.isSelected ? iconInfo.color : 'opacity-40'} aria-hidden="true" />
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
