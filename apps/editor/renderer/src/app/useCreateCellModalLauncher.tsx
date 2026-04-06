import { useCallback } from 'react';

import { CreateCellModal } from '../components/modals/CreateCellModal';

type UseCreateCellModalLauncherArgs = {
  projectReady: boolean;
  projectRoot: string;
  handleSelectProjectRoot: () => void;
  modal: any;
  handleCreate: (payload: any) => Promise<void>;
};

export function useCreateCellModalLauncher({
  projectReady,
  projectRoot,
  handleSelectProjectRoot,
  modal,
  handleCreate,
}: UseCreateCellModalLauncherArgs) {
  return useCallback((initialOptions: any = {}) => {
    if (!projectReady) {
      handleSelectProjectRoot();
      return;
    }

    const modalId = 'create-cell-modal';
    const initialMode = initialOptions?.mode || 'project';
    const title =
      initialOptions?.initialBindTargetCell && initialMode === 'worktree'
        ? 'Reattach Worktree'
        : initialOptions?.initialBindTargetCell && initialMode === 'branch'
          ? 'Create Worktree Attachment'
        : initialOptions?.initialBindBranchTargetCell && initialMode === 'branch'
          ? 'Bind Branch'
        : initialMode === 'worktree'
          ? 'Track Existing Worktree'
        : initialMode === 'branch'
            ? 'Bind Existing Branch'
            : initialMode === 'create'
              ? 'Create Branch Worktree'
              : 'Create Cell';
    modal.openModal({
      id: modalId,
      title,
      showActions: false,
      showVariantLabel: false,
      dismissOnOverlay: true,
      content: (
        <CreateCellModal
          projectRoot={projectRoot}
          initialMode={initialMode}
          initialName={initialOptions?.name || ''}
          initialReusePath={initialOptions?.reusePath || ''}
          initialExistingBranch={initialOptions?.existingBranch || ''}
          initialBindTargetCell={initialOptions?.initialBindTargetCell || null}
          initialBindBranchTargetCell={initialOptions?.initialBindBranchTargetCell || null}
          onClose={() => modal.closeModal(modalId, false)}
          onCreate={async (payload) => {
            await handleCreate(payload);
            modal.closeModal(modalId, true);
          }}
        />
      ),
    });
  }, [handleCreate, handleSelectProjectRoot, modal, projectReady]);
}
