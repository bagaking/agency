const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {
  readRegistry,
  writeRegistry,
  upsertSession,
} = require('./sessionRegistry');
const { ensureTmuxAvailable, hasSession, createSession, killSession } = require('./tmux');

const SESSION_STATUSES = {
  active: 'active',
  stale: 'stale',
  detached: 'detached',
  closed: 'closed',
};

function normalizeId(value) {
  return String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9-_]/g, '-');
}

function buildTmuxSessionName(cellId, sessionId) {
  const safeCell = normalizeId(cellId) || 'cell';
  const safeSession = normalizeId(sessionId) || 'session';
  return `agency-${safeCell}-${safeSession}`;
}

function ensureWorktreePath(worktreePath) {
  if (!worktreePath || !fs.existsSync(worktreePath)) {
    throw new Error('Worktree path is missing or invalid.');
  }
  return path.resolve(worktreePath);
}

function generateSessionId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `session-${Date.now()}`;
}

async function listSessions({ worktreePath }) {
  ensureWorktreePath(worktreePath);
  await ensureTmuxAvailable();
  const registry = await readRegistry(worktreePath);
  let changed = false;

  const sessions = await Promise.all(
    registry.sessions.map(async (session) => {
      if (session.status === SESSION_STATUSES.closed) {
        return session;
      }
      const isAlive = await hasSession(session.tmuxSession);
      const nextStatus =
        session.status === SESSION_STATUSES.detached
          ? isAlive
            ? SESSION_STATUSES.detached
            : SESSION_STATUSES.stale
          : isAlive
            ? SESSION_STATUSES.active
            : SESSION_STATUSES.stale;
      if (nextStatus !== session.status) {
        changed = true;
        return { ...session, status: nextStatus };
      }
      return session;
    })
  );

  if (changed) {
    await writeRegistry(worktreePath, { ...registry, sessions });
  }

  return sessions;
}

async function createNewSession({ cellId, worktreePath, name, sessionId: providedId }) {
  ensureWorktreePath(worktreePath);
  await ensureTmuxAvailable();
  const registry = await readRegistry(worktreePath);
  let sessionId = normalizeId(providedId || generateSessionId());
  if (registry.sessions.some((session) => session.id === sessionId)) {
    sessionId = `${sessionId}-${Date.now()}`;
  }
  const tmuxSession = buildTmuxSessionName(cellId, sessionId);
  const createdAt = new Date().toISOString();

  await createSession(tmuxSession, worktreePath);

  const session = {
    id: sessionId,
    name: name || `Session ${registry.sessions.length + 1}`,
    tmuxSession,
    status: SESSION_STATUSES.active,
    createdAt,
    updatedAt: createdAt,
  };

  const nextRegistry = upsertSession(registry, session);
  await writeRegistry(worktreePath, nextRegistry);
  return session;
}

async function ensureDefaultSession({ cellId, worktreePath }) {
  const registry = await readRegistry(worktreePath);
  const existing = registry.sessions.find((session) => session.id === 'default');
  if (existing) {
    return existing;
  }
  return createNewSession({ cellId, worktreePath, name: 'Default', sessionId: 'default' });
}

async function closeSessionById({ worktreePath, sessionId }) {
  ensureWorktreePath(worktreePath);
  await ensureTmuxAvailable();
  const registry = await readRegistry(worktreePath);
  const existing = registry.sessions.find((session) => session.id === sessionId);
  if (!existing) {
    throw new Error('Session not found.');
  }
  if (existing.status !== SESSION_STATUSES.closed) {
    try {
      await killSession(existing.tmuxSession);
    } catch (error) {
      // Ignore kill failures (session may already be gone).
    }
  }
  const updatedAt = new Date().toISOString();
  const nextRegistry = upsertSession(registry, {
    ...existing,
    status: SESSION_STATUSES.closed,
    updatedAt,
    closedAt: updatedAt,
  });
  await writeRegistry(worktreePath, nextRegistry);
  return nextRegistry.sessions.find((session) => session.id === sessionId);
}

async function detachSessionById({ worktreePath, sessionId }) {
  ensureWorktreePath(worktreePath);
  await ensureTmuxAvailable();
  const registry = await readRegistry(worktreePath);
  const existing = registry.sessions.find((session) => session.id === sessionId);
  if (!existing) {
    throw new Error('Session not found.');
  }
  if (existing.status === SESSION_STATUSES.closed) {
    throw new Error('Session already closed.');
  }
  const updatedAt = new Date().toISOString();
  const nextRegistry = upsertSession(registry, {
    ...existing,
    status: SESSION_STATUSES.detached,
    updatedAt,
    detachedAt: updatedAt,
  });
  await writeRegistry(worktreePath, nextRegistry);
  return nextRegistry.sessions.find((session) => session.id === sessionId);
}

async function renameSessionById({ worktreePath, sessionId, name }) {
  ensureWorktreePath(worktreePath);
  const registry = await readRegistry(worktreePath);
  const existing = registry.sessions.find((session) => session.id === sessionId);
  if (!existing) {
    throw new Error('Session not found.');
  }
  const trimmed = String(name || '').trim();
  if (!trimmed) {
    throw new Error('Session name cannot be empty.');
  }
  const updatedAt = new Date().toISOString();
  const nextRegistry = upsertSession(registry, {
    ...existing,
    name: trimmed,
    updatedAt,
  });
  await writeRegistry(worktreePath, nextRegistry);
  return nextRegistry.sessions.find((session) => session.id === sessionId);
}

async function resolveSessionForAttach({ worktreePath, sessionId }) {
  ensureWorktreePath(worktreePath);
  await ensureTmuxAvailable();
  const registry = await readRegistry(worktreePath);
  const existing = registry.sessions.find((session) => session.id === sessionId);
  if (!existing) {
    throw new Error('Session not found. Create a session first.');
  }
  const isAlive = await hasSession(existing.tmuxSession);
  if (!isAlive) {
    const nextRegistry = upsertSession(registry, {
      ...existing,
      status: SESSION_STATUSES.stale,
      updatedAt: new Date().toISOString(),
    });
    await writeRegistry(worktreePath, nextRegistry);
    throw new Error('Session is stale. Create a new session.');
  }
  const updatedAt = new Date().toISOString();
  const nextRegistry = upsertSession(registry, {
    ...existing,
    status: SESSION_STATUSES.active,
    updatedAt,
    lastAttachedAt: updatedAt,
  });
  await writeRegistry(worktreePath, nextRegistry);
  return nextRegistry.sessions.find((session) => session.id === sessionId);
}

module.exports = {
  listSessions,
  createNewSession,
  ensureDefaultSession,
  closeSessionById,
  detachSessionById,
  renameSessionById,
  resolveSessionForAttach,
  buildTmuxSessionName,
  SESSION_STATUSES,
};
