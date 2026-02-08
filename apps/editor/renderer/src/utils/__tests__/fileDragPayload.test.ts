import assert from 'node:assert/strict';
import test from 'node:test';

import { buildFileDragTextPayload, setFileDragPayload } from '../fileDragPayload';

test('buildFileDragTextPayload trims, deduplicates, and preserves order', () => {
  const payload = buildFileDragTextPayload([
    '  /tmp/a.txt  ',
    '/tmp/a.txt',
    '',
    '/tmp/b.txt',
  ]);

  assert.equal(payload, '/tmp/a.txt\n/tmp/b.txt');
});

test('setFileDragPayload writes text/plain payload for drag routing', () => {
  const store: Record<string, string> = {};
  const event = {
    stopped: false,
    stopPropagation() {
      this.stopped = true;
    },
    dataTransfer: {
      effectAllowed: 'none',
      setData(type: string, value: string) {
        store[type] = value;
      },
    },
  };

  const success = setFileDragPayload(event, ['/tmp/a.txt', '/tmp/b.txt']);

  assert.equal(success, true);
  assert.equal(store['text/plain'], '/tmp/a.txt\n/tmp/b.txt');
  assert.equal(event.dataTransfer.effectAllowed, 'copy');
  assert.equal(event.stopped, true);
});

test('setFileDragPayload returns false when payload is empty', () => {
  const event = {
    dataTransfer: {
      effectAllowed: 'none',
      setData() {},
    },
  };

  const success = setFileDragPayload(event, []);
  assert.equal(success, false);
});
