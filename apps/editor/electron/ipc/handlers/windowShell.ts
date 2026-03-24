import type { BrowserWindow } from 'electron';

const { BrowserWindow: ElectronBrowserWindow, ipcMain } = require('electron');

const {
  broadcastWindowShellUpdated,
  describeEditorWindows,
} = require('../../services/windowShell');

type CreateEditorWindow = (options?: {
  startEmpty?: boolean;
  projectRoot?: string;
  windowStateId?: string;
  allowStoredProjectRoot?: boolean;
}) => Promise<BrowserWindow | undefined>;

function resolveTargetWindow(payload: any): BrowserWindow | null {
  const targetWindowId = Number(payload?.windowId || 0);
  const targetWindowStateId = String(payload?.windowStateId || '').trim();
  const windows = ElectronBrowserWindow.getAllWindows().filter((window: BrowserWindow) => !window.isDestroyed?.());
  if (targetWindowId > 0) {
    const matched = windows.find((window: BrowserWindow) => window.id === targetWindowId);
    if (matched) {
      return matched;
    }
  }
  if (targetWindowStateId) {
    const matched = windows.find(
      (window: BrowserWindow) => String((window as any).__agencyWindowStateId || '').trim() === targetWindowStateId
    );
    if (matched) {
      return matched;
    }
  }
  return null;
}

function setupWindowShellHandlers({ createEditorWindow }: { createEditorWindow: CreateEditorWindow }) {
  ipcMain.handle('window-shell:list', async () => {
    return { windows: describeEditorWindows() };
  });

  ipcMain.handle('window-shell:new', async (_event: unknown, payload: any) => {
    const projectRoot = String(payload?.projectRoot || '').trim();
    const createdWindow = await createEditorWindow({
      startEmpty: !projectRoot,
      projectRoot,
    });
    broadcastWindowShellUpdated();
    return {
      ok: Boolean(createdWindow),
      windows: describeEditorWindows(),
      windowStateId: String((createdWindow as any)?.__agencyWindowStateId || '').trim(),
    };
  });

  ipcMain.handle('window-shell:focus', async (_event: unknown, payload: any) => {
    const targetWindow = resolveTargetWindow(payload);
    if (!targetWindow) {
      throw new Error('Target window was not found.');
    }
    if (targetWindow.isMinimized()) {
      targetWindow.restore();
    }
    targetWindow.show();
    targetWindow.focus();
    broadcastWindowShellUpdated();
    return {
      ok: true,
      windows: describeEditorWindows(),
      windowStateId: String((targetWindow as any).__agencyWindowStateId || '').trim(),
    };
  });
}

export { setupWindowShellHandlers };
