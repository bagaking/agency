import { useEffect, useMemo, useState } from 'react';
import {
  getReplyQuickPrompts,
  isAgencyAvailable,
  setReplyQuickPrompts,
} from '../services/agencyBridge';
import { pathBaseName, useScopedSettingsState } from './shared/scopedSettingsState';
import {
  generateReplyPromptId,
  normalizePromptList,
  resolveReplyQuickPrompts,
} from '../utils/replyQuickPrompts';

const EMPTY_PROMPTS = [];

export function useReplyQuickPrompts({ selectedCell, scope, userDataPath }: any) {
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
      if (!selectedCell?.worktreePath) {
        setProjectPrompts(EMPTY_PROMPTS);
        setAgentPrompts(EMPTY_PROMPTS);
        clearDirty('project');
        clearDirty('agent');
        return;
      }
      try {
        const [project, agent] = await Promise.all([
          getReplyQuickPrompts({ scope: 'project', worktreePath: selectedCell.worktreePath }),
          getReplyQuickPrompts({ scope: 'agent', worktreePath: selectedCell.worktreePath }),
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
  }, [selectedCell?.worktreePath]);

  const scopePrompts =
    scope === 'project'
      ? projectPrompts
      : scope === 'agent'
        ? agentPrompts
        : globalPrompts;

  const scopeDisabled = scope !== 'global' && !selectedCell?.worktreePath;
  const worktreeName = selectedCell?.worktreePath ? pathBaseName(selectedCell.worktreePath) : '';
  const projectSettingsPath = selectedCell?.worktreePath
    ? `${selectedCell.worktreePath}/.agency/reply-quick-prompts.yaml`
    : '';
  const agentSettingsPath = selectedCell?.worktreePath
    ? `${selectedCell.worktreePath}/.agency/reply-quick-prompts-${worktreeName}.yaml`
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
      setError('Select a Cell to edit project or agent reply quick prompts.');
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
      setError('Select a Cell to edit project or agent reply quick prompts.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const promptsToSave = normalizePromptList(scopePrompts);
      const saved = await setReplyQuickPrompts({
        scope,
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
