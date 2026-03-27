import React from 'react';
import { AgentAvatarBadge } from './ui/AgentAvatarBadge';
import { focusRing } from './ui/focusRing';
import { resolveSessionAvatarId } from '../utils/agentAvatar';
import { buildProfileCreateActions } from '../utils/terminusSettings';
import { Settings } from 'lucide-react';

export function SessionOverflowMenu({
  isOpen,
  position,
  containerRef,
  detachedSessions,
  closedSessions,
  onSelectDetached,
  onRestoreClosed,
  cell,
}: any) {
  if (!isOpen) {
    return null;
  }

  const renderSessionRow = (session, { onClick, isClosed }: any) => (
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
  showSmartForkByCommander = false,
  showSmartNameByCommander = false,
  onSmartNameByCommander,
  onCreateSubTerminal,
  onCreateFork,
  onDetach,
  onRename,
  onContinueOnMobileDirect,
  onContinueOnMobileHub,
  onContinueOnMobileProxy,
  canContinueOnMobile = true,
}: any) {
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
        onClick={onCreateSubTerminal}
        className="w-full text-left px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        Create Sub Terminal
      </button>
      {showSmartForkByCommander ? (
        <button
          onClick={onCreateFork}
          className="w-full text-left px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          Smart Fork [by commander]
        </button>
      ) : null}
      {showSmartNameByCommander ? (
        <button
          onClick={onSmartNameByCommander}
          className="w-full text-left px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          Smart Name [by commander]
        </button>
      ) : null}
      <div className="my-1 border-t border-border/70" />
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
      <button
        onClick={onContinueOnMobileDirect}
        disabled={!canContinueOnMobile}
        className="w-full text-left px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:cursor-not-allowed disabled:opacity-40"
      >
        Continue on Mobile (Direct)
      </button>
      <button
        onClick={onContinueOnMobileHub}
        disabled={!canContinueOnMobile}
        className="w-full text-left px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:cursor-not-allowed disabled:opacity-40"
      >
        Continue on Mobile (Hub)
      </button>
      <button
        onClick={onContinueOnMobileProxy}
        disabled={!canContinueOnMobile}
        className="w-full text-left px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:cursor-not-allowed disabled:opacity-40"
      >
        Continue on Mobile (Proxy)
      </button>
    </div>
  );
}

const summarizeCommand = (value, max = 56) => {
  const text = String(value || '').trim();
  if (!text) {
    return '';
  }
  const firstLine = text.split(/[\r\n]+/)[0];
  if (firstLine.length <= max) {
    return firstLine;
  }
  return `${firstLine.slice(0, max - 1)}…`;
};

const actionToneClass = (mode) =>
  mode === 'start'
    ? 'hover:text-emerald-400 hover:bg-emerald-400/5'
    : mode === 'resume'
      ? 'hover:text-blue-400 hover:bg-blue-400/5'
      : 'hover:text-violet-400 hover:bg-violet-400/5';

export function SessionCreateMenu({
  isOpen,
  position,
  containerRef,
  profiles,
  onCreateBase,
  onCreateProfile,
  onConfigureProfile,
}: any) {
  if (!isOpen) {
    return null;
  }

  const focusRingClass = focusRing.default;
  const profileRows = (profiles || [])
    .map((profile) => {
      const actions = buildProfileCreateActions(profile);
      if (!actions.length) {
        return null;
      }
      return {
        key: profile?.id || profile?.label,
        profile,
        profileLabel: profile?.label || profile?.id || 'Profile',
        actions,
      };
    })
    .filter(Boolean);

  return (
    <div
      ref={containerRef}
      className="fixed z-[60] w-[23rem] animate-tab-in rounded-xl border border-white/[0.08] bg-popover/95 p-1 text-[11px] shadow-[0_20px_70px_-10px_rgba(0,0,0,0.7)] ring-1 ring-black/50 backdrop-blur-3xl origin-top-left data-[upwards=true]:origin-bottom-left overflow-hidden"
      style={{
        top: position.openUpwards ? undefined : position.y,
        bottom: position.openUpwards ? window.innerHeight - position.y : undefined,
        left: position.x,
      }}
      data-upwards={position.openUpwards}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.05),_transparent_40%)] pointer-events-none" />
      
      <div className="relative">
        <div className="flex items-center justify-between px-2.5 py-1.5 mb-0.5">
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">
            New Session
          </span>
          <button
            type="button"
            onClick={onCreateBase}
            className={`rounded px-2 py-0.5 text-[10px] font-semibold text-muted-foreground/60 hover:bg-white/5 hover:text-foreground transition-all active:bg-white/10 ${focusRingClass}`}
          >
            Blank
          </button>
        </div>

        {profileRows.length ? (
          <div className="max-h-[18rem] space-y-px overflow-y-auto px-0.5 pb-0.5 custom-scrollbar">
            {profileRows.map(({ key, profile, profileLabel, actions }: any) => {
              const defaultAction = actions.find((a) => a.mode === 'start' || a.mode === 'resume') || actions[0];
              return (
                <div
                  key={key}
                  className="group flex h-8 items-center justify-between overflow-hidden rounded-lg pl-2.5 transition-colors hover:bg-white/[0.04] cursor-pointer"
                  onClick={() => {
                    if (defaultAction) {
                      onCreateProfile?.(profile, defaultAction);
                    }
                  }}
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1 h-full">
                    <span className="truncate font-semibold text-foreground/70 group-hover:text-foreground/95 transition-colors select-none">
                      {profileLabel}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onConfigureProfile?.(profile);
                      }}
                      className="opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 text-muted-foreground/30 hover:text-primary/80 transition-all p-1"
                      title="Configure"
                    >
                      <Settings size={11} strokeWidth={2} />
                    </button>
                  </div>
                  
                  <div className="flex items-stretch h-full shrink-0 gap-px">
                    {actions.map((action) => (
                      <button
                        key={action.key}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCreateProfile?.(profile, action);
                        }}
                        title={action.command}
                        className={`relative px-3 flex items-center justify-center text-[9px] font-black uppercase tracking-wider text-muted-foreground/40 transition-all duration-150 active:bg-white/[0.08] ${focusRingClass} ${actionToneClass(action.mode)}`}
                      >
                        <span className="relative z-10">{action.badge}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
