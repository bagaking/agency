import { useCallback, useMemo } from 'react';

import { BASELINE_PROFILE_ID } from '../utils/terminusSettings';

type UseSessionReplyContextArgs = {
  resolvedProfiles: any[];
  sessions: any[];
  activeSessionId: string;
  selectedCell: any;
  replySelectionByKey: Record<string, any>;
  resolvedBindingsByProfile: any;
  projectRoot: string;
  setActiveView?: (view: any) => void;
  sidebarCollapsed?: boolean;
  setSidebarCollapsed?: (value: boolean) => void;
  setReplySelectionByKey: (value: any) => void;
  setDockSelection?: (value: any) => void;
  handleSelectSessionFromMap: (cellId: string, sessionId: string, options?: { focusView?: boolean }) => void;
};

export function useSessionReplyContext({
  resolvedProfiles,
  sessions,
  activeSessionId,
  selectedCell,
  replySelectionByKey,
  resolvedBindingsByProfile,
  projectRoot,
  setReplySelectionByKey,
  handleSelectSessionFromMap,
}: UseSessionReplyContextArgs) {
  const terminusProfiles = useMemo(
    () =>
      (resolvedProfiles || []).filter((profile: any) => {
        const startCommand = String(profile.startCommand || '').trim();
        const resumeCommand = String(profile.resumeCommand || '').trim();
        return Boolean(startCommand || resumeCommand);
      }),
    [resolvedProfiles]
  );

  const activeSession = useMemo(
    () => sessions?.find((session) => session.id === activeSessionId) || null,
    [sessions, activeSessionId]
  );

  const replySelectionKey = useMemo(() => {
    if (!selectedCell?.id || !activeSessionId) {
      return '';
    }
    return `${selectedCell.id}:${activeSessionId}`;
  }, [activeSessionId, selectedCell?.id]);

  const activeReplySelection = useMemo(() => {
    if (!replySelectionKey) {
      return null;
    }
    return replySelectionByKey[replySelectionKey] || null;
  }, [replySelectionByKey, replySelectionKey]);

  const activeProfileId = activeSession?.profileId || BASELINE_PROFILE_ID;

  const activeProfileBindings = useMemo(() => {
    if (!resolvedBindingsByProfile) {
      return [];
    }
    if (typeof resolvedBindingsByProfile.get === 'function') {
      return resolvedBindingsByProfile.get(activeProfileId) || [];
    }
    return resolvedBindingsByProfile[activeProfileId] || [];
  }, [activeProfileId, resolvedBindingsByProfile]);

  const sessionNamingPreviewContext = useMemo(() => {
    const projectLabel = (projectRoot || '')
      .split('/')
      .filter(Boolean)
      .pop();
    return {
      cell: selectedCell?.name || 'Agent',
      profile: activeProfileId || 'shell',
      project: projectLabel || '',
      branch: selectedCell?.branch || '',
      user: 'you',
    };
  }, [activeProfileId, projectRoot, selectedCell?.branch, selectedCell?.name]);

  const handleJumpToSession = useCallback(
    (cellId: string, sessionId: string) => {
      handleSelectSessionFromMap(cellId, sessionId, { focusView: true });
    },
    [handleSelectSessionFromMap]
  );

  const handleClearReplySelection = useCallback(() => {
    if (!replySelectionKey) {
      return;
    }
    setReplySelectionByKey((current: any) => {
      if (!current[replySelectionKey]) {
        return current;
      }
      const next = { ...current };
      delete next[replySelectionKey];
      return next;
    });
  }, [replySelectionKey, setReplySelectionByKey]);

  return {
    terminusProfiles,
    activeSession,
    activeProfileId,
    activeProfileBindings,
    activeReplySelection,
    sessionNamingPreviewContext,
    handleJumpToSession,
    handleClearReplySelection,
  };
}
