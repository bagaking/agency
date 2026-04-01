import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import {
  disposeWorkbenchBrowserSurface,
  isAgencyMethodAvailable,
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

export function useWorkbenchBrowserSurface({
  tabId,
  url,
  visible,
  navigationKey,
  disposeOnUnmount = true,
}: UseWorkbenchBrowserSurfaceArgs) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [surfaceState, setSurfaceState] = useState<WorkbenchBrowserSurfaceEvent>({
    tabId,
    url,
    title: '',
    phase: visible ? 'loading' : 'hidden',
    error: '',
    visible,
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
      });
    },
    [tabId, url]
  );

  useEffect(() => {
    if (!browserSurfaceAvailable) {
      return undefined;
    }
    return onWorkbenchBrowserSurfaceEvent?.((payload: WorkbenchBrowserSurfaceEvent) => {
      if (String(payload?.tabId || '') !== tabId) {
        return;
      }
      applySurfaceState(payload);
    });
  }, [applySurfaceState, browserSurfaceAvailable, tabId]);

  const hideSurface = useCallback(() => {
    if (!browserSurfaceAvailable) {
      return;
    }
    const syncTask = syncWorkbenchBrowserSurface({
      tabId,
      url,
      visible: false,
      navigationKey,
    });
    if (!syncTask) {
      return;
    }
    void syncTask
      .then((payload) => {
        applySurfaceState(payload as WorkbenchBrowserSurfaceEvent);
      })
      .catch((error: any) => {
        applySurfaceState({
          tabId,
          url,
          phase: 'hidden',
          visible: false,
          error: String(error?.message || ''),
        });
      });
  }, [applySurfaceState, browserSurfaceAvailable, navigationKey, tabId, url]);

  const syncSurface = useCallback(() => {
    if (!browserSurfaceAvailable) {
      return;
    }
    if (!visible) {
      hideSurface();
      return;
    }
    const hostNode = hostRef.current;
    if (!hostNode) {
      return;
    }
    const rect = hostNode.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) {
      return;
    }
    const syncTask = syncWorkbenchBrowserSurface({
      tabId,
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
        applySurfaceState(payload as WorkbenchBrowserSurfaceEvent);
      })
      .catch((error: any) => {
        applySurfaceState({
          tabId,
          url,
          phase: 'error',
          visible: false,
          error: String(error?.message || 'Failed to sync browser surface.'),
        });
      });
  }, [applySurfaceState, browserSurfaceAvailable, hideSurface, navigationKey, tabId, url, visible]);

  useLayoutEffect(() => {
    if (!browserSurfaceAvailable) {
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

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && hostRef.current) {
      observer = new ResizeObserver(() => syncSurface());
      observer.observe(hostRef.current);
    }

    return () => {
      if (typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(frameId as number);
      } else {
        window.clearTimeout(frameId as number);
      }
      window.removeEventListener('resize', handleWindowChange);
      window.removeEventListener('scroll', handleWindowChange, true);
      observer?.disconnect();
    };
  }, [browserSurfaceAvailable, syncSurface]);

  useEffect(() => {
    if (!browserSurfaceAvailable) {
      return undefined;
    }
    if (visible) {
      return undefined;
    }
    hideSurface();
    return undefined;
  }, [browserSurfaceAvailable, hideSurface, visible]);

  useEffect(() => {
    if (!browserSurfaceAvailable) {
      return undefined;
    }
    return () => {
      if (!disposeOnUnmount) {
        hideSurface();
        return;
      }
      void disposeWorkbenchBrowserSurface({ tabId });
    };
  }, [browserSurfaceAvailable, disposeOnUnmount, hideSurface, tabId]);

  return {
    hostRef,
    browserSurfaceAvailable,
    surfaceState,
  };
}
