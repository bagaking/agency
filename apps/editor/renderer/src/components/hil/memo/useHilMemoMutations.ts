import { useCallback, useState } from 'react';
import { Archive, Trash2 } from 'lucide-react';

import {
  deleteHilItem as agencyDeleteHilItem,
  updateHilItem as agencyUpdateHilItem,
} from '../../../services/agencyBridge';

type HilMemoMutationBindings = {
  worktreePath: string;
  refresh: () => Promise<void>;
  setDockSelection: (value: any) => void;
  modal: any;
  onCreateActionSheet?: (draft: any) => Promise<any>;
};

export const useHilMemoMutations = ({
  worktreePath,
  refresh,
  setDockSelection,
  modal,
  onCreateActionSheet,
}: HilMemoMutationBindings) => {
  const [mutationError, setMutationError] = useState('');

  const updateStatus = useCallback(
    async (item: any, status: string) => {
      if (!item?.id || !worktreePath) {
        return;
      }
      try {
        const updated = await agencyUpdateHilItem({
          worktreePath,
          itemId: item.id,
          patch: { status },
        });
        if (!updated) {
          throw new Error('HIL IPC unavailable.');
        }
        setMutationError('');
        await refresh();
      } catch (updateError: any) {
        console.error(updateError);
        setMutationError(updateError?.message || 'Failed to update item.');
        modal?.notify?.({
          title: 'Draft update failed',
          description: updateError?.message || 'Unable to update the draft status.',
          tone: 'warning',
        });
      }
    },
    [modal, refresh, worktreePath]
  );

  const handleArchiveDraft = useCallback(
    async (draft: any) => {
      if (!draft?.id) {
        return;
      }
      if (!modal?.confirm) {
        console.warn('Modal system unavailable; archive aborted.');
        return;
      }
      const confirmed = await modal.confirm({
        title: 'Archive Draft',
        description: 'This draft will move to archived status.',
        confirmLabel: 'Archive',
        cancelLabel: 'Cancel',
        tone: 'warning',
        icon: Archive,
      });
      if (!confirmed) {
        return;
      }
      await updateStatus(draft, 'archived');
    },
    [modal, updateStatus]
  );

  const handleDeleteDraft = useCallback(
    async (draft: any) => {
      if (!draft?.id || !worktreePath) {
        return;
      }
      if (!modal?.confirm) {
        console.warn('Modal system unavailable; delete aborted.');
        return;
      }
      const confirmed = await modal.confirm({
        title: 'Delete Draft',
        description:
          'This draft will be removed from the HIL index and cannot be restored.',
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        tone: 'danger',
        icon: Trash2,
      });
      if (!confirmed) {
        return;
      }
      try {
        const result = await agencyDeleteHilItem({
          worktreePath,
          itemId: draft.id,
        });
        if (!result) {
          throw new Error('HIL IPC unavailable.');
        }
        setMutationError('');
        await refresh();
        setDockSelection({ type: 'inbox', inboxType: 'comments', draftId: null });
      } catch (deleteError: any) {
        console.error(deleteError);
        setMutationError(deleteError?.message || 'Failed to delete draft.');
        modal?.notify?.({
          title: 'Draft delete failed',
          description: deleteError?.message || 'Unable to delete the draft.',
          tone: 'danger',
        });
      }
    },
    [modal, refresh, setDockSelection, worktreePath]
  );

  const handleCreateDraftActionSheet = useCallback(
    async (draft: any) => {
      if (!draft?.id || !worktreePath || typeof onCreateActionSheet !== 'function') {
        return;
      }
      try {
        const created = await onCreateActionSheet(draft);
        if (!created?.id) {
          throw new Error('Unable to create Action Sheet.');
        }
        const updated = await agencyUpdateHilItem({
          worktreePath,
          itemId: draft.id,
          patch: {
            meta: {
              ...(draft.meta || {}),
              actionSheetId: created.id,
            },
          },
        });
        if (!updated) {
          throw new Error('HIL IPC unavailable.');
        }
        setMutationError('');
        await refresh();
      } catch (createError: any) {
        console.error(createError);
        setMutationError(createError?.message || 'Failed to create Action Sheet.');
        modal?.notify?.({
          title: 'Action Sheet create failed',
          description:
            createError?.message ||
            'Unable to create an Action Sheet from this draft.',
          tone: 'warning',
        });
      }
    },
    [modal, onCreateActionSheet, refresh, worktreePath]
  );

  return {
    mutationError,
    setMutationError,
    updateStatus,
    handleArchiveDraft,
    handleDeleteDraft,
    handleCreateDraftActionSheet,
  };
};
