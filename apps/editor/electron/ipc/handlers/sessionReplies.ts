const { ipcMain } = require('electron');
const {
  listSessionReplies,
  createSessionReply,
  updateSessionReply,
} = require('../../services/sessionReplies');

function setupSessionRepliesHandlers() {
  ipcMain.handle('session-replies:list', async (_event, payload) => {
    return listSessionReplies(payload || {});
  });
  ipcMain.handle('session-replies:create', async (_event, payload) => {
    return createSessionReply(payload || {});
  });
  ipcMain.handle('session-replies:update', async (_event, payload) => {
    return updateSessionReply(payload || {});
  });
}

export { setupSessionRepliesHandlers };
