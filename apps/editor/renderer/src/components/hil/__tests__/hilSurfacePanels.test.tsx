import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';

import { AppHilPanel } from '../../layout/AppHilPanel';
import { HilDraftsPanel } from '../HilDraftsPanel';
import { HilCommentsPanel } from '../HilCommentsPanel';
import { PromoteModal } from '../HilPromoteModal';
import { HilMemoDrawer } from '../HilMemoDrawer';
import { HilMemoSidebar } from '../memo/HilMemoSidebar';

function withSuppressedLayoutEffectWarnings(run: () => void | Promise<void>) {
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const [firstArg] = args;
    if (
      typeof firstArg === 'string' &&
      firstArg.includes('useLayoutEffect does nothing on the server')
    ) {
      return;
    }
    originalConsoleError(...args);
  };
  return Promise.resolve(run()).finally(() => {
    console.error = originalConsoleError;
  });
}

function setupDom() {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: 'http://localhost/',
  });
  const previous = {
    window: globalThis.window,
    document: globalThis.document,
    navigator: globalThis.navigator,
    HTMLElement: globalThis.HTMLElement,
    Node: globalThis.Node,
    SVGElement: globalThis.SVGElement,
    Event: globalThis.Event,
    MouseEvent: globalThis.MouseEvent,
    KeyboardEvent: globalThis.KeyboardEvent,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    cancelAnimationFrame: globalThis.cancelAnimationFrame,
  };
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    Node: dom.window.Node,
    SVGElement: dom.window.SVGElement,
    Event: dom.window.Event,
    MouseEvent: dom.window.MouseEvent,
    KeyboardEvent: dom.window.KeyboardEvent,
  });
  const requestAnimationFrame = (callback: FrameRequestCallback) =>
    setTimeout(() => callback(Date.now()), 0) as unknown as number;
  const cancelAnimationFrame = (handle: number) => clearTimeout(handle);
  globalThis.requestAnimationFrame = requestAnimationFrame;
  globalThis.cancelAnimationFrame = cancelAnimationFrame;
  dom.window.requestAnimationFrame = requestAnimationFrame;
  dom.window.cancelAnimationFrame = cancelAnimationFrame;
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: dom.window.navigator,
  });
  return {
    cleanup() {
      Object.assign(globalThis, {
        window: previous.window,
        document: previous.document,
        HTMLElement: previous.HTMLElement,
        Node: previous.Node,
        SVGElement: previous.SVGElement,
        Event: previous.Event,
        MouseEvent: previous.MouseEvent,
        KeyboardEvent: previous.KeyboardEvent,
      });
      globalThis.requestAnimationFrame = previous.requestAnimationFrame;
      globalThis.cancelAnimationFrame = previous.cancelAnimationFrame;
      Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: previous.navigator,
      });
      delete (globalThis as any).IS_REACT_ACT_ENVIRONMENT;
      dom.window.close();
    },
  };
}

test('HilCommentsPanel exposes the new compose hierarchy when comment editor is open', () => {
  return withSuppressedLayoutEffectWarnings(() => {
    const html = renderToStaticMarkup(
      <HilCommentsPanel
        activeFile="pkg/agency-data/src/repositories/hilRepository.ts"
        cursorPosition={{ line: 42, column: 7 }}
        comments={[]}
        loading={false}
        error=""
        onOpenAnchor={() => undefined}
        onRevealAnchor={() => undefined}
        onOpenComment={() => undefined}
        onUpdateStatus={() => undefined}
        commentModalOpen={true}
        commentTarget={{ line: 42, column: 7 }}
        commentMessage=""
        commentTodo={false}
        commentError=""
        commentSaving={false}
        commentSnippet={{
          snippet: [
            { line: 41, content: 'before', isTarget: false },
            { line: 42, content: 'target', isTarget: true },
          ],
        }}
        commentSnippetLoading={false}
        commentSnippetError=""
        onCommentMessageChange={() => undefined}
        onCommentTodoChange={() => undefined}
        onCloseComment={() => undefined}
        onSubmitComment={() => undefined}
        worktreePath="/tmp/repo"
      />
    );

    assert.match(html, /Comments/);
    assert.match(html, /New Comment/);
    assert.match(html, /Capture the current line context first/);
    assert.match(html, /Write the note you want the future draft to preserve/);
  });
});

test('PromoteModal foregrounds records, execution lane, gate, and dispatch state', async () => {
  const env = setupDom();
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const [firstArg] = args;
    if (
      typeof firstArg === 'string' &&
      firstArg.includes('useLayoutEffect does nothing on the server')
    ) {
      return;
    }
    originalConsoleError(...args);
  };
  try {
    const root = createRoot(document.getElementById('root')!);
    await act(async () => {
      root.render(
        <PromoteModal
          open={true}
          loading={false}
          error=""
          description="Summarize the selected records"
          items={[]}
          selectedIds={['a', 'b']}
          previewById={{}}
          promoteStep="setup"
          promoteDraft={null}
          promoteMode="quick"
          promoteActionSheet={null}
          promoteGateStatus="idle"
          promoteExecutionStatus="idle"
          promoteSessionId="session-a"
          sessions={[{ id: 'session-a', name: 'Session A', status: 'active' }]}
          sessionActivityByKey={{}}
          selectedCellId="cell-a"
          onChangeDescription={() => undefined}
          onToggleItem={() => undefined}
          onToggleGroup={() => undefined}
          onPreviewItem={() => undefined}
          onSelectSession={() => undefined}
          onSelectMode={() => undefined}
          onCreateSession={() => undefined}
          onFocusSession={() => undefined}
          onClose={() => undefined}
          onDispatch={() => undefined}
          onConfirm={() => undefined}
          onOpenTimeline={() => undefined}
          onDispatchActionSheet={() => undefined}
          onCancelActionSheet={() => undefined}
          onArchiveActionSheet={() => undefined}
          onDeleteActionSheet={() => undefined}
          onOpenActionSheets={() => undefined}
        />
      );
    });

    const text = document.body.textContent || '';
    assert.match(text, /Promote/);
    assert.match(text, /Selected context/);
    assert.match(text, /Execution lane/);
    assert.match(text, /Draft gate/);
    assert.match(text, /Dispatch state/);

    await act(async () => {
      root.unmount();
    });
  } finally {
    console.error = originalConsoleError;
    env.cleanup();
  }
});

