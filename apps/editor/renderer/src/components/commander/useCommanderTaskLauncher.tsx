import { useCallback } from 'react';

import { useModal } from '../modals/ModalSystem';
import { CommanderTaskSheet } from './CommanderTaskSheet';

type CommanderTaskKind = 'smart-name' | 'smart-fork';

type LaunchCommanderTaskInput = {
  modalId: string;
  runId: string;
  stepId: string;
  taskKind: CommanderTaskKind;
  taskTitle: string;
  sessionName?: string;
  cellName?: string;
};

export function useCommanderTaskLauncher() {
  const modal = useModal();

  return useCallback(
    async ({
      modalId,
      runId,
      stepId,
      taskKind,
      taskTitle,
      sessionName,
      cellName,
    }: LaunchCommanderTaskInput) =>
      modal.openModal({
        id: modalId,
        variant: 'commander-task',
        dismissOnOverlay: false,
        showActions: false,
        content: (
          <CommanderTaskSheet
            modalId={modalId}
            runId={runId}
            stepId={stepId}
            taskKind={taskKind}
            taskTitle={taskTitle}
            sessionName={sessionName}
            cellName={cellName}
          />
        ),
      }),
    [modal]
  );
}
