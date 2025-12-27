const { ipcMain } = require('electron');
const { readUiState, updateUiState } = require('../../services/uiState');

function setupUiStateHandlers() {
  ipcMain.handle('ui-state:get', async () => readUiState());
  ipcMain.handle('ui-state:set', async (_event, payload) => {
    if (!payload || typeof payload !== 'object') {
      throw new Error('ui state payload must be an object.');
    }
    return updateUiState(payload);
  });
}

module.exports = {
  setupUiStateHandlers,
};
