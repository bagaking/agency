import React, { useEffect, useMemo, useRef, useState } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import { AlertTriangle, MessageSquarePlus, Plus } from 'lucide-react';

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
    if (!editorRef.current || !monaco) {
      return undefined;
    }
    const editor = editorRef.current;
    const resolveCommentAnchor = (lineNumber) => {
      if (!editorRef.current || !monaco || !lineNumber) {
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
      const left = layout.glyphMarginLeft + Math.max(0, Math.floor((glyphWidth - 14) / 2));
      const top = position.top + Math.max(0, Math.floor((lineHeight - 14) / 2));
      return { line: lineNumber, top, left };
    };

    const handleCursor = editor.onDidChangeCursorPosition((event) => {
      onCursorChange?.({
        line: event.position.lineNumber,
        column: event.position.column,
      });
    });
    const handleMouse = editor.onMouseMove((event) => {
      const lineNumber = event.target.position?.lineNumber || null;
      setHoverLine(lineNumber);
      if (!commentsEnabled) {
        return;
      }
      const targetType = event.target.type;
      if (
        targetType === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS ||
        targetType === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN
      ) {
        if (lineNumber) {
          const anchor = resolveCommentAnchor(lineNumber);
          if (anchor) {
            commentAnchorRef.current = anchor;
            setCommentAnchor(anchor);
            return;
          }
        }
      }
      if (!commentMenuOpen) {
        commentAnchorRef.current = null;
        setCommentAnchor(null);
      }
    });
    const handleMouseLeave = editor.onMouseLeave(() => {
      setHoverLine(null);
      if (!commentMenuOpen) {
        commentAnchorRef.current = null;
        setCommentAnchor(null);
      }
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
    return () => {
      handleCursor.dispose();
      handleMouse.dispose();
      handleMouseLeave.dispose();
      handleScroll.dispose();
    };
  }, [monaco, onCursorChange, commentsEnabled, commentMenuOpen]);

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
      {commentsEnabled && commentAnchor && (
        <div
          className="absolute z-20"
          style={{ top: commentAnchor.top, left: commentAnchor.left }}
          onMouseEnter={() => setCommentMenuOpen(true)}
          onMouseLeave={() => setCommentMenuOpen(false)}
        >
          <button
            type="button"
            className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 text-primary/80 hover:bg-primary/30"
            title="Line actions"
          >
            <Plus size={10} strokeWidth={2.5} />
          </button>
          {commentMenuOpen && (
            <div className="absolute -top-10 left-4 rounded-md border border-border bg-popover px-2 py-1 text-xs text-muted-foreground shadow-lg">
              <button
                type="button"
                className="flex items-center gap-1 text-[10px] text-foreground hover:text-primary"
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
        </div>
      )}
      <Editor
        height="100%"
        theme="vs-dark"
        value={value}
        language={language}
        onMount={(editor) => {
          editorRef.current = editor;
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
