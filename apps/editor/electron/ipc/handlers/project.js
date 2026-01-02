const { BrowserWindow, ipcMain } = require('electron');
const {
  getProjectContext,
  selectProjectRoot,
  setProjectRoot,
  clearProjectRoot,
} = require('../../services/projectRoot');

function setupProjectHandlers() {
  const broadcastProjectUpdate = (payload) => {
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('project:updated', payload);
    });
  };

  ipcMain.handle('project:get', async () => getProjectContext());

  ipcMain.handle('project:select', async (event) => {
    const ownerWindow = BrowserWindow.fromWebContents(event.sender);
    const result = await selectProjectRoot({ ownerWindow });
    if (result?.projectRoot) {
      broadcastProjectUpdate(result);
    }
    return result;
  });

  ipcMain.handle('project:set', async (_event, payload) => {
    const projectRoot = payload?.projectRoot || '';
    const result = await setProjectRoot(projectRoot);
    if (result?.projectRoot) {
      broadcastProjectUpdate(result);
    }
    return result;
  });

  ipcMain.handle('project:clear', async () => {
    const result = await clearProjectRoot();
    broadcastProjectUpdate(result);
    return result;
  });
}

module.exports = {
  setupProjectHandlers,
};
