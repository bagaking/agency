const { ipcMain } = require('electron');
const { getTmuxStatus } = require('../../services/tmux');

function setupTmuxHandlers() {
  ipcMain.handle('tmux:status', async () => getTmuxStatus());
}

module.exports = {
  setupTmuxHandlers,
};
