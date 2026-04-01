import { BrowserWindow, Rectangle, shell, WebContentsView } from 'electron';

const { logRuntime } = require('./runtimeLog');

type BrowserSurfacePhase = 'hidden' | 'loading' | 'ready' | 'error';

type BrowserSurfaceRecord = {
  windowStateId: string;
  windowId: number;
  tabId: string;
  url: string;
  title: string;
  phase: BrowserSurfacePhase;
  error: string;
  visible: boolean;
  attached: boolean;
  bounds: Rectangle;
  navigationKey: number;
  view: WebContentsView;
};

type SyncWorkbenchBrowserSurfacePayload = {
  tabId?: unknown;
  url?: unknown;
  visible?: unknown;
  navigationKey?: unknown;
  bounds?: Partial<Rectangle> | null;
};

const browserSurfacesByWindowStateId = new Map<string, BrowserSurfaceRecord>();
const browserSurfaceWindowIds = new Set<number>();

function normalizeWindowStateId(window: BrowserWindow | null | undefined) {
  return String((window as any)?.__agencyWindowStateId || '').trim() || `window:${window?.id || 0}`;
}

function normalizeBrowserSurfaceTabId(value: unknown) {
  return String(value || '').trim();
}

export function normalizeBrowserSurfaceUrl(value: unknown) {
  const normalizedUrl = String(value || '').trim();
  if (!normalizedUrl) {
    return '';
  }
  let parsed: URL;
  try {
    parsed = new URL(normalizedUrl);
  } catch (_error) {
    return '';
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return '';
  }
  return parsed.toString();
}

export function normalizeWorkbenchBrowserSurfaceBounds(value: unknown): Rectangle | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const candidate = value as Partial<Rectangle>;
  const x = Math.max(0, Math.floor(Number(candidate.x) || 0));
  const y = Math.max(0, Math.floor(Number(candidate.y) || 0));
  const width = Math.max(0, Math.floor(Number(candidate.width) || 0));
  const height = Math.max(0, Math.floor(Number(candidate.height) || 0));
  if (!width || !height) {
    return null;
  }
  return { x, y, width, height };
}

function buildBrowserSurfaceEvent(record: BrowserSurfaceRecord) {
  return {
    tabId: record.tabId,
    url: record.url,
    title: record.title,
    phase: record.phase,
    error: record.error,
    visible: record.visible,
  };
}

function emitBrowserSurfaceEvent(record: BrowserSurfaceRecord) {
  const ownerWindow = BrowserWindow.fromId(record.windowId);
  if (!ownerWindow || ownerWindow.isDestroyed?.()) {
    return;
  }
  ownerWindow.webContents.send('workbench:browserSurface:event', buildBrowserSurfaceEvent(record));
}

function attachBrowserSurfaceListeners(record: BrowserSurfaceRecord) {
  const { webContents } = record.view;
  webContents.on('did-start-loading', () => {
    record.phase = 'loading';
    record.error = '';
    emitBrowserSurfaceEvent(record);
  });

  webContents.on('page-title-updated', (_event, title) => {
    record.title = String(title || '').trim() || record.title;
    emitBrowserSurfaceEvent(record);
  });

  webContents.on('did-finish-load', () => {
    record.url = webContents.getURL() || record.url;
    record.phase = 'ready';
    record.error = '';
    emitBrowserSurfaceEvent(record);
  });

  webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    if (Number(errorCode) === -3) {
      return;
    }
    record.url = String(validatedURL || record.url);
    record.phase = 'error';
    record.error = `${errorDescription || 'Load failed'} (${errorCode})`;
    emitBrowserSurfaceEvent(record);
    logRuntime('warn', 'workbench browser surface load failed', {
      windowStateId: record.windowStateId,
      tabId: record.tabId,
      errorCode,
      errorDescription,
      validatedURL,
    });
  });

  webContents.on('render-process-gone', (_event, details) => {
    record.phase = 'error';
    record.error = details?.reason ? `Renderer gone: ${details.reason}` : 'Renderer process gone.';
    emitBrowserSurfaceEvent(record);
    logRuntime('warn', 'workbench browser surface process gone', {
      windowStateId: record.windowStateId,
      tabId: record.tabId,
      details: details || {},
    });
  });

  webContents.setWindowOpenHandler(({ url }) => {
    if (url) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });
}

