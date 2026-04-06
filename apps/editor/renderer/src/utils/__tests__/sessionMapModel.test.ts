import assert from 'node:assert/strict';
import test from 'node:test';

import { buildSessionMapModel } from '../sessionMapModel';

test('buildSessionMapModel keeps detached and empty clusters out of the primary Cells panel', () => {
  const model = buildSessionMapModel({
    cells: [
      { id: 'cell-live', name: 'live', state: 'active', attachmentState: 'attached' },
      { id: 'cell-detached', name: 'detached', state: 'active', attachmentState: 'detached' },
      { id: 'cell-empty', name: 'empty', state: 'active', attachmentState: 'attached' },
      { id: 'cell-archived', name: 'archived', state: 'archived', attachmentState: 'missing' },
    ],
    sessionsByCellId: {
      'cell-live': [{ id: 'session-a', name: 'A', status: 'active' }],
      'cell-detached': [{ id: 'session-b', name: 'B', status: 'stale' }],
      'cell-empty': [],
      'cell-archived': [],
    },
    activeSessionByCellId: {
      'cell-live': 'session-a',
    },
  });

  assert.deepEqual(
    model.clusters.map((cluster: any) => cluster.cell.id),
    ['cell-live']
  );
  assert.deepEqual(
    model.ghostClusters.map((cluster: any) => cluster.cell.id).sort(),
    ['cell-archived', 'cell-detached', 'cell-empty']
  );
  assert.equal(model.stats.visibleCells, 1);
  assert.equal(model.stats.ghostCells, 3);
});
