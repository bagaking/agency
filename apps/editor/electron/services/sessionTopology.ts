export const SESSION_REGISTRY_VERSION = 2;
export const SESSION_ORDER_STEP = 1000;
export const SESSION_NODE_KINDS = {
  ROOT: 'root',
  SUB_TERMINAL: 'sub_terminal',
  FORK: 'fork',
} as const;

export type SessionNodeKind =
  (typeof SESSION_NODE_KINDS)[keyof typeof SESSION_NODE_KINDS];

type SessionRecord = Record<string, any>;
type SessionRegistry = {
  version?: number;
  sessions?: SessionRecord[];
};

type NormalizedRegistryResult = {
  registry: {
    version: number;
    sessions: SessionRecord[];
  };
  changed: boolean;
};

const KNOWN_NODE_KINDS = new Set<string>(Object.values(SESSION_NODE_KINDS));

function normalizeId(value: unknown): string {
  return String(value || '').trim();
}

function normalizeOptionalId(value: unknown): string | null {
  const normalized = normalizeId(value);
  return normalized || null;
}

function normalizeNodeKind(value: unknown): SessionNodeKind {
  const normalized = normalizeId(value).toLowerCase();
  if (KNOWN_NODE_KINDS.has(normalized)) {
    return normalized as SessionNodeKind;
  }
  return SESSION_NODE_KINDS.ROOT;
}

function normalizeOrder(value: unknown, fallbackIndex: number): number {
  const parsed = Number(value);
  if (Number.isFinite(parsed)) {
    return Math.max(SESSION_ORDER_STEP, Math.floor(parsed));
  }
  return (fallbackIndex + 1) * SESSION_ORDER_STEP;
}

function cloneSession(session: SessionRecord): SessionRecord {
  return { ...(session || {}) };
}

function sessionsEqual(left: SessionRecord, right: SessionRecord): boolean {
  const leftKeys = Object.keys(left || {}).sort();
  const rightKeys = Object.keys(right || {}).sort();
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }
  for (let index = 0; index < leftKeys.length; index += 1) {
    if (leftKeys[index] !== rightKeys[index]) {
      return false;
    }
    const key = leftKeys[index];
    if (left[key] !== right[key]) {
      return false;
    }
  }
  return true;
}

function buildNormalizedSession(session: SessionRecord, index: number): SessionRecord {
  const next = cloneSession(session);
  const sessionId = normalizeId(next.id);
  const parentSessionId = normalizeOptionalId(next.parentSessionId);
  next.id = sessionId;
  next.parentSessionId =
    parentSessionId && parentSessionId !== sessionId ? parentSessionId : null;
  next.order = normalizeOrder(next.order, index);
  next.nodeKind = normalizeNodeKind(next.nodeKind);

  const sourceSessionId = normalizeOptionalId(next.sourceSessionId);
  if (sourceSessionId && sourceSessionId !== sessionId) {
    next.sourceSessionId = sourceSessionId;
  } else {
    delete next.sourceSessionId;
  }

  return next;
}

function sortSessionsByOrder(sessions: SessionRecord[]): SessionRecord[] {
  return [...sessions].sort((left, right) => {
    const leftOrder = normalizeOrder(left?.order, 0);
    const rightOrder = normalizeOrder(right?.order, 0);
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }
    return normalizeId(left?.id).localeCompare(normalizeId(right?.id));
  });
}

function findSiblingIds(
  sessions: SessionRecord[],
  parentSessionId: string | null,
  excludeSessionId = ''
): string[] {
  return sortSessionsByOrder(
    sessions.filter((session) => {
      const sessionId = normalizeId(session?.id);
      if (!sessionId || sessionId === excludeSessionId) {
        return false;
      }
      return normalizeOptionalId(session?.parentSessionId) === parentSessionId;
    })
  ).map((session) => normalizeId(session.id));
}

function buildSessionMap(sessions: SessionRecord[]): Map<string, SessionRecord> {
  return new Map(
    sessions
      .map((session) => [normalizeId(session?.id), session] as const)
      .filter(([id]) => Boolean(id))
  );
}

