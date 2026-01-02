import { useCallback, useEffect, useState } from 'react';

const DEFAULT_FILTERS = {
  kind: 'all',
  status: 'all',
};

export function useHilItems({ worktreePath }) {
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadItems = useCallback(
    async (nextFilters = filters) => {
      if (!window.agency?.listHilItems || !worktreePath) {
        setItems([]);
        setError('');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const payload = {
          worktreePath,
          kind: nextFilters.kind,
          status: nextFilters.status,
        };
        const result = await window.agency.listHilItems(payload);
        setItems(Array.isArray(result) ? result : []);
      } catch (loadError) {
        setError(loadError?.message || 'Failed to load HIL items.');
      } finally {
        setLoading(false);
      }
    },
    [filters, worktreePath]
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
