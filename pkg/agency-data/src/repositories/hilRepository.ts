import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import {
  AGENCY_DIR,
  getStoragePaths,
  resolveWorktreeName,
  type WorktreeStorageContext,
} from './storageRoots';
import { readYamlFile, writeYamlFileAtomic } from './yamlStore';

const fsp = fs.promises;
const execFileAsync = promisify(execFile);

const HIL_DIR = 'hil';
const HIL_PREFIX = 'index-';
const HIL_EXT = '.yaml';
const LEGACY_COMMENTS_PREFIX = 'comments-';
const LEGACY_COMMENTS_EXT = '.yaml';

const SUPPORTED_HIL_KINDS = new Set(['comment', 'memo', 'draft']);

export type HilStorageContext = WorktreeStorageContext;
export type HilKind = 'comment' | 'memo' | 'draft';

export type HilItem = {
  id: string;
  kind: HilKind;
  status: string;
  author: Record<string, any> | null;
  createdAt: string;
  updatedAt: string | null;
  body: string;
  anchor: Record<string, any> | null;
  references: Array<Record<string, any>>;
  meta: Record<string, any>;
};

type RawHilIndex = {
  version: number;
  items: Record<string, any>[];
};

const authorCache = new Map<string, Record<string, any>>();

function isHilKind(value: unknown): value is HilKind {
  return SUPPORTED_HIL_KINDS.has(String(value || '').trim());
}

export function getHilIndexPath(worktreePath: string, projectRootPath?: string): string {
  const { storageRootPath, worktreeName } = getStoragePaths({ worktreePath, projectRootPath });
  return path.join(storageRootPath, AGENCY_DIR, HIL_DIR, `${HIL_PREFIX}${worktreeName}${HIL_EXT}`);
}

function getHilTreeRoot(context: HilStorageContext): string {
  const { storageRootPath, worktreeName } = getStoragePaths(context);
  return path.join(storageRootPath, AGENCY_DIR, HIL_DIR, worktreeName);
}

function getHilItemDir(kind: HilKind): string {
  if (kind === 'draft') {
    return 'drafts';
  }
  if (kind === 'comment') {
    return path.join('items', 'comments');
  }
  return path.join('items', 'memos');
}

function getHilItemPath(worktreePath: string, item: HilItem): string {
  return path.join(getHilTreeRoot({ worktreePath }), getHilItemDir(item.kind), `${item.id}${HIL_EXT}`);
}

function getLegacyCommentsPath(worktreePath: string): string {
  const resolvedWorktreePath = path.resolve(worktreePath);
  const worktreeName = resolveWorktreeName({ worktreePath }, resolvedWorktreePath);
  return path.join(worktreePath, AGENCY_DIR, `${LEGACY_COMMENTS_PREFIX}${worktreeName}${LEGACY_COMMENTS_EXT}`);
}

function normalizeLine(value: unknown): number {
  const line = Number(value);
  if (!Number.isFinite(line) || line <= 0) {
    return 1;
  }
  return Math.floor(line);
}

function normalizeHilItem(raw: Record<string, any> | null): HilItem | null {
  if (!raw || typeof raw !== 'object' || !isHilKind(raw.kind || 'comment')) {
    return null;
  }
  const id = String(raw.id || '').trim();
  if (!id) {
    return null;
  }
  const meta = raw.meta && typeof raw.meta === 'object' ? { ...raw.meta } : {};
  if (typeof meta.processed !== 'boolean') {
    meta.processed = false;
  }
  return {
    id,
    kind: raw.kind,
    status: String(raw.status || 'open'),
    author: raw.author || null,
    createdAt: String(raw.createdAt || ''),
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : null,
    body: typeof raw.body === 'string' ? raw.body : typeof raw.message === 'string' ? raw.message : '',
    anchor: raw.anchor && typeof raw.anchor === 'object' ? { ...raw.anchor } : null,
    references: Array.isArray(raw.references) ? raw.references : [],
    meta,
  };
}

