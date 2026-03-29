import React from 'react';
import { ArrowUpRight, Edit2, Loader2, Reply, StickyNote, Trash2 } from 'lucide-react';

import { resolveAvatarId } from '../../utils/agentAvatar';
import { AgentAvatarBadge } from '../ui/AgentAvatarBadge';
import { focusRing } from '../ui/focusRing';
import { renderReplySiteSegments } from './sessionReplyShared';

export function SessionReplyHistory({
  loadingReplies,
  replyItems,
  onJumpToSession,
  onJumpToMemo,
  onArchiveReply,
  onReeditReply,
}: any) {
  const focusRingClass = focusRing.default;

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar px-2 py-2">
      {loadingReplies ? (
        <div aria-live="polite" className="flex items-center justify-center py-4 text-[10px] text-muted-foreground/50">
          <Loader2 size={12} className="mr-1.5 animate-spin" />
          Loading…
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
          <div className="mt-1 max-w-[160px] text-[9px] leading-relaxed text-muted-foreground/80">
            Record a memo or route a reply to another session.
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/30 px-1">
            History
          </div>
          {replyItems.map((item: any) => (
            <SessionReplyHistoryCard
              key={item.id}
              item={item}
              originSession={item.meta?.session}
              onJumpToSession={onJumpToSession}
              onJumpToMemo={onJumpToMemo}
              onArchive={() => onArchiveReply(item)}
              onReedit={() => onReeditReply(item)}
              focusRingClass={focusRingClass}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SessionReplyHistoryCard({
  item,
  originSession,
  onJumpToSession,
  onJumpToMemo,
  onArchive,
  onReedit,
  focusRingClass,
}: any) {
  const sentTargets = Array.isArray(item?.meta?.sent?.targets) ? item.meta.sent.targets : [];
  const createdLabel = item?.createdAt
    ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    : '';
  const site = item?.meta?.selection?.site || '';

  const target = sentTargets[0];
  const isRecord = target?.type === 'record';

  return (
    <div className="group relative rounded-lg border border-border/10 bg-card/25 p-2 transition-colors hover:bg-card/40 hover:shadow-sm">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 overflow-hidden min-w-0">
            <div className="flex h-3.5 w-3.5 items-center justify-center rounded bg-primary/10 text-primary shrink-0">
              <Reply size={8} />
            </div>
            <div className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-tight text-muted-foreground/40 truncate">
              <span className="truncate max-w-[50px] opacity-60">
                {originSession?.sessionName || originSession?.sessionId || 'Reply'}
              </span>

              {target ? (
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
                    aria-label={
                      isRecord
                        ? 'Open recorded reply in memo'
                        : `Jump to ${target.sessionName || target.sessionId}`
                    }
                    className={`flex items-center gap-1 truncate text-primary/70 transition-colors hover:text-primary ${focusRingClass}`}
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
                      {isRecord ? 'Record' : target.sessionName || target.sessionId}
                    </span>
                  </button>
                </>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <span className="font-mono text-[7px] font-medium tabular-nums text-muted-foreground/20">{createdLabel}</span>
            <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
              <button
                type="button"
                onClick={onReedit}
                aria-label="Edit reply"
                className={`p-0.5 text-muted-foreground/30 transition-colors hover:text-foreground ${focusRingClass}`}
                title="Edit"
              >
                <Edit2 size={8} />
              </button>
              <button
                type="button"
                onClick={onArchive}
                aria-label="Archive reply"
                className={`p-0.5 text-muted-foreground/30 transition-colors hover:text-rose-400 ${focusRingClass}`}
                title="Archive"
              >
                <Trash2 size={8} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          {site ? (
            <div className="border-l-2 border-primary/15 bg-primary/5 py-0.5 pl-1.5 pr-1 font-mono text-[8px] text-muted-foreground/50 line-clamp-2 hover:line-clamp-none">
              {renderReplySiteSegments(site)}
            </div>
          ) : null}

          <div className="text-[10px] leading-relaxed text-foreground/80 whitespace-pre-wrap px-0.5">
            {item?.body || ''}
          </div>
        </div>
      </div>
    </div>
  );
}
