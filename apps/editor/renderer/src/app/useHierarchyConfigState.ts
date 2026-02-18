import { useMemo } from 'react';

import { useTerminusSettings } from '../hooks/useTerminusSettings';
import { useAppShortcuts } from '../hooks/useAppShortcuts';
import { useReplyQuickPrompts } from '../hooks/useReplyQuickPrompts';
import { useSessionNamingSettings } from '../hooks/useSessionNamingSettings';
import { useGates } from '../hooks/useGates';
import { useWorktreeLinks } from '../hooks/useWorktreeLinks';

type UseHierarchyConfigStateArgs = {
  scopedCell: any;
  cells: any[];
  projectRoot: string;
  actionsScope: string;
  appShortcutsScope: string;
  replyQuickPromptsScope: string;
  sessionNamingScope: string;
  gateScope: string;
  gateStage: string;
  userDataPath: string;
};

export function useHierarchyConfigState({
  scopedCell,
  cells,
  projectRoot,
  actionsScope,
  appShortcutsScope,
  replyQuickPromptsScope,
  sessionNamingScope,
  gateScope,
  gateStage,
  userDataPath,
}: UseHierarchyConfigStateArgs) {
  const worktreeLinksState = useWorktreeLinks({ selectedCell: scopedCell, cells, projectRoot });
  const terminusState = useTerminusSettings({ selectedCell: scopedCell, terminusScope: actionsScope });
  const appShortcutsState = useAppShortcuts({
    selectedCell: scopedCell,
    appShortcutsScope,
    userDataPath,
  });
  const replyQuickPromptsState = useReplyQuickPrompts({
    selectedCell: scopedCell,
    scope: replyQuickPromptsScope,
    userDataPath,
  });
  const sessionNamingState = useSessionNamingSettings({
    selectedCell: scopedCell,
    sessionNamingScope,
    userDataPath,
  });
  const gatesState = useGates({ selectedCell: scopedCell, gateScope, gateStage, repoRoot: projectRoot });

  const memoVoiceShortcut = useMemo(() => {
    const action = (appShortcutsState.resolvedActions || []).find((entry: any) => entry.id === 'memo.voice');
    return action?.shortcut || '';
  }, [appShortcutsState.resolvedActions]);

  const screenshotShortcut = useMemo(() => {
    const action = (appShortcutsState.resolvedActions || []).find(
      (entry: any) => entry.id === 'capture.screenshot'
    );
    return action?.shortcut || '';
  }, [appShortcutsState.resolvedActions]);

  const canUseScopedConfig = Boolean(scopedCell?.worktreePath);
  const resolvedRepoRoot = projectRoot || worktreeLinksState.repoRoot;

  const appShortcutsPaths = {
    global: appShortcutsState.globalSettingsPath,
    project: appShortcutsState.projectSettingsPath,
    agent: appShortcutsState.agentSettingsPath,
  };
  const replyQuickPromptsPaths = {
    global: replyQuickPromptsState.globalSettingsPath,
    project: replyQuickPromptsState.projectSettingsPath,
    agent: replyQuickPromptsState.agentSettingsPath,
  };
  const sessionNamingPaths = {
    global: sessionNamingState.globalSettingsPath,
    project: sessionNamingState.projectSettingsPath,
    agent: sessionNamingState.agentSettingsPath,
  };

  return {
    worktreeLinks: worktreeLinksState.links,
    worktreeLinksAuto: worktreeLinksState.autoLinkOnCreate,
    worktreeLinksCandidates: worktreeLinksState.candidates,
    worktreeLinksStatusesByPath: worktreeLinksState.statusesByPath,
    worktreeLinksRepoRoot: worktreeLinksState.repoRoot,
    worktreeLinksConfigPath: worktreeLinksState.configPath,
    worktreeLinksLoading: worktreeLinksState.loading,
    worktreeLinksError: worktreeLinksState.error,
    worktreeLinksDirty: worktreeLinksState.dirty,
    toggleWorktreeLinksAuto: worktreeLinksState.toggleAuto,
    addWorktreeLink: worktreeLinksState.addLink,
    addWorktreeLinkFromCandidate: worktreeLinksState.addFromCandidate,
    updateWorktreeLink: worktreeLinksState.updateLink,
    removeWorktreeLink: worktreeLinksState.removeLink,
    saveWorktreeLinks: worktreeLinksState.saveLinks,
    applyWorktreeLink: worktreeLinksState.applyLink,
    applyAllWorktreeLinks: worktreeLinksState.applyAll,
    refreshWorktreeLinks: worktreeLinksState.refreshLinks,
    clearWorktreeLinksError: worktreeLinksState.clearError,

    resolvedProfiles: terminusState.resolvedProfiles,
    resolvedBindingsByProfile: terminusState.resolvedBindingsByProfile,
    profileRows: terminusState.profileRows,
    bindingRowsByProfile: terminusState.bindingRowsByProfile,
    terminusScopeDisabled: terminusState.scopeDisabled,
    projectSettingsPath: terminusState.projectSettingsPath,
    agentSettingsPath: terminusState.agentSettingsPath,
    terminusError: terminusState.error,
    terminusSaving: terminusState.saving,
    terminusDirty: terminusState.dirty,
    terminusSummary: terminusState.summary,
    addProfile: terminusState.addProfile,
    updateProfile: terminusState.updateProfile,
    overrideProfile: terminusState.overrideProfile,
    removeProfile: terminusState.removeProfile,
    resetProfile: terminusState.resetProfile,
    addBinding: terminusState.addBinding,
    updateBinding: terminusState.updateBinding,
    overrideBinding: terminusState.overrideBinding,
    removeBinding: terminusState.removeBinding,
    resetBinding: terminusState.resetBinding,
    saveTerminusSettings: terminusState.saveSettings,
    clearTerminusError: terminusState.clearError,

    appShortcutResolvedActions: appShortcutsState.resolvedActions,
    appShortcutRows: appShortcutsState.actionRows,
    appShortcutsScopeDisabled: appShortcutsState.scopeDisabled,
    appShortcutsError: appShortcutsState.error,
    appShortcutsSaving: appShortcutsState.saving,
    appShortcutsDirty: appShortcutsState.dirty,
    appShortcutsSummary: appShortcutsState.summary,
    updateAppShortcut: appShortcutsState.updateAction,
    overrideAppShortcut: appShortcutsState.overrideAction,
    resetAppShortcut: appShortcutsState.resetAction,
    saveAppShortcuts: appShortcutsState.saveAppShortcuts,
    clearAppShortcutsError: appShortcutsState.clearError,
    appShortcutsPaths,

    replyQuickPromptsRows: replyQuickPromptsState.scopePrompts,
    resolvedReplyQuickPrompts: replyQuickPromptsState.resolvedPrompts,
    replyQuickPromptsScopeDisabled: replyQuickPromptsState.scopeDisabled,
    replyQuickPromptsError: replyQuickPromptsState.error,
    replyQuickPromptsSaving: replyQuickPromptsState.saving,
    replyQuickPromptsDirty: replyQuickPromptsState.dirty,
    replyQuickPromptsSummary: replyQuickPromptsState.summary,
    addReplyQuickPrompt: replyQuickPromptsState.addPrompt,
    updateReplyQuickPrompt: replyQuickPromptsState.updatePrompt,
    removeReplyQuickPrompt: replyQuickPromptsState.removePrompt,
    saveReplyQuickPrompts: replyQuickPromptsState.savePrompts,
    clearReplyQuickPromptsError: replyQuickPromptsState.clearError,
    replyQuickPromptsPaths,

    sessionNamingSettings: sessionNamingState.scopeSettings,
    resolvedSessionNaming: sessionNamingState.resolvedSettings,
    sessionNamingScopeDisabled: sessionNamingState.scopeDisabled,
    sessionNamingError: sessionNamingState.error,
    sessionNamingSaving: sessionNamingState.saving,
    sessionNamingDirty: sessionNamingState.dirty,
    sessionNamingSummary: sessionNamingState.summary,
    updateSessionNamingRule: sessionNamingState.updateRule,
    updateSessionNamingList: sessionNamingState.updateNameList,
    removeSessionNamingList: sessionNamingState.removeNameList,
    renameSessionNamingList: sessionNamingState.renameNameList,
    addSessionNamingList: sessionNamingState.addNameList,
    saveSessionNamingSettings: sessionNamingState.saveSettings,
    clearSessionNamingError: sessionNamingState.clearError,
    sessionNamingPaths,

    gateRows: gatesState.gateRows,
    gateScopeDisabled: gatesState.gateScopeDisabled,
    projectGatesPath: gatesState.projectGatesPath,
    agentGatesPath: gatesState.agentGatesPath,
    gatesError: gatesState.gatesError,
    gatesSaving: gatesState.gatesSaving,
    gateResultsByCellId: gatesState.gateResultsByCellId,
    gatesCheckingByCellId: gatesState.gatesCheckingByCellId,
    gateSummary: gatesState.gateSummary,
    checkGatesForCell: gatesState.checkGatesForCell,
    addGate: gatesState.addGate,
    updateGate: gatesState.updateGate,
    overrideGate: gatesState.overrideGate,
    removeGate: gatesState.removeGate,
    resetGate: gatesState.resetGate,
    saveGates: gatesState.saveGates,
    clearGatesError: gatesState.clearGatesError,

    memoVoiceShortcut,
    screenshotShortcut,
    canUseScopedConfig,
    resolvedRepoRoot,
  };
}

