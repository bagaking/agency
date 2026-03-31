// @ts-nocheck
/**
 * Thin facade over the canonical session-reply repository in `@agency/agency-data`.
 *
 * Session replies are session-owned artifacts. They intentionally stay out of HIL storage.
 */

const agencyData = require('@agency/agency-data');

const listSessionReplies = agencyData.listSessionReplies;
const createSessionReply = agencyData.createSessionReply;
const updateSessionReply = agencyData.updateSessionReply;

export {
  listSessionReplies,
  createSessionReply,
  updateSessionReply,
};
