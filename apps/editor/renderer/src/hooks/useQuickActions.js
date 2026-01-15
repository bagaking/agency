import { useEffect, useMemo, useState } from 'react';
import { buildActionRows, mergeQuickActions } from '../utils/quickActions.js';
import { getQuickActions, isAgencyAvailable, setQuickActions } from '../services/agencyBridge.js';

const pathBaseName = (value) => value.split('/').filter(Boolean).pop() || value;

const generateActionId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `action-${Date.now()}`;
};

export function useQuickActions({ selectedCell, actionsScope }) {
  const [globalQuickActions, setGlobalQuickActions] = useState([]);
  const [projectQuickActions, setProjectQuickActions] = useState([]);
  const [agentQuickActions, setAgentQuickActions] = useState([]);
  const [quickActionsError, setQuickActionsError] = useState('');
  const [quickActionsSaving, setQuickActionsSaving] = useState(false);
  const [dirtyByScope, setDirtyByScope] = useState({
    global: false,
    project: false,
    agent: false,
  });

  const ensureIpcAvailable = (context) => {
    if (isAgencyAvailable()) {
      return true;
    }
    setQuickActionsError('IPC unavailable. Reload the app or reinstall the packaged build.');
    console.error('Quick actions IPC unavailable', context ? { context } : {});
    return false;
  };

  const clearDirty = (scope) => {
    setDirtyByScope((current) => {
      if (!current[scope]) {
        return current;
      }
      return { ...current, [scope]: false };
    });
  };

  const markDirty = (scope) => {
    setDirtyByScope((current) => {
      if (current[scope]) {
        return current;
      }
      return { ...current, [scope]: true };
    });
  };

  useEffect(() => {
    const loadGlobalQuickActions = async () => {
      if (!ensureIpcAvailable('load-global')) {
        return;
      }
      try {
        const actions = await getQuickActions({ scope: 'global' });
        setGlobalQuickActions(Array.isArray(actions) ? actions : []);
        clearDirty('global');
      } catch (error) {
        setQuickActionsError(error?.message || 'Failed to load quick actions.');
      }
    };
    loadGlobalQuickActions();
  }, []);

  useEffect(() => {
    const loadScopedQuickActions = async () => {
      if (!ensureIpcAvailable('load-scoped')) {
        return;
      }
      if (!selectedCell?.worktreePath) {
        setProjectQuickActions([]);
        setAgentQuickActions([]);
        clearDirty('project');
        clearDirty('agent');
        return;
      }
      try {
        const [project, agent] = await Promise.all([
          getQuickActions({
            scope: 'project',
            worktreePath: selectedCell.worktreePath,
          }),
          getQuickActions({
            scope: 'agent',
            worktreePath: selectedCell.worktreePath,
          }),
        ]);
        setProjectQuickActions(Array.isArray(project) ? project : []);
        setAgentQuickActions(Array.isArray(agent) ? agent : []);
        clearDirty('project');
        clearDirty('agent');
      } catch (error) {
        setQuickActionsError(error?.message || 'Failed to load quick actions.');
        setProjectQuickActions([]);
        setAgentQuickActions([]);
      }
    };
    loadScopedQuickActions();
  }, [selectedCell?.worktreePath]);

  const resolvedQuickActions = useMemo(
    () => mergeQuickActions(globalQuickActions, projectQuickActions, agentQuickActions),
    [globalQuickActions, projectQuickActions, agentQuickActions]
  );

  const actionsRows = useMemo(
    () =>
      buildActionRows({
        scope: actionsScope,
        globalActions: globalQuickActions,
        projectActions: projectQuickActions,
        agentActions: agentQuickActions,
      }),
    [actionsScope, globalQuickActions, projectQuickActions, agentQuickActions]
  );

  const scopeActions =
    actionsScope === 'project'
      ? projectQuickActions
      : actionsScope === 'agent'
        ? agentQuickActions
        : globalQuickActions;

  const worktreeName = selectedCell?.worktreePath ? pathBaseName(selectedCell.worktreePath) : '';
  const projectActionsPath = selectedCell?.worktreePath
    ? `${selectedCell.worktreePath}/.agency/quick-actions.yaml`
    : '';
  const agentActionsPath = selectedCell?.worktreePath
    ? `${selectedCell.worktreePath}/.agency/quick-actions-${worktreeName}.yaml`
    : '';
  const scopeDisabled = actionsScope !== 'global' && !selectedCell?.worktreePath;

  const updateScopedActions = (updater) => {
    if (actionsScope === 'project') {
      setProjectQuickActions(updater);
      return;
    }
    if (actionsScope === 'agent') {
      setAgentQuickActions(updater);
      return;
    }
    setGlobalQuickActions(updater);
  };

  const addQuickAction = () => {
    if (actionsScope !== 'global' && !selectedCell?.worktreePath) {
      setQuickActionsError('Select a Cell to edit project or agent actions.');
      return;
    }
    updateScopedActions((current) => [
      ...current,
      {
        id: generateActionId(),
        label: 'New Terminus',
        startCommand: '',
        resumeCommand: '',
      },
    ]);
    markDirty(actionsScope);
  };

  const updateQuickAction = (id, patch) => {
    updateScopedActions((current) =>
      current.map((action) => (action.id === id ? { ...action, ...patch } : action))
    );
    markDirty(actionsScope);
  };

  const overrideQuickAction = (id) => {
    const source = actionsRows.find((action) => action.id === id);
    if (!source) {
      return;
    }
    const { meta, ...payload } = source;
    updateScopedActions((current) => {
      if (current.some((action) => action.id === id)) {
        return current;
      }
      return [...current, payload];
    });
    markDirty(actionsScope);
  };

  const removeQuickAction = (id) => {
    updateScopedActions((current) => current.filter((action) => action.id !== id));
    markDirty(actionsScope);
  };

  const resetQuickAction = (id) => {
    updateScopedActions((current) => current.filter((action) => action.id !== id));
    markDirty(actionsScope);
  };

  const saveQuickActions = async () => {
    if (!ensureIpcAvailable('save')) {
      return;
    }
    if (actionsScope !== 'global' && !selectedCell?.worktreePath) {
      setQuickActionsError('Select a Cell to edit project or agent actions.');
      return;
    }
    setQuickActionsSaving(true);
    setQuickActionsError('');
    try {
      const actionsToSave = scopeActions;
      const saved = await setQuickActions({
        scope: actionsScope,
        worktreePath: selectedCell?.worktreePath,
        actions: actionsToSave,
      });
      if (actionsScope === 'project') {
        setProjectQuickActions(Array.isArray(saved) ? saved : actionsToSave);
        clearDirty('project');
      } else if (actionsScope === 'agent') {
        setAgentQuickActions(Array.isArray(saved) ? saved : actionsToSave);
        clearDirty('agent');
      } else {
        setGlobalQuickActions(Array.isArray(saved) ? saved : actionsToSave);
        clearDirty('global');
      }
    } catch (error) {
      setQuickActionsError(error?.message || 'Failed to save quick actions.');
    } finally {
      setQuickActionsSaving(false);
    }
  };

  const actionSummary = {
    globalOverrides: projectQuickActions.length > 0 || agentQuickActions.length > 0,
    projectOverrides: projectQuickActions.length > 0,
    agentOverrides: agentQuickActions.length > 0,
    agentLabel: selectedCell?.name || 'Select Cell',
  };

  const clearQuickActionsError = () => setQuickActionsError('');
  const quickActionsDirty = dirtyByScope[actionsScope] || false;

  return {
    resolvedQuickActions,
    actionsRows,
    scopeActions,
    scopeDisabled,
    projectActionsPath,
    agentActionsPath,
    quickActionsError,
    quickActionsSaving,
    quickActionsDirty,
    actionSummary,
    addQuickAction,
    updateQuickAction,
    overrideQuickAction,
    removeQuickAction,
    resetQuickAction,
    saveQuickActions,
    clearQuickActionsError,
  };
}
