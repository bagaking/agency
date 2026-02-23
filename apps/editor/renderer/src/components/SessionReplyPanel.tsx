import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MessageSquareText,
} from 'lucide-react';
import {
  confirmDelivery,
  createHilItem,
  listHilItems,
  startDelivery,
  updateHilItem,
} from '../services/agencyBridge';
import { AgentAvatarBadge } from './ui/AgentAvatarBadge';
import { resolveAvatarId } from '../utils/agentAvatar';
import { SessionReplyComposer } from './sessionReply/SessionReplyComposer';
import { SessionReplyHistory } from './sessionReply/SessionReplyHistory';
import { buildReplyPayload, formatReplyTimeTag, normalizeReplyTerminalPayload } from './sessionReply/sessionReplyShared';
import { resolveReplyDispatchTarget } from './sessionReply/sessionReplyRouting';

export function SessionReplyPanel({
  cell,
  session,
  worktreePath,
  selection,
  focusToken,
  resolvedQuickPrompts = [],
  sessionTargets = [],
  onClearSelection,
  onJumpToSession,
  onJumpToMemo,
}: any) {
  const editorRef = useRef(null);
  const editorContainerRef = useRef(null);
  const quickPromptMenuRef = useRef(null);
  const quickPromptTriggerRef = useRef(null);
  const [replyText, setReplyText] = useState('');
  const [sendMenuOpen, setSendMenuOpen] = useState(false);
  const [quickPromptMenuOpen, setQuickPromptMenuOpen] = useState(false);
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
    selectionContext?.timeTag || formatReplyTimeTag(selectionContext?.updatedAt);
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
  const availableQuickPrompts = useMemo(
    () =>
      (resolvedQuickPrompts || []).filter(
        (prompt) => prompt?.enabled !== false && String(prompt?.text || '').trim()
      ),
    [resolvedQuickPrompts]
  );

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
    setQuickPromptMenuOpen(false);
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

  useEffect(() => {
    if (!quickPromptMenuOpen) {
      return undefined;
    }
    const handlePointerDown = (event) => {
      if (quickPromptMenuRef.current?.contains(event.target)) {
        return;
      }
      if (quickPromptTriggerRef.current?.contains(event.target)) {
        return;
      }
      setQuickPromptMenuOpen(false);
    };
    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, [quickPromptMenuOpen]);

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

  const handleInsertQuickPrompt = useCallback((value) => {
    const text = String(value || '');
    if (!text) {
      return;
    }
    const editor = editorRef.current;
    if (editor?.executeEdits) {
      const selection = editor.getSelection?.();
      const position = editor.getPosition?.() || { lineNumber: 1, column: 1 };
      const range = selection || {
        startLineNumber: position.lineNumber,
        startColumn: position.column,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      };
      editor.executeEdits('reply-quick-prompts', [
        {
          range,
          text,
          forceMoveMarkers: true,
        },
      ]);
      const nextValue = editor.getModel?.()?.getValue?.() || '';
      setReplyText(nextValue);
      editor.focus?.();
    } else {
      setReplyText((current) => `${current}${text}`);
    }
    setQuickPromptMenuOpen(false);
  }, []);

  const handleCreateReply = useCallback(
    async ({ action }: any) => {
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

      const { effectiveAction, targetMeta } = resolveReplyDispatchTarget({
        action,
        selectedTarget,
        cell,
        session,
      });

      try {
        const createdReply = await createHilItem({
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
        const shouldDispatch = effectiveAction === 'current' || effectiveAction === 'other';
        const targetCellId = targetMeta?.cellId || cell?.id || '';
        const targetSessionId = targetMeta?.sessionId || session?.id || '';
        if (shouldDispatch && targetSessionId) {
          const dispatchPayload = normalizeReplyTerminalPayload(payload);
          const run = await startDelivery({
            request: {
              worktreePath,
              source: 'session',
              mode: 'quick',
              description: queryText,
              sessionId: targetSessionId,
              cellId: targetCellId,
              selectedItems: [
                {
                  id: String(createdReply?.id || ''),
                  kind: String(createdReply?.kind || 'reply'),
                  body: String(createdReply?.body || queryText),
                  anchor: createdReply?.anchor || null,
                  references: Array.isArray(createdReply?.references) ? createdReply.references : [],
                },
              ],
              metadata: {
                command: dispatchPayload,
                sourceKind: 'reply',
                replyItemId: createdReply?.id || '',
                promoted: true,
                sourceSession: {
                  cellId: cell?.id || '',
                  sessionId: session?.id || '',
                },
                targetSession: targetMeta || null,
                selection: {
                  site: siteText || '',
                  timeTag,
                },
              },
              dispatch: {
                label: 'Session Reply (quick)',
                appendEnter: false,
                doubleEnter: false,
              },
            },
          });
          const draftId = String(run?.draftId || '').trim();
          if (!draftId) {
            throw new Error('Failed to persist session delivery run.');
          }
          await confirmDelivery({
            worktreePath,
            draftId,
          });
          await updateHilItem({
            worktreePath,
            itemId: createdReply?.id,
            patch: {
              meta: {
                ...(createdReply?.meta || {}),
                deliverySource: 'session',
                deliveryMode: 'quick',
                deliveryDraftId: draftId,
                deliverySession: {
                  cellId: targetCellId,
                  sessionId: targetSessionId,
                },
              },
            },
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
      cell?.id,
      cell?.name,
      hasContent,
      hasSession,
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

      <SessionReplyHistory
        loadingReplies={loadingReplies}
        replyItems={replyItems}
        onJumpToSession={onJumpToSession}
        onJumpToMemo={onJumpToMemo}
        onArchiveReply={handleArchiveReply}
        onReeditReply={handleReeditReply}
      />

      <SessionReplyComposer
        editorRef={editorRef}
        editorContainerRef={editorContainerRef}
        quickPromptMenuRef={quickPromptMenuRef}
        quickPromptTriggerRef={quickPromptTriggerRef}
        replyText={replyText}
        setReplyText={setReplyText}
        queryText={queryText}
        error={error}
        availableQuickPrompts={availableQuickPrompts}
        quickPromptMenuOpen={quickPromptMenuOpen}
        setQuickPromptMenuOpen={setQuickPromptMenuOpen}
        handleInsertQuickPrompt={handleInsertQuickPrompt}
        selectedTarget={selectedTarget}
        setSelectedTarget={setSelectedTarget}
        otherTargets={otherTargets}
        sendMenuOpen={sendMenuOpen}
        setSendMenuOpen={setSendMenuOpen}
        hasContent={hasContent}
        submitting={submitting}
        targetLabel={targetLabel}
        handleCreateReply={handleCreateReply}
        selectionContext={selectionContext}
        siteText={siteText}
        onClearSelection={onClearSelection}
      />
    </div>
  );
}
