import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';

import { logRuntime } from '../services/agencyBridge';
import { DEFAULT_FONT_SIZE, TERMINAL_FONT_STACK, TERMINAL_THEME } from './sharedXtermConfig';

type WindowHomeShellEntry = {
  terminal: Terminal;
  fitAddon: FitAddon;
  opened: boolean;
  container: HTMLElement | null;
  inputDisposable: { dispose?: () => void } | null;
  inputHandler: ((data: string) => void) | null;
};

let entry: WindowHomeShellEntry | null = null;

function resolveFontSize(fontSize?: number): number {
  const parsed = Number(fontSize);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_FONT_SIZE;
}

function createEntry(fontSize?: number): WindowHomeShellEntry {
  const terminal = new Terminal({
    fontFamily: TERMINAL_FONT_STACK,
    fontSize: resolveFontSize(fontSize),
    cursorBlink: true,
    scrollback: 5000,
    scrollOnUserInput: true,
    theme: TERMINAL_THEME,
  });
  const fitAddon = new FitAddon();
  terminal.loadAddon(fitAddon);
  return {
    terminal,
    fitAddon,
    opened: false,
    container: null,
    inputDisposable: null,
    inputHandler: null,
  };
}

export function ensureWindowHomeShellEntry(fontSize?: number): WindowHomeShellEntry {
  if (!entry) {
    entry = createEntry(fontSize);
    return entry;
  }
  const nextFontSize = resolveFontSize(fontSize);
  if (entry.terminal.options.fontSize !== nextFontSize) {
    entry.terminal.options.fontSize = nextFontSize;
  }
  return entry;
}

export function attachWindowHomeShellTerminal({
  targetEntry,
  container,
}: {
  targetEntry: WindowHomeShellEntry | null;
  container: HTMLElement | null;
}): boolean {
  if (!targetEntry || !container) {
    return false;
  }
  if (targetEntry.terminal.element && targetEntry.opened) {
    if (targetEntry.terminal.element.parentElement !== container) {
      container.appendChild(targetEntry.terminal.element);
    }
    targetEntry.container = container;
    return true;
  }
  try {
    targetEntry.terminal.open(container);
    targetEntry.opened = true;
    targetEntry.container = container;
    return true;
  } catch (error: any) {
    logRuntime({
      level: 'error',
      message: 'window home shell attach failed',
      meta: {
        error: error?.message || String(error),
      },
    });
    return false;
  }
}

export function ensureWindowHomeShellInputListener({
  targetEntry,
  onInput,
}: {
  targetEntry: WindowHomeShellEntry | null;
  onInput: ((data: string) => void) | null;
}): void {
  if (!targetEntry) {
    return;
  }
  targetEntry.inputHandler = typeof onInput === 'function' ? onInput : null;
  if (targetEntry.inputDisposable) {
    return;
  }
  targetEntry.inputDisposable = targetEntry.terminal.onData((data) => {
    targetEntry.inputHandler?.(data);
  });
}

export function disposeWindowHomeShellEntry(): void {
  if (!entry) {
    return;
  }
  if (entry.inputDisposable?.dispose) {
    entry.inputDisposable.dispose();
  }
  entry.terminal.dispose();
  entry = null;
}
