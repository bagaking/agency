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
  closed: 'closed',
};

function normalizeId(value) {
  return String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9-_]/g, '-');
}

function buildTmuxSessionName(cellId, sessionId) {
  const safeCell = normalizeId(cellId);
  const safeSession = normalizeId(sessionId);
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
      const nextStatus = isAlive ? SESSION_STATUSES.active : SESSION_STATUSES.stale;
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
  const sessionId = normalizeId(providedId || generateSessionId());
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
  resolveSessionForAttach,
  buildTmuxSessionName,
  SESSION_STATUSES,
};