function createBrowserSurfaceRecord({
  ownerWindow,
  windowStateId,
  tabId,
  url,
}: {
  ownerWindow: BrowserWindow;
  windowStateId: string;
  tabId: string;
  url: string;
}) {
  const view = new WebContentsView({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  view.setBackgroundColor('#ffffff');

  const record: BrowserSurfaceRecord = {
    windowStateId,
    windowId: ownerWindow.id,
    tabId,
    url,
    title: '',
    phase: 'hidden',
    error: '',
    visible: false,
    attached: false,
    bounds: { x: 0, y: 0, width: 0, height: 0 },
    navigationKey: -1,
    view,
  };

  attachBrowserSurfaceListeners(record);
  return record;
}

function ensureWindowSurfaceRecord({
  ownerWindow,
  tabId,
  url,
}: {
  ownerWindow: BrowserWindow;
  tabId: string;
  url: string;
}) {
  const windowStateId = normalizeWindowStateId(ownerWindow);
  const existing = browserSurfacesByWindowStateId.get(windowStateId);
  if (existing && existing.tabId === tabId) {
    return existing;
  }
  if (existing) {
    disposeWorkbenchBrowserSurface({ ownerWindow, tabId: existing.tabId });
  }

  const nextRecord = createBrowserSurfaceRecord({
    ownerWindow,
    windowStateId,
    tabId,
    url,
  });
  browserSurfacesByWindowStateId.set(windowStateId, nextRecord);

  if (!browserSurfaceWindowIds.has(ownerWindow.id)) {
    browserSurfaceWindowIds.add(ownerWindow.id);
    ownerWindow.once('closed', () => {
      disposeWorkbenchBrowserSurface({ ownerWindow });
      browserSurfaceWindowIds.delete(ownerWindow.id);
    });
  }

  return nextRecord;
}

function attachSurface(record: BrowserSurfaceRecord, ownerWindow: BrowserWindow) {
  if (!record.attached) {
    ownerWindow.contentView.addChildView(record.view);
    record.attached = true;
  }
}

function detachSurface(record: BrowserSurfaceRecord, ownerWindow: BrowserWindow) {
  if (!record.attached) {
    return;
  }
  ownerWindow.contentView.removeChildView(record.view);
  record.attached = false;
}

function hideSurface(record: BrowserSurfaceRecord, ownerWindow: BrowserWindow) {
  detachSurface(record, ownerWindow);
  record.view.setVisible(false);
  record.visible = false;
  record.phase = 'hidden';
  record.error = '';
  emitBrowserSurfaceEvent(record);
}

export function syncWorkbenchBrowserSurface({
  ownerWindow,
  payload,
}: {
  ownerWindow: BrowserWindow | null | undefined;
  payload?: SyncWorkbenchBrowserSurfacePayload | null;
}) {
  if (!ownerWindow || ownerWindow.isDestroyed?.()) {
    throw new Error('Owner window is unavailable.');
  }

  const visible = payload?.visible !== false;
  const tabId = normalizeBrowserSurfaceTabId(payload?.tabId);
  const url = normalizeBrowserSurfaceUrl(payload?.url);

  if (!visible) {
    const record = browserSurfacesByWindowStateId.get(normalizeWindowStateId(ownerWindow));
    if (record && (!tabId || record.tabId === tabId)) {
      hideSurface(record, ownerWindow);
      return buildBrowserSurfaceEvent(record);
    }
    return { tabId, url, title: '', phase: 'hidden', error: '', visible: false };
  }

  if (!tabId) {
    throw new Error('tabId is required.');
  }
  if (!url) {
    throw new Error('A public http/https URL is required.');
  }

  const bounds = normalizeWorkbenchBrowserSurfaceBounds(payload?.bounds);
  if (!bounds) {
    throw new Error('Valid browser-surface bounds are required.');
  }

  const record = ensureWindowSurfaceRecord({
    ownerWindow,
    tabId,
    url,
  });
  record.bounds = bounds;
  record.url = url;
  record.visible = true;
  attachSurface(record, ownerWindow);
  record.view.setBounds(bounds);
  record.view.setVisible(true);

  const nextNavigationKey = Math.max(0, Number(payload?.navigationKey || 0));
  if (record.navigationKey !== nextNavigationKey || record.view.webContents.getURL() !== url) {
    record.navigationKey = nextNavigationKey;
    void record.view.webContents.loadURL(url);
  } else {
    emitBrowserSurfaceEvent(record);
  }

  return buildBrowserSurfaceEvent(record);
}

export function disposeWorkbenchBrowserSurface({
  ownerWindow,
  tabId,
}: {
  ownerWindow: BrowserWindow | null | undefined;
  tabId?: string;
}) {
  if (!ownerWindow) {
    return;
  }
  const windowStateId = normalizeWindowStateId(ownerWindow);
  const record = browserSurfacesByWindowStateId.get(windowStateId);
  if (!record) {
    return;
  }
  if (tabId && record.tabId !== tabId) {
    return;
  }

  detachSurface(record, ownerWindow);
  if (!record.view.webContents.isDestroyed?.()) {
    record.view.webContents.close({ waitForBeforeUnload: false });
  }
  browserSurfacesByWindowStateId.delete(windowStateId);
}
