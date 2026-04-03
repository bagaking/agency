const { ipcMain } = require('electron');
const fs = require('fs');
const {
  listCells,
  listUnmanagedWorktrees,
  ignoreUnmanagedWorktree,
  clearIgnoredUnmanagedWorktrees,
  createCell,
  updateCellState,
  updateCellMeta,
  clearCellAttachment,
  deleteCell,
} = require('../../services/cells');

function buildTestCell() {
  return {
    id: 'test-cell',
    name: 'test-cell',
    branch: 'feature/test-cell',
    worktreePath: '/tmp/agency/test-cell',
    attachmentState: 'attached',
    lastKnownWorktreePath: '/tmp/agency/test-cell',
    state: '',
    gates: [],
    validation: {
      temporary: true,
      warnings: [],
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

  ipcMain.handle('cells:list', async (_event, payload) => {
    if (isTestMode) {
      if (process.env.AGENCY_TEST_EMPTY_STATE === '1') {
        return [];
      }
      return [buildTestCell()];
    }
    const cells = await listCells(payload || {});
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

  ipcMain.handle('cells:listUnmanagedWorktrees', async (_event, payload) => {
    if (isTestMode) {
      return [];
    }
    return listUnmanagedWorktrees(payload || {});
  });

  ipcMain.handle('cells:ignoreUnmanagedWorktree', async (_event, payload) => {
    if (isTestMode) {
      return [];
    }
    return ignoreUnmanagedWorktree(payload || {});
  });

  ipcMain.handle('cells:clearIgnoredUnmanagedWorktrees', async (_event, payload) => {
    if (isTestMode) {
      return [];
    }
    return clearIgnoredUnmanagedWorktrees(payload || {});
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

  ipcMain.handle('cells:updateMeta', async (_event, payload) => {
    if (isTestMode) {
      return buildTestCell();
    }
    const cell = await updateCellMeta(payload || {});
    watchLifecycleFile(cell.lifecycleFile);
    const win = getMainWindow();
    if (win) {
      win.webContents.send('cells:updated', { type: 'updated', cell });
    }
    return cell;
  });

  ipcMain.handle('cells:clearAttachment', async (_event, payload) => {
    if (isTestMode) {
      return { ...buildTestCell(), attachmentState: 'detached', worktreePath: '' };
    }
    const cell = await clearCellAttachment(payload || {});
    watchLifecycleFile(cell.lifecycleFile);
    const win = getMainWindow();
    if (win) {
      win.webContents.send('cells:updated', { type: 'updated', cell });
    }
    return cell;
  });

  ipcMain.handle('cells:delete', async (_event, payload) => {
    if (isTestMode) {
      return { ok: true, id: 'test-cell' };
    }
    const result = await deleteCell(payload || {});
    const win = getMainWindow();
    if (win) {
      win.webContents.send('cells:updated', { type: 'deleted', id: result.id });
    }
    return result;
  });
}

export { setupCellHandlers };
