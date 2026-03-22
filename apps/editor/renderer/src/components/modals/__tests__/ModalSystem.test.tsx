import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import React, { useEffect } from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { ModalProvider, useModal } from '../ModalSystem';

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
    Event: globalThis.Event,
    MouseEvent: globalThis.MouseEvent,
    KeyboardEvent: globalThis.KeyboardEvent,
  };
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    Node: dom.window.Node,
    Event: dom.window.Event,
    MouseEvent: dom.window.MouseEvent,
    KeyboardEvent: dom.window.KeyboardEvent,
  });
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: dom.window.navigator,
  });
  if (!(dom.window.HTMLElement.prototype as any).attachEvent) {
    (dom.window.HTMLElement.prototype as any).attachEvent = () => undefined;
  }
  if (!(dom.window.HTMLElement.prototype as any).detachEvent) {
    (dom.window.HTMLElement.prototype as any).detachEvent = () => undefined;
  }
  return {
    dom,
    cleanup() {
      Object.assign(globalThis, {
        window: previous.window,
        document: previous.document,
        HTMLElement: previous.HTMLElement,
        Node: previous.Node,
        Event: previous.Event,
        MouseEvent: previous.MouseEvent,
        KeyboardEvent: previous.KeyboardEvent,
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

function clickElement(element: Element | null) {
  assert.ok(element, 'expected element to exist');
  element.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
}

function changeInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  )?.set;
  setter?.call(input, value);
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
}

function Harness({
  onReady,
}: {
  onReady: (modal: ReturnType<typeof useModal>) => void;
}) {
  const modal = useModal();

  useEffect(() => {
    onReady(modal);
  }, [modal, onReady]);

  return null;
}

test('prompt modal shows prompt chrome label and validation errors', async () => {
  const env = setupDom();
  try {
    const root = createRoot(document.getElementById('root')!);
    let modalApi: ReturnType<typeof useModal> | null = null;

    await act(async () => {
      root.render(
        <ModalProvider>
          <Harness
            onReady={(modal) => {
              modalApi = modal;
            }}
          />
        </ModalProvider>
      );
    });

    assert.ok(modalApi?.prompt, 'expected prompt api to be available');

    await act(async () => {
      void modalApi!.prompt({
        title: 'Rename Entry',
        inputLabel: 'New name',
        defaultValue: 'draft-copy',
        confirmLabel: 'Apply',
        validateValue: () => 'A value is required.',
      });
    });

    assert.match(document.body.textContent || '', /Prompt/i);

    await act(async () => {
      const confirmButton = Array.from(document.querySelectorAll('button')).find((button) =>
        button.textContent?.includes('Apply')
      );
      clickElement(confirmButton || null);
    });

    assert.match(document.body.textContent || '', /A value is required\./);

    await act(async () => {
      const cancelButton = Array.from(document.querySelectorAll('button')).find((button) =>
        button.textContent?.includes('Cancel')
      );
      clickElement(cancelButton || null);
      await Promise.resolve();
    });

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});

test('prompt modal normalizes resolved values', async () => {
  const env = setupDom();
  try {
    const root = createRoot(document.getElementById('root')!);
    let modalApi: ReturnType<typeof useModal> | null = null;
    let resolvedValue: string | null | undefined;

    await act(async () => {
      root.render(
        <ModalProvider>
          <Harness
            onReady={(modal) => {
              modalApi = modal;
            }}
          />
        </ModalProvider>
      );
    });

    await act(async () => {
      void modalApi!.prompt({
        title: 'Rename Entry',
        defaultValue: '  renamed-entry  ',
        confirmLabel: 'Apply',
        cancelLabel: 'Cancel',
        normalizeValue: (value: string) => value.trim(),
      }).then((value) => {
        resolvedValue = value;
      });
    });

    await act(async () => {
      const confirmButton = Array.from(document.querySelectorAll('button')).find((button) =>
        button.textContent?.includes('Apply')
      );
      clickElement(confirmButton || null);
      await Promise.resolve();
    });

    assert.equal(resolvedValue, 'renamed-entry');

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});

test('prompt modal cancel resolves to null', async () => {
  const env = setupDom();
  try {
    const root = createRoot(document.getElementById('root')!);
    let modalApi: ReturnType<typeof useModal> | null = null;
    let resolvedValue: string | null | undefined;

    await act(async () => {
      root.render(
        <ModalProvider>
          <Harness
            onReady={(modal) => {
              modalApi = modal;
            }}
          />
        </ModalProvider>
      );
    });

    await act(async () => {
      void modalApi!.prompt({
        title: 'Duplicate Entry',
        confirmLabel: 'Duplicate',
        cancelLabel: 'Cancel',
      }).then((value) => {
        resolvedValue = value;
      });
    });

    await act(async () => {
      const cancelButton = Array.from(document.querySelectorAll('button')).find((button) =>
        button.textContent?.includes('Cancel')
      );
      clickElement(cancelButton || null);
      await Promise.resolve();
    });

    assert.equal(resolvedValue, null);

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});
