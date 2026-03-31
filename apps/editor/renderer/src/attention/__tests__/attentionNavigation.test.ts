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
    'Next: Unread output. New output since you last visited. Jump to session.'
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
      },
      source: 'local',
    }),
    'Next: Running. Waiting for child session readiness. Open Session Map evidence.'
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
    'Next: Confirmation needed. Cell is waiting for lifecycle confirmation. Open Session Map.'
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
    'Next: Review needed. Child session is ready and waiting. Jump to session.'
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
    'Next: Attention in another window. Failed run in another window. Focus window.'
  );
});
