export const DEFAULT_FONT_SIZE = 13;
export const MIN_FONT_SIZE = 10;
export const MAX_FONT_SIZE = 20;
export const ACTIVITY_BOOTSTRAP_THRESHOLD_MS = 30000;
export const ATTACH_ACTIVITY_GRACE_MS = 5 * 1000;
export const DETACHED_ACTIVITY_POLL_MS = 10 * 1000;
export const VISIT_ACTIVITY_GRACE_MS = 5 * 1000;

export interface SessionLike {
  id: string;
  status?: string;
  lastActivityAt?: string | null;
}

export const buildSessionKey = (cellId: string, sessionId: string): string =>
  `${cellId}:${sessionId}`;

export const clampFontSize = (value: number): number =>
  Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, value));

export const normalizeTerminalText = (text: string): string =>
  String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n/g, '\r');

export const filterOpenSessions = (
  sessions: SessionLike[] | null | undefined,
  preferredSessionId: string | undefined
): SessionLike[] => {
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

export const resolveActiveSession = ({
  openSessions,
  preferredSessionId,
}: {
  openSessions: SessionLike[] | null | undefined;
  preferredSessionId: string | undefined;
}): SessionLike | null => {
  const list = Array.isArray(openSessions) ? openSessions : [];
  return (
    list.find((session) => session.id === preferredSessionId) ||
    list.find((session) => session.status === 'active') ||
    list[0] ||
    null
  );
};

export const mergeSessionActivityTimestamps = ({
  current,
  cellId,
  sessions,
}: {
  current: Record<string, number> | null | undefined;
  cellId: string;
  sessions: SessionLike[] | null | undefined;
}): Record<string, number> => {
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

export const mergeSessionActivityTimestampsWithSuppression = ({
  current,
  cellId,
  sessions,
  ignoreUntilByKey,
  now = Date.now(),
}: {
  current: Record<string, number> | null | undefined;
  cellId: string;
  sessions: SessionLike[] | null | undefined;
  ignoreUntilByKey?: Record<string, number> | null | undefined;
  now?: number;
}): Record<string, number> => {
  const base = current || {};
  const list = Array.isArray(sessions) ? sessions : [];
  const next = { ...base };
  const suppression = ignoreUntilByKey || {};

  list.forEach((session) => {
    const timestamp = Date.parse(session?.lastActivityAt || '');
    if (!Number.isFinite(timestamp)) {
      return;
    }
    const key = buildSessionKey(cellId, session.id);
    const ignoreUntil = Number(suppression[key] || 0);
    if (Number.isFinite(ignoreUntil) && ignoreUntil > now) {
      return;
    }
    const existing = base[key];
    if (!Number.isFinite(existing) || timestamp > existing) {
      next[key] = timestamp;
    }
  });

  return next;
};
