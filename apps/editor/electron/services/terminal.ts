// @ts-nocheck
const fs = require('fs');
const path = require('path');
const pty = require('node-pty');

const { logRuntime } = require('./runtimeLog');
const { sendKeys } = require('./tmux');

const sessions = new Map();
const sessionSizesByTmux = new Map();
const MIN_BACKEND_COLS = 2;
const MIN_BACKEND_ROWS = 2;
const DEFAULT_CONFIRM_SETTLE_MS = 48;
const MAX_CONFIRM_SETTLE_MS = 240;

function splitCommand(command) {
  if (!command) {
    return [];
  }
  return command.split(' ').filter(Boolean);
}

function resolveCliCommandString() {
  if (process.env.AGENCY_TEST_MODE === '1' || process.env.AGENCY_CLI_STUB === '1') {
    const nodeBinary = resolveNodeBinary();
    return `${nodeBinary} ${path.join(__dirname, '../../scripts/cli_stub.js')}`;
  }
  return process.env.AGENCY_CLI_COMMAND || 'codex';
}

function ensureSpawnHelperExecutable() {
  try {
    const resolved = require.resolve('node-pty');
    const root = path.dirname(path.dirname(resolved));
    const prebuilds = path.join(root, 'prebuilds');
    if (!fs.existsSync(prebuilds)) {
      return;
    }
    const entries = fs.readdirSync(prebuilds, { withFileTypes: true });
    entries.forEach((entry) => {
      if (!entry.isDirectory()) {
        return;
      }
      const helperPath = path.join(prebuilds, entry.name, 'spawn-helper');
      if (fs.existsSync(helperPath)) {
        fs.chmodSync(helperPath, 0o755);
      }
    });
  } catch (error) {
    // Ignore chmod failures; fall back to existing error handling.
  }
}

function resolveNodeBinary() {
  if (process.versions.electron) {
    return resolveExecutable(process.env.NODE_BINARY || 'node') || process.execPath;
  }
  return process.execPath;
}

function resolveExecutable(command) {
  if (!command) {
    return null;
  }
  if (command.includes('/') && fs.existsSync(command)) {
    try {
      fs.accessSync(command, fs.constants.X_OK);
      return command;
    } catch (error) {
      return null;
    }
  }
  const paths = (process.env.PATH || '').split(path.delimiter);
  for (const candidatePath of paths) {
    const candidate = path.join(candidatePath, command);
    if (fs.existsSync(candidate)) {
      try {
        fs.accessSync(candidate, fs.constants.X_OK);
        return candidate;
      } catch (error) {
        continue;
      }
    }
  }
  return null;
}

function resolveCwd(cwd) {
  if (cwd && fs.existsSync(cwd)) {
    return cwd;
  }
  return process.env.AGENCY_DEFAULT_CWD || process.cwd();
}

function isUtf8Locale(value) {
  if (!value) {
    return false;
  }
  const normalized = String(value).toUpperCase();
  return normalized.includes('UTF-8') || normalized.includes('UTF8');
}

function resolveLocaleEnv(env) {
  const explicit = env.AGENCY_TERMINAL_LOCALE;
  if (explicit) {
    return { ...env, LANG: explicit, LC_ALL: explicit, LC_CTYPE: explicit };
  }
  const current = env.LC_ALL || env.LC_CTYPE || env.LANG || '';
  if (!current || current === 'C' || current === 'POSIX' || !isUtf8Locale(current)) {
    const fallback = 'en_US.UTF-8';
    return { ...env, LANG: fallback, LC_ALL: fallback, LC_CTYPE: fallback };
  }
  return env;
}

function buildSpawnError(message, suggestion) {
  const suffix = suggestion ? ` ${suggestion}` : '';
  return new Error(`${message}${suffix}`);
}

