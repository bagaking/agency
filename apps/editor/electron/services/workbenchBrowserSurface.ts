import type { Rectangle, WebPreferences } from 'electron';

import { normalizeSupportedPublicUrl } from '../../shared/publicUrl';
import {
  mapRendererRectToNativeContentRect,
  resolveOwnerRendererViewBounds,
} from './nativeSurfaceGeometry';
import { logRuntime } from './runtimeLog';

const { BrowserWindow: ElectronBrowserWindow, WebContentsView: ElectronWebContentsView } =
  require('electron') as typeof import('electron');

type BrowserSurfacePhase = 'loading' | 'ready' | 'error' | 'crashed' | 'hidden' | 'disposed';

type BrowserSurfaceEventPayload = {
  windowId: number;
  tabId: string;
  url: string;
  title: string;
  phase: BrowserSurfacePhase;
  error: string;
  visible: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
};

type BrowserSurfaceWebContents = {
  on: (event: string, handler: (...args: any[]) => void) => unknown;
  removeListener: (event: string, handler: (...args: any[]) => void) => unknown;
  loadURL: (url: string) => Promise<unknown> | void;
  focus?: () => void;
  destroy?: () => void;
  getTitle?: () => string;
  canGoBack?: () => boolean;
  canGoForward?: () => boolean;
  goBack?: () => void;
  goForward?: () => void;
  setWindowOpenHandler?: (
    handler: (details?: unknown) => { action: 'allow' | 'deny' }
  ) => unknown;
};

type BrowserSurfaceView = {
  setBounds: (bounds: Rectangle) => void;
  setVisible: (value: boolean) => void;
  webContents: BrowserSurfaceWebContents;
};

type BrowserSurfaceParentView = {
  addChildView: (view: BrowserSurfaceView) => void;
  removeChildView: (view: BrowserSurfaceView) => void;
};

type BrowserSurfaceWindow = {
  id: number;
  isDestroyed?: () => boolean;
  getBounds?: () => Rectangle;
  getContentBounds?: () => Rectangle;
  getRendererViewBounds?: () => Rectangle | null;
  getContentView?: () => BrowserSurfaceParentView | null | undefined;
  contentView?: BrowserSurfaceParentView | null | undefined;
  once: (event: 'closed', handler: () => void) => unknown;
  removeListener: (event: 'closed', handler: () => void) => unknown;
  webContents: {
    send: (channel: string, payload: BrowserSurfaceEventPayload) => void;
  };
};

type BrowserSurfaceRecord = {
  key: string;
  windowId: number;
  tabId: string;
  view: BrowserSurfaceView;
  bounds: Rectangle | null;
  visible: boolean;
  url: string;
  title: string;
  phase: BrowserSurfacePhase;
  error: string;
  navigationKey: number;
  listeners: Array<{
    emitter: BrowserSurfaceWebContents;
    event: string;
    handler: (...args: any[]) => void;
  }>;
  window?: BrowserSurfaceWindow;
  parentView?: BrowserSurfaceParentView;
  windowCloseHandler?: () => void;
};

type BrowserSurfacePayload = {
  windowId: number;
  tabId: string;
};

type BrowserSurfaceEnsurePayload = BrowserSurfacePayload & {
  url?: string;
  bounds?: Rectangle;
  navigationKey?: number;
};

type BrowserSurfaceNavigatePayload = BrowserSurfacePayload & {
  url: string;
  navigationKey?: number;
};

type BrowserSurfaceBoundsPayload = BrowserSurfacePayload & {
  bounds: Rectangle;
};

type SyncWorkbenchBrowserSurfacePayload = {
  tabId?: unknown;
  url?: unknown;
  visible?: unknown;
  bounds?: unknown;
  navigationKey?: unknown;
};

type BrowserSurfaceDependencies = {
  BrowserWindow: {
    fromId: (id: number) => any;
  };
  WebContentsView: new (options: {
    webPreferences: WebPreferences;
  }) => any;
  defaultWebPreferences?: Partial<WebPreferences>;
  publishEvent?: (payload: BrowserSurfaceEventPayload) => void;
};

