export const DEFAULT_FONT_SIZE = 13;
export const MIN_FONT_SIZE = 10;
export const MAX_FONT_SIZE = 20;
export const ACTIVITY_BOOTSTRAP_THRESHOLD_MS = 30000;
export const ATTACH_ACTIVITY_GRACE_MS = 5 * 1000;
export const DETACHED_ACTIVITY_POLL_MS = 10 * 1000;

export const buildSessionKey = (cellId, sessionId) => `${cellId}:${sessionId}`;

export const clampFontSize = (value) =>
  Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, value));

export const normalizeTerminalText = (text) =>
  String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n/g, '\r');

export const filterOpenSessions = (sessions, preferredSessionId) => {
  const list = Array.isArray(sessions) ? sessions : [];
  return list.filter((session) => {
    if (session?.status === 'closed') {
      return false;
    }
    if (session?.status === 'detached') {
      return session.id === preferredSessionId;
    }
    return true;
  });
};

export const resolveActiveSession = ({ openSessions, preferredSessionId }) => {
  const list = Array.isArray(openSessions) ? openSessions : [];
  return (
    list.find((session) => session.id === preferredSessionId) ||
    list.find((session) => session.status === 'active') ||
    list[0] ||
    null
  );
};

export const mergeSessionActivityTimestamps = ({ current, cellId, sessions }) => {
  const base = current || {};
  const list = Array.isArray(sessions) ? sessions : [];
  const next = { ...base };
  list.forEach((session) => {
    const timestamp = Date.parse(session?.lastActivityAt || '');
    if (!Number.isFinite(timestamp)) {
      return;
    }
    const key = buildSessionKey(cellId, session.id);
    const existing = base[key];
    if (!Number.isFinite(existing) || timestamp > existing) {
      next[key] = timestamp;
    }
  });
  return next;
};
