export const DEFAULT_ACTIVITY_DIFF_THRESHOLD = 12;

export const normalizeActivitySnapshot = (value: unknown): string =>
  String(value ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trimEnd();

export const resolveActivityDiffThreshold = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_ACTIVITY_DIFF_THRESHOLD;
  }
  return Math.max(1, Math.floor(parsed));
};

export const countDiffChars = (prev: unknown, next: unknown, limit?: unknown): number => {
  if (prev === next) {
    return 0;
  }
  const left = String(prev ?? '');
  const right = String(next ?? '');
  const leftLen = left.length;
  const rightLen = right.length;
  const minLen = Math.min(leftLen, rightLen);
  let diff = Math.abs(leftLen - rightLen);
  const cap = Number.isFinite(limit as number) ? (limit as number) : Infinity;

  for (let i = 0; i < minLen && diff <= cap; i += 1) {
    if (left[i] !== right[i]) {
      diff += 1;
    }
  }
  return diff;
};

export const getBufferSnapshot = (terminal: any, lines: number): string => {
  const buffer = terminal?.buffer?.active;
  if (!terminal || !buffer) {
    return '';
  }
  const maxLines = Number.isFinite(lines) ? Math.max(1, Math.floor(lines)) : 90;
  const start = Math.max(0, buffer.length - maxLines);
  const output: string[] = [];

  for (let i = start; i < buffer.length; i += 1) {
    const line = buffer.getLine(i);
    if (!line) {
      output.push('');
      continue;
    }
    const text = line.translateToString(true);
    if (line.isWrapped && output.length) {
      output[output.length - 1] += text;
    } else {
      output.push(text);
    }
  }

  return normalizeActivitySnapshot(output.join('\n'));
};

export const __testTerminalActivityDiff = {
  normalizeActivitySnapshot,
  resolveActivityDiffThreshold,
  countDiffChars,
};

