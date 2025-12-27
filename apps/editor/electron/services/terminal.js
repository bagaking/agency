const fs = require('fs');
const path = require('path');
const pty = require('node-pty');

const sessions = new Map();

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
    return pty.spawn(executable, args, {
      name: 'xterm-color',
      cols: 120,
      rows: 30,
      cwd: resolvedCwd,
      env: {
        ...process.env,
        TERM: 'xterm-256color',
      },
    });
  } catch (error) {
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

function resizeSession(cellId, sessionId, cols, rows) {
  const session = sessions.get(buildSessionKey(cellId, sessionId));
  if (!session) {
    return;
  }
  session.ptyProcess.resize(cols, rows);
}

function disposeSession(cellId, sessionId) {
  const session = sessions.get(buildSessionKey(cellId, sessionId));
  if (!session) {
    return;
  }
  session.ptyProcess.kill();
  sessions.delete(buildSessionKey(cellId, sessionId));
}

module.exports = {
  startSession,
  writeSession,
  resizeSession,
  disposeSession,
  buildSessionKey,
};
