import { useCallback } from 'react';

type UseHierarchyNavigationArgs = {
  sidebarCollapsed: boolean;
  setActiveView: (view: string) => void;
  setSidebarCollapsed: (value: boolean | ((value: boolean) => boolean)) => void;
  setHierarchySection: (section: string) => void;
  setActionsScope: (scope: string) => void;
  setAppShortcutsScope: (scope: string) => void;
  setReplyQuickPromptsScope: (scope: string) => void;
  setGateScope: (scope: string) => void;
  setSessionNamingScope: (scope: string) => void;
  clearTerminusError: () => void;
  clearAppShortcutsError: () => void;
  clearReplyQuickPromptsError: () => void;
  clearGatesError: () => void;
  clearSessionNamingError: () => void;
  clearWorktreeLinksError: () => void;
};

export function useHierarchyNavigation({
  sidebarCollapsed,
  setActiveView,
  setSidebarCollapsed,
  setHierarchySection,
  setActionsScope,
  setAppShortcutsScope,
  setReplyQuickPromptsScope,
  setGateScope,
  setSessionNamingScope,
  clearTerminusError,
  clearAppShortcutsError,
  clearReplyQuickPromptsError,
  clearGatesError,
  clearSessionNamingError,
  clearWorktreeLinksError,
}: UseHierarchyNavigationArgs) {
  const handleSwitchView = useCallback(
    (view: string) => {
      setActiveView(view);
      if (sidebarCollapsed) {
        setSidebarCollapsed(false);
      }
    },
    [setActiveView, setSidebarCollapsed, sidebarCollapsed]
  );

  const handleHierarchyJump = useCallback(
    (target: string) => {
      setHierarchySection(target);
      setActiveView('hierarchy');
      if (target === 'actions') {
        clearTerminusError();
      }
      if (target === 'app-shortcuts') {
        clearAppShortcutsError();
      }
      if (target === 'reply-quick-prompts') {
        clearReplyQuickPromptsError();
      }
      if (target === 'gates') {
        clearGatesError();
      }
      if (target === 'session-naming') {
        clearSessionNamingError();
      }
      if (target === 'softlinks') {
        clearWorktreeLinksError();
      }
    },
    [
      clearAppShortcutsError,
      clearGatesError,
      clearReplyQuickPromptsError,
      clearSessionNamingError,
      clearTerminusError,
      clearWorktreeLinksError,
      setActiveView,
      setHierarchySection,
    ]
  );

  const handleSelectActionsScope = useCallback(
    (scope: string) => {
      setHierarchySection('actions');
      setActionsScope(scope);
      clearTerminusError();
    },
    [clearTerminusError, setActionsScope, setHierarchySection]
  );

  const handleConfigureProfile = useCallback(
    (profile: any) => {
      if (!profile) {
        return;
      }
      setHierarchySection('actions');
      setActiveView('hierarchy');
      if (sidebarCollapsed) {
        setSidebarCollapsed(false);
      }
      const targetScope = profile.sourceScope || 'global';
      setActionsScope(targetScope);
      clearTerminusError();
    },
    [
      clearTerminusError,
      setActionsScope,
      setActiveView,
      setHierarchySection,
      setSidebarCollapsed,
      sidebarCollapsed,
    ]
  );

  const handleSelectAppShortcutsScope = useCallback(
    (scope: string) => {
      setHierarchySection('app-shortcuts');
      setAppShortcutsScope(scope);
      clearAppShortcutsError();
    },
    [clearAppShortcutsError, setAppShortcutsScope, setHierarchySection]
  );

  const handleSelectReplyQuickPromptsScope = useCallback(
    (scope: string) => {
      setHierarchySection('reply-quick-prompts');
      setReplyQuickPromptsScope(scope);
      clearReplyQuickPromptsError();
    },
    [clearReplyQuickPromptsError, setHierarchySection, setReplyQuickPromptsScope]
  );

  const handleSelectGateScope = useCallback(
    (scope: string) => {
      setHierarchySection('gates');
      setGateScope(scope);
      clearGatesError();
    },
    [clearGatesError, setGateScope, setHierarchySection]
  );

  const handleSelectSessionNamingScope = useCallback(
    (scope: string) => {
      setHierarchySection('session-naming');
      setSessionNamingScope(scope);
      clearSessionNamingError();
    },
    [clearSessionNamingError, setHierarchySection, setSessionNamingScope]
  );

  const handleSelectHierarchySection = useCallback(
    (section: string) => {
      setHierarchySection(section);
      if (section === 'softlinks') {
        clearWorktreeLinksError();
      }
      if (section === 'session-naming') {
        clearSessionNamingError();
      }
      if (section === 'reply-quick-prompts') {
        clearReplyQuickPromptsError();
      }
    },
    [clearReplyQuickPromptsError, clearSessionNamingError, clearWorktreeLinksError, setHierarchySection]
  );

  const handleToggleSidebar = useCallback(() => {
    setSidebarCollapsed((value) => !value);
  }, [setSidebarCollapsed]);

  return {
    handleSwitchView,
    handleHierarchyJump,
    handleSelectActionsScope,
    handleConfigureProfile,
    handleSelectAppShortcutsScope,
    handleSelectReplyQuickPromptsScope,
    handleSelectGateScope,
    handleSelectSessionNamingScope,
    handleSelectHierarchySection,
    handleToggleSidebar,
  };
}

