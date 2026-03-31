import fs from 'node:fs';
import path from 'node:path';

import {
  AGENCY_DIR,
  getStoragePaths,
  sanitizeStorageSegment,
  type WorktreeStorageContext,
} from './storageRoots';
import { readYamlFile, writeYamlFileAtomic } from './yamlStore';

const SESSION_REPLIES_DIR = 'session-replies';
const REPLY_INDEX_PREFIX = 'index-';
const YAML_EXT = '.yaml';
const fsp = fs.promises;

export type SessionReplyTarget = {
  type: string;
  at: string;
  cellId: string;
  sessionId: string;
  cellName: string;
  sessionName: string;
  avatar: string;
};

export type SessionReplyOwner = {
  cellId: string;
  sessionId: string;
  cellName?: string | null;
  sessionName?: string | null;
};

export type SessionReplyCapture = {
  source: string;
  selection: {
    text: string;
    site: string;
    timeTag: string;
    query: string;
  };
};

export type SessionReplyDelivery = {
  draftId?: string;
  source?: string;
  mode?: string;
  targetSession?: {
    cellId?: string;
    sessionId?: string;
  } | null;
};

export type SessionReplyItem = {
  id: string;
  kind: 'reply';
  status: string;
  body: string;
  createdAt: string;
  updatedAt: string | null;
  owner: SessionReplyOwner;
  capture: SessionReplyCapture;
  targets: SessionReplyTarget[];
  delivery: SessionReplyDelivery;
  meta: Record<string, any>;
};

type SessionReplyIndex = {
  version: number;
  items: SessionReplyItem[];
};

type LegacyHilReply = Record<string, any>;

function getReplyIndexPath(worktreePath: string, projectRootPath?: string): string {
  const { storageRootPath, worktreeName } = getStoragePaths({ worktreePath, projectRootPath });
  return path.join(storageRootPath, AGENCY_DIR, SESSION_REPLIES_DIR, `${REPLY_INDEX_PREFIX}${worktreeName}${YAML_EXT}`);
}

function getReplyTreeRoot(context: WorktreeStorageContext): string {
  const { storageRootPath, worktreeName } = getStoragePaths(context);
  return path.join(storageRootPath, AGENCY_DIR, SESSION_REPLIES_DIR, worktreeName);
}

function getReplyArtifactPath(worktreePath: string, item: SessionReplyItem): string {
  const base = getReplyTreeRoot({ worktreePath });
  const cellId = sanitizeStorageSegment(item.owner?.cellId, 'cell');
  const sessionId = sanitizeStorageSegment(item.owner?.sessionId, 'session');
  return path.join(base, 'sessions', cellId, sessionId, `${item.id}${YAML_EXT}`);
}

function getLegacyHilIndexPath(worktreePath: string): string {
  const { storageRootPath, worktreeName } = getStoragePaths({ worktreePath });
  return path.join(storageRootPath, AGENCY_DIR, 'hil', `index-${worktreeName}${YAML_EXT}`);
}

function getLegacyHilReplyArtifactPath(worktreePath: string, replyId: string): string {
  const { storageRootPath, worktreeName } = getStoragePaths({ worktreePath });
  return path.join(storageRootPath, AGENCY_DIR, 'hil', worktreeName, 'items', 'reply', `${replyId}${YAML_EXT}`);
}

function normalizeReplyTarget(raw: Record<string, any> = {}): SessionReplyTarget {
  return {
    type: String(raw.type || 'record'),
    at: String(raw.at || ''),
    cellId: String(raw.cellId || ''),
    sessionId: String(raw.sessionId || ''),
    cellName: raw.cellName ? String(raw.cellName) : '',
    sessionName: raw.sessionName ? String(raw.sessionName) : '',
    avatar: raw.avatar ? String(raw.avatar) : '',
  };
}

function normalizeReplyOwner(raw: Record<string, any> = {}): SessionReplyOwner {
  return {
    cellId: String(raw.cellId || ''),
    sessionId: String(raw.sessionId || ''),
    cellName: raw.cellName ? String(raw.cellName) : '',
    sessionName: raw.sessionName ? String(raw.sessionName) : '',
  };
}

