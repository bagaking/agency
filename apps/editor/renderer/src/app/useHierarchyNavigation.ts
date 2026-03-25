import { useCallback } from 'react';
import type {
  ActiveView,
  HierarchySection,
  ScopedConfigScope,
} from './appLayoutContracts';

type UseHierarchyNavigationArgs = {
  sidebarCollapsed: boolean;
  setActiveView: (view: ActiveView) => void;
  setSidebarCollapsed: (value: boolean | ((value: boolean) => boolean)) => void;
  setHierarchySection: (section: HierarchySection) => void;
  setActionsScope: (scope: ScopedConfigScope) => void;
  setAppShortcutsScope: (scope: ScopedConfigScope) => void;
  setReplyQuickPromptsScope: (scope: ScopedConfigScope) => void;
  setGateScope: (scope: ScopedConfigScope) => void;
  setSessionNamingScope: (scope: ScopedConfigScope) => void;
  clearTerminusError: () => void;
  clearHarnessProvidersError: () => void;
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
  clearHarnessProvidersError,
  clearAppShortcutsError,
  clearReplyQuickPromptsError,
  clearGatesError,
  clearSessionNamingError,
  clearWorktreeLinksError,
}: UseHierarchyNavigationArgs) {
  const handleSwitchView = useCallback(
    (view: ActiveView) => {
      setActiveView(view);
      if (sidebarCollapsed) {
        setSidebarCollapsed(false);
      }
    },
    [setActiveView, setSidebarCollapsed, sidebarCollapsed]
  );

  const handleHierarchyJump = useCallback(
    (target: HierarchySection) => {
      setHierarchySection(target);
      setActiveView('hierarchy');
      if (target === 'actions') {
        clearTerminusError();
      }
      if (target === 'app-shortcuts') {
        clearAppShortcutsError();
      }
      if (target === 'harness-providers') {
        clearHarnessProvidersError();
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
      clearHarnessProvidersError,
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
    (scope: ScopedConfigScope) => {
      setHierarchySection('actions');
      setActionsScope(scope);
      clearTerminusError();
    },
    [clearTerminusError, setActionsScope, setHierarchySection]
  );

  const handleOpenHarnessProviders = useCallback(() => {
    setHierarchySection('harness-providers');
    clearHarnessProvidersError();
  }, [clearHarnessProvidersError, setHierarchySection]);

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
    (scope: ScopedConfigScope) => {
      setHierarchySection('app-shortcuts');
      setAppShortcutsScope(scope);
      clearAppShortcutsError();
    },
    [clearAppShortcutsError, setAppShortcutsScope, setHierarchySection]
  );

  const handleSelectReplyQuickPromptsScope = useCallback(
    (scope: ScopedConfigScope) => {
      setHierarchySection('reply-quick-prompts');
      setReplyQuickPromptsScope(scope);
      clearReplyQuickPromptsError();
    },
    [clearReplyQuickPromptsError, setHierarchySection, setReplyQuickPromptsScope]
  );

  const handleSelectGateScope = useCallback(
    (scope: ScopedConfigScope) => {
      setHierarchySection('gates');
      setGateScope(scope);
      clearGatesError();
    },
    [clearGatesError, setGateScope, setHierarchySection]
  );

  const handleSelectSessionNamingScope = useCallback(
    (scope: ScopedConfigScope) => {
      setHierarchySection('session-naming');
      setSessionNamingScope(scope);
      clearSessionNamingError();
    },
    [clearSessionNamingError, setHierarchySection, setSessionNamingScope]
  );

  const handleSelectHierarchySection = useCallback(
    (section: HierarchySection) => {
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
      if (section === 'harness-providers') {
        clearHarnessProvidersError();
      }
    },
    [
      clearHarnessProvidersError,
      clearReplyQuickPromptsError,
      clearSessionNamingError,
      clearWorktreeLinksError,
      setHierarchySection,
    ]
  );

  const handleToggleSidebar = useCallback(() => {
    setSidebarCollapsed((value) => !value);
  }, [setSidebarCollapsed]);

  return {
    handleSwitchView,
    handleHierarchyJump,
    handleSelectActionsScope,
    handleOpenHarnessProviders,
    handleConfigureProfile,
    handleSelectAppShortcutsScope,
    handleSelectReplyQuickPromptsScope,
    handleSelectGateScope,
    handleSelectSessionNamingScope,
    handleSelectHierarchySection,
    handleToggleSidebar,
  };
}
