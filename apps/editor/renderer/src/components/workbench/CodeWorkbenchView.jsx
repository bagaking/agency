import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Editor, { useMonaco } from '@monaco-editor/react';
import { AlertTriangle, MessageSquarePlus, Plus } from 'lucide-react';

const COMMENT_ACTION_ID = 'agency-add-line-comment';
const buildCommentActionLabel = (lineNumber) =>
  `Add Comment around Line ${Math.max(1, Number(lineNumber) || 1)}`;

const buildDiffDecorations = (monaco, hunks) => {
  if (!monaco || !Array.isArray(hunks)) {
    return [];
  }
  return hunks.map((hunk, index) => {
    const className =
      hunk.type === 'add'
        ? 'diff-line-added'
        : hunk.type === 'delete'
          ? 'diff-line-deleted'
          : 'diff-line-modified';
    return {
      range: new monaco.Range(hunk.startLine, 1, hunk.endLine || hunk.startLine, 1),
      options: {
        isWholeLine: true,
        className,
        linesDecorationsClassName: `${className}-gutter`,
      },
    };
  });
};

const toBlameMap = (lines) => {
  const map = new Map();
  (lines || []).forEach((line) => {
    if (!line?.line) {
      return;
    }
    map.set(line.line, line);
  });
  return map;
};

