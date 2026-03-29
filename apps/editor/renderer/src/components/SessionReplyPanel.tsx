import React, { useEffect, useRef } from 'react';
import { MessageSquareText } from 'lucide-react';
import { AgentAvatarBadge } from './ui/AgentAvatarBadge';
import { resolveAvatarId } from '../utils/agentAvatar';
import { SessionReplyComposer } from './sessionReply/SessionReplyComposer';
import { SessionReplyHistory } from './sessionReply/SessionReplyHistory';
import { useSessionReplyModel } from './sessionReply/useSessionReplyModel';

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
  const {
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
  } = useSessionReplyModel({
    cell,
    session,
    worktreePath,
    selection,
    resolvedQuickPrompts,
    sessionTargets,
    editorRef,
  });

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

  if (!cell || !session) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center text-center text-muted-foreground/60 px-6">
        <MessageSquareText size={32} className="mb-3 opacity-30" />
        <p className="text-xs font-semibold uppercase tracking-widest">Reply Panel</p>
        <p className="mt-2 text-[11px]">Select a session to start replying.</p>
      </div>
    );
  }

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
          currentCellId={cell?.id || ''}
          currentSessionId={session?.id || ''}
          resolvedQuickPrompts={resolvedQuickPrompts}
          sessionTargets={sessionTargets}
          scopeKey={`${cell?.id || ''}:${session?.id || ''}`}
          replyText={replyText}
          setReplyText={setReplyText}
          queryText={queryText}
          error={error}
          handleInsertQuickPrompt={handleInsertQuickPrompt}
          hasContent={hasContent}
          submitting={submitting}
          handleCreateReply={handleCreateReply}
          selectionContext={selectionContext}
          siteText={siteText}
        onClearSelection={onClearSelection}
      />
    </div>
  );
}
