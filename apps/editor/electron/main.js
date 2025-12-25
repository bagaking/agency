const { app, BrowserWindow } = require('electron');
const path = require('path');
const { setupCellHandlers } = require('./ipc/handlers/cells');
const { setupWorktreeHandlers } = require('./ipc/handlers/worktrees');

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
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, '../dist/renderer/index.html'));
  }

  mainWindow = win;
}

app.whenReady().then(() => {
  setupCellHandlers({ getMainWindow: () => mainWindow });
  setupWorktreeHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