function trySpawn({ cellId, cwd, mode, file, args }) {
  const executable = resolveExecutable(file);
  if (!executable) {
    const commandLabel = file === 'tmux' ? 'tmux' : mode === 'cli' ? 'CLI' : 'shell';
    const suggestion =
      mode === 'cli'
        ? 'Set AGENCY_CLI_COMMAND or AGENCY_CLI_STUB=1.'
        : 'Install tmux and ensure it is on PATH.';
    throw buildSpawnError(`${commandLabel} command not found or not executable: ${file}.`, suggestion);
  }
  const resolvedCwd = resolveCwd(cwd);
  try {
    ensureSpawnHelperExecutable();
    const env = resolveLocaleEnv({
      ...process.env,
      TERM: 'xterm-256color',
    });
    return pty.spawn(executable, args, {
      name: 'xterm-256color',
      cols: 120,
      rows: 30,
      cwd: resolvedCwd,
      env,
    });
  } catch (error) {
    logRuntime('error', 'terminal spawn failed', {
      cellId,
      mode,
      file,
      args,
      error: error.message,
    });
    throw buildSpawnError(
      `Terminal spawn failed for ${executable} (cwd: ${resolvedCwd}). ${error.message}.`,
      mode === 'cli'
        ? 'Check AGENCY_CLI_COMMAND or set AGENCY_CLI_STUB=1.'
        : 'Check tmux installation and session state.'
    );
  }
}

function buildSessionKey(cellId, sessionId) {
  return `${cellId}:${sessionId}`;
}

function startSession({ cellId, sessionId, tmuxSession, cwd, mode }) {
  const key = buildSessionKey(cellId, sessionId);
  if (sessions.has(key)) {
    return sessions.get(key);
  }
  if (!tmuxSession) {
    throw buildSpawnError('Terminal session is missing tmux target.', 'Create a session first.');
  }
  const file = 'tmux';
  const args = ['attach-session', '-t', tmuxSession];
  let ptyProcess;
  try {
    ptyProcess = trySpawn({ cellId, cwd, mode, file, args });
  } catch (error) {
    if (!ptyProcess) {
      logRuntime('error', 'terminal session start failed', {
        cellId,
        sessionId,
        tmuxSession,
        mode,
        error: error.message,
      });
      throw buildSpawnError(`Terminal spawn failed: ${error.message}.`, 'Install tmux and retry.');
    }
  }
  const session = { cellId, sessionId, tmuxSession, ptyProcess, mode };
  sessions.set(key, session);
  ptyProcess.onExit(() => {
    sessions.delete(key);
  });

  if (mode === 'cli') {
    const cliCommand = resolveCliCommandString();
    const [binary] = splitCommand(cliCommand);
    if (binary && !resolveExecutable(binary)) {
      ptyProcess.write(
        `echo \"CLI command not found: ${binary}. Set AGENCY_CLI_COMMAND or AGENCY_CLI_STUB=1.\"\\r`
      );
    }
    ptyProcess.write(`${cliCommand}\\r`);
  }
  return session;
}

function writeSession(cellId, sessionId, data) {
  const session = sessions.get(buildSessionKey(cellId, sessionId));
  if (!session) {
    return;
  }
  session.ptyProcess.write(data);
}

function normalizeDispatchText(value = '') {
  return String(value || '').replace(/\r\n/g, '\n');
}

function normalizeDispatchKeys(value) {
  const list = Array.isArray(value) ? value : [value];
  return list
    .map((key) => String(key || '').trim())
    .filter(Boolean);
}

function clampConfirmSettleMs(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_CONFIRM_SETTLE_MS;
  }
  return Math.max(0, Math.min(MAX_CONFIRM_SETTLE_MS, Math.floor(parsed)));
}

function resolveConfirmKeys(confirm = {}) {
  const mode = String(confirm?.mode || 'none').trim().toLowerCase();
  if (mode === 'enter') {
    return ['Enter'];
  }
  if (mode === 'double-enter') {
    return ['Enter', 'Enter'];
  }
  if (mode === 'keys') {
    return normalizeDispatchKeys(confirm?.keys);
  }
  return [];
}

function resolveLegacyConfirmMode({ appendEnter = true, doubleEnter = false } = {}) {
  const confirmCount = (appendEnter ? 1 : 0) + (doubleEnter ? 1 : 0);
  if (confirmCount >= 2) {
    return 'double-enter';
  }
  if (confirmCount === 1) {
    return 'enter';
  }
  return 'none';
}

