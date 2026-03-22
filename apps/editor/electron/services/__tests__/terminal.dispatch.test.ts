const test = require('node:test');
const assert = require('node:assert/strict');

const { buildDispatchInputPlan, normalizeDispatchText } = require('../terminal');

test('normalizeDispatchText keeps LF semantics for programmatic dispatch text', () => {
  assert.equal(normalizeDispatchText('line1\r\nline2'), 'line1\nline2');
});

test('buildDispatchInputPlan resolves text + enter confirm strategy', () => {
  const plan = buildDispatchInputPlan({
    text: 'echo hello',
    confirm: {
      mode: 'enter',
    },
  });

  assert.equal(plan.text, 'echo hello');
  assert.deepEqual(plan.confirm.keys, ['Enter']);
  assert.equal(plan.confirm.settleMs > 0, true);
});

test('buildDispatchInputPlan resolves double-enter confirm strategy', () => {
  const plan = buildDispatchInputPlan({
    text: 'echo hello',
    confirm: {
      mode: 'double-enter',
    },
  });

  assert.deepEqual(plan.confirm.keys, ['Enter', 'Enter']);
});

test('buildDispatchInputPlan supports custom key strategies', () => {
  const plan = buildDispatchInputPlan({
    text: '',
    confirm: {
      mode: 'keys',
      keys: ['Escape', 'Enter'],
      settleMs: 12,
    },
  });

  assert.equal(plan.text, '');
  assert.deepEqual(plan.confirm.keys, ['Escape', 'Enter']);
  assert.equal(plan.confirm.settleMs, 12);
});

export {};
