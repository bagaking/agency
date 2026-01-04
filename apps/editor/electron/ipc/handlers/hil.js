const { ipcMain } = require('electron');
const { listHilItems, createHilItem, updateHilItem, deleteHilItem, promoteHilItem } = require('../../services/hil');

function setupHilHandlers() {
  ipcMain.handle('hil:list', async (_event, payload) => {
    return listHilItems(payload || {});
  });
  ipcMain.handle('hil:create', async (_event, payload) => {
    return createHilItem(payload || {});
  });
  ipcMain.handle('hil:update', async (_event, payload) => {
    return updateHilItem(payload || {});
  });
  ipcMain.handle('hil:delete', async (_event, payload) => {
    return deleteHilItem(payload || {});
  });
  ipcMain.handle('hil:promote', async (_event, payload) => {
    return promoteHilItem(payload || {});
  });
}

module.exports = {
  setupHilHandlers,
};
