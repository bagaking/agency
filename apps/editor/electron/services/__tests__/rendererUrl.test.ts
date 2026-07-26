const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { resolveRendererUrl } = require('../rendererUrl');

function withRendererEnv(env, fn) {
  const previous = {
    AGENCY_RENDERER_URL: process.env.AGENCY_RENDERER_URL,
    ELECTRON_RENDERER_URL: process.env.ELECTRON_RENDERER_URL,
    AGENCY_RENDERER_PORT_FILE: process.env.AGENCY_RENDERER_PORT_FILE,
  };
  Object.keys(previous).forEach((key) => {
    delete process.env[key];
  });
  Object.entries(env || {}).forEach(([key, value]) => {
    process.env[key] = String(value);
  });
  try {
    return fn();
  } finally {
    Object.entries(previous).forEach(([key, value]) => {
      if (value === undefined) {
        delete process.env[key];
        return;
      }
      process.env[key] = value;
    });
  }
}

function createPortFile(payload) {
  const dirPath = fs.mkdtempSync(path.join(os.tmpdir(), 'agency-renderer-url-'));
  const portFile = path.join(dirPath, 'renderer.json');
  fs.writeFileSync(portFile, JSON.stringify(payload), 'utf8');
  return { dirPath, portFile };
}

test('resolveRendererUrl ignores the dev port file in packaged mode', () => {
  const { dirPath, portFile } = createPortFile({ port: 31337 });
  try {
    const result = withRendererEnv({ AGENCY_RENDERER_PORT_FILE: portFile }, () =>
      resolveRendererUrl({ isPackaged: true })
    );

    assert.equal(result.url, '');
    assert.equal(result.source, 'none');
    assert.equal(result.portFile, portFile);
  } finally {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
});

test('resolveRendererUrl still accepts explicit renderer env urls in packaged mode', () => {
  const result = withRendererEnv({ AGENCY_RENDERER_URL: 'http://localhost:4173' }, () =>
    resolveRendererUrl({ isPackaged: true })
  );

  assert.equal(result.url, 'http://localhost:4173');
  assert.equal(result.source, 'env');
});

export {};