function normalizeReplyCapture(raw: Record<string, any> = {}): SessionReplyCapture {
  const selection = raw.selection && typeof raw.selection === 'object' ? raw.selection : {};
  return {
    source: String(raw.source || 'reply-panel'),
    selection: {
      text: String(selection.text || ''),
      site: String(selection.site || ''),
      timeTag: String(selection.timeTag || ''),
      query: String(selection.query || ''),
    },
  };
}

function normalizeReplyDelivery(raw: Record<string, any> = {}): SessionReplyDelivery {
  const targetSession = raw.targetSession && typeof raw.targetSession === 'object' ? raw.targetSession : null;
  return {
    draftId: raw.draftId ? String(raw.draftId) : '',
    source: raw.source ? String(raw.source) : '',
    mode: raw.mode ? String(raw.mode) : '',
    targetSession: targetSession
      ? {
          cellId: targetSession.cellId ? String(targetSession.cellId) : '',
          sessionId: targetSession.sessionId ? String(targetSession.sessionId) : '',
        }
      : null,
  };
}

function normalizeSessionReplyItem(raw: Record<string, any> | null): SessionReplyItem | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const owner = normalizeReplyOwner(raw.owner);
  if (!owner.cellId || !owner.sessionId) {
    return null;
  }
  return {
    id: String(raw.id || '').trim(),
    kind: 'reply',
    status: String(raw.status || 'open'),
    body: typeof raw.body === 'string' ? raw.body : '',
    createdAt: String(raw.createdAt || ''),
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : null,
    owner,
    capture: normalizeReplyCapture(raw.capture),
    targets: Array.isArray(raw.targets) ? raw.targets.map((target) => normalizeReplyTarget(target)) : [],
    delivery: normalizeReplyDelivery(raw.delivery),
    meta: raw.meta && typeof raw.meta === 'object' ? { ...raw.meta } : {},
  };
}

function buildLegacyReplySignature(raw: LegacyHilReply): string {
  const body = String(raw.body || raw.message || '').trim();
  const session = raw.meta?.session || {};
  const selection = raw.meta?.selection || {};
  const cellId = String(session.cellId || '');
  const sessionId = String(session.sessionId || '');
  const timeTag = String(selection.timeTag || '');
  return `${cellId}|${sessionId}|${timeTag}|${body}`;
}

function convertLegacyHilReply(raw: LegacyHilReply): SessionReplyItem | null {
  const session = raw.meta?.session && typeof raw.meta.session === 'object' ? raw.meta.session : {};
  const owner = normalizeReplyOwner(session);
  if (!owner.cellId || !owner.sessionId) {
    return null;
  }
  const createdAt = String(raw.createdAt || new Date().toISOString());
  const selection = raw.meta?.selection && typeof raw.meta.selection === 'object' ? raw.meta.selection : {};
  return {
    id: String(raw.id || '').trim() || `reply-${Date.now().toString(36)}`,
    kind: 'reply',
    status: raw.meta?.archived ? 'archived' : String(raw.status || 'open'),
    body: typeof raw.body === 'string' ? raw.body : typeof raw.message === 'string' ? raw.message : '',
    createdAt,
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : null,
    owner,
    capture: {
      source: String(raw.meta?.source || 'reply-panel'),
      selection: {
        text: String(selection.text || ''),
        site: String(selection.site || ''),
        timeTag: String(selection.timeTag || ''),
        query: String(selection.query || raw.body || raw.message || ''),
      },
    },
    targets: Array.isArray(raw.meta?.sent?.targets)
      ? raw.meta.sent.targets.map((target: any) => normalizeReplyTarget(target))
      : [],
    delivery: {
      draftId: raw.meta?.deliveryDraftId ? String(raw.meta.deliveryDraftId) : '',
      source: raw.meta?.deliverySource ? String(raw.meta.deliverySource) : '',
      mode: raw.meta?.deliveryMode ? String(raw.meta.deliveryMode) : '',
      targetSession:
        raw.meta?.deliverySession && typeof raw.meta.deliverySession === 'object'
          ? {
              cellId: raw.meta.deliverySession.cellId ? String(raw.meta.deliverySession.cellId) : '',
              sessionId: raw.meta.deliverySession.sessionId ? String(raw.meta.deliverySession.sessionId) : '',
            }
          : null,
    },
    meta: {
      legacyHilId: String(raw.id || ''),
      legacyImportedAt: new Date().toISOString(),
      legacySignature: buildLegacyReplySignature(raw),
    },
  };
}

