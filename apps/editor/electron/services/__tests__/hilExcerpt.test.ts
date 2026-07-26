const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeExcerptUrl, detectEmbeddingBlockReason } = require('../hilExcerpt.ts');

export {};

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

test('detectEmbeddingBlockReason flags x-frame-options and frame-ancestors blocks', () => {
  const makeHeaders = (entries) => ({
    get(name) {
      return entries[String(name || '').toLowerCase()] || '';
    },
  });

  assert.equal(
    detectEmbeddingBlockReason(
      makeHeaders({
        'x-frame-options': 'DENY',
      })
    ),
    'X-Frame-Options DENY'
  );

  assert.equal(
    detectEmbeddingBlockReason(
      makeHeaders({
        'content-security-policy': "default-src 'self'; frame-ancestors 'none'",
      })
    ),
    "Content Security Policy frame-ancestors 'none'"
  );

  assert.equal(
    detectEmbeddingBlockReason(
      makeHeaders({
        'content-security-policy': "default-src 'self'; frame-ancestors *",
      })
    ),
    ''
  );
});

test('requiring hilExcerpt does not load jsdom or readability into the process', () => {
  const heavyModules = Object.keys(require.cache).filter(
    (cachedPath) => cachedPath.includes('/jsdom/') || cachedPath.includes('/@mozilla/readability/')
  );
  assert.deepEqual(heavyModules, []);
});

export {};
