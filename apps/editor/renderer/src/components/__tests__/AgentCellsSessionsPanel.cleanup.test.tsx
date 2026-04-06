import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';

import { AttentionLayerProvider } from '../../attention/AttentionLayerContext';
import { AgentCellsSessionsPanel } from '../agentCells/AgentCellsSessionsPanel';
import { deriveUnmanagedWorktreeDisplay } from '../agentCells/unmanagedWorktreePresentation';
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
          onArchiveCell={() => undefined}
          onCreateAttachmentCell={() => undefined}
          {...props}
        />
      </AttentionLayerProvider>
    </ModalProvider>
  );
}

test('AgentCellsSessionsPanel separates tracked workspaces, detached cells, and legacy archived compatibility cards', () => {
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
  assert.match(html, /Tracked Workspaces/);
  assert.match(html, /Detached Cells/);
  assert.match(html, /Legacy Archived/);
  assert.match(html, /detached-cell-card-cell-needs-cleanup/);
  assert.match(html, /View Details/);
  assert.doesNotMatch(html, /legacy-archived-cell-cell-archived/);
});

test('AgentCellsSessionsPanel renders branch-only cells in a dedicated branch-only section', () => {
  const html = renderToStaticMarkup(
    renderPanel({
      cells: [
        {
          id: 'cell-branch',
          name: 'mainline-review',
          branch: 'main',
          state: 'draft',
          attachmentState: 'branch_only',
        },
      ],
    })
  );

  assert.match(html, /Branch-only Cells/);
  assert.match(html, /branch-only-cell-card-cell-branch/);
  assert.match(html, /Create Worktree Attachment/);
  assert.match(html, /mainline-review/);
  assert.match(html, />main</);
});

test('AgentCellsSessionsPanel renders detached cells as management cards instead of session trees', () => {
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
          {
            id: 'session-detached',
            name: 'Sidecar',
            status: 'detached',
          },
        ],
      },
    })
  );

  assert.match(html, /Detached Cells/);
  assert.match(html, /detached-cell-card-cell-missing/);
  assert.match(html, /attention_routing/);
  assert.match(html, /Archive Cell/);
  assert.match(html, /View Details/);
  assert.doesNotMatch(html, /data-testid="session-tab-session-stale"/);
});

test('detached management cards distinguish missing and detached attachment badges', () => {
  const html = renderToStaticMarkup(
    renderPanel({
      cells: [
        {
          id: 'cell-missing',
          name: 'missing-cell',
          state: 'draft',
          attachmentState: 'missing',
          lastKnownWorktreePath: '/repo/.worktrees/missing-cell',
        },
        {
          id: 'cell-detached',
          name: 'detached-cell',
          state: 'draft',
          attachmentState: 'detached',
          lastKnownWorktreePath: '/repo/.worktrees/detached-cell',
        },
      ],
    })
  );

  assert.match(html, /Missing/);
  assert.match(html, /Detached/);
});

test('deriveUnmanagedWorktreeDisplay marks detached-head worktrees as non-creatable', () => {
  const display = deriveUnmanagedWorktreeDisplay({
    id: 'unmanaged-detached',
    path: '/repo/.worktrees/detached',
    branch: '',
    head: 'abc1234',
    hasBranch: false,
    isDetachedHead: true,
    ignored: false,
    bindSuggestion: null,
  });

  assert.equal(display.canCreateCell, false);
  assert.equal(display.primaryAction, 'none');
  assert.match(display.detachedHeadLabel, /Detached HEAD/);
  assert.match(display.helperText, /cannot track this worktree as a Cell/);
  assert.match(display.availabilityLabel, /Branch Required/);
});

test('deriveUnmanagedWorktreeDisplay prioritizes deterministic reattach over creating a duplicate cell', () => {
  const display = deriveUnmanagedWorktreeDisplay({
    id: 'unmanaged-bindable',
    path: '/repo/.worktrees/feature',
    branch: 'feat/feature',
    head: 'abc1234',
    hasBranch: true,
    isDetachedHead: false,
    ignored: false,
    bindSuggestion: {
      kind: 'unique_branch_match',
      cellId: 'cell-feature',
      cellName: 'feature',
    },
  });

  assert.equal(display.primaryAction, 'bind');
  assert.match(display.primaryLabel, /Reattach feature/);
  assert.match(display.secondaryCreateLabel, /Create New Cell/);
});

