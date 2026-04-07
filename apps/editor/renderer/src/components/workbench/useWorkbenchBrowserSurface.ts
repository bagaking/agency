import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import {
  disposeWorkbenchBrowserSurface,
  isAgencyMethodAvailable,
  logRuntime,
  onWorkbenchBrowserSurfaceEvent,
  syncWorkbenchBrowserSurface,
} from '../../services/agencyBridge';

type WorkbenchBrowserSurfaceEvent = {
  tabId?: string;
  url?: string;
  title?: string;
  phase?: 'hidden' | 'loading' | 'ready' | 'error' | 'crashed' | 'disposed';
  error?: string;
  visible?: boolean;
  canGoBack?: boolean;
  canGoForward?: boolean;
};

type UseWorkbenchBrowserSurfaceArgs = {
  tabId: string;
  url: string;
  visible: boolean;
  navigationKey: number;
  disposeOnUnmount?: boolean;
};

const requestAnimationFrameFallback = (callback: FrameRequestCallback) =>
  window.setTimeout(() => callback(performance.now()), 0);

const logBrowserSurfaceRenderer = (message: string, meta: Record<string, unknown>) => {
  logRuntime?.({
    level: 'info',
    message,
    meta: {
      scope: 'workbenchBrowserSurface',
      ...meta,
    },
  });
};

