const fs = require('fs');
const os = require('os');
const path = require('path');
const yaml = require('js-yaml');

const fsp = fs.promises;

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
    meta: raw.meta && typeof raw.meta === 'object' ? raw.meta : {},
  };
}

function buildLegacySignature(comment) {
  const file = comment?.file || '';
  const line = normalizeLine(comment?.line);
  const column = normalizeLine(comment?.column || 1);
  const body = String(comment?.message || '').trim();
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
    const line = normalizeLine(comment?.line);
    const column = normalizeLine(comment?.column || 1);
    const item = {
      id,
      kind: 'comment',
      status: comment?.status || 'open',
      author: comment?.author || null,
      createdAt: comment?.createdAt || new Date().toISOString(),
      updatedAt: comment?.updatedAt || null,
      body: String(comment?.message || '').trim(),
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

function resolveAuthor() {
  try {
    const userInfo = os.userInfo();
    if (userInfo?.username) {
      return { type: 'local', label: userInfo.username };
    }
  } catch (error) {
    return null;
  }
  return null;
}

async function ensureHilIndex(worktreePath) {
  const index = await readHilIndex(worktreePath);
  const { index: migrated, changed } = await migrateLegacyComments(worktreePath, index);
  if (changed) {
    await writeHilIndex(worktreePath, migrated);
  }
  return migrated;
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
    author: author || resolveAuthor(),
    createdAt: now,
    updatedAt: null,
    body: String(body).trim(),
    anchor: anchor || null,
    references: Array.isArray(references) ? references : [],
    meta: meta && typeof meta === 'object' ? meta : {},
  };
  const items = Array.isArray(index.items) ? [...index.items, item] : [item];
  await writeHilIndex(worktreePath, { version: index.version || 1, items });
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
    meta: {
      ...(current.meta || {}),
      ...(patch?.meta || {}),
    },
    updatedAt: new Date().toISOString(),
  };
  items[indexById] = next;
  await writeHilIndex(worktreePath, { version: index.version || 1, items });
  return next;
}

async function promoteHilItem({ worktreePath, itemId } = {}) {
  if (!worktreePath) {
    throw new Error('worktreePath is required.');
  }
  if (!itemId) {
    throw new Error('itemId is required.');
  }
  const index = await ensureHilIndex(worktreePath);
  const source = Array.isArray(index.items)
    ? index.items.map(normalizeHilItem).find((item) => item.id === itemId)
    : null;
  if (!source) {
    throw new Error('HIL item not found.');
  }
  const now = new Date().toISOString();
  const draft = {
    id: `h_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`,
    kind: 'draft',
    status: 'open',
    author: source.author || resolveAuthor(),
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
    },
  };
  const items = Array.isArray(index.items) ? [...index.items, draft] : [draft];
  await writeHilIndex(worktreePath, { version: index.version || 1, items });
  return draft;
}

module.exports = {
  getHilIndexPath,
  listHilItems,
  createHilItem,
  updateHilItem,
  promoteHilItem,
};
