import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import React, { useEffect } from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { useExplorerResearchLane } from '../useExplorerResearchLane';
import type { ExplorerResearchPreview } from '../explorerResearchArtifacts';

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
  if (!(dom.window.HTMLElement.prototype as any).attachEvent) {
    (dom.window.HTMLElement.prototype as any).attachEvent = () => undefined;
  }
  if (!(dom.window.HTMLElement.prototype as any).detachEvent) {
    (dom.window.HTMLElement.prototype as any).detachEvent = () => undefined;
  }
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
  promptForPath,
}: {
  onState: (value: any) => void;
  dependencies: any;
  promptForPath: (defaultValue: string) => Promise<string | null>;
}) {
  const state = useExplorerResearchLane(
    {
      rootPath: '/repo',
      targetDirPath: 'docs',
      allowMemoCapture: true,
      allowMarkdownSave: true,
      promptForPath,
    },
    dependencies
  );

  useEffect(() => {
    onState(state);
  }, [onState, state]);

  return null;
}

test('useExplorerResearchLane keeps URL handoff inside workspace and memo artifacts', async () => {
  const env = setupDom();
  try {
    const root = createRoot(document.getElementById('root')!);
    const preview: ExplorerResearchPreview = {
      url: 'https://example.com/capability-platform',
      title: 'Capability Platform',
      siteName: 'Example Docs',
      summary: 'Explorer research lane should stay bounded.',
      excerpt: 'URL intake should resolve into durable project artifacts.',
      text: 'Full reader text.',
      wordCount: 11,
      charCount: 17,
      fetchedAt: '2026-03-30T00:00:00.000Z',
      truncated: false,
    };
    const writes: Array<Record<string, any>> = [];
    const memos: Array<Record<string, any>> = [];
    const browserLaunches: Array<Record<string, any>> = [];
    const promptValues: string[] = [];
    let latestState: any = null;

    const dependencies = {
      fetchPreview: async ({ url }: { url: string }) => ({
        ...preview,
        url: url === 'example.com/capability-platform' ? preview.url : url,
      }),
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
          promptForPath={async (defaultValue) => {
            promptValues.push(defaultValue);
            return 'docs/research/platform.md';
          }}
        />
      );
    });

    await act(async () => {
      latestState.setUrl('example.com/capability-platform');
    });

    await act(async () => {
      await latestState.openInBrowser();
    });

    assert.deepEqual(browserLaunches, [{ url: 'https://example.com/capability-platform' }]);

    await act(async () => {
      await latestState.inspect();
    });

    assert.equal(latestState.url, 'https://example.com/capability-platform');
    assert.equal(latestState.suggestedPath, 'docs/capability-platform.md');

    await act(async () => {
      latestState.setNote('Keep this lane subordinate to Explorer.');
    });

    await act(async () => {
      await latestState.saveMarkdown();
    });

    assert.deepEqual(promptValues, ['docs/capability-platform.md']);
    assert.equal(writes.length, 1);
    assert.equal(writes[0]?.rootPath, '/repo');
    assert.equal(writes[0]?.targetPath, 'docs/research/platform.md');
    assert.match(writes[0]?.content, /## Handoff Note/);
    assert.match(writes[0]?.content, /Keep this lane subordinate to Explorer\./);
    assert.match(writes[0]?.content, /Captured Via: explorer-research-lane/);
    assert.equal(latestState.savedArtifact?.path, 'docs/research/platform.md');

    await act(async () => {
      await latestState.createCitationMemo();
    });

    assert.equal(memos.length, 1);
    assert.equal(memos[0]?.kind, 'memo');
    assert.equal(memos[0]?.worktreePath, '/repo');
    assert.deepEqual(memos[0]?.references, [
      {
        system: 'workspace',
        path: 'docs/research/platform.md',
      },
    ]);
    assert.equal(memos[0]?.meta?.sourceSurface, 'explorer-research-lane');
    assert.equal(memos[0]?.meta?.source?.note, 'Keep this lane subordinate to Explorer.');
    assert.equal(memos[0]?.meta?.workspace?.path, 'docs/research/platform.md');
    assert.match(
      memos[0]?.body,
      /Keep this lane subordinate to Explorer\.\n\nExplorer research lane should stay bounded\./
    );
    assert.equal(latestState.memoArtifact?.id, 'h_memo_1');

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});