type BrowserSurfaceHistoryResult = {
  windowId: number;
  tabId: string;
  canGoBack: boolean;
  canGoForward: boolean;
};

const DEFAULT_WEB_PREFERENCES: WebPreferences = {
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
  webSecurity: true,
  allowRunningInsecureContent: false,
  webviewTag: false,
  devTools: false,
};

const makeSurfaceKey = (windowId: number, tabId: string) => `${windowId}::${tabId}`;

function sanitizeBounds(bounds: unknown): Rectangle | null {
  if (!bounds || typeof bounds !== 'object' || Array.isArray(bounds)) {
    return null;
  }

  const candidate = bounds as Partial<Rectangle>;
  const width = Math.max(0, Math.floor(Number(candidate.width) || 0));
  const height = Math.max(0, Math.floor(Number(candidate.height) || 0));
  if (!width || !height) {
    return null;
  }

  return {
    x: Number.isFinite(Number(candidate.x)) ? Math.floor(Number(candidate.x)) : 0,
    y: Number.isFinite(Number(candidate.y)) ? Math.floor(Number(candidate.y)) : 0,
    width,
    height,
  };
}

function normalizeBrowserSurfaceTabId(value: unknown) {
  return String(value || '').trim();
}

function normalizeBrowserSurfaceNavigationKey(value: unknown) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function normalizeBrowserSurfaceUrl(value: unknown) {
  return normalizeSupportedPublicUrl(value);
}

function mergeWebPreferences(overrides?: Partial<WebPreferences>): WebPreferences {
  return {
    ...DEFAULT_WEB_PREFERENCES,
    ...(overrides || {}),
  };
}

