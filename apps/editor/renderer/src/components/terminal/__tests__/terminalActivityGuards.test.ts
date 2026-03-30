import assert from 'node:assert/strict';
import test from 'node:test';

import {
  markSyntheticActivityWindow,
  shouldSkipTerminalResize,
} from '../terminalResizeController';
import { shouldSuppressTerminalActivity } from '../useTerminalRuntimeEffect';

test('shouldSkipTerminalResize blocks inactive or hidden terminals from automatic resize churn', () => {
  assert.equal(
    shouldSkipTerminalResize({
      isActive: false,
      isVisible: true,
    }),
    true
  );
  assert.equal(
    shouldSkipTerminalResize({
      isActive: true,
      isVisible: false,
    }),
    true
  );
  assert.equal(
    shouldSkipTerminalResize({
      isActive: true,
      isVisible: true,
    }),
    false
  );
});

test('markSyntheticActivityWindow creates a temporary suppression window for UI-driven redraws', () => {
  const ref = { current: 0 };
  const now = Date.parse('2026-03-30T14:00:00.000Z');
  markSyntheticActivityWindow(ref, 1500, now);

  assert.equal(
    shouldSuppressTerminalActivity({
      suppressedUntil: ref.current,
      now: now + 1000,
    }),
    true
  );
  assert.equal(
    shouldSuppressTerminalActivity({
      suppressedUntil: ref.current,
      now: now + 1600,
    }),
    false
  );
});
