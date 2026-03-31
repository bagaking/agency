import fs from 'node:fs';
import path from 'node:path';

import {
  AGENCY_DIR,
  requireOwnerStorage,
  sanitizeStorageSegment,
  type OwnerStorageResolution,
  type WorktreeStorageContext,
} from './storageRoots';
import { readYamlFile, writeYamlFileAtomic } from './yamlStore';

const SESSION_REPLIES_DIR = 'session-replies';
const REPLY_INDEX_PREFIX = 'index-';
const REPLY_INDEX_FILENAME = 'index.yaml';
const YAML_EXT = '.yaml';
const LEGACY_HIL_DIR = 'hil';
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

type SessionReplyStorageInput =
  | string
  | (WorktreeStorageContext & {
      repoRootPath?: string;
      rootPath?: string;
      cellId?: string;
    });

type SessionReplyStoragePaths = {
  owner: OwnerStorageResolution;
  indexPath: string;
  repliesRoot: string;
  legacyIndexPath: string;
  legacyHilIndexPath: string;
  legacyHilReplyRoot: string;
};

function normalizeText(value: unknown): string {
  return String(value || '').trim();
}

function normalizeSessionReplyStorageInput(
  input: SessionReplyStorageInput = {},
  ownerCellId = ''
): {
  worktreePath: string;
  projectRootPath: string;
  cellId: string;
} {
  if (typeof input === 'string') {
    return {
      worktreePath: normalizeText(input),
      projectRootPath: '',
      cellId: sanitizeStorageSegment(ownerCellId, ''),
    };
  }
  return {
    worktreePath: normalizeText(input.worktreePath),
    projectRootPath: normalizeText(
      input.projectRootPath || input.repoRootPath || input.rootPath
    ),
    cellId: sanitizeStorageSegment(input.cellId || ownerCellId, ''),
  };
}

function getLegacyReplyIndexPath(worktreePath: string): string {
  const normalizedWorktreePath = path.resolve(worktreePath);
  const worktreeName = path.basename(normalizedWorktreePath);
  return path.join(
    normalizedWorktreePath,
    AGENCY_DIR,
    SESSION_REPLIES_DIR,
    `${REPLY_INDEX_PREFIX}${worktreeName}${YAML_EXT}`
  );
}

function getLegacyHilIndexPath(worktreePath: string): string {
  const normalizedWorktreePath = path.resolve(worktreePath);
  const worktreeName = path.basename(normalizedWorktreePath);
  return path.join(normalizedWorktreePath, AGENCY_DIR, LEGACY_HIL_DIR, `index-${worktreeName}${YAML_EXT}`);
}

function getLegacyHilReplyRoot(worktreePath: string): string {
  const normalizedWorktreePath = path.resolve(worktreePath);
  const worktreeName = path.basename(normalizedWorktreePath);
  return path.join(normalizedWorktreePath, AGENCY_DIR, LEGACY_HIL_DIR, worktreeName, 'items', 'reply');
}

