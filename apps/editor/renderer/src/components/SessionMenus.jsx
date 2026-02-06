import React from 'react';
import { AgentAvatarBadge } from './ui/AgentAvatarBadge.jsx';
import { resolveSessionAvatarId } from '../utils/agentAvatar.js';

export function SessionOverflowMenu({
  isOpen,
  position,
  containerRef,
  detachedSessions,
  closedSessions,
  onSelectDetached,
  onRestoreClosed,
  cell,
}) {
  if (!isOpen) {
    return null;
  }

  const renderSessionRow = (session, { onClick, isClosed }) => (
    <button
      key={session.id}
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] hover:bg-muted text-muted-foreground hover:text-foreground truncate transition-colors"
    >
      <AgentAvatarBadge
        avatarId={resolveSessionAvatarId(session, cell)}
        size={16}
        ringSize={20}
        lastActivityAt={session?.lastActivityAt}
        isClosed={isClosed}
      />
      <span className="min-w-0 flex-1 truncate">{session.name || session.id}</span>
    </button>
  );

  return (
    <div
      ref={containerRef}
      className="fixed z-[60] w-48 rounded-md border border-border bg-popover py-1 shadow-xl text-[11px]"
      style={{ top: position.y, left: position.x }}
    >
      {detachedSessions.length > 0 && (
        <>
          <div className="px-2 py-1 text-[10px] uppercase font-bold text-muted-foreground">
            Detached Sessions
          </div>
          {detachedSessions.map((session) =>
            renderSessionRow(session, {
              onClick: () => onSelectDetached(session),
              isClosed: false,
            })
          )}
        </>
      )}
      {closedSessions.length > 0 && (
        <>
          <div className="px-2 py-1 text-[10px] uppercase font-bold text-muted-foreground">
            Closed Sessions
          </div>
          {closedSessions.map((session) =>
            renderSessionRow(session, {
              onClick: () => onRestoreClosed(session),
              isClosed: true,
            })
          )}
        </>
      )}
    </div>
  );
}

export function SessionContextMenu({
  isOpen,
  position,
  containerRef,
  onDetach,
  onRename,
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="fixed z-[60] w-44 rounded-md border border-border bg-popover py-1 shadow-xl text-[11px]"
      style={{ top: position.y, left: position.x }}
    >
      <button
        onClick={onDetach}
        className="w-full text-left px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        Detach Session
      </button>
      <button
        onClick={onRename}
        className="w-full text-left px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        Rename Session
      </button>
    </div>
  );
}

export function SessionCreateMenu({
  isOpen,
  position,
  containerRef,
  profiles,
  onCreateBase,
  onCreateProfile,
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="fixed z-[60] w-60 rounded-md border border-border bg-popover py-1 text-[11px] shadow-xl"
      style={{ top: position.y, left: position.x }}
    >
      <div className="px-2 py-1 text-[10px] uppercase font-bold text-muted-foreground">
        New Session
      </div>
      <button
        type="button"
        onClick={onCreateBase}
        className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-muted text-muted-foreground hover:text-foreground truncate transition-colors"
      >
        Blank Session
      </button>
      {profiles && profiles.length ? (
        <>
          <div className="px-2 pt-2 pb-1 text-[10px] uppercase font-bold text-muted-foreground">
            Terminus Profiles
          </div>
          {profiles.map((profile) => (
            <button
              key={profile.id}
              type="button"
              onClick={() => onCreateProfile(profile)}
              title={profile.startCommand || profile.label || profile.id}
              className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-muted text-muted-foreground hover:text-foreground truncate transition-colors"
            >
              {profile.label || profile.id}
            </button>
          ))}
        </>
      ) : null}
    </div>
  );
}