function createWorkbenchBrowserSurfaceService(deps: BrowserSurfaceDependencies) {
  const surfaces = new Map<string, BrowserSurfaceRecord>();
  const visibleSurfaceByWindow = new Map<number, string>();
  const publishEvent =
    deps.publishEvent ||
    ((payload: BrowserSurfaceEventPayload) => {
      const ownerWindow = deps.BrowserWindow.fromId(payload.windowId);
      if (!ownerWindow || ownerWindow.isDestroyed?.()) {
        return;
      }
      ownerWindow.webContents.send('workbench:browserSurface:event', payload);
    });
  const webPreferences = mergeWebPreferences(deps.defaultWebPreferences);

  function getRecord(windowId: number, tabId: string) {
    return surfaces.get(makeSurfaceKey(windowId, tabId)) || null;
  }

  function buildState(record: BrowserSurfaceRecord | null) {
    if (!record) {
      return null;
    }
    return {
      windowId: record.windowId,
      tabId: record.tabId,
      visible: record.visible,
      url: record.url,
      title: record.title,
      bounds: record.bounds,
      phase: record.phase,
      error: record.error,
      navigationKey: record.navigationKey,
      canGoBack: Boolean(record.view.webContents.canGoBack?.()),
      canGoForward: Boolean(record.view.webContents.canGoForward?.()),
    };
  }

  function publishRecord(
    record: BrowserSurfaceRecord,
    overrides: Partial<BrowserSurfaceEventPayload> = {},
    options: { keepPhase?: boolean } = {}
  ) {
    const nextPhase = overrides.phase || (options.keepPhase ? record.phase : record.phase || 'hidden');
    const nextTitle =
      overrides.title !== undefined ? String(overrides.title || '') : String(record.title || '');
    const nextUrl = overrides.url !== undefined ? String(overrides.url || '') : String(record.url || '');
    const nextError =
      overrides.error !== undefined ? String(overrides.error || '') : String(record.error || '');
    const nextVisible = overrides.visible !== undefined ? Boolean(overrides.visible) : record.visible;

    record.title = nextTitle;
    record.url = nextUrl;
    record.error = nextError;
    record.visible = nextVisible;
    if (overrides.phase) {
      record.phase = overrides.phase;
    }

    publishEvent({
      windowId: record.windowId,
      tabId: record.tabId,
      url: nextUrl,
      title: nextTitle,
      phase: nextPhase,
      error: nextError,
      visible: nextVisible,
      canGoBack: Boolean(record.view.webContents.canGoBack?.()),
      canGoForward: Boolean(record.view.webContents.canGoForward?.()),
    });
  }

  function removeListeners(record: BrowserSurfaceRecord) {
    record.listeners.forEach(({ emitter, event, handler }) => {
      emitter.removeListener(event, handler);
    });
    record.listeners.length = 0;
  }

  function loadBrowserSurfaceUrl(record: BrowserSurfaceRecord, nextUrl: string) {
    record.url = nextUrl;
    record.error = '';
    record.phase = 'loading';
    const loadTask = record.view.webContents.loadURL(nextUrl);
    if (loadTask && typeof (loadTask as Promise<unknown>).catch === 'function') {
      void (loadTask as Promise<unknown>).catch((error: any) => {
        const message = error?.message || String(error);
        publishRecord(record, {
          phase: 'error',
          error: message,
        });
        void logRuntime('error', 'browser surface loadURL failed', {
          windowId: record.windowId,
          tabId: record.tabId,
          url: nextUrl,
          error: message,
        });
      });
      return;
    }
    void Promise.resolve(loadTask).catch((error: any) => {
      const message = error?.message || String(error);
      publishRecord(record, {
        phase: 'error',
        error: message,
      });
      void logRuntime('error', 'browser surface loadURL failed', {
        windowId: record.windowId,
        tabId: record.tabId,
        url: nextUrl,
        error: message,
      });
    });
  }

  function detachView(record: BrowserSurfaceRecord) {
    if (record.parentView) {
      record.parentView.removeChildView(record.view);
      record.parentView = undefined;
    }
    if (record.window && record.windowCloseHandler) {
      record.window.removeListener('closed', record.windowCloseHandler);
      record.windowCloseHandler = undefined;
    }
  }

  function registerWebContentsListeners(record: BrowserSurfaceRecord) {
    const { webContents } = record.view;
    const bind = (event: string, handler: (...args: any[]) => void) => {
      webContents.on(event, handler);
      record.listeners.push({ emitter: webContents, event, handler });
    };

    bind('did-start-navigation', (_event: unknown, nextUrl: string, _isInPlace: boolean, isMainFrame: boolean) => {
      if (!isMainFrame) {
        return;
      }
      publishRecord(record, {
        url: String(nextUrl || record.url || ''),
        phase: 'loading',
        error: '',
      });
    });

    bind('did-navigate', (_event: unknown, nextUrl: string) => {
      publishRecord(
        record,
        {
          url: String(nextUrl || record.url || ''),
        },
        { keepPhase: true }
      );
    });

    bind('did-navigate-in-page', (_event: unknown, nextUrl: string) => {
      publishRecord(
        record,
        {
          url: String(nextUrl || record.url || ''),
        },
        { keepPhase: true }
      );
    });

    bind('will-navigate', (event: { preventDefault?: () => void } | undefined, nextUrl: string) => {
      if (normalizeBrowserSurfaceUrl(nextUrl)) {
        return;
      }
      event?.preventDefault?.();
      publishRecord(record, {
        phase: 'error',
        error: 'Only public http/https URLs can stay inside Agency View.',
      });
    });

    bind('will-redirect', (event: { preventDefault?: () => void } | undefined, nextUrl: string) => {
      if (normalizeBrowserSurfaceUrl(nextUrl)) {
        return;
      }
      event?.preventDefault?.();
      publishRecord(record, {
        phase: 'error',
        error: 'Only public http/https URLs can stay inside Agency View.',
      });
    });

    bind('page-title-updated', (_event: unknown, nextTitle: string) => {
      publishRecord(record, {
        title: String(nextTitle || ''),
      }, { keepPhase: true });
    });

    bind('did-finish-load', () => {
      publishRecord(record, {
        title: String(record.view.webContents.getTitle?.() || record.title || ''),
        phase: 'ready',
        error: '',
      });
    });

    bind(
      'did-fail-load',
      (_event: unknown, _errorCode: number, errorDescription: string, validatedURL: string, isMainFrame: boolean) => {
        if (!isMainFrame) {
          return;
        }
        publishRecord(record, {
          url: String(validatedURL || record.url || ''),
          phase: 'error',
          error: String(errorDescription || 'Failed to load page.'),
        });
      }
    );

    bind('render-process-gone', (_event: unknown, details?: { reason?: string }) => {
      publishRecord(record, {
        phase: 'crashed',
        error: String(details?.reason || 'Browser surface crashed.'),
      });
    });

    bind('crashed', () => {
      publishRecord(record, {
        phase: 'crashed',
        error: 'Browser surface crashed.',
      });
    });

    webContents.setWindowOpenHandler?.(() => ({ action: 'deny' }));
  }

  function goBackBrowserSurface(payload?: BrowserSurfacePayload): BrowserSurfaceHistoryResult {
    const windowId = Number(payload?.windowId || 0);
    const tabId = normalizeBrowserSurfaceTabId(payload?.tabId);
    const record = getRecord(windowId, tabId);
    if (!record) {
      throw new Error('Browser surface is not initialized.');
    }
    if (record.view.webContents.canGoBack?.()) {
      record.view.webContents.goBack?.();
    }
    publishRecord(record, {}, { keepPhase: true });
    const state = buildState(record)!;
    return {
      windowId: state.windowId,
      tabId: state.tabId,
      canGoBack: state.canGoBack,
      canGoForward: state.canGoForward,
    };
  }

  function goForwardBrowserSurface(payload?: BrowserSurfacePayload): BrowserSurfaceHistoryResult {
    const windowId = Number(payload?.windowId || 0);
    const tabId = normalizeBrowserSurfaceTabId(payload?.tabId);
    const record = getRecord(windowId, tabId);
    if (!record) {
      throw new Error('Browser surface is not initialized.');
    }
    if (record.view.webContents.canGoForward?.()) {
      record.view.webContents.goForward?.();
    }
    publishRecord(record, {}, { keepPhase: true });
    const state = buildState(record)!;
    return {
      windowId: state.windowId,
      tabId: state.tabId,
      canGoBack: state.canGoBack,
      canGoForward: state.canGoForward,
    };
  }

  function ensureViewAttached(window: BrowserSurfaceWindow, record: BrowserSurfaceRecord) {
    if (record.parentView) {
      record.parentView.addChildView(record.view);
      return;
    }
    const parentView = window.getContentView?.() ?? window.contentView;
    if (!parentView) {
      throw new Error('Window content view is unavailable.');
    }
    parentView.addChildView(record.view);
    record.parentView = parentView;
    const handleWindowClose = () => {
      disposeBrowserSurface({ windowId: window.id, tabId: record.tabId });
    };
    window.once('closed', handleWindowClose);
    record.windowCloseHandler = handleWindowClose;
  }

  function ensureBrowserSurface(payload?: BrowserSurfaceEnsurePayload) {
    const windowId = Number(payload?.windowId || 0);
    const tabId = normalizeBrowserSurfaceTabId(payload?.tabId);
    if (!windowId) {
      throw new Error('windowId is required.');
    }
    if (!tabId) {
      throw new Error('tabId is required.');
    }

    const window = deps.BrowserWindow.fromId(windowId);
    if (!window || window.isDestroyed?.()) {
      throw new Error(`window ${windowId} is not available.`);
    }

    let record = getRecord(windowId, tabId);
    if (!record) {
      const view = new deps.WebContentsView({
        webPreferences: {
          ...webPreferences,
          partition: `${webPreferences.partition || 'agency-bounded-web-research'}:${windowId}:${tabId}`,
        },
      });
      record = {
        key: makeSurfaceKey(windowId, tabId),
        windowId,
        tabId,
        view,
        bounds: null,
        visible: false,
        url: '',
        title: '',
        phase: 'hidden',
        error: '',
        navigationKey: -1,
        listeners: [],
      };
      registerWebContentsListeners(record);
      surfaces.set(record.key, record);
    }

    record.window = window;
    ensureViewAttached(window, record);

    const sanitizedBounds = sanitizeBounds(payload?.bounds);
    if (sanitizedBounds) {
      record.bounds = sanitizedBounds;
      record.view.setBounds(sanitizedBounds);
    }

    const nextUrl = normalizeBrowserSurfaceUrl(payload?.url);
    const navigationKey = normalizeBrowserSurfaceNavigationKey(payload?.navigationKey);
    if (nextUrl && (record.url !== nextUrl || record.navigationKey !== navigationKey)) {
      record.navigationKey = navigationKey;
      loadBrowserSurfaceUrl(record, nextUrl);
    }

    return buildState(record);
  }

  function showBrowserSurface(payload?: BrowserSurfacePayload) {
    const windowId = Number(payload?.windowId || 0);
    const tabId = normalizeBrowserSurfaceTabId(payload?.tabId);
    const record = getRecord(windowId, tabId);
    if (!record) {
      throw new Error('Browser surface is not initialized.');
    }

    const activeKey = visibleSurfaceByWindow.get(windowId);
    if (activeKey && activeKey !== record.key) {
      const activeRecord = surfaces.get(activeKey);
      if (activeRecord) {
        activeRecord.view.setVisible(false);
        publishRecord(activeRecord, { visible: false }, { keepPhase: true });
      }
    }

    if (record.parentView) {
      record.parentView.addChildView(record.view);
    }
    record.view.setVisible(true);
    visibleSurfaceByWindow.set(windowId, record.key);
    publishRecord(record, { visible: true }, { keepPhase: true });
    return buildState(record);
  }

  function hideBrowserSurface(payload?: BrowserSurfacePayload) {
    const windowId = Number(payload?.windowId || 0);
    const tabId = normalizeBrowserSurfaceTabId(payload?.tabId);
    const record = getRecord(windowId, tabId);
    if (!record) {
      return null;
    }

    record.view.setVisible(false);
    if (visibleSurfaceByWindow.get(windowId) === record.key) {
      visibleSurfaceByWindow.delete(windowId);
    }
    publishRecord(record, { visible: false, phase: 'hidden' });
    return buildState(record);
  }

  function updateBrowserSurfaceBounds(payload?: BrowserSurfaceBoundsPayload) {
    const windowId = Number(payload?.windowId || 0);
    const tabId = normalizeBrowserSurfaceTabId(payload?.tabId);
    const record = getRecord(windowId, tabId);
    if (!record) {
      throw new Error('Browser surface is not initialized.');
    }

    const sanitizedBounds = sanitizeBounds(payload?.bounds);
    if (!sanitizedBounds) {
      return buildState(record);
    }

    record.bounds = sanitizedBounds;
    record.view.setBounds(sanitizedBounds);
    return buildState(record);
  }

  function navigateBrowserSurface(payload: BrowserSurfaceNavigatePayload) {
    const windowId = Number(payload?.windowId || 0);
    const tabId = normalizeBrowserSurfaceTabId(payload?.tabId);
    const record = getRecord(windowId, tabId);
    if (!record) {
      throw new Error('Browser surface is not initialized.');
    }

    const nextUrl = normalizeBrowserSurfaceUrl(payload?.url);
    if (!nextUrl) {
      throw new Error('A public http/https URL is required.');
    }

    const navigationKey = normalizeBrowserSurfaceNavigationKey(payload?.navigationKey);
    if (record.url === nextUrl && record.navigationKey === navigationKey) {
      return buildState(record);
    }

    record.navigationKey = navigationKey;
    loadBrowserSurfaceUrl(record, nextUrl);
    return buildState(record);
  }

  function disposeBrowserSurface(payload?: BrowserSurfacePayload) {
    const windowId = Number(payload?.windowId || 0);
    const tabId = normalizeBrowserSurfaceTabId(payload?.tabId);
    const record = getRecord(windowId, tabId);
    if (!record) {
      return false;
    }

    if (visibleSurfaceByWindow.get(windowId) === record.key) {
      visibleSurfaceByWindow.delete(windowId);
    }
    detachView(record);
    removeListeners(record);
    record.view.setVisible(false);
    record.view.webContents.destroy?.();
    record.phase = 'disposed';
    record.visible = false;
    publishRecord(record, {
      visible: false,
      phase: 'disposed',
    });
    surfaces.delete(record.key);
    return true;
  }

  function getBrowserSurfaceState(payload?: BrowserSurfacePayload) {
    const windowId = Number(payload?.windowId || 0);
    const tabId = normalizeBrowserSurfaceTabId(payload?.tabId);
    return buildState(getRecord(windowId, tabId));
  }

  return {
    ensureBrowserSurface,
    showBrowserSurface,
    hideBrowserSurface,
    updateBrowserSurfaceBounds,
    navigateBrowserSurface,
    disposeBrowserSurface,
    getBrowserSurfaceState,
    goBackBrowserSurface,
    goForwardBrowserSurface,
  };
}

