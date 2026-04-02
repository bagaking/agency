const { BrowserWindow, ipcMain } = require('electron');
const {
  statEntry,
  readTextFile,
  writeTextFile,
  resolveFileUrl,
  getDiff,
  getBlame,
  getFileSnippet,
} = require('../../services/workbench');
const { readWorkbenchProjectPolicy } = require('../../services/workbenchPolicy');
const {
  syncWorkbenchBrowserSurface,
  disposeWorkbenchBrowserSurface,
  goBackWorkbenchBrowserSurface,
  goForwardWorkbenchBrowserSurface,
} = require('../../services/workbenchBrowserSurface');

function setupWorkbenchHandlers() {
  ipcMain.handle('workbench:policy', async (_event, payload) => {
    return readWorkbenchProjectPolicy({ rootPath: payload?.rootPath });
  });

  ipcMain.handle('workbench:stat', async (_event, payload) => {
    const rootPath = payload?.rootPath;
    const targetPath = payload?.targetPath;
    return statEntry({ rootPath, targetPath });
  });

  ipcMain.handle('workbench:snippet', async (_event, payload) => {
    const { rootPath, targetPath, line, context } = payload || {};
    return getFileSnippet({ rootPath, targetPath, line, context });
  });

  ipcMain.handle('workbench:read', async (_event, payload) => {
    const rootPath = payload?.rootPath;
    const targetPath = payload?.targetPath;
    return readTextFile({ rootPath, targetPath });
  });

  ipcMain.handle('workbench:write', async (_event, payload) => {
    const rootPath = payload?.rootPath;
    const targetPath = payload?.targetPath;
    const content = payload?.content || '';
    return writeTextFile({ rootPath, targetPath, content });
  });

  ipcMain.handle('workbench:fileUrl', async (_event, payload) => {
    const rootPath = payload?.rootPath;
    const targetPath = payload?.targetPath;
    return resolveFileUrl({ rootPath, targetPath });
  });

  ipcMain.handle('workbench:diff', async (_event, payload) => {
    const rootPath = payload?.rootPath;
    const targetPath = payload?.targetPath;
    return getDiff({ rootPath, targetPath });
  });

  ipcMain.handle('workbench:blame', async (_event, payload) => {
    const rootPath = payload?.rootPath;
    const targetPath = payload?.targetPath;
    return getBlame({ rootPath, targetPath });
  });

  ipcMain.handle('workbench:browserSurface:sync', async (event, payload) => {
    const ownerWindow = BrowserWindow.fromWebContents(event.sender);
    return syncWorkbenchBrowserSurface({ ownerWindow, payload });
  });

  ipcMain.handle('workbench:browserSurface:dispose', async (event, payload) => {
    disposeWorkbenchBrowserSurface({
      ownerWindow: BrowserWindow.fromWebContents(event.sender),
      tabId: payload?.tabId,
    });
    return { ok: true };
  });

  ipcMain.handle('workbench:browserSurface:goBack', async (event, payload) => {
    return goBackWorkbenchBrowserSurface({
      ownerWindow: BrowserWindow.fromWebContents(event.sender),
      tabId: payload?.tabId,
    });
  });

  ipcMain.handle('workbench:browserSurface:goForward', async (event, payload) => {
    return goForwardWorkbenchBrowserSurface({
      ownerWindow: BrowserWindow.fromWebContents(event.sender),
      tabId: payload?.tabId,
    });
  });
}

export { setupWorkbenchHandlers };
