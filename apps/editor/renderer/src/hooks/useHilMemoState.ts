import { useMemo, useState, useEffect, useCallback } from 'react';
import { useHilItems } from './useHilItems';
import { Terminal, StickyNote, Quote, Camera, MessageSquareText } from 'lucide-react';

const resolveBody = (item) =>
  typeof item?.body === 'string' ? item.body : typeof item?.message === 'string' ? item.message : '';

const summarizeBody = (item) => {
  const raw = resolveBody(item).trim();
  if (!raw) {
    return 'Untitled Draft';
  }
  const firstLine = raw.split('\n')[0];
  if (firstLine.length > 46) {
    return `${firstLine.slice(0, 46)}…`;
  }
  return firstLine;
};

export function useHilMemoState({ worktreePath }) {
  const { items, filters, setFilters, loading, error, refresh } = useHilItems({
    worktreePath,
    fetchAll: true,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [dockSelection, setDockSelection] = useState({
    type: 'inbox',
    inboxType: 'comments',
    draftId: null,
  });

  const draftItems = useMemo(
    () => items.filter((item) => item.kind === 'draft'),
    [items]
  );
  
  const inboxItems = useMemo(
    () =>
      items.filter(
        (item) =>
          (item.kind === 'comment' || item.kind === 'memo' || item.kind === 'reply') &&
          item.meta?.processed !== true
      ),
    [items]
  );

  const selectedDraft = useMemo(
    () => draftItems.find((item) => item.id === dockSelection.draftId) || null,
    [dockSelection.draftId, draftItems]
  );

  const inboxSections = useMemo(
    () => [
      { id: 'comments', label: 'Comments', kind: 'comment', noteType: null, icon: Terminal },
      { id: 'reply', label: 'Reply', kind: 'reply', noteType: null, icon: MessageSquareText },
      { id: 'flash', label: 'Flash', kind: 'memo', noteType: 'flash', icon: StickyNote },
      { id: 'excerpt', label: 'Excerpt', kind: 'memo', noteType: 'excerpt', icon: Quote },
      { id: 'screenshot', label: 'Screenshot', kind: 'memo', noteType: 'screenshot', icon: Camera },
    ],
    []
  );

  const inboxCounts = useMemo(() => {
    const counts = {};
    inboxSections.forEach((section) => {
      counts[section.id] = inboxItems.filter((item) => {
        if (item.kind !== section.kind) return false;
        if (section.noteType && item.meta?.noteType !== section.noteType) return false;
        return true;
      }).length;
    });
    return counts;
  }, [inboxItems, inboxSections]);

  const summary = useMemo(() => {
    const counts = { comment: 0, memo: 0, draft: 0, reply: 0 };
    items.forEach((item) => {
      if (counts[item.kind] !== undefined) counts[item.kind] += 1;
    });
    return counts;
  }, [items]);

  const filteredItems = useMemo(() => {
    let result = items;
    if (filters.kind !== 'all') {
      result = result.filter((item) => item.kind === filters.kind);
    }
    if (filters.status !== 'all') {
      result = result.filter((item) => item.status === filters.status);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          (item.body || item.message || '').toLowerCase().includes(q) ||
          (item.anchor?.file || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [items, searchQuery, filters.kind, filters.status]);

  const activeInboxSection =
    inboxSections.find((section) => section.id === dockSelection.inboxType) || inboxSections[0];

  const visibleInboxItems = useMemo(() => {
    if (!activeInboxSection) {
      return [];
    }
    return filteredItems.filter((item) => {
      if (item.meta?.processed === true) {
        return false;
      }
      if (item.kind !== activeInboxSection.kind) {
        return false;
      }
      if (activeInboxSection.noteType && item.meta?.noteType !== activeInboxSection.noteType) {
        return false;
      }
      return true;
    });
  }, [activeInboxSection, filteredItems]);

  useEffect(() => {
    if (dockSelection.type === 'draft' && !selectedDraft) {
      setDockSelection({ type: 'inbox', inboxType: 'comments', draftId: null });
    }
  }, [dockSelection.type, selectedDraft]);

  return {
    items,
    filters,
    setFilters,
    loading,
    error,
    refresh,
    searchQuery,
    setSearchQuery,
    dockSelection,
    setDockSelection,
    onDockSelectionChange: setDockSelection,
    draftItems,
    draftCount: draftItems.length,
    inboxItems,
    pendingInboxCount: inboxItems.length,
    selectedDraft,
    inboxSections,
    inboxCounts,
    summary,
    activeInboxSection,
    visibleInboxItems,
    summarizeBody,
    resolveBody,
  };
}
