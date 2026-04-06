import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';

import { CreateCellModal } from '../modals/CreateCellModal';

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

async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

test('CreateCellModal loads worktree and branch options from the current project root', async () => {
  const env = setupDom();
  try {
    const calls: Array<{ method: string; payload: any }> = [];
    (window as any).agency = {
      listWorktrees: async (payload: any) => {
        calls.push({ method: 'listWorktrees', payload });
        return [];
      },
      listBranches: async (payload: any) => {
        calls.push({ method: 'listBranches', payload });
        return [];
      },
    };
    const root = createRoot(document.getElementById('root')!);

    await act(async () => {
      root.render(
        <CreateCellModal
          projectRoot="/repo"
          initialMode="worktree"
          onClose={() => undefined}
          onCreate={() => undefined}
        />
      );
    });
    await flushEffects();

    assert.deepEqual(calls, [
      { method: 'listWorktrees', payload: { rootPath: '/repo' } },
      { method: 'listBranches', payload: { rootPath: '/repo' } },
    ]);

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});

test('CreateCellModal allows detached-head reattach when an existing Cell binding target is provided', async () => {
  const env = setupDom();
  try {
    let createdPayload: any = null;
    (window as any).agency = {
      listWorktrees: async () => [
        {
          path: '/repo/.worktrees/detached-head',
          branch: '',
          head: 'abcdef1234567890',
        },
      ],
      listBranches: async () => [
        {
          name: 'main',
          current: true,
          isDefault: true,
          attachedWorktreePath: '/repo',
        },
      ],
    };
    const root = createRoot(document.getElementById('root')!);

    await act(async () => {
      root.render(
        <CreateCellModal
          projectRoot="/repo"
          initialMode="worktree"
          initialReusePath="/repo/.worktrees/detached-head"
          initialBindTargetCell={{
            id: 'cell-demo',
            name: 'Demo Cell',
            branch: 'feat/demo-cell',
          }}
          onClose={() => undefined}
          onCreate={(payload: any) => {
            createdPayload = payload;
          }}
        />
      );
    });
    await flushEffects();

    const submitButton = Array.from(document.querySelectorAll('button')).find((button) =>
      /Reattach Cell/.test(button.textContent || '')
    ) as HTMLButtonElement | undefined;

    assert.ok(submitButton);
    assert.equal(submitButton.disabled, false);
    assert.match(document.body.textContent || '', /Detached HEAD/);

    await act(async () => {
      submitButton.click();
    });

    assert.deepEqual(createdPayload, {
      name: 'Demo Cell',
      branch: undefined,
      baseBranch: undefined,
      existingBranch: undefined,
      reusePath: '/repo/.worktrees/detached-head',
      bindToCellId: 'cell-demo',
      bindBranchToCellId: undefined,
    });

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});

test('CreateCellModal keeps existing branch binding as a project-root Cell until attachment creation is explicit', async () => {
  const env = setupDom();
  try {
    let createdPayload: any = null;
    (window as any).agency = {
      listWorktrees: async () => [],
      listBranches: async () => [
        {
          name: 'main',
          current: true,
          isDefault: true,
          attachedWorktreePath: '',
        },
      ],
    };
    const root = createRoot(document.getElementById('root')!);

    await act(async () => {
      root.render(
        <CreateCellModal
          projectRoot="/repo"
          initialMode="branch"
          initialExistingBranch="main"
          initialName="mainline-review"
          onClose={() => undefined}
          onCreate={(payload: any) => {
            createdPayload = payload;
          }}
        />
      );
    });
    await flushEffects();

    const submitButton = Array.from(document.querySelectorAll('button')).find((button) =>
      /Bind Branch/.test(button.textContent || '')
    ) as HTMLButtonElement | undefined;

    assert.ok(submitButton);
    assert.equal(submitButton.disabled, false);
    assert.match(document.body.textContent || '', /No worktree will be created until you explicitly create an attachment later/);

    await act(async () => {
      submitButton.click();
    });

    assert.deepEqual(createdPayload, {
      name: 'mainline-review',
      branch: undefined,
      baseBranch: undefined,
      existingBranch: 'main',
      reusePath: undefined,
      bindToCellId: undefined,
      bindBranchToCellId: undefined,
    });

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});

test('CreateCellModal can explicitly create a worktree attachment for a project-root cell', async () => {
  const env = setupDom();
  try {
    let createdPayload: any = null;
    (window as any).agency = {
      listWorktrees: async () => [],
      listBranches: async () => [
        {
          name: 'main',
          current: true,
          isDefault: true,
          attachedWorktreePath: '',
        },
      ],
    };
    const root = createRoot(document.getElementById('root')!);

    await act(async () => {
      root.render(
        <CreateCellModal
          projectRoot="/repo"
          initialMode="branch"
          initialExistingBranch="main"
          initialBindTargetCell={{
            id: 'mainline-review',
            name: 'Mainline Review',
            branch: 'main',
          }}
          onClose={() => undefined}
          onCreate={(payload: any) => {
            createdPayload = payload;
          }}
        />
      );
    });
    await flushEffects();

    const submitButton = Array.from(document.querySelectorAll('button')).find((button) =>
      /Create Worktree Attachment/.test(button.textContent || '')
    ) as HTMLButtonElement | undefined;

    assert.ok(submitButton);
    assert.equal(submitButton.disabled, false);
    assert.match(document.body.textContent || '', /Materialize a worktree attachment for Mainline Review/);

    await act(async () => {
      submitButton.click();
    });

    assert.deepEqual(createdPayload, {
      name: 'Mainline Review',
      branch: undefined,
      baseBranch: undefined,
      existingBranch: 'main',
      reusePath: undefined,
      bindToCellId: 'mainline-review',
      bindBranchToCellId: undefined,
    });

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});

test('CreateCellModal can bind a branch onto an existing project-root cell without materializing a worktree', async () => {
  const env = setupDom();
  try {
    let createdPayload: any = null;
    (window as any).agency = {
      listWorktrees: async () => [],
      listBranches: async () => [
        {
          name: 'main',
          current: true,
          isDefault: true,
          attachedWorktreePath: '',
        },
      ],
    };
    const root = createRoot(document.getElementById('root')!);

    await act(async () => {
      root.render(
        <CreateCellModal
          projectRoot="/repo"
          initialMode="branch"
          initialExistingBranch="main"
          initialBindBranchTargetCell={{
            id: 'research-desk',
            name: 'Research Desk',
            branch: '',
          }}
          onClose={() => undefined}
          onCreate={(payload: any) => {
            createdPayload = payload;
          }}
        />
      );
    });
    await flushEffects();

    const submitButton = Array.from(document.querySelectorAll('button')).find((button) =>
      /Bind Branch/.test(button.textContent || '')
    ) as HTMLButtonElement | undefined;

    assert.ok(submitButton);
    assert.equal(submitButton.disabled, false);
    assert.match(document.body.textContent || '', /keeping session runtime on the project root/);

    await act(async () => {
      submitButton.click();
    });

    assert.deepEqual(createdPayload, {
      name: 'Research Desk',
      branch: undefined,
      baseBranch: undefined,
      existingBranch: 'main',
      reusePath: undefined,
      bindToCellId: undefined,
      bindBranchToCellId: 'research-desk',
    });

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});

test('CreateCellModal defaults to a project-root creation flow', async () => {
  const env = setupDom();
  try {
    let createdPayload: any = null;
    (window as any).agency = {
      listWorktrees: async () => [],
      listBranches: async () => [],
    };
    const root = createRoot(document.getElementById('root')!);

    await act(async () => {
      root.render(
        <CreateCellModal
          projectRoot="/repo"
          initialMode="project"
          initialName="research-desk"
          onClose={() => undefined}
          onCreate={(payload: any) => {
            createdPayload = payload;
          }}
        />
      );
    });
    await flushEffects();

    const submitButton = Array.from(document.querySelectorAll('button')).find((button) =>
      /Create Cell/.test(button.textContent || '')
    ) as HTMLButtonElement | undefined;

    assert.ok(submitButton);
    assert.equal(submitButton.disabled, false);
    assert.match(document.body.textContent || '', /Sessions will start on the project root/);

    await act(async () => {
      submitButton.click();
    });

    assert.deepEqual(createdPayload, {
      name: 'research-desk',
      branch: undefined,
      baseBranch: undefined,
      existingBranch: undefined,
      reusePath: undefined,
      bindToCellId: undefined,
      bindBranchToCellId: undefined,
    });

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});
