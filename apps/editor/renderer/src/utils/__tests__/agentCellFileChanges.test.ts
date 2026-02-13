import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildAgentCellFileChanges,
  buildAgentCellModifiedFileChanges,
} from '../agentCellFileChanges';

test('buildAgentCellFileChanges aggregates file references across sessions', () => {
  const entries = buildAgentCellFileChanges({
    rootPath: '/tmp/worktree',
    sessions: [
      { id: 's-1', name: 'Session One' },
      { id: 's-2', name: 'Session Two' },
    ],
    previewBySessionId: {
      's-1': 'touch src/a.ts\nopen src/b.ts:20',
      's-2': 'edit src/a.ts\ncheck docs/guide.md:5',
    },
    resolveActivityAt: (session) => (session.id === 's-2' ? 20 : 10),
    perSessionLimit: 3,
    totalLimit: 5,
  });

  assert.equal(entries.length, 3);
  assert.equal(entries[0]?.relativePath, 'src/a.ts');
  assert.equal(entries[0]?.sessionCount, 2);
  assert.equal(entries[0]?.latestActivityAt, 20);
  assert.equal(entries[0]?.sourceType, 'reference');

  const guide = entries.find((entry) => entry.relativePath === 'docs/guide.md');
  assert.equal(guide?.line, 5);
  assert.equal(guide?.sessions[0]?.id, 's-2');
});

test('buildAgentCellFileChanges enforces entry limits and ignores empty previews', () => {
  const entries = buildAgentCellFileChanges({
    rootPath: '/tmp/worktree',
    sessions: [{ id: 's-1' }, { id: 's-2' }, { id: 's-3' }],
    previewBySessionId: {
      's-1': 'src/a.ts\nsrc/b.ts\nsrc/c.ts',
      's-2': '',
      's-3': 'src/d.ts',
    },
    perSessionLimit: 2,
    totalLimit: 2,
  });

  assert.equal(entries.length, 2);
  assert.equal(entries.some((entry) => entry.relativePath === 'src/d.ts'), false);
});

test('buildAgentCellModifiedFileChanges filters by selected cell and sorts by priority', () => {
  const entries = buildAgentCellModifiedFileChanges({
    cellId: 'cell-a',
    statusFiles: {
      'src/deleted.ts': {
        path: 'src/deleted.ts',
        status: 'deleted',
        cells: {
          'cell-a': {
            status: 'deleted',
            added: 0,
            deleted: 4,
          },
        },
      },
      'src/added.ts': {
        path: 'src/added.ts',
        status: 'added',
        cells: {
          'cell-a': {
            status: 'added',
            added: 8,
            deleted: 0,
          },
        },
      },
      'src/modified-small.ts': {
        path: 'src/modified-small.ts',
        status: 'modified',
        cells: {
          'cell-a': {
            status: 'modified',
            added: 1,
            deleted: 0,
          },
        },
      },
      'src/modified-large.ts': {
        path: 'src/modified-large.ts',
        status: 'modified',
        cells: {
          'cell-a': {
            status: 'modified',
            added: 9,
            deleted: 2,
          },
        },
      },
      'src/other-cell.ts': {
        path: 'src/other-cell.ts',
        status: 'modified',
        cells: {
          'cell-b': {
            status: 'modified',
            added: 9,
            deleted: 9,
          },
        },
      },
    },
  });

  assert.deepEqual(
    entries.map((entry) => entry.relativePath),
    ['src/deleted.ts', 'src/added.ts', 'src/modified-large.ts', 'src/modified-small.ts']
  );
  assert.equal(entries.every((entry) => entry.sourceType === 'modified'), true);
  assert.equal(entries[0]?.status, 'deleted');
  assert.equal(entries[1]?.status, 'added');
});
