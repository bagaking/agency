import { extractFileReferences, type FileReferenceTarget } from './fileReferences';

type DashboardSession = {
  id: string;
  name?: string;
  status?: string;
};

export type AgentCellFileChangeEntry = FileReferenceTarget & {
  sessions: Array<{
    id: string;
    name: string;
  }>;
  sessionCount: number;
  latestActivityAt: number;
  sourceType?: 'reference' | 'modified';
  status?: string;
  added?: number;
  deleted?: number;
};

const STATUS_PRIORITY: string[] = [
  'conflict',
  'deleted',
  'added',
  'modified',
  'renamed',
  'copied',
  'untracked',
  'ignored',
];

const STATUS_RANK = STATUS_PRIORITY.reduce<Record<string, number>>((map, status, index) => {
  map[status] = index;
  return map;
}, {});

const toFiniteNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const buildAgentCellModifiedFileChanges = ({
  statusFiles = {},
  cellId = '',
}: {
  statusFiles?: Record<string, any>;
  cellId?: string;
} = {}): AgentCellFileChangeEntry[] => {
  if (!cellId) {
    return [];
  }

  const rows = Object.values(statusFiles || {})
    .map((entry: any) => {
      const relativePath = String(entry?.path || '').trim();
      if (!relativePath) {
        return null;
      }
      const cellInfo = entry?.cells?.[cellId];
      if (!cellInfo) {
        return null;
      }
      const added = toFiniteNumber(cellInfo?.added);
      const deleted = toFiniteNumber(cellInfo?.deleted);
      const status = String(cellInfo?.status || entry?.status || 'modified').trim() || 'modified';
      return {
        rawText: relativePath,
        relativePath,
        displayPath: relativePath.split('/').pop() || relativePath,
        absolutePath: '',
        line: null,
        column: null,
        sessions: [],
        sessionCount: 0,
        latestActivityAt: 0,
        sourceType: 'modified' as const,
        status,
        added,
        deleted,
      };
    })
    .filter(Boolean) as AgentCellFileChangeEntry[];

  rows.sort((left, right) => {
    const leftRank = STATUS_RANK[left.status || 'modified'] ?? STATUS_PRIORITY.length;
    const rightRank = STATUS_RANK[right.status || 'modified'] ?? STATUS_PRIORITY.length;
    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }
    const leftDelta = Math.abs(toFiniteNumber(left.added)) + Math.abs(toFiniteNumber(left.deleted));
    const rightDelta = Math.abs(toFiniteNumber(right.added)) + Math.abs(toFiniteNumber(right.deleted));
    if (rightDelta !== leftDelta) {
      return rightDelta - leftDelta;
    }
    return left.relativePath.localeCompare(right.relativePath);
  });

  return rows;
};

export const buildAgentCellFileChanges = ({
  rootPath = '',
  sessions = [],
  previewBySessionId = {},
  resolveActivityAt,
  perSessionLimit = 4,
  totalLimit = 12,
}: {
  rootPath?: string;
  sessions?: DashboardSession[];
  previewBySessionId?: Record<string, string>;
  resolveActivityAt?: (session: DashboardSession) => number | null;
  perSessionLimit?: number;
  totalLimit?: number;
} = {}): AgentCellFileChangeEntry[] => {
  const entries = new Map<string, AgentCellFileChangeEntry>();
  const sessionLimit = Number.isFinite(perSessionLimit)
    ? Math.max(1, Math.floor(perSessionLimit))
    : 4;
  const maxEntries = Number.isFinite(totalLimit) ? Math.max(1, Math.floor(totalLimit)) : 12;

  (sessions || []).forEach((session) => {
    if (!session?.id) {
      return;
    }
    const preview = String(previewBySessionId?.[session.id] || '');
    if (!preview) {
      return;
    }
    const refs = extractFileReferences(preview, {
      rootPath,
      limit: sessionLimit,
    });
    if (!refs.length) {
      return;
    }
    const activityAt = Number(resolveActivityAt?.(session));
    const normalizedActivity = Number.isFinite(activityAt) ? activityAt : 0;
    refs.forEach((ref) => {
      const key = `${ref.relativePath}:${ref.line || ''}:${ref.column || ''}`;
      const existing = entries.get(key);
      if (!existing) {
        entries.set(key, {
          ...ref,
          sessions: [{ id: session.id, name: session.name || session.id }],
          sessionCount: 1,
          latestActivityAt: normalizedActivity,
          sourceType: 'reference',
        });
        return;
      }
      if (!existing.sessions.some((item) => item.id === session.id)) {
        existing.sessions.push({ id: session.id, name: session.name || session.id });
        existing.sessionCount = existing.sessions.length;
      }
      if (normalizedActivity > existing.latestActivityAt) {
        existing.latestActivityAt = normalizedActivity;
      }
    });
  });

  return Array.from(entries.values())
    .sort((left, right) => {
      if (right.latestActivityAt !== left.latestActivityAt) {
        return right.latestActivityAt - left.latestActivityAt;
      }
      if (right.sessionCount !== left.sessionCount) {
        return right.sessionCount - left.sessionCount;
      }
      return left.relativePath.localeCompare(right.relativePath);
    })
    .slice(0, maxEntries);
};