type WorkbenchBrowserSurfaceService = ReturnType<typeof createWorkbenchBrowserSurfaceService>;

function syncWorkbenchBrowserSurfaceWithService(
  service: WorkbenchBrowserSurfaceService,
  {
    ownerWindow,
    payload,
  }: {
    ownerWindow: BrowserSurfaceWindow | null | undefined;
    payload?: SyncWorkbenchBrowserSurfacePayload | null;
  }
) {
  if (!ownerWindow || ownerWindow.isDestroyed?.()) {
    throw new Error('Owner window is unavailable.');
  }

  const tabId = normalizeBrowserSurfaceTabId(payload?.tabId);
  if (!tabId) {
    throw new Error('tabId is required.');
  }

  const visible = payload?.visible !== false;
  if (!visible) {
    service.hideBrowserSurface({ windowId: ownerWindow.id, tabId });
    return (
      service.getBrowserSurfaceState({ windowId: ownerWindow.id, tabId }) || {
        windowId: ownerWindow.id,
        tabId,
        visible: false,
        url: '',
        title: '',
        bounds: null,
        phase: 'hidden',
        error: '',
        navigationKey: normalizeBrowserSurfaceNavigationKey(payload?.navigationKey),
      }
    );
  }

  const url = normalizeBrowserSurfaceUrl(payload?.url);
  if (!url) {
    throw new Error('A public http/https URL is required.');
  }

  const rendererBounds = sanitizeBounds(payload?.bounds);
  if (!rendererBounds) {
    const existingState = service.getBrowserSurfaceState({ windowId: ownerWindow.id, tabId });
    if (existingState) {
      return existingState;
    }
    throw new Error('Valid browser-surface bounds are required.');
  }
  const rendererViewBounds = resolveOwnerRendererViewBounds(ownerWindow as any);
  const bounds = mapRendererRectToNativeContentRect(ownerWindow as any, rendererBounds);
  if (!bounds) {
    void logRuntime('warn', 'browser surface mapped bounds unavailable', {
      windowId: ownerWindow.id,
      tabId,
      rendererBounds,
      rendererViewBounds,
      windowBounds: ownerWindow.getBounds?.() || null,
      contentBounds: ownerWindow.getContentBounds?.() || null,
    });
    service.hideBrowserSurface({ windowId: ownerWindow.id, tabId });
    return (
      service.getBrowserSurfaceState({ windowId: ownerWindow.id, tabId }) || {
        windowId: ownerWindow.id,
        tabId,
        visible: false,
        url,
        title: '',
        bounds: null,
        phase: 'hidden',
        error: '',
        navigationKey: normalizeBrowserSurfaceNavigationKey(payload?.navigationKey),
      }
    );
  }
  void logRuntime('info', 'browser surface resolved bounds', {
    windowId: ownerWindow.id,
    tabId,
    rendererBounds,
    rendererViewBounds,
    mappedBounds: bounds,
    windowBounds: ownerWindow.getBounds?.() || null,
    contentBounds: ownerWindow.getContentBounds?.() || null,
    explicitRendererViewBounds: Boolean(rendererViewBounds),
  });

  const navigationKey = normalizeBrowserSurfaceNavigationKey(payload?.navigationKey);
  service.ensureBrowserSurface({
    windowId: ownerWindow.id,
    tabId,
    bounds,
    url,
    navigationKey,
  });
  service.updateBrowserSurfaceBounds({ windowId: ownerWindow.id, tabId, bounds });
  service.showBrowserSurface({ windowId: ownerWindow.id, tabId });
  return service.getBrowserSurfaceState({ windowId: ownerWindow.id, tabId });
}

