import fs from 'node:fs';
import path from 'node:path';

import {
  AGENCY_DIR,
  requireOwnerStorage,
  type OwnerStorageResolution,
  type WorktreeStorageContext,
} from './storageRoots';

const fsp = fs.promises;

const DELIVERY_DIR = 'delivery';
const DELIVERY_LOG_FILENAME = 'events.jsonl';

type DeliveryAuditStorageInput =
  | string
  | (WorktreeStorageContext & {
      repoRootPath?: string;
      rootPath?: string;
    });

type DeliveryAuditStoragePaths = {
  mode: OwnerStorageResolution['mode'];
  ownerKind: OwnerStorageResolution['ownerKind'];
  repoRootPath: string;
  cellId: string;
  worktreePath: string;
  storageRootPath: string;
  worktreeName: string;
  ownerRoot: string;
  logPath: string;
  legacyLogPath: string;
};

function normalizeText(value: unknown): string {
  return String(value || '').trim();
}

function getLegacyDeliveryAuditLogPath(worktreePath: string): string {
  const normalizedWorktreePath = path.resolve(worktreePath);
  const worktreeName = path.basename(normalizedWorktreePath);
  return path.join(normalizedWorktreePath, AGENCY_DIR, DELIVERY_DIR, `events-${worktreeName}.jsonl`);
}

function resolveDeliveryAuditStoragePaths(input: DeliveryAuditStorageInput = {}): DeliveryAuditStoragePaths {
  const normalized =
    typeof input === 'string'
      ? {
          worktreePath: input,
          projectRootPath: '',
          cellId: '',
        }
      : {
          worktreePath: input.worktreePath || '',
          projectRootPath: input.projectRootPath || input.repoRootPath || input.rootPath || '',
          cellId: input.cellId || '',
        };

  const owner = requireOwnerStorage(
    normalized,
    'cell',
    'worktreePath or projectRootPath + cellId is required.'
  );
  const logPath =
    owner.mode === 'canonical'
      ? path.join(owner.ownerRoot, DELIVERY_DIR, DELIVERY_LOG_FILENAME)
      : path.join(owner.ownerRoot, DELIVERY_DIR, `events-${owner.worktreeName}.jsonl`);

  return {
    ...owner,
    repoRootPath: owner.projectRootPath,
    logPath,
    legacyLogPath: owner.worktreePath ? getLegacyDeliveryAuditLogPath(owner.worktreePath) : '',
  };
}

export function getDeliveryAuditLogPath(input: DeliveryAuditStorageInput): string {
  return resolveDeliveryAuditStoragePaths(input).logPath;
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

async function readAuditEventsFromPath(logPath: string): Promise<DeliveryAuditEvent[]> {
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
  return events;
}

async function ensureDeliveryAuditMigration(paths: DeliveryAuditStoragePaths): Promise<void> {
  if (paths.mode !== 'canonical' || !paths.logPath || !paths.legacyLogPath) {
    return;
  }
  const repoExists = await fsp
    .stat(paths.logPath)
    .then((stat) => stat.isFile())
    .catch(() => false);
  if (repoExists) {
    return;
  }
  const legacyExists = await fsp
    .stat(paths.legacyLogPath)
    .then((stat) => stat.isFile())
    .catch(() => false);
  if (!legacyExists) {
    return;
  }
  await fsp.mkdir(path.dirname(paths.logPath), { recursive: true });
  await fsp.copyFile(paths.legacyLogPath, paths.logPath);
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

export async function appendDeliveryAuditEvent({
  repoRootPath,
  rootPath,
  cellId,
  worktreePath,
  event,
}: {
  repoRootPath?: string;
  rootPath?: string;
  cellId?: string;
  worktreePath?: string;
  event: Partial<DeliveryAuditEvent>;
}): Promise<DeliveryAuditEvent> {
  const paths = resolveDeliveryAuditStoragePaths({ repoRootPath, rootPath, cellId, worktreePath });
  if (!paths.logPath) {
    throw new Error('Delivery audit storage context is required.');
  }
  await ensureDeliveryAuditMigration(paths);
  const normalized = normalizeDeliveryAuditEvent(event);
  await fsp.mkdir(path.dirname(paths.logPath), { recursive: true });
  await fsp.appendFile(paths.logPath, `${JSON.stringify(normalized)}\n`, 'utf8');
  return normalized;
}

export async function readDeliveryAuditTimeline({
  repoRootPath,
  rootPath,
  cellId,
  worktreePath,
  source,
  mode,
  limit,
}: {
  repoRootPath?: string;
  rootPath?: string;
  cellId?: string;
  worktreePath?: string;
  source?: string;
  mode?: string;
  limit?: number;
}): Promise<DeliveryAuditEvent[]> {
  const paths = resolveDeliveryAuditStoragePaths({ repoRootPath, rootPath, cellId, worktreePath });
  if (!paths.logPath) {
    throw new Error('Delivery audit storage context is required.');
  }
  await ensureDeliveryAuditMigration(paths);
  const events = await readAuditEventsFromPath(paths.logPath);
  const filtered = events.filter((event) => matchesFilter(event, { source, mode }));
  const sorted = filtered.sort((a, b) => String(a.at || '').localeCompare(String(b.at || '')));
  if (!Number.isFinite(limit) || !limit || limit <= 0) {
    return sorted;
  }
  return sorted.slice(Math.max(0, sorted.length - Math.floor(limit)));
}
