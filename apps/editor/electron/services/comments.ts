const path = require('path');
const { listHilItems, createHilItem } = require('./hil');
const { getFileSnippet } = require('./workbench');

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
    processed: Boolean(item?.meta?.processed),
    createdAt: item.createdAt,
    author: item.author || null,
    anchor: item.anchor || null,
  };
}

async function listComments(params: any = {}) {
  const { worktreePath, filePath } = params || {};
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

async function submitComment(params: any = {}) {
  const {
    worktreePath,
    filePath,
    line,
    column,
    message,
    todo = false,
  } = params || {};
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
  let context = null;
  try {
    const snippet = await getFileSnippet({
      rootPath: worktreePath,
      targetPath: filePath,
      line: anchor.line,
      context: 3,
    });
    if (snippet?.snippet?.length) {
      const targetLine = snippet.line;
      const targetEntry = snippet.snippet.find((entry) => entry.line === targetLine) || null;
      const beforeCtx = snippet.snippet
        .filter((entry) => entry.line < targetLine)
        .map((entry) => entry.content);
      const afterCtx = snippet.snippet
        .filter((entry) => entry.line > targetLine)
        .map((entry) => entry.content);
      context = {
        capturedAt: new Date().toISOString(),
        line: targetLine,
        line_text: targetEntry?.content || '',
        before_ctx: beforeCtx,
        after_ctx: afterCtx,
      };
    }
  } catch (error) {
    context = null;
  }
  const item = await createHilItem({
    worktreePath,
    kind: 'comment',
    body: String(message).trim(),
    anchor,
    meta: {
      todo: Boolean(todo),
      context,
    },
  });
  return toCommentView(item);
}

export {
  submitComment,
  getCommentsPath,
  listComments,
};
