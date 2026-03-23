const { BrowserWindow, ipcMain } = require('electron');

const {
  cancelMainAgentHarnessRun,
  inspectMainAgentHarnessRun,
  listMainAgentHarnessRuns,
  onMainAgentHarnessProgress,
  resumeMainAgentHarnessRun,
  startMainAgentHarnessRun,
} = require('../../services/mainAgentHarness');

let progressRelayAttached = false;

function relayHarnessProgress(event) {
  BrowserWindow.getAllWindows().forEach((window) => {
    if (window.isDestroyed?.()) {
      return;
    }
    window.webContents.send('main-agent-harness:progress', event);
  });
}

function setupMainAgentHarnessHandlers() {
  ipcMain.handle('main-agent-harness:start', async (_event, payload) => {
    return startMainAgentHarnessRun(payload || {});
  });
  ipcMain.handle('main-agent-harness:inspect', async (_event, payload) => {
    return inspectMainAgentHarnessRun(payload || {});
  });
  ipcMain.handle('main-agent-harness:cancel', async (_event, payload) => {
    return cancelMainAgentHarnessRun(payload || {});
  });
  ipcMain.handle('main-agent-harness:resume', async (_event, payload) => {
    return resumeMainAgentHarnessRun(payload || {});
  });
  ipcMain.handle('main-agent-harness:list', async (_event, payload) => {
    return listMainAgentHarnessRuns(payload || {});
  });

  if (!progressRelayAttached) {
    onMainAgentHarnessProgress(relayHarnessProgress);
    progressRelayAttached = true;
  }
}

export { setupMainAgentHarnessHandlers };
