const { app, BrowserWindow } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const { resolveRendererUrl } = require('../../services/rendererUrl');

function buildFileOverlayUrl(requestId, displayId) {
  const fileUrl = pathToFileURL(path.join(__dirname, '../../../dist/renderer/index.html'));
  fileUrl.searchParams.set('capture', '1');
  fileUrl.searchParams.set('requestId', requestId);
  fileUrl.searchParams.set('displayId', String(displayId));
  return fileUrl.toString();
}

function buildOverlayUrls(requestId, displayId) {
  const fallbackUrl = buildFileOverlayUrl(requestId, displayId);
  const rendererUrl = resolveRendererUrl({ isPackaged: app.isPackaged }).url;
  if (!rendererUrl) {
    return { initialUrl: fallbackUrl, fallbackUrl: '' };
  }
  const devUrl = new URL(rendererUrl);
  devUrl.searchParams.set('capture', '1');
  devUrl.searchParams.set('requestId', requestId);
  devUrl.searchParams.set('displayId', String(displayId));
  return { initialUrl: devUrl.toString(), fallbackUrl };
}

function createOverlayWindow({ display, requestId, onFatalLoadError }) {
  const { bounds } = display;
  const win = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    transparent: true,
    frame: false,
    resizable: false,
    movable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    title: 'Agency Capture',
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'overlayPreload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  win.__agencyCaptureOverlay = true;
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  const { initialUrl, fallbackUrl } = buildOverlayUrls(requestId, display.id);
  let fallbackUsed = false;
  win.webContents.on(
    'did-fail-load',
    (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      if (!isMainFrame) {
        return;
      }
      const failedUrl = String(validatedURL || '');
      if (!fallbackUsed && fallbackUrl && failedUrl !== fallbackUrl) {
        fallbackUsed = true;
        void win.loadURL(fallbackUrl);
        return;
      }
      onFatalLoadError?.({
        displayId: display.id,
        errorCode,
        errorDescription,
        validatedURL: failedUrl,
      });
    }
  );
  void win.loadURL(initialUrl);
  return win;
}

function closeOverlayWindow(win) {
  if (!win || win.isDestroyed()) {
    return;
  }
  win.close();
}

export {
  createOverlayWindow,
  closeOverlayWindow,
};
