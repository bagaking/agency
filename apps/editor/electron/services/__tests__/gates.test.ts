const test = require('node:test');
const assert = require('node:assert/strict');

test('gates module exports are all defined', () => {
  const gates = require('../gates.ts');
  const undefinedExports = Object.entries(gates)
    .filter(([, value]) => value === undefined)
    .map(([name]) => name);
  assert.deepEqual(undefinedExports, []);
});
