const { ipcMain } = require('electron');

const {
  getMainAgentHarnessSettings,
  setMainAgentHarnessSettings,
} = require('../../services/mainAgentHarnessSettings');

function setupMainAgentHarnessSettingsHandlers() {
  ipcMain.handle('main-agent-harness-settings:get', async () =>
    getMainAgentHarnessSettings()
  );
  ipcMain.handle('main-agent-harness-settings:set', async (_event, payload) =>
    setMainAgentHarnessSettings({
      settings: payload?.settings,
    })
  );
}

export { setupMainAgentHarnessSettingsHandlers };
