const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  createControlBusSocketServer,
  getDefaultControlBusSocketPath,
  resolveDefaultNamespacePath,
  requestControlBusSocket,
} = require('../controlBusSocket');

test('default control bus socket path varies by namespace path', () => {
  const left = getDefaultControlBusSocketPath({
    namespacePath: '/tmp/agency-a',
  });
  const right = getDefaultControlBusSocketPath({
    namespacePath: '/tmp/agency-b',
  });

  assert.notEqual(left, right);
});

test('default control bus socket path stays stable across source and built entrypoint base dirs', () => {
  const sourceBaseDir = path.resolve(__dirname, '..');
  const builtBaseDir = path.resolve(process.cwd(), '.electron-build', 'electron', 'cli');

  const sourceNamespace = resolveDefaultNamespacePath({
    baseDir: sourceBaseDir,
  });
  const builtNamespace = resolveDefaultNamespacePath({
    baseDir: builtBaseDir,
  });
  const sourceSocketPath = getDefaultControlBusSocketPath({
    baseDir: sourceBaseDir,
  });
  const builtSocketPath = getDefaultControlBusSocketPath({
    baseDir: builtBaseDir,
  });

  assert.equal(sourceNamespace, process.cwd());
  assert.equal(builtNamespace, process.cwd());
  assert.equal(sourceSocketPath, builtSocketPath);
});

test('control bus socket server dispatches a request and returns the normalized response', async () => {
  const socketPath = path.join(
    os.tmpdir(),
    `agency-control-bus-test-${process.pid}-${Date.now()}.sock`
  );

  const server = createControlBusSocketServer({
    socketPath,
    dispatch: async (request, context) => ({
      success: true,
      op: request.op,
      warnings: [],
      failures: [],
      data: {
        request,
        transportTrust: context.transportTrust,
      },
    }),
  });

  await server.start();
  try {
    const result = await requestControlBusSocket({
      socketPath,
      request: {
        op: 'window.list',
        args: {
          hello: 'world',
        },
      },
    });

    assert.equal(result.success, true);
    assert.equal(result.op, 'window.list');
    assert.equal(result.data.request.args.hello, 'world');
    assert.equal(result.data.transportTrust, 'trusted_host_socket');
  } finally {
    await server.close();
    try {
      fs.unlinkSync(socketPath);
    } catch (_error) {
      // The server already unlinks the socket on close.
    }
  }
});

test('control bus socket server refuses to steal an active socket path', async () => {
  const socketPath = path.join(
    os.tmpdir(),
    `agency-control-bus-collision-${process.pid}-${Date.now()}.sock`
  );

  const serverA = createControlBusSocketServer({
    socketPath,
    dispatch: async () => ({
      success: true,
      op: 'window.list',
      warnings: [],
      failures: [],
      data: { server: 'a' },
    }),
  });
  const serverB = createControlBusSocketServer({
    socketPath,
    dispatch: async () => ({
      success: true,
      op: 'window.list',
      warnings: [],
      failures: [],
      data: { server: 'b' },
    }),
  });

  await serverA.start();
  try {
    await assert.rejects(() => serverB.start(), /already in use/);

    const result = await requestControlBusSocket({
      socketPath,
      request: {
        op: 'window.list',
      },
    });
    assert.equal(result.success, true);
    assert.equal(result.data.server, 'a');
  } finally {
    await serverA.close();
    try {
      fs.unlinkSync(socketPath);
    } catch (_error) {
      // The server already unlinks the socket on close.
    }
  }
});

export {};
