// @ts-nocheck
const { EventEmitter } = require('events');

function createHarnessEventBus() {
  const emitter = new EventEmitter();
  emitter.setMaxListeners(0);
  return {
    emitProgress(event) {
      emitter.emit('progress', event);
    },
    onProgress(handler) {
      emitter.on('progress', handler);
      return () => {
        emitter.off('progress', handler);
      };
    },
  };
}

module.exports = {
  createHarnessEventBus,
};
