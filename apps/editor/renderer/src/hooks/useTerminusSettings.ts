import { useEffect, useMemo, useState } from 'react';
import {
  BASELINE_PROFILE,
  BASELINE_PROFILE_ID,
  buildBindingRowsByProfile,
  buildProfileRows,
  mergeProfileBindings,
  mergeProfiles,
} from '../utils/terminusSettings';
import { getTerminusSettings, isAgencyAvailable, setTerminusSettings } from '../services/agencyBridge';
import { pathBaseName, useScopedSettingsState } from './shared/scopedSettingsState';

const DEFAULT_SETTINGS = {
  profiles: [BASELINE_PROFILE],
};

const EMPTY_SETTINGS = {
  profiles: [],
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
    label: 'Terminus settings',
    isAvailable: isAgencyAvailable,
  });

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
    () => {
      const merged = mergeProfiles(globalSettings.profiles, projectSettings.profiles, agentSettings.profiles);
      return merged.map((profile) => {
        const inAgent = agentSettings.profiles?.some((p) => p.id === profile.id);
        const inProject = projectSettings.profiles?.some((p) => p.id === profile.id);
        return {
          ...profile,
          sourceScope: inAgent ? 'agent' : inProject ? 'project' : 'global',
        };
      });
    },
    [globalSettings.profiles, projectSettings.profiles, agentSettings.profiles]
  );

  const profileIds = useMemo(
    () => (resolvedProfiles || []).map((profile) => profile.id),
    [resolvedProfiles]
  );

  const resolvedBindingsByProfile = useMemo(
    () =>
      mergeProfileBindings({
        profileIds,
        globalProfiles: globalSettings.profiles,
        projectProfiles: projectSettings.profiles,
        agentProfiles: agentSettings.profiles,
      }),
    [profileIds, globalSettings.profiles, projectSettings.profiles, agentSettings.profiles]
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

  const bindingRowsByProfile = useMemo(
    () =>
      buildBindingRowsByProfile({
        scope: terminusScope,
        profileIds,
        globalProfiles: globalSettings.profiles,
        projectProfiles: projectSettings.profiles,
        agentProfiles: agentSettings.profiles,
      }),
    [terminusScope, profileIds, globalSettings.profiles, projectSettings.profiles, agentSettings.profiles]
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

  const ensureScopedProfile = (profiles, profileId) => {
    if (profiles.some((profile) => profile.id === profileId)) {
      return profiles;
    }
    const source = profileRows.find((profile) => profile.id === profileId);
    if (!source) {
      return profiles;
    }
    const { meta, ...payload } = source;
    return [
      ...profiles,
      {
        ...payload,
        shortcuts: { bindings: [] },
      },
    ];
  };

  const updateBindings = (profileId, updater) => {
    if (!profileId) {
      return;
    }
    updateScopedSettings((current) => {
      const profiles = ensureScopedProfile(current.profiles || [], profileId);
      return {
        ...current,
        profiles: profiles.map((profile) => {
          if (profile.id !== profileId) {
            return profile;
          }
          const existing = Array.isArray(profile.shortcuts?.bindings)
            ? profile.shortcuts.bindings
            : [];
          return {
            ...profile,
            shortcuts: {
              ...(profile.shortcuts || {}),
              bindings: updater(existing),
            },
          };
        }),
      };
    });
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
        shortcuts: { bindings: [] },
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
    const { meta, shortcuts, ...payload } = source;
    updateProfiles((current) => {
      if (current.some((profile) => profile.id === id)) {
        return current;
      }
      return [...current, { ...payload, shortcuts: { bindings: [] } }];
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

  const addBinding = (profileId) => {
    if (scopeDisabled) {
      setError('Select a Cell to edit project or agent Terminus.');
      return;
    }
    if (!profileId) {
      return;
    }
    updateBindings(profileId, (current) => [
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

  const updateBinding = (profileId, id, patch) => {
    updateBindings(profileId, (current) =>
      current.map((binding) => (binding.id === id ? { ...binding, ...patch } : binding))
    );
  };

  const overrideBinding = (profileId, id) => {
    const bindings = bindingRowsByProfile.get(profileId) || [];
    const source = bindings.find((binding) => binding.id === id);
    if (!source) {
      return;
    }
    const { meta, ...payload } = source;
    updateBindings(profileId, (current) => {
      if (current.some((binding) => binding.id === id)) {
        return current;
      }
      return [...current, payload];
    });
  };

  const removeBinding = (profileId, id) => {
    updateBindings(profileId, (current) => current.filter((binding) => binding.id !== id));
  };

  const resetBinding = (profileId, id) => {
    updateBindings(profileId, (current) => current.filter((binding) => binding.id !== id));
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


  return {
    resolvedProfiles,
    resolvedBindingsByProfile,
    profileRows,
    bindingRowsByProfile,
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
