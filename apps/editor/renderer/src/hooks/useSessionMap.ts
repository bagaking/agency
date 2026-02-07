import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSessionMap, isAgencyAvailable, setSessionMap } from '../services/agencyBridge';

const DEFAULT_CONFIG = {
  version: 1,
  autoOpenSeen: false,
  activityDiffThreshold: 12,
  typeColors: {},
  cellColors: {},
};

export function useSessionMap(options: any = {}) {
  const { projectRoot } = options;
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [configPath, setConfigPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const loadedRef = useRef(false);

  const refreshConfig = useCallback(async () => {
    if (!isAgencyAvailable()) {
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await getSessionMap({ rootPath: projectRoot });
      if (result) {
        setConfig(result);
        setConfigPath(result.configPath || '');
      } else {
        setConfig(DEFAULT_CONFIG);
        setConfigPath('');
      }
      loadedRef.current = true;
    } catch (err) {
      setError(err?.message || 'Failed to load session map config.');
      setConfig(DEFAULT_CONFIG);
      setConfigPath('');
    } finally {
      setLoading(false);
    }
  }, [projectRoot]);

  useEffect(() => {
    refreshConfig();
  }, [refreshConfig]);

  const updateConfig = useCallback(
    async (nextPartial) => {
      if (!isAgencyAvailable()) {
        return null;
      }
      setLoading(true);
      setError('');
      try {
        const next = { ...config, ...nextPartial };
        const result = await setSessionMap({ rootPath: projectRoot, config: next });
        if (result) {
          setConfig(result);
          setConfigPath(result.configPath || '');
        }
        return result;
      } catch (err) {
        setError(err?.message || 'Failed to save session map config.');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [config, projectRoot]
  );

  const hasLoaded = useMemo(() => loadedRef.current, [configPath, config.version]);

  return {
    config,
    configPath,
    loading,
    error,
    refreshConfig,
    updateConfig,
    hasLoaded,
  };
}
