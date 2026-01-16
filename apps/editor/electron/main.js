const { app, BrowserWindow, Menu, nativeImage, protocol, net } = require('electron');
const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { setupCellHandlers } = require('./ipc/handlers/cells');
const { setupWorktreeHandlers } = require('./ipc/handlers/worktrees');
const { setupTerminalHandlers } = require('./ipc/handlers/terminal');
const { setupSessionHandlers } = require('./ipc/handlers/sessions');
const { setupUiStateHandlers } = require('./ipc/handlers/uiState');
const { setupQuickActionsHandlers } = require('./ipc/handlers/quickActions');
const { setupGatesHandlers } = require('./ipc/handlers/gates');
const { setupTmuxHandlers } = require('./ipc/handlers/tmux');
const { setupWorktreeLinksHandlers } = require('./ipc/handlers/worktreeLinks');
const { setupExplorerHandlers } = require('./ipc/handlers/explorer');
const { setupRuntimeLogHandlers } = require('./ipc/handlers/runtimeLog');
const { setupWorkbenchHandlers } = require('./ipc/handlers/workbench');
const { setupProjectHandlers } = require('./ipc/handlers/project');
const { setupClipboardHandlers } = require('./ipc/handlers/clipboard');
const { setupCommentsHandlers } = require('./ipc/handlers/comments');
const { setupHilHandlers } = require('./ipc/handlers/hil');
const { setupCaptureHandlers } = require('./ipc/handlers/capture');
const { setupActionSheetsHandlers } = require('./ipc/handlers/actionSheets');
const { setupVoiceCaptureHandlers } = require('./ipc/handlers/voiceCapture');
const { setupSystemHandlers } = require('./ipc/handlers/system');
const captureManager = require('./services/screenshotCapture/captureManager');
const { warmupVoiceCapture } = require('./services/voiceCapture');
const {
  selectProjectRoot,
  setWindowProjectRoot,
  clearWindowProjectRoot,
} = require('./services/projectRoot');
const {
  initRuntimeLogger,
  logRuntime,
  closeRuntimeLogger,
  getRuntimeLogInfo,
} = require('./services/runtimeLog');

const isDev = !app.isPackaged && Boolean(process.env.ELECTRON_RENDERER_URL);
let mainWindow;

app.setName('Agency');

const startupTimeline = {
  startedAt: performance.now(),
  events: [],
  flushed: false,
};

function ensureDarwinPath() {
  if (process.platform !== 'darwin') {
    return { updated: false, path: process.env.PATH || '', additions: [] };
  }
  const defaultPaths = [
    '/opt/homebrew/bin',
    '/usr/local/bin',
    '/usr/bin',
    '/bin',
    '/usr/sbin',
    '/sbin',
  ];
  const existing = (process.env.PATH || '')
    .split(path.delimiter)
    .filter(Boolean);
  const additions = defaultPaths.filter((entry) => !existing.includes(entry));
  if (additions.length === 0) {
    return { updated: false, path: existing.join(path.delimiter), additions: [] };
  }
  const nextPath = [...existing, ...additions].join(path.delimiter);
  process.env.PATH = nextPath;
  return { updated: true, path: nextPath, additions };
}

function recordStartup(stage, meta = {}) {
  const event = { stage, at: performance.now(), meta };
  startupTimeline.events.push(event);
  if (startupTimeline.flushed) {
    logRuntime('info', 'startup stage', {
      stage,
      elapsedMs: Math.round(event.at - startupTimeline.startedAt),
      ...meta,
    });
  }
}

function flushStartupTimeline() {
  if (startupTimeline.flushed) {
    return;
  }
  startupTimeline.flushed = true;
  startupTimeline.events.forEach((event) => {
    logRuntime('info', 'startup stage', {
      stage: event.stage,
      elapsedMs: Math.round(event.at - startupTimeline.startedAt),
      ...event.meta,
    });
  });
}

recordStartup('process-start');

function resolveIconPath() {
  const devIcon = path.join(__dirname, '../renderer/public/icon.png');
  if (fs.existsSync(devIcon)) {
    return devIcon;
  }
  const packagedIcon = path.join(process.resourcesPath, 'icon.png');
  if (fs.existsSync(packagedIcon)) {
    return packagedIcon;
  }
  return '';
}

function resolveIconImage() {
  const iconPath = resolveIconPath();
  if (!iconPath) {
    return null;
  }
  const image = nativeImage.createFromPath(iconPath);
  if (image.isEmpty()) {
    return null;
  }
  return image;
}

function createWindow({ startEmpty = false } = {}) {
  recordStartup('window-create-start', { startEmpty });
  const iconImage = resolveIconImage();
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#111318',
    autoHideMenuBar: true,
    ...(iconImage ? { icon: iconImage } : {}),
    title: 'Agency',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.__agencyAllowStoredProjectRoot = !startEmpty;
  win.on('closed', () => {
    clearWindowProjectRoot(win.id);
  });
  recordStartup('window-created', { id: win.id });

  const rendererUrl = process.env.ELECTRON_RENDERER_URL;
  if (isDev && rendererUrl) {
    recordStartup('renderer-load-start', { url: rendererUrl });
    win.loadURL(rendererUrl);
    // Open DevTools only if NOT in test mode to avoid confusing Playwright
    if (!process.env.AGENCY_TEST_MODE) {
      win.webContents.openDevTools({ mode: 'detach' });
    }
  } else {
    recordStartup('renderer-load-start', { url: 'file://dist/renderer/index.html' });
    win.loadFile(path.join(__dirname, '../dist/renderer/index.html'));
  }

  win.webContents.on('did-finish-load', () => {
    recordStartup('renderer-loaded', { url: win.webContents.getURL() });
    logRuntime('info', 'renderer loaded', { url: win.webContents.getURL() });
  });

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    logRuntime('error', 'renderer load failed', {
      errorCode,
      errorDescription,
      validatedURL,
    });
    if (!app.isPackaged && rendererUrl) {
      return;
    }
    win.loadFile(path.join(__dirname, '../dist/renderer/index.html'));
  });

  win.webContents.on('render-process-gone', (_event, details) => {
    logRuntime('error', 'renderer process gone', details || {});
  });

  mainWindow = win;
}

