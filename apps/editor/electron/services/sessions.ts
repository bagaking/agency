// @ts-nocheck
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {
  readRegistry,
  updateRegistry,
  upsertSession,
  removeSession,
} = require('./sessionRegistry');
const { resolveCellContext } = require('./cells');
const {
  SESSION_NODE_KINDS,
  buildNewSessionTopologyFields,
  moveSessionNodeInRegistry,
} = require('./sessionTopology');
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
const { revokeMobileSessionProxyTokenForSession } = require('./mobileSessionProxy');

const SESSION_STATUSES = {
  active: 'active',
  stale: 'stale',
  detached: 'detached',
  closed: 'closed',
};
const SESSION_RUNTIME_ROOT_KINDS = {
  worktree: 'worktree',
  project: 'project',
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

async function resolveSessionServiceContext(params = {}) {
  const { cellId = '', worktreePath = '', rootPath = '', projectRoot = '' } = params || {};
  const context = await resolveCellContext({
    cellId,
    worktreePath,
    rootPath: projectRoot || rootPath || worktreePath,
  });
  if (!context?.repoRoot) {
    throw new Error('Project root is not configured.');
  }
  const resolvedCellId = String(context?.cell?.id || cellId || '').trim();
  if (!resolvedCellId) {
    throw new Error('Cell not found.');
  }
  return {
    repoRoot: context.repoRoot,
    cell: context.cell || null,
    cellId: resolvedCellId,
    worktreePath: context.worktreePath || String(worktreePath || '').trim(),
    attachedWorktreePath: context.attachedWorktreePath || '',
    attachmentState: String(context?.cell?.attachmentState || '').trim().toLowerCase(),
    registryContext: {
      projectRoot: context.repoRoot,
      cellId: resolvedCellId,
      worktreePath: context.worktreePath || String(worktreePath || '').trim(),
    },
  };
}

function ensureAttachedWorktreePath(context, message = 'Cell worktree attachment is missing.') {
  const attachedWorktreePath = String(context?.attachedWorktreePath || '').trim();
  if (!attachedWorktreePath || !fs.existsSync(attachedWorktreePath)) {
    throw new Error(message);
  }
  return path.resolve(attachedWorktreePath);
}

function resolveOptionalSessionRuntimeRoot(context) {
  const attachedWorktreePath = String(context?.attachedWorktreePath || '').trim();
  if (attachedWorktreePath && fs.existsSync(attachedWorktreePath)) {
    return {
      path: path.resolve(attachedWorktreePath),
      kind: SESSION_RUNTIME_ROOT_KINDS.worktree,
    };
  }
  const attachmentState = String(context?.attachmentState || context?.cell?.attachmentState || '')
    .trim()
    .toLowerCase();
  const projectRoot = String(context?.repoRoot || '').trim();
  if (attachmentState === 'project_root' && projectRoot && fs.existsSync(projectRoot)) {
    return {
      path: path.resolve(projectRoot),
      kind: SESSION_RUNTIME_ROOT_KINDS.project,
    };
  }
  return {
    path: '',
    kind: '',
  };
}

function ensureSessionRuntimeRoot(context, message = 'Cell runtime root is missing.') {
  const runtimeRoot = resolveOptionalSessionRuntimeRoot(context);
  if (!runtimeRoot.path) {
    throw new Error(message);
  }
  return runtimeRoot;
}

function normalizeOfflineSessionStatus(status) {
  if (status === SESSION_STATUSES.closed) {
    return SESSION_STATUSES.closed;
  }
  if (status === SESSION_STATUSES.detached) {
    return SESSION_STATUSES.detached;
  }
  return SESSION_STATUSES.stale;
}

function buildOfflineSessions(registry) {
  return (registry?.sessions || []).map((session, index) =>
    ensureSessionName(
      {
        ...session,
        status: normalizeOfflineSessionStatus(session?.status),
      },
      index
    )
  );
}

function buildSessionRegistryContext({
  worktreePath,
  cellId,
  projectRoot,
}) {
  return {
    worktreePath: String(worktreePath || '').trim(),
    cellId: String(cellId || '').trim(),
    projectRoot: String(projectRoot || '').trim(),
  };
}

function revokeMobileProxyToken({ worktreePath, sessionId }) {
  if (!worktreePath || !sessionId) {
    return;
  }
  try {
    revokeMobileSessionProxyTokenForSession({ worktreePath, sessionId });
  } catch (_error) {
    // Proxy token cleanup is best effort.
  }
}

function generateSessionId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `session-${Date.now()}`;
}

