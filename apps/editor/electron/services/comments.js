const path = require('path');
const { listHilItems, createHilItem } = require('./hil');

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

function normalizeLine(value) {
  const line = Number(value);
  if (!Number.isFinite(line) || line <= 0) {
    return 1;
  }
  return Math.floor(line);
}

function toCommentView(item) {
  const line = normalizeLine(item?.anchor?.line || item?.line || 1);
  const column = normalizeLine(item?.anchor?.column || item?.column || 1);
  const body = typeof item?.body === 'string' ? item.body : typeof item?.message === 'string' ? item.message : '';
  return {
    id: item.id,
    threadId: item.threadId || item.id,
    status: item.status || 'open',
    file: item.anchor?.file || item.file || '',
    line,
    column,
    message: body,
    body,
    todo: Boolean(item?.meta?.todo || item?.todo),
    createdAt: item.createdAt,
    author: item.author || null,
  };
}

async function listComments({ worktreePath, filePath } = {}) {
  if (!worktreePath) {
    throw new Error('worktreePath is required.');
  }
  const list = await listHilItems({
    worktreePath,
    kind: 'comment',
    filePath,
  });
  return list.map(toCommentView);
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
  const anchor = {
    file: filePath,
    line: normalizeLine(line),
    column: normalizeLine(column),
  };
  const item = await createHilItem({
    worktreePath,
    kind: 'comment',
    body: String(message).trim(),
    anchor,
    meta: { todo: Boolean(todo) },
  });
  return toCommentView(item);
}

module.exports = {
  submitComment,
  getCommentsPath,
  listComments,
};
