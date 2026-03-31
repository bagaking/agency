import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { logRuntime, startTerminal } from '../services/agencyBridge';
import { DEFAULT_FONT_SIZE, TERMINAL_FONT_STACK, TERMINAL_THEME } from './sharedXtermConfig';

const terminals = new Map();

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
    macOptionClickForcesSelection: true,
    scrollback: 5000,
    scrollOnUserInput: true,
    theme: TERMINAL_THEME,
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
    inputHandler: null,
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

export const getTerminalSnapshot = ({ cellId, sessionId, lines = 120 }) => {
  if (!cellId || !sessionId) {
    return null;
  }
  const entry = terminals.get(buildKey(cellId, sessionId));
  const terminal = entry?.terminal;
  const buffer = terminal?.buffer?.active;
  if (!terminal || !buffer) {
    return null;
  }
  const maxLines = Number.isFinite(lines) ? Math.max(1, Math.floor(lines)) : 120;
  const start = Math.max(0, buffer.length - maxLines);
  const output = [];
  for (let i = start; i < buffer.length; i += 1) {
    const line = buffer.getLine(i);
    if (!line) {
      output.push('');
      continue;
    }
    const text = line.translateToString(true);
    if (line.isWrapped && output.length) {
      output[output.length - 1] += text;
    } else {
      output.push(text);
    }
  }
  return {
    cols: terminal.cols,
    rows: terminal.rows,
    data: output.join('\r\n'),
  };
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
    logRuntime({
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
  if (!entry) {
    return;
  }
  entry.inputHandler = typeof onInput === 'function' ? onInput : null;
  if (entry.inputDisposable) {
    return;
  }
  entry.inputDisposable = entry.terminal.onData((data) => {
    entry.inputHandler?.(data);
  });
};

const resetTerminalForReconnect = (entry) => {
  if (!entry?.terminal?.reset) {
    return;
  }
  // tmux replays the current screen on attach; clear stale xterm state first.
  entry.terminal.reset();
};

export const ensureStarted = async ({ entry, payload }) => {
  if (!entry || entry.started) {
    return { started: Boolean(entry?.started), didStart: false };
  }
  if (entry.starting) {
    return entry.starting;
  }
  resetTerminalForReconnect(entry);
  entry.starting = Promise.resolve(startTerminal(payload))
    .then((result) => {
      if (result == null) {
        throw new Error('Terminal start is unavailable.');
      }
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
  logRuntime({
    level: 'info',
    message: 'terminal disposed',
    meta: { cellId, sessionId },
  });
  if (entry.inputDisposable?.dispose) {
    entry.inputDisposable.dispose();
  }
  entry.inputHandler = null;
  entry.terminal.dispose();
  terminals.delete(key);
};
