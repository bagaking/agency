export const SESSION_TREE_INDENT_PX = 16;

const ROOT_PARENT_KEY = '__root__';
const DEFAULT_ORDER_STEP = 1000;

type SessionLike = Record<string, any>;

export type AgentCellSessionTreeRow = {
  id: string;
  session: SessionLike;
  depth: number;
  parentSessionId: string | null;
  storedParentSessionId: string | null;
  childSessionIds: string[];
  ancestorSessionIds: string[];
};

export type AgentCellSessionTreeProjection = {
  rows: AgentCellSessionTreeRow[];
  rowsById: Record<string, AgentCellSessionTreeRow>;
  childSessionIdsByParentId: Record<string, string[]>;
  rootSessionIds: string[];
  overflowDetachedSessions: SessionLike[];
  overflowClosedSessions: SessionLike[];
};

function normalizeId(value: unknown): string {
  return String(value || '').trim();
}

function normalizeOptionalId(value: unknown): string | null {
  const normalized = normalizeId(value);
  return normalized || null;
}

function normalizeOrder(value: unknown, fallbackIndex: number): number {
  const parsed = Number(value);
  if (Number.isFinite(parsed)) {
    return Math.max(DEFAULT_ORDER_STEP, Math.floor(parsed));
  }
  return (fallbackIndex + 1) * DEFAULT_ORDER_STEP;
}

function sortSessions(list: Array<{ session: SessionLike; index: number }>) {
  return [...list].sort((left, right) => {
    const leftOrder = normalizeOrder(left.session?.order, left.index);
    const rightOrder = normalizeOrder(right.session?.order, right.index);
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }
    return left.index - right.index;
  });
}

function isVisibleInSidebar(session: SessionLike, activeSessionId: string | null): boolean {
  const status = String(session?.status || '').trim().toLowerCase();
  if (status === 'closed') {
    return false;
  }
  if (status === 'detached') {
    return normalizeId(session?.id) === normalizeId(activeSessionId);
  }
  return true;
}

function buildNormalizedSessions(sessions: SessionLike[]): Array<{ session: SessionLike; index: number }> {
  return (Array.isArray(sessions) ? sessions : [])
    .map((session, index) => {
      const normalized = {
        ...(session || {}),
        id: normalizeId(session?.id),
        parentSessionId: normalizeOptionalId(session?.parentSessionId),
        order: normalizeOrder(session?.order, index),
      };
      return { session: normalized, index };
    })
    .filter((entry) => entry.session.id);
}

function resolveVisibleParentSessionId({
  session,
  sessionsById,
  visibleIds,
}: {
  session: SessionLike;
  sessionsById: Map<string, SessionLike>;
  visibleIds: Set<string>;
}): string | null {
  let parentSessionId = normalizeOptionalId(session?.parentSessionId);
  const seen = new Set<string>();
  while (parentSessionId) {
    if (seen.has(parentSessionId)) {
      return null;
    }
    seen.add(parentSessionId);
    if (visibleIds.has(parentSessionId)) {
      return parentSessionId;
    }
    const parentSession = sessionsById.get(parentSessionId);
    parentSessionId = normalizeOptionalId(parentSession?.parentSessionId);
  }
  return null;
}

function buildChildSessionIdsByParentId({
  visibleEntries,
  sessionsById,
  visibleIds,
}: {
  visibleEntries: Array<{ session: SessionLike; index: number }>;
  sessionsById: Map<string, SessionLike>;
  visibleIds: Set<string>;
}): Map<string, string[]> {
  const grouped = new Map<string, Array<{ session: SessionLike; index: number }>>();

  visibleEntries.forEach((entry) => {
    const parentSessionId = resolveVisibleParentSessionId({
      session: entry.session,
      sessionsById,
      visibleIds,
    });
    const parentKey = parentSessionId || ROOT_PARENT_KEY;
    if (!grouped.has(parentKey)) {
      grouped.set(parentKey, []);
    }
    grouped.get(parentKey)?.push(entry);
  });

  const childSessionIdsByParentId = new Map<string, string[]>();
  grouped.forEach((entries, parentKey) => {
    const sortedEntries = sortSessions(entries);
    childSessionIdsByParentId.set(
      parentKey,
      sortedEntries.map((entry) => entry.session.id)
    );
  });

  return childSessionIdsByParentId;
}

export function projectAgentCellSessionTree({
  sessions,
  activeSessionId = null,
}: {
  sessions: SessionLike[] | null | undefined;
  activeSessionId?: string | null;
}): AgentCellSessionTreeProjection {
  const normalizedEntries = buildNormalizedSessions(Array.isArray(sessions) ? sessions : []);
  const sessionsById = new Map(
    normalizedEntries.map((entry) => [entry.session.id, entry.session] as const)
  );

  const visibleEntries = normalizedEntries.filter((entry) =>
    isVisibleInSidebar(entry.session, activeSessionId)
  );
  const overflowDetachedSessions = normalizedEntries
    .filter((entry) => {
      const status = String(entry.session?.status || '').trim().toLowerCase();
      return status === 'detached' && entry.session.id !== normalizeId(activeSessionId);
    })
    .map((entry) => entry.session);
  const overflowClosedSessions = normalizedEntries
    .filter((entry) => String(entry.session?.status || '').trim().toLowerCase() === 'closed')
    .map((entry) => entry.session);

  const visibleIds = new Set(visibleEntries.map((entry) => entry.session.id));
  const childSessionIdsByParentMap = buildChildSessionIdsByParentId({
    visibleEntries,
    sessionsById,
    visibleIds,
  });

  const rows: AgentCellSessionTreeRow[] = [];
  const rowsById: Record<string, AgentCellSessionTreeRow> = {};
  const childSessionIdsByParentId: Record<string, string[]> = {};

  childSessionIdsByParentMap.forEach((childSessionIds, parentKey) => {
    childSessionIdsByParentId[parentKey] = childSessionIds;
  });

  const appendRows = (
    sessionId: string,
    parentSessionId: string | null,
    depth: number,
    ancestorSessionIds: string[]
  ) => {
    const session = sessionsById.get(sessionId);
    if (!session) {
      return;
    }
    const childSessionIds = childSessionIdsByParentMap.get(sessionId) || [];
    const row: AgentCellSessionTreeRow = {
      id: sessionId,
      session,
      depth,
      parentSessionId,
      storedParentSessionId: normalizeOptionalId(session.parentSessionId),
      childSessionIds,
      ancestorSessionIds,
    };
    rows.push(row);
    rowsById[sessionId] = row;
    childSessionIds.forEach((childSessionId) => {
      appendRows(childSessionId, sessionId, depth + 1, [...ancestorSessionIds, sessionId]);
    });
  };

  const rootSessionIds = childSessionIdsByParentMap.get(ROOT_PARENT_KEY) || [];
  rootSessionIds.forEach((sessionId) => {
    appendRows(sessionId, null, 0, []);
  });

  return {
    rows,
    rowsById,
    childSessionIdsByParentId,
    rootSessionIds,
    overflowDetachedSessions,
    overflowClosedSessions,
  };
}
