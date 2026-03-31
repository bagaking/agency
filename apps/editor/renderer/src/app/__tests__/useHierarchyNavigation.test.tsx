import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { useHierarchyNavigation } from '../useHierarchyNavigation';

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
  };
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    Node: dom.window.Node,
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

test('handleHierarchyJump falls back to an available scope outside the sidebar path', async () => {
  const env = setupDom();
  try {
    const root = createRoot(document.getElementById('root')!);
    const snapshots: Array<{ activeView: string; hierarchySection: string; actionsScope: string }> = [];

    function Harness() {
      const [activeView, setActiveView] = React.useState('settings');
      const [hierarchySection, setHierarchySection] = React.useState('actions');
      const [actionsScope, setActionsScope] = React.useState<'global' | 'project' | 'agent'>('agent');

      const navigation = useHierarchyNavigation({
        sidebarCollapsed: false,
        setActiveView,
        setSidebarCollapsed: () => undefined,
        setHierarchySection,
        setActionsScope,
        setAppShortcutsScope: () => undefined,
        setReplyQuickPromptsScope: () => undefined,
        setGateScope: () => undefined,
        setSessionNamingScope: () => undefined,
        actionsScope,
        appShortcutsScope: 'global',
        replyQuickPromptsScope: 'global',
        gateScope: 'global',
        sessionNamingScope: 'global',
        canUseProjectScope: true,
        canUseAgentScope: false,
        clearTerminusError: () => undefined,
        clearHarnessProvidersError: () => undefined,
        clearAppShortcutsError: () => undefined,
        clearReplyQuickPromptsError: () => undefined,
        clearGatesError: () => undefined,
        clearSessionNamingError: () => undefined,
        clearWorktreeLinksError: () => undefined,
      });

      React.useEffect(() => {
        snapshots.push({ activeView, hierarchySection, actionsScope });
      }, [activeView, hierarchySection, actionsScope]);

      return (
        <button type="button" onClick={() => navigation.handleHierarchyJump('actions')}>
          open actions
        </button>
      );
    }

    await act(async () => {
      root.render(<Harness />);
    });

    await act(async () => {
      click(document.querySelector('button'));
    });

    const latest = snapshots[snapshots.length - 1];
    assert.deepEqual(latest, {
      activeView: 'hierarchy',
      hierarchySection: 'actions',
      actionsScope: 'project',
    });

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});
