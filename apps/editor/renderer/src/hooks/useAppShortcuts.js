import { useEffect, useMemo, useState } from 'react';
import {
  buildActionRows,
  buildDefaultActions,
  mergeActions,
} from '../utils/appShortcuts.js';
import {
  applyAppShortcuts,
  getAppShortcuts,
  isAgencyAvailable,
  setAppShortcuts,
} from '../services/agencyBridge.js';
import { pathBaseName, useScopedSettingsState } from './shared/scopedSettingsState.js';

const DEFAULT_ACTIONS = buildDefaultActions();
const EMPTY_ACTIONS = [];

export function useAppShortcuts({ selectedCell, appShortcutsScope, userDataPath }) {
  const [globalActions, setGlobalActions] = useState(DEFAULT_ACTIONS);
  const [projectActions, setProjectActions] = useState(EMPTY_ACTIONS);
  const [agentActions, setAgentActions] = useState(EMPTY_ACTIONS);
  const {
    error,
    setError,
    saving,
    setSaving,
    dirtyByScope,
    ensureIpcAvailable,
    clearDirty,
    markDirty,
    clearError,
  } = useScopedSettingsState({
    label: 'App shortcuts',
    isAvailable: isAgencyAvailable,
  });

  useEffect(() => {
    const loadGlobal = async () => {
      if (!ensureIpcAvailable('load-global')) {
        return;
      }
      try {
        const actions = await getAppShortcuts({ scope: 'global' });
        setGlobalActions(Array.isArray(actions) ? actions : DEFAULT_ACTIONS);
        clearDirty('global');
      } catch (loadError) {
        setError(loadError?.message || 'Failed to load app shortcuts.');
      }
    };
    loadGlobal();
  }, []);

  useEffect(() => {
    const loadScoped = async () => {
      if (!ensureIpcAvailable('load-scoped')) {
        return;
      }
      if (!selectedCell?.worktreePath) {
        setProjectActions(EMPTY_ACTIONS);
        setAgentActions(EMPTY_ACTIONS);
        clearDirty('project');
        clearDirty('agent');
        return;
      }
      try {
        const [project, agent] = await Promise.all([
          getAppShortcuts({ scope: 'project', worktreePath: selectedCell.worktreePath }),
          getAppShortcuts({ scope: 'agent', worktreePath: selectedCell.worktreePath }),
        ]);
        setProjectActions(Array.isArray(project) ? project : EMPTY_ACTIONS);
        setAgentActions(Array.isArray(agent) ? agent : EMPTY_ACTIONS);
        clearDirty('project');
        clearDirty('agent');
      } catch (loadError) {
        setError(loadError?.message || 'Failed to load app shortcuts.');
        setProjectActions(EMPTY_ACTIONS);
        setAgentActions(EMPTY_ACTIONS);
      }
    };
    loadScoped();
  }, [selectedCell?.worktreePath]);

  const globalResolved = useMemo(
    () => mergeActions(DEFAULT_ACTIONS, globalActions || []),
    [globalActions]
  );

  const resolvedActions = useMemo(
    () => mergeActions(globalResolved, projectActions || [], agentActions || []),
    [agentActions, globalResolved, projectActions]
  );

  const actionRows = useMemo(
    () =>
      buildActionRows({
        scope: appShortcutsScope,
        globalActions,
        projectActions,
        agentActions,
      }),
    [appShortcutsScope, globalActions, projectActions, agentActions]
  );

  const scopeActions =
    appShortcutsScope === 'project'
      ? projectActions
      : appShortcutsScope === 'agent'
        ? agentActions
        : globalActions;

  const scopeDisabled = appShortcutsScope !== 'global' && !selectedCell?.worktreePath;

  const worktreeName = selectedCell?.worktreePath ? pathBaseName(selectedCell.worktreePath) : '';
  const projectSettingsPath = selectedCell?.worktreePath
    ? `${selectedCell.worktreePath}/.agency/app-shortcuts.yaml`
    : '';
  const agentSettingsPath = selectedCell?.worktreePath
    ? `${selectedCell.worktreePath}/.agency/app-shortcuts-${worktreeName}.yaml`
    : '';
  const globalSettingsPath = userDataPath ? `${userDataPath}/app-shortcuts.json` : 'Global User Config';

  const updateScopedActions = (updater) => {
    if (appShortcutsScope === 'project') {
      setProjectActions(updater);
      return;
    }
    if (appShortcutsScope === 'agent') {
      setAgentActions(updater);
      return;
    }
    setGlobalActions(updater);
  };

  const overrideAction = (id) => {
    const source = actionRows.find((action) => action.id === id);
    if (!source) {
      return;
    }
    updateScopedActions((current) => {
      if (current.some((action) => action.id === id)) {
        return current;
      }
      const { meta, label, description, category, ...payload } = source;
      return [...current, payload];
    });
    markDirty(appShortcutsScope);
  };

  const updateAction = (id, patch) => {
    updateScopedActions((current) => {
      if (!current.some((action) => action.id === id)) {
        const source = actionRows.find((action) => action.id === id);
        const base = source
          ? { id: source.id, enabled: source.enabled, shortcut: source.shortcut }
          : { id };
        return [...current, { ...base, ...patch }];
      }
      return current.map((action) => (action.id === id ? { ...action, ...patch } : action));
    });
    markDirty(appShortcutsScope);
  };

  const resetAction = (id) => {
    if (appShortcutsScope === 'global') {
      updateScopedActions((current) => {
        const defaults = buildDefaultActions();
        const fallback = defaults.find((action) => action.id === id) || null;
        return current.map((action) =>
          action.id === id && fallback ? { ...action, ...fallback } : action
        );
      });
      markDirty(appShortcutsScope);
      return;
    }
    updateScopedActions((current) => current.filter((action) => action.id !== id));
    markDirty(appShortcutsScope);
  };

  const saveAppShortcuts = async () => {
    if (!ensureIpcAvailable('save')) {
      return;
    }
    if (scopeDisabled) {
      setError('Select a Cell to edit project or agent app shortcuts.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const actionsToSave = scopeActions || [];
      const saved = await setAppShortcuts({
        scope: appShortcutsScope,
        worktreePath: selectedCell?.worktreePath,
        actions: actionsToSave,
      });
      if (appShortcutsScope === 'project') {
        setProjectActions(Array.isArray(saved) ? saved : actionsToSave);
        clearDirty('project');
      } else if (appShortcutsScope === 'agent') {
        setAgentActions(Array.isArray(saved) ? saved : actionsToSave);
        clearDirty('agent');
      } else {
        setGlobalActions(Array.isArray(saved) ? saved : actionsToSave);
        clearDirty('global');
      }
    } catch (saveError) {
      setError(saveError?.message || 'Failed to save app shortcuts.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!ensureIpcAvailable('apply')) {
      return;
    }
    applyAppShortcuts({ actions: resolvedActions }).catch((applyError) => {
      console.error('Failed to apply app shortcuts', applyError);
    });
  }, [resolvedActions]);

  const summary = {
    globalOverrides: projectActions.length > 0 || agentActions.length > 0,
    projectOverrides: projectActions.length > 0,
    agentOverrides: agentActions.length > 0,
    agentLabel: selectedCell?.name || 'Select Cell',
  };

  const dirty = dirtyByScope[appShortcutsScope] || false;

  return {
    resolvedActions,
    actionRows,
    scopeActions,
    scopeDisabled,
    projectSettingsPath,
    agentSettingsPath,
    globalSettingsPath,
    error,
    saving,
    dirty,
    summary,
    overrideAction,
    updateAction,
    resetAction,
    saveAppShortcuts,
    clearError,
  };
}
