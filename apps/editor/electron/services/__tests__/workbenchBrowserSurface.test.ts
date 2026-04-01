const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createWorkbenchBrowserSurfaceService,
  normalizeBrowserSurfaceUrl,
  normalizeWorkbenchBrowserSurfaceBounds,
  syncWorkbenchBrowserSurfaceWithService,
} = require('../workbenchBrowserSurface');

class FakeEventEmitter {
  handlers: Map<string, Array<(...args: any[]) => void>>;
  constructor() {
    this.handlers = new Map();
  }
  on(event, handler) {
    const list = this.handlers.get(event) ?? [];
    list.push(handler);
    this.handlers.set(event, list);
    return this;
  }
  removeListener(event, handler) {
    const list = this.handlers.get(event) ?? [];
    this.handlers.set(event, list.filter((fn) => fn !== handler));
  }
  once(event, handler) {
    const wrapper = (...args) => {
      handler(...args);
      this.removeListener(event, wrapper);
    };
    this.on(event, wrapper);
    return this;
  }
  emit(event, ...args) {
    const list = this.handlers.get(event);
    if (!list) {
      return;
    }
    list.slice().forEach((handler) => handler(...args));
  }
}

class FakeWebContents extends FakeEventEmitter {
  loadUrls: string[];
  focused: boolean;
  destroyed: boolean;
  windowOpenHandler: ((details?: unknown) => { action: 'allow' | 'deny' }) | null;
  constructor() {
    super();
    this.loadUrls = [];
    this.focused = false;
    this.destroyed = false;
    this.windowOpenHandler = null;
  }
  loadURL(url) {
    this.loadUrls.push(url);
  }
  focus() {
    this.focused = true;
  }
  destroy() {
    this.destroyed = true;
  }
  setWindowOpenHandler(handler) {
    this.windowOpenHandler = handler;
  }
}

class FakeView {
  children: Set<FakeView>;
  bounds: { x: number; y: number; width: number; height: number };
  visible: boolean;
  constructor() {
    this.children = new Set();
    this.bounds = { x: 0, y: 0, width: 0, height: 0 };
    this.visible = false;
  }
  addChildView(view) {
    this.children.add(view);
  }
  removeChildView(view) {
    this.children.delete(view);
  }
  setBounds(bounds) {
    this.bounds = bounds;
  }
  setVisible(value) {
    this.visible = value;
  }
}

class FakeWebContentsView extends FakeView {
  webContents: FakeWebContents;
  constructor() {
    super();
    this.webContents = new FakeWebContents();
  }
}

class FakeWindow extends FakeEventEmitter {
  id: number;
  _contentView: FakeView;
  webContents: {
    send: () => void;
  };
  destroyed: boolean;
  constructor(id) {
    super();
    this.id = id;
    this._contentView = new FakeView();
    this.webContents = {
      send: () => {},
    };
    this.destroyed = false;
  }
  getContentView() {
    return this._contentView;
  }
  isDestroyed() {
    return this.destroyed;
  }
}

function setupService() {
  const fakeWindow = new FakeWindow(1);
  const statusEvents = [];
  const service = createWorkbenchBrowserSurfaceService({
    BrowserWindow: {
      fromId(id) {
        return id === fakeWindow.id ? fakeWindow : null;
      },
    },
    WebContentsView: FakeWebContentsView,
    publishEvent(payload) {
      statusEvents.push(payload);
    },
  });
  return { service, fakeWindow, statusEvents };
}

function getAttachedView(window): FakeWebContentsView {
  return Array.from(window.getContentView().children)[0] as FakeWebContentsView;
}

function ensureSurface(service, window, tabId = 'tab-1') {
  return service.ensureBrowserSurface({
    windowId: window.id,
    tabId,
    url: 'https://example.com/',
    bounds: { x: 0, y: 0, width: 320, height: 200 },
  });
}

