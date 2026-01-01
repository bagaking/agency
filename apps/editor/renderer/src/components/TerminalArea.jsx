import React from 'react';
import { AlertTriangle, RefreshCw, TerminalSquare } from 'lucide-react';
import TerminalPane from './TerminalPane.jsx';
import { RiveAnimation } from './RiveAnimation.jsx';

export function TerminalArea({
  cell,
  sessions,
  activeSessionId,
  terminalOpen,
  terminalMode,
  pendingCommand,
  onCommandSent,
  onSessionActivity,
  terminalFontSize,
  onSessionAttached,
  isVisible,
  sessionLoading,
  sessionError,
  onOpenTerminal,
}) {
  const assetBase = import.meta.env.BASE_URL || '/';
  const hasSessions = Boolean(sessions && sessions.length > 0);
  const hasActiveSession = Boolean(activeSessionId && hasSessions);
  const showLoadingOverlay = sessionLoading && !(terminalOpen && hasActiveSession);

  return (
    <div className="flex-1 overflow-hidden relative bg-black/20">
      {terminalOpen && hasActiveSession ? (
        <>
          <div className="absolute inset-0">
            {sessions.map((session) => {
              const isActive = session.id === activeSessionId;
              return (
                <div
                  key={`${cell.id}:${session.id}`}
                  className={`absolute inset-0 transition-opacity duration-150 ${
                    isActive ? 'opacity-100 visible z-10' : 'opacity-0 invisible z-0'
                  }`}
                  aria-hidden={!isActive}
                >
                  <TerminalPane
                    cell={cell}
                    sessionId={session.id}
                    mode={terminalMode}
                    pendingCommand={pendingCommand}
                    onCommandSent={onCommandSent}
                    onActivity={onSessionActivity}
                    fontSize={terminalFontSize}
                    onSessionAttached={onSessionAttached}
                    isVisible={isVisible}
                    isActive={isActive}
                  />
                </div>
              );
            })}
          </div>
          {showLoadingOverlay ? (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="h-24 w-24 opacity-60">
                <RiveAnimation
                  src={`${assetBase}assets/animations/loading.riv`}
                  animations="Idle"
                  className="w-full h-full"
                  fallback={<RefreshCw size={32} className="animate-spin text-primary/40" />}
                />
              </div>
              <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-primary/60">
                Establishing Connection
              </p>
            </div>
          ) : null}
        </>
      ) : (
        <div className="flex h-full flex-col items-center justify-center text-muted-foreground bg-black/40 backdrop-blur-sm">
          <div className="mb-4 opacity-20 hover:opacity-40 transition-opacity duration-700">
            <RiveAnimation
              src={`${assetBase}assets/animations/terminal-idle.riv`}
              animations="Idle"
              className="w-16 h-16"
              fallback={<TerminalSquare size={48} />}
            />
          </div>
          <p className="text-xs font-medium tracking-wide">No active terminal session</p>
          <button
            onClick={onOpenTerminal}
            className="mt-3 text-[10px] font-bold text-primary px-5 py-2 border border-primary/30 rounded-full hover:bg-primary/10 transition-all active:scale-95 hover:border-primary"
          >
            SPAWN AGENT SHELL
          </button>
        </div>
      )}

      {sessionError && (
        <div className="absolute bottom-4 right-4 max-w-xs rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[10px] text-rose-300 backdrop-blur-md shadow-lg flex items-start gap-2">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>{sessionError}</span>
        </div>
      )}
    </div>
  );
}
