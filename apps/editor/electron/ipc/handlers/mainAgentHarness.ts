const { BrowserWindow, ipcMain } = require('electron');
const {
  getCommanderCallerId,
} = require('../../../shared/commanderCore');

const {
  cancelMainAgentHarnessRun,
  inspectMainAgentHarnessRun,
  listMainAgentHarnessRuns,
  onMainAgentHarnessProgress,
  resumeMainAgentHarnessRun,
  startMainAgentHarnessRun,
} = require('../../services/mainAgentHarness');

let progressRelayAttached = false;

function buildHarnessFailure(action, code, message, data = null) {
  return {
    success: false,
    action,
    warnings: [],
    failures: [
      {
        code: String(code || 'FATAL'),
        message: String(message || 'Harness action failed.'),
      },
    ],
    data,
  };
}

function buildOwnerContext(event) {
  const ownerWindow = BrowserWindow.fromWebContents(event.sender);
  const ownerWindowStateId = (ownerWindow as any)?.__agencyWindowStateId || '';
  return {
    ownerWindowStateId,
    accessScope: ownerWindowStateId ? 'window' : 'process',
    transportTrust: 'renderer_ipc',
  };
}

function relayHarnessProgress(event) {
  const ownerAccessScope = String(event?.owner?.accessScope || 'process').trim().toLowerCase();
  if (ownerAccessScope !== 'window') {
    return;
  }
  const ownerWindowStateId = String(event?.owner?.windowStateId || '').trim();
  BrowserWindow.getAllWindows().forEach((window) => {
    if (window.isDestroyed?.()) {
      return;
    }
    const windowStateId = (window as any).__agencyWindowStateId || '';
    if (ownerWindowStateId && windowStateId !== ownerWindowStateId) {
      return;
    }
    window.webContents.send('main-agent-harness:progress', event);
  });
}

function setupMainAgentHarnessHandlers() {
  ipcMain.handle('main-agent-harness:start', async (event, payload) => {
    const ownerContext = buildOwnerContext(event);
    const callerId = String(payload?.callerId || '').trim();
    const isCommanderCaller =
      callerId === getCommanderCallerId('smart_fork') ||
      callerId === getCommanderCallerId('smart_name');
    if (ownerContext.transportTrust === 'renderer_ipc' && isCommanderCaller) {
      return buildHarnessFailure(
        'start',
        'PERMISSION_DENIED',
        'Commander-owned actions must be started through the Commander action facade.'
      );
    }
    return startMainAgentHarnessRun(payload || {}, ownerContext);
  });
  ipcMain.handle('main-agent-harness:inspect', async (event, payload) => {
    return inspectMainAgentHarnessRun(payload || {}, buildOwnerContext(event));
  });
  ipcMain.handle('main-agent-harness:cancel', async (event, payload) => {
    return cancelMainAgentHarnessRun(payload || {}, buildOwnerContext(event));
  });
  ipcMain.handle('main-agent-harness:resume', async (event, payload) => {
    return resumeMainAgentHarnessRun(payload || {}, buildOwnerContext(event));
  });
  ipcMain.handle('main-agent-harness:list', async (event, payload) => {
    return listMainAgentHarnessRuns(payload || {}, buildOwnerContext(event));
  });

  if (!progressRelayAttached) {
    onMainAgentHarnessProgress(relayHarnessProgress);
    progressRelayAttached = true;
  }
}

export { setupMainAgentHarnessHandlers };