function buildLegacySignature(comment: Record<string, any>): string {
  const file = comment?.file || '';
  const line = normalizeLine(comment?.line);
  const column = normalizeLine(comment?.column || 1);
  const body = String(comment?.message ?? comment?.body ?? '').trim();
  return `${file}|${line}|${column}|${body}`;
}

function hashString(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

async function readHilIndexRaw(worktreePath: string): Promise<RawHilIndex> {
  const parsed = await readYamlFile<Record<string, any>>(
    getHilIndexPath(worktreePath),
    { version: 1, items: [] },
    { backupCorrupt: true }
  );
  return {
    version: Number(parsed.version || 1),
    items: Array.isArray(parsed.items) ? parsed.items.filter((item) => item && typeof item === 'object') : [],
  };
}

async function writeHilIndexRaw(worktreePath: string, payload: RawHilIndex): Promise<void> {
  await writeYamlFileAtomic(getHilIndexPath(worktreePath), payload);
}

async function writeHilItemArtifact(worktreePath: string, item: HilItem): Promise<void> {
  await writeYamlFileAtomic(getHilItemPath(worktreePath, item), item);
}

async function readLegacyComments(worktreePath: string): Promise<Record<string, any>[]> {
  const legacyPath = getLegacyCommentsPath(worktreePath);
  const parsed = await readYamlFile<Record<string, any>>(legacyPath, { comments: [] });
  return Array.isArray(parsed.comments) ? parsed.comments : [];
}

function ensureProcessedFlag(index: RawHilIndex): { index: RawHilIndex; changed: boolean } {
  let changed = false;
  const items = index.items.map((item) => {
    const normalized = normalizeHilItem(item);
    if (!normalized) {
      return item;
    }
    if (typeof item?.meta?.processed !== 'boolean') {
      changed = true;
      return normalized;
    }
    return item;
  });
  return {
    index: {
      version: index.version || 1,
      items,
    },
    changed,
  };
}

async function migrateLegacyComments(
  worktreePath: string,
  index: RawHilIndex
): Promise<{ index: RawHilIndex; changed: boolean }> {
  const legacy = await readLegacyComments(worktreePath);
  if (!legacy.length) {
    return { index, changed: false };
  }
  const items = [...index.items];
  const existingIds = new Set(items.map((item) => String(item?.id || '').trim()).filter(Boolean));
  const existingSignatures = new Set(
    items
      .map((item) => String(item?.meta?.legacySignature || '').trim())
      .filter(Boolean)
  );
  let changed = false;

  legacy.forEach((comment) => {
    const signature = buildLegacySignature(comment);
    if (existingIds.has(String(comment?.id || '').trim()) || existingSignatures.has(signature)) {
      return;
    }
    const id = String(comment?.id || '').trim() || `legacy_${hashString(signature)}`;
    const body = String(comment?.message ?? comment?.body ?? '').trim();
    const line = normalizeLine(comment?.line);
    const column = normalizeLine(comment?.column || 1);
    items.push({
      id,
      kind: 'comment',
      status: String(comment?.status || 'open'),
      author: comment?.author || null,
      createdAt: String(comment?.createdAt || new Date().toISOString()),
      updatedAt: comment?.updatedAt || null,
      body,
      anchor: comment?.file
        ? {
            file: comment.file,
            line,
            column,
            cellId: comment?.cellId || null,
          }
        : null,
      references: [],
      meta: {
        todo: Boolean(comment?.todo),
        legacySignature: signature,
        legacySource: 'comments',
        processed: false,
      },
    });
    existingIds.add(id);
    existingSignatures.add(signature);
    changed = true;
  });

  if (!changed) {
    return { index, changed: false };
  }
  return {
    index: {
      version: index.version || 1,
      items,
    },
    changed: true,
  };
}

async function readGitConfigValue(worktreePath: string, key: string): Promise<string | null> {
  if (!worktreePath) {
    return null;
  }
  try {
    const { stdout } = await execFileAsync('git', ['config', '--get', key], { cwd: worktreePath, timeout: 2000 });
    const value = String(stdout || '').trim();
    return value || null;
  } catch (_error) {
    return null;
  }
}

async function resolveAuthor(worktreePath: string): Promise<Record<string, any> | null> {
  if (authorCache.has(worktreePath)) {
    return authorCache.get(worktreePath) || null;
  }
  const name = await readGitConfigValue(worktreePath, 'user.name');
  const email = await readGitConfigValue(worktreePath, 'user.email');
  if (name || email) {
    const author = { type: 'git', label: name || email, email: email || null };
    authorCache.set(worktreePath, author);
    return author;
  }
  try {
    const userInfo = os.userInfo();
    if (userInfo?.username) {
      const author = { type: 'local', label: userInfo.username };
      authorCache.set(worktreePath, author);
      return author;
    }
  } catch (_error) {
    return null;
  }
  return null;
}

async function ensureHilIndexRaw(worktreePath: string): Promise<RawHilIndex> {
  const index = await readHilIndexRaw(worktreePath);
  const { index: migrated, changed } = await migrateLegacyComments(worktreePath, index);
  const { index: processedIndex, changed: processedChanged } = ensureProcessedFlag(migrated);
  if (changed || processedChanged) {
    await writeHilIndexRaw(worktreePath, processedIndex);
  }
  return processedIndex;
}

export async function listHilItems({
  worktreePath,
  kind,
  status,
  filePath,
}: {
  worktreePath: string;
  kind?: HilKind | 'all';
  status?: string;
  filePath?: string;
}): Promise<HilItem[]> {
  if (!worktreePath) {
    throw new Error('worktreePath is required.');
  }
  const index = await ensureHilIndexRaw(worktreePath);
  let items = index.items.map((item) => normalizeHilItem(item)).filter(Boolean) as HilItem[];
  if (kind && kind !== 'all') {
    items = items.filter((item) => item.kind === kind);
  }
  if (status && status !== 'all') {
    items = items.filter((item) => item.status === status);
  }
  if (filePath) {
    items = items.filter((item) => item.anchor?.file === filePath);
  }
  return items;
}

export async function createHilItem({
  worktreePath,
  kind = 'comment',
  status = 'open',
  body = '',
  author,
  anchor,
  references,
  meta,
}: {
  worktreePath: string;
  kind?: HilKind;
  status?: string;
  body: string;
  author?: Record<string, any> | null;
  anchor?: Record<string, any> | null;
  references?: Array<Record<string, any>>;
  meta?: Record<string, any>;
}): Promise<HilItem> {
  if (!worktreePath) {
    throw new Error('worktreePath is required.');
  }
  if (!isHilKind(kind)) {
    throw new Error('HIL kind must be comment, memo, or draft.');
  }
  if (!body || !String(body).trim()) {
    throw new Error('HIL body is required.');
  }
  const index = await ensureHilIndexRaw(worktreePath);
  const now = new Date().toISOString();
  const item: HilItem = {
    id: `h_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`,
    kind,
    status: String(status || 'open'),
    author: author || (await resolveAuthor(worktreePath)),
    createdAt: now,
    updatedAt: null,
    body: String(body).trim(),
    anchor: anchor && typeof anchor === 'object' ? { ...anchor } : null,
    references: Array.isArray(references) ? references : [],
    meta: meta && typeof meta === 'object' ? { ...meta } : {},
  };
  if (typeof item.meta.processed !== 'boolean') {
    item.meta.processed = false;
  }
  await writeHilIndexRaw(worktreePath, {
    version: index.version || 1,
    items: [...index.items, item],
  });
  await writeHilItemArtifact(worktreePath, item);
  return item;
}

export async function updateHilItem({
  worktreePath,
  itemId,
  patch,
}: {
  worktreePath: string;
  itemId: string;
  patch: Partial<HilItem>;
}): Promise<HilItem> {
  if (!worktreePath) {
    throw new Error('worktreePath is required.');
  }
  if (!itemId) {
    throw new Error('itemId is required.');
  }
  const index = await ensureHilIndexRaw(worktreePath);
  const items = [...index.items];
  const targetIndex = items.findIndex((item) => String(item?.id || '') === itemId);
  if (targetIndex === -1) {
    throw new Error('HIL item not found.');
  }
  const current = normalizeHilItem(items[targetIndex]);
  if (!current) {
    throw new Error('Only comment, memo, or draft items can be updated through HIL.');
  }
  const next: HilItem = {
    ...current,
    ...patch,
    kind: current.kind,
    meta: {
      ...(current.meta || {}),
      ...((patch?.meta && typeof patch.meta === 'object') ? patch.meta : {}),
    },
    updatedAt: new Date().toISOString(),
  };
  if (typeof next.meta.processed !== 'boolean') {
    next.meta.processed = false;
  }
  items[targetIndex] = next;
  await writeHilIndexRaw(worktreePath, { version: index.version || 1, items });
  await writeHilItemArtifact(worktreePath, next);
  return next;
}

export async function deleteHilItem({
  worktreePath,
  itemId,
}: {
  worktreePath: string;
  itemId: string;
}): Promise<Record<string, any>> {
  if (!worktreePath) {
    throw new Error('worktreePath is required.');
  }
  if (!itemId) {
    throw new Error('itemId is required.');
  }
  const index = await ensureHilIndexRaw(worktreePath);
  const items = [...index.items];
  const targetIndex = items.findIndex((item) => String(item?.id || '') === itemId);
  if (targetIndex === -1) {
    throw new Error('HIL item not found.');
  }
  const current = normalizeHilItem(items[targetIndex]);
  if (!current) {
    throw new Error('Only comment, memo, or draft items can be deleted through HIL.');
  }
  items.splice(targetIndex, 1);
  await writeHilIndexRaw(worktreePath, { version: index.version || 1, items });
  await fsp.rm(getHilItemPath(worktreePath, current), { force: true });
  return { id: itemId, deleted: true };
}

export async function promoteHilItem({
  worktreePath,
  itemId,
}: {
  worktreePath: string;
  itemId: string;
}): Promise<HilItem> {
  if (!worktreePath) {
    throw new Error('worktreePath is required.');
  }
  if (!itemId) {
    throw new Error('itemId is required.');
  }
  const index = await ensureHilIndexRaw(worktreePath);
  const items = [...index.items];
  const sourceIndex = items.findIndex((item) => String(item?.id || '') === itemId);
  if (sourceIndex === -1) {
    throw new Error('HIL item not found.');
  }
  const source = normalizeHilItem(items[sourceIndex]);
  if (!source) {
    throw new Error('Only HIL comment or memo items can be promoted.');
  }
  const existingDraft = items
    .map((item) => normalizeHilItem(item))
    .filter(Boolean)
    .find(
      (item) =>
        item?.kind === 'draft' &&
        Array.isArray(item.references) &&
        item.references.some((ref) => ref && ref.system === 'hil' && ref.id === source.id)
    ) as HilItem | undefined;
  if (existingDraft) {
    if (source.meta?.processed !== true) {
      const updatedSource: HilItem = {
        ...source,
        meta: {
          ...(source.meta || {}),
          processed: true,
        },
        updatedAt: new Date().toISOString(),
      };
      items[sourceIndex] = updatedSource;
      await writeHilIndexRaw(worktreePath, { version: index.version || 1, items });
      await writeHilItemArtifact(worktreePath, updatedSource);
    }
    return existingDraft;
  }

  const now = new Date().toISOString();
  const updatedSource: HilItem = {
    ...source,
    meta: {
      ...(source.meta || {}),
      processed: true,
    },
    updatedAt: now,
  };
  const draft: HilItem = {
    id: `h_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`,
    kind: 'draft',
    status: 'open',
    author: source.author || (await resolveAuthor(worktreePath)),
    createdAt: now,
    updatedAt: null,
    body: source.body,
    anchor: source.anchor || null,
    references: [
      {
        system: 'hil',
        id: source.id,
        path: source.anchor?.file || null,
      },
    ],
    meta: {
      sourceKind: source.kind,
      sourceStatus: source.status,
      processed: false,
    },
  };
  items[sourceIndex] = updatedSource;
  items.push(draft);
  await writeHilIndexRaw(worktreePath, { version: index.version || 1, items });
  await writeHilItemArtifact(worktreePath, draft);
  await writeHilItemArtifact(worktreePath, updatedSource);
  return draft;
}
