import assert from 'node:assert/strict';
import test from 'node:test';

import { buildNextAttentionTooltip } from '../attentionNavigation';

test('buildNextAttentionTooltip describes unread attention as a session jump', () => {
  assert.equal(
    buildNextAttentionTooltip({
      kind: 'unread',
      label: 'Main Session',
      detail: 'New output since you last visited.',
      refs: {
        cellId: 'cell-a',
        sessionId: 'session-a',
      },
      source: 'local',
    }),
    'Next: Unread. New output since you last visited. Jump to session.'
  );
});

test('buildNextAttentionTooltip describes running attention as Session Map evidence', () => {
  assert.equal(
    buildNextAttentionTooltip({
      kind: 'running',
      label: 'Create Child Agent via Fork',
      detail: 'Waiting for child session readiness.',
      refs: {
        cellId: 'cell-a',
        sessionId: 'session-a',
        runId: 'run-1',
      },
      source: 'local',
    }),
    'Next: Running. Waiting for child session readiness. Open evidence in Session Map.'
  );
});

test('buildNextAttentionTooltip describes pending confirmation as opening Session Map', () => {
  assert.equal(
    buildNextAttentionTooltip({
      kind: 'pending_confirmation',
      label: 'Confirm Active',
      detail: 'Cell is waiting for lifecycle confirmation.',
      refs: {
        cellId: 'cell-a',
      },
      source: 'local',
    }),
    'Next: Confirm. Cell is waiting for lifecycle confirmation. Open Session Map.'
  );
});

test('buildNextAttentionTooltip describes return required as a session jump', () => {
  assert.equal(
    buildNextAttentionTooltip({
      kind: 'return_required',
      label: 'Review Child',
      detail: 'Child session is ready and waiting.',
      refs: {
        cellId: 'cell-a',
        sessionId: 'child-1',
      },
      source: 'local',
    }),
    'Next: Review. Child session is ready and waiting. Jump to session.'
  );
});

test('buildNextAttentionTooltip describes window attention as focusing another window', () => {
  assert.equal(
    buildNextAttentionTooltip({
      kind: 'failed',
      label: 'repo-b',
      detail: 'Failed run in another window.',
      refs: {
        windowStateId: 'window-b',
      },
      source: 'window',
    }),
    'Next: Failed. Failed run in another window. Focus window.'
  );
});

test('buildNextAttentionTooltip does not promise a session jump without a session target', () => {
  assert.equal(
    buildNextAttentionTooltip({
      kind: 'unread',
      label: 'Unread Session',
      detail: 'Output arrived.',
      refs: {
        cellId: 'cell-a',
      },
      source: 'local',
    }),
    'Next: Unread. Output arrived. Open attention.'
  );
});

test('buildNextAttentionTooltip falls back to opening Session Map when evidence target is incomplete', () => {
  assert.equal(
    buildNextAttentionTooltip({
      kind: 'failed',
      label: 'Failed Run',
      detail: 'Needs review.',
      refs: {
        cellId: 'cell-a',
      },
      source: 'local',
    }),
    'Next: Failed. Needs review. Open Session Map.'
  );
});