test('normalizeBrowserSurfaceUrl keeps browser-surface navigation on public http urls', () => {
  assert.equal(normalizeBrowserSurfaceUrl('https://example.com/docs'), 'https://example.com/docs');
  assert.equal(normalizeBrowserSurfaceUrl('http://example.com/docs'), 'http://example.com/docs');
  assert.equal(normalizeBrowserSurfaceUrl('ftp://example.com/file.txt'), '');
  assert.equal(normalizeBrowserSurfaceUrl('about:blank'), '');
});

test('normalizeWorkbenchBrowserSurfaceBounds clamps and rejects empty rects', () => {
  assert.deepEqual(
    normalizeWorkbenchBrowserSurfaceBounds({
      x: 12.8,
      y: 20.1,
      width: 500.9,
      height: 320.4,
    }),
    { x: 12, y: 20, width: 500, height: 320 }
  );
  assert.equal(
    normalizeWorkbenchBrowserSurfaceBounds({
      x: 0,
      y: 0,
      width: 0,
      height: 100,
    }),
    null
  );
});

test('ensures browser surface state per window + tab', () => {
  const { service, fakeWindow } = setupService();
  const payload = ensureSurface(service, fakeWindow, 'tab-ensure');
  assert.equal(payload.windowId, fakeWindow.id);
  assert.equal(payload.tabId, 'tab-ensure');
  assert.equal(payload.visible, false);
  const state = service.getBrowserSurfaceState({ windowId: fakeWindow.id, tabId: 'tab-ensure' });
  assert.equal(state.url, 'https://example.com/');
  assert.deepEqual(state.bounds, { x: 0, y: 0, width: 320, height: 200 });
});

test('keeps separate surfaces per tab and only one visible per window', () => {
  const { service, fakeWindow } = setupService();
  ensureSurface(service, fakeWindow, 'tab-a');
  ensureSurface(service, fakeWindow, 'tab-b');

  service.showBrowserSurface({ windowId: fakeWindow.id, tabId: 'tab-a' });
  assert.equal(service.getBrowserSurfaceState({ windowId: fakeWindow.id, tabId: 'tab-a' }).visible, true);

  service.showBrowserSurface({ windowId: fakeWindow.id, tabId: 'tab-b' });
  assert.equal(service.getBrowserSurfaceState({ windowId: fakeWindow.id, tabId: 'tab-a' }).visible, false);
  assert.equal(service.getBrowserSurfaceState({ windowId: fakeWindow.id, tabId: 'tab-b' }).visible, true);
});

test('show/hide updates visibility and emits hidden status', () => {
  const { service, fakeWindow, statusEvents } = setupService();
  const tabId = 'tab-visibility';
  ensureSurface(service, fakeWindow, tabId);
  service.showBrowserSurface({ windowId: fakeWindow.id, tabId });
  assert.equal(service.getBrowserSurfaceState({ windowId: fakeWindow.id, tabId }).visible, true);
  service.hideBrowserSurface({ windowId: fakeWindow.id, tabId });
  assert.equal(service.getBrowserSurfaceState({ windowId: fakeWindow.id, tabId }).visible, false);
  assert.ok(statusEvents.some((event) => event.visible === false));
});

test('navigate updates the stored URL', () => {
  const { service, fakeWindow } = setupService();
  const tabId = 'tab-navigate';
  ensureSurface(service, fakeWindow, tabId);
  service.navigateBrowserSurface({ windowId: fakeWindow.id, tabId, url: 'https://next.com/' });
  const state = service.getBrowserSurfaceState({ windowId: fakeWindow.id, tabId });
  assert.equal(state.url, 'https://next.com/');
  const view = getAttachedView(fakeWindow);
  assert.equal(view.webContents.loadUrls[view.webContents.loadUrls.length - 1], 'https://next.com/');
});

