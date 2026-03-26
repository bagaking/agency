export const DEFAULT_RULE = 'Session {seq:absolute:02} · {time:HHmm}';
export const DEFAULT_NAME_LISTS = {
  myth: ['Athena', 'Apollo', 'Artemis', 'Hera', 'Hermes', 'Poseidon', 'Zeus'],
  constellation: ['Orion', 'Lyra', 'Cygnus', 'Draco', 'Phoenix', 'Aquila', 'Vela'],
  animals: ['Fox', 'Wolf', 'Raven', 'Otter', 'Hawk', 'Lynx', 'Stag'],
};

export const DEFAULT_SETTINGS = {
  rule: DEFAULT_RULE,
  nameLists: DEFAULT_NAME_LISTS,
};

export const EMPTY_SETTINGS = {
  rule: '',
  nameLists: {},
};

const normalizeList = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }
  return value
    .map((item) => String(item || '').trim())
    .filter((item) => item.length > 0);
};

const normalizeNameLists = (lists: Record<string, unknown> = {}): Record<string, string[]> => {
  const next: Record<string, string[]> = {};
  Object.entries(lists || {}).forEach(([key, value]) => {
    const name = String(key || '').trim();
    if (!name) {
      return;
    }
    const items = normalizeList(value);
    if (items) {
      next[name] = items;
    }
  });
  return next;
};

export const normalizeSettings = (
  settings: { rule?: unknown; nameLists?: Record<string, unknown> } = {},
  { includeDefaults = false }: { includeDefaults?: boolean } = {}
) => {
  const rule = String(settings.rule || '').trim();
  const nameLists = normalizeNameLists(settings.nameLists);
  if (!includeDefaults) {
    return {
      rule,
      nameLists,
    };
  }
  return {
    rule: rule || DEFAULT_RULE,
    nameLists: { ...DEFAULT_NAME_LISTS, ...nameLists },
  };
};

export const resolveSessionNaming = ({
  globalSettings,
  projectSettings,
  agentSettings,
}: {
  globalSettings: any;
  projectSettings: any;
  agentSettings: any;
}) => {
  const global = normalizeSettings(globalSettings || DEFAULT_SETTINGS, { includeDefaults: true });
  const project = normalizeSettings(projectSettings || EMPTY_SETTINGS);
  const agent = normalizeSettings(agentSettings || EMPTY_SETTINGS);
  return {
    rule: agent.rule || project.rule || global.rule || DEFAULT_RULE,
    nameLists: {
      ...global.nameLists,
      ...project.nameLists,
      ...agent.nameLists,
    },
  };
};

const padNumber = (value: unknown, width?: unknown) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return '';
  }
  const str = String(Math.floor(numeric));
  if (!width || !Number.isFinite(Number(width))) {
    return str;
  }
  return str.padStart(Number(width), '0');
};

const expandShorthandFormat = (format: unknown) => {
  const trimmed = String(format || '');
  if (!/^[yMdHhms]+$/.test(trimmed)) {
    return trimmed;
  }
  const map = {
    y: 'YYYY',
    M: 'MM',
    d: 'DD',
    D: 'DD',
    H: 'HH',
    h: 'HH',
    m: 'mm',
    s: 'ss',
  };
  return trimmed
    .split('')
    .map((char) => map[char] || char)
    .join('');
};

const formatDateTime = (date: Date, format: unknown) => {
  const token = expandShorthandFormat(format);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  return token.replace(/YYYY|MM|DD|HH|mm|ss/g, (match) => {
    switch (match) {
      case 'YYYY':
        return padNumber(year, 4);
      case 'MM':
        return padNumber(month, 2);
      case 'DD':
        return padNumber(day, 2);
      case 'HH':
        return padNumber(hours, 2);
      case 'mm':
        return padNumber(minutes, 2);
      case 'ss':
        return padNumber(seconds, 2);
      default:
        return match;
    }
  });
};

export const normalizeSelectionPosition = (position: any) => {
  if (!position) {
    return null;
  }
  if (
    Number.isFinite(position.startRow) &&
    Number.isFinite(position.endRow) &&
    Number.isFinite(position.startColumn) &&
    Number.isFinite(position.endColumn)
  ) {
    return position;
  }
  if (position.start && position.end) {
    const startColumn = position.start.x ?? position.start.column ?? position.startColumn;
    const startRow = position.start.y ?? position.start.row ?? position.startRow;
    const endColumn = position.end.x ?? position.end.column ?? position.endColumn;
    const endRow = position.end.y ?? position.end.row ?? position.endRow;
    if (
      Number.isFinite(startRow) &&
      Number.isFinite(endRow) &&
      Number.isFinite(startColumn) &&
      Number.isFinite(endColumn)
    ) {
      return { startRow, endRow, startColumn, endColumn };
    }
  }
  return null;
};

export const formatSessionName = ({
  rule,
  sequences = {},
  nameLists = {},
  context = {},
  now = new Date(),
}: {
  rule?: unknown;
  sequences?: Record<string, number>;
  nameLists?: Record<string, string[]>;
  context?: Record<string, unknown>;
  now?: Date;
} = {}) => {
  const template = String(rule || DEFAULT_RULE);
  if (!template) {
    return '';
  }
  const normalizedLists = nameLists || {};
  const resolveSequence = (scope) => {
    const key = scope || 'absolute';
    const value = sequences[key];
    if (Number.isFinite(value)) {
      return value;
    }
    if (Number.isFinite(sequences.absolute)) {
      return sequences.absolute;
    }
    return 1;
  };

  return template.replace(/\{([^}]+)\}/g, (match, body) => {
    const parts = String(body || '')
      .split(':')
      .map((part) => part.trim())
      .filter(Boolean);
    if (!parts.length) {
      return match;
    }
    const type = parts[0];
    if (type === 'time' || type === 'date') {
      const format = parts[1] || (type === 'time' ? 'HHmm' : 'YYYYMMDD');
      return formatDateTime(now, format);
    }
    if (type === 'seq') {
      const scope = parts[1] || 'absolute';
      const pad = parts[2];
      const value = resolveSequence(scope);
      return pad ? padNumber(value, pad) : padNumber(value);
    }
    if (type === 'name') {
      const listName = parts[1];
      const scope = parts[2] || 'absolute';
      if (!listName) {
        return '';
      }
      const list = normalizedLists[listName] || [];
      if (!list.length) {
        return '';
      }
      const value = resolveSequence(scope);
      const index = Math.max(0, (value - 1) % list.length);
      return list[index];
    }
    if (context[type] !== undefined && context[type] !== null) {
      return String(context[type]);
    }
    return match;
  });
};

export const sessionNamingCore = {
  DEFAULT_RULE,
  DEFAULT_NAME_LISTS,
  DEFAULT_SETTINGS,
  EMPTY_SETTINGS,
  normalizeSettings,
  resolveSessionNaming,
  normalizeSelectionPosition,
  formatSessionName,
};

export default sessionNamingCore;