async function readReplyIndex(worktreePath: string): Promise<SessionReplyIndex> {
  const indexPath = getReplyIndexPath(worktreePath);
  const parsed = await readYamlFile<Record<string, any>>(indexPath, { version: 1, items: [] }, { backupCorrupt: true });
  return {
    version: Number(parsed.version || 1),
    items: Array.isArray(parsed.items) ? parsed.items.map((item) => normalizeSessionReplyItem(item)).filter(Boolean) : [],
  };
}

async function writeReplyIndex(worktreePath: string, payload: SessionReplyIndex): Promise<void> {
  await writeYamlFileAtomic(getReplyIndexPath(worktreePath), payload);
}

async function writeReplyArtifact(worktreePath: string, item: SessionReplyItem): Promise<void> {
  await writeYamlFileAtomic(getReplyArtifactPath(worktreePath, item), item);
}

async function ensureReplyIndex(worktreePath: string): Promise<SessionReplyIndex> {
  const index = await readReplyIndex(worktreePath);
  const legacyHilIndex = await readYamlFile<Record<string, any>>(
    getLegacyHilIndexPath(worktreePath),
    { version: 1, items: [] },
    { backupCorrupt: true }
  );
  const legacyItems = Array.isArray(legacyHilIndex.items)
    ? legacyHilIndex.items.filter((item) => item && typeof item === 'object')
    : [];
  const legacyReplies = legacyItems.filter((item) => String(item?.kind || '').trim() === 'reply');
  if (!legacyReplies.length) {
    return index;
  }
  const nextItems = [...index.items];
  const remainingHilItems: Record<string, any>[] = [];
  const knownIds = new Set(nextItems.map((item) => item.id));
  const knownLegacyIds = new Set(
    nextItems
      .map((item) => String(item.meta?.legacyHilId || '').trim())
      .filter(Boolean)
  );
  let changed = false;
  const migratedLegacyIds = new Set<string>();
  for (const legacyReply of legacyReplies) {
    const normalized = convertLegacyHilReply(legacyReply);
    if (!normalized) {
      continue;
    }
    const legacyId = String(legacyReply.id || '').trim();
    if (knownIds.has(normalized.id) || (legacyId && knownLegacyIds.has(legacyId))) {
      if (legacyId) {
        migratedLegacyIds.add(legacyId);
      }
      continue;
    }
    nextItems.push(normalized);
    knownIds.add(normalized.id);
    if (legacyId) {
      knownLegacyIds.add(legacyId);
      migratedLegacyIds.add(legacyId);
    }
    changed = true;
    await writeReplyArtifact(worktreePath, normalized);
  }
  legacyItems.forEach((item) => {
    const itemKind = String(item?.kind || '').trim();
    const itemId = String(item?.id || '').trim();
    if (itemKind !== 'reply') {
      remainingHilItems.push(item);
      return;
    }
    if (!itemId || !migratedLegacyIds.has(itemId)) {
      remainingHilItems.push(item);
    }
  });
  if (changed) {
    const nextIndex = { version: index.version || 1, items: nextItems };
    await writeReplyIndex(worktreePath, nextIndex);
    if (migratedLegacyIds.size > 0) {
      await writeYamlFileAtomic(getLegacyHilIndexPath(worktreePath), {
        version: Number(legacyHilIndex.version || 1),
        items: remainingHilItems,
      });
      await Promise.all(
        Array.from(migratedLegacyIds).map((replyId) =>
          fsp.rm(getLegacyHilReplyArtifactPath(worktreePath, replyId), { force: true }).catch(() => undefined)
        )
      );
    }
    return nextIndex;
  }
  if (migratedLegacyIds.size > 0) {
    await writeYamlFileAtomic(getLegacyHilIndexPath(worktreePath), {
      version: Number(legacyHilIndex.version || 1),
      items: remainingHilItems,
    });
    await Promise.all(
      Array.from(migratedLegacyIds).map((replyId) =>
        fsp.rm(getLegacyHilReplyArtifactPath(worktreePath, replyId), { force: true }).catch(() => undefined)
      )
    );
  }
  return index;
}

