const fs = require('fs');
const os = require('os');
const { execFile } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const yaml = require('js-yaml');

const fsp = fs.promises;
const execFileAsync = promisify(execFile);

const AGENCY_DIR = '.agency';
const HIL_DIR = 'hil';
const HIL_PREFIX = 'index-';
const HIL_EXT = '.yaml';
const LEGACY_COMMENTS_PREFIX = 'comments-';
const LEGACY_COMMENTS_EXT = '.yaml';

function getWorktreeName(worktreePath) {
  return path.basename(worktreePath);
}

function getHilIndexPath(worktreePath) {
  const worktreeName = getWorktreeName(worktreePath);
  return path.join(worktreePath, AGENCY_DIR, HIL_DIR, `${HIL_PREFIX}${worktreeName}${HIL_EXT}`);
}

function getHilTreeRoot(worktreePath) {
  const worktreeName = getWorktreeName(worktreePath);
  return path.join(worktreePath, AGENCY_DIR, HIL_DIR, worktreeName);
}

function getHilItemDir(kind) {
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

function getHilItemPath(worktreePath, item) {
  const base = getHilTreeRoot(worktreePath);
  const folder = getHilItemDir(item?.kind);
  return path.join(base, folder, `${item.id}${HIL_EXT}`);
}

function getLegacyCommentsPath(worktreePath) {
  const worktreeName = getWorktreeName(worktreePath);
  return path.join(worktreePath, AGENCY_DIR, `${LEGACY_COMMENTS_PREFIX}${worktreeName}${LEGACY_COMMENTS_EXT}`);
}

function normalizeLine(value) {
  const line = Number(value);
  if (!Number.isFinite(line) || line <= 0) {
    return 1;
  }
  return Math.floor(line);
}

function normalizeHilItem(raw) {
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

function ensureProcessedFlag(index) {
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

function buildLegacySignature(comment) {
  const file = comment?.file || '';
  const line = normalizeLine(comment?.line);
  const column = normalizeLine(comment?.column || 1);
  const body = String(comment?.message ?? comment?.body ?? '').trim();
  return `${file}|${line}|${column}|${body}`;
}

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

async function readHilIndex(worktreePath) {
  const hilPath = getHilIndexPath(worktreePath);
  if (!fs.existsSync(hilPath)) {
    return { version: 1, items: [] };
  }
  try {
    const raw = await fsp.readFile(hilPath, 'utf-8');
    const parsed = yaml.load(raw) || {};
    return {
      version: parsed.version || 1,
      items: Array.isArray(parsed.items) ? parsed.items.map(normalizeHilItem).filter(Boolean) : [],
    };
  } catch (error) {
    const suffix = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${hilPath}.corrupt-${suffix}`;
    try {
      await fsp.rename(hilPath, backupPath);
    } catch (renameError) {
      console.warn('HIL index invalid and could not be backed up.', renameError);
    }
    return { version: 1, items: [] };
  }
}

async function writeHilIndex(worktreePath, payload) {
  const hilPath = getHilIndexPath(worktreePath);
  await fsp.mkdir(path.dirname(hilPath), { recursive: true });
  const content = yaml.dump(payload, { lineWidth: 120 });
  const tempSuffix = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const tempPath = `${hilPath}.tmp-${tempSuffix}`;
  await fsp.writeFile(tempPath, content, 'utf-8');
  await fsp.rename(tempPath, hilPath);
}

async function writeHilItemArtifact(worktreePath, item) {
  if (!worktreePath || !item?.id) {
    return;
  }
  const filePath = getHilItemPath(worktreePath, item);
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  const content = yaml.dump(item, { lineWidth: 120 });
  await fsp.writeFile(filePath, content, 'utf-8');
}

async function readLegacyComments(worktreePath) {
  const legacyPath = getLegacyCommentsPath(worktreePath);
  if (!fs.existsSync(legacyPath)) {
    return [];
  }
  try {
    const raw = await fsp.readFile(legacyPath, 'utf-8');
    const parsed = yaml.load(raw) || {};
    return Array.isArray(parsed.comments) ? parsed.comments : [];
  } catch (error) {
    return [];
  }
}

async function migrateLegacyComments(worktreePath, index) {
  const legacy = await readLegacyComments(worktreePath);
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

const authorCache = new Map();

async function readGitConfigValue(worktreePath, key) {
  if (!worktreePath) {
    return null;
  }
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['config', '--get', key],
      { cwd: worktreePath, timeout: 2000 }
    );
    const value = String(stdout || '').trim();
    return value || null;
  } catch (error) {
    return null;
  }
}

async function resolveAuthor(worktreePath) {
  if (authorCache.has(worktreePath)) {
    return authorCache.get(worktreePath);
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
  } catch (error) {
    return null;
  }
  return null;
}

async function ensureHilIndex(worktreePath) {
  const index = await readHilIndex(worktreePath);
  const { index: migrated, changed } = await migrateLegacyComments(worktreePath, index);
  const { index: processedIndex, changed: processedChanged } = ensureProcessedFlag(migrated);
  if (changed || processedChanged) {
    await writeHilIndex(worktreePath, processedIndex);
  }
  return processedIndex;
}

async function listHilItems({ worktreePath, kind, status, filePath } = {}) {
  if (!worktreePath) {
    throw new Error('worktreePath is required.');
  }
  const index = await ensureHilIndex(worktreePath);
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

async function createHilItem({
  worktreePath,
  kind = 'comment',
  status = 'open',
  body = '',
  author,
  anchor,
  references,
  meta,
} = {}) {
  if (!worktreePath) {
    throw new Error('worktreePath is required.');
  }
  if (!body || !String(body).trim()) {
    throw new Error('HIL body is required.');
  }
  const index = await ensureHilIndex(worktreePath);
  const now = new Date().toISOString();
  const item = {
    id: `h_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`,
    kind,
    status,
    author: author || await resolveAuthor(worktreePath),
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
  await writeHilIndex(worktreePath, { version: index.version || 1, items });
  await writeHilItemArtifact(worktreePath, item);
  return item;
}

async function updateHilItem({ worktreePath, itemId, patch } = {}) {
  if (!worktreePath) {
    throw new Error('worktreePath is required.');
  }
  if (!itemId) {
    throw new Error('itemId is required.');
  }
  const index = await ensureHilIndex(worktreePath);
  const items = Array.isArray(index.items) ? [...index.items] : [];
  const indexById = items.findIndex((item) => item.id === itemId);
  if (indexById === -1) {
    throw new Error('HIL item not found.');
  }
  const current = normalizeHilItem(items[indexById]);
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
  await writeHilIndex(worktreePath, { version: index.version || 1, items });
  await writeHilItemArtifact(worktreePath, next);
  return next;
}

async function deleteHilItem({ worktreePath, itemId } = {}) {
  if (!worktreePath) {
    throw new Error('worktreePath is required.');
  }
  if (!itemId) {
    throw new Error('itemId is required.');
  }
  const index = await ensureHilIndex(worktreePath);
  const items = Array.isArray(index.items) ? [...index.items] : [];
  const indexById = items.findIndex((item) => item.id === itemId);
  if (indexById === -1) {
    throw new Error('HIL item not found.');
  }
  const [removed] = items.splice(indexById, 1);
  await writeHilIndex(worktreePath, { version: index.version || 1, items });
  if (removed) {
    await fsp.rm(getHilItemPath(worktreePath, removed), { force: true });
  }
  return { id: itemId, deleted: true };
}

async function promoteHilItem({ worktreePath, itemId } = {}) {
  if (!worktreePath) {
    throw new Error('worktreePath is required.');
  }
  if (!itemId) {
    throw new Error('itemId is required.');
  }
  const index = await ensureHilIndex(worktreePath);
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
      await writeHilIndex(worktreePath, { version: index.version || 1, items: normalizedItems });
      await writeHilItemArtifact(worktreePath, normalizedItems[sourceIndex]);
    }
    return existingDraft;
  }
  const now = new Date().toISOString();
  const draft = {
    id: `h_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`,
    kind: 'draft',
    status: 'open',
    author: source.author || await resolveAuthor(worktreePath),
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
  await writeHilIndex(worktreePath, { version: index.version || 1, items });
  await writeHilItemArtifact(worktreePath, draft);
  if (sourceIndex >= 0) {
    await writeHilItemArtifact(worktreePath, normalizedItems[sourceIndex]);
  }
  return draft;
}

module.exports = {
  getHilIndexPath,
  listHilItems,
  createHilItem,
  updateHilItem,
  deleteHilItem,
  promoteHilItem,
};
