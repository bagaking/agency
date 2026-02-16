// @ts-nocheck
/**
 * Delivery facade.
 *
 * This stays host-owned (Electron main process), while the delivery protocol and
 * persistence live in `@agency/agency-data/promote-system`.
 */

const { writeSession } = require('./terminal');

const promoteSystem = require('@agency/agency-data/promote-system');

function normalizeCommand(value) {
  return String(value || '').replace(/\r\n/g, '\n');
}

function writeWithEnters({ cellId, sessionId, command, appendEnter, doubleEnter }) {
  if (!cellId || !sessionId) {
    throw new Error('cellId and sessionId are required for session dispatch.');
  }
  const text = normalizeCommand(command);
  if (text) {
    writeSession(cellId, sessionId, text);
  }
  const enterCount = (appendEnter ? 1 : 0) + (doubleEnter ? 1 : 0);
  for (let i = 0; i < enterCount; i += 1) {
    writeSession(cellId, sessionId, '\r');
  }
}

async function startDelivery(payload = {}) {
  const request = payload?.request || payload;
  const host = {
    dispatchToSession: async (input) => {
      const cellId = input?.cellId || request?.cellId || '';
      const sessionId = input?.sessionId || request?.sessionId || '';
      writeWithEnters({
        cellId,
        sessionId,
        command: input?.command || '',
        appendEnter: input?.appendEnter !== false,
        doubleEnter: input?.doubleEnter === true,
      });
      return { ackAt: new Date().toISOString() };
    },
  };
  return promoteSystem.startDelivery({ request, host });
}

async function confirmDelivery(payload = {}) {
  return promoteSystem.confirmDelivery(payload || {});
}

async function getDeliveryStatus(payload = {}) {
  return promoteSystem.getDeliveryStatus(payload || {});
}

async function getDeliveryTimeline(payload = {}) {
  return promoteSystem.getDeliveryTimeline(payload || {});
}

export {
  startDelivery,
  confirmDelivery,
  getDeliveryStatus,
  getDeliveryTimeline,
};

