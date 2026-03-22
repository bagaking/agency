import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ACTIVITY_BOOTSTRAP_THRESHOLD_MS,
  ATTACH_ACTIVITY_GRACE_MS,
  DEFAULT_FONT_SIZE,
  buildSessionKey,
  clampFontSize,
} from './sessionRuntime';

type UseSessionActivityStateArgs = {
  activeSessionKey: string | null;
  selectedCellId?: string;
  activeSessionId?: string;
};

export function useSessionActivityState({
  activeSessionKey,
  selectedCellId,
  activeSessionId,
}: UseSessionActivityStateArgs) {
  const [sessionFontSizeByKey, setSessionFontSizeByKey] = useState<Record<string, number>>({});
  const [sessionActivityByKey, setSessionActivityByKey] = useState<Record<string, number>>({});
  const [sessionVisitedByKey, setSessionVisitedByKey] = useState<Record<string, number>>({});
  const sessionActivityByKeyRef = useRef<Record<string, number>>({});
  const activityBootstrapByKeyRef = useRef<Record<string, boolean>>({});
  const activityIgnoreUntilByKeyRef = useRef<Record<string, number>>({});

  useEffect(() => {
    sessionActivityByKeyRef.current = sessionActivityByKey;
  }, [sessionActivityByKey]);

  const activeFontSize = activeSessionKey
    ? sessionFontSizeByKey[activeSessionKey] || DEFAULT_FONT_SIZE
    : DEFAULT_FONT_SIZE;
  const lastActivityAt = activeSessionKey ? sessionActivityByKey[activeSessionKey] : null;
  const lastVisitedAt = activeSessionKey ? sessionVisitedByKey[activeSessionKey] : null;

  const updateSessionActivity = useCallback(({ cellId, sessionId }) => {
    if (!cellId || !sessionId) {
      return;
    }
    const key = buildSessionKey(cellId, sessionId);
    const now = Date.now();
    const ignoreUntil = activityIgnoreUntilByKeyRef.current[key];
    if (Number.isFinite(ignoreUntil)) {
      if (now < ignoreUntil) {
        return;
      }
      delete activityIgnoreUntilByKeyRef.current[key];
    }
    if (activityBootstrapByKeyRef.current[key]) {
      delete activityBootstrapByKeyRef.current[key];
      return;
    }
    setSessionActivityByKey((current) => ({ ...current, [key]: now }));
  }, []);

  const updateSessionVisited = useCallback(({ cellId, sessionId }) => {
    if (!cellId || !sessionId) {
      return;
    }
    const key = buildSessionKey(cellId, sessionId);
    setSessionVisitedByKey((current) => ({ ...current, [key]: Date.now() }));
  }, []);

  const updateFontSizeForSession = useCallback(({ cellId, sessionId, nextSize }) => {
    if (!cellId || !sessionId) {
      return;
    }
    const key = buildSessionKey(cellId, sessionId);
    setSessionFontSizeByKey((current) => ({
      ...current,
      [key]: clampFontSize(nextSize),
    }));
  }, []);

  const zoomIn = useCallback(() => {
    if (!selectedCellId || !activeSessionId) {
      return;
    }
    updateFontSizeForSession({
      cellId: selectedCellId,
      sessionId: activeSessionId,
      nextSize: activeFontSize + 1,
    });
  }, [activeFontSize, activeSessionId, selectedCellId, updateFontSizeForSession]);

  const zoomOut = useCallback(() => {
    if (!selectedCellId || !activeSessionId) {
      return;
    }
    updateFontSizeForSession({
      cellId: selectedCellId,
      sessionId: activeSessionId,
      nextSize: activeFontSize - 1,
    });
  }, [activeFontSize, activeSessionId, selectedCellId, updateFontSizeForSession]);

  const zoomReset = useCallback(() => {
    if (!selectedCellId || !activeSessionId) {
      return;
    }
    updateFontSizeForSession({
      cellId: selectedCellId,
      sessionId: activeSessionId,
      nextSize: DEFAULT_FONT_SIZE,
    });
  }, [activeSessionId, selectedCellId, updateFontSizeForSession]);

  const markSessionAttached = useCallback(({ cellId, sessionId }: { cellId?: string; sessionId?: string }) => {
    if (!cellId || !sessionId) {
      return;
    }
    const key = buildSessionKey(cellId, sessionId);
    const lastActivity = sessionActivityByKeyRef.current[key];
    if (
      Number.isFinite(lastActivity) &&
      Date.now() - lastActivity > ACTIVITY_BOOTSTRAP_THRESHOLD_MS
    ) {
      activityIgnoreUntilByKeyRef.current[key] = Date.now() + ATTACH_ACTIVITY_GRACE_MS;
      activityBootstrapByKeyRef.current[key] = true;
    } else {
      delete activityIgnoreUntilByKeyRef.current[key];
      delete activityBootstrapByKeyRef.current[key];
    }
  }, []);

  const resetActivityState = useCallback(() => {
    setSessionFontSizeByKey({});
    setSessionActivityByKey({});
    setSessionVisitedByKey({});
    activityIgnoreUntilByKeyRef.current = {};
    activityBootstrapByKeyRef.current = {};
  }, []);

  return {
    sessionFontSizeByKey,
    sessionActivityByKey,
    sessionVisitedByKey,
    sessionActivityByKeyRef,
    activeFontSize,
    lastActivityAt,
    lastVisitedAt,
    updateSessionActivity,
    updateSessionVisited,
    zoomIn,
    zoomOut,
    zoomReset,
    markSessionAttached,
    resetActivityState,
    mergeSessionActivityState: setSessionActivityByKey,
  };
}