function resolveSessionReplyStoragePaths(
  input: SessionReplyStorageInput = {},
  ownerCellId = ''
): SessionReplyStoragePaths {
  const normalized = normalizeSessionReplyStorageInput(input, ownerCellId);
  const owner = requireOwnerStorage(
    normalized,
    'cell',
    'worktreePath or projectRootPath + cellId is required.'
  );
  const legacyWorktreeName = owner.legacy?.worktreeName || 'repo';
  const repliesRoot =
    owner.mode === 'canonical'
      ? path.join(owner.ownerRoot, SESSION_REPLIES_DIR)
      : path.join(owner.ownerRoot, SESSION_REPLIES_DIR, legacyWorktreeName);
  return {
    owner,
    indexPath:
      owner.mode === 'canonical'
        ? path.join(repliesRoot, REPLY_INDEX_FILENAME)
        : path.join(owner.ownerRoot, SESSION_REPLIES_DIR, `${REPLY_INDEX_PREFIX}${legacyWorktreeName}${YAML_EXT}`),
    repliesRoot,
    legacyIndexPath: owner.worktreePath ? getLegacyReplyIndexPath(owner.worktreePath) : '',
    legacyHilIndexPath: owner.worktreePath ? getLegacyHilIndexPath(owner.worktreePath) : '',
    legacyHilReplyRoot: owner.worktreePath ? getLegacyHilReplyRoot(owner.worktreePath) : '',
  };
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

function getReplyArtifactPath(paths: SessionReplyStoragePaths, item: SessionReplyItem): string {
  const sessionId = sanitizeStorageSegment(item.owner?.sessionId, 'session');
  if (paths.owner.mode === 'canonical') {
    return path.join(paths.repliesRoot, 'sessions', sessionId, `${item.id}${YAML_EXT}`);
  }
  const cellId = sanitizeStorageSegment(item.owner?.cellId, 'cell');
  return path.join(paths.repliesRoot, 'sessions', cellId, sessionId, `${item.id}${YAML_EXT}`);
}

function getLegacyHilReplyArtifactPath(paths: SessionReplyStoragePaths, replyId: string): string {
  return path.join(paths.legacyHilReplyRoot, `${replyId}${YAML_EXT}`);
}

async function readReplyIndex(paths: SessionReplyStoragePaths): Promise<SessionReplyIndex> {
  const parsed = await readYamlFile<Record<string, any>>(
    paths.indexPath,
    { version: 1, items: [] },
    { backupCorrupt: true }
  );
  return {
    version: Number(parsed.version || 1),
    items: Array.isArray(parsed.items) ? parsed.items.map((item) => normalizeSessionReplyItem(item)).filter(Boolean) : [],
  };
}

async function writeReplyIndex(paths: SessionReplyStoragePaths, payload: SessionReplyIndex): Promise<void> {
  await writeYamlFileAtomic(paths.indexPath, payload);
}

async function writeReplyArtifact(paths: SessionReplyStoragePaths, item: SessionReplyItem): Promise<void> {
  await writeYamlFileAtomic(getReplyArtifactPath(paths, item), item);
}

async function seedCanonicalReplyIndexFromLegacy(
  paths: SessionReplyStoragePaths
): Promise<SessionReplyIndex | null> {
  if (paths.owner.mode !== 'canonical' || !paths.legacyIndexPath || !fs.existsSync(paths.legacyIndexPath)) {
    return null;
  }
  const legacyParsed = await readYamlFile<Record<string, any>>(
    paths.legacyIndexPath,
    { version: 1, items: [] },
    { backupCorrupt: true }
  );
  const nextIndex: SessionReplyIndex = {
    version: Number(legacyParsed.version || 1),
    items: Array.isArray(legacyParsed.items)
      ? legacyParsed.items.map((item) => normalizeSessionReplyItem(item)).filter(Boolean)
      : [],
  };
  if (!nextIndex.items.length) {
    return null;
  }
  await writeReplyIndex(paths, nextIndex);
  await Promise.all(nextIndex.items.map((item) => writeReplyArtifact(paths, item)));
  return nextIndex;
}

async function ensureReplyIndex(paths: SessionReplyStoragePaths): Promise<SessionReplyIndex> {
  let index = await readReplyIndex(paths);
  if (paths.owner.mode === 'canonical' && !fs.existsSync(paths.indexPath)) {
    index = (await seedCanonicalReplyIndexFromLegacy(paths)) || index;
  }

  const legacyHilIndex = paths.legacyHilIndexPath
    ? await readYamlFile<Record<string, any>>(
        paths.legacyHilIndexPath,
        { version: 1, items: [] },
        { backupCorrupt: true }
      )
    : { version: 1, items: [] };
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
    await writeReplyArtifact(paths, normalized);
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
    await writeReplyIndex(paths, nextIndex);
    if (migratedLegacyIds.size > 0 && paths.legacyHilIndexPath) {
      await writeYamlFileAtomic(paths.legacyHilIndexPath, {
        version: Number(legacyHilIndex.version || 1),
        items: remainingHilItems,
      });
      await Promise.all(
        Array.from(migratedLegacyIds).map((replyId) =>
          fsp.rm(getLegacyHilReplyArtifactPath(paths, replyId), { force: true }).catch(() => undefined)
        )
      );
    }
    return nextIndex;
  }

  if (migratedLegacyIds.size > 0 && paths.legacyHilIndexPath) {
    await writeYamlFileAtomic(paths.legacyHilIndexPath, {
      version: Number(legacyHilIndex.version || 1),
      items: remainingHilItems,
    });
    await Promise.all(
      Array.from(migratedLegacyIds).map((replyId) =>
        fsp.rm(getLegacyHilReplyArtifactPath(paths, replyId), { force: true }).catch(() => undefined)
      )
    );
  }

  return index;
}

