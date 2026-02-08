const { ipcMain } = require('electron');
const {
  statEntry,
  readTextFile,
  writeTextFile,
  resolveFileUrl,
  getDiff,
  getBlame,
  getFileSnippet,
} = require('../../services/workbench');

function setupWorkbenchHandlers() {
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
}

export { setupWorkbenchHandlers };
