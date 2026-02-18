import { useEffect } from 'react';

type WorkbenchKeyboardBindings = {
  activeTab: any;
  activeKind: string;
  onSave: () => void;
  onSaveAs: () => void;
  onCloseActiveTab: () => void;
  runEditorAction: (actionId: string) => void;
};

export const useWorkbenchKeyboardShortcuts = ({
  activeTab,
  activeKind,
  onSave,
  onSaveAs,
  onCloseActiveTab,
  runEditorAction,
}: WorkbenchKeyboardBindings) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!activeTab) {
        return;
      }
      const target = event.target as HTMLElement | null;
      const isEditable =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      const isMonaco = Boolean(target?.closest?.('.monaco-editor'));
      if (isEditable && !isMonaco) {
        return;
      }
      const isMac = navigator.platform?.toLowerCase().includes('mac');
      const modKey = isMac ? event.metaKey : event.ctrlKey;
      if (!modKey) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === 's') {
        event.preventDefault();
        if (event.shiftKey) {
          onSaveAs();
        } else {
          onSave();
        }
        return;
      }
      if (key === 'w') {
        event.preventDefault();
        onCloseActiveTab();
        return;
      }
      if (key === 'f' && activeKind === 'code') {
        event.preventDefault();
        if (event.altKey) {
          runEditorAction('editor.action.startFindReplaceAction');
        } else {
          runEditorAction('actions.find');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeKind, activeTab, onCloseActiveTab, onSave, onSaveAs, runEditorAction]);
};
