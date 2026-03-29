import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LazyMonacoEditor, preloadLazyMonacoEditor } from '../ui/LazyMonacoEditor';
import { SessionReplyComposerChrome } from './SessionReplyComposerChrome';
import {
  REPLY_EDITOR_FONT_FAMILY,
  REPLY_EDITOR_FONT_SIZE,
  REPLY_EDITOR_HEIGHT,
  REPLY_EDITOR_LINE_HEIGHT,
  REPLY_EDITOR_PADDING,
  focusReplyEditorAtEnd,
} from './sessionReplyShared';

export function SessionReplyComposer({
  editorRef,
  editorContainerRef,
  currentCellId,
  currentSessionId,
  resolvedQuickPrompts,
  sessionTargets,
  scopeKey,
  replyText,
  setReplyText,
  queryText,
  error,
  handleInsertQuickPrompt,
  hasContent,
  submitting,
  handleCreateReply,
  selectionContext,
  siteText,
  onClearSelection,
}: any) {
  const pendingEditorFocusRef = useRef(false);
  const quickPromptMenuRef = useRef<HTMLDivElement | null>(null);
  const quickPromptTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [quickPromptMenuOpen, setQuickPromptMenuOpen] = useState(false);
  const [sendMenuOpen, setSendMenuOpen] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<any>(null);
  const availableQuickPrompts = useMemo(
    () =>
      (resolvedQuickPrompts || []).filter(
        (prompt: any) => prompt?.enabled !== false && String(prompt?.text || '').trim()
      ),
    [resolvedQuickPrompts]
  );
  const otherTargets = useMemo(() => {
    const currentKey = `${currentCellId || ''}:${currentSessionId || ''}`;
    return (sessionTargets || [])
      .filter((target: any) => target?.cellId && target?.sessionId)
      .filter((target: any) => `${target.cellId}:${target.sessionId}` !== currentKey)
      .sort((a: any, b: any) => {
        const left = `${a.cellName || a.cellId} ${a.sessionName || a.sessionId}`;
        const right = `${b.cellName || b.cellId} ${b.sessionName || b.sessionId}`;
        return left.localeCompare(right);
      });
  }, [currentCellId, currentSessionId, sessionTargets]);

  useEffect(() => {
    setQuickPromptMenuOpen(false);
    setSendMenuOpen(false);
    setSelectedTarget(null);
  }, [scopeKey]);

  useEffect(() => {
    if (!selectedTarget) {
      return;
    }
    const stillAvailable = otherTargets.some(
      (target: any) =>
        target?.cellId === selectedTarget.cellId && target?.sessionId === selectedTarget.sessionId
    );
    if (!stillAvailable) {
      setSelectedTarget(null);
    }
  }, [otherTargets, selectedTarget]);

  const primeEditorInteraction = () => {
    if (editorRef.current) {
      return;
    }
    pendingEditorFocusRef.current = true;
    void preloadLazyMonacoEditor();
  };

  return (
    <div className="border-t border-border/20 bg-background/80 backdrop-blur-md">
      <div className="relative flex flex-col focus-within:bg-card/40 transition-colors">
        <SessionReplyComposerChrome
          availableQuickPrompts={availableQuickPrompts}
          handleInsertQuickPrompt={handleInsertQuickPrompt}
          otherTargets={otherTargets}
          hasContent={hasContent}
          submitting={submitting}
          handleCreateReply={handleCreateReply}
          selectedTarget={selectedTarget}
          selectionContext={selectionContext}
          setSelectedTarget={setSelectedTarget}
          sendMenuOpen={sendMenuOpen}
          setSendMenuOpen={setSendMenuOpen}
          siteText={siteText}
          onClearSelection={onClearSelection}
          quickPromptMenuOpen={quickPromptMenuOpen}
          setQuickPromptMenuOpen={setQuickPromptMenuOpen}
          quickPromptMenuRef={quickPromptMenuRef}
          quickPromptTriggerRef={quickPromptTriggerRef}
        />

        <div
          ref={editorContainerRef}
          className="relative rounded-lg border border-border/20 bg-black/55 shadow-inner"
          style={{ minHeight: REPLY_EDITOR_HEIGHT }}
          onPointerDownCapture={() => {
            primeEditorInteraction();
          }}
          onPointerEnter={() => {
            void preloadLazyMonacoEditor();
          }}
          onFocusCapture={() => {
            primeEditorInteraction();
          }}
        >
          {queryText.length === 0 ? (
            <div
              className="pointer-events-none absolute inset-0 z-10 text-muted-foreground/55 font-medium"
              style={{
                padding: REPLY_EDITOR_PADDING,
                fontSize: REPLY_EDITOR_FONT_SIZE,
                lineHeight: `${REPLY_EDITOR_LINE_HEIGHT}px`,
              }}
            >
              Type your reply here...
            </div>
          ) : null}
          <LazyMonacoEditor
            height={`${REPLY_EDITOR_HEIGHT}px`}
            theme="vs-dark"
            language="markdown"
            value={replyText}
            fallback={<div className="w-full bg-black/55" style={{ height: `${REPLY_EDITOR_HEIGHT}px` }} />}
            onMount={(editor) => {
              editorRef.current = editor;
              editor.updateOptions({
                fontSize: REPLY_EDITOR_FONT_SIZE,
                lineHeight: REPLY_EDITOR_LINE_HEIGHT,
                fontFamily: REPLY_EDITOR_FONT_FAMILY,
                padding: {
                  top: REPLY_EDITOR_PADDING,
                  bottom: REPLY_EDITOR_PADDING,
                },
                minimap: { enabled: false },
                lineNumbers: 'off',
                lineNumbersMinChars: 0,
                lineDecorationsWidth: 0,
                glyphMargin: false,
                folding: false,
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                renderLineHighlight: 'none',
                overviewRulerBorder: false,
                overviewRulerLanes: 0,
                hideCursorInOverviewRuler: true,
                automaticLayout: true,
              });
              requestAnimationFrame(() => {
                editor.layout();
                if (pendingEditorFocusRef.current) {
                  pendingEditorFocusRef.current = false;
                  focusReplyEditorAtEnd(editor);
                }
              });
            }}
            onChange={(value) => setReplyText(value || '')}
            options={{
              ariaLabel: 'Session reply message',
              minimap: { enabled: false },
              fontSize: REPLY_EDITOR_FONT_SIZE,
              lineHeight: REPLY_EDITOR_LINE_HEIGHT,
              fontFamily: REPLY_EDITOR_FONT_FAMILY,
              lineNumbers: 'off',
              lineNumbersMinChars: 0,
              lineDecorationsWidth: 0,
              glyphMargin: false,
              folding: false,
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              padding: {
                top: REPLY_EDITOR_PADDING,
                bottom: REPLY_EDITOR_PADDING,
              },
              renderLineHighlight: 'none',
              overviewRulerBorder: false,
              overviewRulerLanes: 0,
              hideCursorInOverviewRuler: true,
              automaticLayout: true,
              cursorWidth: 2,
              scrollbar: {
                vertical: 'hidden',
                horizontal: 'hidden',
              },
            }}
          />
        </div>

        {error ? (
          <div
            aria-live="polite"
            className="border-t border-rose-500/10 bg-rose-500/5 px-3 py-2 text-[9px] font-medium text-rose-400"
          >
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}
