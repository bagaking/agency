// @ts-nocheck
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {
  readRegistry,
  writeRegistry,
  upsertSession,
  removeSession,
} = require('./sessionRegistry');
const { resolveProjectRoot } = require('./projectRoot');
const {
  formatSessionName,
  getSessionNamingSettings,
  resolveUserName,
} = require('./sessionNaming');
const {
  ensureTmuxAvailable,
  hasSession,
  createSession,
  setExtendedKeys,
  setMouse,
  killSession,
  getLastPaneActivity,
  capturePane,
  setAgencySessionMetadata,
} = require('./tmux');
const { getRepoRoot } = require('./git');
const { readSessionMap } = require('./sessionMap');
const { readPreviewCache, writePreviewCache } = require('./sessionPreviewCache');

const SESSION_STATUSES = {
  active: 'active',
  stale: 'stale',
  detached: 'detached',
  closed: 'closed',
};
const DEFAULT_PROFILE_ID = 'shell';
const ATTACH_ACTIVITY_GRACE_MS = 60 * 1000;
const PREVIEW_DIFF_LINES = 90;
const DEFAULT_ACTIVITY_DIFF_THRESHOLD = 12;

const clampFrames = (value, fallback = 3) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(5, Math.max(1, Math.floor(parsed)));
};

const normalizePreviewData = (value) =>
  String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trimEnd();

const clampActivityThreshold = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_ACTIVITY_DIFF_THRESHOLD;
  }
  return Math.max(1, Math.floor(parsed));
};

const countDiffChars = (prev, next, limit) => {
  if (prev === next) {
    return 0;
  }
  const left = String(prev || '');
  const right = String(next || '');
  const leftLen = left.length;
  const rightLen = right.length;
  const minLen = Math.min(leftLen, rightLen);
  let diff = Math.abs(leftLen - rightLen);
  const cap = Number.isFinite(limit) ? limit : Infinity;
  for (let i = 0; i < minLen && diff <= cap; i += 1) {
    if (left[i] !== right[i]) {
      diff += 1;
    }
  }
  return diff;
};

async function shouldRecordActivity({ worktreePath, session }) {
  if (!worktreePath || !session?.tmuxSession) {
    return false;
  }
  try {
    const output = await capturePane(session.tmuxSession, {
      lines: PREVIEW_DIFF_LINES,
      joinWrapped: true,
    });
    const normalized = normalizePreviewData(output);
    if (!normalized) {
      return false;
    }
    const cached = await readPreviewCache({ worktreePath, sessionId: session.id });
    const previous = cached?.latest?.data ? normalizePreviewData(cached.latest.data) : '';
    const config = await readSessionMap({ rootPath: worktreePath });
    const maxFrames = clampFrames(config?.previewCacheFrames, 3);
    const threshold = clampActivityThreshold(config?.activityDiffThreshold);
    if (!previous) {
      await writePreviewCache({
        worktreePath,
        sessionId: session.id,
        frame: { data: normalized, cols: null, rows: null, capturedAt: new Date().toISOString() },
        maxFrames,
      });
      return countDiffChars('', normalized, threshold) >= threshold;
    }
    if (normalized === previous) {
      return false;
    }
    const diffCount = countDiffChars(previous, normalized, threshold);
    await writePreviewCache({
      worktreePath,
      sessionId: session.id,
      frame: { data: normalized, cols: null, rows: null, capturedAt: new Date().toISOString() },
      maxFrames,
    });
    return diffCount >= threshold;
  } catch (_error) {
    return false;
  }
}

function ensureSessionName(session, index) {
  const current = String(session?.name || '').trim();
  if (current) {
    return session;
  }
  const fallback =
    session?.id === 'default' ? 'Default' : `Session ${Number(index) + 1}`;
  return { ...session, name: fallback };
}

function normalizeSessionName(value) {
  return String(value || '').trim();
}

function ensureUniqueSessionName(baseName, sessions) {
  const trimmed = normalizeSessionName(baseName);
  if (!trimmed) {
    return '';
  }
  const existing = new Set(
    (sessions || [])
      .map((session) => normalizeSessionName(session?.name))
      .filter((name) => name.length > 0)
  );
  if (!existing.has(trimmed)) {
    return trimmed;
  }
  let suffix = 2;
  let candidate = `${trimmed} ${suffix}`;
  while (existing.has(candidate)) {
    suffix += 1;
    candidate = `${trimmed} ${suffix}`;
  }
  return candidate;
}

