import assert from 'node:assert/strict';
import test from 'node:test';

import { buildAgentCellFileChanges } from '../agentCellFileChanges';

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

  const guide = entries.find((entry) => entry.relativePath === 'docs/guide.md');
  assert.equal(guide?.line, 5);
  assert.equal(guide?.sessions[0]?.id, 's-2');
});

test('buildAgentCellFileChanges enforces entry limits and ignores empty previews', () => {
  const entries = buildAgentCellFileChanges({
    rootPath: '/tmp/worktree',
    sessions: [
      { id: 's-1' },
      { id: 's-2' },
      { id: 's-3' },
    ],
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
