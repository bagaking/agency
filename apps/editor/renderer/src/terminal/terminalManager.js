import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';

const terminals = new Map();

const DEFAULT_FONT_SIZE = 13;
const TERMINAL_FONT_STACK =
  'Menlo, Monaco, "SF Mono", "Hiragino Sans GB", "PingFang SC", "Noto Sans CJK SC", "Courier New", monospace';

const buildKey = (cellId, sessionId) => `${cellId}:${sessionId}`;

const resolveFontSize = (fontSize) => {
  const parsed = Number(fontSize);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_FONT_SIZE;
};

const createEntry = ({ cellId, sessionId, fontSize }) => {
  const terminal = new Terminal({
    fontFamily: TERMINAL_FONT_STACK,
    fontSize: resolveFontSize(fontSize),
    cursorBlink: true,
    scrollback: 5000,
    scrollOnUserInput: true,
    theme: {
      background: '#0b0d12',
      foreground: '#f8fafc',
    },
  });
  const fitAddon = new FitAddon();
  terminal.loadAddon(fitAddon);
  return {
    key: buildKey(cellId, sessionId),
    cellId,
    sessionId,
    terminal,
    fitAddon,
    container: null,
    opened: false,
    inputDisposable: null,
    started: false,
    starting: null,
  };
};

export const ensureTerminalEntry = ({ cellId, sessionId, fontSize }) => {
  if (!cellId || !sessionId) {
    return null;
  }
  const key = buildKey(cellId, sessionId);
  let entry = terminals.get(key);
  if (!entry) {
    entry = createEntry({ cellId, sessionId, fontSize });
    terminals.set(key, entry);
  } else if (fontSize) {
    const nextFontSize = resolveFontSize(fontSize);
    if (entry.terminal.options.fontSize !== nextFontSize) {
      entry.terminal.options.fontSize = nextFontSize;
    }
  }
  return entry;
};

export const attachTerminal = ({ entry, container }) => {
  if (!entry || !container) {
    return false;
  }
  if (entry.terminal.element && entry.opened) {
    if (entry.terminal.element.parentElement !== container) {
      container.appendChild(entry.terminal.element);
    }
    entry.container = container;
    return true;
  }
  try {
    entry.terminal.open(container);
    entry.container = container;
    entry.opened = true;
    return true;
  } catch (error) {
    window.agency?.logRuntime?.({
      level: 'error',
      message: 'terminal attach failed',
      meta: {
        cellId: entry.cellId,
        sessionId: entry.sessionId,
        error: error?.message || String(error),
      },
    });
    return false;
  }
};

export const ensureInputListener = ({ entry, onInput }) => {
  if (!entry || entry.inputDisposable) {
    return;
  }
  entry.inputDisposable = entry.terminal.onData((data) => {
    onInput?.(data);
  });
};

export const ensureStarted = async ({ entry, payload }) => {
  if (!entry || entry.started) {
    return { started: Boolean(entry?.started), didStart: false };
  }
  if (entry.starting) {
    return entry.starting;
  }
  if (!window.agency?.startTerminal) {
    throw new Error('Terminal start is unavailable.');
  }
  entry.starting = window.agency
    .startTerminal(payload)
    .then(() => {
      entry.started = true;
      entry.starting = null;
      return { started: true, didStart: true };
    })
    .catch((error) => {
      entry.starting = null;
      throw error;
    });
  return entry.starting;
};

export const disposeTerminalEntry = ({ cellId, sessionId }) => {
  if (!cellId || !sessionId) {
    return;
  }
  const key = buildKey(cellId, sessionId);
  const entry = terminals.get(key);
  if (!entry) {
    return;
  }
  window.agency?.logRuntime?.({
    level: 'info',
    message: 'terminal disposed',
    meta: { cellId, sessionId },
  });
  if (entry.inputDisposable?.dispose) {
    entry.inputDisposable.dispose();
  }
  entry.terminal.dispose();
  terminals.delete(key);
};
