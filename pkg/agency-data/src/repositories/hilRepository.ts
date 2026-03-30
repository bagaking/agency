import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import yaml from 'js-yaml';

const fsp = fs.promises;
const execFileAsync = promisify(execFile);

const AGENCY_DIR = '.agency';
const CELL_STORE_DIR = 'cells';
const HIL_DIR = 'hil';
const HIL_INDEX_FILENAME = 'index.yaml';
const HIL_PREFIX = 'index-';
const HIL_EXT = '.yaml';
const LEGACY_COMMENTS_PREFIX = 'comments-';
const LEGACY_COMMENTS_EXT = '.yaml';

const authorCache = new Map<string, Record<string, any>>();

type HilStorageInput =
  | string
  | {
      repoRootPath?: string;
      rootPath?: string;
      cellId?: string;
      worktreePath?: string;
    };

type HilStoragePaths = {
  mode: 'cell' | 'legacy' | 'invalid';
  repoRootPath: string;
  cellId: string;
  worktreePath: string;
  authorPath: string;
  scopeKey: string;
  indexPath: string;
  treeRoot: string;
  legacyIndexPath: string;
  legacyTreeRoot: string;
  legacyCommentsPath: string;
};

function normalizeText(value: unknown): string {
  return String(value || '').trim();
}

function normalizePathValue(value: unknown): string {
  const normalized = normalizeText(value);
  return normalized ? path.resolve(normalized) : '';
}

function normalizeCellId(value: unknown): string {
  return normalizeText(value).replace(/[^a-zA-Z0-9-_]/g, '-');
}

function getWorktreeName(worktreePath: string): string {
  return path.basename(worktreePath);
}

function getLegacyHilIndexPath(worktreePath: string): string {
  const worktreeName = getWorktreeName(worktreePath);
  return path.join(worktreePath, AGENCY_DIR, HIL_DIR, `${HIL_PREFIX}${worktreeName}${HIL_EXT}`);
}

function getLegacyHilTreeRoot(worktreePath: string): string {
  const worktreeName = getWorktreeName(worktreePath);
  return path.join(worktreePath, AGENCY_DIR, HIL_DIR, worktreeName);
}

function getLegacyCommentsPath(worktreePath: string): string {
  const worktreeName = getWorktreeName(worktreePath);
  return path.join(worktreePath, AGENCY_DIR, `${LEGACY_COMMENTS_PREFIX}${worktreeName}${LEGACY_COMMENTS_EXT}`);
}

function getCellHilRoot(repoRootPath: string, cellId: string): string {
  return path.join(repoRootPath, AGENCY_DIR, CELL_STORE_DIR, cellId, HIL_DIR);
}

