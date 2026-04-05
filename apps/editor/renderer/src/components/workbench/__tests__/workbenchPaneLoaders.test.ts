import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';

import { loadWorkbenchTabState } from '../workbenchPaneLoaders';

function setupDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost/',
  });
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const previousNavigator = globalThis.navigator;

  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
  });
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: dom.window.navigator,
  });

  return {
    cleanup() {
      globalThis.window = previousWindow;
      globalThis.document = previousDocument;
      Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: previousNavigator,
      });
      dom.window.close();
    },
  };
}

test('loadWorkbenchTabState recognizes markdown linked to bounded web research', async () => {
  const env = setupDom();
  try {
    (window as any).agency = {
      readWorkbenchEntry: async () => ({
        content: [
          '---',
          'agency_source_url: "https://example.com/spec"',
          'agency_source_title: "Spec Title"',
          'agency_source_site_name: "Example Docs"',
          '---',
          '',
          '# Spec Title',
        ].join('\n'),
        size: 42,
        mtimeMs: 123,
      }),
    };

    const state = await loadWorkbenchTabState({
      rootPath: '/repo',
      targetPath: 'docs/spec.md',
    });

    assert.equal(state.kind, 'code');
    assert.equal(state.language, 'markdown');
    assert.equal(state.researchSourceUrl, 'https://example.com/spec');
    assert.equal(state.researchSourceTitle, 'Spec Title');
    assert.equal(state.researchSourceSiteName, 'Example Docs');
  } finally {
    env.cleanup();
  }
});

test('loadWorkbenchTabState opens unknown extension files as code when content is text', async () => {
  const env = setupDom();
  try {
    (window as any).agency = {
      readWorkbenchEntry: async () => ({
        content: 'plain text from a custom extension',
        size: 32,
        mtimeMs: 456,
        binary: false,
        truncated: false,
      }),
      statWorkbenchEntry: async () => ({
        size: 32,
        mtimeMs: 456,
      }),
    };

    const state = await loadWorkbenchTabState({
      rootPath: '/repo',
      targetPath: 'notes/customext.abcxyz',
    });

    assert.equal(state.kind, 'code');
    assert.equal(state.language, 'plaintext');
    assert.equal(state.content, 'plain text from a custom extension');
    assert.equal(state.binary, false);
  } finally {
    env.cleanup();
  }
});