function buildReplyId(): string {
  return `reply_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`;
}

export async function listSessionReplies({
  repoRootPath,
  rootPath,
  cellId,
  worktreePath,
  sessionId,
  includeArchived = false,
}: {
  repoRootPath?: string;
  rootPath?: string;
  cellId?: string;
  worktreePath?: string;
  sessionId?: string;
  includeArchived?: boolean;
}): Promise<SessionReplyItem[]> {
  const paths = resolveSessionReplyStoragePaths(
    {
      repoRootPath,
      rootPath,
      cellId,
      worktreePath,
    },
    cellId
  );
  const index = await ensureReplyIndex(paths);
  return index.items
    .filter((item) => (includeArchived ? true : item.status !== 'archived'))
    .filter((item) => (cellId ? item.owner.cellId === cellId : true))
    .filter((item) => (sessionId ? item.owner.sessionId === sessionId : true))
    .sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));
}

export async function createSessionReply({
  repoRootPath,
  rootPath,
  cellId,
  worktreePath,
  body,
  owner,
  capture,
  targets,
  delivery,
  meta,
}: {
  repoRootPath?: string;
  rootPath?: string;
  cellId?: string;
  worktreePath?: string;
  body: string;
  owner: SessionReplyOwner;
  capture?: Partial<SessionReplyCapture>;
  targets?: SessionReplyTarget[];
  delivery?: SessionReplyDelivery;
  meta?: Record<string, any>;
}): Promise<SessionReplyItem> {
  if (!body || !String(body).trim()) {
    throw new Error('Reply body is required.');
  }
  const normalizedOwner = normalizeReplyOwner(owner as Record<string, any>);
  if (!normalizedOwner.cellId || !normalizedOwner.sessionId) {
    throw new Error('Reply owner requires cellId and sessionId.');
  }
  const paths = resolveSessionReplyStoragePaths(
    {
      repoRootPath,
      rootPath,
      cellId,
      worktreePath,
    },
    normalizedOwner.cellId
  );
  const index = await ensureReplyIndex(paths);
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
  await writeReplyIndex(paths, nextIndex);
  await writeReplyArtifact(paths, item);
  return item;
}

export async function updateSessionReply({
  repoRootPath,
  rootPath,
  cellId,
  worktreePath,
  replyId,
  patch,
}: {
  repoRootPath?: string;
  rootPath?: string;
  cellId?: string;
  worktreePath?: string;
  replyId: string;
  patch: Partial<SessionReplyItem>;
}): Promise<SessionReplyItem> {
  if (!replyId) {
    throw new Error('replyId is required.');
  }
  const inferredCellId =
    patch?.owner && typeof patch.owner === 'object' ? String((patch.owner as any).cellId || '') : cellId || '';
  const paths = resolveSessionReplyStoragePaths(
    {
      repoRootPath,
      rootPath,
      cellId,
      worktreePath,
    },
    inferredCellId
  );
  const index = await ensureReplyIndex(paths);
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
  await writeReplyIndex(paths, { version: index.version || 1, items: nextItems });
  await writeReplyArtifact(paths, next);
  return next;
}
