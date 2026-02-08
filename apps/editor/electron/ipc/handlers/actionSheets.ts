const { ipcMain } = require('electron');
const actionSheets = require('../../services/actionSheets');

function setupActionSheetsHandlers() {
  ipcMain.handle('actionSheets:list', async (_event, payload) =>
    actionSheets.listActionSheets(payload || {})
  );
  ipcMain.handle('actionSheets:read', async (_event, payload) =>
    actionSheets.readActionSheet(payload || {})
  );
  ipcMain.handle('actionSheets:create', async (_event, payload) =>
    actionSheets.createActionSheet(payload || {})
  );
  ipcMain.handle('actionSheets:updateStatus', async (_event, payload) =>
    actionSheets.updateActionSheetStatus(payload || {})
  );
  ipcMain.handle('actionSheets:archive', async (_event, payload) =>
    actionSheets.archiveActionSheet(payload || {})
  );
  ipcMain.handle('actionSheets:delete', async (_event, payload) =>
    actionSheets.deleteActionSheet(payload || {})
  );
  ipcMain.handle('actionSheets:updatePlan', async (_event, payload) =>
    actionSheets.updateActionSheetPlan(payload || {})
  );
  ipcMain.handle('actionSheets:updatePrompt', async (_event, payload) =>
    actionSheets.updateActionSheetPrompt(payload || {})
  );
  ipcMain.handle('actionSheets:updateChecks', async (_event, payload) =>
    actionSheets.updateActionSheetChecks(payload || {})
  );
  ipcMain.handle('actionSheets:runChecks', async (_event, payload) =>
    actionSheets.runActionSheetChecks(payload || {})
  );
}

export { setupActionSheetsHandlers };
