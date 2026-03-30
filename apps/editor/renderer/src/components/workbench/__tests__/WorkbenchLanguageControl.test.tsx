import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { WorkbenchLanguageControl } from '../WorkbenchLanguageControl';

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
    HTMLInputElement: globalThis.HTMLInputElement,
  };
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    Node: dom.window.Node,
    SVGElement: dom.window.SVGElement,
    HTMLInputElement: dom.window.HTMLInputElement,
  });
  if (dom.window.HTMLInputElement?.prototype) {
    dom.window.HTMLInputElement.prototype.focus = function focusNoop() {};
    dom.window.HTMLInputElement.prototype.select = function selectNoop() {};
  }
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
        HTMLInputElement: previous.HTMLInputElement,
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
  assert.ok(node, 'expected node to exist before click');
  node.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
}

const projectDecision = {
  language: 'typescript',
  label: 'TypeScript',
  source: 'project',
  sourceLabel: 'Project Rule',
  provider: 'monaco-native',
  matchedRule: null,
} as const;

const manualDecision = {
  language: 'yaml',
  label: 'YAML',
  source: 'manual',
  sourceLabel: 'Local Override',
  provider: 'monaco-native',
  matchedRule: null,
} as const;

test('WorkbenchLanguageControl renders compact trigger with language + source label', async () => {
  const env = setupDom();
  try {
    const root = createRoot(document.getElementById('root')!);
    await act(async () => {
      root.render(<WorkbenchLanguageControl decision={projectDecision} />);
    });

    const trigger = document.querySelector('[data-testid="workbench-language-control-trigger"]');
    assert.ok(trigger);
    assert.match(trigger.textContent || '', /TypeScript/);
    assert.match(trigger.textContent || '', /Project Rule/);

    await act(async () => {
      click(trigger);
    });

    assert.ok(document.querySelector('[data-testid="workbench-language-control-panel"]'));
    assert.ok(document.querySelector('[data-testid="workbench-language-option-typescript"]'));

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});

test('WorkbenchLanguageControl selects language and closes picker', async () => {
  const env = setupDom();
  try {
    const selectedLanguages: string[] = [];
    const root = createRoot(document.getElementById('root')!);

    await act(async () => {
      root.render(
        <WorkbenchLanguageControl
          decision={projectDecision}
          onSelectLanguage={(language) => selectedLanguages.push(language)}
        />
      );
    });

    await act(async () => {
      click(document.querySelector('[data-testid="workbench-language-control-trigger"]'));
    });
    await act(async () => {
      click(document.querySelector('[data-testid="workbench-language-option-yaml"]'));
    });

    assert.deepEqual(selectedLanguages, ['yaml']);
    assert.equal(
      document.querySelector('[data-testid="workbench-language-control-panel"]'),
      null
    );

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});

test('WorkbenchLanguageControl supports reset-to-auto only when source is local override', async () => {
  const env = setupDom();
  try {
    const resetSignals: string[] = [];
    const root = createRoot(document.getElementById('root')!);

    await act(async () => {
      root.render(
        <WorkbenchLanguageControl
          decision={manualDecision}
          onResetToAuto={() => resetSignals.push('reset')}
        />
      );
    });
    await act(async () => {
      click(document.querySelector('[data-testid="workbench-language-control-trigger"]'));
    });
    assert.ok(document.querySelector('[data-testid="workbench-language-control-reset"]'));
    await act(async () => {
      click(document.querySelector('[data-testid="workbench-language-control-reset"]'));
    });
    assert.deepEqual(resetSignals, ['reset']);

    await act(async () => {
      root.render(
        <WorkbenchLanguageControl
          decision={projectDecision}
          onResetToAuto={() => resetSignals.push('unexpected')}
        />
      );
    });
    await act(async () => {
      click(document.querySelector('[data-testid="workbench-language-control-trigger"]'));
    });
    assert.equal(document.querySelector('[data-testid="workbench-language-control-reset"]'), null);
    assert.deepEqual(resetSignals, ['reset']);

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});

test('WorkbenchLanguageControl renders policy warning and error details', async () => {
  const env = setupDom();
  try {
    const root = createRoot(document.getElementById('root')!);
    await act(async () => {
      root.render(
        <WorkbenchLanguageControl
          decision={projectDecision}
          policyError="Invalid workbench language rule in .agency/workbench.yaml"
          policyWarnings={[
            'Unknown language alias `node` was normalized to Plain Text.',
            'Rule `*.inc` did not match any known language.',
          ]}
        />
      );
    });

    const trigger = document.querySelector('[data-testid="workbench-language-control-trigger"]');
    assert.ok(trigger?.querySelector('[aria-label="Workbench language policy issue"]'));

    await act(async () => {
      click(trigger);
    });

    const errorBlock = document.querySelector(
      '[data-testid="workbench-language-control-policy-error"]'
    );
    const warningsBlock = document.querySelector(
      '[data-testid="workbench-language-control-policy-warnings"]'
    );
    assert.ok(errorBlock);
    assert.ok(warningsBlock);
    assert.match(errorBlock.textContent || '', /Invalid workbench language rule/);
    assert.match(warningsBlock.textContent || '', /Unknown language alias/);

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});
