import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeLineEndingsToCrlf, normalizeLineEndingsToLf } from '../lineEndings';

test('normalizeLineEndingsToLf converts CRLF and CR to LF', () => {
  const normalized = normalizeLineEndingsToLf('a\r\nb\rc\n');
  assert.equal(normalized, 'a\nb\nc\n');
});

test('normalizeLineEndingsToCrlf normalizes LF boundaries for xterm writes', () => {
  const normalized = normalizeLineEndingsToCrlf('a\nb\r\nc\rd');
  assert.equal(normalized, 'a\r\nb\r\nc\rd');
});

