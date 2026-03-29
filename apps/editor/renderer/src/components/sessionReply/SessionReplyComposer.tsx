import React, { useRef } from 'react';
import { ChevronDown, Link2, Loader2, Reply, Send, Sparkles, StickyNote, Users, X } from 'lucide-react';

import { resolveAvatarId } from '../../utils/agentAvatar';
import { AgentAvatarBadge } from '../ui/AgentAvatarBadge';
import { focusRing } from '../ui/focusRing';
import { Tooltip } from '../ui/Tooltip';
import { LazyMonacoEditor, preloadLazyMonacoEditor } from '../ui/LazyMonacoEditor';
import {
  REPLY_EDITOR_FONT_FAMILY,
  REPLY_EDITOR_FONT_SIZE,
  REPLY_EDITOR_HEIGHT,
  REPLY_EDITOR_LINE_HEIGHT,
  REPLY_EDITOR_PADDING,
  SCOPE_LABELS,
  focusReplyEditorAtEnd,
  renderReplySiteSegments,
} from './sessionReplyShared';

export function SessionReplyComposer({
  editorRef,
  editorContainerRef,
  quickPromptMenuRef,
  quickPromptTriggerRef,
  replyText,
  setReplyText,
  queryText,
  error,
  availableQuickPrompts,
  quickPromptMenuOpen,
  setQuickPromptMenuOpen,
  handleInsertQuickPrompt,
  selectedTarget,
  setSelectedTarget,
  otherTargets,
  sendMenuOpen,
  setSendMenuOpen,
  hasContent,
  submitting,
  targetLabel,
  handleCreateReply,
  selectionContext,
  siteText,
  onClearSelection,
}: any) {
  const focusRingClass = focusRing.default;
  const pendingEditorFocusRef = useRef(false);

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
        <div className="flex items-center justify-between px-2.5 py-1.5 bg-muted/10 border-b border-border/10">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              Compose
            </span>
            <div className="relative">
              <button
                ref={quickPromptTriggerRef}
                type="button"
                onClick={() =>
                  setQuickPromptMenuOpen((current: boolean) => {
                    const next = !current;
                    if (next) {
                      setSendMenuOpen(false);
                    }
                    return next;
                  })
                }
                disabled={!availableQuickPrompts.length}
                className={`inline-flex h-6 items-center gap-1 rounded-md border border-border/30 bg-background/60 px-2 text-[10px] font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-35 ${focusRingClass}`}
              >
                <Sparkles size={10} />
                <span>快捷回复如何</span>
                <ChevronDown size={10} />
              </button>
              {quickPromptMenuOpen ? (
                <div
                  ref={quickPromptMenuRef}
                  className="absolute left-0 top-full z-50 mt-2 w-80 max-h-72 overflow-y-auto rounded-lg border border-border/50 bg-popover p-1 shadow-2xl"
                >
                  {availableQuickPrompts.length ? (
                    availableQuickPrompts.map((prompt: any) => (
                      <button
                        key={prompt.id}
                        type="button"
                        onClick={() => handleInsertQuickPrompt(prompt.text)}
                        className="w-full rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted/40"
                      >
                        {prompt.title ? (
                          <div className="truncate text-[10px] font-semibold text-foreground">{prompt.title}</div>
                        ) : null}
                        <div className="line-clamp-2 whitespace-pre-wrap break-words text-[10px] font-mono text-muted-foreground">
                          {prompt.text}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {(prompt.sources || []).map((source: string) => (
                            <span
                              key={`${prompt.id}-${source}`}
                              className="rounded border border-border/60 bg-muted/20 px-1 py-0.5 text-[8px] font-bold uppercase tracking-widest text-muted-foreground/70"
                            >
                              {SCOPE_LABELS[source] || source}
                            </span>
                          ))}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-2 py-3 text-[10px] text-muted-foreground/70">No quick prompts configured.</div>
                  )}
                </div>
              ) : null}
            </div>
            {selectedTarget ? (
              <div className="flex items-center gap-1 text-[9px] text-primary/85 bg-primary/10 rounded-full px-2 py-0.5 border border-primary/20">
                <AgentAvatarBadge
                  avatarId={resolveAvatarId(selectedTarget.avatar || selectedTarget.sessionId || selectedTarget.cellId)}
                  size={10}
                  showRing={false}
                />
                <span className="font-bold truncate opacity-90">To @{selectedTarget.sessionName || selectedTarget.sessionId}</span>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Tooltip label="Record as Memo" side="top">
              <button
                type="button"
                onClick={() => handleCreateReply({ action: 'record' })}
                disabled={!hasContent || submitting}
                className={`flex h-6 w-6 items-center justify-center rounded-md border border-border/30 bg-background/50 text-muted-foreground transition-all hover:text-primary hover:border-primary/30 disabled:opacity-30 ${focusRingClass}`}
              >
                {submitting && !sendMenuOpen ? <Loader2 size={12} className="animate-spin" /> : <StickyNote size={12} />}
              </button>
            </Tooltip>

            <div className="h-4 w-[1px] bg-border/20 mx-0.5" />

            <div className="flex items-center gap-1 bg-background/70 rounded-lg p-0.5 border border-border/20 shadow-inner">
              <div className="relative">
                <Tooltip label={sendMenuOpen ? null : selectedTarget ? 'Change Target' : 'Select Target'} side="top">
                  <button
                    type="button"
                    onClick={() =>
                      setSendMenuOpen((current: boolean) => {
                        const next = !current;
                        if (next) {
                          setQuickPromptMenuOpen(false);
                        }
                        return next;
                      })
                    }
                    disabled={!otherTargets.length}
                    className={`flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-all hover:bg-muted/20 hover:text-foreground disabled:opacity-30 ${selectedTarget ? 'text-primary bg-primary/15' : ''} ${focusRingClass}`}
                  >
                    <Users size={12} />
                  </button>
                </Tooltip>

                {sendMenuOpen ? (
                  <div className="absolute bottom-full right-0 mb-2 w-64 origin-bottom-right overflow-hidden rounded-xl border border-border/20 bg-popover text-popover-foreground shadow-2xl animate-in fade-in zoom-in-95 duration-100 z-50">
                    <div className="px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 border-b border-border/10 bg-muted/5">
                      Route Reply To...
                    </div>
                    <div className="max-h-48 overflow-y-auto custom-scrollbar p-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTarget(null);
                          setSendMenuOpen(false);
                        }}
                        className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] transition-colors hover:bg-primary/5 hover:text-primary ${!selectedTarget ? 'bg-primary/10 text-primary' : ''}`}
                      >
                        <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Reply size={10} />
                        </div>
                        <span className="truncate flex-1 font-semibold">Current Session</span>
                      </button>
                      {otherTargets.map((target: any) => (
                        <button
                          key={`${target.cellId}:${target.sessionId}`}
                          type="button"
                          onClick={() => {
                            setSelectedTarget(target);
                            setSendMenuOpen(false);
                          }}
                          className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] transition-colors hover:bg-primary/5 hover:text-primary ${selectedTarget?.sessionId === target.sessionId ? 'bg-primary/10 text-primary' : ''}`}
                        >
                          <AgentAvatarBadge
                            avatarId={resolveAvatarId(target.avatar || target.sessionId || target.cellId)}
                            size={16}
                            showRing={false}
                          />
                          <span className="truncate flex-1 opacity-80 font-medium">
                            {target.cellName || target.cellId} / {target.sessionName || target.sessionId}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <Tooltip label={`Send to ${targetLabel}`} side="top">
                <button
                  type="button"
                  onClick={() => handleCreateReply({ action: 'send' })}
                  disabled={!hasContent || submitting}
                  className={`flex h-6 items-center gap-1.5 rounded-md bg-primary px-3 text-[10px] font-bold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 disabled:opacity-50 active:scale-95 ${focusRingClass}`}
                >
                  <span>Send</span>
                  {submitting ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />}
                </button>
              </Tooltip>
            </div>
          </div>
        </div>

        {selectionContext ? (
          <div className="px-3 py-2 bg-black/20 border-b border-border/10">
            <div className="flex flex-col gap-1 rounded-md border border-border/10 bg-muted/5 p-2">
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-widest text-primary/50">
                  <Link2 size={10} />
                  <span>Context Cite</span>
                </div>
                <button
                  type="button"
                  onClick={() => onClearSelection?.()}
                  className="rounded-full p-1 text-muted-foreground/30 hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
                >
                  <X size={10} />
                </button>
              </div>
              <div className="line-clamp-2 text-[10px] font-mono text-muted-foreground/70 leading-normal">
                {siteText ? renderReplySiteSegments(siteText) : <span className="italic opacity-30">No content</span>}
              </div>
            </div>
          </div>
        ) : null}

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
          <div className="px-3 py-2 bg-rose-500/5 border-t border-rose-500/10 text-[9px] text-rose-400 font-medium">
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}
