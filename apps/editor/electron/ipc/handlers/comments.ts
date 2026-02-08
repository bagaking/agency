const { ipcMain } = require('electron');
const { submitComment, listComments } = require('../../services/comments');

function setupCommentsHandlers() {
  ipcMain.handle('comments:list', async (_event, payload) => {
    return listComments(payload || {});
  });
  ipcMain.handle('comments:submit', async (_event, payload) => {
    return submitComment(payload || {});
  });
}

export { setupCommentsHandlers };
