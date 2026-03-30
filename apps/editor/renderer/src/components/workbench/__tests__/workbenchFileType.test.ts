import assert from 'node:assert/strict';
import test from 'node:test';

import {
  detectWorkbenchSecureKind,
  resolveWorkbenchLanguage,
} from '../workbenchFileType';

test('special filenames use consistent secure kind and Monaco language', () => {
  assert.equal(detectWorkbenchSecureKind('Dockerfile'), 'code');
  assert.equal(resolveWorkbenchLanguage('Dockerfile'), 'dockerfile');

  assert.equal(detectWorkbenchSecureKind('Dockerfile.prod'), 'code');
  assert.equal(resolveWorkbenchLanguage('Dockerfile.prod'), 'dockerfile');

  assert.equal(detectWorkbenchSecureKind('Containerfile'), 'code');
  assert.equal(resolveWorkbenchLanguage('Containerfile'), 'dockerfile');

  assert.equal(detectWorkbenchSecureKind('Containerfile.dev'), 'code');
  assert.equal(resolveWorkbenchLanguage('Containerfile.dev'), 'dockerfile');

  assert.equal(detectWorkbenchSecureKind('Makefile'), 'code');
  assert.equal(resolveWorkbenchLanguage('Makefile'), 'makefile');

  assert.equal(detectWorkbenchSecureKind('GNUmakefile'), 'code');
  assert.equal(resolveWorkbenchLanguage('GNUmakefile'), 'makefile');

  assert.equal(detectWorkbenchSecureKind('.gitignore'), 'code');
  assert.equal(resolveWorkbenchLanguage('.gitignore'), 'gitignore');

  assert.equal(detectWorkbenchSecureKind('.dockerignore'), 'code');
  assert.equal(resolveWorkbenchLanguage('.dockerignore'), 'gitignore');

  assert.equal(detectWorkbenchSecureKind('.env'), 'code');
  assert.equal(resolveWorkbenchLanguage('.env'), 'dotenv');

  assert.equal(detectWorkbenchSecureKind('.env.local'), 'code');
  assert.equal(resolveWorkbenchLanguage('.env.local'), 'dotenv');
});

test('legacy text extensions stay text and preserve better language IDs', () => {
  assert.equal(detectWorkbenchSecureKind('src/app.tsx'), 'code');
  assert.equal(resolveWorkbenchLanguage('src/app.tsx'), 'typescript');

  assert.equal(detectWorkbenchSecureKind('scripts/run.zsh'), 'code');
  assert.equal(resolveWorkbenchLanguage('scripts/run.zsh'), 'shell');

  assert.equal(detectWorkbenchSecureKind('configs/typed.env'), 'code');
  assert.equal(resolveWorkbenchLanguage('configs/typed.env'), 'dotenv');

  assert.equal(detectWorkbenchSecureKind('Cargo.toml'), 'code');
  assert.equal(resolveWorkbenchLanguage('Cargo.toml'), 'toml');
});

test('vector/media/unknown safety boundaries remain explicit', () => {
  assert.equal(detectWorkbenchSecureKind('assets/logo.svg'), 'vector');
  assert.equal(resolveWorkbenchLanguage('assets/logo.svg'), 'xml');

  assert.equal(detectWorkbenchSecureKind('assets/photo.avif'), 'image');
  assert.equal(detectWorkbenchSecureKind('assets/clip.mkv'), 'video');
  assert.equal(detectWorkbenchSecureKind('assets/sound.flac'), 'audio');
  assert.equal(detectWorkbenchSecureKind('assets/report.pdf'), 'pdf');

  assert.equal(detectWorkbenchSecureKind('assets/archive.bin'), 'unknown');
  assert.equal(resolveWorkbenchLanguage('assets/archive.bin'), 'plaintext');

  assert.equal(detectWorkbenchSecureKind('LICENSE'), 'code');
  assert.equal(resolveWorkbenchLanguage('LICENSE'), 'plaintext');
  assert.equal(detectWorkbenchSecureKind('README'), 'code');
  assert.equal(resolveWorkbenchLanguage('README'), 'markdown');
});
