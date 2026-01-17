import { useEffect, useMemo, useState } from 'react';
import {
  BASELINE_PROFILE,
  BASELINE_PROFILE_ID,
  buildBindingRows,
  buildProfileRows,
  mergeBindings,
  mergeProfiles,
} from '../utils/terminusSettings.js';
import { getTerminusSettings, isAgencyAvailable, setTerminusSettings } from '../services/agencyBridge.js';

const pathBaseName = (value) => value.split('/').filter(Boolean).pop() || value;

const DEFAULT_SETTINGS = {
  profiles: [BASELINE_PROFILE],
  shortcuts: {
    bindings: [],
  },
};

const EMPTY_SETTINGS = {
  profiles: [],
  shortcuts: {
    bindings: [],
  },
};

const generateId = (prefix) => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}`;
};

export function useTerminusSettings({ selectedCell, terminusScope }) {
  const [globalSettings, setGlobalSettings] = useState(DEFAULT_SETTINGS);
  const [projectSettings, setProjectSettings] = useState(EMPTY_SETTINGS);
  const [agentSettings, setAgentSettings] = useState(EMPTY_SETTINGS);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirtyByScope, setDirtyByScope] = useState({
    global: false,
    project: false,
    agent: false,
  });

  const ensureIpcAvailable = (context) => {
    if (isAgencyAvailable()) {
      return true;
    }
    setError('IPC unavailable. Reload the app or reinstall the packaged build.');
    console.error('Terminus settings IPC unavailable', context ? { context } : {});
    return false;
  };

  const clearDirty = (scope) => {
    setDirtyByScope((current) => (current[scope] ? { ...current, [scope]: false } : current));
  };

  const markDirty = (scope) => {
    setDirtyByScope((current) => (current[scope] ? current : { ...current, [scope]: true }));
  };

  useEffect(() => {
    const loadGlobal = async () => {
      if (!ensureIpcAvailable('load-global')) {
        return;
      }
      try {
        const settings = await getTerminusSettings({ scope: 'global' });
        setGlobalSettings(settings || DEFAULT_SETTINGS);
        clearDirty('global');
      } catch (loadError) {
        setError(loadError?.message || 'Failed to load terminus settings.');
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
          getTerminusSettings({ scope: 'project', worktreePath: selectedCell.worktreePath }),
          getTerminusSettings({ scope: 'agent', worktreePath: selectedCell.worktreePath }),
        ]);
        setProjectSettings(project || EMPTY_SETTINGS);
        setAgentSettings(agent || EMPTY_SETTINGS);
        clearDirty('project');
        clearDirty('agent');
      } catch (loadError) {
        setError(loadError?.message || 'Failed to load terminus settings.');
        setProjectSettings(EMPTY_SETTINGS);
        setAgentSettings(EMPTY_SETTINGS);
      }
    };
    loadScoped();
  }, [selectedCell?.worktreePath]);

  const resolvedProfiles = useMemo(
    () => mergeProfiles(globalSettings.profiles, projectSettings.profiles, agentSettings.profiles),
    [globalSettings.profiles, projectSettings.profiles, agentSettings.profiles]
  );

  const resolvedBindings = useMemo(
    () => mergeBindings(
      globalSettings.shortcuts?.bindings,
      projectSettings.shortcuts?.bindings,
      agentSettings.shortcuts?.bindings
    ),
    [
      globalSettings.shortcuts?.bindings,
      projectSettings.shortcuts?.bindings,
      agentSettings.shortcuts?.bindings,
    ]
  );

  const profileRows = useMemo(
    () =>
      buildProfileRows({
        scope: terminusScope,
        globalProfiles: globalSettings.profiles,
        projectProfiles: projectSettings.profiles,
        agentProfiles: agentSettings.profiles,
      }),
    [terminusScope, globalSettings.profiles, projectSettings.profiles, agentSettings.profiles]
  );

  const bindingRows = useMemo(
    () =>
      buildBindingRows({
        scope: terminusScope,
        globalBindings: globalSettings.shortcuts?.bindings || [],
        projectBindings: projectSettings.shortcuts?.bindings || [],
        agentBindings: agentSettings.shortcuts?.bindings || [],
      }),
    [
      terminusScope,
      globalSettings.shortcuts?.bindings,
      projectSettings.shortcuts?.bindings,
      agentSettings.shortcuts?.bindings,
    ]
  );

  const scopeSettings =
    terminusScope === 'project'
      ? projectSettings
      : terminusScope === 'agent'
        ? agentSettings
        : globalSettings;

  const scopeDisabled = terminusScope !== 'global' && !selectedCell?.worktreePath;
  const worktreeName = selectedCell?.worktreePath ? pathBaseName(selectedCell.worktreePath) : '';
  const projectSettingsPath = selectedCell?.worktreePath
    ? `${selectedCell.worktreePath}/.agency/terminus-settings.yaml`
    : '';
  const agentSettingsPath = selectedCell?.worktreePath
    ? `${selectedCell.worktreePath}/.agency/terminus-settings-${worktreeName}.yaml`
    : '';

  const updateScopedSettings = (updater) => {
    if (terminusScope === 'project') {
      setProjectSettings(updater);
      return;
    }
    if (terminusScope === 'agent') {
      setAgentSettings(updater);
      return;
    }
    setGlobalSettings(updater);
  };

  const updateProfiles = (updater) => {
    updateScopedSettings((current) => ({
      ...current,
      profiles: updater(current.profiles || []),
    }));
    markDirty(terminusScope);
  };

  const updateBindings = (updater) => {
    updateScopedSettings((current) => ({
      ...current,
      shortcuts: {
        ...(current.shortcuts || {}),
        bindings: updater(current.shortcuts?.bindings || []),
      },
    }));
    markDirty(terminusScope);
  };

  const addProfile = () => {
    if (scopeDisabled) {
      setError('Select a Cell to edit project or agent Terminus.');
      return;
    }
    updateProfiles((current) => [
      ...current,
      {
        id: generateId('profile'),
        label: 'New Terminus',
        startCommand: '',
        resumeCommand: '',
      },
    ]);
  };

  const updateProfile = (id, patch) => {
    updateProfiles((current) =>
      current.map((profile) => (profile.id === id ? { ...profile, ...patch } : profile))
    );
  };

  const overrideProfile = (id) => {
    const source = profileRows.find((profile) => profile.id === id);
    if (!source) {
      return;
    }
    const { meta, ...payload } = source;
    updateProfiles((current) => {
      if (current.some((profile) => profile.id === id)) {
        return current;
      }
      return [...current, payload];
    });
  };

  const removeProfile = (id) => {
    if (id === BASELINE_PROFILE_ID) {
      return;
    }
    updateProfiles((current) => current.filter((profile) => profile.id !== id));
  };

  const resetProfile = (id) => {
    updateProfiles((current) => current.filter((profile) => profile.id !== id));
  };

  const addBinding = () => {
    if (scopeDisabled) {
      setError('Select a Cell to edit project or agent Terminus.');
      return;
    }
    updateBindings((current) => [
      ...current,
      {
        id: generateId('binding'),
        label: 'New Shortcut',
        key: '',
        action: {
          type: 'sendKeys',
          keys: ['Enter'],
        },
      },
    ]);
  };

  const updateBinding = (id, patch) => {
    updateBindings((current) =>
      current.map((binding) => (binding.id === id ? { ...binding, ...patch } : binding))
    );
  };

  const overrideBinding = (id) => {
    const source = bindingRows.find((binding) => binding.id === id);
    if (!source) {
      return;
    }
    const { meta, ...payload } = source;
    updateBindings((current) => {
      if (current.some((binding) => binding.id === id)) {
        return current;
      }
      return [...current, payload];
    });
  };

  const removeBinding = (id) => {
    updateBindings((current) => current.filter((binding) => binding.id !== id));
  };

  const resetBinding = (id) => {
    updateBindings((current) => current.filter((binding) => binding.id !== id));
  };

  const saveSettings = async () => {
    if (!ensureIpcAvailable('save')) {
      return;
    }
    if (scopeDisabled) {
      setError('Select a Cell to edit project or agent Terminus.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const settingsToSave = scopeSettings || DEFAULT_SETTINGS;
      const saved = await setTerminusSettings({
        scope: terminusScope,
        worktreePath: selectedCell?.worktreePath,
        settings: settingsToSave,
      });
      if (terminusScope === 'project') {
        setProjectSettings(saved || settingsToSave);
        clearDirty('project');
      } else if (terminusScope === 'agent') {
        setAgentSettings(saved || settingsToSave);
        clearDirty('agent');
      } else {
        setGlobalSettings(saved || settingsToSave);
        clearDirty('global');
      }
    } catch (saveError) {
      setError(saveError?.message || 'Failed to save terminus settings.');
    } finally {
      setSaving(false);
    }
  };

  const summary = {
    globalOverrides: projectSettings.profiles.length > 0 || agentSettings.profiles.length > 0,
    projectOverrides: projectSettings.profiles.length > 0,
    agentOverrides: agentSettings.profiles.length > 0,
    agentLabel: selectedCell?.name || 'Select Cell',
  };

  const dirty = dirtyByScope[terminusScope] || false;

  const clearError = () => setError('');

  return {
    resolvedProfiles,
    resolvedBindings,
    profileRows,
    bindingRows,
    scopeSettings,
    scopeDisabled,
    projectSettingsPath,
    agentSettingsPath,
    error,
    saving,
    dirty,
    summary,
    addProfile,
    updateProfile,
    overrideProfile,
    removeProfile,
    resetProfile,
    addBinding,
    updateBinding,
    overrideBinding,
    removeBinding,
    resetBinding,
    saveSettings,
    clearError,
  };
}
