// @ts-nocheck
const crypto = require('crypto');
const fs = require('fs');
const net = require('net');
const path = require('path');
const pty = require('node-pty');

const { logRuntime } = require('./runtimeLog');
const { getSessionSize } = require('./terminal');
const { hasSession } = require('./tmux');

const PROXY_BIND_HOST = '0.0.0.0';
const TOKEN_BYTES = 24;
const MAX_HANDSHAKE_BYTES = 512;
const DEFAULT_COLS = 120;
const DEFAULT_ROWS = 30;

const tokenEntriesBySessionKey = new Map();
const sessionKeysByToken = new Map();

let proxyServer = null;
let proxyListenHost = '';
let proxyListenPort = null;
let serverReadyPromise = null;

function logProxy(level, message, meta = {}) {
  Promise.resolve(logRuntime(level, message, { scope: 'mobileSessionProxy', ...meta })).catch(
    () => undefined
  );
}

function normalizeSessionId(value) {
  return String(value || '').trim();
}

function normalizeTmuxTarget(value) {
  const target = String(value || '').trim();
  if (!target) {
    throw new Error('Session is missing tmux target.');
  }
  if (!/^[A-Za-z0-9._:-]+$/.test(target)) {
    throw new Error('Session tmux target contains unsupported characters.');
  }
  return target;
}

function normalizeWorktreePath(worktreePath) {
  if (!worktreePath) {
    return '';
  }
  return path.resolve(String(worktreePath));
}

function buildSessionKey({ worktreePath, sessionId }) {
  const resolvedWorktree = normalizeWorktreePath(worktreePath);
  const normalizedSessionId = normalizeSessionId(sessionId);
  if (!resolvedWorktree || !normalizedSessionId) {
    throw new Error('Session identity is incomplete for proxy token issuance.');
  }
  return `${resolvedWorktree}::${normalizedSessionId}`;
}

function generateProxyToken() {
  return crypto.randomBytes(TOKEN_BYTES).toString('base64url');
}

function reserveUniqueToken() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const token = generateProxyToken();
    if (!sessionKeysByToken.has(token)) {
      return token;
    }
  }
  throw new Error('Failed to allocate a unique mobile session token.');
}

function readServerAddress() {
  if (!proxyServer) {
    return null;
  }
  const address = proxyServer.address();
  if (!address || typeof address === 'string') {
    return null;
  }
  const host = String(address.address || '').trim() || PROXY_BIND_HOST;
  const port = Number(address.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return null;
  }
  return { host, port };
}

async function ensureProxyServerReady() {
  const existingAddress = readServerAddress();
  if (existingAddress) {
    proxyListenHost = existingAddress.host;
    proxyListenPort = existingAddress.port;
    return existingAddress;
  }
  if (serverReadyPromise) {
    return serverReadyPromise;
  }

  proxyServer = net.createServer((socket) => {
    void handleProxySocket(socket);
  });

  proxyServer.on('error', (error) => {
    logProxy('error', 'mobile proxy server error', { error: error?.message || String(error) });
  });

  proxyServer.on('close', () => {
    proxyListenHost = '';
    proxyListenPort = null;
    serverReadyPromise = null;
  });

  serverReadyPromise = new Promise((resolve, reject) => {
    const handleStartupError = (error) => {
      proxyServer?.off('listening', handleListening);
      logProxy('error', 'mobile proxy server failed to start', {
        error: error?.message || String(error),
      });
      proxyServer = null;
      proxyListenHost = '';
      proxyListenPort = null;
      serverReadyPromise = null;
      reject(error);
    };

    const handleListening = () => {
      proxyServer?.off('error', handleStartupError);
      const address = readServerAddress();
      if (!address) {
        handleStartupError(new Error('Mobile proxy server started without a valid address.'));
        return;
      }
      proxyListenHost = address.host;
      proxyListenPort = address.port;
      logProxy('info', 'mobile proxy server ready', address);
      resolve(address);
    };

    proxyServer.once('error', handleStartupError);
    proxyServer.once('listening', handleListening);
    proxyServer.listen({ host: PROXY_BIND_HOST, port: 0 });
  });

  return serverReadyPromise;
}

function revokeTokenEntry(entry) {
  if (!entry) {
    return false;
  }
  tokenEntriesBySessionKey.delete(entry.sessionKey);
  sessionKeysByToken.delete(entry.token);
  return true;
}

