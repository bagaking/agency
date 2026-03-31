import { BrowserWindow, ipcMain } from 'electron';

const {
  disposeWindowHomeShell,
  resizeWindowHomeShell,
  startWindowHomeShell,
  writeWindowHomeShell,
} = require('../../services/windowHomeShell');

function getOwnerWindowStateId(event: Electron.IpcMainEvent | Electron.IpcMainInvokeEvent): string {
  const ownerWindow = BrowserWindow.fromWebContents(event.sender);
  return String((ownerWindow as any)?.__agencyWindowStateId || '').trim();
}

function getOwnerWindowId(event: Electron.IpcMainEvent | Electron.IpcMainInvokeEvent): number {
  const ownerWindow = BrowserWindow.fromWebContents(event.sender);
  return Number(ownerWindow?.id || 0);
}

export function setupWindowHomeShellHandlers(): void {
  ipcMain.handle('window-home-shell:start', async (event, payload: any) => {
    return startWindowHomeShell({
      windowStateId: getOwnerWindowStateId(event),
      windowId: getOwnerWindowId(event),
      cwd: payload?.cwd,
    });
  });

  ipcMain.on('window-home-shell:write', (event, payload: any) => {
    writeWindowHomeShell({
      windowStateId: getOwnerWindowStateId(event),
      data: String(payload?.data || ''),
    });
  });

  ipcMain.on('window-home-shell:resize', (event, payload: any) => {
    resizeWindowHomeShell({
      windowStateId: getOwnerWindowStateId(event),
      cols: Number(payload?.cols || 0),
      rows: Number(payload?.rows || 0),
    });
  });

  ipcMain.on('window-home-shell:dispose', (event) => {
    disposeWindowHomeShell(getOwnerWindowStateId(event));
  });
}
