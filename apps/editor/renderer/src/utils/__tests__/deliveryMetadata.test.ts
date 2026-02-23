import assert from 'node:assert/strict';
import test from 'node:test';

import {
  appendDeliveryTimeline,
  buildDeliveryMeta,
  normalizeDeliveryMode,
  normalizeDeliverySource,
  setDeliveryExecutionStatus,
} from '../deliveryMetadata';

test('normalize delivery enums falls back safely', () => {
  assert.equal(normalizeDeliverySource('explorer'), 'explorer');
  assert.equal(normalizeDeliverySource('promote'), 'promote');
  assert.equal(normalizeDeliverySource('session'), 'session');
  assert.equal(normalizeDeliverySource('unknown', 'explorer'), 'explorer');

  assert.equal(normalizeDeliveryMode('quick'), 'quick');
  assert.equal(normalizeDeliveryMode('gated'), 'gated');
  assert.equal(normalizeDeliveryMode('other', 'gated'), 'gated');
});

test('buildDeliveryMeta seeds source/mode/status metadata and initial timeline', () => {
  const meta = buildDeliveryMeta({
    source: 'explorer',
    mode: 'quick',
    status: 'queued',
    requestedAt: '2026-02-16T00:00:00.000Z',
    sessionId: 's-1',
    cellId: 'cell-a',
    references: [{ path: 'src/a.ts' }],
    timelineLabel: 'Queued quick run',
  });

  assert.equal(meta.deliverySource, 'explorer');
  assert.equal(meta.deliveryMode, 'quick');
  assert.equal(meta.executionStatus, 'queued');
  assert.equal(meta.executionSessionId, 's-1');
  assert.equal(meta.deliveryCellId, 'cell-a');
  assert.deepEqual(meta.deliveryReferences, [{ path: 'src/a.ts' }]);
  assert.equal(Array.isArray(meta.deliveryTimeline), true);
  assert.equal(meta.deliveryTimeline.length, 1);
  assert.equal(meta.deliveryTimeline[0]?.label, 'Queued quick run');
  assert.equal(meta.deliveryTimeline[0]?.source, 'explorer');
  assert.equal(meta.deliveryTimeline[0]?.mode, 'quick');
});

test('setDeliveryExecutionStatus appends timeline and updates timestamps', () => {
  const seeded = buildDeliveryMeta({
    source: 'promote',
    mode: 'gated',
    status: 'queued',
    requestedAt: '2026-02-16T00:00:00.000Z',
    sessionId: 's-2',
  });
  const running = setDeliveryExecutionStatus({
    meta: seeded,
    status: 'running',
    at: '2026-02-16T00:00:05.000Z',
    label: 'Dispatch running',
  });
  const complete = setDeliveryExecutionStatus({
    meta: running,
    status: 'complete',
    at: '2026-02-16T00:00:15.000Z',
    label: 'Dispatch complete',
  });

  assert.equal(running.executionStatus, 'running');
  assert.equal(running.executionStartedAt, '2026-02-16T00:00:05.000Z');
  assert.equal(complete.executionStatus, 'complete');
  assert.equal(complete.executionFinishedAt, '2026-02-16T00:00:15.000Z');
  assert.equal(complete.deliveryTimeline.length, 3);
  assert.equal(complete.deliveryTimeline[2]?.label, 'Dispatch complete');
});

test('appendDeliveryTimeline preserves and extends existing events', () => {
  const next = appendDeliveryTimeline(
    {
      deliverySource: 'explorer',
      deliveryMode: 'quick',
      executionStatus: 'queued',
      deliveryTimeline: [
        {
          at: '2026-02-16T00:00:00.000Z',
          source: 'explorer',
          mode: 'quick',
          status: 'queued',
          label: 'Queued',
        },
      ],
    },
    {
      at: '2026-02-16T00:00:10.000Z',
      status: 'complete',
      label: 'Completed',
    }
  );

  assert.equal(next.deliveryTimeline.length, 2);
  assert.equal(next.deliveryTimeline[1]?.status, 'complete');
  assert.equal(next.deliveryTimeline[1]?.label, 'Completed');
});

test('legacy draft meta without delivery fields can be upgraded safely', () => {
  const legacyMeta = {
    sourceKind: 'hil',
    executionStatus: 'running',
    executionSessionId: 'legacy-session',
  };
  const updated = setDeliveryExecutionStatus({
    meta: legacyMeta,
    status: 'complete',
    at: '2026-02-16T00:01:00.000Z',
  });

  assert.equal(updated.deliverySource, 'promote');
  assert.equal(updated.deliveryMode, 'quick');
  assert.equal(updated.executionStatus, 'complete');
  assert.equal(updated.executionFinishedAt, '2026-02-16T00:01:00.000Z');
  assert.equal(Array.isArray(updated.deliveryTimeline), true);
  assert.equal(updated.deliveryTimeline.length, 1);
});
