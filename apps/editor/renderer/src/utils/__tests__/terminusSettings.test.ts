import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeProfileFork } from '../terminusSettings';

test('normalizeProfileFork preserves zero-valued idle settings', () => {
  const normalized = normalizeProfileFork({
    enabled: true,
    driver: 'codex',
    sourceIdleMs: 0,
    forkAckTimeoutMs: 0,
    childReadyTimeoutMs: 0,
  });

  assert.equal(normalized.enabled, true);
  assert.equal(normalized.driver, 'codex');
  assert.equal(normalized.sourceIdleMs, 0);
  assert.equal(normalized.forkAckTimeoutMs, 0);
  assert.equal(normalized.childReadyTimeoutMs, 0);
});
