const { ipcMain } = require('electron');
const { getGates, setGates, checkGates, STAGES } = require('../../services/gates');

function setupGatesHandlers() {
  ipcMain.handle('gates:get', async (_event, payload) => {
    const scope = payload?.scope || 'resolved';
    return getGates({
      scope,
      worktreePath: payload?.worktreePath,
      projectRoot: payload?.projectRoot,
      cellId: payload?.cellId,
    });
  });

  ipcMain.handle('gates:set', async (_event, payload) => {
    const scope = payload?.scope || 'global';
    const gates = payload?.gates;
    if (!gates || typeof gates !== 'object' || Array.isArray(gates)) {
      throw new Error('gates payload must be an object.');
    }
    return setGates({
      scope,
      worktreePath: payload?.worktreePath,
      projectRoot: payload?.projectRoot,
      cellId: payload?.cellId,
      gates,
    });
  });

  ipcMain.handle('gates:check', async (_event, payload) => {
    const worktreePath = payload?.worktreePath;
    const stage = payload?.stage || 'active';
    const cellName = payload?.cellName;
    if (!worktreePath) {
      throw new Error('worktreePath is required.');
    }
    if (!STAGES.includes(stage)) {
      throw new Error('Invalid gate stage.');
    }
    return checkGates({ worktreePath, stage, cellName });
  });
}

export { setupGatesHandlers };
