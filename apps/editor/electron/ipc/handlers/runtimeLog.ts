const { ipcMain } = require('electron');
const { logRuntime } = require('../../services/runtimeLog');

function setupRuntimeLogHandlers() {
  ipcMain.on('runtime-log:write', (_event, payload) => {
    if (!payload) {
      return;
    }
    const level = payload.level || 'info';
    const message = payload.message || 'runtime log';
    const meta = { ...payload.meta, source: payload.source || 'renderer' };
    logRuntime(level, message, meta);
  });
}

export { setupRuntimeLogHandlers };
