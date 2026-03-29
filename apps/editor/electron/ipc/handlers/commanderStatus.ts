const { ipcMain } = require('electron');

const {
  getCommanderStatus,
} = require('../../services/commander');

function setupCommanderStatusHandlers() {
  ipcMain.handle('commander:status', async (_event, payload) =>
    getCommanderStatus(payload || {})
  );
}

export { setupCommanderStatusHandlers };
