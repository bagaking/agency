import React, { Suspense, lazy, useEffect } from 'react';
import { RefreshCw, TerminalSquare } from 'lucide-react';
import { RiveAnimation } from './RiveAnimation';

let terminalPaneImportPromise: Promise<unknown> | null = null;

const LazyTerminalPane = lazy(async () => {
  const mod = await import('./TerminalPane');
  return {
    default: mod.default,
  };
});

function preloadTerminalPane() {
  if (!terminalPaneImportPromise) {
    terminalPaneImportPromise = import('./TerminalPane');
  }
  return terminalPaneImportPromise;
}

function TerminalLoadingOverlay() {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-black/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary/80">
        <RefreshCw size={12} className="animate-spin" />
        <span>Connecting</span>
      </div>
    </div>
  );
}

export function TerminalArea({
  cell,
  sessions,
  activeSessionId,
  sessionTargets,
  terminalOpen,
  terminalMode,
  pendingCommand,
  onCommandSent,
  onSessionActivity,
  onSendSessionText,
  onOpenWorkbenchFile,
  onSelectionContext,
  onReplySelection,
  activityDiffThreshold,
  terminalFontSize,
  onSessionAttached,
  isVisible,
  sessionLoading,
  onOpenTerminal,
  shortcutBindings,
}: any) {
  const assetBase = import.meta.env.BASE_URL || '/';
  const hasSessions = Boolean(sessions && sessions.length > 0);
  const hasActiveSession = Boolean(activeSessionId && hasSessions);
  const showLoadingOverlay = sessionLoading && !(terminalOpen && hasActiveSession);

  useEffect(() => {
    if (!terminalOpen || !hasActiveSession) {
      return;
    }
    void preloadTerminalPane();
  }, [hasActiveSession, terminalOpen]);

  return (
    <div className="flex-1 overflow-hidden relative bg-black/20">
      {terminalOpen && hasActiveSession ? (
        <>
          <div className="absolute inset-0">
            <Suspense fallback={<TerminalLoadingOverlay />}>
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
                    <LazyTerminalPane
                      cell={cell}
                      sessionId={session.id}
                      mode={terminalMode}
                      pendingCommand={pendingCommand}
                      onCommandSent={onCommandSent}
                      onActivity={onSessionActivity}
                      onSendSessionText={onSendSessionText}
                      onOpenWorkbenchFile={onOpenWorkbenchFile}
                      onSelectionContext={onSelectionContext}
                      onReplySelection={onReplySelection}
                      activityDiffThreshold={activityDiffThreshold}
                      fontSize={terminalFontSize}
                      onSessionAttached={onSessionAttached}
                      isVisible={isVisible}
                      isActive={isActive}
                      shortcutBindings={shortcutBindings}
                      sessionTargets={sessionTargets}
                    />
                  </div>
                );
              })}
            </Suspense>
          </div>
          {showLoadingOverlay ? (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="h-24 w-24 opacity-60">
                <RiveAnimation
                  src={`${assetBase}assets/animations/loading.riv`}
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
              className="w-16 h-16"
              fallback={<TerminalSquare size={48} />}
            />
          </div>
          <p className="text-xs font-medium tracking-wide">No active terminal session</p>
          <button
            onClick={onOpenTerminal}
            onPointerEnter={() => {
              void preloadTerminalPane();
            }}
            onFocus={() => {
              void preloadTerminalPane();
            }}
            className="mt-3 text-[10px] font-bold text-primary px-5 py-2 border border-primary/30 rounded-full hover:bg-primary/10 transition-all active:scale-95 hover:border-primary"
          >
            SPAWN AGENT SHELL
          </button>
        </div>
      )}
    </div>
  );
}
