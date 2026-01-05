const { ipcMain } = require('electron');
const {
  getVoiceCaptureSupport,
  startVoiceCapture,
  stopVoiceCapture,
} = require('../../services/voiceCapture');

function setupVoiceCaptureHandlers() {
  ipcMain.handle('voice:capture:support', async () => getVoiceCaptureSupport());

  ipcMain.handle('voice:capture:start', async (event, payload) =>
    startVoiceCapture(payload || {}, event.sender)
  );

  ipcMain.handle('voice:capture:stop', async (_event, payload) =>
    stopVoiceCapture(payload || {})
  );
}

module.exports = {
  setupVoiceCaptureHandlers,
};