function getAncestorSessionIds(
  sessionsById: Map<string, SessionRecord>,
  sessionId: string
): Set<string> {
  const ancestors = new Set<string>();
  let cursor = sessionsById.get(sessionId);
  let guard = 0;
  while (cursor && guard < sessionsById.size + 1) {
    const parentId = normalizeOptionalId(cursor.parentSessionId);
    if (!parentId) {
      break;
    }
    if (ancestors.has(parentId)) {
      break;
    }
    ancestors.add(parentId);
    cursor = sessionsById.get(parentId);
    guard += 1;
  }
  return ancestors;
}

function repairMissingParents(sessions: SessionRecord[]): boolean {
  const sessionsById = buildSessionMap(sessions);
  let changed = false;
  sessions.forEach((session) => {
    const sessionId = normalizeId(session.id);
    const parentSessionId = normalizeOptionalId(session.parentSessionId);
    if (!parentSessionId) {
      return;
    }
    if (parentSessionId === sessionId || !sessionsById.has(parentSessionId)) {
      session.parentSessionId = null;
      changed = true;
    }
  });
  return changed;
}

function repairCycles(sessions: SessionRecord[]): boolean {
  const sessionsById = buildSessionMap(sessions);
  let changed = false;
  sessions.forEach((session) => {
    const seen = new Set<string>();
    let current = session;
    while (current) {
      const currentId = normalizeId(current.id);
      if (!currentId) {
        break;
      }
      seen.add(currentId);
      const parentId = normalizeOptionalId(current.parentSessionId);
      if (!parentId) {
        break;
      }
      if (seen.has(parentId)) {
        current.parentSessionId = null;
        changed = true;
        break;
      }
      current = sessionsById.get(parentId) || null;
    }
  });
  return changed;
}

function renumberSiblingOrders(
  sessionsById: Map<string, SessionRecord>,
  sessionIds: string[]
): boolean {
  let changed = false;
  sessionIds.forEach((sessionId, index) => {
    const session = sessionsById.get(sessionId);
    if (!session) {
      return;
    }
    const nextOrder = (index + 1) * SESSION_ORDER_STEP;
    if (session.order !== nextOrder) {
      session.order = nextOrder;
      changed = true;
    }
  });
  return changed;
}

function normalizeRegistrySessions(registry: SessionRegistry): NormalizedRegistryResult {
  const rawSessions = Array.isArray(registry?.sessions) ? registry.sessions : [];
  const rawVersion = Number(registry?.version || 0);
  let changed = rawVersion !== SESSION_REGISTRY_VERSION;
  const sessions = rawSessions
    .map((session, index) => {
      const normalized = buildNormalizedSession(session, index);
      if (!sessionsEqual(normalized, session || {})) {
        changed = true;
      }
      return normalized;
    })
    .filter((session) => normalizeId(session.id));
  if (sessions.length !== rawSessions.length) {
    changed = true;
  }

  if (repairMissingParents(sessions)) {
    changed = true;
  }
  if (repairCycles(sessions)) {
    changed = true;
  }

  const sessionsById = buildSessionMap(sessions);
  const parentIds = new Set<string | null>(
    sessions.map((session) => normalizeOptionalId(session.parentSessionId))
  );
  parentIds.forEach((parentSessionId) => {
    const siblingIds = findSiblingIds(sessions, parentSessionId);
    if (renumberSiblingOrders(sessionsById, siblingIds)) {
      changed = true;
    }
  });

  return {
    registry: {
      version: SESSION_REGISTRY_VERSION,
      sessions,
    },
    changed,
  };
}

export function normalizeSessionRegistry(registry: SessionRegistry): NormalizedRegistryResult {
  return normalizeRegistrySessions(registry || {});
}

