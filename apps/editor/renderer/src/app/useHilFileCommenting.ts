import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  getFileSnippet as agencyGetFileSnippet,
  listComments as agencyListComments,
  listHilItems as agencyListHilItems,
  submitComment as agencySubmitComment,
  updateHilItem as agencyUpdateHilItem,
} from '../services/agencyBridge';

type CursorPosition = {
  line: number;
  column: number;
};

type UseHilFileCommentingArgs = {
  activeTab: any | null;
  cursorPosition: CursorPosition;
  hilWorktreePath: string;
  projectRoot: string;
  selectedCellId: string;
  openHilDrawer: (panel?: string) => void;
};

export function useHilFileCommenting({
  activeTab,
  cursorPosition,
  hilWorktreePath,
  projectRoot,
  selectedCellId,
  openHilDrawer,
}: UseHilFileCommentingArgs) {
  const canComment = Boolean(activeTab && activeTab.kind === 'code');
  const commentRootPath = activeTab?.rootPath || '';
  const commentFilePath = activeTab?.path || '';

  const [comments, setComments] = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState('');

  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [commentMessage, setCommentMessage] = useState('');
  const [commentTodo, setCommentTodo] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [commentSaving, setCommentSaving] = useState(false);
  const [commentTarget, setCommentTarget] = useState({ line: 1, column: 1 });
  const [commentSnippet, setCommentSnippet] = useState<any>(null);
  const [commentSnippetLoading, setCommentSnippetLoading] = useState(false);
  const [commentSnippetError, setCommentSnippetError] = useState('');

  const [commentCountsByPath, setCommentCountsByPath] = useState<Record<string, number>>({});
  const [commentRefreshToken, setCommentRefreshToken] = useState(0);

  const bumpCommentRefreshToken = useCallback(() => {
    setCommentRefreshToken((value) => value + 1);
  }, []);

  const refreshCommentCounts = useCallback(async () => {
    if (!hilWorktreePath) {
      setCommentCountsByPath({});
      return;
    }
    try {
      const list = await agencyListHilItems({
        worktreePath: hilWorktreePath,
        repoRootPath: projectRoot,
        cellId: selectedCellId,
        kind: 'comment',
      });
      const nextCounts: Record<string, number> = {};
      (Array.isArray(list) ? list : [])
        .filter((item) => item?.kind === 'comment' && item?.status !== 'archived')
        .forEach((item) => {
          const file = item?.anchor?.file;
          if (!file) {
            return;
          }
          nextCounts[file] = (nextCounts[file] || 0) + 1;
        });
      setCommentCountsByPath(nextCounts);
    } catch {
      setCommentCountsByPath({});
    }
  }, [hilWorktreePath, projectRoot, selectedCellId]);

  const refreshComments = useCallback(async () => {
    if (!commentRootPath || !commentFilePath || !canComment) {
      setComments([]);
      setCommentsError('');
      setCommentsLoading(false);
      return;
    }
    setCommentsLoading(true);
    setCommentsError('');
    try {
      const list = await agencyListComments({
        worktreePath: commentRootPath,
        repoRootPath: projectRoot,
        cellId: selectedCellId,
        filePath: commentFilePath,
      });
      if (!list) {
        setComments([]);
        return;
      }
      setComments(Array.isArray(list) ? list : []);
    } catch (error: any) {
      setCommentsError(error?.message || 'Failed to load comments.');
    } finally {
      setCommentsLoading(false);
    }
  }, [canComment, commentFilePath, commentRootPath, projectRoot, selectedCellId]);

  const commentLines = useMemo(() => {
    if (!comments.length) {
      return [];
    }
    const map = new Map<number, { line: number; todo: boolean; count: number }>();
    comments.forEach((comment) => {
      const line = Number(comment.line || comment.anchor?.line);
      if (!Number.isFinite(line) || line <= 0) {
        return;
      }
      const entry = map.get(line) || { line, todo: false, count: 0 };
      entry.count += 1;
      if (comment.todo || comment.meta?.todo) {
        entry.todo = true;
      }
      map.set(line, entry);
    });
    return Array.from(map.values());
  }, [comments]);

  const openCommentModal = useCallback(
    ({ line, column }: { line?: number; column?: number } = {}) => {
      if (!commentRootPath || !commentFilePath) {
        return;
      }
      const nextLine = Number.isFinite(line) ? line : cursorPosition.line;
      const nextColumn = Number.isFinite(column) ? column : cursorPosition.column;
      setCommentTarget({
        line: Math.max(1, Math.floor(nextLine || 1)),
        column: Math.max(1, Math.floor(nextColumn || 1)),
      });
      setCommentModalOpen(true);
      setCommentMessage('');
      setCommentTodo(false);
      setCommentError('');
      openHilDrawer('comments');
    },
    [commentFilePath, commentRootPath, cursorPosition.column, cursorPosition.line, openHilDrawer]
  );

  const closeCommentModal = useCallback(() => {
    setCommentModalOpen(false);
    setCommentMessage('');
    setCommentTodo(false);
    setCommentError('');
    setCommentSnippet(null);
    setCommentSnippetLoading(false);
    setCommentSnippetError('');
  }, []);

  const submitComment = useCallback(async () => {
    if (!commentRootPath || !commentFilePath) {
      return;
    }
    if (!commentMessage.trim()) {
      setCommentError('Comment cannot be empty.');
      return;
    }
    setCommentSaving(true);
    setCommentError('');
    try {
      const result = await agencySubmitComment({
        worktreePath: commentRootPath,
        repoRootPath: projectRoot,
        cellId: selectedCellId,
        filePath: commentFilePath,
        line: commentTarget.line,
        column: commentTarget.column,
        message: commentMessage.trim(),
        todo: commentTodo,
      });
      if (!result) {
        return;
      }
      await refreshComments();
      bumpCommentRefreshToken();
      closeCommentModal();
      openHilDrawer('comments');
    } catch (error: any) {
      setCommentError(error?.message || 'Failed to submit comment.');
    } finally {
      setCommentSaving(false);
    }
  }, [
    bumpCommentRefreshToken,
    closeCommentModal,
    commentFilePath,
    commentMessage,
    commentRootPath,
    commentTarget.column,
    commentTarget.line,
    commentTodo,
    openHilDrawer,
    projectRoot,
    refreshComments,
    selectedCellId,
  ]);

  const updateCommentStatus = useCallback(
    async (comment: any, status: string) => {
      if (!comment?.id || !commentRootPath) {
        return;
      }
      const result = await agencyUpdateHilItem({
        worktreePath: commentRootPath,
        repoRootPath: projectRoot,
        cellId: selectedCellId,
        itemId: comment.id,
        patch: { status },
      });
      if (!result) {
        return;
      }
      await refreshComments();
      bumpCommentRefreshToken();
    },
    [bumpCommentRefreshToken, commentRootPath, projectRoot, refreshComments, selectedCellId]
  );

  useEffect(() => {
    refreshComments();
  }, [refreshComments]);

  useEffect(() => {
    refreshCommentCounts();
  }, [refreshCommentCounts, commentRefreshToken]);

  useEffect(() => {
    if (!commentFilePath) {
      closeCommentModal();
    }
  }, [commentFilePath, closeCommentModal]);

  useEffect(() => {
    if (!commentModalOpen || !commentRootPath || !commentFilePath) {
      setCommentSnippet(null);
      setCommentSnippetLoading(false);
      setCommentSnippetError('');
      return undefined;
    }
    let canceled = false;
    setCommentSnippetLoading(true);
    setCommentSnippetError('');
    agencyGetFileSnippet({
      rootPath: commentRootPath,
      targetPath: commentFilePath,
      line: commentTarget.line,
      context: 3,
    })
      .then((result: any) => {
        if (canceled) {
          return;
        }
        if (!result) {
          setCommentSnippet(null);
          return;
        }
        setCommentSnippet(result || null);
      })
      .catch((error: any) => {
        if (canceled) {
          return;
        }
        setCommentSnippet(null);
        setCommentSnippetError(error?.message || 'Failed to load line context.');
      })
      .finally(() => {
        if (canceled) {
          return;
        }
        setCommentSnippetLoading(false);
      });
    return () => {
      canceled = true;
    };
  }, [commentFilePath, commentModalOpen, commentRootPath, commentTarget.line]);

  return {
    canComment,
    commentRootPath,
    commentFilePath,

    comments,
    commentsLoading,
    commentsError,
    refreshComments,

    commentLines,
    commentCountsByPath,

    commentModalOpen,
    commentTarget,
    commentMessage,
    commentTodo,
    commentError,
    commentSaving,
    commentSnippet,
    commentSnippetLoading,
    commentSnippetError,

    setCommentMessage,
    setCommentTodo,
    openCommentModal,
    closeCommentModal,
    submitComment,
    updateCommentStatus,
  };
}
