import assert from 'node:assert/strict';
import test from 'node:test';

import {
  findTerminalPathMatches,
  normalizeTerminalSelectionText,
  stripTrailingPathPunctuation,
} from '../terminalSelection';

test('stripTrailingPathPunctuation trims common trailing punctuation', () => {
  assert.equal(stripTrailingPathPunctuation('src/app.ts:12:3,'), 'src/app.ts:12:3');
  assert.equal(stripTrailingPathPunctuation('src/app.ts:12:3]'), 'src/app.ts:12:3');
});

test('findTerminalPathMatches extracts file-like paths and preserves startIndex', () => {
  const text = 'See src/app.ts:12:3, then continue.';
  const matches = findTerminalPathMatches(text);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].text, 'src/app.ts:12:3');
  assert.equal(text.slice(matches[0].startIndex, matches[0].startIndex + matches[0].raw.length), matches[0].raw);
});

test('normalizeTerminalSelectionText converts line breaks into carriage returns', () => {
  assert.equal(normalizeTerminalSelectionText('a\r\nb\nc'), 'a\rb\rc');
});

