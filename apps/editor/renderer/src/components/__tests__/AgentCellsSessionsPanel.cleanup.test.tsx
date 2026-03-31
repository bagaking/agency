import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';

import { AttentionLayerProvider } from '../../attention/AttentionLayerContext';
import { AgentCellsSessionsPanel } from '../agentCells/AgentCellsSessionsPanel';
import { ModalProvider } from '../modals/ModalSystem';

const emptyAttentionValue = {
  localItems: [],
  windowItems: [],
  allItems: [],
  primaryItem: null,
  localSummary: {
    version: 1,
    itemCount: 0,
    highestSeverity: null,
    countsByKind: {},
    primary: null,
    updatedAt: '',
  },
  byCellId: {},
  bySessionKey: {},
  jumpToAttention: () => undefined,
};

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

function renderPanel(props: Record<string, unknown> = {}) {
  return (
    <ModalProvider>
      <AttentionLayerProvider value={emptyAttentionValue as any}>
        <AgentCellsSessionsPanel
          cells={[]}
          selectedId={null}
          projectReady={true}
          projectError=""
          recentProjects={[]}
          sessionsByCellId={{}}
          activeSessionByCellId={{}}
          sessionActivityByKey={{}}
          terminusProfiles={[]}
          onSelect={() => undefined}
          onOpenExplorer={() => undefined}
          onSelectProject={() => undefined}
          onOpenRecentProject={() => undefined}
          onSelectSession={() => undefined}
          onCreateSession={async () => null}
          onDispatchCommand={() => undefined}
          onCloseSession={() => undefined}
          onDetachSession={() => undefined}
          onRenameSession={() => undefined}
          onUpdateSessionAvatar={() => undefined}
          onMoveSessionNode={async () => undefined}
          onContinueSessionOnMobile={() => undefined}
          onTrackPendingHarnessRun={() => undefined}
          onClearTrackedHarnessRun={() => undefined}
          onSettleTrackedHarnessRun={async () => false}
          onFocusSessionInUi={() => undefined}
          onConfigureProfile={() => undefined}
          {...props}
        />
      </AttentionLayerProvider>
    </ModalProvider>
  );
}

test('AgentCellsSessionsPanel shows an explicit archived entry point alongside active and cleanup buckets', () => {
  const html = renderToStaticMarkup(
    renderPanel({
      cells: [
        {
          id: 'cell-active',
          name: 'entirely active',
          state: 'active',
          attachmentState: 'attached',
          worktreePath: '/repo/.worktrees/cell-active',
        },
        {
          id: 'cell-needs-cleanup',
          name: 'needs cleanup',
          state: 'draft',
          attachmentState: 'missing',
          lastKnownWorktreePath: '/repo/.worktrees/needs-cleanup',
        },
        {
          id: 'cell-archived',
          name: 'archived cell',
          state: 'archived',
          attachmentState: 'attached',
          attachedWorktreePath: '/repo/.worktrees/archived',
        },
      ],
      sessionsByCellId: {
        'cell-active': [
          {
            id: 'session-active',
            name: 'Active',
            status: 'active',
          },
        ],
      },
    })
  );

  assert.match(html, /data-testid="cell-item-cell-active"/);
  assert.match(html, /Needs Cleanup/);
  assert.match(html, /View Archived/);
  assert.match(html, /detached-cell-cleanup-cell-needs-cleanup/);
  assert.match(html, /Archive Cell/);
  assert.doesNotMatch(html, /archived-cell-card-cell-archived/);
});

test('AgentCellsSessionsPanel renders detached cells as cleanup cards instead of session trees', () => {
  const html = renderToStaticMarkup(
    renderPanel({
      cells: [
        {
          id: 'cell-missing',
          name: 'attention_routing',
          state: 'draft',
          attachmentState: 'missing',
          lastKnownWorktreePath: '/repo/.worktrees/attention_routing',
        },
      ],
      sessionsByCellId: {
        'cell-missing': [
          {
            id: 'session-stale',
            name: 'Default',
            status: 'stale',
          },
        ],
      },
    })
  );

  assert.match(html, /Needs Cleanup/);
  assert.match(html, /Archive Cell/);
  assert.match(html, /detached-cell-cleanup-cell-missing/);
  assert.doesNotMatch(html, /data-testid="session-tab-session-stale"/);
});

test('View Archived reveals archived cards and keeps archived cells out of cleanup semantics', async () => {
  const env = setupDom();
  try {
    const selections: string[] = [];
    const archives: string[] = [];
    const root = createRoot(document.getElementById('root')!);

    await act(async () => {
      root.render(
        renderPanel({
          cells: [
            {
              id: 'cell-archived',
              name: 'feat-explorer-url-mode',
              state: 'archived',
              attachmentState: 'missing',
              lastKnownWorktreePath: '/repo/.worktrees/feat-explorer-url-mode',
            },
            {
              id: 'cell-archived-attached',
              name: 'mainline-review',
              state: 'archived',
              attachmentState: 'attached',
              attachedWorktreePath: '/repo/.worktrees/mainline-review',
            },
            {
              id: 'cell-cleanup',
              name: 'detached-cell',
              state: 'draft',
              attachmentState: 'missing',
              lastKnownWorktreePath: '/repo/.worktrees/detached-cell',
            },
          ],
          onSelect: (cellId: string) => selections.push(cellId),
          onArchiveCell: (cell: any) => archives.push(String(cell?.id || '')),
        })
      );
    });

    const toggle = Array.from(document.querySelectorAll('button')).find((node) =>
      node.textContent?.includes('View Archived')
    ) as HTMLButtonElement | undefined;
    assert.ok(toggle);

    await act(async () => {
      toggle.click();
    });

    assert.ok(document.querySelector('[data-testid="archived-cell-list"]'));
    assert.ok(document.querySelector('[data-testid="archived-cell-card-cell-archived"]'));
    assert.ok(document.querySelector('[data-testid="archived-cell-card-cell-archived-attached"]'));
    assert.equal(document.querySelector('[data-testid="detached-cell-cleanup-cell-archived"]'), null);

    const reviewButton = Array.from(document.querySelectorAll('button')).find((node) =>
      node.textContent?.includes('View Details')
    ) as HTMLButtonElement | undefined;
    assert.ok(reviewButton);

    await act(async () => {
      reviewButton.click();
    });

    assert.deepEqual(selections, ['cell-archived']);
    assert.deepEqual(archives, []);

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});

test('cleanup card archive action triggers archive handler without falling through to plain selection', async () => {
  const env = setupDom();
  try {
    const selections: string[] = [];
    const archives: string[] = [];
    const root = createRoot(document.getElementById('root')!);

    await act(async () => {
      root.render(
        renderPanel({
          cells: [
            {
              id: 'cell-missing',
              name: 'attention_routing',
              state: 'draft',
              attachmentState: 'missing',
              lastKnownWorktreePath: '/repo/.worktrees/attention_routing',
            },
          ],
          onSelect: (cellId: string) => selections.push(cellId),
          onArchiveCell: (cell: any) => archives.push(String(cell?.id || '')),
        })
      );
    });

    const button = Array.from(document.querySelectorAll('button')).find((node) =>
      node.textContent?.includes('Archive Cell')
    ) as HTMLButtonElement | undefined;
    assert.ok(button);

    await act(async () => {
      button.click();
    });

    assert.deepEqual(archives, ['cell-missing']);
    assert.deepEqual(selections, []);

    await act(async () => {
      button.dispatchEvent(
        new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      );
    });

    assert.deepEqual(selections, []);

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});
