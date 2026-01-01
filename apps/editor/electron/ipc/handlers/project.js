const { ipcMain } = require('electron');
const {
  getProjectContext,
  selectProjectRoot,
  setProjectRoot,
  clearProjectRoot,
} = require('../../services/projectRoot');

function setupProjectHandlers() {
  ipcMain.handle('project:get', async () => getProjectContext());

  ipcMain.handle('project:select', async () => selectProjectRoot());

  ipcMain.handle('project:set', async (_event, payload) => {
    const projectRoot = payload?.projectRoot || '';
    return setProjectRoot(projectRoot);
  });

  ipcMain.handle('project:clear', async () => clearProjectRoot());
}

module.exports = {
  setupProjectHandlers,
};
