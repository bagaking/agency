const { BrowserWindow, ipcMain } = require('electron');
const {
  getProjectContext,
  selectProjectRoot,
  setProjectRoot,
  clearProjectRoot,
  setWindowProjectRoot,
  clearWindowProjectRoot,
} = require('../../services/projectRoot');

function setupProjectHandlers() {
  const broadcastRecentProjects = (recentProjects) => {
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('project:recents', { recentProjects });
    });
  };

  ipcMain.handle('project:get', async (event) => {
    const ownerWindow = BrowserWindow.fromWebContents(event.sender);
    const allowStoredRoot = ownerWindow?.__agencyAllowStoredProjectRoot !== false;
    return getProjectContext({ windowId: ownerWindow?.id, allowStoredRoot });
  });

  ipcMain.handle('project:select', async (event) => {
    const ownerWindow = BrowserWindow.fromWebContents(event.sender);
    const result = await selectProjectRoot({ ownerWindow });
    if (result?.projectRoot && ownerWindow) {
      setWindowProjectRoot(ownerWindow.id, result.projectRoot);
      ownerWindow.webContents.send('project:updated', result);
    }
    if (result?.recentProjects) {
      broadcastRecentProjects(result.recentProjects);
    }
    return result;
  });

  ipcMain.handle('project:set', async (_event, payload) => {
    const ownerWindow = BrowserWindow.fromWebContents(_event.sender);
    const projectRoot = payload?.projectRoot || '';
    const result = await setProjectRoot(projectRoot);
    if (result?.projectRoot && ownerWindow) {
      setWindowProjectRoot(ownerWindow.id, result.projectRoot);
      ownerWindow.webContents.send('project:updated', result);
    }
    if (result?.recentProjects) {
      broadcastRecentProjects(result.recentProjects);
    }
    return result;
  });

  ipcMain.handle('project:clear', async (event) => {
    const ownerWindow = BrowserWindow.fromWebContents(event.sender);
    const result = await clearProjectRoot();
    if (ownerWindow) {
      clearWindowProjectRoot(ownerWindow.id);
      ownerWindow.webContents.send('project:updated', result);
    }
    if (result?.recentProjects) {
      broadcastRecentProjects(result.recentProjects);
    }
    return result;
  });
}

export { setupProjectHandlers };
