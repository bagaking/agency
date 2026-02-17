import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_ACTIVITY_DIFF_THRESHOLD,
  countDiffChars,
  normalizeActivitySnapshot,
  resolveActivityDiffThreshold,
} from '../terminalActivityDiff';

test('resolveActivityDiffThreshold falls back and clamps invalid values', () => {
  assert.equal(resolveActivityDiffThreshold(undefined), DEFAULT_ACTIVITY_DIFF_THRESHOLD);
  assert.equal(resolveActivityDiffThreshold('abc'), DEFAULT_ACTIVITY_DIFF_THRESHOLD);
  assert.equal(resolveActivityDiffThreshold(0), 1);
  assert.equal(resolveActivityDiffThreshold(2.8), 2);
});

test('countDiffChars exits early when reaching cap', () => {
  const prev = 'abcdef';
  const next = 'ghijkl';
  assert.equal(countDiffChars(prev, next, 2), 3);
});

test('normalizeActivitySnapshot trims trailing whitespace and normalizes line endings', () => {
  const normalized = normalizeActivitySnapshot('a\r\nb\r\nc\r\n');
  assert.equal(normalized, 'a\nb\nc');
});