test('update bounds applies sanitized rectangle', () => {
  const { service, fakeWindow } = setupService();
  const tabId = 'tab-bounds';
  ensureSurface(service, fakeWindow, tabId);
  const bounds = { x: 10, y: 12, width: 640, height: 480 };
  service.updateBrowserSurfaceBounds({ windowId: fakeWindow.id, tabId, bounds });
  const state = service.getBrowserSurfaceState({ windowId: fakeWindow.id, tabId });
  assert.deepEqual(state.bounds, bounds);
  const view = getAttachedView(fakeWindow);
  assert.deepEqual(view.bounds, bounds);
});

test('dispose removes the surface and destroys web contents', () => {
  const { service, fakeWindow, statusEvents } = setupService();
  const tabId = 'tab-dispose';
  ensureSurface(service, fakeWindow, tabId);
  const view = getAttachedView(fakeWindow);
  const disposed = service.disposeBrowserSurface({ windowId: fakeWindow.id, tabId });
  assert.equal(disposed, true);
  assert.equal(service.getBrowserSurfaceState({ windowId: fakeWindow.id, tabId }), null);
  assert.ok(view.webContents.destroyed);
  assert.ok(statusEvents.some((event) => event.phase === 'disposed'));
});

test('status events propagate from web contents', () => {
  const { service, fakeWindow, statusEvents } = setupService();
  const tabId = 'tab-status';
  ensureSurface(service, fakeWindow, tabId);
  const view = getAttachedView(fakeWindow);
  view.webContents.emit('did-start-navigation', null, 'https://example.com/', false, true);
  view.webContents.emit('did-finish-load');
  assert.ok(statusEvents.some((event) => event.phase === 'loading'));
  assert.ok(statusEvents.some((event) => event.phase === 'ready'));
});

test('blocks non-public in-view navigation inside the browser surface', () => {
  const { service, fakeWindow, statusEvents } = setupService();
  const tabId = 'tab-guard';
  ensureSurface(service, fakeWindow, tabId);
  const view = getAttachedView(fakeWindow);
  let prevented = false;
  view.webContents.emit('will-navigate', { preventDefault: () => { prevented = true; } }, 'http://localhost:3000/private');
  assert.equal(prevented, true);
  assert.ok(
    statusEvents.some(
      (event) =>
        event.phase === 'error' &&
        event.error === 'Only public http/https URLs can stay inside Agency View.'
    )
  );
});

test('sync helper hides an uninitialized surface without throwing', () => {
  const { service, fakeWindow } = setupService();
  const state = syncWorkbenchBrowserSurfaceWithService(service, {
    ownerWindow: fakeWindow,
    payload: {
      tabId: 'tab-hidden',
      visible: false,
    },
  });
  assert.equal(state.visible, false);
  assert.equal(state.phase, 'hidden');
});

test('sync helper only reloads when url or navigation key changes', () => {
  const { service, fakeWindow } = setupService();

  const firstState = syncWorkbenchBrowserSurfaceWithService(service, {
    ownerWindow: fakeWindow,
    payload: {
      tabId: 'tab-sync',
      url: 'https://example.com/',
      visible: true,
      navigationKey: 0,
      bounds: { x: 0, y: 0, width: 320, height: 200 },
    },
  });
  assert.equal(firstState.visible, true);

  const view = getAttachedView(fakeWindow);
  assert.equal(view.webContents.loadUrls.length, 1);

  syncWorkbenchBrowserSurfaceWithService(service, {
    ownerWindow: fakeWindow,
    payload: {
      tabId: 'tab-sync',
      url: 'https://example.com/',
      visible: true,
      navigationKey: 0,
      bounds: { x: 8, y: 8, width: 400, height: 280 },
    },
  });
  assert.equal(view.webContents.loadUrls.length, 1);

  syncWorkbenchBrowserSurfaceWithService(service, {
    ownerWindow: fakeWindow,
    payload: {
      tabId: 'tab-sync',
      url: 'https://example.com/',
      visible: true,
      navigationKey: 1,
      bounds: { x: 8, y: 8, width: 400, height: 280 },
    },
  });
  assert.equal(view.webContents.loadUrls.length, 2);
});

export {};
