import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { HierarchyPageShell, buildScopeOptions } from '../HierarchyPageShell';

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
  };
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    Node: dom.window.Node,
    SVGElement: dom.window.SVGElement,
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
        SVGElement: previous.SVGElement,
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

function click(node: Element | null) {
  assert.ok(node);
  node.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
}

test('buildScopeOptions disables project/agent based on available paths', () => {
  const options = buildScopeOptions({
    project: '/repo/.agency/app-shortcuts.yaml',
  });

  assert.equal(options.find((option) => option.id === 'global')?.disabled, undefined);
  assert.equal(options.find((option) => option.id === 'project')?.disabled, false);
  assert.equal(options.find((option) => option.id === 'agent')?.disabled, true);
  assert.equal(options.find((option) => option.id === 'project')?.hint, 'repo');
  assert.equal(options.find((option) => option.id === 'agent')?.hint, 'Select cell');
});

test('HierarchyPageShell renders scope switcher and calls onSelectScope', async () => {
  const env = setupDom();
  try {
    const selectedScopes: string[] = [];
    const root = createRoot(document.getElementById('root')!);

    await act(async () => {
      root.render(
        <HierarchyPageShell
          title="App Shortcuts"
          description="desc"
          scope="project"
          scopeOptions={buildScopeOptions({
            project: '/repo/.agency/app-shortcuts.yaml',
            agent: '/repo/.agency/cells/cell-1/app-shortcuts.yaml',
          })}
          onSelectScope={(scope) => selectedScopes.push(scope)}
          sourceHint="/repo/.agency/app-shortcuts.yaml"
        >
          <div data-testid="content">content</div>
        </HierarchyPageShell>
      );
    });

    assert.ok(document.querySelector('[data-testid="content"]'));
    assert.match(document.body.textContent || '', /App Shortcuts/);
    assert.match(document.body.textContent || '', /Source/);
    assert.match(document.body.textContent || '', /cell-1/);

    await act(async () => {
      click(Array.from(document.querySelectorAll('button')).find((button) =>
        /Agent/.test(button.textContent || '')
      ) || null);
    });

    assert.deepEqual(selectedScopes, ['agent']);

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});

test('HierarchyPageShell supports fixed secondary chrome and non-scrolling content mode', async () => {
  const env = setupDom();
  try {
    const root = createRoot(document.getElementById('root')!);

    await act(async () => {
      root.render(
        <HierarchyPageShell
          title="Gates"
          description="desc"
          scope="global"
          scopeOptions={buildScopeOptions()}
          secondaryHeader={<div data-testid="stage-switcher">stages</div>}
          contentScroll={false}
        >
          <div data-testid="split-pane">pane</div>
        </HierarchyPageShell>
      );
    });

    assert.ok(document.querySelector('[data-testid="hierarchy-page-shell-secondary-header"]'));
    assert.ok(document.querySelector('[data-testid="stage-switcher"]'));
    const content = document.querySelector('[data-testid="hierarchy-page-shell-content"]');
    assert.ok(content);
    assert.match((content as HTMLDivElement).className, /min-h-0/);
    assert.doesNotMatch((content as HTMLDivElement).className, /overflow-y-auto/);

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});
