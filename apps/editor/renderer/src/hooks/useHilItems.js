import { useCallback, useEffect, useState } from 'react';
import { listHilItems } from '../services/agencyBridge.js';

const DEFAULT_FILTERS = {
  kind: 'all',
  status: 'all',
};

export function useHilItems({ worktreePath, fetchAll = false }) {
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadItems = useCallback(
    async (nextFilters = filters) => {
      if (!worktreePath) {
        setItems([]);
        setError('');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const payload = fetchAll
          ? { worktreePath, kind: 'all', status: 'all' }
          : { worktreePath, kind: nextFilters.kind, status: nextFilters.status };
        const result = await listHilItems(payload);
        if (!result) {
          setItems([]);
          return;
        }
        setItems(Array.isArray(result) ? result : []);
      } catch (loadError) {
        setError(loadError?.message || 'Failed to load HIL items.');
      } finally {
        setLoading(false);
      }
    },
    [fetchAll, filters, worktreePath]
  );

  useEffect(() => {
    loadItems(filters);
  }, [filters, loadItems]);

  useEffect(() => {
    if (!worktreePath) {
      setItems([]);
      setError('');
      setLoading(false);
    }
  }, [worktreePath]);

  const refresh = useCallback(() => loadItems(filters), [filters, loadItems]);

  return {
    items,
    filters,
    setFilters,
    loading,
    error,
    refresh,
    setItems,
  };
}
