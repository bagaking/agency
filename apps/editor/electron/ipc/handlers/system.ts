const { ipcMain, shell } = require('electron');
const { logRuntime } = require('../../services/runtimeLog');

const PERMISSION_URLS = {
  microphone: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone',
  speech: 'x-apple.systempreferences:com.apple.preference.security?Privacy_SpeechRecognition',
};

function setupSystemHandlers() {
  ipcMain.handle('system:openPermissions', async (_event, payload) => {
    if (process.platform !== 'darwin') {
      return { ok: false, error: 'unsupported-platform' };
    }
    const kind = payload?.kind || 'microphone';
    const url = PERMISSION_URLS[kind] || PERMISSION_URLS.microphone;
    try {
      await shell.openExternal(url);
      return { ok: true };
    } catch (error) {
      logRuntime('warn', 'open system permissions failed', {
        kind,
        error: error?.message || String(error),
      });
      return { ok: false, error: error?.message || String(error) };
    }
  });
}

export { setupSystemHandlers };
