import { app, BrowserWindow, Menu } from 'electron';
import path from 'node:path';

const { getWindowProjectRoot } = require('./projectRoot');

export type WindowShellSummary = {
  windowId: number;
  windowStateId: string;
  projectRoot: string;
  projectName: string;
  title: string;
  isFocused: boolean;
  isMinimized: boolean;
};

export function getProjectDisplayName(projectRoot: string): string {
  const normalized = String(projectRoot || '').trim();
  if (!normalized) {
    return 'No Project';
  }
  return path.basename(normalized) || normalized;
}

export function getWindowDisplayTitle(projectRoot: string): string {
  const normalized = String(projectRoot || '').trim();
  if (!normalized) {
    return 'Agency';
  }
  return `${getProjectDisplayName(normalized)} - Agency`;
}

export function describeEditorWindows(): WindowShellSummary[] {
  return BrowserWindow.getAllWindows()
    .filter((window) => !window.isDestroyed?.())
    .map((window) => {
      const windowStateId = String((window as any).__agencyWindowStateId || '').trim();
      const projectRoot = String(getWindowProjectRoot(window.id) || '').trim();
      return {
        windowId: window.id,
        windowStateId,
        projectRoot,
        projectName: getProjectDisplayName(projectRoot),
        title: getWindowDisplayTitle(projectRoot),
        isFocused: window.isFocused(),
        isMinimized: window.isMinimized(),
      };
    })
    .filter((window) => Boolean(window.windowStateId))
    .sort((left, right) => {
      if (left.isFocused !== right.isFocused) {
        return left.isFocused ? -1 : 1;
      }
      return left.windowId - right.windowId;
    });
}

export function syncWindowTitle(window: BrowserWindow): void {
  if (!window || window.isDestroyed?.()) {
    return;
  }
  const projectRoot = String(getWindowProjectRoot(window.id) || '').trim();
  window.setTitle(getWindowDisplayTitle(projectRoot));
}

export function broadcastWindowShellUpdated(): void {
  const windows = describeEditorWindows();
  if (process.platform === 'darwin' && app.dock?.setMenu) {
    const dockItems = windows.map((window) => ({
      label: window.projectRoot ? window.projectName : 'Empty Window',
      click: () => {
        const targetWindow = BrowserWindow.fromId(window.windowId);
        if (!targetWindow || targetWindow.isDestroyed?.()) {
          return;
        }
        if (targetWindow.isMinimized()) {
          targetWindow.restore();
        }
        targetWindow.show();
        targetWindow.focus();
      },
    }));
    app.dock.setMenu(Menu.buildFromTemplate(dockItems));
  }

  const payload = { windows };
  BrowserWindow.getAllWindows().forEach((window) => {
    if (window.isDestroyed?.()) {
      return;
    }
    window.webContents.send('window-shell:updated', payload);
  });
}
