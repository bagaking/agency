import { useMemo, useRef } from 'react';

import {
  startCommanderSmartForkRun,
  startCommanderSmartNameRun,
} from '../../services/commander';
import { useModal } from '../modals/ModalSystem';
import { useCommanderTaskLauncher } from './useCommanderTaskLauncher';

type CommanderCellContext = {
  id: string;
  worktreePath: string;
  name?: string;
  branch?: string;
};

type CommanderSessionContext = {
  id: string;
  name?: string;
};

type CommanderActionDeps = {
  startSmartNameRun?: typeof startCommanderSmartNameRun;
  startSmartForkRun?: typeof startCommanderSmartForkRun;
  launchCommanderTask: ReturnType<typeof useCommanderTaskLauncher>;
  openAlert: (input: {
    title: string;
    description: string;
  }) => Promise<any>;
  notifySuccess: (input: {
    title: string;
    description: string;
  }) => void;
  renameSession?: (sessionId: string, name: string, cellId: string) => Promise<any> | any;
  focusSessionInUi?: (cellId: string, sessionId: string) => void;
  trackPendingHarnessRun?: (input: {
    clientRequestId: string;
    runId?: string;
    cellId: string;
    sourceSessionId?: string;
  }) => void;
  clearTrackedHarnessRun?: (input: { clientRequestId?: string }) => void;
  settleTrackedHarnessRun?: (input: {
    clientRequestId?: string;
    runId?: string;
    cellId?: string;
    sourceSessionId?: string;
    runSnapshot?: any;
  }) => Promise<any>;
};

function buildContextKey(cell: CommanderCellContext, session: CommanderSessionContext): string {
  return `${String(cell?.id || '').trim()}:${String(session?.id || '').trim()}`;
}

function createPendingController() {
  const pendingByAction = {
    'smart-name': new Set<string>(),
    'smart-fork': new Set<string>(),
  };

  return {
    acquire(action: 'smart-name' | 'smart-fork', key: string) {
      const normalizedKey = String(key || '').trim();
      if (!normalizedKey) {
        return false;
      }
      const bucket = pendingByAction[action];
      if (bucket.has(normalizedKey)) {
        return false;
      }
      bucket.add(normalizedKey);
      return true;
    },
    release(action: 'smart-name' | 'smart-fork', key: string) {
      const normalizedKey = String(key || '').trim();
      if (!normalizedKey) {
        return;
      }
      pendingByAction[action].delete(normalizedKey);
    },
  };
}