test('deriveUnmanagedWorktreeDisplay uses Bind for branch-only cell suggestions', () => {
  const display = deriveUnmanagedWorktreeDisplay({
    id: 'unmanaged-bind-branch-only',
    path: '/repo/.worktrees/main',
    branch: 'main',
    head: 'abc1234',
    hasBranch: true,
    isDetachedHead: false,
    ignored: false,
    bindSuggestion: {
      kind: 'unique_branch_match',
      cellId: 'cell-main',
      cellName: 'main',
      cellAttachmentState: 'branch_only',
    },
  });

  assert.equal(display.primaryAction, 'bind');
  assert.match(display.primaryLabel, /^Bind main$/);
});

test('branch-only unmanaged bind suggestions route to branch mode instead of worktree reattach mode', async () => {
  const env = setupDom();
  try {
    const launches: any[] = [];
    (window as any).agency = {
      listUnmanagedWorktrees: async () => [
        {
          id: 'unmanaged-main',
          path: '/repo',
          branch: 'main',
          head: 'abc1234',
          hasBranch: true,
          isDetachedHead: false,
          ignored: false,
          bindSuggestion: {
            kind: 'unique_branch_match',
            cellId: 'cell-main',
            cellName: 'main',
            cellAttachmentState: 'branch_only',
          },
        },
      ],
    };
    const root = createRoot(document.getElementById('root')!);

    await act(async () => {
      root.render(
        renderPanel({
          projectRoot: '/repo',
          onCreateCell: (payload: any) => launches.push(payload),
        })
      );
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const bindButton = Array.from(document.querySelectorAll('button')).find((button) =>
      /Bind main/.test(button.textContent || '')
    ) as HTMLButtonElement | undefined;
    assert.ok(bindButton);

    await act(async () => {
      bindButton.click();
    });

    assert.deepEqual(launches, [
      {
        mode: 'branch',
        existingBranch: 'main',
        name: 'main',
        initialBindTargetCell: {
          id: 'cell-main',
          name: 'main',
          branch: 'main',
        },
      },
    ]);

    await act(async () => {
      root.unmount();
    });
  } finally {
    delete (window as any).agency;
    env.cleanup();
  }
});

test('Legacy archived toggle reveals compatibility cards while archived cells stay out of detached management', async () => {
  const env = setupDom();
  try {
    const selections: string[] = [];
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
        })
      );
    });

    const toggle = document.querySelector(
      'button[aria-controls="legacy-archived-cell-list"]'
    ) as HTMLButtonElement | null;
    assert.ok(toggle);

    await act(async () => {
      toggle.click();
    });

    assert.ok(document.querySelector('[data-testid="legacy-archived-cell-list"]'));
    assert.match(document.body.textContent || '', /Legacy Archived/);
    assert.ok(document.querySelector('[data-testid="legacy-archived-cell-cell-archived"]'));
    assert.ok(document.querySelector('[data-testid="legacy-archived-cell-cell-archived-attached"]'));
    assert.equal(document.querySelector('[data-testid="detached-cell-card-cell-archived"]'), null);

    const reviewButton = document.querySelector(
      '[data-testid="legacy-archived-cell-cell-archived"] button'
    ) as HTMLButtonElement | null;
    assert.ok(reviewButton);

    await act(async () => {
      reviewButton.click();
    });

    assert.deepEqual(selections, ['cell-archived']);

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});

test('detached management card details action routes selection explicitly', async () => {
  const env = setupDom();
  try {
    const selections: string[] = [];
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
        })
      );
    });

    const button = document.querySelector(
      '[data-testid="detached-cell-card-cell-missing"] button'
    ) as HTMLButtonElement | null;
    assert.ok(button);

    await act(async () => {
      button.click();
    });

    assert.deepEqual(selections, ['cell-missing']);

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});