test('HilMemoSidebar shows row descriptions only for the active inbox section', () => {
  return withSuppressedLayoutEffectWarnings(() => {
    const html = renderToStaticMarkup(
      <HilMemoSidebar
        loading={false}
        refresh={() => undefined}
        searchQuery=""
        onSearchChange={() => undefined}
        filters={{ kind: 'all', status: 'all' }}
        onFiltersChange={() => undefined}
        summary={{ comment: 2, memo: 3, draft: 1 }}
        inboxSections={[
          { id: 'comments', label: 'Comments', description: 'File-linked review notes', icon: () => null },
          { id: 'flash', label: 'Flash', description: 'Quick note capture', icon: () => null },
        ]}
        inboxCounts={{ comments: 2, flash: 1 }}
        pendingInboxCount={3}
        dockSelection={{ type: 'inbox', inboxType: 'comments', draftId: null }}
        onDockSelectionChange={() => undefined}
        draftItems={[]}
        draftCount={0}
        summarizeBody={() => ''}
      />
    );

    assert.match(html, /File-linked review notes/);
    assert.doesNotMatch(html, /Quick note capture/);
    assert.match(html, /Memo/);
    assert.match(html, /6 records/);
    assert.doesNotMatch(html, /Artifact Workspace/);
    assert.doesNotMatch(html, /Capture, review, and route artifact records from one workspace/);
  });
});

test('AppHilPanel forwards the reply eyebrow into drawer chrome', () => {
  return withSuppressedLayoutEffectWarnings(() => {
    const html = renderToStaticMarkup(
      <AppHilPanel
        activeView="agent-cells"
        hilDrawerOpen={true}
        hilDrawerPanel="reply"
        onToggleHilDrawer={() => undefined}
        onSelectHilDrawerPanel={() => undefined}
        onOpenHilPromote={() => undefined}
        hilCommentsProps={{}}
        hilDraftsProps={{}}
        hilReplyProps={{ session: { id: 'session-a', name: 'Session A' } }}
        memoDrawerProps={{}}
        hilSubtitle=""
      />
    );

    assert.match(html, /Session-owned relay/);
    assert.doesNotMatch(html, /Artifact Workspace/);
  });
});

test('HilDraftsPanel reflects memo-first draft queue language', () => {
  return withSuppressedLayoutEffectWarnings(() => {
    const html = renderToStaticMarkup(
      <HilDraftsPanel
        drafts={[
          {
            id: 'draft-1',
            status: 'open',
            body: 'Draft body',
            meta: { actionSheetId: 'action-1' },
          },
        ]}
        summarizeBody={() => 'Draft body'}
        onOpenDraft={() => undefined}
        onViewSession={() => undefined}
        onRunDraft={() => undefined}
        actionSheets={[{ id: 'action-1', state: 'idle' }]}
        sessions={[]}
        activeSessionId="session-a"
      />
    );

    assert.match(html, /Execution-ready artifacts/);
    assert.match(html, /Action Sheet action-1/);
    assert.match(html, /Run/);
  });
});

test('HilMemoDrawer keeps capture shortcuts visible as one rail', () => {
  return withSuppressedLayoutEffectWarnings(() => {
    const html = renderToStaticMarkup(
      <HilMemoDrawer
        activeInboxId="flash"
        onSelectInbox={() => undefined}
        onOpenInbox={() => undefined}
        flashValue=""
        onFlashChange={() => undefined}
        onSaveFlash={() => undefined}
        flashVoice={null}
        flashVoiceSegments={[]}
        flashVoiceShortcut=""
        excerptUrl=""
        onExcerptUrlChange={() => undefined}
        onFetchExcerpt={() => undefined}
        excerptPreview={null}
        excerptFetching={false}
        excerptNote=""
        onExcerptNoteChange={() => undefined}
        onSaveExcerpt={() => undefined}
        screenshotAsset={null}
        pendingCapture={null}
        screenshotNote=""
        onScreenshotNoteChange={() => undefined}
        onCaptureScreenshot={() => undefined}
        onOpenRouting={() => undefined}
        captureLoading={false}
        onFocusInboxInput={() => undefined}
        screenshotShortcut=""
      />
    );

    assert.match(html, /Capture/);
    assert.match(html, /Flash/);
    assert.match(html, /Excerpt/);
    assert.match(html, /Screenshot/);
    assert.match(html, /Open Memo/);
  });
});

export {};