function disposeWorkbenchBrowserSurfaceWithService(
  service: WorkbenchBrowserSurfaceService,
  {
    ownerWindow,
    tabId,
  }: {
    ownerWindow: BrowserSurfaceWindow | null | undefined;
    tabId?: unknown;
  }
) {
  if (!ownerWindow) {
    return false;
  }
  const normalizedTabId = normalizeBrowserSurfaceTabId(tabId);
  if (!normalizedTabId) {
    return false;
  }
  return service.disposeBrowserSurface({
    windowId: ownerWindow.id,
    tabId: normalizedTabId,
  });
}

const defaultService = createWorkbenchBrowserSurfaceService({
  BrowserWindow: ElectronBrowserWindow,
  WebContentsView: ElectronWebContentsView,
});

function syncWorkbenchBrowserSurface(args: {
  ownerWindow: BrowserSurfaceWindow | null | undefined;
  payload?: SyncWorkbenchBrowserSurfacePayload | null;
}) {
  return syncWorkbenchBrowserSurfaceWithService(defaultService, args);
}

function disposeWorkbenchBrowserSurface(args: {
  ownerWindow: BrowserSurfaceWindow | null | undefined;
  tabId?: unknown;
}) {
  return disposeWorkbenchBrowserSurfaceWithService(defaultService, args);
}

