import assert from 'node:assert/strict';
import test from 'node:test';

import { ensureInputListener } from '../terminalManager';

test('ensureInputListener refreshes the active callback when a terminal entry is reused', () => {
  const forwarded: string[] = [];
  let subscriberCount = 0;
  let onDataListener: ((data: string) => void) | null = null;
  const entry: any = {
    terminal: {
      onData(listener: (data: string) => void) {
        subscriberCount += 1;
        onDataListener = listener;
        return {
          dispose() {},
        };
      },
    },
    inputDisposable: null,
    inputHandler: null,
  };

  ensureInputListener({
    entry,
    onInput: (data: string) => {
      forwarded.push(`first:${data}`);
    },
  });

  onDataListener?.('alpha');

  ensureInputListener({
    entry,
    onInput: (data: string) => {
      forwarded.push(`second:${data}`);
    },
  });

  onDataListener?.('beta');

  assert.equal(subscriberCount, 1);
  assert.deepEqual(forwarded, ['first:alpha', 'second:beta']);
});
