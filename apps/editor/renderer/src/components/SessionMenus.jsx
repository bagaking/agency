import React from 'react';

export function SessionOverflowMenu({
  isOpen,
  position,
  containerRef,
  detachedSessions,
  closedSessions,
  onSelectDetached,
  onRestoreClosed,
}) {
  if (!isOpen) {
    return null;
  }

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
          {detachedSessions.map((session) => (
            <button
              key={session.id}
              onClick={() => onSelectDetached(session)}
              className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-muted text-muted-foreground hover:text-foreground truncate transition-colors"
            >
              {session.name || session.id}
            </button>
          ))}
        </>
      )}
      {closedSessions.length > 0 && (
        <>
          <div className="px-2 py-1 text-[10px] uppercase font-bold text-muted-foreground">
            Closed Sessions
          </div>
          {closedSessions.map((session) => (
            <button
              key={session.id}
              onClick={() => onRestoreClosed(session)}
              className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-muted text-muted-foreground hover:text-foreground truncate transition-colors"
            >
              {session.name || session.id}
            </button>
          ))}
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
