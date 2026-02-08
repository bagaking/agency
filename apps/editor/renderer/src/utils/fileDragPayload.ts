const normalizePathToken = (value: string) => String(value || '').trim();

export const buildFileDragTextPayload = (paths: string[] = []): string => {
  const seen = new Set<string>();
  const tokens: string[] = [];

  paths.forEach((entry) => {
    const normalized = normalizePathToken(entry);
    if (!normalized || seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    tokens.push(normalized);
  });

  return tokens.join('\n');
};

export const setFileDragPayload = (
  event: {
    dataTransfer?: {
      setData?: (type: string, value: string) => void;
      effectAllowed?: string;
    } | null;
    stopPropagation?: () => void;
  } | null | undefined,
  paths: string | string[]
): boolean => {
  const dataTransfer = event?.dataTransfer;
  if (!dataTransfer || typeof dataTransfer.setData !== 'function') {
    return false;
  }

  const sourcePaths = Array.isArray(paths) ? paths : [paths];
  const payload = buildFileDragTextPayload(sourcePaths);
  if (!payload) {
    return false;
  }

  if (typeof event?.stopPropagation === 'function') {
    event.stopPropagation();
  }

  dataTransfer.setData('text/plain', payload);
  dataTransfer.effectAllowed = 'copy';
  return true;
};

export const __testFileDragPayload = {
  normalizePathToken,
};
