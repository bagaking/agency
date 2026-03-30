import assert from 'node:assert/strict';
import test from 'node:test';

import { ATTENTION_KINDS } from '../../../../shared/attention';
import { buildAttentionModel } from '../attentionModel';

const cells = [
  {
    id: 'cell-a',
    name: 'alpha',
    worktreePath: '/repo/alpha',
  },
];

test('buildAttentionModel prioritizes failed runs above unread sessions', () => {
  const model = buildAttentionModel({
    selectedCell: cells[0],
    activeSessionId: 'session-active',
    cells,
    sessionsByCellId: {
      'cell-a': [
        { id: 'session-active', name: 'Main', status: 'active' },
        { id: 'session-review', name: 'Review', status: 'detached' },
      ],
    },
    activeSessionByCellId: {
      'cell-a': 'session-active',
    },
    sessionActivityByKey: {
      'cell-a:session-review': 200,
    },
    sessionVisitedByKey: {
      'cell-a:session-review': 100,
    },
    harnessRuns: [
      {
        runId: 'run-failed',
        status: 'failed',
        goal: {
          title: 'Create Child Agent via Fork',
        },
        failures: [
          {
            message: 'Source session is not running Codex.',
          },
        ],
        attentionRefs: {
          cellId: 'cell-a',
          sourceSessionId: 'session-active',
        },
        updatedAt: '2026-03-30T10:00:00.000Z',
      },
    ],
  });

  assert.equal(model.primaryItem?.kind, ATTENTION_KINDS.failed);
  assert.equal(model.bySessionKey['cell-a:session-review']?.kind, ATTENTION_KINDS.unread);
});

test('buildAttentionModel marks a created child session as return-required until revisited', () => {
  const model = buildAttentionModel({
    selectedCell: cells[0],
    activeSessionId: 'session-active',
    cells,
    sessionsByCellId: {
      'cell-a': [
        { id: 'session-active', name: 'Main', status: 'active' },
        { id: 'child-1', name: 'Child', status: 'active' },
      ],
    },
    activeSessionByCellId: {
      'cell-a': 'session-active',
    },
    sessionVisitedByKey: {
      'cell-a:child-1': 100,
    },
    harnessRuns: [
      {
        runId: 'run-child',
        status: 'succeeded',
        goal: {
          title: 'Create Child Agent via Fork',
        },
        result: {
          agent: {
            session: {
              id: 'child-1',
            },
          },
        },
        attentionRefs: {
          cellId: 'cell-a',
          sourceSessionId: 'session-active',
        },
        updatedAt: '2026-03-30T12:00:00.000Z',
      },
    ],
  });

  const item = model.bySessionKey['cell-a:child-1'];
  assert.equal(item?.kind, ATTENTION_KINDS.returnRequired);
  assert.equal(item?.refs.sessionId, 'child-1');
});

test('buildAttentionModel exposes other-window urgency through window attention items', () => {
  const model = buildAttentionModel({
    windows: [
      {
        windowStateId: 'window-current',
        projectName: 'current',
        isFocused: true,
        attentionSummary: null,
      },
      {
        windowStateId: 'window-other',
        projectName: 'other',
        isFocused: false,
        attentionSummary: {
          version: 1,
          itemCount: 2,
          highestSeverity: 'critical',
          countsByKind: {
            failed: 1,
            unread: 1,
          },
          primary: {
            id: 'run-failed',
            kind: 'failed',
            ownerKind: 'run',
            severity: 'critical',
            label: 'Create Child Agent via Fork',
            detail: 'Source session is blocked.',
            refs: {
              runId: 'run-failed',
            },
          },
          updatedAt: '2026-03-30T12:10:00.000Z',
        },
      },
    ],
  });

  assert.equal(model.primaryItem?.ownerKind, 'window');
  assert.equal(model.primaryItem?.refs.windowStateId, 'window-other');
  assert.equal(model.windowItems[0]?.count, 2);
});

test('buildAttentionModel keeps background-cell active sessions eligible for unread attention', () => {
  const model = buildAttentionModel({
    selectedCell: {
      id: 'cell-a',
      name: 'alpha',
    },
    activeSessionId: 'session-a',
    cells: [
      {
        id: 'cell-a',
        name: 'alpha',
      },
      {
        id: 'cell-b',
        name: 'beta',
      },
    ],
    sessionsByCellId: {
      'cell-a': [{ id: 'session-a', name: 'Visible', status: 'active' }],
      'cell-b': [{ id: 'session-b', name: 'Background', status: 'active' }],
    },
    activeSessionByCellId: {
      'cell-a': 'session-a',
      'cell-b': 'session-b',
    },
    sessionActivityByKey: {
      'cell-b:session-b': 300,
    },
    sessionVisitedByKey: {
      'cell-b:session-b': 100,
    },
  });

  assert.equal(model.bySessionKey['cell-b:session-b']?.kind, ATTENTION_KINDS.unread);
});
