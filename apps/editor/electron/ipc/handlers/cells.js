const { ipcMain } = require('electron');
const fs = require('fs');
const { listCells, createCell, updateCellState } = require('../../services/cells');

function buildTestCell() {
  return {
    id: 'test-cell',
    name: 'test-cell',
    branch: 'feature/test-cell',
    worktreePath: '/tmp/agency/test-cell',
    state: 'active',
    gatesStage: 'active',
    gates: [],
    validation: {
      temporary: true,
      warnings: ['Spec file not found (temporary validation).'],
    },
  };
}

function setupCellHandlers({ getMainWindow }) {
  const isTestMode = process.env.AGENCY_TEST_MODE === '1';
  const watchers = new Map();

  const watchLifecycleFile = (filePath) => {
    if (!filePath || watchers.has(filePath)) {
      return;
    }
    try {
      const watcher = fs.watch(filePath, { persistent: false }, () => {
        const win = getMainWindow();
        if (win) {
          win.webContents.send('cells:updated', { type: 'external-change', filePath });
        }
      });
      watchers.set(filePath, watcher);
    } catch (error) {
      // Ignore watch errors for now.
    }
  };

  ipcMain.handle('cells:list', async () => {
    if (isTestMode) {
      return [buildTestCell()];
    }
    const cells = await listCells();
    cells.forEach((cell) => watchLifecycleFile(cell.lifecycleFile));
    return cells;
  });

  ipcMain.handle('cells:create', async (_event, payload) => {
    if (isTestMode) {
      return buildTestCell();
    }
    const cell = await createCell(payload);
    watchLifecycleFile(cell.lifecycleFile);
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
    watchLifecycleFile(cell.lifecycleFile);
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
