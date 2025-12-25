const { ipcMain } = require('electron');
const { listCells, createCell, updateCellState } = require('../../services/cells');

function buildTestCell() {
  return {
    id: 'test-cell',
    name: 'test-cell',
    branch: 'feature/test-cell',
    worktreePath: '/tmp/agency/test-cell',
    state: 'active',
    validation: {
      temporary: true,
      warnings: ['Spec file not found (temporary validation).'],
    },
  };
}

function setupCellHandlers({ getMainWindow }) {
  const isTestMode = process.env.AGENCY_TEST_MODE === '1';

  ipcMain.handle('cells:list', async () => {
    if (isTestMode) {
      return [buildTestCell()];
    }
    return listCells();
  });

  ipcMain.handle('cells:create', async (_event, payload) => {
    if (isTestMode) {
      return buildTestCell();
    }
    const cell = await createCell(payload);
    const win = getMainWindow();
    if (win) {
      win.webContents.send('cells:updated', { type: 'created', cell });
    }
    return cell;
  });

  ipcMain.handle('cells:updateState', async (_event, payload) => {
    if (isTestMode) {
      return buildTestCell();
    }
    const cell = await updateCellState(payload);
    const win = getMainWindow();
    if (win) {
      win.webContents.send('cells:updated', { type: 'updated', cell });
    }
    return cell;
  });
}

module.exports = {
  setupCellHandlers,
};
