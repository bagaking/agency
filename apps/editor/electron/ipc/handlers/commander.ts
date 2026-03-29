const { BrowserWindow, ipcMain } = require('electron');

const {
  performCommanderAction,
} = require('../../services/commander') as {
  performCommanderAction: (
    payload?: Record<string, any>,
    context?: Record<string, any>
  ) => Promise<Record<string, any>>;
};

function setupCommanderActionHandlers() {
  ipcMain.handle('commander:performAction', async (event, payload) => {
    const ownerWindow = BrowserWindow.fromWebContents(event.sender);
    const ownerWindowStateId = (ownerWindow as any)?.__agencyWindowStateId || '';
    return performCommanderAction(payload || {}, {
      ownerWindowStateId,
      accessScope: ownerWindowStateId ? 'window' : 'process',
      transportTrust: 'renderer_ipc',
      commanderTransport: true,
      transportLane: 'commander_action',
    });
  });
}

export { setupCommanderActionHandlers };
