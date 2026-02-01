export const AVATAR_IDS = ['fox', 'cat', 'owl', 'robot', 'frog', 'panda', 'whale', 'bear'];

const hashString = (input) => {
  const text = String(input || '');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

export const resolveAvatarId = (input = {}) => {
  const safeInput = input && typeof input === 'object' ? input : {};
  const { avatar, id, name } = safeInput;
  const explicit = String(avatar || '').trim();
  if (explicit && AVATAR_IDS.includes(explicit)) {
    return explicit;
  }
  const seed = String(id || name || explicit || '');
  if (!seed) {
    return AVATAR_IDS[0];
  }
  return AVATAR_IDS[hashString(seed) % AVATAR_IDS.length];
};

export const pickSessionAvatarId = (sessions = []) => {
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
    counts.set(resolved, (counts.get(resolved) || 0) + 1);
  });

  const unused = AVATAR_IDS.find((id) => (counts.get(id) || 0) === 0);
  if (unused) {
    return unused;
  }
  let best = AVATAR_IDS[0];
  let min = counts.get(best) || 0;
  AVATAR_IDS.forEach((id) => {
    const value = counts.get(id) || 0;
    if (value < min) {
      min = value;
      best = id;
    }
  });
  return best;
};