export function CodeWorkbenchView({
  value,
  language,
  diffHunks,
  diffTruncated,
  blameEnabled,
  blameLines,
  commentLines,
  commentsEnabled,
  readOnly,
  onChange,
  onCursorChange,
  onLineComment,
}) {
  const monaco = useMonaco();
  const editorRef = useRef(null);
  const decorationsRef = useRef([]);
  const commentDecorationsRef = useRef([]);
  const [hoverLine, setHoverLine] = useState(null);
  const [commentAnchor, setCommentAnchor] = useState(null);
  const [commentMenuOpen, setCommentMenuOpen] = useState(false);
  const commentAnchorRef = useRef(null);
  const commentMenuOpenRef = useRef(false);
  const overlayHoverRef = useRef(false);
  const hideTimerRef = useRef(null);
  const [editorReady, setEditorReady] = useState(false);
  const [overlayRoot, setOverlayRoot] = useState(null);
  const onLineCommentRef = useRef(onLineComment);
  const commentsEnabledRef = useRef(commentsEnabled);
  const commentActionRef = useRef(null);
  const commentActionLineRef = useRef(null);
  const commentContextRef = useRef({ line: null, column: null });

  const blameMap = useMemo(() => toBlameMap(blameLines), [blameLines]);
  const blameInfo = blameEnabled && hoverLine ? blameMap.get(hoverLine) : null;

  useEffect(() => {
    if (!monaco || !editorRef.current) {
      return;
    }
    const decorations = diffHunks && diffHunks.length ? buildDiffDecorations(monaco, diffHunks) : [];
    decorationsRef.current = editorRef.current.deltaDecorations(
      decorationsRef.current,
      decorations
    );
  }, [diffHunks, monaco]);

  useEffect(() => {
    if (!monaco || !editorRef.current) {
      return;
    }
    if (!Array.isArray(commentLines)) {
      commentDecorationsRef.current = editorRef.current.deltaDecorations(
        commentDecorationsRef.current,
        []
      );
      return;
    }
    const decorations = commentLines.map((comment) => ({
      range: new monaco.Range(comment.line, 1, comment.line, 1),
      options: {
        isWholeLine: true,
        glyphMarginClassName: comment.todo
          ? 'comment-line-glyph comment-line-glyph-todo'
          : 'comment-line-glyph',
      },
    }));
    commentDecorationsRef.current = editorRef.current.deltaDecorations(
      commentDecorationsRef.current,
      decorations
    );
  }, [commentLines, monaco]);

  useEffect(() => {
    commentMenuOpenRef.current = commentMenuOpen;
  }, [commentMenuOpen]);

  useEffect(() => {
    onLineCommentRef.current = onLineComment;
  }, [onLineComment]);

  useEffect(() => {
    commentsEnabledRef.current = commentsEnabled;
  }, [commentsEnabled]);

  const registerCommentAction = useCallback((lineNumber) => {
    if (!monaco || !editorRef.current || !editorReady) {
      return;
    }
    const nextLine = Math.max(1, Number(lineNumber) || 1);
    if (commentActionRef.current && commentActionLineRef.current === nextLine) {
      return;
    }
    if (commentActionRef.current?.dispose) {
      commentActionRef.current.dispose();
    }
    const editor = editorRef.current;
    const action = editor.addAction({
      id: COMMENT_ACTION_ID,
      label: buildCommentActionLabel(nextLine),
      iconClass: 'agency-comment-action',
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1.5,
      run: () => {
        if (!commentsEnabledRef.current) {
          return null;
        }
        const position = editor.getPosition();
        const fallbackLine = position?.lineNumber;
        const fallbackColumn = position?.column;
        const contextLine = commentContextRef.current.line || fallbackLine;
        const contextColumn = commentContextRef.current.column || fallbackColumn;
        if (!contextLine) {
          return null;
        }
        commentContextRef.current = { line: null, column: null };
        onLineCommentRef.current?.({
          line: contextLine,
          column: contextColumn || 1,
        });
        return null;
      },
    });
    commentActionRef.current = action;
    commentActionLineRef.current = nextLine;
  }, [editorReady, monaco]);

  useEffect(() => {
    if (!monaco || !editorRef.current || !editorReady) {
      return undefined;
    }
    registerCommentAction(editorRef.current.getPosition()?.lineNumber || 1);
    return () => {
      if (commentActionRef.current?.dispose) {
        commentActionRef.current.dispose();
      }
      commentActionRef.current = null;
      commentActionLineRef.current = null;
      commentContextRef.current = { line: null, column: null };
    };
  }, [editorReady, monaco, registerCommentAction]);

  useEffect(() => {
    if (!editorReady) {
      return undefined;
    }
    if (typeof document === 'undefined') {
      return undefined;
    }
    setOverlayRoot(document.body);
    return () => {
      setOverlayRoot(null);
    };
  }, [editorReady]);

  useEffect(() => {
    if (!editorRef.current || !monaco) {
      return undefined;
    }
    const editor = editorRef.current;
    const resolveCommentAnchor = (lineNumber) => {
      if (!editorRef.current || !monaco || !lineNumber) {
        return null;
      }
      const domNode = editorRef.current.getDomNode();
      if (!domNode) {
        return null;
      }
      const position = editorRef.current.getScrolledVisiblePosition({
        lineNumber,
        column: 1,
      });
      if (!position) {
        return null;
      }
      const layout = editorRef.current.getLayoutInfo();
      const lineHeight = editorRef.current.getOption(monaco.editor.EditorOption.lineHeight) || position.height;
      const glyphWidth = layout.glyphMarginWidth || 16;
      const domRect = domNode.getBoundingClientRect();
      const left = domRect.left + layout.glyphMarginLeft + Math.max(0, Math.floor((glyphWidth - 14) / 2));
      const top = domRect.top + position.top + Math.max(0, Math.floor((lineHeight - 14) / 2));
      return { line: lineNumber, top, left };
    };

    const scheduleHideAnchor = () => {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
      }
      hideTimerRef.current = window.setTimeout(() => {
        if (commentMenuOpenRef.current || overlayHoverRef.current) {
          return;
        }
        commentAnchorRef.current = null;
        setCommentAnchor(null);
      }, 120);
    };

    const handleCursor = editor.onDidChangeCursorPosition((event) => {
      onCursorChange?.({
        line: event.position.lineNumber,
        column: event.position.column,
      });
      commentContextRef.current = {
        line: event.position.lineNumber,
        column: event.position.column,
      };
      registerCommentAction(event.position.lineNumber);
    });
    const handleMouse = editor.onMouseMove((event) => {
      const lineNumber =
        event.target.position?.lineNumber ||
        event.target.range?.startLineNumber ||
        event.target.range?.endLineNumber ||
        null;
      setHoverLine(lineNumber);
      if (!commentsEnabled) {
        return;
      }
      const targetType = event.target.type;
      if (
        targetType === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS ||
        targetType === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN ||
        targetType === monaco.editor.MouseTargetType.GUTTER_LINE_DECORATIONS ||
        targetType === monaco.editor.MouseTargetType.GUTTER_VIEW_ZONE
      ) {
        if (lineNumber) {
          const anchor = resolveCommentAnchor(lineNumber);
          if (anchor) {
            commentAnchorRef.current = anchor;
            setCommentAnchor(anchor);
            setCommentMenuOpen(false);
            return;
          }
        }
      }
      scheduleHideAnchor();
    });
    const handleMouseLeave = editor.onMouseLeave(() => {
      setHoverLine(null);
      scheduleHideAnchor();
    });
    const handleScroll = editor.onDidScrollChange(() => {
      if (!commentAnchorRef.current) {
        return;
      }
      const anchor = resolveCommentAnchor(commentAnchorRef.current.line);
      if (anchor) {
        commentAnchorRef.current = anchor;
        setCommentAnchor(anchor);
      }
    });
    const handleLayout = editor.onDidLayoutChange(() => {
      if (!commentAnchorRef.current) {
        return;
      }
      const anchor = resolveCommentAnchor(commentAnchorRef.current.line);
      if (anchor) {
        commentAnchorRef.current = anchor;
        setCommentAnchor(anchor);
      }
    });
    const handleContextMenu = editor.onContextMenu((event) => {
      const lineNumber =
        event?.target?.position?.lineNumber ||
        event?.target?.range?.startLineNumber ||
        event?.target?.range?.endLineNumber ||
        editor.getPosition()?.lineNumber ||
        1;
      const column =
        event?.target?.position?.column ||
        event?.target?.range?.startColumn ||
        editor.getPosition()?.column ||
        1;
      commentContextRef.current = {
        line: lineNumber,
        column,
      };
      registerCommentAction(lineNumber);
    });
    return () => {
      handleCursor.dispose();
      handleMouse.dispose();
      handleMouseLeave.dispose();
      handleScroll.dispose();
      handleLayout.dispose();
      handleContextMenu.dispose();
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
      }
    };
  }, [commentsEnabled, monaco, onCursorChange, registerCommentAction]);

  useEffect(() => {
    if (!commentsEnabled) {
      setCommentMenuOpen(false);
      setCommentAnchor(null);
      commentAnchorRef.current = null;
    }
  }, [commentsEnabled]);

  return (
    <div className="relative h-full w-full">
      {diffTruncated ? (
        <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded border border-border bg-popover px-3 py-2 text-xs text-amber-200/80">
          <AlertTriangle size={12} />
          Diff data truncated for large file.
        </div>
      ) : null}
      {blameEnabled && blameInfo ? (
        <div className="absolute right-4 top-4 z-10 max-w-sm rounded border border-border bg-popover px-3 py-2 text-xs text-muted-foreground shadow">
          <div className="text-foreground">{blameInfo.author || 'Unknown'}</div>
          <div>{blameInfo.summary || 'No summary'}</div>
          {blameInfo.authorTime ? (
            <div>{new Date(blameInfo.authorTime).toLocaleString()}</div>
          ) : null}
        </div>
      ) : null}
      {overlayRoot && commentsEnabled && commentAnchor
        ? createPortal(
            <div
              className="fixed"
              style={{
                top: commentAnchor.top,
                left: commentAnchor.left,
                pointerEvents: 'auto',
                zIndex: 80,
              }}
              onMouseEnter={() => {
                overlayHoverRef.current = true;
                setCommentMenuOpen(true);
              }}
              onMouseLeave={() => {
                overlayHoverRef.current = false;
                setCommentMenuOpen(false);
              }}
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
            >
              <button
                type="button"
                className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 text-primary/80 hover:bg-primary/30"
                title="Line actions"
                onMouseDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
              >
                <Plus size={10} strokeWidth={2.5} />
              </button>
              {commentMenuOpen && (
                <div className="absolute -top-10 left-4 rounded-md border border-border bg-popover px-2 py-1 text-xs text-muted-foreground shadow-lg">
                  <button
                    type="button"
                    className="flex items-center gap-1 text-[10px] text-foreground hover:text-primary"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    onClick={() => {
                      onLineComment?.({ line: commentAnchor.line, column: 1 });
                      setCommentMenuOpen(false);
                    }}
                  >
                    <MessageSquarePlus size={12} />
                    Comment
                  </button>
                </div>
              )}
            </div>,
            overlayRoot
          )
        : null}
      <Editor
        height="100%"
        theme="vs-dark"
        value={value}
        language={language}
        onMount={(editor) => {
          editorRef.current = editor;
          setEditorReady(true);
          editor.updateOptions({
            fontSize: 13,
            minimap: { enabled: false },
            wordWrap: 'on',
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            renderWhitespace: 'boundary',
            glyphMargin: true,
          });
        }}
        onChange={(nextValue) => onChange?.(nextValue || '')}
        options={{
          readOnly: Boolean(readOnly),
        }}
      />
    </div>
  );
}
