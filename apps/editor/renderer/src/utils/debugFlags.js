const STORAGE_KEY = 'agency.debugFlags';
export const DEBUG_FLAGS = Object.freeze({
  sessionMapPreview: 'sessionMapPreview',
});

const normalizeList = (value) => {
  if (!value) {
    return [];
  }
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const readFlagSet = () => {
  try {
    const raw = window?.localStorage?.getItem(STORAGE_KEY);
    return new Set(normalizeList(raw));
  } catch (_error) {
    return new Set();
  }
};

export const getDebugFlag = (flag) => {
  if (!flag || !import.meta.env.DEV) {
    return false;
  }
  const set = readFlagSet();
  return set.has(flag);
};

export const setDebugFlag = (flag, enabled) => {
  if (!flag) {
    return;
  }
  const set = readFlagSet();
  if (enabled) {
    set.add(flag);
  } else {
    set.delete(flag);
  }
  try {
    window?.localStorage?.setItem(STORAGE_KEY, Array.from(set).join(','));
  } catch (_error) {
    // Ignore storage failures in dev-only debug flags.
  }
};

export const listDebugFlags = () => Object.values(DEBUG_FLAGS);
