import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { HierarchySidebar } from '../HierarchySidebar';

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

test('HierarchySidebar renders capabilities once and routes selection through current scope handlers', async () => {
  const env = setupDom();
  try {
    const events: string[] = [];
    const root = createRoot(document.getElementById('root')!);

    await act(async () => {
      root.render(
        <HierarchySidebar
          section="actions"
          actionsScope="project"
          appShortcutsScope="global"
          replyQuickPromptsScope="global"
          sessionNamingScope="global"
          canUseProjectScope={true}
          canUseAgentScope={false}
          actionSummary={{ projectOverrides: true, agentLabel: 'Alpha Cell' }}
          appShortcutsSummary={{}}
          replyQuickPromptsSummary={{}}
          sessionNamingSummary={{}}
          harnessProvidersDirty={true}
          onSelectActionsScope={(scope) => events.push(`actions:${scope}`)}
          onSelectAppShortcutsScope={(scope) => events.push(`shortcuts:${scope}`)}
          onSelectReplyQuickPromptsScope={(scope) => events.push(`prompts:${scope}`)}
          onSelectSessionNamingScope={(scope) => events.push(`naming:${scope}`)}
          onSelectHarnessProviders={() => events.push('harness')}
          onSelectSoftlinks={() => events.push('softlinks')}
        />
      );
    });

    assert.equal(document.querySelectorAll('[data-testid^="hierarchy-sidebar-"]').length, 6);
    assert.match(document.body.textContent || '', /Project scope ready/);
    assert.match(document.body.textContent || '', /Agent scope locked/);

    await act(async () => {
      click(document.querySelector('[data-testid="hierarchy-sidebar-actions"]'));
      click(document.querySelector('[data-testid="hierarchy-sidebar-harness-providers"]'));
    });

    assert.deepEqual(events, ['actions:project', 'harness']);

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});

test('HierarchySidebar falls back to a valid scope when remembered scope is unavailable', async () => {
  const env = setupDom();
  try {
    const events: string[] = [];
    const root = createRoot(document.getElementById('root')!);

    await act(async () => {
      root.render(
        <HierarchySidebar
          section="actions"
          actionsScope="agent"
          appShortcutsScope="project"
          replyQuickPromptsScope="global"
          sessionNamingScope="global"
          canUseProjectScope={false}
          canUseAgentScope={false}
          actionSummary={{ agentLabel: 'Select Cell' }}
          appShortcutsSummary={{}}
          replyQuickPromptsSummary={{}}
          sessionNamingSummary={{}}
          onSelectActionsScope={(scope) => events.push(`actions:${scope}`)}
          onSelectAppShortcutsScope={(scope) => events.push(`shortcuts:${scope}`)}
          onSelectReplyQuickPromptsScope={() => undefined}
          onSelectSessionNamingScope={() => undefined}
          onSelectHarnessProviders={() => undefined}
          onSelectSoftlinks={() => undefined}
        />
      );
    });

    await act(async () => {
      click(document.querySelector('[data-testid="hierarchy-sidebar-actions"]'));
      click(document.querySelector('[data-testid="hierarchy-sidebar-app-shortcuts"]'));
    });

    assert.deepEqual(events, ['actions:global', 'shortcuts:global']);

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});
