import { useCallback, useEffect, useState } from 'react';
import {
  applyAllWorktreeLinks,
  applyWorktreeLink,
  getWorktreeLinks,
  isAgencyMethodAvailable,
  setWorktreeLinks,
} from '../services/agencyBridge';

const generateLinkId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `link-${Date.now()}`;
};

export function useWorktreeLinks({ selectedCell, cells, projectRoot }) {
  const [links, setLinks] = useState([]);
  const [autoLinkOnCreate, setAutoLinkOnCreate] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [statusesByPath, setStatusesByPath] = useState({});
  const [repoRoot, setRepoRoot] = useState('');
  const [configPath, setConfigPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);

  const selectedAttachedWorktreePath = selectedCell?.attachedWorktreePath || '';

  const loadWorktreeLinks = useCallback(
    async ({ preserveEdits = false } = {}) => {
      if (!isAgencyMethodAvailable('getWorktreeLinks')) {
        return;
      }
      if (!projectRoot) {
        setLinks([]);
        setCandidates([]);
        setStatusesByPath({});
        setRepoRoot('');
        setConfigPath('');
        setDirty(false);
        setError('');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const attachedWorktreePaths = (cells || [])
          .map((cell) => cell?.attachedWorktreePath || '')
          .filter(Boolean);
        const summary = await getWorktreeLinks({
          rootPath: projectRoot,
          worktreePath: selectedAttachedWorktreePath,
          worktreePaths: attachedWorktreePaths,
        });
        if (!preserveEdits) {
          const config = summary?.config || {};
          setLinks(Array.isArray(config.links) ? config.links : []);
          setAutoLinkOnCreate(Boolean(config.autoLinkOnCreate));
          setDirty(false);
        }
        setCandidates(Array.isArray(summary?.candidates) ? summary.candidates : []);
        setStatusesByPath(summary?.statusesByPath || {});
        setRepoRoot(summary?.repoRoot || '');
        setConfigPath(summary?.configPath || '');
      } catch (loadError) {
        setError(loadError?.message || 'Failed to load softlinks.');
      } finally {
        setLoading(false);
      }
    },
    [cells, projectRoot, selectedAttachedWorktreePath]
  );

  useEffect(() => {
    loadWorktreeLinks({ preserveEdits: false });
  }, [loadWorktreeLinks]);

  useEffect(() => {
    loadWorktreeLinks({ preserveEdits: dirty });
  }, [dirty, loadWorktreeLinks, selectedAttachedWorktreePath, cells?.length]);

  const updateLinks = useCallback((updater) => {
    setLinks((current) => {
      const next = typeof updater === 'function' ? updater(current) : updater;
      return next;
    });
    setDirty(true);
  }, []);

  const persistWorktreeLinks = useCallback(async () => {
    if (!isAgencyMethodAvailable('setWorktreeLinks')) {
      return null;
    }
    const saved = await setWorktreeLinks({
      rootPath: projectRoot,
      autoLinkOnCreate,
      links,
    });
    if (saved) {
      setLinks(Array.isArray(saved?.links) ? saved.links : []);
      setAutoLinkOnCreate(Boolean(saved?.autoLinkOnCreate));
    }
    setDirty(false);
    return saved;
  }, [autoLinkOnCreate, links, projectRoot]);

  const toggleAuto = useCallback((next) => {
    setAutoLinkOnCreate(next);
    setDirty(true);
  }, []);

  const addLink = useCallback(() => {
    updateLinks((current) => [
      ...current,
      {
        id: generateLinkId(),
        label: '',
        source: '',
        target: '',
      },
    ]);
  }, [updateLinks]);

  const addFromCandidate = useCallback(
    (candidate) => {
      if (!candidate) {
        return;
      }
      updateLinks((current) => [
        ...current,
        {
          id: generateLinkId(),
          label: candidate,
          source: candidate,
          target: candidate,
        },
      ]);
    },
    [updateLinks]
  );

  const updateLink = useCallback(
    (id, patch) => {
      updateLinks((current) =>
        current.map((link) => (link.id === id ? { ...link, ...patch } : link))
      );
    },
    [updateLinks]
  );

  const removeLink = useCallback(
    (id) => {
      updateLinks((current) => current.filter((link) => link.id !== id));
    },
    [updateLinks]
  );

  const saveLinks = useCallback(async () => {
    if (!isAgencyMethodAvailable('setWorktreeLinks')) {
      return;
    }
    if (!projectRoot) {
      setError('Project root is not configured.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await persistWorktreeLinks();
      await loadWorktreeLinks({ preserveEdits: true });
    } catch (saveError) {
      setError(saveError?.message || 'Failed to save softlinks.');
    } finally {
      setLoading(false);
    }
  }, [loadWorktreeLinks, persistWorktreeLinks, projectRoot]);

  const applyLink = useCallback(
    async (linkId, options: any = {}) => {
      const targetPath = options.worktreePath || selectedAttachedWorktreePath;
      if (!targetPath || !isAgencyMethodAvailable('applyWorktreeLink')) {
        return;
      }
      setLoading(true);
      setError('');
      try {
        if (dirty) {
          await persistWorktreeLinks();
        }
        await applyWorktreeLink({
          rootPath: projectRoot,
          worktreePath: targetPath,
          linkId,
        });
        await loadWorktreeLinks({ preserveEdits: false });
      } catch (applyError) {
        setError(applyError?.message || 'Failed to link worktree.');
      } finally {
        setLoading(false);
      }
    },
    [dirty, loadWorktreeLinks, persistWorktreeLinks, projectRoot, selectedAttachedWorktreePath]
  );

  const applyAll = useCallback(
    async (options: any = {}) => {
      const targetPath = options.worktreePath || selectedAttachedWorktreePath;
      if (!targetPath || !isAgencyMethodAvailable('applyAllWorktreeLinks')) {
        return;
      }
      setLoading(true);
      setError('');
      try {
        if (dirty) {
          await persistWorktreeLinks();
        }
        const results = await applyAllWorktreeLinks({
          rootPath: projectRoot,
          worktreePath: targetPath,
        });
        await loadWorktreeLinks({ preserveEdits: false });
        const failures = Array.isArray(results) ? results.filter((item) => !item.ok) : [];
        if (failures.length) {
          const details = failures
            .slice(0, 3)
            .map((item) => `${item.id}: ${item.error}`)
            .join('; ');
          const suffix = failures.length > 3 ? ` (+${failures.length - 3} more)` : '';
          setError(`Link all completed with ${failures.length} failures. ${details}${suffix}`);
        }
      } catch (applyError) {
        setError(applyError?.message || 'Failed to link worktree.');
      } finally {
        setLoading(false);
      }
    },
    [dirty, loadWorktreeLinks, persistWorktreeLinks, projectRoot, selectedAttachedWorktreePath]
  );

  const refreshLinks = useCallback(
    () => loadWorktreeLinks({ preserveEdits: dirty }),
    [dirty, loadWorktreeLinks]
  );

  const clearError = useCallback(() => setError(''), []);

  return {
    links,
    autoLinkOnCreate,
    candidates,
    statusesByPath,
    repoRoot,
    configPath,
    loading,
    error,
    dirty,
    toggleAuto,
    addLink,
    addFromCandidate,
    updateLink,
    removeLink,
    saveLinks,
    applyLink,
    applyAll,
    refreshLinks,
    clearError,
    loadWorktreeLinks,
  };
}