function buildSessionNamingSequences({ sessions, profileId }) {
  const list = Array.isArray(sessions) ? sessions : [];
  const absolute = list.length + 1;
  const active = list.filter((session) =>
    session.status === SESSION_STATUSES.active || session.status === SESSION_STATUSES.detached
  ).length + 1;
  const profile = list.filter((session) =>
    (session.profileId || DEFAULT_PROFILE_ID) === (profileId || DEFAULT_PROFILE_ID) &&
    (session.status === SESSION_STATUSES.active || session.status === SESSION_STATUSES.detached)
  ).length + 1;
  return {
    absolute,
    active,
    cell: absolute,
    profile,
  };
}

async function buildSessionNamingContext({
  cellId,
  cellName,
  cellBranch,
  profileId,
  worktreePath,
}) {
  const repoRoot = await resolveProjectRoot({ rootPath: worktreePath });
  return {
    cell: cellName || cellId || '',
    profile: profileId || DEFAULT_PROFILE_ID,
    project: repoRoot ? path.basename(repoRoot) : '',
    branch: cellBranch || '',
    user: resolveUserName() || '',
  };
}

async function generateAutoSessionName({
  registry,
  cellId,
  cellName,
  cellBranch,
  profileId,
  worktreePath,
}) {
  const resolved = await getSessionNamingSettings({ scope: 'resolved', worktreePath });
  const sequences = buildSessionNamingSequences({
    sessions: registry?.sessions || [],
    profileId,
  });
  const context = await buildSessionNamingContext({
    cellId,
    cellName,
    cellBranch,
    profileId,
    worktreePath,
  });
  return formatSessionName({
    rule: resolved?.rule,
    nameLists: resolved?.nameLists,
    sequences,
    context,
  });
}

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

async function resolveProjectMetadata(worktreePath) {
  const resolvedWorktree = path.resolve(worktreePath);
  try {
    const projectRoot = await getRepoRoot(resolvedWorktree);
    return {
      projectRoot,
      projectName: path.basename(projectRoot) || path.basename(resolvedWorktree),
    };
  } catch (_error) {
    return {
      projectRoot: resolvedWorktree,
      projectName: path.basename(resolvedWorktree),
    };
  }
}

function deriveCellIdFromTmuxSession(session) {
  const tmuxSession = String(session?.tmuxSession || '').trim();
  const sessionId = String(session?.id || '').trim();
  if (!tmuxSession || !sessionId) {
    return '';
  }
  const safeSession = normalizeId(sessionId);
  if (!safeSession) {
    return '';
  }
  const prefix = 'agency-';
  const suffix = `-${safeSession}`;
  if (!tmuxSession.startsWith(prefix) || !tmuxSession.endsWith(suffix)) {
    return '';
  }
  return String(tmuxSession.slice(prefix.length, tmuxSession.length - suffix.length) || '').trim();
}

function resolveSessionCellId(session) {
  const explicit = String(session?.cellId || '').trim();
  if (explicit) {
    return explicit;
  }
  return deriveCellIdFromTmuxSession(session);
}

function resolveSessionCellName(session) {
  const explicit = String(session?.cellName || '').trim();
  if (explicit) {
    return explicit;
  }
  return resolveSessionCellId(session);
}

async function syncSessionTmuxMetadata({
  worktreePath,
  session,
  status,
  projectMetadata,
  lastActivityAt,
}) {
  const tmuxSession = String(session?.tmuxSession || '').trim();
  if (!tmuxSession) {
    return;
  }
  const project = projectMetadata || (await resolveProjectMetadata(worktreePath));
  const cellId = resolveSessionCellId(session);
  const cellName = resolveSessionCellName(session);
  await setAgencySessionMetadata(tmuxSession, {
    projectRoot: project?.projectRoot || '',
    projectName: project?.projectName || '',
    worktreePath,
    cellId,
    cellName,
    sessionId: session?.id || '',
    sessionName: session?.name || session?.id || '',
    sessionStatus: status || session?.status || '',
    lastActivityAt: lastActivityAt || session?.lastActivityAt || '',
  });
}

