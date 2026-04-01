const { ipcMain } = require('electron');
const {
  inspectClipboardPayload,
  materializeClipboard,
  materializeMarkdown,
  writeClipboardFileReferences,
} = require('../../services/clipboard');

function setupClipboardHandlers() {
  ipcMain.handle('clipboard:inspect', async () => {
    return inspectClipboardPayload();
  });
  ipcMain.handle('clipboard:materialize', async (_event, payload) => {
    return materializeClipboard(payload || {});
  });
  ipcMain.handle('clipboard:materializeMarkdown', async (_event, payload) => {
    return materializeMarkdown(payload || {});
  });
  ipcMain.handle('clipboard:writeFileReferences', async (_event, payload) => {
    return writeClipboardFileReferences(payload || {});
  });
}

export { setupClipboardHandlers };
