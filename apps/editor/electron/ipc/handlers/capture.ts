const { ipcMain, BrowserWindow } = require('electron');
const captureManager = require('../../services/screenshotCapture/captureManager');

function setupCaptureHandlers() {
  ipcMain.handle('capture:start', async (event, payload) => {
    const ownerWindow = BrowserWindow.fromWebContents(event.sender);
    return captureManager.startCapture({
      windowId: ownerWindow?.id,
      includeAgencyWindows: Boolean(payload?.includeAgencyWindows),
    });
  });

  ipcMain.handle('capture:getSource', async (_event, payload) =>
    captureManager.getDisplaySourceForOverlay(payload)
  );

  ipcMain.handle('capture:complete', async (_event, payload) =>
    captureManager.completeCapture(payload)
  );

  ipcMain.handle('capture:cancel', async (_event, payload) =>
    captureManager.cancelCapture(payload)
  );

  ipcMain.handle('capture:setIncludeAgency', async (_event, payload) =>
    captureManager.setIncludeAgencyWindows(payload)
  );

  ipcMain.handle('capture:saveAsset', async (_event, payload) =>
    captureManager.saveCaptureAsset(payload)
  );

  ipcMain.handle('capture:copy', async (_event, payload) =>
    captureManager.copyCaptureToClipboard(payload)
  );
}

export { setupCaptureHandlers };