async function resolveProjectMetadata({ worktreePath, projectRoot } = {}) {
  const explicitProjectRoot = String(projectRoot || '').trim();
  if (explicitProjectRoot) {
    return {
      projectRoot: explicitProjectRoot,
      projectName: path.basename(explicitProjectRoot),
    };
  }
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
  runtimeRootKind,
  session,
  status,
  projectMetadata,
  lastActivityAt,
}) {
  const tmuxSession = String(session?.tmuxSession || '').trim();
  if (!tmuxSession) {
    return;
  }
  const project =
    projectMetadata || (await resolveProjectMetadata({ worktreePath, projectRoot: session?.projectRoot }));
  const cellId = resolveSessionCellId(session);
  const cellName = resolveSessionCellName(session);
  await setAgencySessionMetadata(tmuxSession, {
    projectRoot: project?.projectRoot || '',
    projectName: project?.projectName || '',
    worktreePath,
    runtimeRootPath: worktreePath,
    runtimeRootKind: runtimeRootKind || SESSION_RUNTIME_ROOT_KINDS.worktree,
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

function valuesEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function mergeListSessionRefresh(latestRegistry, baseSessions, refreshedSessions) {
  const baseById = new Map((baseSessions || []).map((session) => [session.id, session]));
  const refreshedById = new Map((refreshedSessions || []).map((session) => [session.id, session]));
  let changed = false;

  const sessions = (latestRegistry.sessions || []).map((latestSession) => {
    const baseSession = baseById.get(latestSession.id);
    const refreshedSession = refreshedById.get(latestSession.id);
    if (!baseSession || !refreshedSession) {
      return latestSession;
    }

    let nextSession = latestSession;
    const applyField = (field) => {
      if (!Object.prototype.hasOwnProperty.call(refreshedSession, field)) {
        return;
      }
      if (!valuesEqual(latestSession[field], baseSession[field])) {
        return;
      }
      if (valuesEqual(latestSession[field], refreshedSession[field])) {
        return;
      }
      nextSession = { ...nextSession, [field]: refreshedSession[field] };
      changed = true;
    };

    [
      'status',
      'cellId',
      'cellName',
      'projectRoot',
      'lastActivityAt',
      'metadataSyncedAt',
    ].forEach(applyField);

    if (!normalizeSessionName(latestSession.name) && normalizeSessionName(refreshedSession.name)) {
      nextSession = { ...nextSession, name: refreshedSession.name };
      changed = true;
    }

    return nextSession;
  });

  return {
    changed,
    registry: changed ? { ...latestRegistry, sessions } : latestRegistry,
  };
}

async function listSessions({ worktreePath, cellId, projectRoot }) {
  const context = await resolveSessionServiceContext({
    cellId,
    worktreePath,
    projectRoot,
  });
  const runtimeRoot = resolveOptionalSessionRuntimeRoot(context);
  const registry = await readRegistry(context.registryContext);
  const baseSessions = registry.sessions || [];
  const projectMetadata = await resolveProjectMetadata({
    worktreePath: runtimeRoot.path || context.worktreePath || context.repoRoot,
    projectRoot: context.repoRoot,
  });
  if (!runtimeRoot.path) {
    const sessions = baseSessions.map((session, index) => {
      let resolved = ensureSessionName(session, index);
      const resolvedCellId = resolveSessionCellId(resolved) || context.cellId;
      const resolvedCellName = resolveSessionCellName(resolved) || resolvedCellId;
      const nextStatus =
        resolved.status === SESSION_STATUSES.closed
          ? SESSION_STATUSES.closed
          : resolved.status === SESSION_STATUSES.detached
            ? SESSION_STATUSES.detached
            : SESSION_STATUSES.stale;
      if (
        nextStatus !== resolved.status ||
        resolvedCellId !== resolved.cellId ||
        resolvedCellName !== resolved.cellName ||
        projectMetadata.projectRoot !== resolved.projectRoot
      ) {
        return {
          ...resolved,
          status: nextStatus,
          cellId: resolvedCellId || undefined,
          cellName: resolvedCellName || undefined,
          projectRoot: projectMetadata.projectRoot || undefined,
        };
      }
      return resolved;
    });
    if (JSON.stringify(sessions) !== JSON.stringify(baseSessions)) {
      const updatedRegistry = await updateRegistry(context.registryContext, (latestRegistry) => {
        const merged = mergeListSessionRefresh(latestRegistry, baseSessions, sessions);
        return merged.registry;
      });
      return updatedRegistry.sessions || [];
    }
    return sessions;
  }
  ensureWorktreePath(runtimeRoot.path);
  await ensureTmuxAvailable();
  let changed = false;

  const sessions = await Promise.all(
    baseSessions.map(async (session, index) => {
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
              worktreePath: runtimeRoot.path,
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
      if (projectMetadata.projectRoot && named.projectRoot !== projectMetadata.projectRoot) {
        named = {
          ...named,
          projectRoot: projectMetadata.projectRoot,
        };
        sessionChanged = true;
      }
      if (named !== resolved) {
        sessionChanged = true;
        metadataSyncNeeded = true;
      }
      if (isAlive && metadataSyncNeeded) {
        const metadataSyncedAt = new Date().toISOString();
        await syncSessionTmuxMetadata({
          worktreePath: runtimeRoot.path,
          runtimeRootKind: runtimeRoot.kind,
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
    const updatedRegistry = await updateRegistry(context.registryContext, (latestRegistry) => {
      const merged = mergeListSessionRefresh(latestRegistry, baseSessions, sessions);
      return merged.registry;
    });
    return updatedRegistry.sessions || [];
  }

  return sessions;
}

async function createNewSession({
  cellId,
  worktreePath,
  rootPath,
  projectRoot,
  name,
  sessionId: providedId,
  profileId,
  avatar,
  cellName,
  cellBranch,
  parentSessionId,
  nodeKind,
  sourceSessionId,
}) {
  const context = await resolveSessionServiceContext({
    cellId,
    worktreePath,
    rootPath,
    projectRoot,
  });
  const runtimeRoot = ensureSessionRuntimeRoot(context, 'Cell runtime root is missing.');
  await ensureTmuxAvailable();
  const projectMetadata = await resolveProjectMetadata({
    worktreePath: runtimeRoot.path,
    projectRoot: context.repoRoot,
  });
  const registry = await readRegistry(context.registryContext);
  let sessionId = normalizeId(providedId || generateSessionId());
  if (registry.sessions.some((session) => session.id === sessionId)) {
    sessionId = `${sessionId}-${Date.now()}`;
  }
  const resolvedCellId = String(context.cellId || cellId || '').trim();
  const tmuxSession = buildTmuxSessionName(resolvedCellId, sessionId);
  const createdAt = new Date().toISOString();
  const hasProvidedName = Boolean(normalizeSessionName(name));
  let resolvedName = normalizeSessionName(name);
  if (!hasProvidedName) {
    try {
      resolvedName = normalizeSessionName(
        await generateAutoSessionName({
          registry,
          cellId: resolvedCellId,
          cellName: cellName || context.cell?.name,
          cellBranch: cellBranch || context.cell?.branch,
          profileId,
          worktreePath: runtimeRoot.path,
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
  const topology = buildNewSessionTopologyFields({
    registry,
    parentSessionId: parentSessionId || null,
    nodeKind: nodeKind || SESSION_NODE_KINDS.ROOT,
    sourceSessionId: sourceSessionId || null,
  });

  const isAlive = await hasSession(tmuxSession);
  if (isAlive) {
    await setMouse(tmuxSession, true);
    await setExtendedKeys(tmuxSession, true);
    const resolvedCellName = String(cellName || context.cell?.name || '').trim() || resolvedCellId;
    const session = {
      id: sessionId,
      name: resolvedName,
      tmuxSession,
      cellId: resolvedCellId || undefined,
      cellName: resolvedCellName || undefined,
      cellBranch: String(cellBranch || context.cell?.branch || '').trim() || undefined,
      projectRoot: projectMetadata.projectRoot || undefined,
      status: SESSION_STATUSES.active,
      profileId: profileId || DEFAULT_PROFILE_ID,
      avatar: avatar || undefined,
      createdAt,
      updatedAt: createdAt,
      lastAttachedAt: createdAt,
      metadataSyncedAt: createdAt,
      ...topology,
    };
    await syncSessionTmuxMetadata({
      worktreePath: runtimeRoot.path,
      runtimeRootKind: runtimeRoot.kind,
      projectMetadata,
      session,
      status: SESSION_STATUSES.active,
    });
    const savedRegistry = await updateRegistry(context.registryContext, (latestRegistry) =>
      upsertSession(latestRegistry, session)
    );
    return savedRegistry.sessions.find((item) => item.id === sessionId) || session;
  }

  await createSession(tmuxSession, runtimeRoot.path);
  await setMouse(tmuxSession, true);
  await setExtendedKeys(tmuxSession, true);
  const resolvedCellName = String(cellName || context.cell?.name || '').trim() || resolvedCellId;

  const session = {
    id: sessionId,
    name: resolvedName,
    tmuxSession,
    cellId: resolvedCellId || undefined,
    cellName: resolvedCellName || undefined,
    cellBranch: String(cellBranch || context.cell?.branch || '').trim() || undefined,
    projectRoot: projectMetadata.projectRoot || undefined,
    status: SESSION_STATUSES.active,
    profileId: profileId || DEFAULT_PROFILE_ID,
    avatar: avatar || undefined,
    createdAt,
    updatedAt: createdAt,
    metadataSyncedAt: createdAt,
    ...topology,
  };

  await syncSessionTmuxMetadata({
    worktreePath: runtimeRoot.path,
    runtimeRootKind: runtimeRoot.kind,
    projectMetadata,
    session,
    status: SESSION_STATUSES.active,
  });

  const savedRegistry = await updateRegistry(context.registryContext, (latestRegistry) =>
    upsertSession(latestRegistry, session)
  );
  return savedRegistry.sessions.find((item) => item.id === sessionId) || session;
}

async function ensureDefaultSession({ cellId, worktreePath, rootPath, projectRoot }) {
  const context = await resolveSessionServiceContext({
    cellId,
    worktreePath,
    rootPath,
    projectRoot,
  });
  const registry = await readRegistry(context.registryContext);
  const existing = registry.sessions.find((session) => session.id === 'default');
  if (existing) {
    return existing;
  }
  const runtimeRoot = resolveOptionalSessionRuntimeRoot(context);
  return createNewSession({
    cellId: context.cellId,
    worktreePath: runtimeRoot.path || context.worktreePath,
    projectRoot: context.repoRoot,
    name: 'Default',
    sessionId: 'default',
    profileId: DEFAULT_PROFILE_ID,
  });
}

async function recreateSession({ cellId, worktreePath, sessionId, rootPath, projectRoot }) {
  const context = await resolveSessionServiceContext({
    cellId,
    worktreePath,
    rootPath,
    projectRoot,
  });
  const runtimeRoot = ensureSessionRuntimeRoot(context, 'Cell runtime root is missing.');
  await ensureTmuxAvailable();
  const registry = await readRegistry(context.registryContext);
  const existing = registry.sessions.find((session) => session.id === sessionId);
  revokeMobileProxyToken({ worktreePath: context.worktreePath, sessionId: existing?.id || sessionId });
  await updateRegistry(context.registryContext, (latestRegistry) =>
    removeSession(latestRegistry, sessionId)
  );
  return createNewSession({
    cellId: context.cellId,
    worktreePath: runtimeRoot.path,
    projectRoot: context.repoRoot,
    name: existing?.name,
    sessionId,
    profileId: existing?.profileId || DEFAULT_PROFILE_ID,
    avatar: existing?.avatar,
    cellName: existing?.cellName,
    cellBranch: existing?.cellBranch,
    parentSessionId: existing?.parentSessionId || null,
    nodeKind: existing?.nodeKind || SESSION_NODE_KINDS.ROOT,
    sourceSessionId: existing?.sourceSessionId || null,
  });
}

async function closeSessionById({ worktreePath, sessionId, cellId, projectRoot }) {
  const context = await resolveSessionServiceContext({
    cellId,
    worktreePath,
    projectRoot,
  });
  await ensureTmuxAvailable();
  const registry = await readRegistry(context.registryContext);
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
  const nextRegistry = await updateRegistry(context.registryContext, (latestRegistry) => {
    const latestExisting =
      (latestRegistry.sessions || []).find((session) => session.id === sessionId) || existing;
    return upsertSession(latestRegistry, {
      ...latestExisting,
      status: SESSION_STATUSES.closed,
      updatedAt,
      closedAt: updatedAt,
    });
  });
  revokeMobileProxyToken({ worktreePath: context.worktreePath, sessionId: existing.id });
  return nextRegistry.sessions.find((session) => session.id === sessionId);
}

async function detachSessionById({ worktreePath, sessionId, cellId, projectRoot }) {
  const context = await resolveSessionServiceContext({
    cellId,
    worktreePath,
    projectRoot,
  });
  const runtimeRoot = ensureSessionRuntimeRoot(context, 'Cell runtime root is missing.');
  await ensureTmuxAvailable();
  const projectMetadata = await resolveProjectMetadata({
    worktreePath: runtimeRoot.path,
    projectRoot: context.repoRoot,
  });
  const registry = await readRegistry(context.registryContext);
  const existing = registry.sessions.find((session) => session.id === sessionId);
  if (!existing) {
    throw new Error('Session not found.');
  }
  if (existing.status === SESSION_STATUSES.closed) {
    throw new Error('Session already closed.');
  }
  const updatedAt = new Date().toISOString();
  const syncedSession = {
    ...existing,
    status: SESSION_STATUSES.detached,
    updatedAt,
    detachedAt: updatedAt,
    metadataSyncedAt: updatedAt,
  };
  await syncSessionTmuxMetadata({
    worktreePath: runtimeRoot.path,
    runtimeRootKind: runtimeRoot.kind,
    projectMetadata,
    session: syncedSession,
    status: SESSION_STATUSES.detached,
  });
  const savedRegistry = await updateRegistry(context.registryContext, (latestRegistry) => {
    const latestExisting =
      (latestRegistry.sessions || []).find((session) => session.id === sessionId) || existing;
    return upsertSession(latestRegistry, {
      ...latestExisting,
      status: SESSION_STATUSES.detached,
      updatedAt,
      detachedAt: updatedAt,
      metadataSyncedAt: updatedAt,
    });
  });
  return savedRegistry.sessions.find((session) => session.id === sessionId);
}

async function renameSessionById({ worktreePath, sessionId, name, cellId, projectRoot }) {
  const context = await resolveSessionServiceContext({
    cellId,
    worktreePath,
    projectRoot,
  });
  const projectMetadata = context.attachedWorktreePath
    ? await resolveProjectMetadata({
        worktreePath: context.attachedWorktreePath,
        projectRoot: context.repoRoot,
      })
    : { projectRoot: context.repoRoot, projectName: path.basename(context.repoRoot) };
  const registry = await readRegistry(context.registryContext);
  const existing = registry.sessions.find((session) => session.id === sessionId);
  if (!existing) {
    throw new Error('Session not found.');
  }
  const trimmed = String(name || '').trim();
  if (!trimmed) {
    throw new Error('Session name cannot be empty.');
  }
  const updatedAt = new Date().toISOString();
  let metadataSyncedAt = existing?.metadataSyncedAt || undefined;
  try {
    if (await hasSession(existing.tmuxSession)) {
      metadataSyncedAt = updatedAt;
      await syncSessionTmuxMetadata({
        worktreePath: context.attachedWorktreePath || context.worktreePath,
        projectMetadata,
        session: {
          ...existing,
          name: trimmed,
          updatedAt,
          metadataSyncedAt,
        },
        status: existing.status,
      });
    }
  } catch (_error) {
    // Metadata sync is best effort.
  }
  const savedRegistry = await updateRegistry(context.registryContext, (latestRegistry) => {
    const latestExisting = (latestRegistry.sessions || []).find((session) => session.id === sessionId);
    if (!latestExisting) {
      throw new Error('Session not found.');
    }
    return upsertSession(latestRegistry, {
      ...latestExisting,
      name: trimmed,
      updatedAt,
      metadataSyncedAt,
    });
  });
  return savedRegistry.sessions.find((session) => session.id === sessionId);
}

async function updateSessionMeta({ worktreePath, sessionId, avatar, cellId, projectRoot }) {
  const context = await resolveSessionServiceContext({
    cellId,
    worktreePath,
    projectRoot,
  });
  const registry = await readRegistry(context.registryContext);
  const existing = registry.sessions.find((session) => session.id === sessionId);
  if (!existing) {
    throw new Error('Session not found.');
  }
  const updatedAt = new Date().toISOString();
  const nextRegistry = await updateRegistry(context.registryContext, (latestRegistry) => {
    const latestExisting =
      (latestRegistry.sessions || []).find((session) => session.id === sessionId) || existing;
    const updatedSession = { ...latestExisting, updatedAt };
    if (avatar === null || avatar === undefined || String(avatar).trim() === '') {
      delete updatedSession.avatar;
    } else {
      updatedSession.avatar = String(avatar).trim();
    }
    return upsertSession(latestRegistry, updatedSession);
  });
  return nextRegistry.sessions.find((session) => session.id === sessionId);
}

async function moveSessionNodeById({
  worktreePath,
  sessionId,
  parentSessionId = null,
  beforeSessionId = null,
  cellId,
  projectRoot,
}) {
  const context = await resolveSessionServiceContext({
    cellId,
    worktreePath,
    projectRoot,
  });
  const registry = await readRegistry(context.registryContext);
  const updatedAt = new Date().toISOString();
  const nextRegistry = await updateRegistry(context.registryContext, (latestRegistry) => {
    const moved = moveSessionNodeInRegistry(latestRegistry, {
      sessionId,
      parentSessionId,
      beforeSessionId,
    });
    if (!moved.changed) {
      return latestRegistry;
    }
    return {
      ...moved.registry,
      sessions: moved.registry.sessions.map((session) =>
        session.id === sessionId ? { ...session, updatedAt } : session
      ),
    };
  });
  return nextRegistry.sessions.find((session) => session.id === sessionId) || null;
}

async function setSessionMouse({ worktreePath, sessionId, enabled = true, cellId, projectRoot }) {
  const context = await resolveSessionServiceContext({
    cellId,
    worktreePath,
    projectRoot,
  });
  const runtimeRoot = ensureSessionRuntimeRoot(context, 'Cell runtime root is missing.');
  ensureWorktreePath(runtimeRoot.path);
  await ensureTmuxAvailable();
  const registry = await readRegistry(context.registryContext);
  const existing = registry.sessions.find((session) => session.id === sessionId);
  if (!existing) {
    throw new Error('Session not found.');
  }
  await setMouse(existing.tmuxSession, Boolean(enabled));
  return { sessionId, enabled: Boolean(enabled) };
}

async function resolveSessionForAttach({ worktreePath, sessionId, cellId, projectRoot }) {
  const context = await resolveSessionServiceContext({
    cellId,
    worktreePath,
    projectRoot,
  });
  const runtimeRoot = ensureSessionRuntimeRoot(context, 'Cell runtime root is missing.');
  ensureWorktreePath(runtimeRoot.path);
  await ensureTmuxAvailable();
  const projectMetadata = await resolveProjectMetadata({
    worktreePath: runtimeRoot.path,
    projectRoot: context.repoRoot,
  });
  const registry = await readRegistry(context.registryContext);
  const existing = registry.sessions.find((session) => session.id === sessionId);
  if (!existing) {
    throw new Error('Session not found. Create a session first.');
  }
  const isAlive = await hasSession(existing.tmuxSession);
  if (!isAlive) {
    await updateRegistry(context.registryContext, (latestRegistry) => {
      const latestExisting =
        (latestRegistry.sessions || []).find((session) => session.id === sessionId) || existing;
      return upsertSession(latestRegistry, {
        ...latestExisting,
        status: SESSION_STATUSES.stale,
        updatedAt: new Date().toISOString(),
      });
    });
    throw new Error('Session is stale. Create a new session.');
  }
  const updatedAt = new Date().toISOString();
  const nextRegistry = await updateRegistry(context.registryContext, (latestRegistry) => {
    const latestExisting =
      (latestRegistry.sessions || []).find((session) => session.id === sessionId) || existing;
    return upsertSession(latestRegistry, {
      ...latestExisting,
      status: SESSION_STATUSES.active,
      updatedAt,
      lastAttachedAt: updatedAt,
      metadataSyncedAt: updatedAt,
    });
  });
  await setMouse(existing.tmuxSession, true);
  await setExtendedKeys(existing.tmuxSession, true);
  const resolved = nextRegistry.sessions.find((session) => session.id === sessionId);
  await syncSessionTmuxMetadata({
    worktreePath: runtimeRoot.path,
    runtimeRootKind: runtimeRoot.kind,
    projectMetadata,
    session: resolved,
    status: SESSION_STATUSES.active,
  });
  return resolved;
}

async function resolveSessionForPreview({ worktreePath, sessionId, cellId, projectRoot }) {
  const context = await resolveSessionServiceContext({
    cellId,
    worktreePath,
    projectRoot,
  });
  const runtimeRoot = ensureSessionRuntimeRoot(context, 'Cell runtime root is missing.');
  ensureWorktreePath(runtimeRoot.path);
  await ensureTmuxAvailable();
  const registry = await readRegistry(context.registryContext);
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
  moveSessionNodeById,
  setSessionMouse,
  resolveSessionServiceContext,
  resolveOptionalSessionRuntimeRoot,
  ensureSessionRuntimeRoot,
  resolveSessionForAttach,
  resolveSessionForPreview,
  buildTmuxSessionName,
  SESSION_STATUSES,
};
