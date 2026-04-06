import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';

import { EditorPane } from '../EditorPane';

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

function buildEditorPaneProps(overrides: Record<string, unknown> = {}) {
  return {
    cell: {
      id: 'cell-main',
      name: 'main',
      branch: 'feat/top-chrome',
      attachmentState: 'attached',
      state: 'active',
    },
    projectReady: true,
    projectError: '',
    terminalMode: 'shell',
    terminalOpen: false,
    sessionId: 'child',
    sessionTargets: [],
    sessions: [
      { id: 'root', name: 'browser', status: 'active', parentSessionId: null },
      { id: 'child', name: 'easy-cell', status: 'active', parentSessionId: 'root' },
    ],
    sessionLoading: false,
    sessionError: '',
    onCreateSession: () => undefined,
    terminusBindings: [],
    gateResultsByStage: {},
    gatesCheckingByStage: {},
    gateDisplayStage: 'active',
    idleSince: Date.now() - 19_000,
    terminalFontSize: 13,
    isVisible: true,
    onRefreshSessions: () => undefined,
    onStateChange: () => undefined,
    onTurnGateCreate: () => undefined,
    onTurnGateExecute: () => undefined,
    onOpenTerminal: () => undefined,
    onArchiveCell: () => undefined,
    onClearCellAttachment: () => undefined,
    onDeleteCell: () => undefined,
    onZoomIn: () => undefined,
    onZoomOut: () => undefined,
    onZoomReset: () => undefined,
    pendingCommand: null,
    onCommandSent: () => undefined,
    onSessionActivity: () => undefined,
    onSessionAttached: () => undefined,
    onSendSessionText: () => undefined,
    onSelectProject: () => undefined,
    onUpdateCellAvatar: () => undefined,
    onRenameSession: () => undefined,
    onOpenWorkbenchFile: () => undefined,
    onJumpToSession: () => undefined,
    activityDiffThreshold: 12,
    onSelectionContext: () => undefined,
    onReplySelection: () => undefined,
    ...overrides,
  };
}

test('EditorPane shows cell and session path chrome instead of the legacy agency label', () => {
  const html = renderToStaticMarkup(
    <EditorPane {...buildEditorPaneProps()} />
  );

  assert.match(html, />main</);
  assert.match(html, />browser</);
  assert.match(html, />easy-cell</);
  assert.match(html, /Idle/);
  assert.match(html, /Text 13/);
  assert.match(html, />Refresh</);
  assert.doesNotMatch(html, />AGENCY</);
});

test('EditorPane breadcrumb follows the visible session-tree projection when a detached parent is hidden', () => {
  const html = renderToStaticMarkup(
    <EditorPane
      {...buildEditorPaneProps({
        sessionId: 'child-visible',
        sessions: [
          { id: 'root-visible', name: 'root', status: 'active', parentSessionId: null },
          { id: 'detached-parent', name: 'detached-parent', status: 'detached', parentSessionId: 'root-visible' },
          { id: 'child-visible', name: 'child-visible', status: 'active', parentSessionId: 'detached-parent' },
        ],
      })}
    />
  );

  assert.match(html, />root</);
  assert.match(html, />child-visible</);
  assert.doesNotMatch(html, />detached-parent</);
});

test('EditorPane keeps hook order stable when the selected cell appears after an empty render', async () => {
  const env = setupDom();
  try {
    const root = createRoot(document.getElementById('root')!);

    await act(async () => {
      root.render(<EditorPane {...buildEditorPaneProps({ cell: null, projectReady: true })} />);
    });

    await act(async () => {
      root.render(<EditorPane {...buildEditorPaneProps()} />);
    });

    assert.match(document.body.textContent || '', /easy-cell/);

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});

test('EditorPane renders a detached-cell detail state instead of the generic terminal empty animation', () => {
  const html = renderToStaticMarkup(
    <EditorPane
      {...buildEditorPaneProps({
        cell: {
          id: 'cell-detached',
          name: 'detached-cell',
          branch: 'feat/detached',
          attachmentState: 'missing',
          state: 'draft',
          lastKnownWorktreePath: '/repo/.worktrees/detached-cell',
        },
        sessions: [{ id: 'session-stale', name: 'Default', status: 'stale' }],
      })}
    />
  );

  assert.match(html, /Detached Workspace/);
  assert.match(html, /Archive Cell/);
  assert.match(html, /Retained sessions/);
  assert.doesNotMatch(html, /No active terminal session/);
});
