import fs from 'node:fs';
import path from 'node:path';

const fsp = fs.promises;

const DELIVERY_DIR = 'delivery';

function getWorktreeName(worktreePath: string): string {
  return path.basename(worktreePath);
}

export function getDeliveryAuditLogPath(worktreePath: string): string {
  const worktreeName = getWorktreeName(worktreePath);
  return path.join(worktreePath, '.agency', DELIVERY_DIR, `events-${worktreeName}.jsonl`);
}

export type DeliveryAuditEvent = {
  id: string;
  at: string;
  source: string;
  mode: string;
  status: string;
  label: string;
  details?: string;
  sessionId?: string;
  cellId?: string;
  actionSheetId?: string;
  draftId?: string;
  references?: unknown[];
  metadata?: Record<string, unknown>;
};

function toIsoTimestamp(value: unknown): string {
  const text = String(value || '').trim();
  if (!text) {
    return new Date().toISOString();
  }
  const parsed = Date.parse(text);
  if (!Number.isFinite(parsed)) {
    return new Date().toISOString();
  }
  return new Date(parsed).toISOString();
}

function normalizeField(value: unknown): string {
  return String(value || '').trim();
}

function buildEventId({ at, source, mode, status }: { at: string; source: string; mode: string; status: string }): string {
  const entropy = Math.random().toString(16).slice(2, 8);
  return `${at}:${source}:${mode}:${status}:${entropy}`;
}

export function normalizeDeliveryAuditEvent(input: Partial<DeliveryAuditEvent> = {}): DeliveryAuditEvent {
  const at = toIsoTimestamp(input.at);
  const source = normalizeField(input.source) || 'unknown';
  const mode = normalizeField(input.mode) || 'unknown';
  const status = normalizeField(input.status) || 'unknown';
  const label = normalizeField(input.label) || status || 'unknown';
  const id = normalizeField(input.id) || buildEventId({ at, source, mode, status });
  const details = normalizeField(input.details);
  const sessionId = normalizeField(input.sessionId);
  const cellId = normalizeField(input.cellId);
  const actionSheetId = normalizeField(input.actionSheetId);
  const draftId = normalizeField(input.draftId);
  const references = Array.isArray(input.references) ? input.references : [];
  const metadata = input.metadata && typeof input.metadata === 'object' ? (input.metadata as Record<string, unknown>) : {};
  return {
    id,
    at,
    source,
    mode,
    status,
    label,
    details: details || undefined,
    sessionId: sessionId || undefined,
    cellId: cellId || undefined,
    actionSheetId: actionSheetId || undefined,
    draftId: draftId || undefined,
    references,
    metadata,
  };
}

export async function appendDeliveryAuditEvent({
  worktreePath,
  event,
}: {
  worktreePath: string;
  event: Partial<DeliveryAuditEvent>;
}): Promise<DeliveryAuditEvent> {
  if (!worktreePath) {
    throw new Error('worktreePath is required.');
  }
  const normalized = normalizeDeliveryAuditEvent(event);
  const logPath = getDeliveryAuditLogPath(worktreePath);
  await fsp.mkdir(path.dirname(logPath), { recursive: true });
  await fsp.appendFile(logPath, `${JSON.stringify(normalized)}\n`, 'utf8');
  return normalized;
}

function matchesFilter(event: DeliveryAuditEvent, filter: { source?: string; mode?: string } = {}): boolean {
  if (filter.source && event.source !== filter.source) {
    return false;
  }
  if (filter.mode && event.mode !== filter.mode) {
    return false;
  }
  return true;
}

export async function readDeliveryAuditTimeline({
  worktreePath,
  source,
  mode,
  limit,
}: {
  worktreePath: string;
  source?: string;
  mode?: string;
  limit?: number;
}): Promise<DeliveryAuditEvent[]> {
  if (!worktreePath) {
    throw new Error('worktreePath is required.');
  }
  const logPath = getDeliveryAuditLogPath(worktreePath);
  const exists = await fsp
    .stat(logPath)
    .then((stat) => stat.isFile())
    .catch(() => false);
  if (!exists) {
    return [];
  }
  const raw = await fsp.readFile(logPath, 'utf8');
  const events: DeliveryAuditEvent[] = [];
  raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      try {
        const parsed = JSON.parse(line);
        events.push(normalizeDeliveryAuditEvent(parsed));
      } catch (_error) {
        // ignore malformed lines
      }
    });
  const filtered = events.filter((event) => matchesFilter(event, { source, mode }));
  const sorted = filtered.sort((a, b) => String(a.at || '').localeCompare(String(b.at || '')));
  if (!Number.isFinite(limit) || !limit || limit <= 0) {
    return sorted;
  }
  return sorted.slice(Math.max(0, sorted.length - Math.floor(limit)));
}

