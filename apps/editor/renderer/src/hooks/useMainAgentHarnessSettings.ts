import { useEffect, useMemo, useState } from 'react';

import {
  getMainAgentHarnessSettings,
  isAgencyAvailable,
  setMainAgentHarnessSettings,
} from '../services/agencyBridge';
import { useScopedSettingsState } from './shared/scopedSettingsState';

export const DEFAULT_CODEX_CLI_PROVIDER_SETTINGS: {
  baseUrl: string;
  model: string;
  openAIApiKey: string;
  modelReasoningEffort: string;
  modelContextWindow: number | null;
  modelAutoCompactTokenLimit: number | null;
} = Object.freeze({
  baseUrl: '',
  model: '',
  openAIApiKey: '',
  modelReasoningEffort: '',
  modelContextWindow: null,
  modelAutoCompactTokenLimit: null,
});

const DEFAULT_SETTINGS: {
  providers: {
    codex_cli: typeof DEFAULT_CODEX_CLI_PROVIDER_SETTINGS;
  };
} = Object.freeze({
  providers: {
    codex_cli: DEFAULT_CODEX_CLI_PROVIDER_SETTINGS,
  },
});

function normalizeOptionalString(value: unknown) {
  return String(value || '').trim();
}

function normalizeOptionalInteger(value: unknown) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return null;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Math.max(1, Math.floor(parsed));
}

function normalizeCodexCliProviderSettings(value: any = {}) {
  return {
    baseUrl: normalizeOptionalString(value?.baseUrl),
    model: normalizeOptionalString(value?.model),
    openAIApiKey: normalizeOptionalString(value?.openAIApiKey),
    modelReasoningEffort: normalizeOptionalString(value?.modelReasoningEffort),
    modelContextWindow: normalizeOptionalInteger(value?.modelContextWindow),
    modelAutoCompactTokenLimit: normalizeOptionalInteger(value?.modelAutoCompactTokenLimit),
  };
}

function normalizeSettings(value: any = {}) {
  return {
    providers: {
      codex_cli: normalizeCodexCliProviderSettings(value?.providers?.codex_cli),
    },
  };
}

export function useMainAgentHarnessSettings({ userDataPath = '' } = {}) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
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
    label: 'Main Agent Harness settings',
    isAvailable: isAgencyAvailable,
  });

  useEffect(() => {
    const loadSettings = async () => {
      if (!ensureIpcAvailable('load-global')) {
        return;
      }
      try {
        const loaded = await getMainAgentHarnessSettings();
        setSettings(normalizeSettings(loaded || DEFAULT_SETTINGS));
        clearDirty('global');
      } catch (loadError: any) {
        setError(loadError?.message || 'Failed to load Harness provider settings.');
      }
    };
    loadSettings();
  }, []);

  const codexCliProvider = settings.providers.codex_cli;

  const updateCodexCliProvider = (patch: any) => {
    setSettings((current) =>
      normalizeSettings({
        ...current,
        providers: {
          ...(current?.providers || {}),
          codex_cli: {
            ...(current?.providers?.codex_cli || DEFAULT_CODEX_CLI_PROVIDER_SETTINGS),
            ...(patch || {}),
          },
        },
      })
    );
    markDirty('global');
  };

  const saveSettings = async () => {
    if (!ensureIpcAvailable('save-global')) {
      return;
    }
    setSaving(true);
    setError('');
    try {
      const saved = await setMainAgentHarnessSettings({
        settings,
      });
      setSettings(normalizeSettings(saved || settings));
      clearDirty('global');
    } catch (saveError: any) {
      setError(saveError?.message || 'Failed to save Harness provider settings.');
    } finally {
      setSaving(false);
    }
  };

  const summary = useMemo(
    () => ({
      settingsPath: userDataPath
        ? `${userDataPath}/main-agent-harness/settings.json`
        : 'userData/main-agent-harness/settings.json',
    }),
    [userDataPath]
  );

  return {
    settings,
    codexCliProvider,
    harnessSettingsPath: summary.settingsPath,
    error,
    saving,
    dirty: dirtyByScope.global || false,
    updateCodexCliProvider,
    saveSettings,
    clearError,
  };
}
