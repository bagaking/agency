const OFFLINE_SESSION_STATUSES = new Set(['closed', 'stale', 'archived']);
const OFFLINE_CELL_STATES = new Set(['archived', 'closed']);

const TYPE_PALETTES = {
  active: ['#34d399', '#10b981', '#6ee7b7', '#2dd4bf'],
  draft: ['#60a5fa', '#38bdf8', '#93c5fd', '#818cf8'],
  archived: ['#94a3b8', '#cbd5f5', '#a1a1aa', '#d4d4d8'],
  closed: ['#94a3b8', '#a1a1aa', '#cbd5f5', '#d4d4d8'],
  default: ['#f472b6', '#a78bfa', '#f59e0b', '#22d3ee'],
};

const normalizeTypeKey = (value) => {
  const key = String(value || '').trim().toLowerCase();
  return key || 'default';
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

export const isCellOffline = (cell) => OFFLINE_CELL_STATES.has(cell?.state);

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
  config = {},
} = {}) {
  const stats = {
    cells: cells.length,
    sessions: 0,
    online: 0,
    offline: 0,
  };
  const typeIndexByKey = new Map();

  const clusters = cells.map((cell) => {
    const typeKey = normalizeTypeKey(cell?.state);
    const typeIndex = typeIndexByKey.get(typeKey) || 0;
    typeIndexByKey.set(typeKey, typeIndex + 1);
    const color = resolveFactionColor({ cell, typeKey, typeIndex, config });
    const sessions = (sessionsByCellId[cell.id] || []).map((session) => {
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
      };
    });
    return {
      cell,
      typeKey,
      typeLabel: resolveDisplayLabel(cell?.state),
      color,
      isOffline: isCellOffline(cell),
      sessions,
    };
  });

  return { clusters, stats };
}
