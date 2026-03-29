const { app, BrowserWindow, screen, globalShortcut } = require('electron');
const { createOverlayWindow, closeOverlayWindow } = require('../../windows/captureOverlay/overlayWindow');
const { getDisplaySource } = require('./sourceGrabber');
const { saveCaptureAsset, copyCaptureToClipboard } = require('./imageComposer');
const {
  focusAgencyWindow,
  restoreAgencyAppVisibility,
  showAgencyWindows,
} = require('./windowVisibility');

let activeSession: any = null;

const buildRequestId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`;

function assertActiveSession(requestId) {
  if (!activeSession) {
    throw new Error('No active capture session.');
  }
  if (requestId && activeSession.requestId !== requestId) {
    throw new Error('Capture session mismatch.');
  }
  return activeSession;
}

function hideAgencyWindows(excludedWindowIds = []) {
  const hidden = [];
  BrowserWindow.getAllWindows().forEach((win) => {
    if (excludedWindowIds.includes(win.id)) {
      return;
    }
    if (win.isVisible()) {
      hidden.push(win);
      win.hide();
    }
  });
  return hidden;
}

function restoreAgencyWindows(windows = []) {
  showAgencyWindows(windows);
}

async function startCapture(params: any = {}) {
  const { windowId, includeAgencyWindows = false } = params || {};
  if (activeSession) {
    throw new Error('A capture session is already active.');
  }
  const originWindow = windowId ? BrowserWindow.fromId(windowId) : BrowserWindow.getFocusedWindow();
  if (!originWindow) {
    throw new Error('No originating window for capture.');
  }
  const requestId = buildRequestId();
  const displays = screen.getAllDisplays();
  const overlayWindows = new Map();
  const hiddenWindows = includeAgencyWindows ? [] : hideAgencyWindows([]);
  let resolveCapture: any = null;
  let rejectCapture: any = null;
  const captureResult = new Promise((resolve, reject) => {
    resolveCapture = resolve;
    rejectCapture = reject;
  });

  activeSession = {
    requestId,
    originWindowId: originWindow.id,
    includeAgencyWindows,
    overlays: overlayWindows,
    hiddenWindows,
    sourceCache: new Map(),
    resolve: resolveCapture,
    reject: rejectCapture,
  };

  try {
    displays.forEach((display) => {
      const overlay = createOverlayWindow({
        display,
        requestId,
        onFatalLoadError: ({ displayId, errorDescription, validatedURL }: any) => {
          if (!activeSession || activeSession.requestId !== requestId) {
            return;
          }
          const reason =
            errorDescription || validatedURL
              ? `Capture overlay failed to load (display ${displayId}): ${errorDescription || validatedURL}.`
              : `Capture overlay failed to load (display ${displayId}).`;
          void cancelCapture({ requestId, reason }).catch(() => undefined);
        },
      });
      overlayWindows.set(display.id, overlay);
    });

    return await captureResult;
  } catch (error) {
    await cleanupSession();
    throw error;
  }
}

async function getDisplaySourceForOverlay(params: any = {}) {
  const { requestId, displayId } = params || {};
  const session = assertActiveSession(requestId);
  if (session.sourceCache.has(displayId)) {
    return session.sourceCache.get(displayId);
  }
  const overlays = (Array.from(session.overlays?.values() || []) as any[]).filter(
    (win: any) => win && !win.isDestroyed()
  );
  overlays.forEach((win: any) => {
    try {
      win.setOpacity(0);
    } catch {
      // Ignore overlay opacity failures.
    }
  });
  if (overlays.length) {
    await new Promise((resolve) => setTimeout(resolve, 60));
  }
  let source;
  try {
    source = await getDisplaySource(displayId);
  } finally {
    overlays.forEach((win: any) => {
      try {
        win.setOpacity(1);
      } catch {
        // Ignore overlay opacity failures.
      }
    });
  }
  session.sourceCache.set(displayId, source);
  return source;
}

async function completeCapture(params: any = {}) {
  const { requestId, payload } = params || {};
  const session = assertActiveSession(requestId);
  const { resolve } = session;
  await cleanupSession();
  if (resolve) {
    resolve(payload);
  }
  return { ok: true };
}

async function cancelCapture(params: any = {}) {
  const { requestId, reason } = params || {};
  const session = assertActiveSession(requestId);
  const { reject } = session;
  await cleanupSession();
  if (reject) {
    reject(new Error(reason || 'Capture cancelled.'));
  }
  return { ok: true };
}

async function setIncludeAgencyWindows(params: any = {}) {
  const { requestId, includeAgencyWindows } = params || {};
  const session = assertActiveSession(requestId);
  if (session.includeAgencyWindows === includeAgencyWindows) {
    return { ok: true };
  }
  session.includeAgencyWindows = includeAgencyWindows;
  if (includeAgencyWindows) {
    restoreAgencyWindows(session.hiddenWindows || []);
    session.hiddenWindows = [];
  } else {
    const overlayIds = Array.from(session.overlays.values()).map((win: any) => win.id);
    session.hiddenWindows = hideAgencyWindows(overlayIds);
  }
  session.sourceCache.clear();
  return { ok: true };
}

async function cleanupSession() {
  if (!activeSession) {
    return;
  }
  const session = activeSession;
  activeSession = null;
  const overlays = session.overlays || new Map();
  overlays.forEach((win) => closeOverlayWindow(win));
  restoreAgencyAppVisibility(app);
  restoreAgencyWindows(session.hiddenWindows || []);
  const originWindow = session.originWindowId ? BrowserWindow.fromId(session.originWindowId) : null;
  focusAgencyWindow(originWindow);
}

function registerGlobalShortcut() {
  const accelerator = 'CommandOrControl+Shift+5';
  if (globalShortcut.isRegistered(accelerator)) {
    return;
  }
  globalShortcut.register(accelerator, () => {
    const focused = BrowserWindow.getFocusedWindow();
    if (!focused) {
      return;
    }
    startCapture({ windowId: focused.id, includeAgencyWindows: false }).catch(() => undefined);
  });
}

function unregisterGlobalShortcut() {
  const accelerator = 'CommandOrControl+Shift+5';
  if (globalShortcut.isRegistered(accelerator)) {
    globalShortcut.unregister(accelerator);
  }
}

export {
  startCapture,
  getDisplaySourceForOverlay,
  completeCapture,
  cancelCapture,
  setIncludeAgencyWindows,
  saveCaptureAsset,
  copyCaptureToClipboard,
  registerGlobalShortcut,
  unregisterGlobalShortcut,
};
