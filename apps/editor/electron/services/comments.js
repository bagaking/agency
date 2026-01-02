const fs = require('fs');
const os = require('os');
const path = require('path');
const yaml = require('js-yaml');

const fsp = fs.promises;

const AGENCY_DIR = '.agency';
const COMMENTS_PREFIX = 'comments-';
const COMMENTS_EXT = '.yaml';

function getWorktreeName(worktreePath) {
  return path.basename(worktreePath);
}

function getCommentsPath(worktreePath) {
  const worktreeName = getWorktreeName(worktreePath);
  return path.join(worktreePath, AGENCY_DIR, `${COMMENTS_PREFIX}${worktreeName}${COMMENTS_EXT}`);
}

async function readComments(worktreePath) {
  const commentsPath = getCommentsPath(worktreePath);
  if (!fs.existsSync(commentsPath)) {
    return { version: 1, comments: [] };
  }
  try {
    const raw = await fsp.readFile(commentsPath, 'utf-8');
    const parsed = yaml.load(raw) || {};
    return {
      version: parsed.version || 1,
      comments: Array.isArray(parsed.comments) ? parsed.comments : [],
    };
  } catch (error) {
    const suffix = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${commentsPath}.corrupt-${suffix}`;
    try {
      await fsp.rename(commentsPath, backupPath);
    } catch (renameError) {
      console.warn('Comment file was invalid and could not be backed up.', renameError);
    }
    return { version: 1, comments: [] };
  }
}

async function writeComments(worktreePath, payload) {
  const commentsPath = getCommentsPath(worktreePath);
  await fsp.mkdir(path.dirname(commentsPath), { recursive: true });
  const content = yaml.dump(payload, { lineWidth: 120 });
  const tempSuffix = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const tempPath = `${commentsPath}.tmp-${tempSuffix}`;
  await fsp.writeFile(tempPath, content, 'utf-8');
  await fsp.rename(tempPath, commentsPath);
}

function normalizeLine(value) {
  const line = Number(value);
  if (!Number.isFinite(line) || line <= 0) {
    return 1;
  }
  return Math.floor(line);
}

async function listComments({ worktreePath, filePath } = {}) {
  if (!worktreePath) {
    throw new Error('worktreePath is required.');
  }
  const data = await readComments(worktreePath);
  const list = Array.isArray(data.comments) ? data.comments : [];
  const normalized = list.map((comment) => ({
    threadId: comment.threadId || comment.id,
    parentId: comment.parentId ?? null,
    status: comment.status || 'open',
    ...comment,
  }));
  if (!filePath) {
    return normalized;
  }
  return normalized.filter((comment) => comment.file === filePath);
}

async function submitComment({
  worktreePath,
  filePath,
  line,
  column,
  message,
  todo = false,
} = {}) {
  if (!worktreePath) {
    throw new Error('worktreePath is required.');
  }
  if (!filePath) {
    throw new Error('filePath is required.');
  }
  if (!message || !String(message).trim()) {
    throw new Error('Comment message is required.');
  }
  const comments = await readComments(worktreePath);
  const id = `c_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`;
  let author = null;
  try {
    const userInfo = os.userInfo();
    author = userInfo?.username ? { type: 'local', label: userInfo.username } : null;
  } catch (error) {
    author = null;
  }
  const entry = {
    id,
    threadId: id,
    parentId: null,
    status: 'open',
    author,
    file: filePath,
    line: normalizeLine(line),
    column: normalizeLine(column),
    message: String(message).trim(),
    todo: Boolean(todo),
    createdAt: new Date().toISOString(),
  };
  comments.comments.push(entry);
  await writeComments(worktreePath, { version: 2, comments: comments.comments });
  return entry;
}

module.exports = {
  submitComment,
  getCommentsPath,
  listComments,
};
