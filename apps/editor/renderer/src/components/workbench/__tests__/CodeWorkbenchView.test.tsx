import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import React, { useEffect } from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import {
  CODE_WORKBENCH_EDITOR_OPTIONS,
  CodeWorkbenchView,
} from '../CodeWorkbenchView';

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

const disposable = () => ({ dispose() {} });

function createMonacoHarness() {
  const updateOptionsCalls: any[] = [];
  const setModelLanguageCalls: string[] = [];
  let modelLanguage = 'plaintext';
  const model = {
    getLanguageId: () => modelLanguage,
    getValueInRange: () => '',
  };
  const editor = {
    updateOptions: (options: any) => {
      updateOptionsCalls.push(options);
    },
    getModel: () => model,
    deltaDecorations: () => [],
    addAction: () => disposable(),
    onDidChangeCursorSelection: () => disposable(),
    onDidChangeCursorPosition: () => disposable(),
    onMouseMove: () => disposable(),
    onMouseLeave: () => disposable(),
    onDidScrollChange: () => disposable(),
    onDidLayoutChange: () => disposable(),
    onMouseDown: () => disposable(),
    onContextMenu: () => disposable(),
    getPosition: () => ({ lineNumber: 1, column: 1 }),
    setPosition: () => {},
    getDomNode: () =>
      ({
        getBoundingClientRect: () => ({ left: 0, top: 0 }),
      }) as any,
    getScrolledVisiblePosition: () => ({ top: 0, height: 20 }),
    getLayoutInfo: () => ({ glyphMarginWidth: 16, glyphMarginLeft: 0 }),
    getOption: () => 20,
  };
  const monaco = {
    Range: class {
      constructor() {}
    },
    editor: {
      setModelLanguage: (_targetModel: any, nextLanguage: string) => {
        modelLanguage = nextLanguage;
        setModelLanguageCalls.push(nextLanguage);
      },
      EditorOption: {
        lineHeight: 'lineHeight',
      },
      MouseTargetType: {
        GUTTER_LINE_NUMBERS: 2,
        GUTTER_GLYPH_MARGIN: 3,
        GUTTER_LINE_DECORATIONS: 4,
        GUTTER_VIEW_ZONE: 5,
      },
    },
  };
  return {
    editor,
    monaco,
    updateOptionsCalls,
    setModelLanguageCalls,
  };
}

test('CodeWorkbenchView passes language/readOnly and applies stable Monaco language + options', async () => {
  const env = setupDom();
  try {
    const harness = createMonacoHarness();
    const latestMonacoProps = { current: null as any };
    const FakeMonacoEditor = (props: any) => {
      latestMonacoProps.current = props;
      useEffect(() => {
        props.onMount?.(harness.editor, harness.monaco);
      }, []);
      return <div data-testid="fake-monaco-editor" />;
    };
    const root = createRoot(document.getElementById('root')!);

    await act(async () => {
      root.render(
        <CodeWorkbenchView
          value='const x = 1;'
          language="typescript"
          diffHunks={[]}
          diffTruncated={false}
          blameEnabled={false}
          blameLines={[]}
          commentLines={[]}
          commentsEnabled={false}
          readOnly={true}
          onChange={() => {}}
          onCursorChange={() => {}}
          onSelectionChange={() => {}}
          onLineComment={() => {}}
          onEditorReady={() => {}}
          MonacoEditorComponent={FakeMonacoEditor}
        />
      );
    });

    assert.equal(latestMonacoProps.current?.language, 'typescript');
    assert.equal(latestMonacoProps.current?.options?.readOnly, true);
    assert.deepEqual(harness.updateOptionsCalls[0], CODE_WORKBENCH_EDITOR_OPTIONS);
    assert.deepEqual(harness.setModelLanguageCalls, ['typescript']);

    await act(async () => {
      root.render(
        <CodeWorkbenchView
          value='const x = 1;'
          language="markdown"
          diffHunks={[]}
          diffTruncated={false}
          blameEnabled={false}
          blameLines={[]}
          commentLines={[]}
          commentsEnabled={false}
          readOnly={false}
          onChange={() => {}}
          onCursorChange={() => {}}
          onSelectionChange={() => {}}
          onLineComment={() => {}}
          onEditorReady={() => {}}
          MonacoEditorComponent={FakeMonacoEditor}
        />
      );
    });

    assert.deepEqual(harness.setModelLanguageCalls, ['typescript', 'markdown']);

    await act(async () => {
      root.render(
        <CodeWorkbenchView
          value='const x = 1;'
          language="markdown"
          diffHunks={[]}
          diffTruncated={false}
          blameEnabled={false}
          blameLines={[]}
          commentLines={[]}
          commentsEnabled={false}
          readOnly={false}
          onChange={() => {}}
          onCursorChange={() => {}}
          onSelectionChange={() => {}}
          onLineComment={() => {}}
          onEditorReady={() => {}}
          MonacoEditorComponent={FakeMonacoEditor}
        />
      );
    });

    assert.deepEqual(harness.setModelLanguageCalls, ['typescript', 'markdown']);

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});