export function createCommanderSessionActionsRunner(
  deps: CommanderActionDeps,
  pendingController = createPendingController()
) {
  return {
    async runSmartName({
      cell,
      session,
      available,
    }: {
      cell: CommanderCellContext;
      session: CommanderSessionContext;
      available: boolean;
    }) {
      if (!cell?.id || !session?.id || !available) {
        return;
      }
      const pendingKey = buildContextKey(cell, session);
      if (!pendingController.acquire('smart-name', pendingKey)) {
        return;
      }
      try {
        const startedRun = await (deps.startSmartNameRun || startCommanderSmartNameRun)({
          worktreePath: cell.worktreePath,
          cellId: cell.id,
          cellName: cell.name,
          cellBranch: cell.branch,
          sessionId: session.id,
          sessionName: session.name,
          sourceSurface: 'agent-cells',
          callerType: 'renderer',
        });
        const runId = String(startedRun?.runId || '').trim();
        if (!runId) {
          throw new Error('Harness run did not return a runId.');
        }
        const taskResult = await deps.launchCommanderTask({
          modalId: `commander-smart-name-${session.id}`,
          runId,
          stepId: 'smart-name',
          taskKind: 'smart-name',
          taskTitle: 'Smart Rename',
          sessionName: session.name || session.id,
          cellName: cell.name || cell.id,
        });
        if (taskResult?.type !== 'apply') {
          return;
        }
        const nextName = String(taskResult?.value || '').trim();
        if (!nextName) {
          return;
        }
        await Promise.resolve(deps.renameSession?.(session.id, nextName, cell.id));
        deps.notifySuccess({
          title: 'Session Renamed',
          description: `Renamed to ${nextName}.`,
        });
      } catch (error: any) {
        await deps.openAlert({
          title: 'Smart Rename Failed',
          description: error?.message || 'Failed to suggest a session name.',
        });
      } finally {
        pendingController.release('smart-name', pendingKey);
      }
    },

    async runSmartFork({
      cell,
      session,
      available,
    }: {
      cell: CommanderCellContext;
      session: CommanderSessionContext;
      available: boolean;
    }) {
      if (!cell?.id || !session?.id || !available) {
        return;
      }
      const pendingKey = buildContextKey(cell, session);
      if (!pendingController.acquire('smart-fork', pendingKey)) {
        return;
      }

      const clientRequestId = `fork-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
      try {
        deps.trackPendingHarnessRun?.({
          clientRequestId,
          cellId: cell.id,
          sourceSessionId: session.id,
        });
        const startedRun = await (deps.startSmartForkRun || startCommanderSmartForkRun)({
          clientRequestId,
          worktreePath: cell.worktreePath,
          cellId: cell.id,
          cellName: cell.name,
          cellBranch: cell.branch,
          sessionId: session.id,
          sourceSurface: 'agent-cells',
          callerType: 'renderer',
        });
        const runId = String(startedRun?.runId || '').trim();
        if (!runId) {
          throw new Error('Harness run did not return a runId.');
        }
        deps.trackPendingHarnessRun?.({
          clientRequestId,
          runId,
          cellId: cell.id,
          sourceSessionId: session.id,
        });
        const taskResult = await deps.launchCommanderTask({
          modalId: `commander-smart-fork-${session.id}`,
          runId,
          stepId: 'create-agent',
          taskKind: 'smart-fork',
          taskTitle: 'Smart Fork',
          sessionName: session.name || session.id,
          cellName: cell.name || cell.id,
        });
        if (taskResult?.type !== 'complete') {
          return;
        }
        await deps.settleTrackedHarnessRun?.({
          clientRequestId,
          runId,
          cellId: cell.id,
          sourceSessionId: session.id,
        });
        const createdSessionId = String(taskResult?.value?.sessionId || '').trim();
        if (createdSessionId) {
          deps.focusSessionInUi?.(cell.id, createdSessionId);
        }
      } catch (error: any) {
        await deps.openAlert({
          title: 'Smart Fork Failed',
          description: error?.message || 'Failed to create a Commander child session.',
        });
        deps.clearTrackedHarnessRun?.({
          clientRequestId,
        });
      } finally {
        pendingController.release('smart-fork', pendingKey);
      }
    },
  };
}

export function useCommanderSessionActions({
  renameSession,
  focusSessionInUi,
  trackPendingHarnessRun,
  clearTrackedHarnessRun,
  settleTrackedHarnessRun,
}: {
  renameSession?: CommanderActionDeps['renameSession'];
  focusSessionInUi?: CommanderActionDeps['focusSessionInUi'];
  trackPendingHarnessRun?: CommanderActionDeps['trackPendingHarnessRun'];
  clearTrackedHarnessRun?: CommanderActionDeps['clearTrackedHarnessRun'];
  settleTrackedHarnessRun?: CommanderActionDeps['settleTrackedHarnessRun'];
}) {
  const modal = useModal();
  const launchCommanderTask = useCommanderTaskLauncher();
  const pendingControllerRef = useRef<ReturnType<typeof createPendingController> | null>(null);
  if (!pendingControllerRef.current) {
    pendingControllerRef.current = createPendingController();
  }

  return useMemo(
    () =>
      createCommanderSessionActionsRunner(
        {
          startSmartNameRun: startCommanderSmartNameRun,
          startSmartForkRun: startCommanderSmartForkRun,
          launchCommanderTask,
          openAlert: async ({ title, description }) =>
            modal.openModal({
              variant: 'alert',
              tone: 'danger',
              title,
              description,
              dismissLabel: 'Close',
              dismissOnOverlay: false,
            }),
          notifySuccess: ({ title, description }) =>
            modal.notify({
              tone: 'success',
              title,
              description,
            }),
          renameSession,
          focusSessionInUi,
          trackPendingHarnessRun,
          clearTrackedHarnessRun,
          settleTrackedHarnessRun,
        },
        pendingControllerRef.current || undefined
      ),
    [
      clearTrackedHarnessRun,
      launchCommanderTask,
      modal,
      focusSessionInUi,
      renameSession,
      settleTrackedHarnessRun,
      trackPendingHarnessRun,
    ]
  );
}
