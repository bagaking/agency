const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  createControlBusSocketServer,
  requestControlBusSocket,
} = require('../controlBusSocket');

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

export {};
