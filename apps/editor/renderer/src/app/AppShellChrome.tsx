import { Suspense, lazy, type ReactNode } from 'react';
import { LifecycleConfirmModal } from '../components/modals/LifecycleConfirmModal';
import { StatusBar } from '../components/StatusBar';
import { DeferredMount } from '../components/ui/DeferredMount';

const LazySessionMapOverlay = lazy(async () => {
  const mod = await import('../components/sessionMap/SessionMapOverlay');
  return {
    default: mod.SessionMapOverlay,
  };
});

type AppShellChromeProps = {
  projectHomeVisible: boolean;
  sessionMapOpen: boolean;
  sessionMapModel: any;
  sessionMapFocusedRunId?: string;
  handleSelectSessionFromMap: (...args: any[]) => void;
  handleToggleSessionMap: () => void;
  resolveSessionMapFontSize: (...args: any[]) => number;
  terminusProfiles: any[];
  createSessionForCell: (...args: any[]) => Promise<any>;
  dispatchSessionCommand: (...args: any[]) => Promise<any>;
  renameSession: (...args: any[]) => Promise<any>;
  updateSessionAvatar: (...args: any[]) => Promise<any>;
  harnessRuns: any[];
  sessionError: string;
  onClearSessionError: () => void;
  onCancelHarnessRun: (runId: string) => Promise<any>;
  onResumeHarnessRun: (runId: string) => Promise<any>;
  handleOpenSessionMapShortcut: (...args: any[]) => Promise<any>;
  handleRevealSessionMapShortcut: (...args: any[]) => Promise<any>;
  loading: boolean;
  loadCells: () => Promise<void>;
  tmuxStatus: any;
  ipcAvailable: boolean;
  sessionMapCenterSlot: ReactNode;
  pendingTransition: any;
  transitionError: string;
  transitionLoading: boolean;
  handleCancelTransition: () => void;
  handleConfirmTransition: () => void;
  handleRefreshTransitionGates: () => void;
};

export function AppShellChrome({
  projectHomeVisible,
  sessionMapOpen,
  sessionMapModel,
  sessionMapFocusedRunId = '',
  handleSelectSessionFromMap,
  handleToggleSessionMap,
  resolveSessionMapFontSize,
  terminusProfiles,
  createSessionForCell,
  dispatchSessionCommand,
  renameSession,
  updateSessionAvatar,
  harnessRuns,
  sessionError,
  onClearSessionError,
  onCancelHarnessRun,
  onResumeHarnessRun,
  handleOpenSessionMapShortcut,
  handleRevealSessionMapShortcut,
  loading,
  loadCells,
  tmuxStatus,
  ipcAvailable,
  sessionMapCenterSlot,
  pendingTransition,
  transitionError,
  transitionLoading,
  handleCancelTransition,
  handleConfirmTransition,
  handleRefreshTransitionGates,
}: AppShellChromeProps) {
  return (
    <>
      <DeferredMount active={sessionMapOpen} strategy="unmount">
        <Suspense fallback={null}>
          <LazySessionMapOverlay
            open={sessionMapOpen}
            model={sessionMapModel}
            focusedRunId={sessionMapFocusedRunId}
            onSelectSession={handleSelectSessionFromMap}
            onClose={handleToggleSessionMap}
            resolveFontSize={resolveSessionMapFontSize}
            terminusProfiles={terminusProfiles}
            onCreateSession={createSessionForCell}
            onDispatchCommand={dispatchSessionCommand}
            onRenameSession={renameSession}
            onUpdateSessionAvatar={updateSessionAvatar}
            harnessRuns={harnessRuns}
            sessionError={sessionError}
            onClearSessionError={onClearSessionError}
            onCancelHarnessRun={onCancelHarnessRun}
            onResumeHarnessRun={onResumeHarnessRun}
            onOpenFileShortcut={handleOpenSessionMapShortcut}
            onRevealFileShortcut={handleRevealSessionMapShortcut}
            mode="dock"
          />
        </Suspense>
      </DeferredMount>

      <StatusBar
        loading={loading}
        onRefresh={loadCells}
        tmuxStatus={tmuxStatus}
        ipcAvailable={ipcAvailable}
        centerSlot={projectHomeVisible ? null : sessionMapCenterSlot}
        suppressAttention={projectHomeVisible}
        projectHomeMode={projectHomeVisible}
      />

      {pendingTransition ? (
        <LifecycleConfirmModal
          transition={pendingTransition}
          error={transitionError}
          loading={transitionLoading}
          onCancel={handleCancelTransition}
          onConfirm={handleConfirmTransition}
          onRefresh={handleRefreshTransitionGates}
        />
      ) : null}
    </>
  );
}
