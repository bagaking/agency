import { useCallback } from 'react';
import type {
  ActiveView,
  HierarchySection,
  ScopedConfigScope,
} from './appLayoutContracts';
import { resolveAvailableHierarchyScope } from './hierarchyScope';

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
  actionsScope: ScopedConfigScope;
  appShortcutsScope: ScopedConfigScope;
  replyQuickPromptsScope: ScopedConfigScope;
  gateScope: ScopedConfigScope;
  sessionNamingScope: ScopedConfigScope;
  canUseProjectScope: boolean;
  canUseAgentScope: boolean;
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
  setGateScope: _setGateScope,
  setSessionNamingScope,
  actionsScope,
  appShortcutsScope,
  replyQuickPromptsScope,
  gateScope: _gateScope,
  sessionNamingScope,
  canUseProjectScope,
  canUseAgentScope,
  clearTerminusError,
  clearHarnessProvidersError,
  clearAppShortcutsError,
  clearReplyQuickPromptsError,
  clearGatesError: _clearGatesError,
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
      const normalizedTarget = target === 'gates' ? 'actions' : target;
      setHierarchySection(normalizedTarget);
      setActiveView('hierarchy');
      if (normalizedTarget === 'actions') {
        setActionsScope(
          resolveAvailableHierarchyScope(actionsScope, { canUseProjectScope, canUseAgentScope })
        );
        clearTerminusError();
      }
      if (normalizedTarget === 'app-shortcuts') {
        setAppShortcutsScope(
          resolveAvailableHierarchyScope(appShortcutsScope, {
            canUseProjectScope,
            canUseAgentScope,
          })
        );
        clearAppShortcutsError();
      }
      if (normalizedTarget === 'harness-providers') {
        clearHarnessProvidersError();
      }
      if (normalizedTarget === 'reply-quick-prompts') {
        setReplyQuickPromptsScope(
          resolveAvailableHierarchyScope(replyQuickPromptsScope, {
            canUseProjectScope,
            canUseAgentScope,
          })
        );
        clearReplyQuickPromptsError();
      }
      if (normalizedTarget === 'session-naming') {
        setSessionNamingScope(
          resolveAvailableHierarchyScope(sessionNamingScope, {
            canUseProjectScope,
            canUseAgentScope,
          })
        );
        clearSessionNamingError();
      }
      if (normalizedTarget === 'softlinks') {
        clearWorktreeLinksError();
      }
    },
    [
      clearAppShortcutsError,
      clearHarnessProvidersError,
      clearReplyQuickPromptsError,
      clearSessionNamingError,
      clearTerminusError,
      clearWorktreeLinksError,
      actionsScope,
      appShortcutsScope,
      canUseAgentScope,
      canUseProjectScope,
      replyQuickPromptsScope,
      sessionNamingScope,
      setActiveView,
      setActionsScope,
      setAppShortcutsScope,
      setHierarchySection,
      setReplyQuickPromptsScope,
      setSessionNamingScope,
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
      setHierarchySection('actions');
      setActionsScope(
        resolveAvailableHierarchyScope(scope, { canUseProjectScope, canUseAgentScope })
      );
      clearTerminusError();
    },
    [canUseAgentScope, canUseProjectScope, clearTerminusError, setActionsScope, setHierarchySection]
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