function resolveHilStoragePaths(input: HilStorageInput = {}): HilStoragePaths {
  if (typeof input === 'string') {
    const worktreePath = normalizePathValue(input);
    return worktreePath
      ? {
          mode: 'legacy',
          repoRootPath: '',
          cellId: '',
          worktreePath,
          authorPath: worktreePath,
          scopeKey: `legacy:${worktreePath}`,
          indexPath: getLegacyHilIndexPath(worktreePath),
          treeRoot: getLegacyHilTreeRoot(worktreePath),
          legacyIndexPath: getLegacyHilIndexPath(worktreePath),
          legacyTreeRoot: getLegacyHilTreeRoot(worktreePath),
          legacyCommentsPath: getLegacyCommentsPath(worktreePath),
        }
      : {
          mode: 'invalid',
          repoRootPath: '',
          cellId: '',
          worktreePath: '',
          authorPath: '',
          scopeKey: '',
          indexPath: '',
          treeRoot: '',
          legacyIndexPath: '',
          legacyTreeRoot: '',
          legacyCommentsPath: '',
        };
  }

  const worktreePath = normalizePathValue(input?.worktreePath);
  const repoRootPath = normalizePathValue(input?.repoRootPath || input?.rootPath);
  const cellId = normalizeCellId(input?.cellId);

  if (repoRootPath && cellId) {
    const treeRoot = getCellHilRoot(repoRootPath, cellId);
    return {
      mode: 'cell',
      repoRootPath,
      cellId,
      worktreePath,
      authorPath: worktreePath || repoRootPath,
      scopeKey: `cell:${repoRootPath}:${cellId}`,
      indexPath: path.join(treeRoot, HIL_INDEX_FILENAME),
      treeRoot,
      legacyIndexPath: worktreePath ? getLegacyHilIndexPath(worktreePath) : '',
      legacyTreeRoot: worktreePath ? getLegacyHilTreeRoot(worktreePath) : '',
      legacyCommentsPath: worktreePath ? getLegacyCommentsPath(worktreePath) : '',
    };
  }

  if (worktreePath) {
    return {
      mode: 'legacy',
      repoRootPath: '',
      cellId: '',
      worktreePath,
      authorPath: worktreePath,
      scopeKey: `legacy:${worktreePath}`,
      indexPath: getLegacyHilIndexPath(worktreePath),
      treeRoot: getLegacyHilTreeRoot(worktreePath),
      legacyIndexPath: getLegacyHilIndexPath(worktreePath),
      legacyTreeRoot: getLegacyHilTreeRoot(worktreePath),
      legacyCommentsPath: getLegacyCommentsPath(worktreePath),
    };
  }

  return {
    mode: 'invalid',
    repoRootPath: '',
    cellId: '',
    worktreePath: '',
    authorPath: '',
    scopeKey: '',
    indexPath: '',
    treeRoot: '',
    legacyIndexPath: '',
    legacyTreeRoot: '',
    legacyCommentsPath: '',
  };
}

export function getHilIndexPath(input: HilStorageInput): string {
  return resolveHilStoragePaths(input).indexPath;
}

function getHilItemDir(kind?: string): string {
  if (kind === 'draft') {
    return 'drafts';
  }
  if (kind === 'comment') {
    return path.join('items', 'comments');
  }
  if (kind === 'memo') {
    return path.join('items', 'memos');
  }
  return path.join('items', kind || 'items');
}

function getHilItemPath(paths: HilStoragePaths, item: Record<string, any>): string {
  const folder = getHilItemDir(item?.kind);
  return path.join(paths.treeRoot, folder, `${item.id}${HIL_EXT}`);
}

function normalizeLine(value: unknown): number {
  const line = Number(value);
  if (!Number.isFinite(line) || line <= 0) {
    return 1;
  }
  return Math.floor(line);
}

function normalizeHilItem(raw: Record<string, any> | null): Record<string, any> | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const meta = raw.meta && typeof raw.meta === 'object' ? { ...raw.meta } : {};
  if (typeof meta.processed !== 'boolean') {
    meta.processed = false;
  }
  const kind = raw.kind || 'comment';
  const status = raw.status || 'open';
  return {
    id: raw.id,
    kind,
    status,
    author: raw.author || null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt || null,
    body: typeof raw.body === 'string' ? raw.body : typeof raw.message === 'string' ? raw.message : '',
    anchor: raw.anchor || null,
    references: Array.isArray(raw.references) ? raw.references : [],
    meta,
  };
}

