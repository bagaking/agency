const { BrowserWindow } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const { resolveRendererUrl } = require('../../services/rendererUrl');

function buildOverlayUrl(requestId, displayId) {
  const rendererUrl = resolveRendererUrl().url;
  if (rendererUrl) {
    const url = new URL(rendererUrl);
    url.searchParams.set('capture', '1');
    url.searchParams.set('requestId', requestId);
    url.searchParams.set('displayId', String(displayId));
    return url.toString();
  }
  const fileUrl = pathToFileURL(path.join(__dirname, '../../dist/renderer/index.html'));
  fileUrl.searchParams.set('capture', '1');
  fileUrl.searchParams.set('requestId', requestId);
  fileUrl.searchParams.set('displayId', String(displayId));
  return fileUrl.toString();
}

function createOverlayWindow({ display, requestId }) {
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
  win.loadURL(buildOverlayUrl(requestId, display.id));
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
