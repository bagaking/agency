const { app, BrowserWindow } = require('electron');
const path = require('path');
const { setupCellHandlers } = require('./ipc/handlers/cells');
const { setupWorktreeHandlers } = require('./ipc/handlers/worktrees');
const { setupTerminalHandlers } = require('./ipc/handlers/terminal');
const { setupSessionHandlers } = require('./ipc/handlers/sessions');
const { setupUiStateHandlers } = require('./ipc/handlers/uiState');
const { setupQuickActionsHandlers } = require('./ipc/handlers/quickActions');
const { setupGatesHandlers } = require('./ipc/handlers/gates');
const { setupTmuxHandlers } = require('./ipc/handlers/tmux');
const { setupWorktreeLinksHandlers } = require('./ipc/handlers/worktreeLinks');
const { setupRuntimeLogHandlers } = require('./ipc/handlers/runtimeLog');
const {
  initRuntimeLogger,
  logRuntime,
  closeRuntimeLogger,
  getRuntimeLogInfo,
} = require('./services/runtimeLog');

const isDev = Boolean(process.env.ELECTRON_RENDERER_URL);
let mainWindow;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#111318',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
    // Open DevTools only if NOT in test mode to avoid confusing Playwright
    if (!process.env.AGENCY_TEST_MODE) {
      win.webContents.openDevTools({ mode: 'detach' });
    }
  } else {
    win.loadFile(path.join(__dirname, '../dist/renderer/index.html'));
  }

  mainWindow = win;
}

app.whenReady().then(async () => {
  await initRuntimeLogger();
  const runtimeInfo = getRuntimeLogInfo();
  logRuntime('info', 'app ready', {
    version: app.getVersion(),
    electron: process.versions.electron,
    node: process.versions.node,
    runtimeInfo,
  });

  setupCellHandlers({ getMainWindow: () => mainWindow });
  setupWorktreeHandlers();
  setupTerminalHandlers({ getMainWindow: () => mainWindow });
  setupSessionHandlers();
  setupUiStateHandlers();
  setupQuickActionsHandlers();
  setupGatesHandlers();
  setupTmuxHandlers();
  setupWorktreeLinksHandlers();
  setupRuntimeLogHandlers();
  createWindow();

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
