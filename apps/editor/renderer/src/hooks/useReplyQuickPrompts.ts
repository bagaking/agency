import { useEffect, useMemo, useState } from 'react';
import {
  getReplyQuickPrompts,
  isAgencyAvailable,
  setReplyQuickPrompts,
} from '../services/agencyBridge';
import { useScopedSettingsState } from './shared/scopedSettingsState';
import {
  generateReplyPromptId,
  normalizePromptList,
  resolveReplyQuickPrompts,
} from '../utils/replyQuickPrompts';

const EMPTY_PROMPTS = [];

function buildScopeRequirementMessage(scope: string): string {
  if (scope === 'project') {
    return 'Select a project to edit project reply quick prompts.';
  }
  return 'Select a Cell to edit agent reply quick prompts.';
}

export function useReplyQuickPrompts({ projectRoot, selectedCell, scope, userDataPath }: any) {
  const [globalPrompts, setGlobalPrompts] = useState(EMPTY_PROMPTS);
  const [projectPrompts, setProjectPrompts] = useState(EMPTY_PROMPTS);
  const [agentPrompts, setAgentPrompts] = useState(EMPTY_PROMPTS);
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
    label: 'Reply quick prompts',
    isAvailable: isAgencyAvailable,
  });

  useEffect(() => {
    const loadGlobalPrompts = async () => {
      if (!ensureIpcAvailable('load-global')) {
        return;
      }
      try {
        const prompts = await getReplyQuickPrompts({ scope: 'global' });
        setGlobalPrompts(normalizePromptList(prompts));
        clearDirty('global');
      } catch (loadError) {
        setError(loadError?.message || 'Failed to load reply quick prompts.');
      }
    };
    loadGlobalPrompts();
  }, []);

  useEffect(() => {
    const loadScopedPrompts = async () => {
      if (!ensureIpcAvailable('load-scoped')) {
        return;
      }
      if (!projectRoot) {
        setProjectPrompts(EMPTY_PROMPTS);
        setAgentPrompts(EMPTY_PROMPTS);
        clearDirty('project');
        clearDirty('agent');
        return;
      }
      try {
        const [project, agent] = await Promise.all([
          getReplyQuickPrompts({
            scope: 'project',
            projectRoot,
            worktreePath: selectedCell?.worktreePath,
          }),
          selectedCell?.id
            ? getReplyQuickPrompts({
                scope: 'agent',
                projectRoot,
                cellId: selectedCell.id,
                worktreePath: selectedCell.worktreePath,
              })
            : Promise.resolve(EMPTY_PROMPTS),
        ]);
        setProjectPrompts(normalizePromptList(project));
        setAgentPrompts(normalizePromptList(agent));
        clearDirty('project');
        clearDirty('agent');
      } catch (loadError) {
        setError(loadError?.message || 'Failed to load reply quick prompts.');
        setProjectPrompts(EMPTY_PROMPTS);
        setAgentPrompts(EMPTY_PROMPTS);
      }
    };
    loadScopedPrompts();
  }, [projectRoot, selectedCell?.id, selectedCell?.worktreePath]);

  const scopePrompts =
    scope === 'project'
      ? projectPrompts
      : scope === 'agent'
        ? agentPrompts
        : globalPrompts;

  const scopeDisabled =
    scope === 'project'
      ? !projectRoot
      : scope === 'agent'
        ? !projectRoot || !selectedCell?.id
        : false;
  const projectSettingsPath = projectRoot ? `${projectRoot}/.agency/reply-quick-prompts.yaml` : '';
  const agentSettingsPath =
    projectRoot && selectedCell?.id
      ? `${projectRoot}/.agency/cells/${selectedCell.id}/reply-quick-prompts.yaml`
      : '';
  const globalSettingsPath = userDataPath
    ? `${userDataPath}/reply-quick-prompts.json`
    : 'Global User Config';

  const resolvedPrompts = useMemo(
    () =>
      resolveReplyQuickPrompts({
        globalPrompts,
        projectPrompts,
        agentPrompts,
      }),
    [globalPrompts, projectPrompts, agentPrompts]
  );

  const updateScopePrompts = (updater) => {
    if (scope === 'project') {
      setProjectPrompts(updater);
      return;
    }
    if (scope === 'agent') {
      setAgentPrompts(updater);
      return;
    }
    setGlobalPrompts(updater);
  };

  const addPrompt = () => {
    if (scopeDisabled) {
      setError(buildScopeRequirementMessage(scope));
      return;
    }
    updateScopePrompts((current) => [
      ...current,
      {
        id: generateReplyPromptId(),
        title: '',
        text: '',
        enabled: true,
      },
    ]);
    markDirty(scope);
  };

  const updatePrompt = (id, patch) => {
    updateScopePrompts((current) =>
      current.map((prompt) => (prompt.id === id ? { ...prompt, ...patch } : prompt))
    );
    markDirty(scope);
  };

  const removePrompt = (id) => {
    updateScopePrompts((current) => current.filter((prompt) => prompt.id !== id));
    markDirty(scope);
  };

  const savePrompts = async () => {
    if (!ensureIpcAvailable('save')) {
      return;
    }
    if (scopeDisabled) {
      setError(buildScopeRequirementMessage(scope));
      return;
    }
    setSaving(true);
    setError('');
    try {
      const promptsToSave = normalizePromptList(scopePrompts);
      const saved = await setReplyQuickPrompts({
        scope,
        projectRoot,
        cellId: selectedCell?.id,
        worktreePath: selectedCell?.worktreePath,
        prompts: promptsToSave,
      });
      const normalizedSaved = normalizePromptList(saved || promptsToSave);
      if (scope === 'project') {
        setProjectPrompts(normalizedSaved);
        clearDirty('project');
      } else if (scope === 'agent') {
        setAgentPrompts(normalizedSaved);
        clearDirty('agent');
      } else {
        setGlobalPrompts(normalizedSaved);
        clearDirty('global');
      }
    } catch (saveError) {
      setError(saveError?.message || 'Failed to save reply quick prompts.');
    } finally {
      setSaving(false);
    }
  };

  const summary = {
    globalOverrides: projectPrompts.length > 0 || agentPrompts.length > 0,
    projectOverrides: projectPrompts.length > 0,
    agentOverrides: agentPrompts.length > 0,
    agentLabel: selectedCell?.name || 'Select Cell',
  };

  return {
    scopePrompts,
    resolvedPrompts,
    scopeDisabled,
    projectSettingsPath,
    agentSettingsPath,
    globalSettingsPath,
    error,
    saving,
    dirty: dirtyByScope[scope] || false,
    summary,
    addPrompt,
    updatePrompt,
    removePrompt,
    savePrompts,
    clearError,
  };
}
