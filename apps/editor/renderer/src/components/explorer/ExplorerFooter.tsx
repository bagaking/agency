import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  Send,
  Map,
  FolderClosed,
} from 'lucide-react';
import { statusColors, getFileIcon } from './explorerUtils';
import { Tooltip } from '../ui/Tooltip';
import { focusRing } from '../ui/focusRing';
import { AgentAvatarBadge } from '../ui/AgentAvatarBadge';
import { resolveSessionAvatarId } from '../../utils/agentAvatar';
import { formatIdleShort } from '../../utils/timeFormat';

const COMMENT_MIN_HEIGHT = 22;
const COMMENT_MAX_HEIGHT = 140;

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
  explorerDeliverySummary,
  onOpenDeliveryTimeline,
  activeCell,
  onToggleSessionMap,
  sessionMapOpen,
}: any) {
  const [comment, setComment] = useState('');
  const [showManifest, setShowManifest] = useState(false);
  const [deliveryMode, setDeliveryMode] = useState<'quick' | 'gated'>('quick');
  const isComposingRef = useRef(false);
  const commentRef = useRef<HTMLTextAreaElement | null>(null);

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

  const canDispatch = Boolean(focusSession && selectionCount > 0 && comment.trim());
  const canOpenTimeline = Boolean(
    explorerDeliverySummary?.draftId || explorerDeliverySummary?.actionSheetId
  );

  const resizeCommentInput = useCallback(() => {
    const element = commentRef.current;
    if (!element) {
      return;
    }
    element.style.height = 'auto';
    const nextHeight = Math.min(
      COMMENT_MAX_HEIGHT,
      Math.max(COMMENT_MIN_HEIGHT, element.scrollHeight)
    );
    element.style.height = `${nextHeight}px`;
  }, []);

  useEffect(() => {
    resizeCommentInput();
  }, [comment, resizeCommentInput]);

  useEffect(() => {
    if (selectionCount > 0) {
      return;
    }
    setShowManifest(false);
    setDeliveryMode('quick');
    if (!commentRef.current) {
      return;
    }
    commentRef.current.style.height = `${COMMENT_MIN_HEIGHT}px`;
  }, [selectionCount]);

  const manifestTree = useMemo(() => {
    if (!selectionTargets?.length) return [];
    const root: Record<string, any> = {};
    const targetsSet = new Set(selectionTargets);

    selectionTargets.forEach((path) => {
      const parts = path.split('/');
      let current = root;
      let currentPath = '';

      parts.forEach((part, index) => {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        const nodeMeta = nodesByPath?.[currentPath];
        const statusMeta =
          nodeMeta?.type === 'dir'
            ? folderStatusByPath?.[currentPath]
            : statusByPath?.[currentPath];

        if (!current[part]) {
          current[part] = {
            name: part,
            children: {},
            type: nodeMeta?.type || (index === parts.length - 1 ? 'file' : 'dir'),
            isSelected: targetsSet.has(currentPath),
            status: statusMeta?.status || null,
          };
        }
        current = current[part].children;
      });
    });

    const sortNodes = (obj: Record<string, any>) =>
      Object.values(obj)
        .sort((a: any, b: any) => {
          if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
          return a.name.localeCompare(b.name);
        })
        .map((node: any) => ({
          ...node,
          children: sortNodes(node.children),
        }));

    return sortNodes(root);
  }, [selectionTargets, nodesByPath, folderStatusByPath, statusByPath]);

  const handleDispatch = async () => {
    const current = focusSession;
    const trimmedComment = comment.trim();
    if (!current || selectionCount === 0 || !trimmedComment) return;

    const buildTreeLines = (nodes: any[], depth = 0): string[] => {
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
      : (selectionTargets || []).map((path: string) => `- ${path}`);

    const context = treeLines.join('\n');
    try {
      await onDispatchFeed?.({
        description: trimmedComment,
        context,
        sessionId: current.id,
        mode: deliveryMode,
        references: selectionTargets,
      });
      setComment('');
      if (deliveryMode === 'quick') {
        onClearSelection?.();
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <footer className="shrink-0 bg-sidebar text-sidebar-foreground select-none border-t border-border/40 relative">
      {showManifest && selectionCount > 0 ? (
        <div className="absolute bottom-full left-3 mb-2 w-64 max-h-72 overflow-y-auto rounded-xl border border-border/50 bg-popover/98 backdrop-blur-3xl p-2 shadow-2xl animate-tab-in z-50 ring-1 ring-border/10 scrollbar-hide">
          <div className="flex items-center justify-between mb-2 border-b border-border/10 pb-1.5 px-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-primary/60">
              Selection Hierarchy
            </span>
            <span className="text-[9px] font-mono text-muted-foreground/40">{selectionCount} items</span>
          </div>

          <div className="space-y-px">
            {manifestTree.map((node, index) => (
              <ManifestNode key={index} node={node} depth={0} />
            ))}
          </div>
        </div>
      ) : null}

      <div className="px-3 py-2">
        <div
          className={`rounded-lg border border-white/10 bg-white/5 transition-colors ${
            sessionMapOpen ? 'ring-1 ring-primary/50 bg-primary/10' : ''
          }`}
        >
          <button
            type="button"
            onClick={() => onToggleSessionMap?.()}
            disabled={!focusSession}
            className={`group flex w-full items-center gap-2 rounded-t-lg px-2.5 py-2 text-left transition-colors ${focusRingClass} ${
              focusSession ? 'hover:bg-white/10' : 'opacity-50 cursor-not-allowed'
            } ${selectionCount > 0 ? 'border-b border-white/10' : ''}`}
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

          {selectionCount > 0 ? (
            <div className="px-2.5 py-2 animate-tab-in">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className={`flex items-center gap-1.5 rounded-md px-1 py-0.5 text-[10px] text-primary tracking-tight font-medium opacity-80 hover:opacity-100 transition-opacity ${focusRingClass}`}
                    onMouseEnter={() => setShowManifest(true)}
                    onMouseLeave={() => setShowManifest(false)}
                    onFocus={() => setShowManifest(true)}
                    onBlur={() => setShowManifest(false)}
                    aria-label="Show selection hierarchy"
                    aria-expanded={showManifest}
                  >
                    <span>{selectionCount} items</span>
                    <span
                      className="h-1 w-1 rounded-full bg-primary/30"
                      aria-hidden="true"
                    />
                  </button>
                  <div className="inline-flex rounded bg-background/70 p-0.5">
                    <button
                      type="button"
                      onClick={() => setDeliveryMode('quick')}
                      className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide transition-colors ${focusRingClass} ${
                        deliveryMode === 'quick'
                          ? 'bg-primary/15 text-primary'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      title="Quick send (default)"
                    >
                      Quick
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryMode('gated')}
                      className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide transition-colors ${focusRingClass} ${
                        deliveryMode === 'gated'
                          ? 'bg-primary/15 text-primary'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      title="Gated send via Action Sheet"
                    >
                      Gated
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={onOpenDeliveryTimeline}
                    disabled={!canOpenTimeline}
                    className={`rounded border border-border/30 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-40 ${focusRingClass}`}
                    title="Open latest delivery timeline"
                  >
                    Timeline
                  </button>
                  <Tooltip label="Clear selection">
                    <button
                      type="button"
                      onClick={onClearSelection}
                      className={`p-1 text-muted-foreground/50 transition-colors hover:text-foreground/85 ${focusRingClass}`}
                      aria-label="Clear selection"
                    >
                      <X size={12} strokeWidth={2} aria-hidden="true" />
                    </button>
                  </Tooltip>
                </div>
              </div>

              <div className="flex items-end gap-1.5 rounded-md border border-border/40 bg-background/40 px-2 py-1.5">
                <textarea
                  ref={commentRef}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  aria-label="Selection instruction"
                  onFocus={resizeCommentInput}
                  onCompositionStart={() => {
                    isComposingRef.current = true;
                  }}
                  onCompositionEnd={() => {
                    isComposingRef.current = false;
                  }}
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
                  placeholder="Describe what to do with selected files..."
                  className="flex-1 bg-transparent border-none text-[11px] text-muted-foreground placeholder:text-muted-foreground/35 focus:outline-none resize-none leading-4 min-h-[22px] max-h-[140px] overflow-y-auto"
                />

                <Tooltip label={canDispatch ? 'Dispatch to session' : 'Cmd/Ctrl + Enter to dispatch'}>
                  <button
                    type="button"
                    onClick={handleDispatch}
                    disabled={!canDispatch}
                    className={`p-1 rounded-md transition-colors transition-transform ${focusRingClass} ${
                      canDispatch
                        ? 'text-primary hover:scale-105 hover:bg-primary/10'
                        : 'text-muted-foreground/35 cursor-not-allowed'
                    }`}
                    aria-label="Dispatch to session"
                  >
                    <Send size={12} strokeWidth={2} aria-hidden="true" />
                  </button>
                </Tooltip>
              </div>
              {explorerDeliverySummary ? (
                <div className="mt-1.5 flex items-center justify-between text-[9px] text-muted-foreground/60">
                  <span className="truncate">
                    Last send · {explorerDeliverySummary.mode || 'quick'} ·{' '}
                    {explorerDeliverySummary.status || 'idle'}
                  </span>
                  {explorerDeliverySummary.updatedAt ? (
                    <span className="shrink-0 font-mono">
                      {new Date(explorerDeliverySummary.updatedAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                      })}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </footer>
  );
}

function ManifestNode({ node, depth }: any) {
  const iconInfo =
    node.type === 'dir'
      ? { icon: FolderClosed, color: 'text-primary/40' }
      : getFileIcon(node.name, false);
  const Icon = iconInfo.icon;

  // Only highlight explicitly selected items.
  const colorClass = node.isSelected
    ? node.status
      ? statusColors[node.status]
      : 'text-foreground/90'
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
      {node.children.length > 0 ? (
        <div className="flex flex-col">
          {node.children.map((child: any, index: number) => (
            <ManifestNode key={index} node={child} depth={depth + 1} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
