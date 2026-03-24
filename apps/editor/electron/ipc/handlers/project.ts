const { BrowserWindow, ipcMain } = require('electron');
const {
  getProjectContext,
  selectProjectRoot,
  setProjectRoot,
  clearProjectRoot,
  setWindowProjectRoot,
  clearWindowProjectRoot,
} = require('../../services/projectRoot');
const {
  broadcastWindowShellUpdated,
  syncWindowTitle,
} = require('../../services/windowShell');

function setupProjectHandlers() {
  const broadcastRecentProjects = (recentProjects) => {
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('project:recents', { recentProjects });
    });
  };

  ipcMain.handle('project:get', async (event) => {
    const ownerWindow = BrowserWindow.fromWebContents(event.sender);
    const allowStoredRoot = ownerWindow?.__agencyAllowStoredProjectRoot !== false;
    return getProjectContext({
      windowId: ownerWindow?.id,
      windowStateId: ownerWindow?.__agencyWindowStateId,
      allowStoredRoot,
    });
  });

  ipcMain.handle('project:select', async (event) => {
    const ownerWindow = BrowserWindow.fromWebContents(event.sender);
    const result = await selectProjectRoot({
      ownerWindow,
      windowStateId: ownerWindow?.__agencyWindowStateId,
    });
    if (result?.projectRoot && ownerWindow) {
      setWindowProjectRoot(ownerWindow.id, result.projectRoot);
      syncWindowTitle(ownerWindow);
      ownerWindow.webContents.send('project:updated', result);
    }
    if (result?.recentProjects) {
      broadcastRecentProjects(result.recentProjects);
    }
    broadcastWindowShellUpdated();
    return result;
  });

  ipcMain.handle('project:set', async (_event, payload) => {
    const ownerWindow = BrowserWindow.fromWebContents(_event.sender);
    const projectRoot = payload?.projectRoot || '';
    const result = await setProjectRoot(projectRoot, {
      windowId: ownerWindow?.id,
      windowStateId: ownerWindow?.__agencyWindowStateId,
    });
    if (ownerWindow) {
      if (result?.projectRoot) {
        setWindowProjectRoot(ownerWindow.id, result.projectRoot);
      } else {
        clearWindowProjectRoot(ownerWindow.id);
      }
      syncWindowTitle(ownerWindow);
      ownerWindow.webContents.send('project:updated', result);
    }
    if (result?.recentProjects) {
      broadcastRecentProjects(result.recentProjects);
    }
    broadcastWindowShellUpdated();
    return result;
  });

  ipcMain.handle('project:clear', async (event) => {
    const ownerWindow = BrowserWindow.fromWebContents(event.sender);
    const result = await clearProjectRoot({
      windowId: ownerWindow?.id,
      windowStateId: ownerWindow?.__agencyWindowStateId,
    });
    if (ownerWindow) {
      clearWindowProjectRoot(ownerWindow.id);
      syncWindowTitle(ownerWindow);
      ownerWindow.webContents.send('project:updated', result);
    }
    if (result?.recentProjects) {
      broadcastRecentProjects(result.recentProjects);
    }
    broadcastWindowShellUpdated();
    return result;
  });
}

export { setupProjectHandlers };
