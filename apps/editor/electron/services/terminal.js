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

function resolveCliCommand() {
  if (process.env.AGENCY_TEST_MODE === '1' || process.env.AGENCY_CLI_STUB === '1') {
    const nodeBinary = resolveNodeBinary();
    return {
      file: nodeBinary,
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
    const commandLabel = mode === 'cli' ? 'CLI' : 'shell';
    const suggestion =
      mode === 'cli'
        ? 'Set AGENCY_CLI_COMMAND or AGENCY_CLI_STUB=1.'
        : 'Set SHELL or AGENCY_DEFAULT_CWD.';
    throw buildSpawnError(`${commandLabel} command not found or not executable: ${file}.`, suggestion);
  }
  const resolvedCwd = resolveCwd(cwd);
  try {
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
        : 'Check SHELL or ensure the worktree path exists.'
    );
  }
}

function startSession({ cellId, cwd, mode }) {
  if (sessions.has(cellId)) {
    return sessions.get(cellId);
  }
  const { file, args } = mode === 'cli' ? resolveCliCommand() : resolveShellCommand();
  let ptyProcess;
  try {
    ptyProcess = trySpawn({ cellId, cwd, mode, file, args });
  } catch (error) {
    if (mode === 'cli') {
      const fallback = {
        file: resolveNodeBinary(),
        args: [path.join(__dirname, '../../scripts/cli_stub.js')],
      };
      try {
        ptyProcess = trySpawn({ cellId, cwd, mode, ...fallback });
      } catch (fallbackError) {
        ptyProcess = null;
      }
    }

    if (!ptyProcess && mode !== 'cli') {
      for (const fallbackShell of ['/bin/zsh', '/bin/bash']) {
        try {
          ptyProcess = trySpawn({ cellId, cwd, mode, file: fallbackShell, args: [] });
          break;
        } catch (fallbackError) {
          continue;
        }
      }
    }

    if (!ptyProcess) {
      const hint =
        mode === 'cli'
          ? 'Try AGENCY_CLI_STUB=1 or set AGENCY_CLI_COMMAND to a valid executable.'
          : 'Set SHELL to a valid shell or ensure PATH contains it.';
      throw buildSpawnError(`Terminal spawn failed: ${error.message}.`, hint);
    }
  }
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
