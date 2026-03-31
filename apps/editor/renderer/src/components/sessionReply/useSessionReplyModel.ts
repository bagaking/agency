import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  confirmDelivery,
  createSessionReply,
  listSessionReplies,
  startDelivery,
  updateSessionReply,
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
  const projectRoot = cell?.projectRoot || '';
  const sessionId = session?.id || '';
  const sessionName = session?.name || '';
  const sessionAvatar = session?.avatar;
  const scopeKey = `${cellId}:${sessionId}`;
  const activeScopeRef = useRef(scopeKey);
  const refreshRequestRef = useRef(0);
  const submitRequestRef = useRef(0);

  useEffect(() => {
    activeScopeRef.current = scopeKey;
    refreshRequestRef.current += 1;
    submitRequestRef.current += 1;
  }, [scopeKey]);

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
    const requestScope = scopeKey;
    if (!worktreePath || !cellId || !sessionId) {
      setReplyItems([]);
      return;
    }
    if (activeScopeRef.current !== requestScope) {
      return;
    }
    const requestId = refreshRequestRef.current + 1;
    refreshRequestRef.current = requestId;
    setLoadingReplies(true);
    setError('');
    try {
      const list = await listSessionReplies({
        worktreePath,
        cellId,
        sessionId,
        includeArchived: false,
      });
      const filtered = (Array.isArray(list) ? list : []).sort(
        (a, b) => Date.parse(a.createdAt || '') - Date.parse(b.createdAt || '')
      );
      if (
        activeScopeRef.current !== requestScope ||
        refreshRequestRef.current !== requestId
      ) {
        return;
      }
      setReplyItems(filtered);
    } catch (loadError: any) {
      if (
        activeScopeRef.current !== requestScope ||
        refreshRequestRef.current !== requestId
      ) {
        return;
      }
      setError(loadError?.message || 'Failed to load replies.');
    } finally {
      if (
        activeScopeRef.current !== requestScope ||
        refreshRequestRef.current !== requestId
      ) {
        return;
      }
      setLoadingReplies(false);
    }
  }, [cellId, scopeKey, sessionId, worktreePath]);

  useEffect(() => {
    refreshReplies();
  }, [refreshReplies]);

  useEffect(() => {
    setReplyText('');
    setReplyItems([]);
    setError('');
    setLoadingReplies(false);
    setSubmitting(false);
  }, [scopeKey]);

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
        await updateSessionReply({
          worktreePath,
          replyId: item.id,
          patch: {
            status: 'archived',
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
      const requestId = submitRequestRef.current + 1;
      submitRequestRef.current = requestId;
      const requestScope = scopeKey;
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
        const createdReply = await createSessionReply({
          worktreePath,
          body: queryText,
          owner: {
            cellId,
            cellName,
            sessionId,
            sessionName,
          },
          capture: {
            source: selectionContext ? 'terminal-selection' : 'reply-panel',
            selection: {
              text: selectionContext?.text || '',
              site: siteText || '',
              timeTag,
              query: queryText,
            },
          },
          targets: targetMeta ? [targetMeta] : [],
        });

        const shouldDispatch = effectiveAction === 'current' || effectiveAction === 'other';
        const targetCellId = targetMeta?.cellId || cellId;
        const targetSessionId = targetMeta?.sessionId || sessionId;

        if (shouldDispatch && targetSessionId) {
          const dispatchPayload = normalizeReplyTerminalPayload(payload);
          const run = await startDelivery({
            request: {
              worktreePath,
              repoRootPath: projectRoot,
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
            repoRootPath: projectRoot,
            cellId: targetCellId,
            draftId,
          });
        }

        const scopeStillVisible = activeScopeRef.current === requestScope;
        const requestStillCurrent =
          scopeStillVisible && submitRequestRef.current === requestId;

        if (scopeStillVisible) {
          await refreshReplies();
        }
        if (!requestStillCurrent) {
          return;
        }
        setReplyText('');
      } catch (submitError: any) {
        if (
          activeScopeRef.current !== requestScope ||
          submitRequestRef.current !== requestId
        ) {
          return;
        }
        setError(submitError?.message || 'Failed to record reply.');
      } finally {
        if (
          activeScopeRef.current !== requestScope ||
          submitRequestRef.current !== requestId
        ) {
          return;
        }
        setSubmitting(false);
      }
    },
    [
      cellId,
      cellName,
      hasContent,
      hasSession,
      projectRoot,
      queryText,
      refreshReplies,
      scopeKey,
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
