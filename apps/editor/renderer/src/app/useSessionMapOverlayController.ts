import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useSessionMap } from '../hooks/useSessionMap';
import { warmSessionMapPreviewCache } from '../services/sessionMapPreviewCache';
import { PREVIEW_WARMUP_DELAY_MS } from '../components/sessionMap/sessionMapConstants';
import { buildSessionMapModel } from '../utils/sessionMapModel';

type UseSessionMapOverlayControllerArgs = {
  projectRoot: string;
  projectReady: boolean;
  cells: any[];
  sessions: any[];
  sessionsByCellId: Record<string, any[]>;
  activeSessionId: string;
  activeSessionByCellId: Record<string, string>;
  sessionActivityByKey: Record<string, any>;
  sessionVisitedByKey: Record<string, any>;
  resolvedProfiles: any[] | null;
  activeFontSize: number;
  sessionFontSizeByKey: Record<string, number>;
  refreshSessionsForCells: (cells: any[], options?: any) => void;
  selectSession: (sessionId: string, cellId?: string) => void;
  setSelectedId: (value: any) => void;
  setTerminalOpen: (value: boolean) => void;
  setActiveView: (value: string) => void;
};

export function useSessionMapOverlayController({
  projectRoot,
  projectReady,
  cells,
  sessions,
  sessionsByCellId,
  activeSessionId,
  activeSessionByCellId,
  sessionActivityByKey,
  sessionVisitedByKey,
  resolvedProfiles,
  activeFontSize,
  sessionFontSizeByKey,
  refreshSessionsForCells,
  selectSession,
  setSelectedId,
  setTerminalOpen,
  setActiveView,
}: UseSessionMapOverlayControllerArgs) {
  const [sessionMapOpen, setSessionMapOpen] = useState(false);

  const {
    config: sessionMapConfig,
    updateConfig: updateSessionMapConfig,
    hasLoaded: sessionMapLoaded,
  } = useSessionMap({ projectRoot });

  const activityDiffThreshold = useMemo(() => {
    const parsed = Number(sessionMapConfig?.activityDiffThreshold);
    if (!Number.isFinite(parsed)) {
      return 12;
    }
    return Math.max(1, Math.floor(parsed));
  }, [sessionMapConfig?.activityDiffThreshold]);

  useEffect(() => {
    setSessionMapOpen(false);
  }, [projectRoot]);

  useEffect(() => {
    if (!projectReady || !sessionMapLoaded) {
      return;
    }
    if (sessionMapConfig?.autoOpenSeen) {
      return;
    }
    setSessionMapOpen(true);
    updateSessionMapConfig({ autoOpenSeen: true });
  }, [projectReady, sessionMapConfig?.autoOpenSeen, sessionMapLoaded, updateSessionMapConfig]);

  const mapCells = useMemo(() => (projectReady ? cells : []), [projectReady, cells]);

  const profilesById = useMemo(() => {
    if (!resolvedProfiles) {
      return null;
    }
    return new Map(resolvedProfiles.map((profile) => [profile.id, profile]));
  }, [resolvedProfiles]);

  const sessionMapModel = useMemo(
    () =>
      buildSessionMapModel({
        cells: mapCells,
        sessionsByCellId,
        activeSessionByCellId,
        sessionActivityByKey,
        sessionVisitedByKey,
        config: sessionMapConfig,
        profilesById,
      }),
    [
      mapCells,
      sessionsByCellId,
      activeSessionByCellId,
      sessionActivityByKey,
      sessionVisitedByKey,
      sessionMapConfig,
      profilesById,
    ]
  );

  const previewWarmKeyRef = useRef('');
  const sessionMapPreviewSeeds = useMemo(() => {
    if (!sessionMapModel?.clusters?.length) {
      return [];
    }
    const seeds: any[] = [];
    sessionMapModel.clusters.forEach((cluster: any) => {
      const cell = cluster.cell;
      if (!cell?.id || !cell?.worktreePath) {
        return;
      }
      cluster.sessions.forEach((session: any) => {
        if (!session?.id || session.isOffline) {
          return;
        }
        seeds.push({
          cellId: cell.id,
          worktreePath: cell.worktreePath,
          sessionId: session.id,
        });
      });
    });
    return seeds;
  }, [sessionMapModel]);

  const sessionMapEnabled = projectReady && mapCells.length > 0;

  useEffect(() => {
    if (!sessionMapEnabled || sessionMapPreviewSeeds.length === 0) {
      return;
    }
    const nextKey = sessionMapPreviewSeeds
      .map((item) => `${item.cellId}:${item.sessionId}`)
      .sort()
      .join('|');
    if (!nextKey || nextKey === previewWarmKeyRef.current) {
      return;
    }
    previewWarmKeyRef.current = nextKey;

    const scheduleWarmup = () => {
      warmSessionMapPreviewCache({ sessions: sessionMapPreviewSeeds });
    };

    if (typeof window !== 'undefined' && window.requestIdleCallback) {
      const handle = window.requestIdleCallback(scheduleWarmup, { timeout: 1200 });
      return () => window.cancelIdleCallback?.(handle);
    }

    const handle = setTimeout(scheduleWarmup, PREVIEW_WARMUP_DELAY_MS);
    return () => clearTimeout(handle);
  }, [sessionMapEnabled, sessionMapPreviewSeeds]);

  useEffect(() => {
    if (!sessionMapOpen || !sessionMapEnabled) {
      return;
    }
    refreshSessionsForCells(mapCells, { silent: true });
  }, [mapCells, refreshSessionsForCells, sessionMapEnabled, sessionMapOpen]);

  const handleToggleSessionMap = useCallback(() => {
    setSessionMapOpen((value) => !value);
  }, []);

  const openSessionMap = useCallback(() => {
    setSessionMapOpen(true);
  }, []);

  const resolveSessionMapFontSize = useCallback(
    (cellId: string, sessionId: string) => {
      if (!cellId || !sessionId) {
        return activeFontSize || 13;
      }
      const key = `${cellId}:${sessionId}`;
      return sessionFontSizeByKey?.[key] || activeFontSize || 13;
    },
    [activeFontSize, sessionFontSizeByKey]
  );

  const handleSelectSessionFromMap = useCallback(
    (
      cellId: string,
      sessionId: string,
      options: { focusView?: boolean; preserveRunFocus?: boolean } = {}
    ) => {
      if (!cellId || !sessionId) {
        return;
      }
      const targetCell = mapCells.find((cell: any) => cell.id === cellId);
      if (!targetCell) {
        return;
      }
      if (options?.focusView) {
        setActiveView('agent-cells');
      }
      setSelectedId(cellId);
      selectSession(sessionId, cellId);
      setTerminalOpen(true);
      refreshSessionsForCells([targetCell], { silent: true });
    },
    [mapCells, refreshSessionsForCells, selectSession, setActiveView, setSelectedId, setTerminalOpen]
  );

  const focusSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId),
    [activeSessionId, sessions]
  );

  return {
    activityDiffThreshold,
    focusSession,
    sessionMapEnabled,
    sessionMapModel,
    sessionMapOpen,
    openSessionMap,
    handleToggleSessionMap,
    resolveSessionMapFontSize,
    handleSelectSessionFromMap,
  };
}
