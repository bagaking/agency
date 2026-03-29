// @ts-nocheck
const crypto = require('crypto');
const fs = require('fs');
const net = require('net');
const os = require('os');
const path = require('path');

const DEFAULT_SOCKET_TIMEOUT_MS = 5_000;
const WINDOWS_PIPE_PREFIX = '\\\\.\\pipe\\';

function normalizeText(value) {
  return String(value || '').trim();
}

function sanitizePipeSegment(value) {
  return normalizeText(value).replace(/[^a-zA-Z0-9-_]+/g, '-');
}

function hashNamespace(value) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return 'default';
  }
  return crypto.createHash('sha1').update(normalized).digest('hex').slice(0, 12);
}

function isWindowsNamedPipe(socketPath) {
  return normalizeText(socketPath).startsWith(WINDOWS_PIPE_PREFIX);
}

function getDefaultControlBusSocketPath(options = {}) {
  const explicit = normalizeText(options?.socketPath || process.env.AGENCY_CONTROL_BUS_SOCKET_PATH);
  if (explicit) {
    return explicit;
  }
  const namespaceHash = hashNamespace(
    options?.namespacePath ||
      process.env.AGENCY_CONTROL_BUS_NAMESPACE ||
      path.resolve(__dirname, '..', '..')
  );
  if (process.platform === 'win32') {
    const suffix = sanitizePipeSegment(process.env.USERNAME || process.env.USER || 'user') || 'user';
    return `${WINDOWS_PIPE_PREFIX}agency-control-bus-${suffix}-${namespaceHash}`;
  }
  const uid =
    typeof process.getuid === 'function'
      ? String(process.getuid())
      : sanitizePipeSegment(process.env.USER || process.env.UID || 'user') || 'user';
  return path.join(os.tmpdir(), `agency-control-bus-${uid}-${namespaceHash}.sock`);
}

function buildSocketFailure(message, code = 'SOCKET_ERROR') {
  return {
    success: false,
    op: 'socket',
    warnings: [],
    failures: [
      {
        code,
        message: normalizeText(message || 'Control bus socket error.') || 'Control bus socket error.',
      },
    ],
    data: null,
  };
}

async function safeUnlinkSocket(socketPath) {
  if (!socketPath || isWindowsNamedPipe(socketPath)) {
    return;
  }
  try {
    await fs.promises.unlink(socketPath);
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
  }
}

function createControlBusSocketServer({
  dispatch,
  socketPath,
  logRuntime,
} = {}) {
  if (typeof dispatch !== 'function') {
    throw new Error('createControlBusSocketServer requires a dispatch function.');
  }

  const resolvedSocketPath = getDefaultControlBusSocketPath({ socketPath });
  const server = net.createServer({ allowHalfOpen: true });
  let listening = false;

  server.on('connection', (socket) => {
    let input = '';
    socket.setEncoding('utf-8');

    socket.on('data', (chunk) => {
      input += String(chunk || '');
    });

    socket.on('error', async (error) => {
      await logRuntime?.('warn', 'control bus socket connection failed', {
        socketPath: resolvedSocketPath,
        error: error?.message || String(error),
      });
    });

    socket.on('end', async () => {
      let request = {};
      try {
        request = input ? JSON.parse(input) : {};
      } catch (error) {
        socket.end(`${JSON.stringify(buildSocketFailure(error?.message || String(error), 'BAD_REQUEST'))}\n`);
        return;
      }

      let result = null;
      try {
        result = await dispatch(request, {
          transportTrust: 'trusted_host_socket',
          accessScope: 'process',
          socketPath: resolvedSocketPath,
        });
      } catch (error) {
        result = buildSocketFailure(error?.message || String(error));
      }
      socket.end(`${JSON.stringify(result, null, 2)}\n`);
    });
  });

  async function start() {
    if (listening) {
      return {
        socketPath: resolvedSocketPath,
      };
    }
    await safeUnlinkSocket(resolvedSocketPath);
    if (!isWindowsNamedPipe(resolvedSocketPath)) {
      await fs.promises.mkdir(path.dirname(resolvedSocketPath), { recursive: true });
    }
    await new Promise((resolve, reject) => {
      const handleError = (error) => {
        server.off('listening', handleListening);
        reject(error);
      };
      const handleListening = () => {
        server.off('error', handleError);
        resolve(undefined);
      };
      server.once('error', handleError);
      server.once('listening', handleListening);
      server.listen(resolvedSocketPath);
    });
    listening = true;
    if (!isWindowsNamedPipe(resolvedSocketPath)) {
      try {
        await fs.promises.chmod(resolvedSocketPath, 0o600);
      } catch (_error) {
        // Best effort only.
      }
    }
    await logRuntime?.('info', 'control bus socket ready', {
      socketPath: resolvedSocketPath,
    });
    return {
      socketPath: resolvedSocketPath,
    };
  }

  async function close() {
    if (!listening) {
      await safeUnlinkSocket(resolvedSocketPath);
      return;
    }
    await new Promise((resolve) => {
      server.close(() => resolve(undefined));
    });
    listening = false;
    await safeUnlinkSocket(resolvedSocketPath);
  }

  return {
    socketPath: resolvedSocketPath,
    start,
    close,
    server,
  };
}

async function requestControlBusSocket({
  request,
  socketPath,
  timeoutMs = DEFAULT_SOCKET_TIMEOUT_MS,
} = {}) {
  const resolvedSocketPath = getDefaultControlBusSocketPath({ socketPath });
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(resolvedSocketPath);
    let responseText = '';
    let settled = false;

    const finalize = (fn, value) => {
      if (settled) {
        return;
      }
      settled = true;
      socket.destroy();
      fn(value);
    };

    socket.setEncoding('utf-8');
    socket.setTimeout(timeoutMs, () => {
      finalize(
        reject,
        new Error(`Timed out waiting for control bus socket response at ${resolvedSocketPath}.`)
      );
    });
    socket.on('error', (error) => {
      finalize(
        reject,
        new Error(
          `Unable to connect to Agency control bus at ${resolvedSocketPath}: ${error?.message || String(error)}`
        )
      );
    });
    socket.on('data', (chunk) => {
      responseText += String(chunk || '');
    });
    socket.on('end', () => {
      try {
        const parsed = JSON.parse(responseText || '{}');
        finalize(resolve, parsed);
      } catch (error) {
        finalize(
          reject,
          new Error(`Received invalid control bus response: ${error?.message || String(error)}`)
        );
      }
    });
    socket.on('connect', () => {
      socket.write(JSON.stringify(request || {}));
      socket.end();
    });
  });
}

module.exports = {
  DEFAULT_SOCKET_TIMEOUT_MS,
  getDefaultControlBusSocketPath,
  createControlBusSocketServer,
  requestControlBusSocket,
};