function buildReplyId(): string {
  return `reply_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`;
}

export async function listSessionReplies({
  worktreePath,
  cellId,
  sessionId,
  includeArchived = false,
}: {
  worktreePath: string;
  cellId?: string;
  sessionId?: string;
  includeArchived?: boolean;
}): Promise<SessionReplyItem[]> {
  if (!worktreePath) {
    throw new Error('worktreePath is required.');
  }
  const index = await ensureReplyIndex(worktreePath);
  return index.items
    .filter((item) => (includeArchived ? true : item.status !== 'archived'))
    .filter((item) => (cellId ? item.owner.cellId === cellId : true))
    .filter((item) => (sessionId ? item.owner.sessionId === sessionId : true))
    .sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));
}

export async function createSessionReply({
  worktreePath,
  body,
  owner,
  capture,
  targets,
  delivery,
  meta,
}: {
  worktreePath: string;
  body: string;
  owner: SessionReplyOwner;
  capture?: Partial<SessionReplyCapture>;
  targets?: SessionReplyTarget[];
  delivery?: SessionReplyDelivery;
  meta?: Record<string, any>;
}): Promise<SessionReplyItem> {
  if (!worktreePath) {
    throw new Error('worktreePath is required.');
  }
  if (!body || !String(body).trim()) {
    throw new Error('Reply body is required.');
  }
  const normalizedOwner = normalizeReplyOwner(owner as Record<string, any>);
  if (!normalizedOwner.cellId || !normalizedOwner.sessionId) {
    throw new Error('Reply owner requires cellId and sessionId.');
  }
  const index = await ensureReplyIndex(worktreePath);
  const now = new Date().toISOString();
  const item: SessionReplyItem = {
    id: buildReplyId(),
    kind: 'reply',
    status: 'open',
    body: String(body).trim(),
    createdAt: now,
    updatedAt: null,
    owner: normalizedOwner,
    capture: normalizeReplyCapture(capture as Record<string, any>),
    targets: Array.isArray(targets) ? targets.map((target) => normalizeReplyTarget(target as Record<string, any>)) : [],
    delivery: normalizeReplyDelivery((delivery || {}) as Record<string, any>),
    meta: meta && typeof meta === 'object' ? { ...meta } : {},
  };
  const nextIndex = {
    version: index.version || 1,
    items: [...index.items, item],
  };
  await writeReplyIndex(worktreePath, nextIndex);
  await writeReplyArtifact(worktreePath, item);
  return item;
}

export async function updateSessionReply({
  worktreePath,
  replyId,
  patch,
}: {
  worktreePath: string;
  replyId: string;
  patch: Partial<SessionReplyItem>;
}): Promise<SessionReplyItem> {
  if (!worktreePath) {
    throw new Error('worktreePath is required.');
  }
  if (!replyId) {
    throw new Error('replyId is required.');
  }
  const index = await ensureReplyIndex(worktreePath);
  const nextItems = [...index.items];
  const targetIndex = nextItems.findIndex((item) => item.id === replyId);
  if (targetIndex === -1) {
    throw new Error('Session reply not found.');
  }
  const current = nextItems[targetIndex];
  const next: SessionReplyItem = {
    ...current,
    ...patch,
    owner: patch.owner ? normalizeReplyOwner(patch.owner as Record<string, any>) : current.owner,
    capture: patch.capture ? normalizeReplyCapture(patch.capture as Record<string, any>) : current.capture,
    targets: Array.isArray(patch.targets)
      ? patch.targets.map((target) => normalizeReplyTarget(target as Record<string, any>))
      : current.targets,
    delivery: patch.delivery ? normalizeReplyDelivery(patch.delivery as Record<string, any>) : current.delivery,
    meta: {
      ...(current.meta || {}),
      ...((patch.meta && typeof patch.meta === 'object') ? patch.meta : {}),
    },
    updatedAt: new Date().toISOString(),
  };
  if (!next.owner.cellId || !next.owner.sessionId) {
    throw new Error('Session reply owner requires cellId and sessionId.');
  }
  nextItems[targetIndex] = next;
  await writeReplyIndex(worktreePath, { version: index.version || 1, items: nextItems });
  await writeReplyArtifact(worktreePath, next);
  return next;
}
