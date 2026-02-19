import { useCallback } from 'react';

import { CreateCellModal } from '../components/modals/CreateCellModal';

type UseCreateCellModalLauncherArgs = {
  projectReady: boolean;
  handleSelectProjectRoot: () => void;
  modal: any;
  handleCreate: (payload: any) => Promise<void>;
};

export function useCreateCellModalLauncher({
  projectReady,
  handleSelectProjectRoot,
  modal,
  handleCreate,
}: UseCreateCellModalLauncherArgs) {
  return useCallback(() => {
    if (!projectReady) {
      handleSelectProjectRoot();
      return;
    }

    const modalId = 'create-cell-modal';
    modal.openModal({
      id: modalId,
      title: 'Create New Agent Cell',
      showActions: false,
      showVariantLabel: false,
      dismissOnOverlay: true,
      content: (
        <CreateCellModal
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
