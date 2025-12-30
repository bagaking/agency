import React, { useEffect, useMemo, useRef, useState } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import { AlertTriangle } from 'lucide-react';

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
  readOnly,
  onChange,
  onCursorChange,
}) {
  const monaco = useMonaco();
  const editorRef = useRef(null);
  const decorationsRef = useRef([]);
  const [hoverLine, setHoverLine] = useState(null);

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
    if (!editorRef.current || !monaco) {
      return undefined;
    }
    const editor = editorRef.current;
    const handleCursor = editor.onDidChangeCursorPosition((event) => {
      onCursorChange?.({
        line: event.position.lineNumber,
        column: event.position.column,
      });
    });
    const handleMouse = editor.onMouseMove((event) => {
      const lineNumber = event.target.position?.lineNumber || null;
      setHoverLine(lineNumber);
    });
    return () => {
      handleCursor.dispose();
      handleMouse.dispose();
    };
  }, [monaco, onCursorChange]);

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
