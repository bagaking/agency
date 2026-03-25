import type { ReactNode } from 'react';
import { LifecycleConfirmModal } from '../components/modals/LifecycleConfirmModal';
import { StatusBar } from '../components/StatusBar';
import { SessionMapOverlay } from '../components/sessionMap/SessionMapOverlay';

type AppShellChromeProps = {
  sessionMapOpen: boolean;
  sessionMapModel: any;
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
  sessionMapOpen,
  sessionMapModel,
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
      <SessionMapOverlay
        open={sessionMapOpen}
        model={sessionMapModel}
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
        onOpenFileShortcut={handleOpenSessionMapShortcut}
        onRevealFileShortcut={handleRevealSessionMapShortcut}
        mode="dock"
      />

      <StatusBar
        loading={loading}
        onRefresh={loadCells}
        tmuxStatus={tmuxStatus}
        ipcAvailable={ipcAvailable}
        centerSlot={sessionMapCenterSlot}
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
