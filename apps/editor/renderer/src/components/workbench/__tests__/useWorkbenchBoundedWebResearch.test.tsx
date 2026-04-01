import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import React, { useEffect } from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { useWorkbenchBoundedWebResearch } from '../useWorkbenchBoundedWebResearch';
import type { ExplorerResearchPreview } from '../../explorer/explorerResearchArtifacts';

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
    Event: globalThis.Event,
    MouseEvent: globalThis.MouseEvent,
    KeyboardEvent: globalThis.KeyboardEvent,
  };
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    Node: dom.window.Node,
    Event: dom.window.Event,
    MouseEvent: dom.window.MouseEvent,
    KeyboardEvent: dom.window.KeyboardEvent,
  });
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
        Event: previous.Event,
        MouseEvent: previous.MouseEvent,
        KeyboardEvent: previous.KeyboardEvent,
      });
      Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: previous.navigator,
      });
      delete (globalThis as any).IS_REACT_ACT_ENVIRONMENT;
      dom.window.close();
    },
  };
}

function Harness({
  onState,
  dependencies,
}: {
  onState: (value: any) => void;
  dependencies: any;
}) {
  const state = useWorkbenchBoundedWebResearch(
    {
      rootPath: '/repo',
      url: 'https://example.com/capability-platform',
      promptForPath: async () => 'docs/research/platform.md',
    },
    dependencies
  );

  useEffect(() => {
    onState(state);
  }, [onState, state]);

  return null;
}

test('useWorkbenchBoundedWebResearch hosts bounded url actions in a workbench context', async () => {
  const env = setupDom();
  try {
    const root = createRoot(document.getElementById('root')!);
    const preview: ExplorerResearchPreview = {
      url: 'https://example.com/capability-platform',
      title: 'Capability Platform',
      siteName: 'Example Docs',
      summary: 'Workbench bounded web research should keep actions in the host tab.',
      excerpt: 'Reader mode should still hand off into repo artifacts.',
      text: 'Full reader text.',
      wordCount: 12,
      charCount: 20,
      fetchedAt: '2026-03-30T00:00:00.000Z',
      truncated: false,
    };
    const writes: Array<Record<string, any>> = [];
    const memos: Array<Record<string, any>> = [];
    const browserLaunches: Array<Record<string, any>> = [];
    const inspectedUrls: string[] = [];
    let latestState: any = null;

    const dependencies = {
      fetchPreview: async ({ url }: { url: string }) => {
        inspectedUrls.push(url);
        return preview;
      },
      openExternal: async (payload: Record<string, any>) => {
        browserLaunches.push(payload);
        return { ok: true };
      },
      writeEntry: async (payload: Record<string, any>) => {
        writes.push(payload);
        return { path: 'docs/research/platform.md' };
      },
      createMemo: async (payload: Record<string, any>) => {
        memos.push(payload);
        return { id: 'h_memo_1' };
      },
    };

    await act(async () => {
      root.render(
        <Harness
          onState={(value) => {
            latestState = value;
          }}
          dependencies={dependencies}
        />
      );
    });

    assert.deepEqual(inspectedUrls, ['https://example.com/capability-platform']);
    assert.equal(latestState.preview?.title, 'Capability Platform');

    await act(async () => {
      latestState.setNote('Keep the actions in Workbench.');
      await latestState.saveMarkdown();
      await latestState.createCitationMemo();
      await latestState.openInBrowser();
    });

    assert.equal(writes[0]?.targetPath, 'docs/research/platform.md');
    assert.equal(memos[0]?.meta?.sourceSurface, 'workbench-bounded-web-research');
    assert.deepEqual(browserLaunches, [{ url: 'https://example.com/capability-platform' }]);

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});

test('useWorkbenchBoundedWebResearch overwrites a linked markdown path without prompting for a new path', async () => {
  const env = setupDom();
  try {
    const root = createRoot(document.getElementById('root')!);
    const writes: Array<Record<string, any>> = [];
    const savedPaths: string[] = [];
    let latestState: any = null;

    const dependencies = {
      fetchPreview: async ({ url }: { url: string }) => ({
        url,
        title: 'Linked Doc',
        siteName: 'Example Docs',
        summary: 'Linked summary.',
        text: 'Linked text.',
      }),
      openExternal: async () => ({ ok: true }),
      writeEntry: async (payload: Record<string, any>) => {
        writes.push(payload);
        return { path: payload.targetPath };
      },
      createMemo: async () => ({ id: 'memo' }),
    };

    function LinkedHarness({ onState }: { onState: (value: any) => void }) {
      const state = useWorkbenchBoundedWebResearch(
        {
          rootPath: '/repo',
          url: 'https://example.com/linked',
          linkedMarkdownPath: 'docs/linked.md',
          onMarkdownSaved: (path) => savedPaths.push(path),
          promptForPath: async () => {
            throw new Error('prompt should not run for linked markdown');
          },
        },
        dependencies
      );
      useEffect(() => onState(state), [onState, state]);
      return null;
    }

    await act(async () => {
      root.render(
        <LinkedHarness
          onState={(value) => {
            latestState = value;
          }}
        />
      );
    });

    await act(async () => {
      await latestState.saveMarkdown();
    });

    assert.equal(writes[0]?.targetPath, 'docs/linked.md');
    assert.deepEqual(savedPaths, ['docs/linked.md']);

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});