export function useWorkbenchBrowserSurface({
  tabId,
  url,
  visible,
  navigationKey,
  disposeOnUnmount = true,
}: UseWorkbenchBrowserSurfaceArgs) {
  const normalizedTabId = String(tabId || '').trim();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const retryTimerRef = useRef<number | null>(null);
  const retryAttemptRef = useRef(0);
  const [surfaceState, setSurfaceState] = useState<WorkbenchBrowserSurfaceEvent>({
    tabId,
    url,
    title: '',
    phase: visible ? 'loading' : 'hidden',
    error: '',
    visible,
    canGoBack: false,
    canGoForward: false,
  });

  const browserSurfaceAvailable =
    isAgencyMethodAvailable('syncWorkbenchBrowserSurface') &&
    isAgencyMethodAvailable('disposeWorkbenchBrowserSurface') &&
    isAgencyMethodAvailable('onWorkbenchBrowserSurfaceEvent');

  const applySurfaceState = useCallback(
    (payload?: WorkbenchBrowserSurfaceEvent | null) => {
      setSurfaceState({
        tabId,
        url: String(payload?.url || url),
        title: String(payload?.title || ''),
        phase: payload?.phase || 'hidden',
        error: String(payload?.error || ''),
        visible: payload?.visible !== false,
        canGoBack: Boolean(payload?.canGoBack),
        canGoForward: Boolean(payload?.canGoForward),
      });
    },
    [tabId, url]
  );

  useEffect(() => {
    if (!normalizedTabId) {
      return undefined;
    }
    if (!browserSurfaceAvailable) {
      logBrowserSurfaceRenderer('browser surface bridge unavailable', {
        tabId,
        url,
      });
      return undefined;
    }
    return onWorkbenchBrowserSurfaceEvent?.((payload: WorkbenchBrowserSurfaceEvent) => {
      if (String(payload?.tabId || '') !== normalizedTabId) {
        return;
      }
      applySurfaceState(payload);
    });
  }, [applySurfaceState, browserSurfaceAvailable, normalizedTabId, tabId, url]);

  const hideSurface = useCallback(() => {
    if (retryTimerRef.current !== null) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    retryAttemptRef.current = 0;
    if (!browserSurfaceAvailable || !normalizedTabId) {
      return;
    }
    logBrowserSurfaceRenderer('browser surface hide requested', {
      tabId,
      url,
      navigationKey,
    });
    const syncTask = syncWorkbenchBrowserSurface({
      tabId: normalizedTabId,
      url,
      visible: false,
      navigationKey,
    });
    if (!syncTask) {
      return;
    }
    void syncTask
      .then((payload) => {
        logBrowserSurfaceRenderer('browser surface hide acknowledged', {
          tabId: normalizedTabId,
          phase: (payload as WorkbenchBrowserSurfaceEvent)?.phase || 'hidden',
        });
        applySurfaceState(payload as WorkbenchBrowserSurfaceEvent);
      })
      .catch((error: any) => {
        logBrowserSurfaceRenderer('browser surface hide failed', {
          tabId: normalizedTabId,
          error: error?.message || String(error),
        });
        applySurfaceState({
          tabId: normalizedTabId,
          url,
          phase: 'hidden',
          visible: false,
          error: String(error?.message || ''),
          canGoBack: false,
          canGoForward: false,
        });
      });
  }, [applySurfaceState, browserSurfaceAvailable, navigationKey, normalizedTabId, tabId, url]);

  const syncSurface = useCallback(() => {
    if (!browserSurfaceAvailable || !normalizedTabId) {
      return;
    }
    if (!visible) {
      hideSurface();
      return;
    }
    const hostNode = hostRef.current;
    if (!hostNode) {
      logBrowserSurfaceRenderer('browser surface host missing', {
        tabId,
        url,
        navigationKey,
        retryAttempt: retryAttemptRef.current,
      });
      if (retryTimerRef.current === null) {
        retryAttemptRef.current += 1;
        retryTimerRef.current = window.setTimeout(() => {
          retryTimerRef.current = null;
          syncSurface();
        }, 120);
      }
      return;
    }
    const rect = hostNode.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) {
      logBrowserSurfaceRenderer('browser surface host rect unavailable', {
        tabId,
        url,
        navigationKey,
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        retryAttempt: retryAttemptRef.current,
      });
      if (retryTimerRef.current === null) {
        retryAttemptRef.current += 1;
        retryTimerRef.current = window.setTimeout(() => {
          retryTimerRef.current = null;
          syncSurface();
        }, 120);
      }
      return;
    }
    if (retryTimerRef.current !== null) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    retryAttemptRef.current = 0;
    logBrowserSurfaceRenderer('browser surface sync requested', {
      tabId,
      url,
      navigationKey,
      x: Math.round(rect.left),
      y: Math.round(rect.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      devicePixelRatio:
        typeof window.devicePixelRatio === 'number' ? Number(window.devicePixelRatio.toFixed(3)) : 1,
    });
    const syncTask = syncWorkbenchBrowserSurface({
      tabId: normalizedTabId,
      url,
      visible: true,
      navigationKey,
      bounds: {
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
    });
    if (!syncTask) {
      return;
    }
    void syncTask
      .then((payload) => {
        logBrowserSurfaceRenderer('browser surface sync acknowledged', {
          tabId: normalizedTabId,
          phase: (payload as WorkbenchBrowserSurfaceEvent)?.phase || 'unknown',
          visible: (payload as WorkbenchBrowserSurfaceEvent)?.visible !== false,
        });
        applySurfaceState(payload as WorkbenchBrowserSurfaceEvent);
      })
      .catch((error: any) => {
        logBrowserSurfaceRenderer('browser surface sync failed', {
          tabId: normalizedTabId,
          error: error?.message || String(error),
        });
        applySurfaceState({
          tabId: normalizedTabId,
          url,
          phase: 'error',
          visible: false,
          error: String(error?.message || 'Failed to sync browser surface.'),
          canGoBack: false,
          canGoForward: false,
        });
      });
  }, [
    applySurfaceState,
    browserSurfaceAvailable,
    hideSurface,
    navigationKey,
    normalizedTabId,
    tabId,
    url,
    visible,
  ]);

  useLayoutEffect(() => {
    if (!browserSurfaceAvailable || !normalizedTabId) {
      return undefined;
    }

    const schedule =
      typeof window.requestAnimationFrame === 'function'
        ? window.requestAnimationFrame.bind(window)
        : requestAnimationFrameFallback;

    const frameId = schedule(() => {
      syncSurface();
    });

    const handleWindowChange = () => syncSurface();
    window.addEventListener('resize', handleWindowChange);
    window.addEventListener('scroll', handleWindowChange, true);

    const observedNodes = [hostRef.current].filter(Boolean) as HTMLElement[];
    const handleTransitionEnd = () => syncSurface();
    observedNodes.forEach((node) => {
      node.addEventListener('transitionend', handleTransitionEnd);
    });

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && observedNodes.length) {
      observer = new ResizeObserver(() => syncSurface());
      observedNodes.forEach((node) => observer?.observe(node));
    }

    return () => {
      if (retryTimerRef.current !== null) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      if (typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(frameId as number);
      } else {
        window.clearTimeout(frameId as number);
      }
      window.removeEventListener('resize', handleWindowChange);
      window.removeEventListener('scroll', handleWindowChange, true);
      observedNodes.forEach((node) => {
        node.removeEventListener('transitionend', handleTransitionEnd);
      });
      observer?.disconnect();
    };
  }, [browserSurfaceAvailable, normalizedTabId, syncSurface]);

  useEffect(() => {
    if (!browserSurfaceAvailable || !normalizedTabId) {
      return undefined;
    }
    if (visible) {
      return undefined;
    }
    hideSurface();
    return undefined;
  }, [browserSurfaceAvailable, hideSurface, normalizedTabId, visible]);

  useEffect(() => {
    if (!browserSurfaceAvailable || !normalizedTabId) {
      return undefined;
    }
    return () => {
      if (!disposeOnUnmount) {
        hideSurface();
        return;
      }
      void disposeWorkbenchBrowserSurface({ tabId: normalizedTabId });
    };
  }, [browserSurfaceAvailable, disposeOnUnmount, hideSurface, normalizedTabId]);

  return {
    hostRef,
    browserSurfaceAvailable,
    surfaceState,
  };
}