function buildDispatchInputPlan(input = {}) {
  const text = normalizeDispatchText(input?.text || '');
  const confirm = input?.confirm && typeof input.confirm === 'object' ? input.confirm : {};
  const confirmKeys = resolveConfirmKeys(confirm);
  const settleMs =
    confirmKeys.length > 0
      ? clampConfirmSettleMs(confirm?.settleMs)
      : 0;
  return {
    text,
    confirm: {
      mode: String(confirm?.mode || 'none').trim().toLowerCase() || 'none',
      keys: confirmKeys,
      settleMs,
    },
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(ms) || 0)));
}

async function sendSessionKeys(cellId, sessionId, keys = []) {
  const session = sessions.get(buildSessionKey(cellId, sessionId));
  if (!session) {
    return;
  }
  const normalizedKeys = (Array.isArray(keys) ? keys : [keys])
    .map((key) => String(key || '').trim())
    .filter(Boolean);
  if (!normalizedKeys.length) {
    return;
  }
  if (!session.tmuxSession) {
    normalizedKeys.forEach((key) => {
      if (key === 'Enter') {
        session.ptyProcess.write('\r');
      }
    });
    return;
  }
  try {
    await sendKeys(session.tmuxSession, normalizedKeys);
  } catch (error) {
    logRuntime('warn', 'terminal send-keys failed', {
      cellId,
      sessionId,
      tmuxSession: session.tmuxSession,
      keys: normalizedKeys,
      error: error?.message || String(error),
    });
    normalizedKeys.forEach((key) => {
      if (key === 'Enter') {
        session.ptyProcess.write('\r');
      }
    });
  }
}

async function dispatchSessionInput(
  cellId,
  sessionId,
  input = {}
) {
  const plan = buildDispatchInputPlan(input);
  if (!plan.text && plan.confirm.keys.length === 0) {
    return;
  }
  if (plan.text) {
    writeSession(cellId, sessionId, plan.text);
  }
  if (plan.confirm.keys.length > 0) {
    if (plan.confirm.settleMs > 0 && plan.text) {
      await sleep(plan.confirm.settleMs);
    }
    await sendSessionKeys(cellId, sessionId, plan.confirm.keys);
  }
}

async function dispatchSessionCommand(
  cellId,
  sessionId,
  { command = '', appendEnter = true, doubleEnter = false } = {}
) {
  return dispatchSessionInput(cellId, sessionId, {
    text: command,
    confirm: {
      mode: resolveLegacyConfirmMode({ appendEnter, doubleEnter }),
    },
  });
}

function resizeSession(cellId, sessionId, cols, rows) {
  const session = sessions.get(buildSessionKey(cellId, sessionId));
  if (!session) {
    return;
  }
  const nextCols = Number(cols);
  const nextRows = Number(rows);
  if (!Number.isFinite(nextCols) || !Number.isFinite(nextRows)) {
    logRuntime('warn', 'terminal resize ignored (invalid size)', {
      cellId,
      sessionId,
      cols,
      rows,
    });
    return;
  }
  if (nextCols < MIN_BACKEND_COLS || nextRows < MIN_BACKEND_ROWS) {
    logRuntime('warn', 'terminal resize clamped (below minimum)', {
      cellId,
      sessionId,
      cols: nextCols,
      rows: nextRows,
    });
    return;
  }
  try {
    session.ptyProcess.resize(nextCols, nextRows);
    if (session.tmuxSession) {
      sessionSizesByTmux.set(session.tmuxSession, { cols: nextCols, rows: nextRows });
    }
  } catch (error) {
    logRuntime('error', 'terminal resize failed', {
      cellId,
      sessionId,
      cols: nextCols,
      rows: nextRows,
      error: error.message,
    });
  }
}

function disposeSession(cellId, sessionId) {
  const session = sessions.get(buildSessionKey(cellId, sessionId));
  if (!session) {
    return;
  }
  session.ptyProcess.kill();
  sessions.delete(buildSessionKey(cellId, sessionId));
}

function getSessionSize(tmuxSession) {
  if (!tmuxSession) {
    return null;
  }
  return sessionSizesByTmux.get(tmuxSession) || null;
}

export {
  startSession,
  writeSession,
  normalizeDispatchText,
  buildDispatchInputPlan,
  dispatchSessionInput,
  sendSessionKeys,
  dispatchSessionCommand,
  resizeSession,
  disposeSession,
  buildSessionKey,
  getSessionSize,
};