function ensureProcessedFlag(index: Record<string, any>): { index: Record<string, any>; changed: boolean } {
  const items = Array.isArray(index.items) ? index.items : [];
  let changed = false;
  const nextItems = items
    .map((item) => {
      const normalized = normalizeHilItem(item);
      if (!normalized) {
        return null;
      }
      if (typeof item?.meta?.processed !== 'boolean') {
        changed = true;
      }
      return normalized;
    })
    .filter(Boolean);
  return {
    index: {
      version: index.version || 1,
      items: nextItems,
    },
    changed,
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
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

async function readHilIndexFromPath(filePath: string): Promise<Record<string, any>> {
  if (!filePath || !fs.existsSync(filePath)) {
    return { version: 1, items: [] };
  }
  try {
    const raw = await fsp.readFile(filePath, 'utf-8');
    const parsed = (yaml.load(raw) || {}) as Record<string, any>;
    return {
      version: parsed.version || 1,
      items: Array.isArray(parsed.items) ? parsed.items.map(normalizeHilItem).filter(Boolean) : [],
    };
  } catch (_error) {
    const suffix = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${filePath}.corrupt-${suffix}`;
    try {
      await fsp.rename(filePath, backupPath);
    } catch (_renameError) {
      // best effort backup only
    }
    return { version: 1, items: [] };
  }
}

async function readHilIndex(paths: HilStoragePaths): Promise<Record<string, any>> {
  return readHilIndexFromPath(paths.indexPath);
}

async function writeHilIndex(paths: HilStoragePaths, payload: Record<string, any>): Promise<void> {
  if (!paths.indexPath) {
    throw new Error('HIL storage path is not configured.');
  }
  await fsp.mkdir(path.dirname(paths.indexPath), { recursive: true });
  const content = yaml.dump(payload, { lineWidth: 120 });
  const tempSuffix = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const tempPath = `${paths.indexPath}.tmp-${tempSuffix}`;
  await fsp.writeFile(tempPath, content, 'utf-8');
  await fsp.rename(tempPath, paths.indexPath);
}

async function writeHilItemArtifact(paths: HilStoragePaths, item: Record<string, any>): Promise<void> {
  if (!paths.treeRoot || !item?.id) {
    return;
  }
  const filePath = getHilItemPath(paths, item);
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  const content = yaml.dump(item, { lineWidth: 120 });
  await fsp.writeFile(filePath, content, 'utf-8');
}

async function syncHilItemArtifacts(paths: HilStoragePaths, items: Record<string, any>[]): Promise<void> {
  if (!paths.treeRoot || !Array.isArray(items) || !items.length) {
    return;
  }
  await Promise.all(items.map((item) => writeHilItemArtifact(paths, item).catch(() => undefined)));
}

async function readLegacyComments(paths: HilStoragePaths): Promise<Record<string, any>[]> {
  if (!paths.legacyCommentsPath || !fs.existsSync(paths.legacyCommentsPath)) {
    return [];
  }
  try {
    const raw = await fsp.readFile(paths.legacyCommentsPath, 'utf-8');
    const parsed = (yaml.load(raw) || {}) as Record<string, any>;
    return Array.isArray(parsed.comments) ? parsed.comments : [];
  } catch (_error) {
    return [];
  }
}

async function migrateLegacyComments(
  paths: HilStoragePaths,
  index: Record<string, any>
): Promise<{ index: Record<string, any>; changed: boolean }> {
  const legacy = await readLegacyComments(paths);
  if (!legacy.length) {
    return { index, changed: false };
  }
  const items = Array.isArray(index.items) ? [...index.items] : [];
  const existingIds = new Set(items.map((item) => item.id).filter(Boolean));
  const existingSignatures = new Set(
    items
      .map((item) => item.meta?.legacySignature)
      .filter((signature) => typeof signature === 'string')
  );
  let changed = false;

  legacy.forEach((comment) => {
    const signature = buildLegacySignature(comment);
    if (existingIds.has(comment?.id) || existingSignatures.has(signature)) {
      return;
    }
    const id = comment?.id || `legacy_${hashString(signature)}`;
    const body = String(comment?.message ?? comment?.body ?? '').trim();
    const line = normalizeLine(comment?.line);
    const column = normalizeLine(comment?.column || 1);
    const item = {
      id,
      kind: 'comment',
      status: comment?.status || 'open',
      author: comment?.author || null,
      createdAt: comment?.createdAt || new Date().toISOString(),
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
    };
    items.push(item);
    existingIds.add(id);
    existingSignatures.add(signature);
    changed = true;
  });

  if (!changed) {
    return { index, changed: false };
  }
  return {
    index: { version: index.version || 1, items },
    changed: true,
  };
}

async function readGitConfigValue(cwdPath: string, key: string): Promise<string | null> {
  if (!cwdPath) {
    return null;
  }
  try {
    const { stdout } = await execFileAsync('git', ['config', '--get', key], { cwd: cwdPath, timeout: 2000 });
    const value = String(stdout || '').trim();
    return value || null;
  } catch (_error) {
    return null;
  }
}

async function resolveAuthor(paths: HilStoragePaths): Promise<Record<string, any> | null> {
  if (!paths.authorPath || !paths.scopeKey) {
    return null;
  }
  if (authorCache.has(paths.scopeKey)) {
    return authorCache.get(paths.scopeKey) || null;
  }
  const name = await readGitConfigValue(paths.authorPath, 'user.name');
  const email = await readGitConfigValue(paths.authorPath, 'user.email');
  if (name || email) {
    const author = { type: 'git', label: name || email, email: email || null };
    authorCache.set(paths.scopeKey, author);
    return author;
  }
  try {
    const userInfo = os.userInfo();
    if (userInfo?.username) {
      const author = { type: 'local', label: userInfo.username };
      authorCache.set(paths.scopeKey, author);
      return author;
    }
  } catch (_error) {
    return null;
  }
  return null;
}

async function ensureHilIndex(paths: HilStoragePaths): Promise<Record<string, any>> {
  if (!paths.indexPath) {
    return { version: 1, items: [] };
  }
  let index = await readHilIndex(paths);
  let importedLegacyIndex = false;
  if (paths.mode === 'cell' && !fs.existsSync(paths.indexPath) && paths.legacyIndexPath && fs.existsSync(paths.legacyIndexPath)) {
    index = await readHilIndexFromPath(paths.legacyIndexPath);
    importedLegacyIndex = true;
  }
  const { index: migrated, changed } = await migrateLegacyComments(paths, index);
  const { index: processedIndex, changed: processedChanged } = ensureProcessedFlag(migrated);
  if (importedLegacyIndex || changed || processedChanged) {
    await writeHilIndex(paths, processedIndex);
    if (paths.mode === 'cell') {
      await syncHilItemArtifacts(paths, Array.isArray(processedIndex.items) ? processedIndex.items : []);
    }
  }
  return processedIndex;
}

function requireHilPaths(input: HilStorageInput): HilStoragePaths {
  const paths = resolveHilStoragePaths(input);
  if (!paths.indexPath) {
    throw new Error('HIL storage context is required.');
  }
  return paths;
}

export async function listHilItems({
  repoRootPath,
  rootPath,
  cellId,
  worktreePath,
  kind,
  status,
  filePath,
}: Record<string, any> = {}): Promise<Record<string, any>[]> {
  const paths = requireHilPaths({ repoRootPath, rootPath, cellId, worktreePath });
  const index = await ensureHilIndex(paths);
  let items = Array.isArray(index.items) ? index.items.map(normalizeHilItem).filter(Boolean) : [];
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
  repoRootPath,
  rootPath,
  cellId,
  worktreePath,
  kind = 'comment',
  status = 'open',
  body = '',
  author,
  anchor,
  references,
  meta,
}: Record<string, any> = {}): Promise<Record<string, any>> {
  const paths = requireHilPaths({ repoRootPath, rootPath, cellId, worktreePath });
  if (!body || !String(body).trim()) {
    throw new Error('HIL body is required.');
  }
  const index = await ensureHilIndex(paths);
  const now = new Date().toISOString();
  const item = {
    id: `h_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`,
    kind,
    status,
    author: author || (await resolveAuthor(paths)),
    createdAt: now,
    updatedAt: null,
    body: String(body).trim(),
    anchor: anchor || null,
    references: Array.isArray(references) ? references : [],
    meta: meta && typeof meta === 'object' ? { ...meta } : {},
  };
  if (typeof item.meta.processed !== 'boolean') {
    item.meta.processed = false;
  }
  const items = Array.isArray(index.items) ? [...index.items, item] : [item];
  await writeHilIndex(paths, { version: index.version || 1, items });
  await writeHilItemArtifact(paths, item);
  return item;
}

export async function updateHilItem({
  repoRootPath,
  rootPath,
  cellId,
  worktreePath,
  itemId,
  patch,
}: Record<string, any> = {}): Promise<Record<string, any>> {
  const paths = requireHilPaths({ repoRootPath, rootPath, cellId, worktreePath });
  if (!itemId) {
    throw new Error('itemId is required.');
  }
  const index = await ensureHilIndex(paths);
  const items = Array.isArray(index.items) ? [...index.items] : [];
  const indexById = items.findIndex((item) => item.id === itemId);
  if (indexById === -1) {
    throw new Error('HIL item not found.');
  }
  const current = normalizeHilItem(items[indexById]) || items[indexById];
  const next = {
    ...current,
    ...patch,
    meta: (() => {
      const merged = {
        ...(current.meta || {}),
        ...(patch?.meta || {}),
      };
      if (typeof merged.processed !== 'boolean') {
        merged.processed = false;
      }
      return merged;
    })(),
    updatedAt: new Date().toISOString(),
  };
  items[indexById] = next;
  await writeHilIndex(paths, { version: index.version || 1, items });
  await writeHilItemArtifact(paths, next);
  return next;
}

export async function deleteHilItem({
  repoRootPath,
  rootPath,
  cellId,
  worktreePath,
  itemId,
}: Record<string, any> = {}): Promise<Record<string, any>> {
  const paths = requireHilPaths({ repoRootPath, rootPath, cellId, worktreePath });
  if (!itemId) {
    throw new Error('itemId is required.');
  }
  const index = await ensureHilIndex(paths);
  const items = Array.isArray(index.items) ? [...index.items] : [];
  const indexById = items.findIndex((item) => item.id === itemId);
  if (indexById === -1) {
    throw new Error('HIL item not found.');
  }
  const [removed] = items.splice(indexById, 1);
  await writeHilIndex(paths, { version: index.version || 1, items });
  if (removed) {
    await fsp.rm(getHilItemPath(paths, removed), { force: true });
  }
  return { id: itemId, deleted: true };
}

export async function promoteHilItem({
  repoRootPath,
  rootPath,
  cellId,
  worktreePath,
  itemId,
}: Record<string, any> = {}): Promise<Record<string, any>> {
  const paths = requireHilPaths({ repoRootPath, rootPath, cellId, worktreePath });
  if (!itemId) {
    throw new Error('itemId is required.');
  }
  const index = await ensureHilIndex(paths);
  const normalizedItems = Array.isArray(index.items)
    ? index.items.map(normalizeHilItem).filter(Boolean)
    : [];
  const sourceIndex = normalizedItems.findIndex((item) => item.id === itemId);
  const source = sourceIndex >= 0 ? normalizedItems[sourceIndex] : null;
  if (!source) {
    throw new Error('HIL item not found.');
  }
  const existingDraft = normalizedItems.find(
    (item) =>
      item.kind === 'draft' &&
      Array.isArray(item.references) &&
      item.references.some((ref) => ref && ref.system === 'hil' && ref.id === source.id)
  );
  if (existingDraft) {
    if (sourceIndex >= 0 && source.meta?.processed !== true) {
      normalizedItems[sourceIndex] = {
        ...source,
        meta: {
          ...(source.meta || {}),
          processed: true,
        },
        updatedAt: new Date().toISOString(),
      };
      await writeHilIndex(paths, { version: index.version || 1, items: normalizedItems });
      await writeHilItemArtifact(paths, normalizedItems[sourceIndex]);
    }
    return existingDraft;
  }
  const now = new Date().toISOString();
  const draft = {
    id: `h_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`,
    kind: 'draft',
    status: 'open',
    author: source.author || (await resolveAuthor(paths)),
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
  if (sourceIndex >= 0) {
    normalizedItems[sourceIndex] = {
      ...source,
      meta: {
        ...(source.meta || {}),
        processed: true,
      },
      updatedAt: now,
    };
  }
  const items = [...normalizedItems, draft];
  await writeHilIndex(paths, { version: index.version || 1, items });
  await writeHilItemArtifact(paths, draft);
  if (sourceIndex >= 0) {
    await writeHilItemArtifact(paths, normalizedItems[sourceIndex]);
  }
  return draft;
}