function broadcastRecentProjects(recentProjects) {
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send('project:recents', { recentProjects });
  });
}

function setupAssetProtocol() {
  protocol.handle('agency-asset', async (request) => {
    const url = new URL(request.url);
    const filePath = decodeURIComponent(url.pathname);
    // On Windows, the pathname starts with a slash like /C:/path, we need to remove it
    const normalizedPath = process.platform === 'win32' && filePath.startsWith('/') 
        ? filePath.slice(1) 
        : filePath;
    
    try {
      return await net.fetch(pathToFileURL(normalizedPath).toString());
    } catch (e) {
      logRuntime('error', 'asset protocol fetch failed', { path: normalizedPath, error: e.message });
      return new Response('Not Found', { status: 404 });
    }
  });
}

async function handleProjectSelection() {
  try {
    const ownerWindow = BrowserWindow.getFocusedWindow() || mainWindow;
    const result = await selectProjectRoot({ ownerWindow });
    if (result?.projectRoot && ownerWindow) {
      setWindowProjectRoot(ownerWindow.id, result.projectRoot);
      ownerWindow.webContents.send('project:updated', result);
    }
    if (result?.recentProjects) {
      broadcastRecentProjects(result.recentProjects);
    }
  } catch (error) {
    logRuntime('error', 'project selection failed', {
      error: error?.message || String(error),
    });
  }
}

function buildAppMenu() {
  const fileMenu = {
    label: 'File',
    submenu: [
      {
        label: 'Open Project...',
        accelerator: 'CmdOrCtrl+O',
        click: handleProjectSelection,
      },
      {
        label: 'Switch Project...',
        accelerator: 'CmdOrCtrl+Shift+O',
        click: handleProjectSelection,
      },
      { type: 'separator' },
      {
        label: 'New Window',
        accelerator: 'CmdOrCtrl+Shift+N',
        click: () => {
          createWindow({ startEmpty: true });
        },
      },
      { type: 'separator' },
      process.platform === 'darwin' ? { role: 'close' } : { role: 'quit' },
    ],
  };

  const template = [
    ...(process.platform === 'darwin'
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ]
      : []),
    fileMenu,
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(async () => {
  recordStartup('app-when-ready');
  await initRuntimeLogger();
  recordStartup('runtime-logger-ready');
  const pathUpdate = ensureDarwinPath();
  if (pathUpdate.updated) {
    logRuntime('info', 'process PATH updated', { additions: pathUpdate.additions });
  }
  flushStartupTimeline();
  const runtimeInfo = getRuntimeLogInfo();
  logRuntime('info', 'app ready', {
    version: app.getVersion(),
    electron: process.versions.electron,
    node: process.versions.node,
    runtimeInfo,
  });

  recordStartup('ipc-handlers-setup-start');
  setupCellHandlers({ getMainWindow: () => mainWindow });
  setupWorktreeHandlers();
  setupTerminalHandlers({ getMainWindow: () => mainWindow });
  setupSessionHandlers();
  setupUiStateHandlers();
  setupQuickActionsHandlers();
  setupGatesHandlers();
  setupTmuxHandlers();
  setupWorktreeLinksHandlers();
  setupExplorerHandlers();
  setupWorkbenchHandlers();
  setupRuntimeLogHandlers();
  setupProjectHandlers();
  setupClipboardHandlers();
  setupCommentsHandlers();
  setupHilHandlers();
  setupCaptureHandlers();
  setupActionSheetsHandlers();
  setupVoiceCaptureHandlers();
  setupSystemHandlers();
  recordStartup('ipc-handlers-ready');
  recordStartup('asset-protocol-setup');
  setupAssetProtocol();

  if (process.platform === 'darwin') {
    try {
      const iconImage = resolveIconImage();
      if (iconImage) {
        app.dock.setIcon(iconImage);
      } else {
        logRuntime('warn', 'dock icon missing');
      }
    } catch (error) {
      logRuntime('warn', 'dock icon set failed', { error: error?.message || String(error) });
    }
  }

  buildAppMenu();
  recordStartup('menu-built');
  createWindow();
  recordStartup('window-create-requested');
  recordStartup('voice-helper-warmup-start');
  warmupVoiceCapture({ source: 'app-ready' })
    .then((result) => {
      recordStartup('voice-helper-warmup-done', {
        ok: result?.ok ?? false,
        built: result?.built || false,
        reason: result?.reason || null,
      });
    })
    .catch((error) => {
      recordStartup('voice-helper-warmup-failed', {
        error: error?.message || String(error),
      });
    });
  captureManager.registerGlobalShortcut();
  recordStartup('global-shortcuts-registered');

  logRuntime('info', 'main window created');

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      logRuntime('info', 'main window recreated');
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    closeRuntimeLogger();
    app.quit();
  }
});

app.on('before-quit', () => {
  captureManager.unregisterGlobalShortcut();
  closeRuntimeLogger();
});

process.on('uncaughtException', (error) => {
  logRuntime('error', 'uncaught exception', { error: error.message, stack: error.stack });
});

process.on('unhandledRejection', (error) => {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  logRuntime('error', 'unhandled rejection', { error: message, stack });
});