function goBackWorkbenchBrowserSurface({
  ownerWindow,
  tabId,
}: {
  ownerWindow: BrowserSurfaceWindow | null | undefined;
  tabId?: unknown;
}) {
  if (!ownerWindow) {
    throw new Error('Owner window is unavailable.');
  }
  return defaultService.goBackBrowserSurface({
    windowId: ownerWindow.id,
    tabId: normalizeBrowserSurfaceTabId(tabId),
  });
}

function goForwardWorkbenchBrowserSurface({
  ownerWindow,
  tabId,
}: {
  ownerWindow: BrowserSurfaceWindow | null | undefined;
  tabId?: unknown;
}) {
  if (!ownerWindow) {
    throw new Error('Owner window is unavailable.');
  }
  return defaultService.goForwardBrowserSurface({
    windowId: ownerWindow.id,
    tabId: normalizeBrowserSurfaceTabId(tabId),
  });
}

module.exports = {
  createWorkbenchBrowserSurfaceService,
  ...defaultService,
  normalizeBrowserSurfaceUrl,
  normalizeWorkbenchBrowserSurfaceBounds: sanitizeBounds,
  mapRendererRectToNativeContentRect,
  syncWorkbenchBrowserSurface,
  syncWorkbenchBrowserSurfaceWithService,
  disposeWorkbenchBrowserSurface,
  disposeWorkbenchBrowserSurfaceWithService,
  goBackWorkbenchBrowserSurface,
  goForwardWorkbenchBrowserSurface,
};

export {};