function getTokenEntryByToken(token) {
  const normalizedToken = String(token || '').trim();
  if (!normalizedToken) {
    return null;
  }
  const sessionKey = sessionKeysByToken.get(normalizedToken);
  if (!sessionKey) {
    return null;
  }
  const entry = tokenEntriesBySessionKey.get(sessionKey);
  if (!entry || entry.token !== normalizedToken) {
    sessionKeysByToken.delete(normalizedToken);
    return null;
  }
  return entry;
}

function sendSocketError(socket, message) {
  if (socket.destroyed) {
    return;
  }
  const text = String(message || 'ERR proxy attach failed').trim();
  try {
    socket.write(`${text}\r\n`);
  } catch (_error) {
    // best effort
  }
  socket.end();
}

function resolveProxyCwd(worktreePath) {
  const resolved = normalizeWorktreePath(worktreePath);
  if (resolved && fs.existsSync(resolved)) {
    return resolved;
  }
  return process.cwd();
}

function clampTerminalSize(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

function resolveProxySpawnSize(tmuxSession) {
  const sessionSize = getSessionSize(tmuxSession) || {};
  return {
    cols: clampTerminalSize(sessionSize.cols, DEFAULT_COLS, 40, 320),
    rows: clampTerminalSize(sessionSize.rows, DEFAULT_ROWS, 12, 120),
  };
}

function spawnProxyAttachPty(entry) {
  const { cols, rows } = resolveProxySpawnSize(entry.tmuxSession);
  const env = {
    ...process.env,
    TERM: 'xterm-256color',
  };
  return pty.spawn('tmux', ['attach-session', '-t', entry.tmuxSession], {
    name: 'xterm-256color',
    cols,
    rows,
    cwd: resolveProxyCwd(entry.worktreePath),
    env,
  });
}

function bridgeSocketToPty({ socket, ptyProcess, initialPayload }) {
  let finished = false;

  const safeKillPty = () => {
    try {
      ptyProcess.kill();
    } catch (_error) {
      // ignore
    }
  };

  const handleSocketData = (chunk) => {
    if (!chunk || chunk.length === 0) {
      return;
    }
    ptyProcess.write(chunk.toString('utf8'));
  };

  const handleSocketClose = () => {
    safeKillPty();
    cleanup();
  };

  const handleSocketError = () => {
    safeKillPty();
  };

  const ptyDataDisposable = ptyProcess.onData((data) => {
    if (!socket.destroyed) {
      socket.write(data);
    }
  });

  const ptyExitDisposable = ptyProcess.onExit(() => {
    if (!socket.destroyed) {
      socket.end();
    }
    cleanup();
  });

  const cleanup = () => {
    if (finished) {
      return;
    }
    finished = true;
    socket.off('data', handleSocketData);
    socket.off('close', handleSocketClose);
    socket.off('error', handleSocketError);
    ptyDataDisposable?.dispose?.();
    ptyExitDisposable?.dispose?.();
  };

  socket.on('data', handleSocketData);
  socket.on('close', handleSocketClose);
  socket.on('error', handleSocketError);

  if (initialPayload?.length) {
    handleSocketData(initialPayload);
  }
}

function parseHandshakeToken({ socket, chunkBuffer }) {
  if (chunkBuffer.length > MAX_HANDSHAKE_BYTES) {
    sendSocketError(socket, 'ERR token payload is too large');
    return { done: true, token: '', remaining: Buffer.alloc(0), invalid: true };
  }
  const newlineIndex = chunkBuffer.indexOf(0x0a);
  if (newlineIndex < 0) {
    return { done: false, token: '', remaining: Buffer.alloc(0), invalid: false };
  }

  const rawToken = chunkBuffer.subarray(0, newlineIndex).toString('utf8').trim();
  const remaining = chunkBuffer.subarray(newlineIndex + 1);
  if (!rawToken) {
    sendSocketError(socket, 'ERR missing session token');
    return { done: true, token: '', remaining, invalid: true };
  }
  return { done: true, token: rawToken, remaining, invalid: false };
}

async function handleProxySocket(socket) {
  socket.setNoDelay(true);
  socket.setKeepAlive(true);

  let handshakeBuffer = Buffer.alloc(0);

  const consumeHandshakeChunk = async (chunk) => {
    handshakeBuffer = Buffer.concat([handshakeBuffer, chunk]);
    const parsed = parseHandshakeToken({ socket, chunkBuffer: handshakeBuffer });
    if (!parsed.done) {
      return;
    }

    socket.off('data', handleData);
    if (parsed.invalid) {
      return;
    }

    const entry = getTokenEntryByToken(parsed.token);
    if (!entry) {
      sendSocketError(socket, 'ERR invalid session token');
      return;
    }

    const alive = await hasSession(entry.tmuxSession);
    if (!alive) {
      revokeTokenEntry(entry);
      sendSocketError(socket, 'ERR target session is no longer live');
      return;
    }

    let ptyProcess;
    try {
      ptyProcess = spawnProxyAttachPty(entry);
    } catch (error) {
      logProxy('error', 'mobile proxy attach spawn failed', {
        sessionId: entry.sessionId,
        tmuxSession: entry.tmuxSession,
        error: error?.message || String(error),
      });
      sendSocketError(socket, `ERR attach failed: ${error?.message || 'spawn failed'}`);
      return;
    }

    logProxy('info', 'mobile proxy attached', {
      sessionId: entry.sessionId,
      tmuxSession: entry.tmuxSession,
    });

    bridgeSocketToPty({ socket, ptyProcess, initialPayload: parsed.remaining });
  };

  const handleData = (chunk) => {
    void consumeHandshakeChunk(chunk).catch((error) => {
      logProxy('error', 'mobile proxy handshake failed', {
        error: error?.message || String(error),
      });
      sendSocketError(socket, 'ERR proxy handshake failed');
    });
  };

  socket.on('data', handleData);
  socket.on('error', () => undefined);
}

function buildTokenIssueResult(entry, { reused }) {
  return {
    token: entry.token,
    reused: Boolean(reused),
    issuedAt: entry.createdAt,
    sessionId: entry.sessionId,
    sessionName: entry.sessionName,
    tmuxSession: entry.tmuxSession,
    endpoint: {
      host: proxyListenHost || PROXY_BIND_HOST,
      port: proxyListenPort,
    },
  };
}

async function issueMobileSessionProxyToken({
  worktreePath,
  sessionId,
  sessionName,
  tmuxSession,
}) {
  const normalizedSessionId = normalizeSessionId(sessionId);
  const normalizedTmuxSession = normalizeTmuxTarget(tmuxSession);
  if (!normalizedSessionId) {
    throw new Error('Session is missing id for proxy continuation.');
  }
  const sessionKey = buildSessionKey({ worktreePath, sessionId: normalizedSessionId });
  const existing = tokenEntriesBySessionKey.get(sessionKey);

  const alive = await hasSession(normalizedTmuxSession);
  if (!alive) {
    if (existing) {
      revokeTokenEntry(existing);
    }
    throw new Error('Session is stale. Create or restore a live session first.');
  }

  await ensureProxyServerReady();

  if (existing && existing.tmuxSession === normalizedTmuxSession) {
    existing.sessionName = String(sessionName || '').trim() || existing.sessionName;
    existing.worktreePath = normalizeWorktreePath(worktreePath) || existing.worktreePath;
    return buildTokenIssueResult(existing, { reused: true });
  }

  if (existing) {
    revokeTokenEntry(existing);
  }

  const now = new Date().toISOString();
  const entry = {
    sessionKey,
    sessionId: normalizedSessionId,
    sessionName: String(sessionName || '').trim() || normalizedSessionId,
    worktreePath: normalizeWorktreePath(worktreePath),
    tmuxSession: normalizedTmuxSession,
    token: reserveUniqueToken(),
    createdAt: now,
  };

  tokenEntriesBySessionKey.set(sessionKey, entry);
  sessionKeysByToken.set(entry.token, sessionKey);

  return buildTokenIssueResult(entry, { reused: false });
}

function revokeMobileSessionProxyTokenForSession({ worktreePath, sessionId }) {
  if (!worktreePath || !sessionId) {
    return false;
  }
  let sessionKey;
  try {
    sessionKey = buildSessionKey({ worktreePath, sessionId });
  } catch (_error) {
    return false;
  }
  const entry = tokenEntriesBySessionKey.get(sessionKey);
  return revokeTokenEntry(entry);
}

function maskMobileSessionProxyToken(token) {
  const value = String(token || '').trim();
  if (value.length <= 10) {
    return value;
  }
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

async function shutdownMobileSessionProxyServer() {
  if (!proxyServer) {
    return;
  }
  await new Promise((resolve) => {
    proxyServer.close(() => resolve(null));
  });
  proxyServer = null;
  proxyListenHost = '';
  proxyListenPort = null;
  serverReadyPromise = null;
}

async function resetMobileSessionProxyForTests() {
  tokenEntriesBySessionKey.clear();
  sessionKeysByToken.clear();
  await shutdownMobileSessionProxyServer();
}

export {
  issueMobileSessionProxyToken,
  revokeMobileSessionProxyTokenForSession,
  maskMobileSessionProxyToken,
  shutdownMobileSessionProxyServer,
  resetMobileSessionProxyForTests,
};
