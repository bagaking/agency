const { BrowserWindow, ipcMain } = require('electron');
const {
  markLastActiveWindowState,
  readWindowUiState,
  updateWindowUiState,
} = require('../../services/uiState');
const { broadcastWindowShellUpdated } = require('../../services/windowShell');

function setupUiStateHandlers() {
  ipcMain.handle('ui-state:get', async (event) => {
    const ownerWindow = BrowserWindow.fromWebContents(event.sender);
    const windowStateId = ownerWindow?.__agencyWindowStateId || '';
    if (!windowStateId) {
      return {};
    }
    await markLastActiveWindowState(windowStateId);
    return readWindowUiState(windowStateId);
  });

  ipcMain.handle('ui-state:set', async (_event, payload) => {
    if (!payload || typeof payload !== 'object') {
      throw new Error('ui state payload must be an object.');
    }
    const ownerWindow = BrowserWindow.fromWebContents(_event.sender);
    const windowStateId = ownerWindow?.__agencyWindowStateId || '';
    if (!windowStateId) {
      return {};
    }
    await markLastActiveWindowState(windowStateId);
    const nextState = await updateWindowUiState(windowStateId, payload);
    if (Object.prototype.hasOwnProperty.call(payload, 'attentionSummary')) {
      broadcastWindowShellUpdated();
    }
    return nextState;
  });
}

export { setupUiStateHandlers };
