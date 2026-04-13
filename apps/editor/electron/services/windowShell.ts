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
  isMaximized: boolean;
  isFullScreen: boolean;
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
  isMaximized: boolean;
  isFullScreen: boolean;
  attentionSummary: any;
};

type RectangleLike = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type DisplayLike = {
  id: string | number;
  workArea?: RectangleLike;
};

export type WindowDisplayAnchor = {
  displayId: string;
  relativeBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

type RelativeBounds = WindowDisplayAnchor['relativeBounds'];

const DEFAULT_WINDOW_WIDTH = 1280;
const DEFAULT_WINDOW_HEIGHT = 820;
const MIN_WINDOW_WIDTH = 1024;
const MIN_WINDOW_HEIGHT = 700;

function normalizeNumber(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function normalizeRectangle(raw: unknown): RectangleLike | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const value = raw as Partial<RectangleLike>;
  const width = Math.round(normalizeNumber(value.width));
  const height = Math.round(normalizeNumber(value.height));
  if (width <= 0 || height <= 0) {
    return null;
  }
  return {
    x: Math.round(normalizeNumber(value.x)),
    y: Math.round(normalizeNumber(value.y)),
    width,
    height,
  };
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

function resolveDisplayWorkArea(display: DisplayLike | null | undefined): RectangleLike | null {
  if (!display) {
    return null;
  }
  return normalizeRectangle(display.workArea);
}

export function buildWindowDisplayAnchor(
  bounds: unknown,
  display: DisplayLike | null | undefined
): WindowDisplayAnchor | null {
  const normalizedBounds = normalizeRectangle(bounds);
  const workArea = resolveDisplayWorkArea(display);
  const displayId = String(display?.id || '').trim();
  if (!normalizedBounds || !workArea || !displayId) {
    return null;
  }
  if (workArea.width <= 0 || workArea.height <= 0) {
    return null;
  }

  const relativeBounds = {
    x: (normalizedBounds.x - workArea.x) / workArea.width,
    y: (normalizedBounds.y - workArea.y) / workArea.height,
    width: normalizedBounds.width / workArea.width,
    height: normalizedBounds.height / workArea.height,
  };

  return {
    displayId,
    relativeBounds,
  };
}

export function resolveWindowBoundsFromDisplayAnchor({
  bounds,
  anchor,
  displays,
  minWidth = MIN_WINDOW_WIDTH,
  minHeight = MIN_WINDOW_HEIGHT,
  defaultWidth = DEFAULT_WINDOW_WIDTH,
  defaultHeight = DEFAULT_WINDOW_HEIGHT,
}: {
  bounds: unknown;
  anchor: unknown;
  displays: DisplayLike[];
  minWidth?: number;
  minHeight?: number;
  defaultWidth?: number;
  defaultHeight?: number;
}): RectangleLike | null {
  if (!anchor || typeof anchor !== 'object' || !Array.isArray(displays) || displays.length === 0) {
    return null;
  }
  const normalizedBounds = normalizeRectangle(bounds);
  const parsed = anchor as Partial<WindowDisplayAnchor>;
  const displayId = String(parsed.displayId || '').trim();
  const relativeBounds = (parsed.relativeBounds || {}) as Partial<RelativeBounds>;
  const targetDisplay = displays.find((entry) => String(entry?.id || '').trim() === displayId);
  const workArea = resolveDisplayWorkArea(targetDisplay);
  if (!displayId || !workArea) {
    return null;
  }

  const widthRatio = normalizeNumber(relativeBounds.width);
  const heightRatio = normalizeNumber(relativeBounds.height);
  const xRatio = normalizeNumber(relativeBounds.x);
  const yRatio = normalizeNumber(relativeBounds.y);

  const desiredWidth = Number.isFinite(widthRatio) && widthRatio > 0
    ? Math.round(workArea.width * widthRatio)
    : normalizedBounds?.width || defaultWidth;
  const desiredHeight = Number.isFinite(heightRatio) && heightRatio > 0
    ? Math.round(workArea.height * heightRatio)
    : normalizedBounds?.height || defaultHeight;

  const nextWidth = clamp(
    Math.max(minWidth, desiredWidth),
    Math.min(minWidth, workArea.width),
    workArea.width
  );
  const nextHeight = clamp(
    Math.max(minHeight, desiredHeight),
    Math.min(minHeight, workArea.height),
    workArea.height
  );

  const maxX = workArea.x + Math.max(0, workArea.width - nextWidth);
  const maxY = workArea.y + Math.max(0, workArea.height - nextHeight);
  const centeredX = workArea.x + Math.max(0, Math.round((workArea.width - nextWidth) / 2));
  const centeredY = workArea.y + Math.max(0, Math.round((workArea.height - nextHeight) / 2));
  const desiredX = Number.isFinite(xRatio)
    ? Math.round(workArea.x + xRatio * workArea.width)
    : centeredX;
  const desiredY = Number.isFinite(yRatio)
    ? Math.round(workArea.y + yRatio * workArea.height)
    : centeredY;

  return {
    x: clamp(desiredX, workArea.x, maxX),
    y: clamp(desiredY, workArea.y, maxY),
    width: nextWidth,
    height: nextHeight,
  };
}

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
        isMaximized: window.isMaximized?.() || false,
        isFullScreen: window.isFullScreen?.() || false,
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

export function toggleEditorWindowZoom(window: BrowserWindow): void {
  if (!window || window.isDestroyed?.()) {
    return;
  }
  if (window.isFullScreen?.()) {
    window.setFullScreen(false);
    return;
  }
  if (window.isMaximized?.()) {
    window.unmaximize?.();
    return;
  }
  window.maximize?.();
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
