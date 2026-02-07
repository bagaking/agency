import React, { useLayoutEffect, useMemo, useState } from 'react';
import { AgentAvatarBadge } from '../ui/AgentAvatarBadge.jsx';
import { resolveSessionAvatarId } from '../../utils/agentAvatar';

const GAP = 6;
const MARGIN = 8;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function SessionMapOfflineMenu({
  isOpen,
  position,
  anchorRect,
  containerRef,
  sessions,
  cell,
  cellId,
  onSelectSession,
}) {
  const [style, setStyle] = useState(null);
  const listKey = useMemo(
    () => (sessions || []).map((session) => session.id).join('|'),
    [sessions]
  );

  useLayoutEffect(() => {
    if (!isOpen) {
      setStyle(null);
      return;
    }
    if (!containerRef?.current) {
      setStyle({ top: position.y, left: position.x });
      return;
    }
    const menuRect = containerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const anchor = anchorRect || containerRef.current.getBoundingClientRect();

    let left = position.x;
    let top = position.y;

    if (left + menuRect.width > viewportWidth - MARGIN) {
      left = anchor.right - menuRect.width;
    }
    if (top + menuRect.height > viewportHeight - MARGIN) {
      top = anchor.top - menuRect.height - GAP;
    }

    left = clamp(left, MARGIN, viewportWidth - menuRect.width - MARGIN);
    top = clamp(top, MARGIN, viewportHeight - menuRect.height - MARGIN);

    setStyle((current) => {
      if (current && current.top === top && current.left === left) {
        return current;
      }
      return { top, left };
    });
  }, [isOpen, position.x, position.y, anchorRect, containerRef, listKey]);

  if (!isOpen) {
    return null;
  }

  const menuStyle = style || { top: position.y, left: position.x };

  return (
    <div
      ref={containerRef}
      className="fixed z-[70] w-56 rounded-lg border border-border bg-popover py-1 text-[11px] shadow-xl pointer-events-auto"
      style={menuStyle}
    >
      <div className="px-2 py-1 text-[10px] font-bold uppercase text-muted-foreground">
        Offline Sessions
      </div>
      {sessions.map((session) => (
        <button
          key={session.id}
          type="button"
          onClick={() => onSelectSession(cellId, session.id)}
          className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <span className="flex min-w-0 items-center gap-2">
            <AgentAvatarBadge
              avatarId={resolveSessionAvatarId(session, cell)}
              size={18}
              ringSize={22}
              lastActivityAt={session?.lastActivityAt}
              isClosed
            />
            <span className="truncate">{session.name || session.id}</span>
          </span>
          <span className="text-[10px] uppercase text-muted-foreground/70">
            {session.status || 'offline'}
          </span>
        </button>
      ))}
    </div>
  );
}
