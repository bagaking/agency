import { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_SETTINGS,
  EMPTY_SETTINGS,
  resolveSessionNaming,
  normalizeSettings,
} from '../utils/sessionNaming';
import {
  getSessionNamingSettings,
  isAgencyAvailable,
  setSessionNamingSettings,
} from '../services/agencyBridge';
import { pathBaseName, useScopedSettingsState } from './shared/scopedSettingsState';

type SessionNamingSettingsState = {
  rule: string;
  nameLists: Record<string, string[]>;
};

const ensureName = (value) => String(value || '').trim();

const hasOverrides = (settings) => {
  if (!settings) {
    return false;
  }
  const rule = ensureName(settings.rule);
  const lists = settings.nameLists || {};
  return Boolean(rule) || Object.keys(lists).length > 0;
};

export function useSessionNamingSettings({ selectedCell, sessionNamingScope, userDataPath }) {
  const [globalSettings, setGlobalSettings] = useState<SessionNamingSettingsState>(DEFAULT_SETTINGS);
  const [projectSettings, setProjectSettings] = useState<SessionNamingSettingsState>(EMPTY_SETTINGS);
  const [agentSettings, setAgentSettings] = useState<SessionNamingSettingsState>(EMPTY_SETTINGS);
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
    label: 'Session naming',
    isAvailable: isAgencyAvailable,
  });

  useEffect(() => {
    const loadGlobal = async () => {
      if (!ensureIpcAvailable('load-global')) {
        return;
      }
      try {
        const settings = await getSessionNamingSettings({ scope: 'global' });
        setGlobalSettings(normalizeSettings(settings || DEFAULT_SETTINGS, { includeDefaults: true }));
        clearDirty('global');
      } catch (loadError) {
        setError(loadError?.message || 'Failed to load session naming settings.');
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
        setProjectSettings(EMPTY_SETTINGS);
        setAgentSettings(EMPTY_SETTINGS);
        clearDirty('project');
        clearDirty('agent');
        return;
      }
      try {
        const [project, agent] = await Promise.all([
          getSessionNamingSettings({ scope: 'project', worktreePath: selectedCell.worktreePath }),
          getSessionNamingSettings({ scope: 'agent', worktreePath: selectedCell.worktreePath }),
        ]);
        setProjectSettings(normalizeSettings(project || EMPTY_SETTINGS));
        setAgentSettings(normalizeSettings(agent || EMPTY_SETTINGS));
        clearDirty('project');
        clearDirty('agent');
      } catch (loadError) {
        setError(loadError?.message || 'Failed to load session naming settings.');
        setProjectSettings(EMPTY_SETTINGS);
        setAgentSettings(EMPTY_SETTINGS);
      }
    };
    loadScoped();
  }, [selectedCell?.worktreePath]);

  const resolvedSettings = useMemo(
    () => resolveSessionNaming({ globalSettings, projectSettings, agentSettings }),
    [globalSettings, projectSettings, agentSettings]
  );

  const scopeSettings =
    sessionNamingScope === 'project'
      ? projectSettings
      : sessionNamingScope === 'agent'
        ? agentSettings
        : globalSettings;

  const scopeDisabled = sessionNamingScope !== 'global' && !selectedCell?.worktreePath;

  const worktreeName = selectedCell?.worktreePath ? pathBaseName(selectedCell.worktreePath) : '';
  const projectSettingsPath = selectedCell?.worktreePath
    ? `${selectedCell.worktreePath}/.agency/session-naming.yaml`
    : '';
  const agentSettingsPath = selectedCell?.worktreePath
    ? `${selectedCell.worktreePath}/.agency/session-naming-${worktreeName}.yaml`
    : '';
  const globalSettingsPath = userDataPath
    ? `${userDataPath}/session-naming.json`
    : 'Global User Config';

  const updateScopedSettings = (updater) => {
    if (sessionNamingScope === 'project') {
      setProjectSettings(updater);
      return;
    }
    if (sessionNamingScope === 'agent') {
      setAgentSettings(updater);
      return;
    }
    setGlobalSettings(updater);
  };

  const updateRule = (rule) => {
    updateScopedSettings((current) => ({
      ...current,
      rule: String(rule || ''),
    }));
    markDirty(sessionNamingScope);
  };

  const updateNameList = (name, items) => {
    const listName = ensureName(name);
    if (!listName) {
      return;
    }
    updateScopedSettings((current) => {
      const nextLists = { ...(current.nameLists || {}) };
      nextLists[listName] = Array.isArray(items) ? items : [];
      return { ...current, nameLists: nextLists };
    });
    markDirty(sessionNamingScope);
  };

  const removeNameList = (name) => {
    const listName = ensureName(name);
    if (!listName) {
      return;
    }
    updateScopedSettings((current) => {
      const nextLists = { ...(current.nameLists || {}) };
      delete nextLists[listName];
      return { ...current, nameLists: nextLists };
    });
    markDirty(sessionNamingScope);
  };

  const renameNameList = (currentName, nextName) => {
    const from = ensureName(currentName);
    const to = ensureName(nextName);
    if (!from || !to || from === to) {
      return;
    }
    updateScopedSettings((current) => {
      const nextLists = { ...(current.nameLists || {}) };
      if (!Object.prototype.hasOwnProperty.call(nextLists, from)) {
        return current;
      }
      const items = nextLists[from];
      delete nextLists[from];
      nextLists[to] = items;
      return { ...current, nameLists: nextLists };
    });
    markDirty(sessionNamingScope);
  };

  const addNameList = () => {
    updateScopedSettings((current) => {
      const nextLists = { ...(current.nameLists || {}) };
      let index = 1;
      let name = `custom-${index}`;
      while (nextLists[name]) {
        index += 1;
        name = `custom-${index}`;
      }
      nextLists[name] = ['Alpha', 'Beta', 'Gamma'];
      return { ...current, nameLists: nextLists };
    });
    markDirty(sessionNamingScope);
  };

  const saveSettings = async () => {
    if (!ensureIpcAvailable('save')) {
      return;
    }
    if (scopeDisabled) {
      setError('Select a Cell to edit project or agent session naming rules.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const settingsToSave = scopeSettings || DEFAULT_SETTINGS;
      const saved = await setSessionNamingSettings({
        scope: sessionNamingScope,
        worktreePath: selectedCell?.worktreePath,
        settings: settingsToSave,
      });
      const normalized = normalizeSettings(saved || settingsToSave, {
        includeDefaults: sessionNamingScope === 'global',
      });
      if (sessionNamingScope === 'project') {
        setProjectSettings(normalized);
        clearDirty('project');
      } else if (sessionNamingScope === 'agent') {
        setAgentSettings(normalized);
        clearDirty('agent');
      } else {
        setGlobalSettings(normalized);
        clearDirty('global');
      }
    } catch (saveError) {
      setError(saveError?.message || 'Failed to save session naming settings.');
    } finally {
      setSaving(false);
    }
  };

  const summary = {
    globalOverrides: hasOverrides(projectSettings) || hasOverrides(agentSettings),
    projectOverrides: hasOverrides(projectSettings),
    agentOverrides: hasOverrides(agentSettings),
    agentLabel: selectedCell?.name || 'Select Cell',
  };

  const dirty = dirtyByScope[sessionNamingScope] || false;

  return {
    scopeSettings,
    resolvedSettings,
    scopeDisabled,
    projectSettingsPath,
    agentSettingsPath,
    globalSettingsPath,
    error,
    saving,
    dirty,
    summary,
    updateRule,
    updateNameList,
    removeNameList,
    renameNameList,
    addNameList,
    saveSettings,
    clearError,
  };
}