function parseTimestamp(value) {
  if (!value) {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function shouldIgnoreAttachActivity({ lastAttachedAt, lastActivityAt, nextActivityAt }) {
  const attachTs = parseTimestamp(lastAttachedAt);
  const activityTs = parseTimestamp(nextActivityAt);
  if (!Number.isFinite(attachTs) || !Number.isFinite(activityTs)) {
    return false;
  }
  const lastActivityTs = parseTimestamp(lastActivityAt);
  if (!Number.isFinite(lastActivityTs)) {
    return false;
  }
  const withinGrace = Math.abs(activityTs - attachTs) <= ATTACH_ACTIVITY_GRACE_MS;
  if (!withinGrace) {
    return false;
  }
  return activityTs === attachTs;
}

async function listSessions({ worktreePath }) {
  ensureWorktreePath(worktreePath);
  await ensureTmuxAvailable();
  const registry = await readRegistry(worktreePath);
  const projectMetadata = await resolveProjectMetadata(worktreePath);
  let changed = false;

  const sessions = await Promise.all(
    registry.sessions.map(async (session, index) => {
      if (session.status === SESSION_STATUSES.closed) {
        let resolved = ensureSessionName(session, index);
        const resolvedCellId = resolveSessionCellId(resolved);
        const resolvedCellName = resolveSessionCellName(resolved);
        if (resolvedCellId && resolvedCellId !== resolved.cellId) {
          resolved = { ...resolved, cellId: resolvedCellId };
        }
        if (resolvedCellName && resolvedCellName !== resolved.cellName) {
          resolved = { ...resolved, cellName: resolvedCellName };
        }
        if (resolved !== session) {
          changed = true;
        }
        return resolved;
      }
      let sessionChanged = false;
      let metadataSyncNeeded = !session?.metadataSyncedAt;
      const isAlive = await hasSession(session.tmuxSession);
      const nextStatus =
        session.status === SESSION_STATUSES.detached
          ? isAlive
            ? SESSION_STATUSES.detached
            : SESSION_STATUSES.stale
          : isAlive
            ? SESSION_STATUSES.active
            : SESSION_STATUSES.stale;
      let resolved = session;
      if (nextStatus !== session.status) {
        sessionChanged = true;
        metadataSyncNeeded = true;
        resolved = { ...session, status: nextStatus };
      }

      const resolvedCellId = resolveSessionCellId(resolved);
      const resolvedCellName = resolveSessionCellName(resolved);
      if (resolvedCellId && resolvedCellId !== resolved.cellId) {
        sessionChanged = true;
        metadataSyncNeeded = true;
        resolved = { ...resolved, cellId: resolvedCellId };
      }
      if (resolvedCellName && resolvedCellName !== resolved.cellName) {
        sessionChanged = true;
        metadataSyncNeeded = true;
        resolved = { ...resolved, cellName: resolvedCellName };
      }

      if (isAlive) {
        const activityAt = await getLastPaneActivity(resolved.tmuxSession);
        if (activityAt && activityAt !== resolved.lastActivityAt) {
          if (
            !shouldIgnoreAttachActivity({
              lastAttachedAt: resolved.lastAttachedAt,
              lastActivityAt: resolved.lastActivityAt,
              nextActivityAt: activityAt,
            })
          ) {
            const shouldUpdate = await shouldRecordActivity({
              worktreePath,
              session: resolved,
            });
            if (shouldUpdate) {
              sessionChanged = true;
              metadataSyncNeeded = true;
              resolved = { ...resolved, lastActivityAt: activityAt };
            }
          }
        }
      }
      let named = ensureSessionName(resolved, index);
      if (named !== resolved) {
        sessionChanged = true;
        metadataSyncNeeded = true;
      }
      if (isAlive && metadataSyncNeeded) {
        const metadataSyncedAt = new Date().toISOString();
        await syncSessionTmuxMetadata({
          worktreePath,
          projectMetadata,
          session: named,
          status: named.status,
          lastActivityAt: named.lastActivityAt,
        });
        named = { ...named, metadataSyncedAt };
        sessionChanged = true;
      }
      if (sessionChanged) {
        changed = true;
      }
      return named;
    })
  );

  if (changed) {
    await writeRegistry(worktreePath, { ...registry, sessions });
  }

  return sessions;
}

async function createNewSession({
  cellId,
  worktreePath,
  name,
  sessionId: providedId,
  profileId,
  avatar,
  cellName,
  cellBranch,
}) {
  ensureWorktreePath(worktreePath);
  await ensureTmuxAvailable();
  const projectMetadata = await resolveProjectMetadata(worktreePath);
  const registry = await readRegistry(worktreePath);
  let sessionId = normalizeId(providedId || generateSessionId());
  if (registry.sessions.some((session) => session.id === sessionId)) {
    sessionId = `${sessionId}-${Date.now()}`;
  }
  const tmuxSession = buildTmuxSessionName(cellId, sessionId);
  const createdAt = new Date().toISOString();
  const hasProvidedName = Boolean(normalizeSessionName(name));
  let resolvedName = normalizeSessionName(name);
  if (!hasProvidedName) {
    try {
      resolvedName = normalizeSessionName(
        await generateAutoSessionName({
          registry,
          cellId,
          cellName,
          cellBranch,
          profileId,
          worktreePath,
        })
      );
    } catch (_error) {
      resolvedName = '';
    }
  }
  if (!resolvedName) {
    resolvedName = `Session ${registry.sessions.length + 1}`;
  }
  if (!hasProvidedName) {
    resolvedName = ensureUniqueSessionName(resolvedName, registry.sessions);
  }

  const isAlive = await hasSession(tmuxSession);
  if (isAlive) {
    await setMouse(tmuxSession, true);
    await setExtendedKeys(tmuxSession, true);
    const resolvedCellId = String(cellId || '').trim() || deriveCellIdFromTmuxSession({ id: sessionId, tmuxSession });
    const resolvedCellName = String(cellName || '').trim() || resolvedCellId;
    const session = {
      id: sessionId,
      name: resolvedName,
      tmuxSession,
      cellId: resolvedCellId || undefined,
      cellName: resolvedCellName || undefined,
      status: SESSION_STATUSES.active,
      profileId: profileId || DEFAULT_PROFILE_ID,
      avatar: avatar || undefined,
      createdAt,
      updatedAt: createdAt,
      lastAttachedAt: createdAt,
      metadataSyncedAt: createdAt,
    };
    await syncSessionTmuxMetadata({
      worktreePath,
      projectMetadata,
      session,
      status: SESSION_STATUSES.active,
    });
    const nextRegistry = upsertSession(registry, session);
    await writeRegistry(worktreePath, nextRegistry);
    return session;
  }

  await createSession(tmuxSession, worktreePath);
  await setMouse(tmuxSession, true);
  await setExtendedKeys(tmuxSession, true);
  const resolvedCellId = String(cellId || '').trim() || deriveCellIdFromTmuxSession({ id: sessionId, tmuxSession });
  const resolvedCellName = String(cellName || '').trim() || resolvedCellId;

  const session = {
    id: sessionId,
    name: resolvedName,
    tmuxSession,
    cellId: resolvedCellId || undefined,
    cellName: resolvedCellName || undefined,
    status: SESSION_STATUSES.active,
    profileId: profileId || DEFAULT_PROFILE_ID,
    avatar: avatar || undefined,
    createdAt,
    updatedAt: createdAt,
    metadataSyncedAt: createdAt,
  };

  await syncSessionTmuxMetadata({
    worktreePath,
    projectMetadata,
    session,
    status: SESSION_STATUSES.active,
  });

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
  return createNewSession({
    cellId,
    worktreePath,
    name: 'Default',
    sessionId: 'default',
    profileId: DEFAULT_PROFILE_ID,
  });
}

async function recreateSession({ cellId, worktreePath, sessionId }) {
  ensureWorktreePath(worktreePath);
  await ensureTmuxAvailable();
  const registry = await readRegistry(worktreePath);
  const existing = registry.sessions.find((session) => session.id === sessionId);
  const nextRegistry = removeSession(registry, sessionId);
  await writeRegistry(worktreePath, nextRegistry);
  return createNewSession({
    cellId,
    worktreePath,
    name: existing?.name,
    sessionId,
    profileId: existing?.profileId || DEFAULT_PROFILE_ID,
  });
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
  const projectMetadata = await resolveProjectMetadata(worktreePath);
  const registry = await readRegistry(worktreePath);
  const existing = registry.sessions.find((session) => session.id === sessionId);
  if (!existing) {
    throw new Error('Session not found.');
  }
  if (existing.status === SESSION_STATUSES.closed) {
    throw new Error('Session already closed.');
  }
  const updatedAt = new Date().toISOString();
  const nextSession = {
    ...existing,
    status: SESSION_STATUSES.detached,
    updatedAt,
    detachedAt: updatedAt,
    metadataSyncedAt: updatedAt,
  };
  const nextRegistry = upsertSession(registry, nextSession);
  await syncSessionTmuxMetadata({
    worktreePath,
    projectMetadata,
    session: nextSession,
    status: SESSION_STATUSES.detached,
  });
  await writeRegistry(worktreePath, nextRegistry);
  return nextRegistry.sessions.find((session) => session.id === sessionId);
}

async function renameSessionById({ worktreePath, sessionId, name }) {
  ensureWorktreePath(worktreePath);
  const projectMetadata = await resolveProjectMetadata(worktreePath);
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
  const nextSession = {
    ...existing,
    name: trimmed,
    updatedAt,
    metadataSyncedAt: existing?.metadataSyncedAt || undefined,
  };
  const nextRegistry = upsertSession(registry, nextSession);
  try {
    if (await hasSession(existing.tmuxSession)) {
      nextSession.metadataSyncedAt = updatedAt;
      await syncSessionTmuxMetadata({
        worktreePath,
        projectMetadata,
        session: nextSession,
        status: existing.status,
      });
      const syncedRegistry = upsertSession(nextRegistry, nextSession);
      await writeRegistry(worktreePath, syncedRegistry);
      return syncedRegistry.sessions.find((session) => session.id === sessionId);
    }
  } catch (_error) {
    // Metadata sync is best effort.
  }
  await writeRegistry(worktreePath, nextRegistry);
  return nextRegistry.sessions.find((session) => session.id === sessionId);
}

async function updateSessionMeta({ worktreePath, sessionId, avatar }) {
  ensureWorktreePath(worktreePath);
  const registry = await readRegistry(worktreePath);
  const existing = registry.sessions.find((session) => session.id === sessionId);
  if (!existing) {
    throw new Error('Session not found.');
  }
  const updatedAt = new Date().toISOString();
  const nextSession = { ...existing, updatedAt };
  if (avatar === null || avatar === undefined || String(avatar).trim() === '') {
    delete nextSession.avatar;
  } else {
    nextSession.avatar = String(avatar).trim();
  }
  const nextRegistry = upsertSession(registry, nextSession);
  await writeRegistry(worktreePath, nextRegistry);
  return nextRegistry.sessions.find((session) => session.id === sessionId);
}

async function setSessionMouse({ worktreePath, sessionId, enabled = true }) {
  ensureWorktreePath(worktreePath);
  await ensureTmuxAvailable();
  const registry = await readRegistry(worktreePath);
  const existing = registry.sessions.find((session) => session.id === sessionId);
  if (!existing) {
    throw new Error('Session not found.');
  }
  await setMouse(existing.tmuxSession, Boolean(enabled));
  return { sessionId, enabled: Boolean(enabled) };
}

async function resolveSessionForAttach({ worktreePath, sessionId }) {
  ensureWorktreePath(worktreePath);
  await ensureTmuxAvailable();
  const projectMetadata = await resolveProjectMetadata(worktreePath);
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
    metadataSyncedAt: updatedAt,
  });
  await writeRegistry(worktreePath, nextRegistry);
  await setMouse(existing.tmuxSession, true);
  await setExtendedKeys(existing.tmuxSession, true);
  const resolved = nextRegistry.sessions.find((session) => session.id === sessionId);
  await syncSessionTmuxMetadata({
    worktreePath,
    projectMetadata,
    session: resolved,
    status: SESSION_STATUSES.active,
  });
  return resolved;
}

async function resolveSessionForPreview({ worktreePath, sessionId }) {
  ensureWorktreePath(worktreePath);
  await ensureTmuxAvailable();
  const registry = await readRegistry(worktreePath);
  const existing = registry.sessions.find((session) => session.id === sessionId);
  if (!existing) {
    throw new Error('Session not found.');
  }
  if (existing.status === SESSION_STATUSES.closed) {
    throw new Error('Session is closed.');
  }
  const isAlive = await hasSession(existing.tmuxSession);
  if (!isAlive) {
    throw new Error('Session is stale.');
  }
  return existing;
}

export {
  listSessions,
  createNewSession,
  ensureDefaultSession,
  recreateSession,
  closeSessionById,
  detachSessionById,
  renameSessionById,
  updateSessionMeta,
  setSessionMouse,
  resolveSessionForAttach,
  resolveSessionForPreview,
  buildTmuxSessionName,
  SESSION_STATUSES,
};
