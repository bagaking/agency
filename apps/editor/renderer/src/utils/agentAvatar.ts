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

const importMetaWithGlob = import.meta as ImportMeta & {
  glob?: (
    pattern: string,
    options?: {
      query?: string;
      import?: string;
    }
  ) => Record<string, () => Promise<string>>;
};

// `import.meta.glob` is only available under Vite. Tests that execute via plain tsx
// still import this module, so they need a safe empty fallback.
const avatarImporters =
  typeof importMetaWithGlob.glob === 'function'
    ? importMetaWithGlob.glob(
        '../../../../node_modules/@bagakit/open-agent-avatars/20260202/*.svg',
        {
          query: '?url',
          import: 'default',
        }
      )
    : {};

const avatarImporterEntries = Object.entries(avatarImporters)
  .map(([filePath, loader]) => {
    const match = filePath.match(/\/([^/]+)\.svg$/);
    return [normalizeAvatarId(match?.[1] || ''), loader] as const;
  })
  .filter(([avatarId]) => Boolean(avatarId))
  .sort(([left], [right]) => left.localeCompare(right));

export const AVATAR_IDS = avatarImporterEntries.map(([avatarId]) => avatarId);

const AVATAR_ID_SET = new Set(AVATAR_IDS);
const avatarImporterById = new Map(avatarImporterEntries);
const avatarCatalog = new Map<string, string>();
const avatarCatalogPromises = new Map<string, Promise<string | null>>();

export const getAvatarUrl = (avatarId) => {
  const key = normalizeAvatarId(avatarId);
  return avatarCatalog.get(key) || null;
};

export const ensureAvatarUrlLoaded = async (avatarId) => {
  const key = normalizeAvatarId(avatarId);
  if (!key || !AVATAR_ID_SET.has(key)) {
    return null;
  }
  const cached = avatarCatalog.get(key);
  if (cached) {
    return cached;
  }
  const existingPromise = avatarCatalogPromises.get(key);
  if (existingPromise) {
    return existingPromise;
  }
  const importer = avatarImporterById.get(key);
  if (!importer) {
    return null;
  }
  const nextPromise = importer()
    .then((url) => {
      const normalizedUrl = String(url || '').trim();
      if (normalizedUrl) {
        avatarCatalog.set(key, normalizedUrl);
        return normalizedUrl;
      }
      return null;
    })
    .finally(() => {
      avatarCatalogPromises.delete(key);
    });
  avatarCatalogPromises.set(key, nextPromise);
  return nextPromise;
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
      .filter((id) => id && AVATAR_ID_SET.has(id));
  } catch (error) {
    return [];
  }
};

export const recordRecentAvatarId = (avatarId) => {
  if (typeof window === 'undefined') {
    return [];
  }
  const resolved = normalizeAvatarId(avatarId);
  if (!resolved || !AVATAR_ID_SET.has(resolved)) {
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
    if (normalized && AVATAR_ID_SET.has(normalized)) {
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
  if (explicit && AVATAR_ID_SET.has(explicit)) {
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
