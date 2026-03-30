import { BrowserWindow } from 'electron';
import path from 'node:path';
import { normalizeWindowAttentionSummary } from '../../shared/attention';

const { getWindowProjectRoot } = require('./projectRoot');
const { peekWindowUiState } = require('./uiState');

export type WindowShellSummary = {
  windowId: number;
  windowStateId: string;
  projectRoot: string;
  projectName: string;
  title: string;
  isFocused: boolean;
  isMinimized: boolean;
  attentionSummary: any;
};

export type EditorWindowRecord = {
  window: BrowserWindow;
  windowId: number;
  windowStateId: string;
  projectRoot: string;
  projectName: string;
  title: string;
  isFocused: boolean;
  isMinimized: boolean;
  attentionSummary: any;
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

export function collectEditorWindows(): EditorWindowRecord[] {
  return BrowserWindow.getAllWindows()
    .filter((window) => !window.isDestroyed?.())
    .map((window) => {
      const windowStateId = String((window as any).__agencyWindowStateId || '').trim();
      const projectRoot = String(getWindowProjectRoot(window.id) || '').trim();
      const windowUiState = peekWindowUiState(windowStateId);
      return {
        window,
        windowId: window.id,
        windowStateId,
        projectRoot,
        projectName: getProjectDisplayName(projectRoot),
        title: getWindowDisplayTitle(projectRoot),
        isFocused: window.isFocused(),
        isMinimized: window.isMinimized(),
        attentionSummary: normalizeWindowAttentionSummary(windowUiState?.attentionSummary),
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

export function describeEditorWindows(): WindowShellSummary[] {
  return collectEditorWindows().map(({ window: _window, ...summary }) => summary);
}

export function orderEditorWindowsByStateId(
  windows: EditorWindowRecord[],
  orderedStateIds: string[] = []
): EditorWindowRecord[] {
  const priority = new Map<string, number>();
  orderedStateIds.forEach((windowStateId, index) => {
    if (!priority.has(windowStateId)) {
      priority.set(windowStateId, index);
    }
  });
  return [...windows].sort((left, right) => {
    const leftPriority = priority.get(left.windowStateId);
    const rightPriority = priority.get(right.windowStateId);
    if (leftPriority !== undefined || rightPriority !== undefined) {
      if (leftPriority === undefined) {
        return 1;
      }
      if (rightPriority === undefined) {
        return -1;
      }
      return leftPriority - rightPriority;
    }
    return left.windowId - right.windowId;
  });
}

export function focusEditorWindow(window: BrowserWindow): void {
  if (!window || window.isDestroyed?.()) {
    return;
  }
  if (window.isMinimized()) {
    window.restore();
  }
  window.show();
  window.focus();
}

export function resolveActivatedEditorWindow<T extends { windowStateId: string }>(
  windows: T[],
  focusedWindowStateId: string,
  hasVisibleWindows: boolean
): T | null {
  if (!Array.isArray(windows) || windows.length === 0) {
    return null;
  }
  const normalizedFocusedWindowStateId = String(focusedWindowStateId || '').trim();
  const currentIndex = normalizedFocusedWindowStateId
    ? windows.findIndex((window) => String(window.windowStateId || '').trim() === normalizedFocusedWindowStateId)
    : -1;

  if (hasVisibleWindows && currentIndex >= 0 && windows.length > 1) {
    return windows[(currentIndex + 1) % windows.length];
  }
  if (currentIndex >= 0) {
    return windows[currentIndex];
  }
  return windows[0];
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
  const payload = { windows };
  BrowserWindow.getAllWindows().forEach((window) => {
    if (window.isDestroyed?.()) {
      return;
    }
    window.webContents.send('window-shell:updated', payload);
  });
}
