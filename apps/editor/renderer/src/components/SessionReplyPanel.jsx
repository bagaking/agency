import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import {
  ArrowUpRight,
  Link2,
  MessageSquareText,
  Send,
  StickyNote,
  Loader2,
  Users,
  X,
  Reply,
  Clock,
  Edit2,
  Trash2,
} from 'lucide-react';
import { createHilItem, listHilItems, updateHilItem } from '../services/agencyBridge';
import { AgentAvatarBadge } from './ui/AgentAvatarBadge.jsx';
import { resolveAvatarId } from '../utils/agentAvatar';
import { focusRing } from './ui/focusRing';
import { Tooltip } from './ui/Tooltip.jsx';

const DEFAULT_TIME_TAG = 'Nature';
const REPLY_EDITOR_HEIGHT = 112;
const REPLY_EDITOR_PADDING = 12;
const REPLY_EDITOR_FONT_SIZE = 13;
const REPLY_EDITOR_LINE_HEIGHT = 20;
const REPLY_EDITOR_FONT_FAMILY =
  'Menlo, Monaco, "SF Mono", "Hiragino Sans GB", "PingFang SC", "Noto Sans CJK SC", "Courier New", monospace';

const normalizeTerminalText = (value) =>
  String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n/g, '\r');

const formatTimeTag = (timestamp) => {
  if (!timestamp) {
    return '';
  }
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const buildReplyPayload = ({ site, timeTag, query }) => {
  if (!site) {
    return query;
  }
  return [
    `<reply time="${timeTag || DEFAULT_TIME_TAG}">`,
    `<site>${site}</site>`,
    `<query>${query}</query>`,
    '</reply>',
  ].join('\n');
};

const renderSiteSegments = (site) => {
  const parts = String(site || '').split('`');
  return parts.map((part, index) => {
    if (!part) {
      return null;
    }
    if (index % 2 === 1) {
      return (
        <mark
          key={`site-${index}`}
          className="rounded bg-primary/15 px-1 py-0.5 text-primary"
        >
          {part}
        </mark>
      );
    }
    return <span key={`site-${index}`}>{part}</span>;
  });
};

export function SessionReplyPanel({
  cell,
  session,
  worktreePath,
  selection,
  focusToken,
  sessionTargets = [],
  onClearSelection,
  onSendSessionText,
  onJumpToSession,
  onJumpToMemo,
}) {
  const focusRingClass = focusRing.default;
  const editorRef = useRef(null);
  const editorContainerRef = useRef(null);
  const [replyText, setReplyText] = useState('');
  const [sendMenuOpen, setSendMenuOpen] = useState(false);
  const [replyItems, setReplyItems] = useState([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState(null);

  const selectionContext = useMemo(() => {
    if (!selection?.text) {
      return null;
    }
    if (selection?.cellId && selection.cellId !== cell?.id) {
      return null;
    }
    if (selection?.sessionId && selection.sessionId !== session?.id) {
      return null;
    }
    return selection;
  }, [cell?.id, selection, session?.id]);

  const timeTag =
    selectionContext?.timeTag || formatTimeTag(selectionContext?.updatedAt) || DEFAULT_TIME_TAG;
  const siteText = selectionContext?.site || '';
  const queryText = replyText.trim();
  const hasSession = Boolean(cell?.id && session?.id && worktreePath);
  const hasContent = queryText.length > 0;

  const otherTargets = useMemo(() => {
    const currentKey = `${cell?.id || ''}:${session?.id || ''}`;
    return (sessionTargets || [])
      .filter((target) => target?.cellId && target?.sessionId)
      .filter((target) => `${target.cellId}:${target.sessionId}` !== currentKey)
      .sort((a, b) => {
        const left = `${a.cellName || a.cellId} ${a.sessionName || a.sessionId}`;
        const right = `${b.cellName || b.cellId} ${b.sessionName || b.sessionId}`;
        return left.localeCompare(right);
      });
  }, [cell?.id, session?.id, sessionTargets]);

  useEffect(() => {
    setSelectedTarget(null);
  }, [cell?.id, session?.id]);

  const refreshReplies = useCallback(async () => {
    if (!worktreePath || !cell?.id || !session?.id) {
      setReplyItems([]);
      return;
    }
    setLoadingReplies(true);
    setError('');
    try {
      const list = await listHilItems({
        worktreePath,
        kind: 'reply',
        status: 'all',
      });
      const filtered = (Array.isArray(list) ? list : [])
        .filter((item) => item?.kind === 'reply' && !item?.meta?.archived)
        .filter(
          (item) =>
            item?.meta?.session?.cellId === cell.id && item?.meta?.session?.sessionId === session.id
        )
        .sort((a, b) => Date.parse(a.createdAt || '') - Date.parse(b.createdAt || ''));
      setReplyItems(filtered);
    } catch (loadError) {
      setError(loadError?.message || 'Failed to load replies.');
    } finally {
      setLoadingReplies(false);
    }
  }, [cell?.id, session?.id, worktreePath]);

  useEffect(() => {
    refreshReplies();
  }, [refreshReplies]);

  useEffect(() => {
    setReplyText('');
    setSendMenuOpen(false);
    setError('');
  }, [cell?.id, session?.id]);

  useEffect(() => {
    if (!focusToken) {
      return;
    }
    editorRef.current?.focus?.();
    requestAnimationFrame(() => {
      editorRef.current?.layout?.();
    });
  }, [focusToken]);

  useEffect(() => {
    if (!editorContainerRef.current || !editorRef.current || typeof ResizeObserver === 'undefined') {
      return undefined;
    }
    const observer = new ResizeObserver(() => {
      editorRef.current?.layout?.();
    });
    observer.observe(editorContainerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleArchiveReply = useCallback(async (item) => {
    if (!item?.id || !worktreePath) return;
    try {
        await updateHilItem({
            worktreePath,
            itemId: item.id,
            meta: {
                ...item.meta,
                archived: true
            }
        });
        await refreshReplies();
    } catch (err) {
        console.error('Failed to archive reply', err);
    }
  }, [worktreePath, refreshReplies]);

  const handleReeditReply = useCallback((item) => {
      if (item?.body) {
          setReplyText(item.body);
          editorRef.current?.focus?.();
      }
  }, []);

  const buildTargetMeta = useCallback(
    (type, target) => ({
      type,
      at: new Date().toISOString(),
      cellId: target?.cellId || cell?.id || '',
      sessionId: target?.sessionId || session?.id || '',
      cellName: target?.cellName || cell?.name || '',
      sessionName: target?.sessionName || session?.name || '',
      avatar: target?.avatar || session?.avatar || '',
    }),
    [cell?.id, cell?.name, session?.avatar, session?.id, session?.name]
  );

  const handleCreateReply = useCallback(
    async ({ action }) => {
      if (!hasSession) {
        setError('Select a session before recording replies.');
        return;
      }
      if (!hasContent) {
        setError('Reply content is required.');
        return;
      }
      setSubmitting(true);
      setError('');
      const payload = buildReplyPayload({
        site: siteText,
        timeTag,
        query: queryText,
      });

      let targetMeta = null;
      let effectiveAction = action;

      if (action === 'record') {
          targetMeta = buildTargetMeta('record', null);
      } else if (action === 'send') {
          if (selectedTarget) {
              effectiveAction = 'other';
              targetMeta = buildTargetMeta('other', selectedTarget);
          } else {
              effectiveAction = 'current';
              targetMeta = buildTargetMeta('current', {
                cellId: cell?.id,
                sessionId: session?.id,
                cellName: cell?.name,
                sessionName: session?.name,
                avatar: session?.avatar,
              });
          }
      }

      try {
        await createHilItem({
          worktreePath,
          kind: 'reply',
          body: queryText,
          meta: {
            source: selectionContext ? 'terminal-selection' : 'reply-panel',
            selection: {
              text: selectionContext?.text || '',
              site: siteText || '',
              timeTag,
              query: queryText,
            },
            session: {
              cellId: cell?.id || '',
              cellName: cell?.name || '',
              sessionId: session?.id || '',
              sessionName: session?.name || '',
            },
            sent: {
              targets: [targetMeta],
            },
          },
        });

        if (effectiveAction === 'current') {
          onSendSessionText?.({
            cellId: cell?.id,
            sessionId: session?.id,
            text: normalizeTerminalText(payload),
          });
        }
        if (effectiveAction === 'other' && targetMeta?.cellId && targetMeta?.sessionId) {
          onSendSessionText?.({
            cellId: targetMeta.cellId,
            sessionId: targetMeta.sessionId,
            text: normalizeTerminalText(payload),
          });
        }
        setReplyText('');
        setSendMenuOpen(false);
        await refreshReplies();
      } catch (submitError) {
        setError(submitError?.message || 'Failed to record reply.');
      } finally {
        setSubmitting(false);
      }
    },
    [
      buildTargetMeta,
      cell?.id,
      cell?.name,
      hasContent,
      hasSession,
      onSendSessionText,
      queryText,
      refreshReplies,
      selectionContext,
      selectedTarget,
      session?.avatar,
      session?.id,
      session?.name,
      siteText,
      timeTag,
      worktreePath,
    ]
  );

  if (!cell || !session) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center text-center text-muted-foreground/60 px-6">
        <MessageSquareText size={32} className="mb-3 opacity-30" />
        <p className="text-xs font-semibold uppercase tracking-widest">Reply Panel</p>
        <p className="mt-2 text-[11px]">Select a session to start replying.</p>
      </div>
    );
  }

  const targetLabel = selectedTarget 
    ? `${selectedTarget.sessionName || selectedTarget.sessionId}` 
    : 'Current';

  return (
    <div className="flex h-full w-full flex-col bg-background/50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/20 bg-background/40 px-2 py-1.5 backdrop-blur-sm">
        <div className="flex items-center gap-1.5">
          <AgentAvatarBadge
            avatarId={resolveAvatarId(session?.avatar || session?.id || cell?.id)}
            size={14}
            ringSize={18}
            showRing={true}
            className="opacity-90"
          />
          <div>
            <div className="text-[8px] font-bold uppercase tracking-[0.15em] text-muted-foreground/40 leading-none">
              Session
            </div>
            <div className="text-[10px] font-semibold text-foreground/80 truncate max-w-[160px] leading-tight">
              {session?.name || session?.id}
            </div>
          </div>
        </div>
      </div>

      {/* Replies List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 py-2">
        {loadingReplies ? (
          <div className="flex items-center justify-center py-4 text-[10px] text-muted-foreground/50">
            <Loader2 size={12} className="mr-1.5 animate-spin" />
            Loading...
          </div>
        ) : null}

        {!loadingReplies && replyItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center opacity-40">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/10">
              <Reply size={16} className="text-muted-foreground" />
            </div>
            <div className="mt-2 text-[9px] font-medium uppercase tracking-widest text-muted-foreground">
              Empty
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
             <div className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/30 px-1">
              History
            </div>
            {replyItems.map((item) => (
              <ReplyCard
                key={item.id}
                item={item}
                originSession={item.meta?.session}
                onJumpToSession={onJumpToSession}
                onJumpToMemo={onJumpToMemo}
                onArchive={() => handleArchiveReply(item)}
                onReedit={() => handleReeditReply(item)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Compose Area - Integrated Footer */}
      <div className="border-t border-border/20 bg-background/80 backdrop-blur-md">
        <div className={`relative flex flex-col focus-within:bg-card/40 transition-colors`}>
          
          {/* Header & Controls - Compact & Clear */}
          <div className="flex items-center justify-between px-2.5 py-1.5 bg-muted/10 border-b border-border/10">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                Compose
              </span>
              {/* Target Indicator - Inline if selected */}
              {selectedTarget && (
                  <div className="flex items-center gap-1 text-[9px] text-primary/85 bg-primary/10 rounded-full px-2 py-0.5 border border-primary/20">
                      <AgentAvatarBadge
                          avatarId={resolveAvatarId(selectedTarget.avatar || selectedTarget.sessionId || selectedTarget.cellId)}
                          size={10}
                          showRing={false}
                        />
                      <span className="font-bold truncate opacity-90">To @{selectedTarget.sessionName || selectedTarget.sessionId}</span>
                  </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Tooltip label="Record as Memo" side="top">
                <button
                  type="button"
                  onClick={() => handleCreateReply({ action: 'record' })}
                  disabled={!hasContent || submitting}
                  className={`flex h-6 w-6 items-center justify-center rounded-md border border-border/30 bg-background/50 text-muted-foreground transition-all hover:text-primary hover:border-primary/30 disabled:opacity-30 ${focusRingClass}`}
                >
                   {submitting && !sendMenuOpen ? <Loader2 size={12} className="animate-spin"/> : <StickyNote size={12} />}
                </button>
              </Tooltip>

              <div className="h-4 w-[1px] bg-border/20 mx-0.5" />

              <div className="flex items-center gap-1 bg-background/70 rounded-lg p-0.5 border border-border/20 shadow-inner">
                <div className="relative">
                  <Tooltip label={sendMenuOpen ? null : (selectedTarget ? "Change Target" : "Select Target")} side="top">
                    <button
                      type="button"
                      onClick={() => setSendMenuOpen(!sendMenuOpen)}
                      disabled={!otherTargets.length}
                      className={`flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-all hover:bg-muted/20 hover:text-foreground disabled:opacity-30 ${selectedTarget ? 'text-primary bg-primary/15' : ''} ${focusRingClass}`}
                    >
                      <Users size={12} />
                    </button>
                  </Tooltip>
                  
                  {sendMenuOpen && (
                    <div className="absolute bottom-full right-0 mb-2 w-64 origin-bottom-right overflow-hidden rounded-xl border border-border/20 bg-popover text-popover-foreground shadow-2xl animate-in fade-in zoom-in-95 duration-100 z-50">
                      <div className="px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 border-b border-border/10 bg-muted/5">
                        Route Reply To...
                      </div>
                      <div className="max-h-48 overflow-y-auto custom-scrollbar p-1">
                         <button
                            type="button"
                            onClick={() => { setSelectedTarget(null); setSendMenuOpen(false); }}
                            className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] transition-colors hover:bg-primary/5 hover:text-primary ${!selectedTarget ? 'bg-primary/10 text-primary' : ''}`}
                          >
                            <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <Reply size={10} />
                            </div>
                            <span className="truncate flex-1 font-semibold">Current Session</span>
                          </button>
                        {otherTargets.map((target) => (
                          <button
                            key={`${target.cellId}:${target.sessionId}`}
                            type="button"
                            onClick={() => { setSelectedTarget(target); setSendMenuOpen(false); }}
                            className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] transition-colors hover:bg-primary/5 hover:text-primary ${selectedTarget?.sessionId === target.sessionId ? 'bg-primary/10 text-primary' : ''}`}
                          >
                            <AgentAvatarBadge
                              avatarId={resolveAvatarId(target.avatar || target.sessionId || target.cellId)}
                              size={16}
                              showRing={false}
                            />
                            <span className="truncate flex-1 opacity-80 font-medium">
                              {target.cellName || target.cellId} / {target.sessionName || target.sessionId}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                  
                <Tooltip label={`Send to ${targetLabel}`} side="top">
                  <button
                    type="button"
                    onClick={() => handleCreateReply({ action: 'send' })}
                    disabled={!hasContent || submitting}
                    className={`flex h-6 items-center gap-1.5 rounded-md bg-primary px-3 text-[10px] font-bold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 disabled:opacity-50 active:scale-95 ${focusRingClass}`}
                  >
                    <span>Send</span>
                    {submitting ? <Loader2 size={10} className="animate-spin"/> : <Send size={10} />}
                  </button>
                </Tooltip>
              </div>
            </div>
          </div>
            
           {/* Context Area (Source) - Only shown if selection exists */}
           {selectionContext && (
              <div className="px-3 py-2 bg-black/20 border-b border-border/10">
                <div className="flex flex-col gap-1 rounded-md border border-border/10 bg-muted/5 p-2">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-widest text-primary/50">
                      <Link2 size={10} />
                      <span>Context Cite</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onClearSelection?.()}
                      className="rounded-full p-1 text-muted-foreground/30 hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
                    >
                      <X size={10} />
                    </button>
                  </div>
                  <div className="line-clamp-2 text-[10px] font-mono text-muted-foreground/70 leading-normal">
                    {siteText ? renderSiteSegments(siteText) : <span className="italic opacity-30">No content</span>}
                  </div>
                </div>
              </div>
           )}

          {/* Editor Container - Full Width, No Gap */}
          <div
            ref={editorContainerRef}
            className="relative rounded-lg border border-border/20 bg-black/55 shadow-inner"
            style={{ minHeight: REPLY_EDITOR_HEIGHT }}
          >
            {queryText.length === 0 && (
              <div
                className="pointer-events-none absolute inset-0 z-10 text-muted-foreground/55 font-medium"
                style={{
                  padding: REPLY_EDITOR_PADDING,
                  fontSize: REPLY_EDITOR_FONT_SIZE,
                  lineHeight: `${REPLY_EDITOR_LINE_HEIGHT}px`,
                }}
              >
                Type your reply here...
              </div>
            )}
            <Editor
              height={`${REPLY_EDITOR_HEIGHT}px`}
              theme="vs-dark"
              language="markdown"
              value={replyText}
              onMount={(editor) => {
                editorRef.current = editor;
                editor.updateOptions({
                  fontSize: REPLY_EDITOR_FONT_SIZE,
                  lineHeight: REPLY_EDITOR_LINE_HEIGHT,
                  fontFamily: REPLY_EDITOR_FONT_FAMILY,
                  padding: {
                    top: REPLY_EDITOR_PADDING,
                    bottom: REPLY_EDITOR_PADDING,
                    left: REPLY_EDITOR_PADDING,
                    right: REPLY_EDITOR_PADDING,
                  },
                  minimap: { enabled: false },
                  lineNumbers: 'off',
                  lineNumbersMinChars: 0,
                  lineDecorationsWidth: 0,
                  glyphMargin: false,
                  folding: false,
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  renderLineHighlight: 'none',
                  overviewRulerBorder: false,
                  overviewRulerLanes: 0,
                  backgroundColor: 'transparent',
                  hideCursorInOverviewRuler: true,
                  automaticLayout: true,
                });
                requestAnimationFrame(() => {
                  editor.layout();
                });
              }}
              onChange={(value) => setReplyText(value || '')}
              options={{
                minimap: { enabled: false },
                fontSize: REPLY_EDITOR_FONT_SIZE,
                lineHeight: REPLY_EDITOR_LINE_HEIGHT,
                fontFamily: REPLY_EDITOR_FONT_FAMILY,
                lineNumbers: 'off',
                lineNumbersMinChars: 0,
                lineDecorationsWidth: 0,
                glyphMargin: false,
                folding: false,
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                padding: {
                  top: REPLY_EDITOR_PADDING,
                  bottom: REPLY_EDITOR_PADDING,
                  left: REPLY_EDITOR_PADDING,
                  right: REPLY_EDITOR_PADDING,
                },
                renderLineHighlight: 'none',
                overviewRulerBorder: false,
                overviewRulerLanes: 0,
                backgroundColor: 'transparent',
                hideCursorInOverviewRuler: true,
                automaticLayout: true,
                cursorWidth: 2,
                scrollbar: {
                  vertical: 'hidden',
                  horizontal: 'hidden'
                }
              }}
            />
          </div>

          {error && (
            <div className="px-3 py-2 bg-rose-500/5 border-t border-rose-500/10 text-[9px] text-rose-400 font-medium">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReplyCard({ item, originSession, onJumpToSession, onJumpToMemo, onArchive, onReedit }) {
  const sentTargets = Array.isArray(item?.meta?.sent?.targets) ? item.meta.sent.targets : [];
  const createdLabel = item?.createdAt
    ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    : '';
  const site = item?.meta?.selection?.site || '';

  // Use the primary target for the header
  const target = sentTargets[0];
  const isRecord = target?.type === 'record';

  return (
    <div className="group relative rounded-lg border border-border/10 bg-card/25 p-2 transition-all hover:bg-card/40 hover:shadow-sm">
      <div className="flex flex-col gap-1.5">
        {/* Header - Flow from Origin to Target */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 overflow-hidden min-w-0">
             <div className="flex h-3.5 w-3.5 items-center justify-center rounded bg-primary/10 text-primary shrink-0">
                <Reply size={8} />
             </div>
             <div className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-tight text-muted-foreground/40 truncate">
                <span className="truncate max-w-[50px] opacity-60">
                  {originSession?.sessionName || originSession?.sessionId || 'Reply'}
                </span>
                
                {target && (
                  <>
                    <ArrowUpRight size={8} className="shrink-0 opacity-30" />
                    <button
                      type="button"
                      onClick={() => {
                        if (isRecord) {
                          onJumpToMemo?.(item);
                        } else if (target.cellId && target.sessionId) {
                          onJumpToSession?.(target.cellId, target.sessionId);
                        }
                      }}
                      className="flex items-center gap-1 text-primary/70 hover:text-primary transition-colors truncate"
                    >
                      {isRecord ? (
                        <StickyNote size={8} className="opacity-60" />
                      ) : (
                        <AgentAvatarBadge
                          avatarId={resolveAvatarId(target.avatar || target.sessionId || target.cellId)}
                          size={10}
                          showRing={false}
                        />
                      )}
                      <span className="truncate">
                        {isRecord ? 'Record' : (target.sessionName || target.sessionId)}
                      </span>
                    </button>
                  </>
                )}
             </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
              <span className="text-[7px] font-medium text-muted-foreground/20 font-mono">
                  {createdLabel}
              </span>
               <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={onReedit} className="p-0.5 hover:text-foreground text-muted-foreground/30 transition-colors" title="Edit">
                      <Edit2 size={8} />
                  </button>
                   <button onClick={onArchive} className="p-0.5 hover:text-rose-400 text-muted-foreground/30 transition-colors" title="Archive">
                      <Trash2 size={8} />
                  </button>
              </div>
          </div>
        </div>

        {/* Content Area - Quote then Body */}
        <div className="flex flex-col gap-1">
          {/* Quote Section */}
          {site && (
            <div className="border-l-2 border-primary/15 bg-primary/5 py-0.5 pl-1.5 pr-1 text-[8px] text-muted-foreground/50 font-mono line-clamp-2 hover:line-clamp-none transition-all">
               {renderSiteSegments(site)}
            </div>
          )}

          {/* Content Body */}
          <div className="text-[10px] leading-relaxed text-foreground/80 whitespace-pre-wrap px-0.5">
            {item?.body || ''}
          </div>
        </div>
      </div>
    </div>
  );
}
