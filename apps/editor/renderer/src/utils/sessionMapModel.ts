const OFFLINE_SESSION_STATUSES = new Set(['closed', 'stale', 'archived']);
const OFFLINE_CELL_STATES = new Set(['archived', 'closed']);

const TYPE_PALETTES = {
  active: ['#34d399', '#10b981', '#6ee7b7', '#2dd4bf'],
  draft: ['#60a5fa', '#38bdf8', '#93c5fd', '#818cf8'],
  archived: ['#94a3b8', '#cbd5f5', '#a1a1aa', '#d4d4d8'],
  closed: ['#94a3b8', '#a1a1aa', '#cbd5f5', '#d4d4d8'],
  default: ['#f472b6', '#a78bfa', '#f59e0b', '#22d3ee'],
};

const CELL_STATE_ORDER = ['active', 'draft', 'archived', 'closed'];
const SESSION_STATUS_ORDER = ['active', 'detached', 'stale', 'closed', 'archived'];

const normalizeTypeKey = (value) => {
  const key = String(value || '').trim().toLowerCase();
  return key || 'default';
};

const resolveOrderIndex = (value, order) => {
  const index = order.indexOf(value);
  return index === -1 ? order.length : index;
};

const parseTimestamp = (value) => {
  if (!value) {
    return 0;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const resolveTypePalette = (typeKey) =>
  TYPE_PALETTES[typeKey] || TYPE_PALETTES.default;

const resolveColorOverride = (value) => {
  if (!value) {
    return '';
  }
  const trimmed = String(value).trim();
  return trimmed || '';
};

const resolveFactionColor = ({ cell, typeKey, typeIndex, config }) => {
  const cellOverride = resolveColorOverride(config?.cellColors?.[cell?.id]);
  if (cellOverride) {
    return cellOverride;
  }
  const typeOverride = resolveColorOverride(config?.typeColors?.[typeKey]);
  if (typeOverride) {
    return typeOverride;
  }
  const palette = resolveTypePalette(typeKey);
  const index = Number.isFinite(typeIndex) ? typeIndex : 0;
  return palette[index % palette.length];
};

const resolveDisplayLabel = (value) => {
  const text = String(value || '').trim();
  if (!text) {
    return 'Unknown';
  }
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export const isCellOffline = (cell) =>
  OFFLINE_CELL_STATES.has(cell?.state) ||
  ['detached', 'missing'].includes(String(cell?.attachmentState || '').trim().toLowerCase());

export const isSessionOffline = (session, cell) => {
  if (isCellOffline(cell)) {
    return true;
  }
  return OFFLINE_SESSION_STATUSES.has(session?.status);
};

export function buildSessionMapModel({
  cells = [],
  sessionsByCellId = {},
  activeSessionByCellId = {},
  sessionActivityByKey = {},
  sessionVisitedByKey = {},
  config = {},
  profilesById = null,
} = {}) {
  const sortedCells = [...cells].sort((a, b) => {
    const aType = normalizeTypeKey(a?.state);
    const bType = normalizeTypeKey(b?.state);
    const typeDelta =
      resolveOrderIndex(aType, CELL_STATE_ORDER) - resolveOrderIndex(bType, CELL_STATE_ORDER);
    if (typeDelta !== 0) {
      return typeDelta;
    }
    const aCreated = parseTimestamp(a?.createdAt);
    const bCreated = parseTimestamp(b?.createdAt);
    if (aCreated !== bCreated) {
      return aCreated - bCreated;
    }
    return String(a?.name || '').localeCompare(String(b?.name || ''));
  });

  const stats = {
    cells: sortedCells.length,
    sessions: 0,
    online: 0,
    offline: 0,
    visibleCells: 0,
    ghostCells: 0,
  };
  const typeIndexByKey = new Map();

  const clusters = sortedCells.map((cell) => {
    const typeKey = normalizeTypeKey(cell?.state);
    const typeIndex = typeIndexByKey.get(typeKey) || 0;
    typeIndexByKey.set(typeKey, typeIndex + 1);
    const color = resolveFactionColor({ cell, typeKey, typeIndex, config });
    const sessions = [...(sessionsByCellId[cell.id] || [])]
      .sort((a, b) => {
        const statusDelta =
          resolveOrderIndex(a?.status, SESSION_STATUS_ORDER) -
          resolveOrderIndex(b?.status, SESSION_STATUS_ORDER);
        if (statusDelta !== 0) {
          return statusDelta;
        }
        const aCreated = parseTimestamp(a?.createdAt);
        const bCreated = parseTimestamp(b?.createdAt);
        if (aCreated !== bCreated) {
          return aCreated - bCreated;
        }
        return String(a?.name || '').localeCompare(String(b?.name || ''));
      })
      .map((session) => {
      const offline = isSessionOffline(session, cell);
      stats.sessions += 1;
      if (offline) {
        stats.offline += 1;
      } else {
        stats.online += 1;
      }
      return {
        ...session,
        isOffline: offline,
        isActive: activeSessionByCellId[cell.id] === session.id,
        lastActivityAt: sessionActivityByKey[`${cell.id}:${session.id}`] || null,
        lastVisitedAt: sessionVisitedByKey[`${cell.id}:${session.id}`] || null,
        startCommand: profilesById?.get
          ? profilesById.get(session.profileId || 'shell')?.startCommand || ''
          : '',
      };
    });
    const activeSessions = sessions.filter((session) => !session.isOffline);
    const isGhost = isCellOffline(cell) || activeSessions.length === 0;
    if (isGhost) {
      stats.ghostCells += 1;
    } else {
      stats.visibleCells += 1;
    }

    return {
      cell,
      typeKey,
      typeLabel: resolveDisplayLabel(cell?.state),
      color,
      isOffline: isCellOffline(cell),
      isGhost,
      sessions,
      activeSessions,
    };
  });

  return {
    clusters: clusters.filter((cluster) => !cluster.isGhost),
    ghostClusters: clusters.filter((cluster) => cluster.isGhost),
    stats,
  };
}
