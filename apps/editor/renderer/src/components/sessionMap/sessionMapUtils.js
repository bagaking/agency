export const hashSeed = (input) => {
  const text = String(input || '');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

export const resolveOfflineReason = (session, cell) => {
  if (cell?.state === 'archived') {
    return 'Cell archived';
  }
  if (cell?.state === 'closed') {
    return 'Cell closed';
  }
  if (session?.status === 'closed') {
    return 'Session closed';
  }
  if (session?.status === 'stale') {
    return 'Session stale';
  }
  if (session?.status === 'archived') {
    return 'Session archived';
  }
  return 'Offline';
};
