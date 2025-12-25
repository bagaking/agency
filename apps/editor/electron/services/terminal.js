const path = require('path');
const pty = require('node-pty');

const sessions = new Map();

function splitCommand(command) {
  if (!command) {
    return [];
  }
  return command.split(' ').filter(Boolean);
}

function resolveCliCommand() {
  if (process.env.AGENCY_TEST_MODE === '1' || process.env.AGENCY_CLI_STUB === '1') {
    return {
      file: process.execPath,
      args: [path.join(__dirname, '../../scripts/cli_stub.js')],
    };
  }
  const command = process.env.AGENCY_CLI_COMMAND || 'codex';
  const [file, ...args] = splitCommand(command);
  return { file, args };
}

function resolveShellCommand() {
  const shell = process.env.SHELL || 'bash';
  return { file: shell, args: [] };
}

function startSession({ cellId, cwd, mode }) {
  if (sessions.has(cellId)) {
    return sessions.get(cellId);
  }
  const { file, args } = mode === 'cli' ? resolveCliCommand() : resolveShellCommand();
  const ptyProcess = pty.spawn(file, args, {
    name: 'xterm-color',
    cols: 120,
    rows: 30,
    cwd,
    env: {
      ...process.env,
      TERM: 'xterm-256color',
    },
  });
  const session = { cellId, ptyProcess, mode };
  sessions.set(cellId, session);
  ptyProcess.onExit(() => {
    sessions.delete(cellId);
  });
  return session;
}

function writeSession(cellId, data) {
  const session = sessions.get(cellId);
  if (!session) {
    return;
  }
  session.ptyProcess.write(data);
}

function resizeSession(cellId, cols, rows) {
  const session = sessions.get(cellId);
  if (!session) {
    return;
  }
  session.ptyProcess.resize(cols, rows);
}

function disposeSession(cellId) {
  const session = sessions.get(cellId);
  if (!session) {
    return;
  }
  session.ptyProcess.kill();
  sessions.delete(cellId);
}

module.exports = {
  startSession,
  writeSession,
  resizeSession,
  disposeSession,
};
