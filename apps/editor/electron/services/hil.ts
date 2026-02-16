// @ts-nocheck
/**
 * Thin facade over the canonical data-domain package.
 *
 * The domain logic (storage, normalization, legacy migration) lives in
 * `@agency/agency-data` so multiple surfaces can share one implementation.
 */

const agencyData = require('@agency/agency-data');

const getHilIndexPath = agencyData.getHilIndexPath;
const listHilItems = agencyData.listHilItems;
const createHilItem = agencyData.createHilItem;
const updateHilItem = agencyData.updateHilItem;
const deleteHilItem = agencyData.deleteHilItem;
const promoteHilItem = agencyData.promoteHilItem;

export {
  getHilIndexPath,
  listHilItems,
  createHilItem,
  updateHilItem,
  deleteHilItem,
  promoteHilItem,
};

