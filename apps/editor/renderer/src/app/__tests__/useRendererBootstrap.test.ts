import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveBootstrapActiveView } from '../useRendererBootstrap';

test('uses Explorer as the empty-project landing view even if ui state stored Agent Cells', () => {
  assert.equal(
    resolveBootstrapActiveView({
      projectRoot: '',
      restoredActiveView: 'agent-cells',
    }),
    'explorer'
  );
});

test('keeps the restored view when a project root is available', () => {
  assert.equal(
    resolveBootstrapActiveView({
      projectRoot: '/tmp/repo',
      restoredActiveView: 'settings',
    }),
    'settings'
  );
});

test('falls back to Agent Cells when project context exists but no stored view is available', () => {
  assert.equal(
    resolveBootstrapActiveView({
      projectRoot: '/tmp/repo',
      restoredActiveView: null,
    }),
    'agent-cells'
  );
});
