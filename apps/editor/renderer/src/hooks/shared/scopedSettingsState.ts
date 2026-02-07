import { useCallback, useState } from 'react';

const DEFAULT_DIRTY_BY_SCOPE = Object.freeze({
  global: false,
  project: false,
  agent: false,
});

export const pathBaseName = (value) => String(value || '').split('/').filter(Boolean).pop() || value;

export const createDirtyByScope = () => ({ ...DEFAULT_DIRTY_BY_SCOPE });

export function useScopedSettingsState({ label, isAvailable }) {
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirtyByScope, setDirtyByScope] = useState(createDirtyByScope);

  const ensureIpcAvailable = useCallback(
    (context) => {
      if (isAvailable()) {
        return true;
      }
      setError('IPC unavailable. Reload the app or reinstall the packaged build.');
      console.error(`${label} IPC unavailable`, context ? { context } : {});
      return false;
    },
    [isAvailable, label]
  );

  const clearDirty = useCallback((scope) => {
    setDirtyByScope((current) => (current[scope] ? { ...current, [scope]: false } : current));
  }, []);

  const markDirty = useCallback((scope) => {
    setDirtyByScope((current) => (current[scope] ? current : { ...current, [scope]: true }));
  }, []);

  const clearError = useCallback(() => setError(''), []);

  return {
    error,
    setError,
    saving,
    setSaving,
    dirtyByScope,
    ensureIpcAvailable,
    clearDirty,
    markDirty,
    clearError,
  };
}
