const TRAILING_PATH_PUNCTUATION = /[.,;:!?)}\]。，；：！？）】》」』、]+$/;
const PATH_REGEX =
  /(^|[^A-Za-z0-9_@./~+-])([A-Za-z0-9_@./~+-]+\/[A-Za-z0-9_@./~+-]+\.[A-Za-z0-9]+(?::\d+(?::\d+)?)?)/g;

export const normalizeTerminalSelectionText = (value: unknown): string =>
  String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n/g, '\r');

export const stripTrailingPathPunctuation = (value: unknown): string => {
  const trimmed = String(value || '').trimEnd();
  return trimmed.replace(TRAILING_PATH_PUNCTUATION, '');
};

export const findTerminalPathMatches = (value: unknown): Array<{
  raw: string;
  text: string;
  startIndex: number;
}> => {
  const text = String(value || '');
  const matches: Array<{ raw: string; text: string; startIndex: number }> = [];
  PATH_REGEX.lastIndex = 0;
  let match = PATH_REGEX.exec(text);
  while (match) {
    const prefix = match[1] || '';
    const raw = match[2] || '';
    const startIndex = match.index + prefix.length;
    const cleaned = stripTrailingPathPunctuation(raw);
    if (cleaned) {
      matches.push({
        raw,
        text: cleaned,
        startIndex,
      });
    }
    match = PATH_REGEX.exec(text);
  }
  return matches;
};

export const formatTerminalSelectionTime = (timestamp: unknown): string => {
  if (!timestamp) {
    return '';
  }
  const date = new Date(timestamp as any);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

export const buildTerminalSelectionSite = (terminal: any, position: any): string => {
  if (!terminal || !position) {
    return '';
  }
  const buffer = terminal.buffer?.active;
  if (!buffer) {
    return '';
  }
  let start = position.start || null;
  let end = position.end || null;
  if (!start || !end) {
    return '';
  }
  if (end.y < start.y || (end.y === start.y && end.x < start.x)) {
    [start, end] = [end, start];
  }
  const lines: string[] = [];
  for (let row = start.y; row <= end.y; row += 1) {
    const line = buffer.getLine(row);
    const text = line ? line.translateToString(true) : '';
    if (!text) {
      lines.push('');
      continue;
    }
    const clamp = (value: number): number => Math.max(0, Math.min(text.length, value));
    const wrap = (value: string, from: number, to: number): string => {
      if (from >= to) {
        return value;
      }
      return `${value.slice(0, from)}\`${value.slice(from, to)}\`${value.slice(to)}`;
    };
    if (start.y === end.y) {
      const from = clamp(start.x);
      const to = clamp(end.x);
      lines.push(wrap(text, from, to));
      continue;
    }
    if (row === start.y) {
      const from = clamp(start.x);
      lines.push(wrap(text, from, text.length));
      continue;
    }
    if (row === end.y) {
      const to = clamp(end.x);
      lines.push(wrap(text, 0, to));
      continue;
    }
    lines.push(`\`${text}\``);
  }
  return lines.join('\n');
};

export const writeSelectionToClipboard = async (selection: unknown): Promise<void> => {
  if (!selection) {
    return;
  }
  const text = String(selection || '');
  if (!text) {
    return;
  }
  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
};

export const __testTerminalSelection = {
  buildTerminalSelectionSite,
  findTerminalPathMatches,
  formatTerminalSelectionTime,
  normalizeTerminalSelectionText,
  stripTrailingPathPunctuation,
};

