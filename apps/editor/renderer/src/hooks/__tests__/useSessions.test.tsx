import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';

import { useSessions } from '../useSessions';

const EMPTY_ACTIVE_SESSIONS = {};
const EMPTY_VISITED_SESSIONS = {};
const STABLE_TMUX_STATUS = { available: true, error: '' };

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

function SessionsHarness({
  selectedCell,
  cells,
}: {
  selectedCell: any;
  cells: any[];
}) {
  const sessions = useSessions({
    selectedCell,
    cells,
    tmuxStatus: STABLE_TMUX_STATUS,
    onOpenTerminal: () => undefined,
    initialActiveSessions: EMPTY_ACTIVE_SESSIONS,
    initialSessionVisitedByKey: EMPTY_VISITED_SESSIONS,
  });

  return (
    <div>
      <button id="create-session" type="button" onClick={() => void sessions.createSession({ name: 'CLI' })}>
        create-session
      </button>
      <output id="session-error">{sessions.sessionError}</output>
    </div>
  );
}

test('useSessions resolves the latest hydrated cell before loading or creating sessions', async () => {
  const env = setupDom();
  try {
    const listCalls: any[] = [];
    const createCalls: any[] = [];
    (window as any).agency = {
      listSessions: async (payload: any) => {
        listCalls.push(payload);
        return [];
      },
      createSession: async (payload: any) => {
        createCalls.push(payload);
        return {
          id: 'session-1',
          name: payload?.name || 'CLI',
          status: 'active',
        };
      },
    };

    const staleSelectedCell = {
      id: 'main',
      name: 'main',
      branch: 'main',
      attachedWorktreePath: '/stale/worktree',
      projectRoot: '/repo',
    };
    const hydratedCells = [
      {
        id: 'main',
        name: 'main',
        branch: 'main',
        attachedWorktreePath: '/repo',
        projectRoot: '/repo',
      },
    ];

    const root = createRoot(document.getElementById('root')!);
    await act(async () => {
      root.render(<SessionsHarness selectedCell={staleSelectedCell} cells={hydratedCells} />);
    });
    await flushEffects();

    assert.equal(listCalls.length > 0, true);
    assert.equal(listCalls[0].worktreePath, '/repo');
    assert.equal(listCalls[0].cellId, 'main');

    await act(async () => {
      (document.getElementById('create-session') as HTMLButtonElement).click();
    });

    assert.equal(createCalls.length, 1);
    assert.equal(createCalls[0].cellId, 'main');
    assert.equal(createCalls[0].worktreePath, '/repo');
    assert.equal(createCalls[0].projectRoot, '/repo');
    assert.equal(createCalls[0].cellName, 'main');
    assert.equal(createCalls[0].cellBranch, 'main');
    assert.equal(createCalls[0].profileId, 'shell');
    assert.equal(createCalls[0].name, 'CLI');
    assert.equal(document.getElementById('session-error')?.textContent || '', '');

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});

test('useSessions creates sessions for project-root cells on project root runtime', async () => {
  const env = setupDom();
  try {
    const createCalls: any[] = [];
    (window as any).agency = {
      listSessions: async () => [],
      createSession: async (payload: any) => {
        createCalls.push(payload);
        return {
          id: 'session-project-root',
          name: payload?.name || 'CLI',
          status: 'active',
        };
      },
    };

    const root = createRoot(document.getElementById('root')!);
    await act(async () => {
      root.render(
        <SessionsHarness
          selectedCell={{
            id: 'mainline-review',
            name: 'mainline-review',
            branch: 'main',
            attachmentState: 'project_root',
            attachedWorktreePath: '',
            projectRoot: '/repo',
          }}
          cells={[
            {
              id: 'mainline-review',
              name: 'mainline-review',
              branch: 'main',
              attachmentState: 'project_root',
              attachedWorktreePath: '',
              projectRoot: '/repo',
            },
          ]}
        />
      );
    });
    await flushEffects();

    await act(async () => {
      (document.getElementById('create-session') as HTMLButtonElement).click();
    });

    assert.equal(createCalls.length, 1);
    assert.equal(createCalls[0].cellId, 'mainline-review');
    assert.equal(createCalls[0].worktreePath, '/repo');
    assert.equal(createCalls[0].projectRoot, '/repo');
    assert.equal(document.getElementById('session-error')?.textContent || '', '');

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});
