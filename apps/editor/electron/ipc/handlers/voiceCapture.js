const { ipcMain } = require('electron');
const {
  getVoiceCaptureSupport,
  startVoiceCapture,
  stopVoiceCapture,
} = require('../../services/voiceCapture');
const { saveVoiceAsset, discardVoiceAsset } = require('../../services/voiceAssets');

function setupVoiceCaptureHandlers() {
  ipcMain.handle('voice:capture:support', async () => getVoiceCaptureSupport());

  ipcMain.handle('voice:capture:start', async (event, payload) =>
    startVoiceCapture(payload || {}, event.sender)
  );

  ipcMain.handle('voice:capture:stop', async (_event, payload) =>
    stopVoiceCapture(payload || {})
  );

  ipcMain.handle('voice:capture:saveAudio', async (_event, payload) =>
    saveVoiceAsset(payload || {})
  );

  ipcMain.handle('voice:capture:discardAudio', async (_event, payload) =>
    discardVoiceAsset(payload || {})
  );
}

module.exports = {
  setupVoiceCaptureHandlers,
};
