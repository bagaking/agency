import { useCallback, useMemo, useState } from 'react';

export type ShellBrowserLaneRect = {
  x: number;
  y: number;
  width: number;
  height: number;
} | null;

export type ShellBrowserLaneSurfaceState = {
  url?: string;
  title?: string;
  phase?: 'hidden' | 'loading' | 'ready' | 'error' | 'crashed' | 'disposed';
  error?: string;
  visible?: boolean;
  canGoBack?: boolean;
  canGoForward?: boolean;
} | null;

export type ShellBrowserLaneMeta = {
  cellId: string;
  tabId: string;
  url: string;
  navigationKey: number;
  rect: ShellBrowserLaneRect;
  visible: boolean;
  suspended: boolean;
  browserSurfaceAvailable: boolean | null;
  surfaceState: ShellBrowserLaneSurfaceState;
} | null;

export function useWorkbenchShellBrowserLaneState({
  selectedCellId,
}: {
  selectedCellId: string;
}) {
  const [browserLaneByCellId, setBrowserLaneByCellId] = useState<Record<string, ShellBrowserLaneMeta>>({});

  const handleBrowserLaneMetaChange = useCallback((cellId: string, meta: ShellBrowserLaneMeta) => {
    const cellKey = String(cellId || '').trim() || 'repo';
    setBrowserLaneByCellId((current) => {
      if (!meta) {
        if (!current[cellKey]) {
          return current;
        }
        const next = { ...current };
        delete next[cellKey];
        return next;
      }
      return {
        ...current,
        [cellKey]: meta,
      };
    });
  }, []);

  const handleBrowserLaneSurfaceStateChange = useCallback(
    (
      cellId: string,
      update: {
        surfaceState: ShellBrowserLaneSurfaceState;
        browserSurfaceAvailable?: boolean | null;
      }
    ) => {
      const cellKey = String(cellId || '').trim() || 'repo';
      setBrowserLaneByCellId((current) => {
        const existing = current[cellKey];
        if (!existing) {
          return current;
        }
        return {
          ...current,
          [cellKey]: {
            ...existing,
            surfaceState: update?.surfaceState || null,
            browserSurfaceAvailable:
              update?.browserSurfaceAvailable ?? existing.browserSurfaceAvailable ?? null,
          },
        };
      });
    },
    []
  );

  const activeBrowserLane = useMemo(() => {
    const cellKey = String(selectedCellId || '').trim() || 'repo';
    return browserLaneByCellId[cellKey] || null;
  }, [browserLaneByCellId, selectedCellId]);

  return {
    browserLaneByCellId,
    activeBrowserLane,
    handleBrowserLaneMetaChange,
    handleBrowserLaneSurfaceStateChange,
  };
}
