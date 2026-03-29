import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  confirmDelivery,
  createHilItem,
  listHilItems,
  startDelivery,
  updateHilItem,
} from '../../services/agencyBridge';
import {
  buildReplyPayload,
  formatReplyTimeTag,
  normalizeReplyTerminalPayload,
} from './sessionReplyShared';
import { resolveReplyDispatchTarget } from './sessionReplyRouting';

export function useSessionReplyModel({
  cell,
  session,
  worktreePath,
  selection,
  resolvedQuickPrompts = [],
  sessionTargets = [],
  editorRef,
}: any) {
  const [replyText, setReplyText] = useState('');
  const [replyItems, setReplyItems] = useState([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const cellId = cell?.id || '';
  const cellName = cell?.name || '';
  const sessionId = session?.id || '';
  const sessionName = session?.name || '';
  const sessionAvatar = session?.avatar;

  const selectionContext = useMemo(() => {
    if (!selection?.text) {
      return null;
    }
    if (selection?.cellId && selection.cellId !== cellId) {
      return null;
    }
    if (selection?.sessionId && selection.sessionId !== sessionId) {
      return null;
    }
    return selection;
  }, [cellId, selection, sessionId]);

  const timeTag = selectionContext?.timeTag || formatReplyTimeTag(selectionContext?.updatedAt);
  const siteText = selectionContext?.site || '';
  const queryText = replyText.trim();
  const hasSession = Boolean(cellId && sessionId && worktreePath);
  const hasContent = queryText.length > 0;

  const refreshReplies = useCallback(async () => {
    if (!worktreePath || !cellId || !sessionId) {
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
            item?.meta?.session?.cellId === cellId && item?.meta?.session?.sessionId === sessionId
        )
        .sort((a, b) => Date.parse(a.createdAt || '') - Date.parse(b.createdAt || ''));
      setReplyItems(filtered);
    } catch (loadError: any) {
      setError(loadError?.message || 'Failed to load replies.');
    } finally {
      setLoadingReplies(false);
    }
  }, [cellId, sessionId, worktreePath]);

  useEffect(() => {
    refreshReplies();
  }, [refreshReplies]);

  useEffect(() => {
    setReplyText('');
    setError('');
  }, [cellId, sessionId]);

  const availableQuickPrompts = useMemo(
    () =>
      (resolvedQuickPrompts || []).filter(
        (prompt: any) => prompt?.enabled !== false && String(prompt?.text || '').trim()
      ),
    [resolvedQuickPrompts]
  );

  const otherTargets = useMemo(() => {
    const currentKey = `${cellId}:${sessionId}`;
    return (sessionTargets || [])
      .filter((target: any) => target?.cellId && target?.sessionId)
      .filter((target: any) => `${target.cellId}:${target.sessionId}` !== currentKey)
      .sort((a: any, b: any) => {
        const left = `${a.cellName || a.cellId} ${a.sessionName || a.sessionId}`;
        const right = `${b.cellName || b.cellId} ${b.sessionName || b.sessionId}`;
        return left.localeCompare(right);
      });
  }, [cellId, sessionId, sessionTargets]);

  const handleArchiveReply = useCallback(
    async (item: any) => {
      if (!item?.id || !worktreePath) {
        return;
      }
      try {
        await updateHilItem({
          worktreePath,
          itemId: item.id,
          meta: {
            ...item.meta,
            archived: true,
          },
        });
        await refreshReplies();
      } catch (archiveError) {
        console.error('Failed to archive reply', archiveError);
      }
    },
    [refreshReplies, worktreePath]
  );

  const handleReeditReply = useCallback(
    (item: any) => {
      if (!item?.body) {
        return;
      }
      setReplyText(item.body);
      editorRef.current?.focus?.();
    },
    [editorRef]
  );

  const handleInsertQuickPrompt = useCallback(
    (value: any) => {
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
        return;
      }
      setReplyText((current) => `${current}${text}`);
    },
    [editorRef]
  );

  const handleCreateReply = useCallback(
    async ({ action, target }: any) => {
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
        selectedTarget: target || null,
        cell: {
          id: cellId,
          name: cellName,
        },
        session: {
          id: sessionId,
          name: sessionName,
          avatar: sessionAvatar,
        },
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
              cellId,
              cellName,
              sessionId,
              sessionName,
            },
            sent: {
              targets: [targetMeta],
            },
          },
        });

        const shouldDispatch = effectiveAction === 'current' || effectiveAction === 'other';
        const targetCellId = targetMeta?.cellId || cellId;
        const targetSessionId = targetMeta?.sessionId || sessionId;

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
                  references: Array.isArray(createdReply?.references)
                    ? createdReply.references
                    : [],
                },
              ],
              metadata: {
                command: dispatchPayload,
                sourceKind: 'reply',
                replyItemId: createdReply?.id || '',
                promoted: true,
                sourceSession: {
                  cellId,
                  sessionId,
                },
                targetSession: targetMeta || null,
                selection: {
                  site: siteText || '',
                  timeTag,
                },
              },
              dispatch: {
                label: 'Session Reply (quick)',
                appendEnter: true,
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
        await refreshReplies();
      } catch (submitError: any) {
        setError(submitError?.message || 'Failed to record reply.');
      } finally {
        setSubmitting(false);
      }
    },
    [
      cellId,
      cellName,
      hasContent,
      hasSession,
      queryText,
      refreshReplies,
      selectionContext,
      sessionAvatar,
      sessionId,
      sessionName,
      siteText,
      timeTag,
      worktreePath,
    ]
  );

  return {
    availableQuickPrompts,
    error,
    handleArchiveReply,
    handleCreateReply,
    handleInsertQuickPrompt,
    handleReeditReply,
    hasContent,
    loadingReplies,
    otherTargets,
    queryText,
    replyItems,
    replyText,
    selectionContext,
    setReplyText,
    siteText,
    submitting,
  };
}
