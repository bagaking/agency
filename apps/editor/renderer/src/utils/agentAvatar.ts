import * as avatarBatch from '@bagakit/open-agent-avatars/20260202';

const AVATAR_MAP = Object.entries(avatarBatch).reduce((acc, [key, value]) => {
  if (typeof value === 'string') {
    acc[key] = value;
  }
  return acc;
}, {});

export const AVATAR_IDS = Object.keys(AVATAR_MAP).sort();
const RECENT_STORAGE_KEY = 'agency.avatar.recents';
const RECENT_LIMIT = 9;
let avatarCursor = 0;

const hashString = (input) => {
  const text = String(input || '');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

const normalizeAvatarId = (value) => {
  const raw = String(value || '').trim();
  if (!raw) {
    return '';
  }
  return raw.replace(/[\s/\\-]+/g, '_').toUpperCase();
};

export const getAvatarUrl = (avatarId) => {
  const key = normalizeAvatarId(avatarId);
  return AVATAR_MAP[key] || null;
};

export const getRecentAvatarIds = () => {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = window.localStorage?.getItem(RECENT_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((value) => normalizeAvatarId(value))
      .filter((id) => id && AVATAR_MAP[id]);
  } catch (error) {
    return [];
  }
};

export const recordRecentAvatarId = (avatarId) => {
  if (typeof window === 'undefined') {
    return [];
  }
  const resolved = normalizeAvatarId(avatarId);
  if (!resolved || !AVATAR_MAP[resolved]) {
    return getRecentAvatarIds();
  }
  const existing = getRecentAvatarIds();
  const next = [resolved, ...existing.filter((id) => id !== resolved)].slice(0, RECENT_LIMIT);
  try {
    window.localStorage?.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    // Ignore persistence errors.
  }
  return next;
};

export const resolveAvatarId = (input = {}) => {
  if (typeof input === 'string') {
    const normalized = normalizeAvatarId(input);
    if (normalized && AVATAR_MAP[normalized]) {
      return normalized;
    }
    if (!AVATAR_IDS.length) {
      return '';
    }
    return AVATAR_IDS[hashString(input) % AVATAR_IDS.length];
  }
  const safeInput: any = input && typeof input === 'object' ? input : {};
  const { avatar, id, name } = safeInput;
  const explicit = normalizeAvatarId(avatar);
  if (explicit && AVATAR_MAP[explicit]) {
    return explicit;
  }
  const seed = String(id || name || explicit || '');
  if (!AVATAR_IDS.length) {
    return '';
  }
  if (!seed) {
    return AVATAR_IDS[0];
  }
  return AVATAR_IDS[hashString(seed) % AVATAR_IDS.length];
};

export const resolveSessionAvatarId = (session, cell) => {
  if (!session && !cell) {
    return '';
  }
  if (session?.avatar) {
    return resolveAvatarId({
      avatar: session.avatar,
      id: session.id,
      name: session.name,
    });
  }
  const cellResolved = cell ? resolveAvatarId(cell) : '';
  if (cellResolved) {
    return cellResolved;
  }
  if (!session) {
    return '';
  }
  return resolveAvatarId({ id: session.id, name: session.name });
};

export const pickSessionAvatarId = (sessions = []) => {
  if (!AVATAR_IDS.length) {
    return '';
  }
  const counts = new Map(AVATAR_IDS.map((id) => [id, 0]));
  const activeSessions = Array.isArray(sessions)
    ? sessions.filter((session) => session && ['active', 'detached'].includes(session.status))
    : [];

  activeSessions.forEach((session) => {
    const resolved = resolveAvatarId({
      avatar: session.avatar,
      id: session.id,
      name: session.name,
    });
    if (!resolved) {
      return;
    }
    counts.set(resolved, (counts.get(resolved) || 0) + 1);
  });

  let minCount = Number.POSITIVE_INFINITY;
  counts.forEach((value) => {
    if (value < minCount) {
      minCount = value;
    }
  });
  const candidates = AVATAR_IDS.filter((id) => (counts.get(id) || 0) === minCount);
  const safeCandidates = candidates.length ? candidates : AVATAR_IDS;
  const pickIndex = avatarCursor % safeCandidates.length;
  const chosen = safeCandidates[pickIndex];
  const globalIndex = AVATAR_IDS.indexOf(chosen);
  avatarCursor = globalIndex >= 0 ? (globalIndex + 1) % AVATAR_IDS.length : avatarCursor + 1;
  return chosen;
};
