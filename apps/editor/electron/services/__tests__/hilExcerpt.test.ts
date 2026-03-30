const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeExcerptUrl } = require('../hilExcerpt.ts');

test('normalizeExcerptUrl keeps research-lane inspect bounded to public http urls', () => {
  assert.equal(
    normalizeExcerptUrl('example.com/docs'),
    'https://example.com/docs'
  );
  assert.equal(
    normalizeExcerptUrl('https://example.com/guide'),
    'https://example.com/guide'
  );

  assert.throws(
    () => normalizeExcerptUrl('ftp://example.com/file.txt'),
    /URL must start with http or https\./
  );
  assert.throws(
    () => normalizeExcerptUrl('http://localhost:3000/internal'),
    /Local URLs are not allowed\./
  );
  assert.throws(
    () => normalizeExcerptUrl('http://192.168.0.25/private'),
    /Local URLs are not allowed\./
  );
});
