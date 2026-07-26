const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');

const {
  registerAssetRoot,
  isAllowedAssetPath,
  resetAssetRootsForTests,
} = require('../assetProtocolPolicy');

test.beforeEach(() => {
  resetAssetRootsForTests();
});

test('denies every path when no asset roots are registered', () => {
  assert.equal(isAllowedAssetPath(path.join(os.homedir(), '.ssh', 'id_rsa')), false);
  assert.equal(isAllowedAssetPath('/etc/passwd'), false);
});

test('allows files inside a registered root and denies everything else', () => {
  registerAssetRoot('/tmp/agency-project');
  assert.equal(isAllowedAssetPath('/tmp/agency-project/docs/image.png'), true);
  assert.equal(isAllowedAssetPath('/tmp/agency-project'), true);
  assert.equal(isAllowedAssetPath('/tmp/other/file.txt'), false);
  assert.equal(isAllowedAssetPath(path.join(os.homedir(), '.ssh', 'id_rsa')), false);
});

test('denies traversal escapes and prefix-sibling roots', () => {
  registerAssetRoot('/tmp/agency-project');
  assert.equal(isAllowedAssetPath('/tmp/agency-project/../secrets.txt'), false);
  assert.equal(isAllowedAssetPath('/tmp/agency-project-sibling/file.txt'), false);
});

test('ignores empty or relative root registrations', () => {
  registerAssetRoot('');
  registerAssetRoot('relative/dir');
  assert.equal(isAllowedAssetPath('/relative/dir/file.txt'), false);
  assert.equal(isAllowedAssetPath(path.resolve('relative/dir/file.txt')), false);
});

test('supports multiple registered roots', () => {
  registerAssetRoot('/tmp/agency-project');
  registerAssetRoot('/tmp/voice-cache');
  assert.equal(isAllowedAssetPath('/tmp/voice-cache/clip.webm'), true);
  assert.equal(isAllowedAssetPath('/tmp/agency-project/a.png'), true);
});

export {};
