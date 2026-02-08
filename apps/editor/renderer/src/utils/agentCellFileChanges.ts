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