export function buildNewSessionTopologyFields({
  registry,
  parentSessionId = null,
  nodeKind = SESSION_NODE_KINDS.ROOT,
  sourceSessionId = null,
}: {
  registry: SessionRegistry;
  parentSessionId?: string | null;
  nodeKind?: SessionNodeKind;
  sourceSessionId?: string | null;
}): {
  parentSessionId: string | null;
  order: number;
  nodeKind: SessionNodeKind;
  sourceSessionId?: string;
} {
  const { registry: normalized } = normalizeSessionRegistry(registry);
  const parentId = normalizeOptionalId(parentSessionId);
  if (parentId) {
    const sessionsById = buildSessionMap(normalized.sessions);
    if (!sessionsById.has(parentId)) {
      throw new Error('Parent session not found.');
    }
  }
  const siblingIds = findSiblingIds(normalized.sessions, parentId);
  const order = (siblingIds.length + 1) * SESSION_ORDER_STEP;
  const nextNodeKind = normalizeNodeKind(nodeKind);
  const nextSourceSessionId = normalizeOptionalId(sourceSessionId);

  return {
    parentSessionId: parentId,
    order,
    nodeKind: nextNodeKind,
    ...(nextSourceSessionId ? { sourceSessionId: nextSourceSessionId } : {}),
  };
}

export function moveSessionNodeInRegistry(
  registry: SessionRegistry,
  {
    sessionId,
    parentSessionId = null,
    beforeSessionId = null,
  }: {
    sessionId: string;
    parentSessionId?: string | null;
    beforeSessionId?: string | null;
  }
): {
  registry: {
    version: number;
    sessions: SessionRecord[];
  };
  changed: boolean;
} {
  const normalizedSessionId = normalizeId(sessionId);
  if (!normalizedSessionId) {
    throw new Error('sessionId is required.');
  }

  const normalizedParentSessionId = normalizeOptionalId(parentSessionId);
  const normalizedBeforeSessionId = normalizeOptionalId(beforeSessionId);
  const { registry: normalized } = normalizeSessionRegistry(registry);
  const sessions = normalized.sessions.map((session) => cloneSession(session));
  const sessionsById = buildSessionMap(sessions);
  const session = sessionsById.get(normalizedSessionId);
  if (!session) {
    throw new Error('Session not found.');
  }

  if (normalizedParentSessionId && !sessionsById.has(normalizedParentSessionId)) {
    throw new Error('Parent session not found.');
  }
  if (normalizedBeforeSessionId && !sessionsById.has(normalizedBeforeSessionId)) {
    throw new Error('beforeSessionId not found.');
  }
  if (normalizedParentSessionId === normalizedSessionId) {
    throw new Error('Session cannot be its own parent.');
  }

  const descendantIds = getAncestorSessionIds(sessionsById, normalizedParentSessionId || '');
  if (normalizedParentSessionId && descendantIds.has(normalizedSessionId)) {
    throw new Error('Cannot move a session under one of its descendants.');
  }

  const previousParentSessionId = normalizeOptionalId(session.parentSessionId);
  const nextParentSessionId = normalizedParentSessionId;

  const currentSiblingIds = findSiblingIds(
    sessions,
    previousParentSessionId,
    normalizedSessionId
  );
  const nextSiblingIds = findSiblingIds(
    sessions,
    nextParentSessionId,
    normalizedSessionId
  );

  let insertIndex = nextSiblingIds.length;
  if (normalizedBeforeSessionId) {
    const beforeSibling = sessionsById.get(normalizedBeforeSessionId);
    const beforeParentId = normalizeOptionalId(beforeSibling?.parentSessionId);
    if (beforeParentId !== nextParentSessionId) {
      throw new Error('beforeSessionId must be a sibling under the target parent.');
    }
    insertIndex = nextSiblingIds.indexOf(normalizedBeforeSessionId);
    if (insertIndex < 0) {
      throw new Error('beforeSessionId must be a sibling under the target parent.');
    }
  }

  const reorderedSiblingIds = [...nextSiblingIds];
  reorderedSiblingIds.splice(insertIndex, 0, normalizedSessionId);

  session.parentSessionId = nextParentSessionId;

  let changed =
    previousParentSessionId !== nextParentSessionId ||
    normalizedBeforeSessionId !== null;

  if (renumberSiblingOrders(sessionsById, reorderedSiblingIds)) {
    changed = true;
  }
  if (
    previousParentSessionId !== nextParentSessionId &&
    renumberSiblingOrders(sessionsById, currentSiblingIds)
  ) {
    changed = true;
  }

  return {
    registry: {
      version: SESSION_REGISTRY_VERSION,
      sessions,
    },
    changed,
  };
}
